import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  DISCOVERY_DEFAULT_CENTER,
  DISCOVERY_DEFAULT_RADIUS_KM,
  getServiceCenters,
} from '../api/serviceCenters';
import { searchDiscoveryCities } from '../api/profiles';
import { API_BASE_URL } from '../api/config';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { sortDiscoveryItems } from '../utils/serviceCenterSort';
import {
  citySlugFromMatch,
  findExactCityMatch,
  normalizeDiscoverySearchTerm,
  shopMatchesSearchTerm,
} from '../utils/discoverySearch';
import {
  fetchRepairTypesCached,
  fetchVehicleMakesCached,
} from '../utils/referenceDataCache';
import { trackDiscoverySearch } from '../analytics/searchAnalytics';
import {
  brandIdFromSlug,
  hydrateSeoSlugCatalog,
} from '../utils/seo/seoSlugCatalog';
import { dedupeShopsByListId, logMapDiscoveryData } from '../utils/mapDiscoveryData';
import {
  buildCategoryFilterOptions,
  normalizeRepairTypeForFilter,
} from '../utils/discoveryFilterTaxonomy';
import { useTranslation } from '../i18n';

export const SORT_OPTIONS = [
  { value: 'recommended', label: 'Recommended' },
  { value: 'distance', label: 'Distance' },
  { value: 'rating', label: 'Rating' },
];

export const RATING_FILTER_OPTIONS = [
  { value: null, label: 'Any rating' },
  { value: 3, label: '3+ stars' },
  { value: 4, label: '4+ stars' },
  { value: 4.5, label: '4.5+ stars' },
];

export const DISTANCE_FILTER_OPTIONS = [
  { value: null, label: 'Any distance' },
  { value: 10, label: 'Within 10 km' },
  { value: 25, label: 'Within 25 km' },
  { value: 50, label: 'Within 50 km' },
  { value: 100, label: 'Within 100 km' },
];

