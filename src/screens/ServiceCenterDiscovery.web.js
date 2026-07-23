// PATH: src/screens/ServiceCenterDiscovery.web.js
/**
 * Shared Google Maps-style discovery UI (list + map) for public and partner explore.
 */
import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ActivityIndicator,
  ScrollView,
  useWindowDimensions,
  Platform,
} from 'react-native';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
  ZoomControl,
} from 'react-leaflet';
import L from 'leaflet';
import { useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import { COLORS } from '../styles/colors';
import { API_BASE_URL } from '../api/config';
import BASE_STYLES from '../styles/base';
import BackHeaderButton from '../components/navigation/BackHeaderButton';
import ScreenBackground from '../components/ScreenBackground';
import ServiceCenterListCard from '../components/serviceCenters/ServiceCenterListCard';
import PartnerMarketComparisonCard from '../components/partner/PartnerMarketComparisonCard';
import CompactLanguageSelector from '../components/common/CompactLanguageSelector';
import { DiscoveryFilterChip } from '../components/serviceCenters/DiscoveryFilterChip';
import DiscoveryExpandedFiltersPanel from '../components/serviceCenters/DiscoveryExpandedFiltersPanel';
import DiscoveryFiltersBottomSheet from '../components/serviceCenters/DiscoveryFiltersBottomSheet';
import DiscoveryViewToggle from '../components/serviceCenters/DiscoveryViewToggle';
import DiscoverySortSheet, { DiscoverySortTrigger } from '../components/serviceCenters/DiscoverySortSheet';
import DiscoveryCompactFooter from '../components/serviceCenters/DiscoveryCompactFooter';
import DISCOVERY_MOBILE, { discoveryMinFont } from '../components/serviceCenters/discoveryMobileTokens';
import { DISCOVERY_QUICK_VEHICLE_CHIPS } from '../api/serviceCenters';
import { spreadShopMarkersForMap } from '../utils/mapMarkerSpread';
import { shopHasMappableCoordinates } from '../utils/mapDiscoveryData';
import { getWebGeolocation } from '../utils/webGeolocation';
import { ensureLeafletCss } from '../utils/leafletAssets.web';
import createVeversalLeafletPinIcon from '../components/maps/VeversalMapPin.web';
import {
  useServiceCenterDiscovery,
  SORT_OPTIONS,
} from '../hooks/useServiceCenterDiscovery';
import { applyDiscoverySeoMeta, buildDiscoverySeoMeta } from '../utils/seo/seoMetadata';
import { brandSlugFromId } from '../utils/seo/seoSlugCatalog';
import { buildLocalizedDiscoveryPath } from '../navigation/localizedRoutes';
import DiscoverySeoBreadcrumbs from '../components/serviceCenters/DiscoverySeoBreadcrumbs.web';
import { getLocale } from '../i18n';
import { useScrollContentBottomPadding } from '../utils/mobileWebInsets';
import {
  goBackFromServiceCenters,
  navigateToServiceCenterProfile,
  navigateToServiceCenterDetail,
} from '../navigation/serviceCentersNavigation';
import { navigateToPartnerDashboard, navigateToVehicleServiceRecordNew, navigateToRepairRequestNew } from '../navigation/webNavigation';
import { navigateToSignIn, resetToPublicHome } from '../navigation/authNavigation';
import { AuthContext } from '../context/AuthManager';
import {
  loadServiceRecordFormDraft,
  saveServiceRecordFormDraft,
} from '../utils/serviceRecordDraftStorage';
import {
  formatVehicleAuthorizeLabel,
  resolveAuthorizeVehicleId,
} from '../utils/vehicleShopAuthorization';
import { useTranslation } from '../i18n';
import { trackDiscoverySearchClick } from '../analytics/searchAnalytics';

const DEFAULT_MAP_CENTER = [42.6977, 23.3219];
function configureLeafletIcons() {
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  });
}

function ChangeView({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

function FocusMarker({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position) map.panTo(position);
  }, [position, map]);
  return null;
}

function AnimatedExpandedFilters({ visible, children }) {
  return (
    <View
      style={[
        styles.expandedFiltersWrap,
        visible ? styles.expandedFiltersOpen : styles.expandedFiltersClosed,
      ]}
    >
      {children}
    </View>
  );
}

