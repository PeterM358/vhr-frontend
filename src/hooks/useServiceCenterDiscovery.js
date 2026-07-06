import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { getServiceCenters } from '../api/serviceCenters';
import { API_BASE_URL } from '../api/config';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { sortDiscoveryItems } from '../utils/serviceCenterSort';

export const SORT_OPTIONS = [
  { value: 'recommended', label: 'Recommended' },
  { value: 'distance', label: 'Distance' },
  { value: 'rating', label: 'Rating' },
];

export function useServiceCenterDiscovery({
  initialCitySlug = null,
  initialRepairType = null,
  initialVehicleType = null,
} = {}) {
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addressQuery, setAddressQuery] = useState('');
  const addressRef = useRef(addressQuery);
  addressRef.current = addressQuery;

  const [selectedVehicleType, setSelectedVehicleType] = useState(initialVehicleType);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedRepairType, setSelectedRepairType] = useState(initialRepairType || '');
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [openNowOnly, setOpenNowOnly] = useState(false);
  const [minRating, setMinRating] = useState(null);
  const [radiusKm, setRadiusKm] = useState(null);
  const [citySlug, setCitySlug] = useState(initialCitySlug);
  const [sort, setSort] = useState('recommended');
  const [repairTypes, setRepairTypes] = useState([]);
  const [brands, setBrands] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const userLocRef = useRef(null);
  userLocRef.current = userLocation;

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

  useEffect(() => {
    (async () => {
      try {
        const [typesRes, brandsRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/repairs/types/`),
          fetch(`${API_BASE_URL}/api/vehicles/makes/`),
        ]);
        const typesData = await typesRes.json();
        const brandsData = await brandsRes.json();
        if (typesRes.ok && Array.isArray(typesData)) setRepairTypes(typesData);
        if (brandsRes.ok && Array.isArray(brandsData)) setBrands(brandsData);
      } catch (e) {
        console.warn('Discovery: could not load filter taxonomy', e);
      }
    })();
  }, []);

  useEffect(() => {
    if (!selectedRepairType) return;
    const stillValid = repairTypeChipOptions.some((rt) => rt.slug === selectedRepairType);
    if (!stillValid) setSelectedRepairType('');
  }, [repairTypeChipOptions, selectedRepairType]);

  const fetchShops = useCallback(async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      const userIdStr = await AsyncStorage.getItem(STORAGE_KEYS.USER_ID);
      const userId = userIdStr ? parseInt(userIdStr, 10) : null;
      const hasValidToken = !!token && token !== 'null' && token !== 'undefined';

      const filters = { sort };
      const aq = addressRef.current.trim();
      if (aq) filters.address = aq;
      if (selectedVehicleType) filters.vehicle_type = selectedVehicleType;
      if (selectedCategory) filters.category = selectedCategory;
      if (selectedRepairType) filters.repair_type = selectedRepairType;
      if (citySlug) filters.city_slug = citySlug;
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

      const updatedShops = shopsArray.map((shop) => ({
        ...shop,
        isMyShop:
          Number.isInteger(userId) && Array.isArray(shop.users) && shop.users.includes(userId),
      }));

      setShops(sortDiscoveryItems(updatedShops, sort));
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
    citySlug,
    verifiedOnly,
    openNowOnly,
    minRating,
    selectedBrand,
    radiusKm,
    sort,
  ]);

  useEffect(() => {
    fetchShops().catch(() => {});
  }, [fetchShops]);

  return {
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
    citySlug,
    setCitySlug,
    sort,
    setSort,
    repairTypes,
    brands,
    categoryOptions,
    repairTypeChipOptions,
    userLocation,
    setUserLocation,
    fetchShops,
    SORT_OPTIONS,
  };
}