export function useServiceCenterDiscovery({
  initialCitySlug = null,
  initialRepairType = null,
  initialVehicleType = null,
  initialBrandSlug = null,
} = {}) {
  const [allShops, setAllShops] = useState([]);
  const [resultMeta, setResultMeta] = useState({
    count: 0,
    truncated: false,
    limit: 0,
    scope: null,
  });
  const [loading, setLoading] = useState(true);
  const [addressQuery, setAddressQuery] = useState('');
  const [activeSearchTerm, setActiveSearchTerm] = useState('');
  const [selectedVehicleType, setSelectedVehicleType] = useState(initialVehicleType);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedRepairType, setSelectedRepairType] = useState(initialRepairType || '');
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [brandSlug, setBrandSlug] = useState(initialBrandSlug);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [openNowOnly, setOpenNowOnly] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [showClosed, setShowClosed] = useState(false);
  const [minRating, setMinRating] = useState(null);
  const [radiusKm, setRadiusKm] = useState(DISCOVERY_DEFAULT_RADIUS_KM);
  const [mapBounds, setMapBounds] = useState(null);
  const [citySlug, setCitySlug] = useState(initialCitySlug);
  const [matchedCity, setMatchedCity] = useState(null);
  const [sort, setSort] = useState('recommended');
  const [repairTypes, setRepairTypes] = useState([]);
  const [brands, setBrands] = useState([]);
  const [taxonomyLoaded, setTaxonomyLoaded] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [userLocatedExplicitly, setUserLocatedExplicitly] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [authRequired, setAuthRequired] = useState(false);
  const { t, locale } = useTranslation();

  const activeSearchRef = useRef('');
  const matchedCityRef = useRef(null);
  const citySlugRef = useRef(initialCitySlug);
  const userLocRef = useRef(null);
  const mapBoundsRef = useRef(null);
  const lastAnalyticsFingerprintRef = useRef('');
  const fetchGenRef = useRef(0);

  activeSearchRef.current = activeSearchTerm;
  matchedCityRef.current = matchedCity;
  citySlugRef.current = citySlug;
  userLocRef.current = userLocatedExplicitly ? userLocation : null;
  mapBoundsRef.current = mapBounds;

  const categoryOptions = useMemo(
    () => buildCategoryFilterOptions(repairTypes, { t, locale }),
    [repairTypes, t, locale]
  );

  const repairTypeChipOptions = useMemo(() => {
    const rows = repairTypes
      .map((rt) => normalizeRepairTypeForFilter(rt, { t, locale }))
      .filter(Boolean);
    if (!selectedCategory) return rows;
    return rows.filter((rt) => rt.category_slug === selectedCategory);
  }, [repairTypes, selectedCategory, t, locale]);

  const shops = useMemo(() => {
    const term = activeSearchTerm.trim();
    const citySearch =
      matchedCity
      && term
      && (
        normalizeDiscoverySearchTerm(term) === normalizeDiscoverySearchTerm(matchedCity.name)
        || normalizeDiscoverySearchTerm(term) === normalizeDiscoverySearchTerm(matchedCity.slug_en)
      );
    if (!term || citySearch) {
      return sortDiscoveryItems(allShops, sort);
    }
    const filtered = allShops.filter((shop) => shopMatchesSearchTerm(shop, term));
    return sortDiscoveryItems(filtered, sort);
  }, [allShops, activeSearchTerm, matchedCity, sort]);

  const loadFilterTaxonomy = useCallback(async () => {
    if (taxonomyLoaded) return;
    try {
      const [typesData, brandsData] = await Promise.all([
        fetchRepairTypesCached(async () => {
          const res = await fetch(`${API_BASE_URL}/api/repairs/types/`);
          const data = await res.json();
          if (!res.ok || !Array.isArray(data)) throw new Error('repair types');
          return data;
        }),
        fetchVehicleMakesCached(async () => {
          const res = await fetch(`${API_BASE_URL}/api/vehicles/makes/`);
          const data = await res.json();
          if (!res.ok || !Array.isArray(data)) throw new Error('vehicle makes');
          return data;
        }),
      ]);
      setRepairTypes(typesData);
      setBrands(brandsData);
      hydrateSeoSlugCatalog({ repairTypes: typesData, brands: brandsData });
      setTaxonomyLoaded(true);
    } catch (e) {
      console.warn('Discovery: could not load filter taxonomy', e);
    }
  }, [taxonomyLoaded]);

  useEffect(() => {
    if (!initialBrandSlug || !brands.length) return;
    const brandId = brandIdFromSlug(initialBrandSlug, brands);
    if (brandId != null) {
      setSelectedBrand(brandId);
      setBrandSlug(initialBrandSlug);
    }
  }, [initialBrandSlug, brands]);

  useEffect(() => {
    loadFilterTaxonomy().catch(() => {});
  }, [loadFilterTaxonomy]);

  useEffect(() => {
    if (!selectedRepairType) return;
    const stillValid = repairTypeChipOptions.some((rt) => rt.slug === selectedRepairType);
    if (!stillValid) setSelectedRepairType('');
  }, [repairTypeChipOptions, selectedRepairType]);

  const shouldUseCityFilter = useCallback((term, city, slug) => {
    if (!slug || !city || !term) return false;
    const q = normalizeDiscoverySearchTerm(term);
    return (
      q === normalizeDiscoverySearchTerm(city.name)
      || q === normalizeDiscoverySearchTerm(city.slug_en)
      || q === normalizeDiscoverySearchTerm(city.slug_bg)
    );
  }, []);

  const applyMapBounds = useCallback((bounds) => {
    if (
      !bounds
      || bounds.min_lat == null
      || bounds.max_lat == null
      || bounds.min_lon == null
      || bounds.max_lon == null
    ) {
      return;
    }
    const next = {
      min_lat: Number(bounds.min_lat),
      max_lat: Number(bounds.max_lat),
      min_lon: Number(bounds.min_lon),
      max_lon: Number(bounds.max_lon),
    };
    const prev = mapBoundsRef.current;
    if (
      prev
      && Math.abs(prev.min_lat - next.min_lat) < 0.0005
      && Math.abs(prev.max_lat - next.max_lat) < 0.0005
      && Math.abs(prev.min_lon - next.min_lon) < 0.0005
      && Math.abs(prev.max_lon - next.max_lon) < 0.0005
    ) {
      return;
    }
    mapBoundsRef.current = next;
    setMapBounds(next);
  }, []);

  const clearMapBounds = useCallback(() => {
    mapBoundsRef.current = null;
    setMapBounds(null);
  }, []);

  const fetchShops = useCallback(async () => {
    const gen = ++fetchGenRef.current;
    setLoading(true);
    setLoadError(null);
    setAuthRequired(false);
    let hadValidToken = false;
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      const userIdStr = await AsyncStorage.getItem(STORAGE_KEYS.USER_ID);
      const userId = userIdStr ? parseInt(userIdStr, 10) : null;
      hadValidToken = !!token && token !== 'null' && token !== 'undefined';

      const rawTerm = activeSearchRef.current.trim();
      const currentCity = matchedCityRef.current;
      const currentCitySlug = citySlugRef.current;
      const useCityFilter = shouldUseCityFilter(rawTerm, currentCity, currentCitySlug);
      const bounds = mapBoundsRef.current;

      const filters = { sort, limit: 300 };
      if (rawTerm && !useCityFilter) filters.search = rawTerm;
      if (currentCitySlug) filters.city_slug = currentCitySlug;
      if (selectedVehicleType) filters.vehicle_type = selectedVehicleType;
      if (selectedCategory) filters.category = selectedCategory;
      if (selectedRepairType) filters.repair_type = selectedRepairType;
      if (verifiedOnly) filters.verified = true;
      if (openNowOnly) filters.open_now = true;
      if (showInactive) filters.show_inactive = true;
      if (showClosed) filters.show_closed = true;
      if (minRating != null) filters.min_rating = minRating;
      if (selectedBrand) filters.brand = selectedBrand;

      if (bounds && !currentCitySlug && !(rawTerm && !useCityFilter)) {
        filters.min_lat = bounds.min_lat;
        filters.max_lat = bounds.max_lat;
        filters.min_lon = bounds.min_lon;
        filters.max_lon = bounds.max_lon;
        if (userLocRef.current) {
          filters.lat = userLocRef.current[0];
          filters.lon = userLocRef.current[1];
        }
      } else {
        const loc = userLocRef.current;
        const lat = loc ? loc[0] : DISCOVERY_DEFAULT_CENTER.lat;
        const lon = loc ? loc[1] : DISCOVERY_DEFAULT_CENTER.lon;
        const effectiveRadius =
          radiusKm != null ? radiusKm : DISCOVERY_DEFAULT_RADIUS_KM;
        filters.lat = lat;
        filters.lon = lon;
        if (!currentCitySlug && !(rawTerm && !useCityFilter)) {
          filters.radius_km = effectiveRadius;
        } else if (radiusKm != null && loc) {
          filters.radius_km = radiusKm;
        }
      }

      const headers = hadValidToken ? { Authorization: `Bearer ${token}` } : {};
      const payload = await getServiceCenters(filters, { headers });
      if (gen !== fetchGenRef.current) return;

      const shopsArray = payload.results || [];
      const normalized = shopsArray.map((shop) => ({
        ...shop,
        isMyShop:
          Number.isInteger(userId) && Array.isArray(shop.users) && shop.users.includes(userId),
      }));
      const { shops: uniqueShops, duplicateIds } = dedupeShopsByListId(normalized);

      logMapDiscoveryData({
        api_count: shopsArray.length,
        normalized_count: normalized.length,
        unique_count: uniqueShops.length,
        duplicate_ids: duplicateIds,
        truncated: payload.truncated,
        scope: payload.scope,
      });

      setAllShops(uniqueShops);
      setResultMeta({
        count: payload.count,
        truncated: payload.truncated,
        limit: payload.limit,
        scope: payload.scope,
      });
    } catch (error) {
      if (gen !== fetchGenRef.current) return;
      const status = error.response?.status;
      console.error('Error fetching shops:', error);
      setAllShops([]);
      setResultMeta({ count: 0, truncated: false, limit: 0, scope: null });
      if (status === 401) {
        setAuthRequired(true);
        setLoadError(error.message || 'Sign in required to view service centers');
        if (hadValidToken) {
          AsyncStorage.multiRemove([
            STORAGE_KEYS.ACCESS_TOKEN,
            STORAGE_KEYS.REFRESH_TOKEN,
            STORAGE_KEYS.USER_ID,
          ]).catch(() => {});
        }
      } else {
        setLoadError(error.message || 'Could not load service centers');
      }
    } finally {
      if (gen === fetchGenRef.current) setLoading(false);
    }
  }, [
    selectedVehicleType,
    selectedCategory,
    selectedRepairType,
    verifiedOnly,
    openNowOnly,
    showInactive,
    showClosed,
    minRating,
    selectedBrand,
    radiusKm,
    sort,
    shouldUseCityFilter,
  ]);

  const runSearch = useCallback(async () => {
    const term = String(addressQuery || '').trim();
    setActiveSearchTerm(term);
    activeSearchRef.current = term;
    clearMapBounds();

    if (!term) {
      setMatchedCity(null);
      matchedCityRef.current = null;
      setCitySlug(null);
      citySlugRef.current = null;
      await fetchShops();
      return { matchedCity: null, citySlug: null };
    }

    let nextMatchedCity = null;
    let nextCitySlug = null;

    try {
      const cities = await searchDiscoveryCities(term, { country: 'BG', limit: 8 });
      const match = findExactCityMatch(cities, term);
      if (match) {
        const slug = citySlugFromMatch(match);
        nextMatchedCity = match;
        nextCitySlug = slug;
        setMatchedCity(match);
        matchedCityRef.current = match;
        setCitySlug(slug);
        citySlugRef.current = slug;
      } else {
        setMatchedCity(null);
        matchedCityRef.current = null;
        setCitySlug(null);
        citySlugRef.current = null;
      }
    } catch (e) {
      console.warn('Discovery: city lookup failed', e);
      setMatchedCity(null);
      matchedCityRef.current = null;
      setCitySlug(null);
      citySlugRef.current = null;
    }

    await fetchShops();
    return { matchedCity: nextMatchedCity, citySlug: nextCitySlug };
  }, [addressQuery, clearMapBounds, fetchShops]);

  const clearFilters = useCallback(
    async ({ keepCitySlug = null } = {}) => {
      setSelectedVehicleType(null);
      setSelectedCategory(null);
      setSelectedRepairType('');
      setSelectedBrand(null);
      setBrandSlug(null);
      setVerifiedOnly(false);
      setOpenNowOnly(false);
      setShowInactive(false);
      setShowClosed(false);
      setMinRating(null);
      setRadiusKm(DISCOVERY_DEFAULT_RADIUS_KM);
      clearMapBounds();
      setAddressQuery('');
      setActiveSearchTerm('');
      activeSearchRef.current = '';
      if (keepCitySlug) {
        setCitySlug(keepCitySlug);
        citySlugRef.current = keepCitySlug;
      } else {
        setMatchedCity(null);
        matchedCityRef.current = null;
        setCitySlug(null);
        citySlugRef.current = null;
      }
      await fetchShops();
    },
    [clearMapBounds, fetchShops]
  );

  const showAllInMatchedCity = useCallback(async () => {
    const slug = citySlugFromMatch(matchedCity) || citySlug || 'sofia';
    const cityName = matchedCity?.name || 'Sofia';
    clearMapBounds();
    setAddressQuery('');
    setActiveSearchTerm('');
    activeSearchRef.current = '';
    setMatchedCity({ name: cityName, slug_en: slug });
    matchedCityRef.current = { name: cityName, slug_en: slug };
    setCitySlug(slug);
    citySlugRef.current = slug;
    await fetchShops();
  }, [citySlug, clearMapBounds, fetchShops, matchedCity]);

  useEffect(() => {
    fetchShops().catch(() => {});
  }, [
    selectedVehicleType,
    selectedCategory,
    selectedRepairType,
    citySlug,
    verifiedOnly,
    openNowOnly,
    showInactive,
    showClosed,
    minRating,
    selectedBrand,
    radiusKm,
    sort,
    userLocatedExplicitly,
    mapBounds,
    fetchShops,
  ]);

  useEffect(() => {
    if (loading) return;

    const fingerprint = JSON.stringify({
      q: activeSearchTerm,
      city: citySlug,
      brand: selectedBrand,
      vehicle: selectedVehicleType,
      service: selectedRepairType,
      category: selectedCategory,
      verified: verifiedOnly,
      openNow: openNowOnly,
      rating: minRating,
      radius: radiusKm,
      sort,
      count: shops.length,
    });
    if (fingerprint === lastAnalyticsFingerprintRef.current) return;
    lastAnalyticsFingerprintRef.current = fingerprint;

    trackDiscoverySearch({
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
    });
  }, [
    loading,
    activeSearchTerm,
    citySlug,
    selectedBrand,
    selectedVehicleType,
    selectedRepairType,
    selectedCategory,
    verifiedOnly,
    openNowOnly,
    showInactive,
    showClosed,
    minRating,
    radiusKm,
    sort,
    shops.length,
  ]);

  return {
    shops,
    resultMeta,
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
    showInactive,
    setShowInactive,
    showClosed,
    setShowClosed,
    minRating,
    setMinRating,
    radiusKm,
    setRadiusKm,
    mapBounds,
    applyMapBounds,
    clearMapBounds,
    citySlug,
    setCitySlug,
    matchedCity,
    sort,
    setSort,
    repairTypes,
    brands,
    categoryOptions,
    repairTypeChipOptions,
    userLocation,
    setUserLocation,
    userLocatedExplicitly,
    setUserLocatedExplicitly,
    fetchShops,
    runSearch,
    clearFilters,
    showAllInMatchedCity,
    loadFilterTaxonomy,
    taxonomyLoaded,
    loadError,
    authRequired,
    RATING_FILTER_OPTIONS,
    DISTANCE_FILTER_OPTIONS,
    SORT_OPTIONS,
  };
}
