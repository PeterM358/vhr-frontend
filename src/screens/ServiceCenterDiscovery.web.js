// PATH: src/screens/ServiceCenterDiscovery.web.js
/**
 * Shared Google Maps-style discovery UI (list + map) for public and partner explore.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ActivityIndicator,
  ScrollView,
  useWindowDimensions,
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

import { COLORS } from '../styles/colors';
import BASE_STYLES from '../styles/base';
import BackHeaderButton from '../components/navigation/BackHeaderButton';
import ScreenBackground from '../components/ScreenBackground';
import ServiceCenterListCard from '../components/serviceCenters/ServiceCenterListCard';
import PartnerMarketComparisonCard from '../components/partner/PartnerMarketComparisonCard';
import { DISCOVERY_QUICK_VEHICLE_CHIPS } from '../api/serviceCenters';
import { spreadShopMarkersForMap } from '../utils/mapMarkerSpread';
import { getWebGeolocation } from '../utils/webGeolocation';
import { ensureLeafletCss } from '../utils/leafletAssets.web';
import {
  useServiceCenterDiscovery,
  SORT_OPTIONS,
  RATING_FILTER_OPTIONS,
  DISTANCE_FILTER_OPTIONS,
} from '../hooks/useServiceCenterDiscovery';
import { applyDiscoverySeoMeta } from '../utils/seo/seoMetadata';
import {
  goBackFromServiceCenters,
  navigateToServiceCenterProfile,
} from '../navigation/serviceCentersNavigation';
import { navigateToPartnerDashboard, navigateToVehicleServiceRecordNew } from '../navigation/webNavigation';
import {
  loadServiceRecordFormDraft,
  saveServiceRecordFormDraft,
} from '../utils/serviceRecordDraftStorage';

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

function FilterSection({ title, children }) {
  return (
    <View style={styles.filterSection}>
      <Text style={styles.filterSectionTitle}>{title}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
        {children}
      </ScrollView>
    </View>
  );
}

export default function ServiceCenterDiscovery({ partnerMode = false }) {
  const navigation = useNavigation();
  const route = useRoute();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 960;

  const discovery = useServiceCenterDiscovery({
    initialCitySlug: route.params?.citySlug || null,
    initialRepairType: route.params?.repairType || null,
    initialVehicleType: route.params?.vehicleType || null,
  });

  useEffect(() => {
    applyDiscoverySeoMeta({
      citySlug: route.params?.citySlug || null,
      vehicleType: route.params?.vehicleType || null,
      repairType: route.params?.repairType || null,
    });
  }, [route.params?.citySlug, route.params?.vehicleType, route.params?.repairType]);

  const [mapReady, setMapReady] = useState(false);
  const [center, setCenter] = useState(DEFAULT_MAP_CENTER);
  const [locating, setLocating] = useState(false);
  const [geoHint, setGeoHint] = useState('');
  const [mobileTab, setMobileTab] = useState('list');
  const [selectedListId, setSelectedListId] = useState(null);
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const cardRefs = useRef({});
  const zoom = 12;

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
    verifiedOnly,
    setVerifiedOnly,
    openNowOnly,
    setOpenNowOnly,
    minRating,
    setMinRating,
    radiusKm,
    setRadiusKm,
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
  } = discovery;

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
    if (filtersExpanded) {
      loadFilterTaxonomy().catch(() => {});
    }
  }, [filtersExpanded, loadFilterTaxonomy]);

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

  const mapShops = useMemo(
    () =>
      spreadShopMarkersForMap(
        shops
          .map((shop) => ({
            ...shop,
            latitude: shop.latitude ? parseFloat(shop.latitude) : null,
            longitude: shop.longitude ? parseFloat(shop.longitude) : null,
          }))
          .filter((s) => Number.isFinite(s.latitude) && Number.isFinite(s.longitude)),
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
      setGeoHint(err?.message || 'Could not get your location.');
    } finally {
      setLocating(false);
    }
  };

  const pickForServiceRecord = Boolean(route.params?.pickShopForServiceRecord);
  const serviceRecordVehicleId = route.params?.vehicleId;

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
    const slug = shop.public_slug || shop.slug;
    if (slug) {
      navigateToServiceCenterProfile(navigation, slug, {
        returnTo: route.params?.returnTo,
        vehicleId: route.params?.vehicleId,
        shopId: shop.id,
      });
      return;
    }
    navigateToServiceCenterProfile(navigation, String(shop.id), {
      returnTo: route.params?.returnTo,
      vehicleId: route.params?.vehicleId,
      shopId: shop.id,
    });
  };

  const handleRequestService = (shop) => {
    navigation.navigate('CreateRepair', {
      shopId: shop.id,
      origin: 'ShopMap',
      returnTo: 'ShopMap',
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

  const activeFilterCount = [
    selectedCategory,
    selectedRepairType,
    selectedBrand,
    minRating,
    radiusKm,
  ].filter(Boolean).length;

  const cityLabel = matchedCity?.name || 'Sofia';

  const filterChrome = (
    <View style={styles.filterChrome}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
        {DISCOVERY_QUICK_VEHICLE_CHIPS.map((vt) => {
          const on = selectedVehicleType === vt.code;
          return (
            <Pressable
              key={vt.code}
              onPress={() => setSelectedVehicleType(on ? null : vt.code)}
              style={[styles.chip, on && styles.chipSelected]}
            >
              <Text style={[styles.chipText, on && styles.chipTextSelected]}>{vt.label}</Text>
            </Pressable>
          );
        })}
        <Pressable
          onPress={() => setOpenNowOnly((v) => !v)}
          style={[styles.chip, openNowOnly && styles.chipSelected]}
        >
          <Text style={[styles.chipText, openNowOnly && styles.chipTextSelected]}>Open now</Text>
        </Pressable>
        <Pressable
          onPress={() => setVerifiedOnly((v) => !v)}
          style={[styles.chip, verifiedOnly && styles.chipSelected]}
        >
          <Text style={[styles.chipText, verifiedOnly && styles.chipTextSelected]}>Verified</Text>
        </Pressable>
        <Pressable
          onPress={() => setFiltersExpanded((v) => !v)}
          style={[styles.chip, styles.filtersToggle, filtersExpanded && styles.chipSelected]}
        >
          <Text style={[styles.chipText, filtersExpanded && styles.chipTextSelected]}>
            Filters{activeFilterCount ? ` (${activeFilterCount})` : ''}
          </Text>
        </Pressable>
      </ScrollView>

      {filtersExpanded ? (
        <View style={styles.expandedFilters}>
          <FilterSection title="Vehicle type">
            <Pressable
              onPress={() => setSelectedVehicleType(null)}
              style={[styles.chip, selectedVehicleType === null && styles.chipSelected]}
            >
              <Text style={styles.chipText}>Any</Text>
            </Pressable>
            {DISCOVERY_QUICK_VEHICLE_CHIPS.map((vt) => (
              <Pressable
                key={`all-${vt.code}`}
                onPress={() => setSelectedVehicleType(selectedVehicleType === vt.code ? null : vt.code)}
                style={[styles.chip, selectedVehicleType === vt.code && styles.chipSelected]}
              >
                <Text style={styles.chipText}>{vt.label}</Text>
              </Pressable>
            ))}
          </FilterSection>

          <FilterSection title="Service category">
            <Pressable
              onPress={() => setSelectedCategory(null)}
              style={[styles.chip, selectedCategory === null && styles.chipSelected]}
            >
              <Text style={styles.chipText}>Any</Text>
            </Pressable>
            {categoryOptions.map((c) => (
              <Pressable
                key={c.slug}
                onPress={() => setSelectedCategory(selectedCategory === c.slug ? null : c.slug)}
                style={[styles.chip, selectedCategory === c.slug && styles.chipSelected]}
              >
                <Text style={styles.chipText}>{c.name}</Text>
              </Pressable>
            ))}
          </FilterSection>

          <FilterSection title="Service">
            <Pressable
              onPress={() => setSelectedRepairType('')}
              style={[styles.chip, !selectedRepairType && styles.chipSelected]}
            >
              <Text style={styles.chipText}>Any</Text>
            </Pressable>
            {repairTypeChipOptions.map((rt) => (
              <Pressable
                key={rt.id}
                onPress={() => setSelectedRepairType(selectedRepairType === rt.slug ? '' : rt.slug)}
                style={[styles.chip, selectedRepairType === rt.slug && styles.chipSelected]}
              >
                <Text style={styles.chipText}>{rt.name}</Text>
              </Pressable>
            ))}
          </FilterSection>

          <FilterSection title="Brand">
            <Pressable
              onPress={() => setSelectedBrand(null)}
              style={[styles.chip, !selectedBrand && styles.chipSelected]}
            >
              <Text style={styles.chipText}>Any</Text>
            </Pressable>
            {brands.slice(0, 40).map((brand) => (
              <Pressable
                key={brand.id}
                onPress={() => setSelectedBrand(selectedBrand === String(brand.id) ? null : String(brand.id))}
                style={[styles.chip, selectedBrand === String(brand.id) && styles.chipSelected]}
              >
                <Text style={styles.chipText}>{brand.name}</Text>
              </Pressable>
            ))}
          </FilterSection>

          <FilterSection title="Rating">
            {RATING_FILTER_OPTIONS.map((opt) => (
              <Pressable
                key={opt.label}
                onPress={() => setMinRating(opt.value)}
                style={[styles.chip, minRating === opt.value && styles.chipSelected]}
              >
                <Text style={styles.chipText}>{opt.label}</Text>
              </Pressable>
            ))}
          </FilterSection>

          <FilterSection title="Distance">
            {DISTANCE_FILTER_OPTIONS.map((opt) => (
              <Pressable
                key={opt.label}
                onPress={() => setRadiusKm(opt.value)}
                style={[styles.chip, radiusKm === opt.value && styles.chipSelected]}
              >
                <Text style={styles.chipText}>{opt.label}</Text>
              </Pressable>
            ))}
          </FilterSection>
        </View>
      ) : null}
    </View>
  );

  const emptyState = (
    <View style={styles.emptyState}>
      <Text style={styles.emptyTitle}>No service centers match these filters.</Text>
      <View style={styles.emptyActions}>
        <Pressable style={styles.emptyButton} onPress={() => clearFilters().catch(() => {})}>
          <Text style={styles.emptyButtonText}>Clear filters</Text>
        </Pressable>
        <Pressable style={styles.emptyButtonSecondary} onPress={() => showAllInMatchedCity().catch(() => {})}>
          <Text style={styles.emptyButtonSecondaryText}>Show all in {cityLabel}</Text>
        </Pressable>
        <Pressable
          style={styles.emptyButtonSecondary}
          onPress={() => navigation.navigate('AddManualServiceCenter', { discoveryReport: true })}
        >
          <Text style={styles.emptyButtonSecondaryText}>Add missing service center</Text>
        </Pressable>
      </View>
    </View>
  );

  const listPanel = (
    <View style={styles.listPanel}>
      {partnerMode ? <PartnerMarketComparisonCard onCompare={() => {}} /> : null}
      <View style={styles.sortRow}>
        {SORT_OPTIONS.map((opt) => (
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
      </View>
      <ScrollView style={styles.listScroll} contentContainerStyle={styles.listContent}>
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
              />
            </View>
          );
        })}
      </ScrollView>
    </View>
  );

  const mapPanel = !mapReady ? (
    <View style={[styles.map, styles.mapLoading]}>
      <ActivityIndicator size="large" color="#fff" />
    </View>
  ) : (
    <MapContainer center={center} zoom={zoom} style={styles.map} zoomControl={false}>
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
        const isReported = shop.source === 'owner_reported';
        const markerKey = shop.list_id || `${shop.source || 'shop'}-${shop.id}`;
        const lat = shop.displayLatitude ?? shop.latitude;
        const lon = shop.displayLongitude ?? shop.longitude;
        const markerColor = shop.isMyShop ? 'green' : isReported ? 'orange' : 'red';
        const isSelected = selectedListId === markerKey;
        return (
          <Marker
            key={markerKey}
            position={[lat, lon]}
            icon={L.icon({
              iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-${isSelected ? 'violet' : markerColor}.png`,
              shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
              iconSize: [25, 41],
              iconAnchor: [12, 41],
              popupAnchor: [1, -34],
              shadowSize: [41, 41],
            })}
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
                    <Text style={styles.popupButtonText}>Use for this record</Text>
                  </Pressable>
                ) : null}
                <Pressable style={styles.popupButton} onPress={() => openShopProfile(shop)}>
                  <Text style={styles.popupButtonText}>View profile</Text>
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
        <View style={styles.header}>
          <BackHeaderButton
            onPress={() =>
              partnerMode ? navigateToPartnerDashboard(navigation) : goBackFromServiceCenters(navigation)
            }
            label="Back"
            variant="glass"
            iconOnly={false}
          />
          <Text style={styles.title}>{partnerMode ? 'Explore Service Centers' : 'Find Service Centers'}</Text>
        </View>

        <View style={styles.searchRow}>
          <TextInput
            placeholder="Search centers, city, service, brand..."
            value={addressQuery}
            onChangeText={setAddressQuery}
            onSubmitEditing={() => runSearch().catch(() => {})}
            style={styles.searchInput}
            returnKeyType="search"
          />
          <Pressable
            style={[styles.locatePill, locating && styles.locatePillDisabled]}
            onPress={handleLocateMe}
            disabled={locating}
          >
            <Text style={styles.locatePillText}>{locating ? '…' : 'Locate me'}</Text>
          </Pressable>
          <Pressable style={styles.searchButton} onPress={() => runSearch().catch(() => {})}>
            <Text style={styles.searchButtonText}>Search</Text>
          </Pressable>
        </View>

        {filterChrome}
        {geoHint ? <Text style={styles.geoHint}>{geoHint}</Text> : null}
        {userLocatedExplicitly ? (
          <Text style={styles.locationHint}>Distances shown from your current location.</Text>
        ) : (
          <Text style={styles.locationHint}>Tap Locate me to sort and show distances.</Text>
        )}

        {!isDesktop ? (
          <View style={styles.mobileTabs}>
            <Pressable
              style={[styles.mobileTab, mobileTab === 'list' && styles.mobileTabActive]}
              onPress={() => setMobileTab('list')}
            >
              <Text style={styles.mobileTabText}>List</Text>
            </Pressable>
            <Pressable
              style={[styles.mobileTab, mobileTab === 'map' && styles.mobileTabActive]}
              onPress={() => setMobileTab('map')}
            >
              <Text style={styles.mobileTabText}>Map</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={[styles.body, isDesktop && styles.bodyDesktop]}>
          {(!isDesktop && mobileTab === 'list') || isDesktop ? listPanel : null}
          {(!isDesktop && mobileTab === 'map') || isDesktop ? (
            <View style={styles.mapWrap}>{mapPanel}</View>
          ) : null}
        </View>
      </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  title: { flex: 1, fontSize: 18, fontWeight: '700', color: '#0f172a' },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#fff',
    minWidth: 0,
  },
  searchButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    cursor: 'pointer',
  },
  searchButtonText: { color: '#fff', fontWeight: '700' },
  filterChrome: { paddingHorizontal: 16, paddingTop: 8 },
  filterRow: { maxHeight: 42, marginBottom: 4 },
  expandedFilters: {
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e2e8f0',
  },
  filterSection: { marginBottom: 8 },
  filterSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: '#f8fafc',
    marginRight: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.12)',
    cursor: 'pointer',
  },
  chipSelected: { backgroundColor: '#e2edff', borderColor: COLORS.primary },
  chipText: { fontSize: 13, color: '#0f172a', fontWeight: '500' },
  chipTextSelected: { color: COLORS.primary, fontWeight: '700' },
  filtersToggle: { backgroundColor: '#fff' },
  geoHint: { marginHorizontal: 16, marginTop: 4, color: '#b45309', fontSize: 12 },
  locationHint: {
    marginHorizontal: 16,
    marginTop: 4,
    color: '#64748b',
    fontSize: 12,
  },
  body: { flex: 1, marginTop: 8 },
  bodyDesktop: { flexDirection: 'row', gap: 0 },
  listPanel: {
    flex: 1,
    maxWidth: 420,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  listScroll: { flex: 1 },
  listContent: { paddingBottom: 24 },
  sortRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
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
  mapWrap: { flex: 2, minHeight: 320 },
  map: { flex: 1, height: '100%', width: '100%' },
  mapLoading: { alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.25)' },
  mobileTabs: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 8,
    backgroundColor: '#e2e8f0',
    borderRadius: 10,
    padding: 4,
  },
  mobileTab: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 8, cursor: 'pointer' },
  mobileTabActive: { backgroundColor: '#fff' },
  mobileTabText: { fontWeight: '700', color: '#0f172a' },
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
    minWidth: 88,
    borderRadius: 10,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 10,
    cursor: 'pointer',
  },
  locatePillDisabled: { opacity: 0.7 },
  locatePillText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  popupButton: {
    backgroundColor: COLORS.primary,
    padding: 6,
    borderRadius: 6,
    marginTop: 6,
    alignItems: 'center',
    cursor: 'pointer',
  },
  popupButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
});
