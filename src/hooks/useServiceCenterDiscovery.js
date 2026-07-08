import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { getServiceCenters } from '../api/serviceCenters';
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
} = {}) {
  const [allShops, setAllShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addressQuery, setAddressQuery] = useState('');
  const [activeSearchTerm, setActiveSearchTerm] = useState('');
  const [selectedVehicleType, setSelectedVehicleType] = useState(initialVehicleType);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedRepairType, setSelectedRepairType] = useState(initialRepairType || '');
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [openNowOnly, setOpenNowOnly] = useState(false);
  const [minRating, setMinRating] = useState(null);
  const [radiusKm, setRadiusKm] = useState(null);
  const [citySlug, setCitySlug] = useState(initialCitySlug);
  const [matchedCity, setMatchedCity] = useState(null);
  const [sort, setSort] = useState('recommended');
  const [repairTypes, setRepairTypes] = useState([]);
  const [brands, setBrands] = useState([]);
  const [taxonomyLoaded, setTaxonomyLoaded] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [userLocatedExplicitly, setUserLocatedExplicitly] = useState(false);

  const activeSearchRef = useRef('');
  const matchedCityRef = useRef(null);
  const citySlugRef = useRef(initialCitySlug);
  const userLocRef = useRef(null);
  const lastAnalyticsFingerprintRef = useRef('');

  activeSearchRef.current = activeSearchTerm;
  matchedCityRef.current = matchedCity;
  citySlugRef.current = citySlug;
  userLocRef.current = userLocatedExplicitly ? userLocation : null;

  const categoryOptions = useMemo(() => {
    const map = {};
    repairTypes.forEach((rt) => {
      const slug = rt.category_slug;
      const name = rt.category_name || slug;
      if (slug && name && !map[slug]) map[slug] = name;
    });
    return Object.entries(map)
      .map(([slug, name]) => ({ slug, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [repairTypes]);

  const repairTypeChipOptions = useMemo(() => {
    const rows = repairTypes.filter((rt) => rt.slug);
    if (!selectedCategory) return rows;
    return rows.filter((rt) => rt.category_slug === selectedCategory);
  }, [repairTypes, selectedCategory]);

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
      setTaxonomyLoaded(true);
    } catch (e) {
      console.warn('Discovery: could not load filter taxonomy', e);
    }
  }, [taxonomyLoaded]);

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

  const fetchShops = useCallback(async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      const userIdStr = await AsyncStorage.getItem(STORAGE_KEYS.USER_ID);
      const userId = userIdStr ? parseInt(userIdStr, 10) : null;
      const hasValidToken = !!token && token !== 'null' && token !== 'undefined';

      const rawTerm = activeSearchRef.current.trim();
      const currentCity = matchedCityRef.current;
      const currentCitySlug = citySlugRef.current;
      const useCityFilter = shouldUseCityFilter(rawTerm, currentCity, currentCitySlug);

      const filters = { sort };
      if (rawTerm && !useCityFilter) filters.search = rawTerm;
      if (currentCitySlug) filters.city_slug = currentCitySlug;
      if (selectedVehicleType) filters.vehicle_type = selectedVehicleType;
      if (selectedCategory) filters.category = selectedCategory;
      if (selectedRepairType) filters.repair_type = selectedRepairType;
      if (verifiedOnly) filters.verified = true;
      if (openNowOnly) filters.open_now = true;
      if (minRating != null) filters.min_rating = minRating;
      if (selectedBrand) filters.brand = selectedBrand;
      if (radiusKm != null && userLocRef.current) {
        filters.radius_km = radiusKm;
        filters.lat = userLocRef.current[0];
        filters.lon = userLocRef.current[1];
      } else if (userLocRef.current) {
        filters.lat = userLocRef.current[0];
        filters.lon = userLocRef.current[1];
      }

      const headers = hasValidToken ? { Authorization: `Bearer ${token}` } : {};
      const tryFetch = async (h) => getServiceCenters(filters, { headers: h });

      let shopsArray;
      try {
        shopsArray = await tryFetch(headers);
      } catch (err) {
        if (err.response?.status === 401 && hasValidToken) {
          shopsArray = await tryFetch({});
        } else {
          throw err;
        }
      }

      setAllShops(
        shopsArray.map((shop) => ({
          ...shop,
          isMyShop:
            Number.isInteger(userId) && Array.isArray(shop.users) && shop.users.includes(userId),
        }))
      );
    } catch (error) {
      console.error('Error fetching shops:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [
    selectedVehicleType,
    selectedCategory,
    selectedRepairType,
    verifiedOnly,
    openNowOnly,
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

    if (!term) {
      setMatchedCity(null);
      matchedCityRef.current = null;
      setCitySlug(null);
      citySlugRef.current = null;
      await fetchShops();
      return;
    }

    try {
      const cities = await searchDiscoveryCities(term, { country: 'BG', limit: 8 });
      const match = findExactCityMatch(cities, term);
      if (match) {
        const slug = citySlugFromMatch(match);
        setMatchedCity(match);
        matchedCityRef.current = match;
        setCitySlug(slug);
        citySlugRef.current = slug;
      } else {
        setMatchedCity(null);
        matchedCityRef.current = null;
      }
    } catch (e) {
      console.warn('Discovery: city lookup failed', e);
      setMatchedCity(null);
      matchedCityRef.current = null;
    }

    await fetchShops();
  }, [addressQuery, fetchShops]);

  const clearFilters = useCallback(
    async ({ keepCitySlug = null } = {}) => {
      setSelectedVehicleType(null);
      setSelectedCategory(null);
      setSelectedRepairType('');
      setSelectedBrand(null);
      setVerifiedOnly(false);
      setOpenNowOnly(false);
      setMinRating(null);
      setRadiusKm(null);
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
    [fetchShops]
  );

  const showAllInMatchedCity = useCallback(async () => {
    const slug = citySlugFromMatch(matchedCity) || citySlug || 'sofia';
    const cityName = matchedCity?.name || 'Sofia';
    setAddressQuery('');
    setActiveSearchTerm('');
    activeSearchRef.current = '';
    setMatchedCity({ name: cityName, slug_en: slug });
    matchedCityRef.current = { name: cityName, slug_en: slug };
    setCitySlug(slug);
    citySlugRef.current = slug;
    await fetchShops();
  }, [citySlug, fetchShops, matchedCity]);

  useEffect(() => {
    fetchShops().catch(() => {});
  }, [
    selectedVehicleType,
    selectedCategory,
    selectedRepairType,
    citySlug,
    verifiedOnly,
    openNowOnly,
    minRating,
    selectedBrand,
    radiusKm,
    sort,
    userLocatedExplicitly,
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
    minRating,
    radiusKm,
    sort,
    shops.length,
  ]);

  return {
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
    verifiedOnly,
    setVerifiedOnly,
    openNowOnly,
    setOpenNowOnly,
    minRating,
    setMinRating,
    radiusKm,
    setRadiusKm,
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
    RATING_FILTER_OPTIONS,
    DISTANCE_FILTER_OPTIONS,
    SORT_OPTIONS,
  };
}
