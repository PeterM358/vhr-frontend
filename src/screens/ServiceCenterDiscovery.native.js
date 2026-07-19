// PATH: src/screens/ServiceCenterDiscovery.native.js
/**
 * Native service center discovery — map-first with draggable results sheet.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ActivityIndicator,
  Platform,
  Dimensions,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { COLORS } from '../styles/colors';
import { API_BASE_URL } from '../api/config';
import BASE_STYLES from '../styles/base';
import BackHeaderButton from '../components/navigation/BackHeaderButton';
import ScreenBackground from '../components/ScreenBackground';
import DiscoveryFiltersBottomSheet from '../components/serviceCenters/DiscoveryFiltersBottomSheet';
import DiscoverySortSheet from '../components/serviceCenters/DiscoverySortSheet';
import DiscoveryMapBottomSheet from '../components/serviceCenters/DiscoveryMapBottomSheet';
import DISCOVERY_MOBILE, { discoveryMinFont } from '../components/serviceCenters/discoveryMobileTokens';
import {
  spreadShopMarkersForMap,
  buildDiscoveryMapRegion,
  shopMapCoordinate,
  parseShopCoordinate,
  MIN_MAP_REGION_DELTA,
  DEFAULT_NEARBY_RADIUS_KM,
  regionDeltaForRadiusKm,
  SOFIA_FALLBACK_COORD,
  resolveCityMapRegion,
} from '../utils/mapMarkerSpread';
import {
  filterShopsInMapViewport,
  logMapDiscoveryData,
  shopHasMappableCoordinates,
  shopStableListId,
} from '../utils/mapDiscoveryData';
import { openShopInMaps } from '../utils/shopMapsLink';
import { sanitizeUserLocation } from '../utils/distance';
import ServiceCenterMapMarker, {
  buildServiceCenterMarkerKey,
} from '../components/maps/ServiceCenterMapMarker';
import {
  useServiceCenterDiscovery,
  SORT_OPTIONS,
} from '../hooks/useServiceCenterDiscovery';
import { brandSlugFromId } from '../utils/seo/seoSlugCatalog';
import {
  goBackFromServiceCenters,
  navigateToServiceCenterProfile,
  navigateToServiceCenterDetail,
} from '../navigation/serviceCentersNavigation';
import { navigateToPartnerDashboard } from '../navigation/webNavigation';
import { navigateToSignIn } from '../navigation/authNavigation';
import {
  loadServiceRecordFormDraft,
  saveServiceRecordFormDraft,
} from '../utils/serviceRecordDraftStorage';
import {
  formatVehicleAuthorizeLabel,
  resolveAuthorizeVehicleId,
} from '../utils/vehicleShopAuthorization';
import { getCurrentShopId } from '../utils/currentShop';
import { useTranslation } from '../i18n';

const DEFAULT_REGION = {
  ...SOFIA_FALLBACK_COORD,
  ...regionDeltaForRadiusKm(DEFAULT_NEARBY_RADIUS_KM),
};

const VIEWPORT_DEBOUNCE_MS = 300;

const SCREEN_H = Dimensions.get('window').height;
const COLLAPSED_SHEET_FRACTION = 0.14;

function sanitizeMapRegion(region) {
  if (!region) return DEFAULT_REGION;
  const latitude = parseShopCoordinate(region.latitude);
  const longitude = parseShopCoordinate(region.longitude);
  if (latitude == null || longitude == null) return DEFAULT_REGION;
  return {
    latitude,
    longitude,
    latitudeDelta: clampMapDelta(region.latitudeDelta, DEFAULT_REGION.latitudeDelta),
    longitudeDelta: clampMapDelta(region.longitudeDelta, DEFAULT_REGION.longitudeDelta),
  };
}

function clampMapDelta(value, fallback = MIN_MAP_REGION_DELTA) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < MIN_MAP_REGION_DELTA) return fallback;
  return Math.min(n, 45);
}

function withTimeout(promise, ms = 6000) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
  ]);
}

function shopListId(shop) {
  return shopStableListId(shop) || `shop-${shop?.id}`;
}

const RATING_SUMMARY_KEYS = { 3: '3plus', 4: '4plus', 4.5: '4_5plus' };
const DISTANCE_SUMMARY_KEYS = { 10: '10km', 25: '25km', 50: '50km', 100: '100km' };

function buildActiveFilterSummary(filters, t) {
  const parts = [];
  if (filters.selectedVehicleType) {
    parts.push(t(`vehicleTypes.${filters.selectedVehicleType}`, null, filters.selectedVehicleType));
  }
  if (filters.openNowOnly) parts.push(t('serviceCenters.openNow'));
  if (filters.verifiedOnly) parts.push(t('serviceCenters.verified'));
  if (filters.selectedCategory) {
    const cat = filters.categoryOptions?.find((c) => c.slug === filters.selectedCategory);
    parts.push(cat?.display_name || cat?.name || cat?.label || filters.selectedCategory);
  }
  if (filters.selectedRepairType) {
    const rt = filters.repairTypeChipOptions?.find((r) => r.slug === filters.selectedRepairType);
    parts.push(rt?.display_name || rt?.name || rt?.label || filters.selectedRepairType);
  }
  if (filters.selectedBrand) {
    const brand = filters.brands?.find((b) => b.id === filters.selectedBrand);
    parts.push(brand?.name || String(filters.selectedBrand));
  }
  if (filters.minRating != null) {
    const key = RATING_SUMMARY_KEYS[filters.minRating];
    parts.push(
      key
        ? t(`serviceCenters.ratingFilter.${key}`)
        : `${filters.minRating}+`
    );
  }
  if (filters.radiusKm != null) {
    const key = DISTANCE_SUMMARY_KEYS[filters.radiusKm];
    parts.push(
      key
        ? t(`serviceCenters.distanceFilter.${key}`)
        : `${filters.radiusKm} km`
    );
  }
  return parts.join(' · ');
}

export default function ServiceCenterDiscovery({ navigation, route, partnerMode = false }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const mapRef = useRef(null);
  const listRef = useRef(null);
  const sheetRef = useRef(null);
  const skipNextRegionSyncRef = useRef(false);
  const autoFitRegionRef = useRef(true);
  const sheetSnapRef = useRef(0);
  const lastSelectedListIdRef = useRef(null);
  const viewportDebounceRef = useRef(null);

  const discovery = useServiceCenterDiscovery({
    initialCitySlug: route.params?.citySlug || null,
    initialRepairType: route.params?.repairType || null,
    initialVehicleType: route.params?.vehicleType || null,
    initialBrandSlug: route.params?.brandSlug || null,
  });

  const [selectedListId, setSelectedListId] = useState(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [locating, setLocating] = useState(false);
  const [geoHint, setGeoHint] = useState('');
  const [mapRegion, setMapRegion] = useState(DEFAULT_REGION);
  const [viewportRegion, setViewportRegion] = useState(DEFAULT_REGION);
  const [currentShopId, setCurrentShopId] = useState(null);

  const {
    shops,
    loading,
    addressQuery,
    setAddressQuery,
    selectedVehicleType,
    setSelectedVehicleType,
    selectedCategory,
    setSelectedCategory,
    selectedRepairType,
    setSelectedRepairType,
    selectedBrand,
    setSelectedBrand,
    brandSlug,
    setBrandSlug,
    verifiedOnly,
    setVerifiedOnly,
    openNowOnly,
    setOpenNowOnly,
    minRating,
    setMinRating,
    radiusKm,
    setRadiusKm,
    matchedCity,
    sort,
    setSort,
    brands,
    categoryOptions,
    repairTypeChipOptions,
    userLocation,
    setUserLocation,
    userLocatedExplicitly,
    setUserLocatedExplicitly,
    runSearch,
    clearFilters,
    showAllInMatchedCity,
    loadFilterTaxonomy,
    fetchShops,
    loadError,
    authRequired,
  } = discovery;

  const handleBrandChange = useCallback(
    (value) => {
      setSelectedBrand(value);
      setBrandSlug(brandSlugFromId(value, brands));
    },
    [brands, setBrandSlug, setSelectedBrand]
  );

  const closeFilters = useCallback(() => setFiltersOpen(false), []);

  const openFilters = useCallback(() => {
    setFiltersOpen(true);
    loadFilterTaxonomy().catch(() => {});
  }, [loadFilterTaxonomy]);

  const pickForServiceRecord = Boolean(route.params?.pickShopForServiceRecord);
  const authorizeVehicleId = resolveAuthorizeVehicleId(route.params);
  const serviceRecordVehicleId = route.params?.vehicleId;
  const authorizeMode = authorizeVehicleId != null && !pickForServiceRecord;

  const [authorizeVehicle, setAuthorizeVehicle] = useState(null);

  useEffect(() => {
    let alive = true;
    if (!authorizeVehicleId) {
      setAuthorizeVehicle(null);
      return undefined;
    }
    (async () => {
      try {
        const token = await AsyncStorage.getItem('@access_token');
        if (!token) return;
        const res = await fetch(`${API_BASE_URL}/api/vehicles/${authorizeVehicleId}/`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        if (alive) setAuthorizeVehicle(data);
      } catch (error) {
        console.warn('Could not load vehicle for authorize context:', error);
      }
    })();
    return () => {
      alive = false;
    };
  }, [authorizeVehicleId]);

  useEffect(() => {
    let alive = true;
    getCurrentShopId()
      .then((shopId) => {
        if (alive) setCurrentShopId(shopId);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const mappableShops = useMemo(
    () => shops.filter((shop) => shopHasMappableCoordinates(shop)),
    [shops]
  );

  const mapShops = useMemo(
    () =>
      spreadShopMarkersForMap(
        mappableShops,
        userLocatedExplicitly && userLocation
          ? { latitude: userLocation[0], longitude: userLocation[1] }
          : null
      ),
    [mappableShops, userLocation, userLocatedExplicitly]
  );

  const visibleShops = useMemo(
    () => filterShopsInMapViewport(shops, viewportRegion),
    [shops, viewportRegion]
  );

  const visibleMapShops = useMemo(
    () => filterShopsInMapViewport(mapShops, viewportRegion),
    [mapShops, viewportRegion]
  );

  useEffect(() => {
    const renderedIds = visibleMapShops.map((shop) => shopListId(shop));
    logMapDiscoveryData({
      api_count: shops.length,
      normalized_count: shops.length,
      unique_count: shops.length,
      rendered_marker_count: visibleMapShops.length,
      rendered_ids: renderedIds,
      user_marker_count: userLocatedExplicitly && userLocation ? 1 : 0,
      duplicate_ids: [],
    });
  }, [shops, visibleMapShops, userLocatedExplicitly, userLocation]);

  const applyMapRegion = useCallback((nextRegion) => {
    const region = sanitizeMapRegion(nextRegion);
    skipNextRegionSyncRef.current = true;
    setMapRegion(region);
    setViewportRegion(region);
    mapRef.current?.animateToRegion?.(region, 280);
    if (__DEV__) {
      console.log(
        '[search] region=',
        `${region.latitude.toFixed(4)},${region.longitude.toFixed(4)}`,
        `delta=${region.latitudeDelta.toFixed(3)}`
      );
    }
  }, []);

  const panToMatchedCity = useCallback(
    (city) => {
      const region = resolveCityMapRegion(city);
      if (!region) return false;
      autoFitRegionRef.current = false;
      applyMapRegion(region);
      return true;
    },
    [applyMapRegion]
  );

  const handleSearch = useCallback(async () => {
    autoFitRegionRef.current = true;
    const { matchedCity: searchedCity } = await runSearch();
    if (searchedCity) {
      setUserLocatedExplicitly(false);
      panToMatchedCity(searchedCity);
    }
    closeFilters();
  }, [runSearch, closeFilters, panToMatchedCity, setUserLocatedExplicitly]);

  useEffect(() => {
    if (!matchedCity) return;
    if (userLocatedExplicitly) return;
    panToMatchedCity(matchedCity);
  }, [matchedCity, panToMatchedCity, userLocatedExplicitly]);

  useEffect(() => {
    autoFitRegionRef.current = true;
  }, [
    selectedVehicleType,
    selectedCategory,
    selectedRepairType,
    selectedBrand,
    verifiedOnly,
    openNowOnly,
    minRating,
    radiusKm,
  ]);

  useEffect(() => {
    if (!autoFitRegionRef.current) return;
    const region = buildDiscoveryMapRegion(mappableShops, {
      userLocation: userLocatedExplicitly ? userLocation : null,
      matchedCity,
    });
    applyMapRegion(region);
  }, [applyMapRegion, mappableShops, matchedCity, userLocatedExplicitly, userLocation]);

  const handleMapReady = useCallback(() => {
    if (!autoFitRegionRef.current) return;
    const region = buildDiscoveryMapRegion(mappableShops, {
      userLocation: userLocatedExplicitly ? userLocation : null,
      matchedCity,
    });
    applyMapRegion(region);
  }, [applyMapRegion, mappableShops, matchedCity, userLocatedExplicitly, userLocation]);

  useEffect(
    () => () => {
      if (viewportDebounceRef.current) clearTimeout(viewportDebounceRef.current);
    },
    []
  );

  const handleRegionChangeComplete = useCallback((region) => {
    if (skipNextRegionSyncRef.current) {
      skipNextRegionSyncRef.current = false;
      return;
    }
    autoFitRegionRef.current = false;
    const sanitized = sanitizeMapRegion(region);
    setMapRegion(sanitized);
    if (viewportDebounceRef.current) clearTimeout(viewportDebounceRef.current);
    viewportDebounceRef.current = setTimeout(() => {
      setViewportRegion(sanitized);
      viewportDebounceRef.current = null;
    }, VIEWPORT_DEBOUNCE_MS);
  }, []);

  const activeAdvancedFilterCount = [
    selectedCategory,
    selectedRepairType,
    selectedBrand,
    minRating,
    radiusKm,
  ].filter(Boolean).length;

  const activeQuickFilterCount = [
    selectedVehicleType,
    openNowOnly,
    verifiedOnly,
  ].filter(Boolean).length;

  const totalActiveFilterCount = activeAdvancedFilterCount + activeQuickFilterCount;

  const filtersLabel = useMemo(() => {
    if (totalActiveFilterCount) {
      return t('serviceCenters.filtersCount', { count: totalActiveFilterCount });
    }
    return t('serviceCenters.filters');
  }, [totalActiveFilterCount, t]);

  const filterSummary = useMemo(
    () =>
      buildActiveFilterSummary(
        {
          selectedVehicleType,
          openNowOnly,
          verifiedOnly,
          selectedCategory,
          selectedRepairType,
          selectedBrand,
          minRating,
          radiusKm,
          categoryOptions,
          repairTypeChipOptions,
          brands,
        },
        t
      ),
    [
      brands,
      categoryOptions,
      minRating,
      openNowOnly,
      radiusKm,
      repairTypeChipOptions,
      selectedBrand,
      selectedCategory,
      selectedRepairType,
      selectedVehicleType,
      t,
      verifiedOnly,
    ]
  );

  const sortOptions = useMemo(
    () =>
      SORT_OPTIONS.map((opt) => ({
        ...opt,
        label: t(`serviceCenters.sort.${opt.value}`),
      })),
    [t]
  );

  const activeSortLabel = useMemo(
    () => sortOptions.find((opt) => opt.value === sort)?.label || t('serviceCenters.sortBy'),
    [sort, sortOptions, t]
  );

  const expandedFilterProps = {
    selectedVehicleType,
    setSelectedVehicleType,
    selectedCategory,
    setSelectedCategory,
    selectedRepairType,
    setSelectedRepairType,
    selectedBrand,
    setSelectedBrand: handleBrandChange,
    minRating,
    setMinRating,
    radiusKm,
    setRadiusKm,
    categoryOptions,
    repairTypeChipOptions,
    brands,
    openNowOnly,
    setOpenNowOnly,
    verifiedOnly,
    setVerifiedOnly,
  };

  const cityLabel = matchedCity?.name || 'Sofia';

  const handleLocateMe = async () => {
    setLocating(true);
    setGeoHint('');
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setGeoHint(t('serviceCenters.geoPermissionDenied'));
        return;
      }
      let position;
      try {
        position = await withTimeout(Location.getCurrentPositionAsync({}));
      } catch {
        position = await Location.getLastKnownPositionAsync({});
      }
      if (!position?.coords) {
        setGeoHint(t('serviceCenters.geoError'));
        return;
      }
      const coords = sanitizeUserLocation([
        position.coords.latitude,
        position.coords.longitude,
      ]);
      if (!coords) {
        setGeoHint(t('serviceCenters.geoError'));
        return;
      }
      setUserLocation(coords);
      setUserLocatedExplicitly(true);
      autoFitRegionRef.current = true;
      const region = sanitizeMapRegion({
        latitude: coords[0],
        longitude: coords[1],
        ...regionDeltaForRadiusKm(DEFAULT_NEARBY_RADIUS_KM, coords[0]),
      });
      applyMapRegion(region);
      await discovery.fetchShops();
    } catch {
      setGeoHint(t('serviceCenters.geoError'));
    } finally {
      setLocating(false);
    }
  };

  const selectCenterForServiceRecord = async (shop) => {
    if (!serviceRecordVehicleId || !shop?.id) return;
    const existing = (await loadServiceRecordFormDraft(serviceRecordVehicleId)) || {};
    await saveServiceRecordFormDraft(serviceRecordVehicleId, {
      ...existing,
      providerMode: 'authorized',
      selectedShopProfileId: String(shop.id),
    });
    navigation.navigate('LogServiceRecord', {
      vehicleId: serviceRecordVehicleId,
      type: route.params?.type,
    });
  };

  const openShopProfile = (shop) => {
    const slug = shop.public_slug || shop.slug;
    const profileParams = {
      returnTo: route.params?.returnTo,
      vehicleId: route.params?.vehicleId,
      shopId: shop.id,
    };
    if (slug) {
      navigateToServiceCenterProfile(navigation, slug, profileParams);
      return;
    }
    navigateToServiceCenterDetail(navigation, shop.id, profileParams);
  };

  const handleRequestService = (shop) => {
    navigation.navigate('CreateRepair', {
      serviceCenter: shop.id,
      repairType: route.params?.repairType || selectedRepairType || undefined,
      vehicleType: route.params?.vehicleType || selectedVehicleType || undefined,
    });
  };

  const handleDirections = (shop) => {
    openShopInMaps({
      googleMapsUrl: shop.google_maps_url,
      latitude: shop.latitude,
      longitude: shop.longitude,
      address: shop.address,
      cityName: shop.city_name,
      countryName: shop.country_name,
    }).catch(() => {});
  };

  const deselectShop = useCallback(() => {
    setSelectedListId(null);
    lastSelectedListIdRef.current = null;
  }, []);

  const scrollSheetListToTop = useCallback(() => {
    requestAnimationFrame(() => {
      listRef.current?.scrollToOffset?.({ offset: 0, animated: true });
      listRef.current?.scrollToIndex?.({ index: 0, animated: true, viewPosition: 0 });
    });
  }, []);

  const expandSheetForSelection = useCallback(
    (targetSnap = 2) => {
      requestAnimationFrame(() => {
        sheetRef.current?.snapTo?.(targetSnap);
        setTimeout(() => scrollSheetListToTop(), 320);
      });
    },
    [scrollSheetListToTop]
  );

  const handleSheetSnapChange = useCallback(
    (index) => {
      sheetSnapRef.current = index;
      if (index === 0 && selectedListId) {
        deselectShop();
      }
    },
    [deselectShop, selectedListId]
  );

  const selectShopOnMap = useCallback(
    (shop) => {
      const listId = shopListId(shop);
      const isReselect = lastSelectedListIdRef.current === listId;
      setSelectedListId(listId);
      lastSelectedListIdRef.current = listId;

      const coord = shopMapCoordinate(shop);
      if (coord && !isReselect) {
        skipNextRegionSyncRef.current = true;
        const region = sanitizeMapRegion({
          ...coord,
          latitudeDelta: 0.06,
          longitudeDelta: 0.06,
        });
        setMapRegion(region);
        mapRef.current?.animateToRegion?.(region, 280);
      }

      expandSheetForSelection(2);
    },
    [expandSheetForSelection]
  );

  useEffect(() => {
    if (!selectedListId) return;
    const stillVisible = visibleShops.some((shop) => shopListId(shop) === selectedListId);
    if (!stillVisible) {
      deselectShop();
    }
  }, [deselectShop, selectedListId, visibleShops]);

  const sheetShops = useMemo(() => {
    if (!selectedListId) return visibleShops;
    const selectedIndex = visibleShops.findIndex((shop) => shopListId(shop) === selectedListId);
    if (selectedIndex <= 0) return visibleShops;
    const selected = visibleShops[selectedIndex];
    const rest = visibleShops.filter((_, index) => index !== selectedIndex);
    return [selected, ...rest];
  }, [selectedListId, visibleShops]);

  useEffect(() => {
    if (!selectedListId || sheetSnapRef.current === 0) return;
    scrollSheetListToTop();
  }, [scrollSheetListToTop, selectedListId, sheetShops]);

  const handleBack = () => {
    if (route.params?.returnTo === 'ManageVehicleServiceCenters' && authorizeVehicleId != null) {
      navigation.navigate('ManageVehicleServiceCenters', { vehicleId: authorizeVehicleId });
      return;
    }
    if (route.params?.returnTo === 'VehicleDetail' && authorizeVehicleId != null) {
      navigation.navigate('VehicleDetail', { vehicleId: authorizeVehicleId });
      return;
    }
    if (partnerMode) {
      navigateToPartnerDashboard(navigation);
      return;
    }
    goBackFromServiceCenters(navigation);
  };

  const mapMarkers = useMemo(
    () =>
      visibleMapShops.map((shop) => {
        const listId = shopListId(shop);
        const isSelected = selectedListId === listId;
        return (
          <ServiceCenterMapMarker
            key={buildServiceCenterMarkerKey(shop, isSelected)}
            shop={shop}
            selected={isSelected}
            onPress={() => selectShopOnMap(shop)}
          />
        );
      }),
    [visibleMapShops, selectShopOnMap, selectedListId]
  );

  const emptyState = (
    <View style={styles.emptyState}>
      {loadError ? (
        <>
          <Text style={styles.emptyTitle}>
            {authRequired
              ? t('serviceCenters.signInRequired', null, 'Sign in to view service centers')
              : t('serviceCenters.loadError', null, 'Could not load service centers')}
          </Text>
          {authRequired ? (
            <Pressable style={styles.emptyButton} onPress={() => navigateToSignIn(navigation)}>
              <Text style={styles.emptyButtonText}>{t('auth.signIn')}</Text>
            </Pressable>
          ) : (
            <Pressable style={styles.emptyButton} onPress={() => fetchShops().catch(() => {})}>
              <Text style={styles.emptyButtonText}>{t('common.retry', null, 'Try again')}</Text>
            </Pressable>
          )}
        </>
      ) : (
        <>
          <Text style={styles.emptyTitle}>{t('serviceCenters.emptyTitle')}</Text>
          <Pressable style={styles.emptyButton} onPress={() => clearFilters().catch(() => {})}>
            <Text style={styles.emptyButtonText}>{t('serviceCenters.clearFilters')}</Text>
          </Pressable>
          <Pressable style={styles.emptyButtonSecondary} onPress={() => showAllInMatchedCity().catch(() => {})}>
            <Text style={styles.emptyButtonSecondaryText}>
              {t('serviceCenters.showAllInCity', { city: cityLabel })}
            </Text>
          </Pressable>
        </>
      )}
    </View>
  );

  const resultsLabel = t('serviceCenters.resultsCountInArea', { count: visibleShops.length });

  const mapBottomPadding = Math.round(SCREEN_H * COLLAPSED_SHEET_FRACTION) + 24;

  const screenTitle = authorizeMode
    ? t('serviceCenters.authorizeTitle')
    : partnerMode
      ? t('serviceCenters.exploreTitle')
      : t('serviceCenters.findTitle');

  if (loading && shops.length === 0 && !addressQuery) {
    return (
      <ScreenBackground safeArea={false}>
        <View style={[BASE_STYLES.flexFill, styles.loaderWrap]}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </ScreenBackground>
    );
  }

  return (
    <ScreenBackground safeArea={false}>
      <View style={styles.container}>
        <MapView
          ref={mapRef}
          style={styles.map}
          region={mapRegion}
          onMapReady={handleMapReady}
          onRegionChangeComplete={handleRegionChangeComplete}
          mapPadding={{
            top: insets.top + 120,
            right: 16,
            bottom: mapBottomPadding,
            left: 16,
          }}
          loadingEnabled
          showsUserLocation={false}
          showsMyLocationButton={false}
        >
          {mapMarkers}
          {userLocatedExplicitly && userLocation ? (
            <Marker
              coordinate={{ latitude: userLocation[0], longitude: userLocation[1] }}
              anchor={{ x: 0.5, y: 0.5 }}
              zIndex={20}
              tracksViewChanges={false}
            >
              <View style={styles.userMarkerOuter}>
                <View style={styles.userMarkerInner} />
              </View>
            </Marker>
          ) : null}
        </MapView>

        <View style={[styles.headerOverlay, { paddingTop: insets.top + 6 }]} pointerEvents="box-none">
          <View style={styles.headerRow}>
            <BackHeaderButton
              onPress={handleBack}
              label={t('navigation.back')}
              variant="light"
              iconOnly
            />
            <Text style={styles.title} numberOfLines={1}>
              {screenTitle}
            </Text>
          </View>

          <View style={styles.searchFloating}>
            <MaterialCommunityIcons name="magnify" size={18} color="#64748b" style={styles.searchIcon} />
            <TextInput
              placeholder={t('serviceCenters.searchPlaceholder')}
              placeholderTextColor="#94a3b8"
              value={addressQuery}
              onChangeText={setAddressQuery}
              onSubmitEditing={() => handleSearch().catch(() => {})}
              style={styles.searchInput}
              returnKeyType="search"
            />
          </View>

          <View style={styles.filtersRow}>
            <Pressable
              style={({ pressed }) => [styles.filtersBtn, pressed && styles.filtersBtnPressed]}
              onPress={openFilters}
              accessibilityLabel={filtersLabel}
            >
              <MaterialCommunityIcons name="tune-variant" size={16} color={COLORS.primary} />
              <Text style={styles.filtersBtnText} numberOfLines={1}>
                {filtersLabel}
              </Text>
            </Pressable>
            {filterSummary ? (
              <Text style={styles.filterSummary} numberOfLines={1}>
                {filterSummary}
              </Text>
            ) : null}
          </View>

          {authorizeMode ? (
            <View style={styles.authorizeBanner}>
              <MaterialCommunityIcons name="car-info" size={16} color={COLORS.primary} />
              <Text style={styles.authorizeBannerText} numberOfLines={2}>
                {t('serviceCenters.authorizeBanner', {
                  vehicle: formatVehicleAuthorizeLabel(authorizeVehicle),
                })}
              </Text>
            </View>
          ) : null}
          {geoHint ? <Text style={styles.geoHint}>{geoHint}</Text> : null}
        </View>

        <Pressable
          style={[
            styles.locateBtn,
            { bottom: mapBottomPadding + Math.max(insets.bottom, 8) },
            locating && styles.locateBtnDisabled,
          ]}
          onPress={handleLocateMe}
          disabled={locating}
          accessibilityLabel={t('serviceCenters.locateMe')}
        >
          {locating ? (
            <ActivityIndicator size="small" color={COLORS.primary} />
          ) : (
            <MaterialCommunityIcons name="crosshairs-gps" size={22} color={COLORS.primary} />
          )}
        </Pressable>

        <DiscoveryMapBottomSheet
          ref={sheetRef}
          shops={sheetShops}
          loading={loading}
          selectedId={selectedListId}
          userLocation={userLocation}
          userLocatedExplicitly={userLocatedExplicitly}
          resultsLabel={resultsLabel}
          sortLabel={activeSortLabel}
          onOpenSort={() => setSortOpen(true)}
          onSelectShop={selectShopOnMap}
          onDeselectShop={deselectShop}
          onViewProfile={openShopProfile}
          onDirections={handleDirections}
          onRequestService={
            pickForServiceRecord
              ? selectCenterForServiceRecord
              : handleRequestService
          }
          ownShopId={currentShopId}
          emptyComponent={emptyState}
          bottomInset={insets.bottom}
          listRef={listRef}
          onSnapChange={handleSheetSnapChange}
          initialSnapIndex={0}
        />
      </View>

      <DiscoveryFiltersBottomSheet
        visible={filtersOpen}
        onClose={closeFilters}
        onApply={() => {
          autoFitRegionRef.current = true;
          handleSearch().catch(() => {});
        }}
        activeFilterCount={activeAdvancedFilterCount}
        filterProps={expandedFilterProps}
      />

      <DiscoverySortSheet
        visible={sortOpen}
        onClose={() => setSortOpen(false)}
        value={sort}
        options={sortOptions}
        onSelect={setSort}
      />
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loaderWrap: { justifyContent: 'center', alignItems: 'center' },
  map: { ...StyleSheet.absoluteFillObject },
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingHorizontal: DISCOVERY_MOBILE.space.screenX,
    paddingBottom: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  title: {
    flex: 1,
    fontSize: DISCOVERY_MOBILE.type.title,
    fontWeight: '700',
    color: DISCOVERY_MOBILE.color.text,
    textShadowColor: 'rgba(255,255,255,0.9)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
  },
  searchFloating: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: DISCOVERY_MOBILE.color.border,
    borderRadius: DISCOVERY_MOBILE.radius.search,
    backgroundColor: 'rgba(255,255,255,0.97)',
    paddingHorizontal: 10,
    minHeight: DISCOVERY_MOBILE.height.search,
    ...DISCOVERY_MOBILE.shadow.card,
  },
  searchIcon: { marginRight: 6 },
  searchInput: {
    flex: 1,
    fontSize: discoveryMinFont(15),
    color: DISCOVERY_MOBILE.color.text,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
  },
  filtersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  filtersBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    minHeight: DISCOVERY_MOBILE.height.chip,
    borderRadius: DISCOVERY_MOBILE.radius.chip,
    borderWidth: 1,
    borderColor: DISCOVERY_MOBILE.color.border,
    backgroundColor: 'rgba(255,255,255,0.97)',
    maxWidth: 150,
    ...DISCOVERY_MOBILE.shadow.card,
  },
  filtersBtnPressed: { opacity: 0.92 },
  filtersBtnText: {
    fontSize: discoveryMinFont(DISCOVERY_MOBILE.type.meta),
    fontWeight: '600',
    color: DISCOVERY_MOBILE.color.text,
  },
  filterSummary: {
    flex: 1,
    fontSize: discoveryMinFont(DISCOVERY_MOBILE.type.caption),
    color: DISCOVERY_MOBILE.color.textMuted,
    backgroundColor: 'rgba(255,255,255,0.88)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    overflow: 'hidden',
  },
  authorizeBanner: {
    marginTop: 8,
    padding: 8,
    borderRadius: DISCOVERY_MOBILE.radius.cta,
    backgroundColor: 'rgba(255,255,255,0.95)',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    ...DISCOVERY_MOBILE.shadow.card,
  },
  authorizeBannerText: {
    flex: 1,
    color: '#1e3a8a',
    fontSize: discoveryMinFont(12),
    lineHeight: 16,
  },
  geoHint: {
    marginTop: 6,
    color: '#b45309',
    fontSize: discoveryMinFont(12),
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  locateBtn: {
    position: 'absolute',
    right: DISCOVERY_MOBILE.space.screenX,
    zIndex: 15,
    width: DISCOVERY_MOBILE.height.locateBtn,
    height: DISCOVERY_MOBILE.height.locateBtn,
    borderRadius: DISCOVERY_MOBILE.radius.search,
    borderWidth: 1,
    borderColor: DISCOVERY_MOBILE.color.border,
    backgroundColor: 'rgba(255,255,255,0.97)',
    alignItems: 'center',
    justifyContent: 'center',
    ...DISCOVERY_MOBILE.shadow.card,
  },
  locateBtnDisabled: { opacity: 0.75 },
  userMarkerOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(37,99,235,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  userMarkerInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
  },
  emptyState: { paddingVertical: 20, paddingHorizontal: 8, alignItems: 'center' },
  emptyTitle: { color: '#64748b', textAlign: 'center', marginBottom: 14, fontSize: 15 },
  emptyButton: {
    backgroundColor: COLORS.primary,
    borderRadius: DISCOVERY_MOBILE.radius.cta,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginBottom: 8,
    width: '100%',
    maxWidth: 300,
  },
  emptyButtonText: { color: '#fff', fontWeight: '700', fontSize: discoveryMinFont(14) },
  emptyButtonSecondary: {
    borderRadius: DISCOVERY_MOBILE.radius.cta,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#cbd5e1',
    backgroundColor: '#fff',
    width: '100%',
    maxWidth: 300,
  },
  emptyButtonSecondaryText: { color: '#334155', fontWeight: '600', textAlign: 'center' },
});