export default function ServiceCenterDiscovery({ partnerMode = false }) {
  const navigation = useNavigation();
  const route = useRoute();
  const { t } = useTranslation();
  const { isAuthenticated } = useContext(AuthContext) || {};
  const { width, height: windowHeight } = useWindowDimensions();
  const isDesktop = width >= 960;
  const isMobileWeb = !isDesktop;
  const isNarrowMobile = width < 400;
  const listBottomPadding = useScrollContentBottomPadding(24);
  const mobileMapMinHeight = Math.max(280, Math.round(windowHeight * 0.48));

  const discovery = useServiceCenterDiscovery({
    initialCitySlug: route.params?.citySlug || null,
    initialRepairType: route.params?.repairType || null,
    initialVehicleType: route.params?.vehicleType || null,
    initialBrandSlug: route.params?.brandSlug || null,
  });

  const seoContext = useMemo(
    () => ({
      citySlug: discovery.citySlug || route.params?.citySlug || null,
      vehicleType: discovery.selectedVehicleType || route.params?.vehicleType || null,
      repairType: discovery.selectedRepairType || route.params?.repairType || null,
      brandSlug:
        discovery.brandSlug
        || route.params?.brandSlug
        || brandSlugFromId(discovery.selectedBrand, discovery.brands),
      lang: getLocale(),
    }),
    [
      discovery.citySlug,
      discovery.selectedVehicleType,
      discovery.selectedRepairType,
      discovery.brandSlug,
      discovery.selectedBrand,
      discovery.brands,
      route.params?.citySlug,
      route.params?.vehicleType,
      route.params?.repairType,
      route.params?.brandSlug,
    ]
  );

  const seoMeta = useMemo(() => buildDiscoverySeoMeta(seoContext), [seoContext]);

  useEffect(() => {
    applyDiscoverySeoMeta(seoContext);
  }, [seoContext]);

  const [mapReady, setMapReady] = useState(false);
  const [center, setCenter] = useState(DEFAULT_MAP_CENTER);
  const [locating, setLocating] = useState(false);
  const [geoHint, setGeoHint] = useState('');
  const [mobileTab, setMobileTab] = useState('list');
  const [selectedListId, setSelectedListId] = useState(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const cardRefs = useRef({});
  const zoom = 12;

  const {
    shops,
    loading,
    addressQuery,
    setAddressQuery,
    activeSearchTerm,
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
    citySlug,
    sort,
    setSort,
    brands,
    categoryOptions,
    repairTypeChipOptions,
    userLocation,
    setUserLocation,
    userLocatedExplicitly,
    setUserLocatedExplicitly,
    matchedCity,
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

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined' || partnerMode) return;
    const nextPath = buildLocalizedDiscoveryPath({
      lang: getLocale(),
      brandSlug: seoContext.brandSlug,
      citySlug: seoContext.citySlug,
      repairType: seoContext.repairType,
      vehicleType: seoContext.vehicleType,
    });
    const currentPath = `${window.location.pathname}${window.location.search}`;
    if (nextPath !== currentPath.split('?')[0]) {
      window.history.replaceState(window.history.state, '', nextPath);
    }
  }, [seoContext, partnerMode]);

  const closeFilters = useCallback(() => setFiltersOpen(false), []);

  const openFilters = useCallback(() => {
    setFiltersOpen(true);
    loadFilterTaxonomy().catch(() => {});
  }, [loadFilterTaxonomy]);

  const toggleFilters = useCallback(() => {
    if (filtersOpen) {
      closeFilters();
    } else {
      openFilters();
    }
  }, [filtersOpen, closeFilters, openFilters]);

  const handleSearch = useCallback(async () => {
    await runSearch();
    closeFilters();
  }, [runSearch, closeFilters]);

  useEffect(() => {
    let alive = true;
    ensureLeafletCss()
      .then(() => {
        configureLeafletIcons();
        if (alive) setMapReady(true);
      })
      .catch((err) => console.error('Leaflet CSS failed to load', err));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (matchedCity?.latitude != null && matchedCity?.longitude != null) {
      const lat = parseFloat(matchedCity.latitude);
      const lng = parseFloat(matchedCity.longitude);
      if (Number.isFinite(lat) && Number.isFinite(lng)) setCenter([lat, lng]);
      return;
    }
    if (!userLocatedExplicitly && shops.length > 0) {
      const lat = parseFloat(shops[0].latitude);
      const lng = parseFloat(shops[0].longitude);
      if (Number.isFinite(lat) && Number.isFinite(lng)) setCenter([lat, lng]);
    }
  }, [shops, userLocatedExplicitly, matchedCity]);

  useEffect(() => {
    if (!selectedListId) return;
    const node = cardRefs.current[selectedListId];
    if (node?.scrollIntoView) {
      node.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [selectedListId]);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape' && filtersOpen) {
        e.preventDefault();
        closeFilters();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [filtersOpen, closeFilters]);

  const mapShops = useMemo(
    () =>
      spreadShopMarkersForMap(
        shops.filter((shop) => shopHasMappableCoordinates(shop)),
        userLocatedExplicitly && userLocation
          ? { latitude: userLocation[0], longitude: userLocation[1] }
          : null
      ),
    [shops, userLocation, userLocatedExplicitly]
  );

  const selectedShop = mapShops.find((s) => (s.list_id || `shop-${s.id}`) === selectedListId);

  const handleLocateMe = async () => {
    setLocating(true);
    setGeoHint('');
    try {
      const { latitude, longitude } = await getWebGeolocation();
      const coords = [latitude, longitude];
      setUserLocation(coords);
      setUserLocatedExplicitly(true);
      setCenter(coords);
      await discovery.fetchShops();
    } catch (err) {
      setGeoHint(err?.message || t('serviceCenters.geoError'));
    } finally {
      setLocating(false);
    }
  };

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

  const selectCenterForServiceRecord = async (shop) => {
    if (!serviceRecordVehicleId || !shop?.id) return;
    const existing = (await loadServiceRecordFormDraft(serviceRecordVehicleId)) || {};
    await saveServiceRecordFormDraft(serviceRecordVehicleId, {
      ...existing,
      providerMode: 'authorized',
      selectedShopProfileId: String(shop.id),
    });
    navigateToVehicleServiceRecordNew(navigation, serviceRecordVehicleId, {
      type: route.params?.type,
    });
  };

  const openShopProfile = (shop) => {
    trackDiscoverySearchClick(
      {
        activeSearchTerm,
        citySlug,
        selectedBrand,
        selectedVehicleType,
        selectedRepairType,
        selectedCategory,
        verifiedOnly,
        openNowOnly,
        minRating,
        radiusKm,
        sort,
        resultCount: shops.length,
      },
      shop
    );

    const slug = shop.public_slug || shop.slug;
    // Prefer backend canonical slug; never open discovery (/avtoservizi) for a profile.
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
    navigateToRepairRequestNew(navigation, {
      serviceCenter: shop.id,
      repairType: route.params?.repairType || selectedRepairType || undefined,
      vehicleType: route.params?.vehicleType || selectedVehicleType || undefined,
    });
  };

  const handleDirections = (shop) => {
    const lat = parseFloat(shop.latitude);
    const lon = parseFloat(shop.longitude);
    if (Number.isFinite(lat) && Number.isFinite(lon)) {
      window.open(`https://www.google.com/maps/search/?api=1&query=${lat},${lon}`, '_blank');
    }
  };

  const selectShopOnMap = (shop) => {
    const listId = shop.list_id || `shop-${shop.id}`;
    setSelectedListId(listId);
    if (!isDesktop) setMobileTab('map');
    const lat = parseFloat(shop.latitude);
    const lon = parseFloat(shop.longitude);
    if (Number.isFinite(lat) && Number.isFinite(lon)) setCenter([lat, lon]);
  };

  const activeAdvancedFilterCount = [
    selectedCategory,
    selectedRepairType,
    selectedBrand,
    minRating,
    radiusKm,
  ].filter(Boolean).length;

  const filtersLabel = useMemo(() => {
    if (filtersOpen && isDesktop) return t('serviceCenters.filtersExpanded');
    if (activeAdvancedFilterCount) {
      return t('serviceCenters.filtersCount', { count: activeAdvancedFilterCount });
    }
    return t('serviceCenters.filters');
  }, [filtersOpen, isDesktop, activeAdvancedFilterCount, t]);

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
  };

  const cityLabel = matchedCity?.name || 'Sofia';
  const resultsLabel = t('serviceCenters.resultsCount', { count: shops.length });

  const quickChipsRow = (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.filterRow}
      contentContainerStyle={styles.filterRowContent}
    >
      <DiscoveryFilterChip
        label={filtersLabel}
        icon="tune-variant"
        variant="filters"
        onPress={toggleFilters}
      />
      {DISCOVERY_QUICK_VEHICLE_CHIPS.map((vt) => {
        const on = selectedVehicleType === vt.code;
        return (
          <DiscoveryFilterChip
            key={vt.code}
            label={t(`vehicleTypes.${vt.code}`, null, vt.label)}
            selected={on}
            onPress={() => setSelectedVehicleType(on ? null : vt.code)}
          />
        );
      })}
      <DiscoveryFilterChip
        label={t('serviceCenters.openNow')}
        selected={openNowOnly}
        onPress={() => setOpenNowOnly((v) => !v)}
      />
      <DiscoveryFilterChip
        label={t('serviceCenters.verified')}
        selected={verifiedOnly}
        onPress={() => setVerifiedOnly((v) => !v)}
      />
    </ScrollView>
  );

  const showPublicHeaderActions = isMobileWeb && !partnerMode && !authorizeMode && !isAuthenticated;

  const stickyToolbar = (
    <View style={[styles.stickyToolbar, isMobileWeb && styles.stickyToolbarMobile]}>
      <View style={[styles.header, isMobileWeb && styles.headerMobile]}>
        <BackHeaderButton
          onPress={() => {
            if (route.params?.returnTo === 'ManageVehicleServiceCenters' && authorizeVehicleId != null) {
              navigation.navigate('ManageVehicleServiceCenters', { vehicleId: authorizeVehicleId });
              return;
            }
            if (route.params?.returnTo === 'VehicleDetail' && authorizeVehicleId != null) {
              navigation.navigate('VehicleDetail', { vehicleId: authorizeVehicleId });
              return;
            }
            partnerMode ? navigateToPartnerDashboard(navigation) : goBackFromServiceCenters(navigation);
          }}
          label={t('navigation.back')}
          variant={isMobileWeb ? 'light' : 'glass'}
          iconOnly={isMobileWeb}
        />
        <Text
          style={[styles.title, isMobileWeb && styles.titleMobile, isNarrowMobile && styles.titleNarrow]}
          numberOfLines={1}
        >
          {authorizeMode
            ? t('serviceCenters.authorizeTitle')
            : partnerMode
              ? t('serviceCenters.exploreTitle')
              : seoMeta?.h1 || t('serviceCenters.findTitle')}
        </Text>
        {showPublicHeaderActions ? (
          <View style={styles.headerActionsMobile}>
            <Pressable
              onPress={() => resetToPublicHome(navigation)}
              accessibilityRole="button"
              accessibilityLabel={t('common.home')}
              hitSlop={6}
              style={({ pressed }) => [styles.headerActionBtn, pressed && styles.headerActionPressed]}
            >
              <MaterialCommunityIcons name="home-outline" size={20} color="#334155" />
            </Pressable>
            <Pressable
              onPress={() => {
                navigateToSignIn(navigation).catch(() => {});
              }}
              accessibilityRole="button"
              accessibilityLabel={t('auth.signIn')}
              hitSlop={6}
              style={({ pressed }) => [styles.headerSignInBtn, pressed && styles.headerActionPressed]}
            >
              <Text style={styles.headerSignInText} numberOfLines={1}>
                {t('auth.signIn')}
              </Text>
            </Pressable>
          </View>
        ) : null}
        {isDesktop ? (
          <CompactLanguageSelector
            variant="light"
            compact
            presentation="portalDropdown"
            style={styles.serviceCentersLangSelector}
          />
        ) : null}
      </View>

      <View style={[styles.searchRow, isMobileWeb && styles.searchRowMobile]}>
        <View style={[styles.searchInputWrap, isMobileWeb && styles.searchInputWrapMobile]}>
          <MaterialCommunityIcons name="magnify" size={18} color="#64748b" style={styles.searchIcon} />
          <TextInput
            placeholder={
              isNarrowMobile
                ? t('serviceCenters.searchPlaceholderShort', null, 'Search centers…')
                : t('serviceCenters.searchPlaceholder')
            }
            value={addressQuery}
            onChangeText={setAddressQuery}
            onSubmitEditing={() => handleSearch().catch(() => {})}
            style={[styles.searchInput, isMobileWeb && styles.searchInputMobile]}
            returnKeyType="search"
            placeholderTextColor="#94a3b8"
          />
        </View>
        <Pressable
          style={[
            isMobileWeb ? styles.locateIconBtn : styles.locatePill,
            locating && styles.locatePillDisabled,
          ]}
          onPress={handleLocateMe}
          disabled={locating}
          accessibilityLabel={t('serviceCenters.locateMe')}
        >
          {locating ? (
            <ActivityIndicator size="small" color={isMobileWeb ? COLORS.primary : '#fff'} />
          ) : (
            <MaterialCommunityIcons
              name="crosshairs-gps"
              size={isMobileWeb ? 20 : 16}
              color={isMobileWeb ? COLORS.primary : '#fff'}
              style={isMobileWeb ? null : styles.locateIcon}
            />
          )}
          {!isMobileWeb ? (
            <Text style={styles.locatePillText} numberOfLines={1}>
              {locating ? '…' : t('serviceCenters.locateMe')}
            </Text>
          ) : null}
        </Pressable>
        {isDesktop ? (
          <Pressable style={styles.searchButton} onPress={() => handleSearch().catch(() => {})}>
            <Text style={styles.searchButtonText}>{t('serviceCenters.search')}</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={[styles.filterChrome, isMobileWeb && styles.filterChromeMobile]}>{quickChipsRow}</View>

      {isDesktop ? (
        <AnimatedExpandedFilters visible={filtersOpen}>
          <View style={styles.expandedFilters}>
            <Pressable onPress={closeFilters} style={styles.hideFiltersRow}>
              <MaterialCommunityIcons name="chevron-up" size={18} color={COLORS.primary} />
              <Text style={styles.hideFiltersText}>{t('serviceCenters.hideFilters')}</Text>
            </Pressable>
            <DiscoveryExpandedFiltersPanel {...expandedFilterProps} />
          </View>
        </AnimatedExpandedFilters>
      ) : null}
    </View>
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
          <View style={styles.emptyActions}>
            <Pressable style={styles.emptyButton} onPress={() => clearFilters().catch(() => {})}>
              <Text style={styles.emptyButtonText}>{t('serviceCenters.clearFilters')}</Text>
            </Pressable>
            <Pressable style={styles.emptyButtonSecondary} onPress={() => showAllInMatchedCity().catch(() => {})}>
              <Text style={styles.emptyButtonSecondaryText}>
                {t('serviceCenters.showAllInCity', { city: cityLabel })}
              </Text>
            </Pressable>
            <Pressable
              style={styles.emptyButtonSecondary}
              onPress={() => navigation.navigate('AddManualServiceCenter', { discoveryReport: true })}
            >
              <Text style={styles.emptyButtonSecondaryText}>{t('serviceCenters.addMissingCenter')}</Text>
            </Pressable>
          </View>
        </>
      )}
    </View>
  );

  const listPanel = (
    <View style={[styles.listPanel, isMobileWeb && styles.listPanelMobile]}>
      {partnerMode ? (
        <PartnerMarketComparisonCard compact={isMobileWeb} onCompare={() => {}} />
      ) : null}
      {isDesktop ? (
        <View style={styles.listPanelHeader}>
          <Text style={styles.resultsCount}>{resultsLabel}</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.sortRowScroll}
            contentContainerStyle={styles.sortRow}
          >
            {sortOptions.map((opt) => (
              <Pressable
                key={opt.value}
                onPress={() => setSort(opt.value)}
                style={[styles.sortChip, sort === opt.value && styles.sortChipActive]}
              >
                <Text style={[styles.sortChipText, sort === opt.value && styles.sortChipTextActive]}>
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ) : null}
      <ScrollView
        style={styles.listScroll}
        contentContainerStyle={[styles.listContent, { paddingBottom: listBottomPadding }]}
      >
        {loading && shops.length === 0 ? (
          <ActivityIndicator style={{ marginTop: 24 }} color={COLORS.primary} />
        ) : null}
        {!loading && shops.length === 0 ? emptyState : null}
        {shops.map((shop) => {
          const listId = shop.list_id || `shop-${shop.id}`;
          return (
            <View
              key={listId}
              ref={(node) => {
                cardRefs.current[listId] = node;
              }}
            >
              <ServiceCenterListCard
                shop={shop}
                selected={selectedListId === listId}
                userLocation={userLocation}
                showDistance={userLocatedExplicitly}
                onPress={() => selectShopOnMap(shop)}
                onViewProfile={() => openShopProfile(shop)}
                onDirections={() => handleDirections(shop)}
                onRequestService={
                  pickForServiceRecord
                    ? () => selectCenterForServiceRecord(shop)
                    : () => handleRequestService(shop)
                }
                mobile={isMobileWeb}
              />
            </View>
          );
        })}
        {isMobileWeb ? <DiscoveryCompactFooter /> : null}
      </ScrollView>
    </View>
  );

  const mapStyle = {
    flex: 1,
    height: '100%',
    width: '100%',
    minHeight: isMobileWeb ? mobileMapMinHeight : 320,
  };

  const mapPanel = !mapReady ? (
    <View style={[mapStyle, styles.mapLoading]}>
      <ActivityIndicator size="large" color="#fff" />
    </View>
  ) : (
    <MapContainer center={center} zoom={zoom} style={mapStyle} zoomControl={false}>
      <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <ChangeView center={center} zoom={zoom} />
      {selectedShop ? (
        <FocusMarker
          position={[
            selectedShop.displayLatitude ?? selectedShop.latitude,
            selectedShop.displayLongitude ?? selectedShop.longitude,
          ]}
        />
      ) : null}
      <ZoomControl position="bottomright" />
      {userLocatedExplicitly && userLocation ? (
        <Marker
          position={userLocation}
          icon={L.icon({
            iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
            shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41],
          })}
        />
      ) : null}
      {mapShops.map((shop) => {
        const markerKey = shop.list_id || `${shop.source || 'shop'}-${shop.id}`;
        const lat = shop.displayLatitude ?? shop.latitude;
        const lon = shop.displayLongitude ?? shop.longitude;
        const isSelected = selectedListId === markerKey;
        return (
          <Marker
            key={markerKey}
            position={[lat, lon]}
            icon={createVeversalLeafletPinIcon(shop, { selected: isSelected })}
            eventHandlers={{
              click: () => {
                setSelectedListId(markerKey);
                if (!isDesktop) setMobileTab('list');
              },
            }}
          >
            <Popup>
              <View style={{ maxWidth: 240 }}>
                <Text style={{ fontWeight: 'bold', marginBottom: 4 }}>{shop.name}</Text>
                <Text style={{ marginBottom: 4 }}>{shop.address || shop.city_name}</Text>
                {pickForServiceRecord ? (
                  <Pressable style={styles.popupButton} onPress={() => selectCenterForServiceRecord(shop)}>
                    <Text style={styles.popupButtonText}>{t('serviceCenters.useForRecord')}</Text>
                  </Pressable>
                ) : null}
                <Pressable style={styles.popupButton} onPress={() => handleDirections(shop)}>
                  <Text style={styles.popupButtonText}>{t('serviceCenters.directions')}</Text>
                </Pressable>
                <Pressable style={styles.popupButtonSecondary} onPress={() => openShopProfile(shop)}>
                  <Text style={styles.popupButtonSecondaryText}>{t('serviceCenters.viewProfile')}</Text>
                </Pressable>
              </View>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );

  if (loading && shops.length === 0 && !addressQuery) {
    return (
      <ScreenBackground safeArea={false} contentMaxWidth={false}>
        <View style={BASE_STYLES.loadingCenter}>
          <ActivityIndicator size="large" />
        </View>
      </ScreenBackground>
    );
  }

  return (
    <ScreenBackground safeArea={false} contentMaxWidth={false}>
      <View style={styles.container}>
        {!partnerMode && !authorizeMode && isDesktop ? (
          <DiscoverySeoBreadcrumbs trail={seoMeta?.breadcrumb_trail} />
        ) : null}
        {stickyToolbar}
        {authorizeMode ? (
        <View style={styles.authorizeBanner}>
          <MaterialCommunityIcons name="car-info" size={18} color={COLORS.primary} />
          <Text style={styles.authorizeBannerText}>
            {t('serviceCenters.authorizeBanner', {
              vehicle: formatVehicleAuthorizeLabel(authorizeVehicle),
            })}
          </Text>
        </View>
      ) : null}
      {geoHint ? <Text style={[styles.geoHint, isMobileWeb && styles.geoHintMobile]}>{geoHint}</Text> : null}
        {!isMobileWeb || mobileTab === 'list' ? (
          userLocatedExplicitly ? (
            <Text style={[styles.locationHint, isMobileWeb && styles.locationHintMobile]}>
              {t('serviceCenters.locationHintNear')}
            </Text>
          ) : (
            <Text style={[styles.locationHint, isMobileWeb && styles.locationHintMobile]}>
              {t('serviceCenters.locationHintTap')}
            </Text>
          )
        ) : null}

        {!isDesktop ? (
          <View style={[styles.mobileChrome, mobileTab === 'map' && styles.mobileChromeMap]}>
            <DiscoveryViewToggle
              value={mobileTab}
              onChange={setMobileTab}
              listLabel={t('serviceCenters.listTab')}
              mapLabel={t('serviceCenters.mapTab')}
              style={styles.mobileTabs}
            />
            {mobileTab === 'list' ? (
              <View style={styles.mobileMetaRow}>
                <Text style={styles.mobileResultsCount}>{resultsLabel}</Text>
                <DiscoverySortTrigger label={activeSortLabel} onPress={() => setSortOpen(true)} />
              </View>
            ) : null}
          </View>
        ) : null}

        <View
          style={[
            styles.body,
            isDesktop && styles.bodyDesktop,
            isMobileWeb && styles.bodyMobile,
            isMobileWeb && mobileTab === 'map' && styles.bodyMobileMap,
          ]}
        >
          {(!isDesktop && mobileTab === 'list') || isDesktop ? listPanel : null}
          {(!isDesktop && mobileTab === 'map') || isDesktop ? (
            <View
              style={[
                styles.mapWrap,
                isDesktop && styles.mapWrapDesktop,
                isMobileWeb && { minHeight: mobileMapMinHeight, flex: 1 },
              ]}
            >
              {mapPanel}
              {filtersOpen ? <View style={styles.mapDimOverlay} pointerEvents="none" /> : null}
            </View>
          ) : null}
        </View>
      </View>

      {!isDesktop ? (
        <DiscoveryFiltersBottomSheet
          visible={filtersOpen}
          onClose={closeFilters}
          onApply={() => handleSearch().catch(() => {})}
          activeFilterCount={activeAdvancedFilterCount}
          filterProps={expandedFilterProps}
        />
      ) : null}

      {!isDesktop ? (
        <DiscoverySortSheet
          visible={sortOpen}
          onClose={() => setSortOpen(false)}
          value={sort}
          options={sortOptions}
          onSelect={setSort}
        />
      ) : null}
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, minHeight: 0 },
  stickyToolbar: {
    position: 'sticky',
    top: 0,
    zIndex: 40,
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e2e8f0',
    paddingBottom: 4,
    backdropFilter: 'blur(8px)',
  },
  stickyToolbarMobile: {
    paddingBottom: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  headerMobile: {
    paddingHorizontal: DISCOVERY_MOBILE.space.screenX,
    paddingTop: 8,
    gap: 6,
  },
  title: { flex: 1, fontSize: 18, fontWeight: '700', color: '#0f172a', minWidth: 0 },
  titleMobile: {
    fontSize: DISCOVERY_MOBILE.type.title,
  },
  titleNarrow: {
    fontSize: 15,
  },
  headerActionsMobile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  headerActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: DISCOVERY_MOBILE.color.border,
    cursor: 'pointer',
  },
  headerSignInBtn: {
    minHeight: 36,
    paddingHorizontal: 10,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    cursor: 'pointer',
  },
  headerSignInText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  headerActionPressed: {
    opacity: 0.88,
  },
  serviceCentersLangSelector: {
    maxWidth: 220,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  searchRowMobile: {
    paddingHorizontal: DISCOVERY_MOBILE.space.screenX,
    gap: DISCOVERY_MOBILE.space.rowGap,
    paddingTop: 6,
  },
  searchInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    backgroundColor: '#fff',
    paddingHorizontal: 10,
    minHeight: 42,
    minWidth: 0,
  },
  searchInputWrapMobile: {
    borderRadius: DISCOVERY_MOBILE.radius.search,
    minHeight: DISCOVERY_MOBILE.height.search,
    borderColor: DISCOVERY_MOBILE.color.border,
  },
  searchIcon: { marginRight: 6 },
  searchInput: {
    flex: 1,
    paddingVertical: 8,
    fontSize: 15,
    color: '#0f172a',
    minWidth: 0,
    borderWidth: 0,
    outlineStyle: 'none',
  },
  searchInputMobile: {
    fontSize: discoveryMinFont(14),
    paddingVertical: 6,
  },
  searchButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    minHeight: 42,
    justifyContent: 'center',
    cursor: 'pointer',
  },
  searchButtonText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  filterChrome: { paddingHorizontal: 16, paddingTop: 6 },
  filterChromeMobile: {
    paddingHorizontal: DISCOVERY_MOBILE.space.screenX,
    paddingTop: 4,
    paddingBottom: 2,
  },
  filterRow: { maxHeight: DISCOVERY_MOBILE.height.chip + 4 },
  filterRowContent: {
    alignItems: 'center',
    paddingRight: 8,
  },
  expandedFiltersWrap: {
    overflow: 'hidden',
    transitionProperty: 'max-height, opacity',
    transitionDuration: '200ms',
    transitionTimingFunction: 'ease',
  },
  expandedFiltersOpen: {
    maxHeight: 720,
    opacity: 1,
  },
  expandedFiltersClosed: {
    maxHeight: 0,
    opacity: 0,
  },
  expandedFilters: {
    marginHorizontal: 16,
    marginTop: 4,
    paddingTop: 10,
    paddingBottom: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e2e8f0',
  },
  hideFiltersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
    alignSelf: 'flex-start',
    cursor: 'pointer',
  },
  hideFiltersText: {
    color: COLORS.primary,
    fontWeight: '700',
    fontSize: 13,
  },
  geoHint: { marginHorizontal: 16, marginTop: 4, color: '#b45309', fontSize: 12 },
  geoHintMobile: {
    marginHorizontal: DISCOVERY_MOBILE.space.screenX,
    fontSize: discoveryMinFont(11),
  },
  locationHint: {
    marginHorizontal: 16,
    marginTop: 4,
    color: '#64748b',
    fontSize: discoveryMinFont(12),
  },
  locationHintMobile: {
    marginHorizontal: DISCOVERY_MOBILE.space.screenX,
    marginTop: 2,
    marginBottom: 0,
    fontSize: discoveryMinFont(11),
  },
  body: { flex: 1, marginTop: 6, minHeight: 0 },
  bodyMobile: {
    marginTop: 4,
  },
  bodyMobileMap: {
    marginTop: 2,
  },
  bodyDesktop: {
    flexDirection: 'row',
    gap: 0,
    minHeight: 0,
    paddingHorizontal: 0,
  },
  listPanel: {
    flex: 1,
    maxWidth: 440,
    minWidth: 320,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: '#e2e8f0',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 14,
    paddingTop: 10,
  },
  listPanelMobile: {
    maxWidth: '100%',
    minWidth: 0,
    borderRightWidth: 0,
    paddingHorizontal: DISCOVERY_MOBILE.space.screenX,
    backgroundColor: DISCOVERY_MOBILE.color.canvas,
  },
  listPanelHeader: {
    marginBottom: 8,
    gap: 8,
  },
  resultsCount: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  listScroll: { flex: 1 },
  listContent: {},
  sortRowScroll: { maxHeight: 36 },
  sortRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  sortChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#fff',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#cbd5e1',
    cursor: 'pointer',
  },
  sortChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  sortChipText: { fontSize: 12, fontWeight: '600', color: '#334155' },
  sortChipTextActive: { color: '#fff' },
  mapWrap: { flex: 2, minHeight: 320, position: 'relative' },
  mapWrapDesktop: { minHeight: 480 },
  map: { flex: 1, height: '100%', width: '100%', minHeight: 320 },
  mapDimOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.08)',
    zIndex: 500,
  },
  mapLoading: { alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.25)' },
  mobileChrome: {
    marginHorizontal: DISCOVERY_MOBILE.space.screenX,
    marginTop: 8,
    gap: 8,
  },
  mobileChromeMap: {
    marginTop: 6,
    gap: 0,
    marginBottom: 2,
  },
  mobileTabs: {},
  mobileMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  mobileResultsCount: {
    flex: 1,
    fontSize: discoveryMinFont(DISCOVERY_MOBILE.type.meta),
    fontWeight: '600',
    color: DISCOVERY_MOBILE.color.textMuted,
  },
  emptyState: { paddingVertical: 24, paddingHorizontal: 8, alignItems: 'center' },
  emptyTitle: { color: '#64748b', textAlign: 'center', marginBottom: 16, fontSize: 15 },
  emptyActions: { gap: 10, width: '100%', maxWidth: 320 },
  emptyButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    cursor: 'pointer',
  },
  emptyButtonText: { color: '#fff', fontWeight: '700' },
  emptyButtonSecondary: {
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#cbd5e1',
    backgroundColor: '#fff',
    cursor: 'pointer',
  },
  emptyButtonSecondaryText: { color: '#334155', fontWeight: '600' },
  locatePill: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 44,
    maxWidth: 120,
    borderRadius: 12,
    backgroundColor: '#0F4C81',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 10,
    minHeight: 42,
    cursor: 'pointer',
  },
  locateIcon: { marginRight: 4 },
  locatePillDisabled: { opacity: 0.7 },
  locatePillText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  locateIconBtn: {
    width: DISCOVERY_MOBILE.height.locateBtn,
    height: DISCOVERY_MOBILE.height.locateBtn,
    borderRadius: DISCOVERY_MOBILE.radius.search,
    borderWidth: 1,
    borderColor: DISCOVERY_MOBILE.color.border,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  popupButton: {
    backgroundColor: COLORS.primary,
    padding: 6,
    borderRadius: 6,
    marginTop: 6,
    alignItems: 'center',
    cursor: 'pointer',
  },
  popupButtonSecondary: {
    backgroundColor: '#fff',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#cbd5e1',
    padding: 6,
    borderRadius: 6,
    marginTop: 6,
    alignItems: 'center',
    cursor: 'pointer',
  },
  popupButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  popupButtonSecondaryText: { color: '#334155', fontWeight: '700', fontSize: 14 },
  authorizeBanner: {
    marginHorizontal: 16,
    marginTop: 8,
    padding: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(15,76,129,0.08)',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  authorizeBannerText: {
    flex: 1,
    color: '#1e3a8a',
    fontSize: 13,
    lineHeight: 18,
  },
});
