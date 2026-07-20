import React, { useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
  Pressable,
  Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ScreenBackground from '../components/ScreenBackground';
import PartnerAppHeader from '../components/partner/PartnerAppHeader';
import { useScrollShadow } from '../hooks/useScrollShadow';
import { usePartnerDashboardBack } from '../navigation/appNavBarBack';
import {
  Text,
  TextInput,
  Button,
  Portal,
  Dialog,
  ActivityIndicator,
  useTheme,
  Switch,
  Chip,
} from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import { Picker } from '@react-native-picker/picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import {
  getMyShopProfiles,
  updateShopProfile,
  getCountries,
  getCitiesForCountry,
} from '../api/profiles';
import {
  createLegalEntity,
  updateLegalEntity,
  getLegalEntities,
  uploadLegalEntityLogo,
  deleteLegalEntityLogo,
} from '../api/billing';
import { API_BASE_URL } from '../api/config';
import { uploadShopImage, deleteShopImage } from '../api/shops';
import { getMakes } from '../api/vehicles';
import SearchableChipSelector from '../components/ui/SearchableChipSelector';
import { vehicleTypeEmoji } from '../utils/vehicleTypeIcons';
import { fetchBusinessTaxonomy } from '../api/seo';
import {
  hydrateBusinessCategoryCatalog,
  mapPinKeyForCategoryKey,
} from '../utils/seo/businessCategoryCatalog';
import { getMapPinDefinition } from '../utils/pinRegistry';

import AppCard from '../components/ui/AppCard';
import { COLORS } from '../constants/colors';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { AuthContext } from '../context/AuthManager';
import { logout } from '../api/auth';
import {
  getShopProfileIncompleteFields,
  getShopProfileGateIncompleteFields,
  getShopProfileCompletionPercent,
  getShopProfileStrengthHints,
  getShopProfileSectionStatus,
  hasShopMapPin,
  isShopProfileEssentialsComplete,
} from '../utils/shopProfileCompleteness';
import { profileSectionForField } from '../utils/shopProfileSectionMap';
import ShopProfileCompletionCard from '../components/shop/ShopProfileCompletionCard';
import ShopProfileMissingAlert from '../components/shop/ShopProfileMissingAlert';
import { getInitialShopProfileExpandedSections } from '../utils/shopProfileGate';
import ShopProfileAccordionSection from '../components/shop/ShopProfileAccordionSection';
import { parseOptionalCoordinate, roundCoordinateForApi } from '../utils/manualServiceCenter';
import {
  resolveCountryCityFromCoords,
  dedupeRepeatedAddressText,
} from '../utils/reverseGeocodeLocation';
import { dialPrefixForCountry, parseStoredPhone } from '../utils/phoneE164';
import ShopPublicPreviewTabs from '../components/shop/ShopPublicPreviewTabs';
import ShopViewPublicProfileButton from '../components/shop/ShopViewPublicProfileButton';
import ShopPhotoGallery from '../components/shop/ShopPhotoGallery';
import ShopOperationsPricingSection from '../components/shop/ShopOperationsPricingSection';
import ShopOnlinePresenceSection from '../components/shop/ShopOnlinePresenceSection';
import ShopNotificationSettingsSection from '../components/shop/ShopNotificationSettingsSection';
import {
  buildShopProfileFormDraft,
  applyShopProfileFormDraft,
} from '../utils/shopProfileFormDraft';
import { formatShopDisplayName } from '../utils/shopDisplayName';
import {
  PREFERRED_CONTACT_OPTIONS,
  parsePreferredContactMethods,
  serializePreferredContactMethods,
} from '../utils/preferredContactMethods';
import {
  buildShopGeneratedPublicProfile,
  deriveServiceCenterTypeFromVehicles,
} from '../utils/shopPublicProfileText';
import {
  getServiceMenu,
  createServiceMenuItem,
  updateServiceMenuItem,
} from '../api/serviceMenu';
import ShopInvoiceSettingsSection from '../components/shop/ShopInvoiceSettingsSection';
import FloatingSaveBar from '../components/ui/FloatingSaveBar';
import { useTranslation, getLocale } from '../i18n';
import { pickVehiclePhotoAttachment, pickInvoiceLogoAttachment } from '../utils/pickDocumentFile';
import { emptyLegalEntityDraft } from '../utils/invoiceTaxLabels';
import { attachLunchBreak, parseLunchBreak } from '../utils/shopWorkingHours';
import { buildShopProfileSaveSnapshot } from '../utils/shopProfileSaveSnapshot';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DAY_KEY = {
  Monday: 'monday',
  Tuesday: 'tuesday',
  Wednesday: 'wednesday',
  Thursday: 'thursday',
  Friday: 'friday',
  Saturday: 'saturday',
  Sunday: 'sunday',
};

const DEFAULT_HOURS = DAYS.map((day) => {
  const isWeekend = day === 'Saturday' || day === 'Sunday';
  return {
    day,
    start: isWeekend ? '' : '09:00',
    end: isWeekend ? '' : '18:00',
    closed: isWeekend,
  };
});

const MAX_SHOP_PHOTOS = 6;

function toSafeArray(v) {
  return Array.isArray(v) ? v : [];
}

function ensureSelectedCountry(countryList, selectedId, selectedName) {
  if (!selectedId) return countryList;
  if (countryList.some((country) => Number(country.id) === Number(selectedId))) {
    return countryList;
  }
  return [{ id: selectedId, name: selectedName || 'Selected country' }, ...countryList];
}

function ensureSelectedCity(cityList, selectedId, selectedName) {
  if (!selectedId) return cityList;
  if (cityList.some((city) => Number(city.id) === Number(selectedId))) {
    return cityList;
  }
  return [{ id: selectedId, name: selectedName || 'Selected city' }, ...cityList];
}

async function fetchCountryRows({ force = false } = {}) {
  const rows = await getCountries({ force });
  return toSafeArray(rows);
}

function parseWorkingHours(value) {
  let src = value;
  if (typeof src === 'string') {
    try {
      src = JSON.parse(src);
    } catch (_e) {
      return DEFAULT_HOURS;
    }
  }

  if (!src || typeof src !== 'object' || Array.isArray(src)) {
    return DEFAULT_HOURS;
  }

  return DAYS.map((day) => {
    const key = DAY_KEY[day];
    const row = src[key] ?? src[day.toLowerCase()] ?? src[day];

    if (row == null) return { day, start: '', end: '', closed: true };
    if (typeof row === 'string') {
      const m = row.match(/([^\-]+)-(.+)/);
      if (m) {
        return {
          day,
          start: m[1].trim(),
          end: m[2].trim(),
          closed: false,
        };
      }
      if (row.toLowerCase().includes('closed')) return { day, start: '', end: '', closed: true };
      return { day, start: row.trim(), end: '', closed: false };
    }

    if (typeof row === 'object') {
      const start = row.start != null ? String(row.start) : '';
      const end = row.end != null ? String(row.end) : '';
      const closed = !!row.closed || (!start && !end);
      return { day, start, end, closed };
    }

    return { day, start: '', end: '', closed: true };
  });
}

function buildWorkingHours(rows) {
  const out = {};
  rows.forEach((r) => {
    const key = DAY_KEY[r.day] || r.day.toLowerCase();
    const start = (r.start || '').trim();
    const end = (r.end || '').trim();
    if (r.closed || (!start && !end)) {
      out[key] = { closed: true };
    } else {
      out[key] = { start, end };
    }
  });
  return out;
}

function buildWorkingHoursPayload(rows, lunchBreakHours = 0, lunchStart = '12:00') {
  return attachLunchBreak(buildWorkingHours(rows), {
    hours: lunchBreakHours,
    start: lunchStart,
  });
}

function applyDefaultWeekdayHours(rows) {
  return rows.map((row) => {
    if (row.day === 'Saturday' || row.day === 'Sunday') {
      return { ...row, closed: true, start: '', end: '' };
    }
    return { ...row, closed: false, start: '09:00', end: '18:00' };
  });
}

function sanitizeArray(value) {
  return toSafeArray(value).filter((v) => v != null).map((v) => Number(v));
}

async function mergeRegistrationContact(profileRow) {
  if (!profileRow) return profileRow;
  let loginEmail = await AsyncStorage.getItem('@login_email');
  let loginPhone = await AsyncStorage.getItem('@login_phone');
  if (!loginEmail && !loginPhone) {
    const display = await AsyncStorage.getItem('@user_email_or_phone');
    if (display?.includes('@')) loginEmail = display;
    else if (display) loginPhone = display;
  }

  const next = { ...profileRow };
  if (!String(next.email || '').trim() && loginEmail) {
    next.email = loginEmail;
  }
  if (
    !String(next.phone_national || '').trim() &&
    !String(next.phone_e164 || '').trim() &&
    loginPhone
  ) {
    const parsed = parseStoredPhone(loginPhone);
    if (parsed.prefix && !String(next.phone_country_code || '').trim()) {
      next.phone_country_code = parsed.prefix;
    }
    if (parsed.national) next.phone_national = parsed.national;
  }
  return next;
}

export default function ShopProfileScreen({ navigation, route }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { scrolled, onScroll, scrollEventThrottle } = useScrollShadow();
  const handleBack = usePartnerDashboardBack(navigation);
  const requireSetup = Boolean(route?.params?.requireSetup);
  const { setAuthToken, setIsAuthenticated, setUserEmailOrPhone } = useContext(AuthContext);

  const [profile, setProfile] = useState(null);
  const [countries, setCountries] = useState([]);
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [dialogMessage, setDialogMessage] = useState('');

  const [repairTypeOptions, setRepairTypeOptions] = useState([]);
  const [vehicleTypeOptions, setVehicleTypeOptions] = useState([]);
  const [makeOptions, setMakeOptions] = useState([]);

  const [selectedServices, setSelectedServices] = useState([]);
  const [selectedVehicleTypes, setSelectedVehicleTypes] = useState([]);
  const [businessCategoryOptions, setBusinessCategoryOptions] = useState([]);
  const [businessServiceOptions, setBusinessServiceOptions] = useState([]);
  const [primaryCategoryId, setPrimaryCategoryId] = useState(null);
  const [secondaryCategoryIds, setSecondaryCategoryIds] = useState([]);
  const [businessServiceIds, setBusinessServiceIds] = useState([]);
  const [selectedBrandIds, setSelectedBrandIds] = useState([]);
  const [allBrandsServiced, setAllBrandsServiced] = useState(false);
  const [hoursRows, setHoursRows] = useState(DEFAULT_HOURS);
  const [lunchBreakHours, setLunchBreakHours] = useState(0);
  const [lunchStart, setLunchStart] = useState('12:00');
  const [publishedMenuItems, setPublishedMenuItems] = useState([]);
  const [serviceMenuItems, setServiceMenuItems] = useState([]);
  const [savingPricing, setSavingPricing] = useState(false);
  const [preferredContactMethods, setPreferredContactMethods] = useState(['chat']);
  const [expandedSections, setExpandedSections] = useState({});
  const [resolvingMapLocation, setResolvingMapLocation] = useState(false);
  const [uploadingInvoiceLogo, setUploadingInvoiceLogo] = useState(false);
  const [legalEntity, setLegalEntity] = useState(null);
  const [legalEntityOptions, setLegalEntityOptions] = useState([]);
  const sectionsInitialized = useRef(false);
  const mapPickHandledRef = useRef(null);
  const profileScrollRef = useRef(null);
  const sectionOffsetYs = useRef({});
  const [savedSnapshot, setSavedSnapshot] = useState(null);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const profileForCompleteness = useMemo(() => {
    if (!profile) return null;
    return {
      ...profile,
      supported_vehicle_types: selectedVehicleTypes,
      legal_entity_detail: legalEntity || profile.legal_entity_detail || null,
    };
  }, [profile, selectedVehicleTypes, legalEntity]);

  const countryLabel = useMemo(() => {
    const row = countries.find((c) => Number(c.id) === Number(profile?.country));
    return row?.name || profile?.country_name || '';
  }, [countries, profile?.country, profile?.country_name]);

  const cityLabel = useMemo(() => {
    const row = cities.find((c) => Number(c.id) === Number(profile?.city));
    return row?.name || profile?.city_name || '';
  }, [cities, profile?.city, profile?.city_name]);

  const generatedPublicProfile = useMemo(() => {
    const vehicleNames = vehicleTypeOptions
      .filter((v) => selectedVehicleTypes.includes(Number(v.id)))
      .map((v) => v.name);
    const repairNames = repairTypeOptions
      .filter((r) => selectedServices.includes(Number(r.id)))
      .map((r) => r.name);
    const brandNames = allBrandsServiced
      ? ['All brands']
      : makeOptions.filter((m) => selectedBrandIds.includes(Number(m.id))).map((m) => m.name);
    return buildShopGeneratedPublicProfile({
      shopName: profile?.name,
      vehicleTypeNames: vehicleNames,
      repairTypeNames: repairNames,
      publishedMenuItems: (publishedMenuItems || []).filter((row) =>
        selectedServices.includes(Number(row.repair_type ?? row.repair_type_id))
      ),
      cityName: cityLabel,
      countryName: countryLabel,
      address: profile?.address,
      workingHours: buildWorkingHoursPayload(hoursRows, lunchBreakHours, lunchStart),
      offersGuarantee: profile?.offers_guarantee,
      brands: brandNames,
      allBrandsServiced,
    });
  }, [
    profile?.name,
    profile?.address,
    profile?.offers_guarantee,
    vehicleTypeOptions,
    selectedVehicleTypes,
    repairTypeOptions,
    selectedServices,
    makeOptions,
    selectedBrandIds,
    allBrandsServiced,
    cityLabel,
    countryLabel,
    hoursRows,
    lunchBreakHours,
    lunchStart,
    publishedMenuItems,
  ]);

  useEffect(() => {
    if (!profile || sectionsInitialized.current) return;
    setExpandedSections(
      getInitialShopProfileExpandedSections(profileForCompleteness, requireSetup)
    );
    sectionsInitialized.current = true;
  }, [profile, profileForCompleteness, requireSetup]);

  useEffect(() => {
    const key = route.params?.expandSection;
    if (!key) return;
    const sectionKey = key === 'invoice' ? 'company' : key;
    setExpandedSections((prev) => ({ ...prev, [sectionKey]: true, company: sectionKey === 'company' ? true : prev.company }));
    const scrollToY = () => {
      const y = sectionOffsetYs.current[sectionKey];
      if (typeof y !== 'number' || !profileScrollRef.current?.scrollTo) return;
      profileScrollRef.current.scrollTo({ y: Math.max(0, y - 12), animated: true });
    };
    requestAnimationFrame(() => {
      scrollToY();
      setTimeout(scrollToY, 160);
      setTimeout(scrollToY, 400);
    });
  }, [route.params?.expandSection]);

  const applyMapPick = useCallback(
    async (pick) => {
      const lat = Number(pick.latitude);
      const lon = Number(pick.longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;

      const roundedLat = roundCoordinateForApi(lat);
      const roundedLon = roundCoordinateForApi(lon);

      setProfile((prev) => ({
        ...prev,
        latitude: roundedLat,
        longitude: roundedLon,
      }));

      setResolvingMapLocation(true);
      try {
        let countryRows = countries;
        if (!countryRows.length) {
          const fetched = await getCountries();
          countryRows = Array.isArray(fetched) ? fetched : [];
          if (countryRows.length) setCountries(countryRows);
        }

        const resolved = await resolveCountryCityFromCoords({
          latitude: lat,
          longitude: lon,
          countries: countryRows,
          getCitiesForCountry,
        });

        setProfile((prev) => {
          const next = {
            ...prev,
            latitude: roundedLat,
            longitude: roundedLon,
          };
          if (resolved?.addressHint) {
            next.address = dedupeRepeatedAddressText(resolved.addressHint);
          }
          if (resolved?.postalCode) {
            next.postal_code = resolved.postalCode;
            if (!String(prev?.invoice_postal_code || '').trim()) {
              next.invoice_postal_code = resolved.postalCode;
            }
          }
          if (resolved?.countryId) {
            next.country = resolved.countryId;
            const countryRow = countryRows.find((c) => Number(c.id) === Number(resolved.countryId));
            const prefix = dialPrefixForCountry(countryRow);
            if (prefix) {
              next.phone_country_code = prefix;
            }
          }
          if (resolved?.cityId) {
            next.city = resolved.cityId;
          }
          return next;
        });

        if (resolved?.countryId) {
          const cityList = Array.isArray(resolved.cities)
            ? resolved.cities
            : await getCitiesForCountry(resolved.countryId);
          setCities(Array.isArray(cityList) ? cityList : []);
        }
      } catch (e) {
        console.warn('Could not resolve map location to country/city', e);
      } finally {
        setResolvingMapLocation(false);
      }
    },
    [countries]
  );

  const draftSetters = useMemo(
    () => ({
      setProfile,
      setSelectedServices,
      setSelectedVehicleTypes,
      setHoursRows,
      setExpandedSections,
      setPreferredContactMethods,
      setSelectedBrandIds,
      setAllBrandsServiced,
    }),
    []
  );

  const workingHoursPayload = useMemo(
    () => buildWorkingHoursPayload(hoursRows, lunchBreakHours, lunchStart),
    [hoursRows, lunchBreakHours, lunchStart]
  );

  const currentSnapshot = useMemo(
    () =>
      buildShopProfileSaveSnapshot({
        profile,
        selectedServices,
        selectedVehicleTypes,
        selectedBrandIds,
        allBrandsServiced,
        workingHoursPayload,
        preferredContactMethods,
        legalEntity,
        primaryCategoryId,
        secondaryCategoryIds,
        businessServiceIds,
      }),
    [
      profile,
      selectedServices,
      selectedVehicleTypes,
      selectedBrandIds,
      allBrandsServiced,
      workingHoursPayload,
      preferredContactMethods,
      legalEntity,
      primaryCategoryId,
      secondaryCategoryIds,
      businessServiceIds,
    ]
  );

  const isDirty = Boolean(savedSnapshot && currentSnapshot && savedSnapshot !== currentSnapshot);

  const openMapPicker = useCallback(() => {
    const lat = parseOptionalCoordinate(profile?.latitude);
    const lon = parseOptionalCoordinate(profile?.longitude);
    const preservedDraft = buildShopProfileFormDraft({
      profile,
      selectedServices,
      selectedVehicleTypes,
      hoursRows,
      expandedSections,
      preferredContactMethods,
      selectedBrandIds,
      allBrandsServiced,
    });
    navigation.navigate('MapLocationPicker', {
      returnScreen: 'ShopProfile',
      requireSetup,
      initialLatitude: lat,
      initialLongitude: lon,
      preservedDraft,
    });
  }, [
    navigation,
    profile,
    selectedServices,
    selectedVehicleTypes,
    hoursRows,
    expandedSections,
    preferredContactMethods,
    selectedBrandIds,
    allBrandsServiced,
    requireSetup,
  ]);

  const vehicleTypeChipItems = useMemo(
    () =>
      vehicleTypeOptions.map((item) => ({
        id: item.id,
        label: item.name,
        prefix: vehicleTypeEmoji(item.code, item.name),
      })),
    [vehicleTypeOptions]
  );

  const brandChipItems = useMemo(
    () => makeOptions.map((item) => ({ id: item.id, label: item.name })),
    [makeOptions]
  );

  const categoryLabel = useCallback(
    (cat) => cat?.localized_name || cat?.name_en || cat?.name || cat?.key || '',
    []
  );

  // Secondary business categories = every category except the chosen primary.
  const secondaryCategoryChipItems = useMemo(
    () =>
      businessCategoryOptions
        .filter((cat) => Number(cat.id) !== Number(primaryCategoryId))
        .map((cat) => ({ id: cat.id, label: categoryLabel(cat) })),
    [businessCategoryOptions, primaryCategoryId, categoryLabel]
  );

  // Services offered are filtered to the shop's selected categories (primary +
  // secondary). A service with no declared compatibility is always eligible.
  const selectedCategoryKeys = useMemo(() => {
    const ids = new Set(
      [primaryCategoryId, ...secondaryCategoryIds].filter((v) => v != null).map(Number)
    );
    return new Set(
      businessCategoryOptions.filter((c) => ids.has(Number(c.id))).map((c) => c.key)
    );
  }, [businessCategoryOptions, primaryCategoryId, secondaryCategoryIds]);

  const businessServiceChipItems = useMemo(() => {
    const hasCategories = selectedCategoryKeys.size > 0;
    return businessServiceOptions
      .filter((svc) => {
        if (!hasCategories) return true;
        const compat = Array.isArray(svc.category_keys) ? svc.category_keys : [];
        if (!compat.length) return true;
        return compat.some((key) => selectedCategoryKeys.has(key));
      })
      .map((svc) => ({
        id: svc.id,
        label: svc.localized_name || svc.name_en || svc.name || svc.key,
      }));
  }, [businessServiceOptions, selectedCategoryKeys]);

  // Drop selected services that are no longer compatible with the categories.
  useEffect(() => {
    if (!businessServiceOptions.length) return;
    const eligible = new Set(businessServiceChipItems.map((i) => Number(i.id)));
    setBusinessServiceIds((prev) => {
      const next = prev.filter((id) => eligible.has(Number(id)));
      return next.length === prev.length ? prev : next;
    });
  }, [businessServiceChipItems, businessServiceOptions.length]);

  // Live map-pin preview follows the PRIMARY business category.
  const primaryPinDefinition = useMemo(() => {
    const primary = businessCategoryOptions.find(
      (c) => Number(c.id) === Number(primaryCategoryId)
    );
    const pinKey = primary
      ? primary.map_pin_key || mapPinKeyForCategoryKey(primary.key)
      : profile?.primary_map_category;
    return getMapPinDefinition(pinKey);
  }, [businessCategoryOptions, primaryCategoryId, profile?.primary_map_category]);

  useEffect(() => {
    if (loading) return;

    const draft = route.params?.preservedDraft ?? route.params?.draft;
    const pick = route.params?.mapPick;

    let cancelled = false;
    (async () => {
      if (draft) {
        applyShopProfileFormDraft(draft, draftSetters);
        navigation.setParams({ preservedDraft: undefined, draft: undefined });
      }
      if (pick && !cancelled) {
        const pickKey = `${pick.latitude},${pick.longitude}`;
        if (mapPickHandledRef.current !== pickKey) {
          mapPickHandledRef.current = pickKey;
          await applyMapPick(pick);
          navigation.setParams({ mapPick: undefined });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    route.params?.preservedDraft,
    route.params?.draft,
    route.params?.mapPick,
    loading,
    applyMapPick,
    navigation,
    draftSetters,
  ]);

  const toggleSection = (key) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const recordSectionOffset = useCallback((sectionKey, y) => {
    if (!sectionKey || typeof y !== 'number' || Number.isNaN(y)) return;
    sectionOffsetYs.current[sectionKey] = y;
  }, []);

  const scrollToMissingField = useCallback((fieldKey) => {
    const sectionKey = profileSectionForField(fieldKey);
    if (!sectionKey) return;
    setExpandedSections((prev) => ({ ...prev, [sectionKey]: true }));
    const scrollToY = () => {
      const y = sectionOffsetYs.current[sectionKey];
      if (typeof y !== 'number' || !profileScrollRef.current?.scrollTo) return;
      profileScrollRef.current.scrollTo({ y: Math.max(0, y - 12), animated: true });
    };
    // Expand accordion first, then scroll (layout may shift after expand).
    requestAnimationFrame(() => {
      scrollToY();
      setTimeout(scrollToY, 120);
    });
  }, []);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: requireSetup ? t('partnerProfile.completeCenterDetails') : t('partnerProfile.centerDetails'),
      headerBackVisible: !requireSetup,
      headerLeft: requireSetup ? () => null : undefined,
      headerRight: requireSetup
        ? () => (
            <Button
              mode="text"
              onPress={() =>
                logout(navigation, setAuthToken, setIsAuthenticated, setUserEmailOrPhone)
              }
              labelStyle={{ color: '#fff', fontSize: 16 }}
            >
              Log out
            </Button>
          )
        : undefined,
    });
  }, [
    navigation,
    requireSetup,
    t,
    setAuthToken,
    setIsAuthenticated,
    setUserEmailOrPhone,
  ]);

  const repairTypesByCategory = useMemo(() => {
    const grouped = {};
    repairTypeOptions.forEach((item) => {
      const cat = item.category_name || 'Other';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(item);
    });
    return Object.entries(grouped).sort((a, b) => a[0].localeCompare(b[0]));
  }, [repairTypeOptions]);

  async function loadTaxonomy(token) {
    const res = await fetch(`${API_BASE_URL}/api/repairs/types/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to fetch service types');
    const repairTypes = await res.json();
    setRepairTypeOptions(toSafeArray(repairTypes));

    // Business categories & services (public taxonomy — drives business type /
    // services offered selectors and keeps the frontend catalog fresh).
    try {
      const taxonomy = await fetchBusinessTaxonomy(getLocale());
      const categories = toSafeArray(taxonomy?.business_categories);
      const services = toSafeArray(taxonomy?.business_services);
      if (categories.length) {
        setBusinessCategoryOptions(categories);
        hydrateBusinessCategoryCatalog(categories);
      }
      if (services.length) setBusinessServiceOptions(services);
    } catch (e) {
      console.warn('Could not load business taxonomy', e);
    }

    try {
      const direct = await fetch(`${API_BASE_URL}/api/vehicles/types/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (direct.ok) {
        const rows = await direct.json();
        if (Array.isArray(rows) && rows.length) {
          setVehicleTypeOptions(rows.map((x) => ({ id: x.id, name: x.name, code: x.code })));
          return;
        }
      }
    } catch (_e) {
      // Fallback below when dedicated endpoint is unavailable.
    }

    const map = new Map();
    toSafeArray(repairTypes).forEach((rt) => {
      const ids = toSafeArray(rt.vehicle_types);
      const names = toSafeArray(rt.vehicle_type_names);
      ids.forEach((id, i) => {
        const name = names[i] || `Type ${id}`;
        if (!map.has(Number(id))) {
          map.set(Number(id), {
            id: Number(id),
            name,
            code: String(name).toLowerCase().replace(/\s+/g, '-'),
          });
        }
      });
    });
    setVehicleTypeOptions(Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name)));
  }

  const loadData = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('@access_token');
      let countryList = [];
      let countriesLoadFailed = false;

      try {
        countryList = await fetchCountryRows();
        if (!countryList.length) {
          countryList = await fetchCountryRows({ force: true });
        }
      } catch (err) {
        countriesLoadFailed = true;
        console.error('[ShopProfile] getCountries failed', err);
      }

      const [shopProfiles, makes] = await Promise.all([
        getMyShopProfiles(),
        token ? getMakes().catch(() => []) : Promise.resolve([]),
      ]);

      setCountries(countryList);
      if (countriesLoadFailed) {
        setDialogMessage('Could not load countries. Check your connection and try again.');
        setDialogVisible(true);
      } else if (countryList.length === 0) {
        setDialogMessage(
          'Country list is empty on the server. Ask your administrator to run: python manage.py seed_bootstrap'
        );
        setDialogVisible(true);
      }
      setMakeOptions(Array.isArray(makes) ? makes : []);
      if (token) await loadTaxonomy(token);

      if (shopProfiles.length > 0) {
        const currentShopId = await AsyncStorage.getItem(STORAGE_KEYS.CURRENT_SHOP_ID);
        const p0 =
          shopProfiles.find((row) => String(row.id) === String(currentShopId)) || shopProfiles[0];
        const p = await mergeRegistrationContact(p0);
        setCountries(
          ensureSelectedCountry(countryList, p.country, p.country_name)
        );
        const loadedServices = sanitizeArray(p.available_repairs);
        const loadedVehicleTypes = sanitizeArray(p.supported_vehicle_types);
        const loadedPrimaryCategoryId = p.primary_business_category?.id ?? null;
        const loadedSecondaryCategoryIds = sanitizeArray(
          (Array.isArray(p.business_categories) ? p.business_categories : [])
            .filter((link) => !link?.is_primary)
            .map((link) => link?.category?.id)
        );
        const loadedBusinessServiceIds = sanitizeArray(
          (Array.isArray(p.business_services) ? p.business_services : [])
            .map((link) => link?.service?.id)
        );
        const loadedBrandIds = sanitizeArray(p.brands);
        const loadedAllBrands = !!p.all_brands_serviced;
        const loadedHours =
          p.working_hours != null && p.working_hours !== ''
            ? parseWorkingHours(p.working_hours)
            : DEFAULT_HOURS;
        const loadedLunch = parseLunchBreak(p.working_hours);
        const loadedContact = parsePreferredContactMethods(p);
        const loadedLegal = p.legal_entity_detail
          ? { ...p.legal_entity_detail }
          : emptyLegalEntityDraft(p);

        setProfile(p);
        setLegalEntity(loadedLegal);
        setSelectedServices(loadedServices);
        setSelectedVehicleTypes(loadedVehicleTypes);
        setPrimaryCategoryId(loadedPrimaryCategoryId);
        setSecondaryCategoryIds(loadedSecondaryCategoryIds);
        setBusinessServiceIds(loadedBusinessServiceIds);
        setSelectedBrandIds(loadedBrandIds);
        setAllBrandsServiced(loadedAllBrands);
        setHoursRows(loadedHours);
        setLunchBreakHours(loadedLunch.hours);
        setLunchStart(loadedLunch.start);
        setPreferredContactMethods(loadedContact);
        setSavedSnapshot(
          buildShopProfileSaveSnapshot({
            profile: p,
            selectedServices: loadedServices,
            selectedVehicleTypes: loadedVehicleTypes,
            selectedBrandIds: loadedBrandIds,
            allBrandsServiced: loadedAllBrands,
            workingHoursPayload: buildWorkingHoursPayload(
              loadedHours,
              loadedLunch.hours,
              loadedLunch.start
            ),
            preferredContactMethods: loadedContact,
            legalEntity: loadedLegal,
            primaryCategoryId: loadedPrimaryCategoryId,
            secondaryCategoryIds: loadedSecondaryCategoryIds,
            businessServiceIds: loadedBusinessServiceIds,
          })
        );

        if (p.country) {
          const cityList = await getCitiesForCountry(p.country);
          setCities(
            ensureSelectedCity(
              toSafeArray(cityList),
              p.city,
              p.city_name
            )
          );
        }

        if (token && p.id) {
          try {
            const [menuRows, entities] = await Promise.all([
              getServiceMenu(token, String(p.id)),
              getLegalEntities(token).catch(() => []),
            ]);
            const rows = Array.isArray(menuRows) ? menuRows : [];
            setServiceMenuItems(rows);
            setPublishedMenuItems(rows.filter((row) => row.is_published));
            setLegalEntityOptions(Array.isArray(entities) ? entities : []);
          } catch {
            setServiceMenuItems([]);
            setPublishedMenuItems([]);
            setLegalEntityOptions([]);
          }
        }
      }
    } catch (err) {
      console.error(err);
      setDialogMessage(t('partnerProfile.loadError'));
      setDialogVisible(true);
    } finally {
      setLoading(false);
    }
  };

  const handleCountryChange = async (value) => {
    let countryRows = countries;
    if (!countryRows.length) {
      try {
        countryRows = await fetchCountryRows({ force: true });
        countryRows = ensureSelectedCountry(
          countryRows,
          profile?.country,
          profile?.country_name
        );
        setCountries(countryRows);
      } catch (err) {
        console.error('[ShopProfile] getCountries failed on picker', err);
        setDialogMessage('Could not load countries. Check your connection and try again.');
        setDialogVisible(true);
        return;
      }
      if (!countryRows.length) {
        setDialogMessage(
          'Country list is empty on the server. Ask your administrator to run: python manage.py seed_bootstrap'
        );
        setDialogVisible(true);
        return;
      }
    }

    const countryRow = countryRows.find((c) => Number(c.id) === Number(value));
    const prefix = dialPrefixForCountry(countryRow);
    setProfile((prev) => ({
      ...prev,
      country: value,
      city: null,
      ...(prefix ? { phone_country_code: prefix } : {}),
    }));
    if (value) {
      try {
        const cityList = await getCitiesForCountry(value);
        setCities(toSafeArray(cityList));
      } catch (err) {
        console.error(err);
        setDialogMessage('Error loading cities');
        setDialogVisible(true);
      }
    } else {
      setCities([]);
    }
  };

  const handleSave = async () => {
    if (!profile) return;

    const draftProfile = {
      ...profile,
      working_hours: buildWorkingHoursPayload(hoursRows, lunchBreakHours, lunchStart),
      supported_vehicle_types: selectedVehicleTypes,
    };
    const missing = getShopProfileGateIncompleteFields(draftProfile, {
      vehicleTypeIds: selectedVehicleTypes,
    });
    if (missing.length) {
      setDialogMessage(t('partnerProfile.missingFields', { fields: missing.join(', ') }));
      setDialogVisible(true);
      return;
    }

    const countryRow = countries.find((c) => Number(c.id) === Number(profile.country));
    const cityRow = cities.find((c) => Number(c.id) === Number(profile.city));
    const workingHoursPayload = buildWorkingHoursPayload(hoursRows, lunchBreakHours, lunchStart);
    const vehicleNames = vehicleTypeOptions
      .filter((v) => selectedVehicleTypes.includes(Number(v.id)))
      .map((v) => v.name);
    const repairNames = repairTypeOptions
      .filter((r) => selectedServices.includes(Number(r.id)))
      .map((r) => r.name);
    const brandNames = allBrandsServiced
      ? []
      : makeOptions.filter((m) => selectedBrandIds.includes(Number(m.id))).map((m) => m.name);
    let menuForSummary = publishedMenuItems;
    try {
      const token = await AsyncStorage.getItem('@access_token');
      if (token) {
        const menuRows = await getServiceMenu(token, String(profile.id));
        const selectedSet = new Set(selectedServices.map(Number));
        menuForSummary = (Array.isArray(menuRows) ? menuRows : []).filter(
          (row) =>
            row.is_published && selectedSet.has(Number(row.repair_type ?? row.repair_type_id))
        );
      }
    } catch {
      const selectedSet = new Set(selectedServices.map(Number));
      menuForSummary = (publishedMenuItems || []).filter((row) =>
        selectedSet.has(Number(row.repair_type ?? row.repair_type_id))
      );
    }

    const generated = buildShopGeneratedPublicProfile({
      shopName: profile.name,
      vehicleTypeNames: vehicleNames,
      repairTypeNames: repairNames,
      publishedMenuItems: menuForSummary,
      cityName: cityRow?.name || profile.city_name || '',
      countryName: countryRow?.name || profile.country_name || '',
      address: profile.address,
      workingHours: workingHoursPayload,
      offersGuarantee: profile.offers_guarantee,
      brands: brandNames,
      allBrandsServiced,
    });

    const contactPayload = serializePreferredContactMethods(preferredContactMethods);

    setSaving(true);
    try {
      const token = await AsyncStorage.getItem('@access_token');
      let entityId = legalEntity?.id || null;
      const entityPayload = {
        legal_name: legalEntity?.legal_name || profile.name || '',
        vat_registered: legalEntity?.vat_registered !== false,
        vat_number: legalEntity?.vat_number || '',
        eik_number: legalEntity?.eik_number || '',
        country: legalEntity?.country || profile.country || null,
        prices_include_vat: legalEntity?.prices_include_vat !== false,
      };
      const hasCompanyData =
        entityPayload.legal_name ||
        entityPayload.vat_number ||
        entityPayload.eik_number;

      if (token && hasCompanyData) {
        if (entityId) {
          const updatedEntity = await updateLegalEntity(token, entityId, entityPayload);
          setLegalEntity(updatedEntity);
          entityId = updatedEntity.id;
        } else {
          const createdEntity = await createLegalEntity(token, entityPayload);
          setLegalEntity(createdEntity);
          entityId = createdEntity.id;
          setLegalEntityOptions((prev) => {
            const list = Array.isArray(prev) ? prev : [];
            if (list.some((row) => Number(row.id) === Number(createdEntity.id))) return list;
            return [...list, createdEntity];
          });
        }
      }

      const payload = {
      name: profile.name,
      address: profile.address,
      postal_code: profile.postal_code || '',
      phone: profile.phone,
      phone_country_code: profile.phone_country_code,
      phone_national: profile.phone_national,
      phone_e164: profile.phone_e164,
      phone_verified: !!profile.phone_verified,
      ...contactPayload,
      country: profile.country,
      city: profile.city,
      latitude: roundCoordinateForApi(profile.latitude),
      longitude: roundCoordinateForApi(profile.longitude),
      languages: profile.languages,
      email: profile.email,
      website: profile.website,
      offers_guarantee: profile.offers_guarantee,
      brands: allBrandsServiced ? [] : selectedBrandIds,
      all_brands_serviced: allBrandsServiced,
      working_hours: workingHoursPayload,
      service_center_type: deriveServiceCenterTypeFromVehicles(vehicleNames),
      description: profile.description,
      short_description: profile.short_description || '',
      seo_city: generated.seoCity,
      seo_country: generated.seoCountry,
      seo_keywords: generated.seoKeywords,
      generated_public_summary: generated.summary,
      google_maps_url: profile.google_maps_url,
      youtube_url: profile.youtube_url,
      facebook_url: profile.facebook_url,
      instagram_url: profile.instagram_url,
      supported_vehicle_types: selectedVehicleTypes,
      available_repairs: selectedServices,
      ...(primaryCategoryId != null
        ? {
            primary_business_category_id: primaryCategoryId,
            secondary_business_category_ids: secondaryCategoryIds,
            business_service_ids: businessServiceIds,
          }
        : {}),
      daily_vehicle_capacity: profile.daily_vehicle_capacity
        ? parseInt(String(profile.daily_vehicle_capacity), 10)
        : null,
      warehouse_enabled: Boolean(profile.warehouse_enabled),
      legal_entity: entityId,
      invoice_branch_name: profile.invoice_branch_name || profile.name || '',
      invoice_address_line1: profile.invoice_address_line1 || '',
      invoice_city: profile.invoice_city || '',
      invoice_postal_code: profile.invoice_postal_code || '',
      };

      const updated = await updateShopProfile(profile.id, payload);
      const nextProfile = {
        ...updated,
        generated_public_summary: generated.summary,
        working_hours: workingHoursPayload,
      };
      setProfile(nextProfile);
      if (updated.legal_entity_detail) {
        setLegalEntity({ ...updated.legal_entity_detail });
      }
      // Re-fetch menu after profile save — never merge stale published rows over
      // labor_from/to that were just written by the operations modal.
      try {
        if (token) {
          await refreshServiceMenuFromApi(token, profile.id);
        } else {
          setPublishedMenuItems(menuForSummary);
        }
      } catch {
        setPublishedMenuItems(menuForSummary);
      }
      setHoursRows(parseWorkingHours(workingHoursPayload));
      setSavedSnapshot(
        buildShopProfileSaveSnapshot({
          profile: nextProfile,
          selectedServices,
          selectedVehicleTypes,
          selectedBrandIds,
          allBrandsServiced,
          workingHoursPayload,
          preferredContactMethods,
          legalEntity: updated.legal_entity_detail || legalEntity,
          primaryCategoryId,
          secondaryCategoryIds,
          businessServiceIds,
        })
      );
      const returnTo = route.params?.returnTo;
      if (returnTo === 'ShopInvoiceDetail' && route.params?.invoiceId) {
        navigation.navigate('ShopInvoiceDetail', { invoiceId: route.params.invoiceId });
        return;
      }
      if (returnTo === 'ShopInvoiceDetail') {
        navigation.navigate('ShopInvoicing');
        return;
      }
      if (requireSetup || !isShopProfileEssentialsComplete(updated)) {
        if (isShopProfileEssentialsComplete(updated)) {
          navigation.reset({ index: 0, routes: [{ name: 'ShopHome' }] });
        } else {
          setDialogMessage(t('partnerProfile.savedSetupPartial'));
          setDialogVisible(true);
        }
        return;
      }
      setDialogMessage(t('partnerProfile.savedSuccess'));
      setDialogVisible(true);
    } catch (err) {
      console.error(err);
      let message = t('partnerProfile.saveError');
      try {
        const data = JSON.parse(err.message);
        const fieldError =
          data?.vat_number?.[0] ||
          data?.eik_number?.[0] ||
          data?.invoice_vat_number?.[0] ||
          data?.invoice_eik_number?.[0] ||
          (typeof data?.detail === 'string' ? data.detail : null);
        if (fieldError) message = fieldError;
      } catch {
        // keep generic message
      }
      setDialogMessage(message);
      setDialogVisible(true);
    } finally {
      setSaving(false);
    }
  };

  const fillInvoiceFromPublicProfile = () => {
    setProfile((prev) => ({
      ...prev,
      invoice_branch_name: prev?.invoice_branch_name || prev?.name || '',
      invoice_address_line1: prev?.invoice_address_line1 || prev?.address || '',
      invoice_city: prev?.invoice_city || cityLabel || '',
      invoice_postal_code: prev?.invoice_postal_code || prev?.postal_code || '',
    }));
  };

  const ensureLegalEntityId = async (token) => {
    if (legalEntity?.id) return legalEntity.id;
    const entityPayload = {
      legal_name: legalEntity?.legal_name || profile?.name || '',
      vat_registered: legalEntity?.vat_registered !== false,
      vat_number: legalEntity?.vat_number || '',
      eik_number: legalEntity?.eik_number || '',
      country: legalEntity?.country || profile?.country || null,
      prices_include_vat: legalEntity?.prices_include_vat !== false,
    };
    const created = await createLegalEntity(token, entityPayload);
    setLegalEntity(created);
    await updateShopProfile(profile.id, { legal_entity: created.id });
    return created.id;
  };

  const handlePickAndUploadInvoiceLogo = async () => {
    if (!profile?.id) return;
    try {
      const attachment = await pickInvoiceLogoAttachment();
      if (!attachment) return;
      const token = await AsyncStorage.getItem('@access_token');
      if (!token) {
        Alert.alert('Error', 'You are not logged in.');
        return;
      }
      setUploadingInvoiceLogo(true);
      const entityId = await ensureLegalEntityId(token);
      const updated = await uploadLegalEntityLogo(token, entityId, attachment);
      setLegalEntity(updated);
      Alert.alert('Saved', 'Company logo uploaded.');
    } catch (err) {
      Alert.alert('Error', err.message || 'Could not upload logo');
    } finally {
      setUploadingInvoiceLogo(false);
    }
  };

  const handleRemoveInvoiceLogo = async () => {
    if (!legalEntity?.id) return;
    try {
      const token = await AsyncStorage.getItem('@access_token');
      if (!token) return;
      setUploadingInvoiceLogo(true);
      await deleteLegalEntityLogo(token, legalEntity.id);
      setLegalEntity((prev) => ({ ...prev, logo_url: '' }));
    } catch (err) {
      Alert.alert('Error', err.message || 'Could not remove logo');
    } finally {
      setUploadingInvoiceLogo(false);
    }
  };

  const refreshProfileImages = async () => {
    const shopProfiles = await getMyShopProfiles();
    if (shopProfiles.length > 0) {
      setProfile((prev) => ({ ...prev, images: shopProfiles[0].images }));
    }
  };

  const handlePickAndUploadImage = async () => {
    try {
      const currentCount = toSafeArray(profile?.images).length;
      if (currentCount >= MAX_SHOP_PHOTOS) {
        Alert.alert('Photo limit', `You can upload up to ${MAX_SHOP_PHOTOS} photos.`);
        return;
      }

      let uri = null;
      let file = null;

      if (Platform.OS === 'web') {
        const attachment = await pickVehiclePhotoAttachment();
        if (!attachment) return;
        uri = attachment.uri;
        file = attachment.file;
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission required', 'Allow access to photos to upload.');
          return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          quality: 0.7,
        });
        if (result.canceled || !result.assets.length) return;
        uri = result.assets[0].uri;
      }

      const token = await AsyncStorage.getItem('@access_token');
      if (!token) {
        Alert.alert('Error', 'You are not logged in. Please log in again.');
        return;
      }

      setSaving(true);
      await uploadShopImage(profile.id, token, uri, file);
      await refreshProfileImages();
      Alert.alert('Success', 'Photo uploaded!');
    } catch (err) {
      console.error(err);
      Alert.alert('Error', err.message || 'Upload failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteImage = async (imageId) => {
    try {
      const token = await AsyncStorage.getItem('@access_token');
      if (!token) {
        Alert.alert('Error', 'You are not logged in. Please log in again.');
        return;
      }

      setSaving(true);
      await deleteShopImage(profile.id, imageId, token);
      await refreshProfileImages();
      Alert.alert('Deleted', 'Image deleted.');
    } catch (err) {
      console.error(err);
      Alert.alert('Error', err.message || 'Delete failed');
    } finally {
      setSaving(false);
    }
  };

  /** Client-side only — ShopImage has no sort_order API yet. */
  const handleReorderImages = (nextImages) => {
    setProfile((prev) => ({ ...prev, images: nextImages }));
  };

  const refreshServiceMenuFromApi = async (token, shopId) => {
    const menuRows = await getServiceMenu(token, String(shopId));
    const rows = Array.isArray(menuRows) ? menuRows : [];
    setServiceMenuItems(rows);
    setPublishedMenuItems(rows.filter((row) => row.is_published));
    return rows;
  };

  const handleUpsertOperationPricing = async ({
    repairType,
    ensureSelected,
    typical_labor_minutes,
    typical_labor_minutes_to,
    labor_from,
    labor_to,
  }) => {
    if (!profile?.id || !repairType?.id) {
      throw new Error('Missing shop profile or operation.');
    }
    const token = await AsyncStorage.getItem('@access_token');
    if (!token) {
      throw new Error('You are not logged in.');
    }
    setSavingPricing(true);
    try {
      const typeId = Number(repairType.id);
      const existing = serviceMenuItems.find((row) => Number(row.repair_type) === typeId);
      // Operations & Pricing UI is labor-only — clear any stale parts ranges so
      // published totals and offer draft do not keep old parts+labor sums.
      const payload = {
        labor_from,
        labor_to,
        parts_from: null,
        parts_to: null,
        typical_labor_minutes,
        typical_labor_minutes_to:
          typical_labor_minutes_to != null ? typical_labor_minutes_to : null,
        is_published: true,
      };
      if (existing?.id) {
        await updateServiceMenuItem(token, String(profile.id), existing.id, payload);
      } else {
        await createServiceMenuItem(token, String(profile.id), {
          repair_type: typeId,
          ...payload,
        });
      }
      // Always re-fetch so chips/preview match persisted labor_from/to + cleared parts.
      await refreshServiceMenuFromApi(token, profile.id);
      if (ensureSelected) {
        setSelectedServices((prev) =>
          prev.includes(typeId) ? prev : [...prev, typeId]
        );
      }
    } catch (err) {
      Alert.alert('Error', err.message || 'Could not save operation pricing');
      throw err;
    } finally {
      setSavingPricing(false);
    }
  };

  const handleToggleOperationService = async (id) => {
    const typeId = Number(id);
    const wasSelected = selectedServices.includes(typeId);
    setSelectedServices((prev) =>
      prev.includes(typeId) ? prev.filter((x) => x !== typeId) : [...prev, typeId]
    );
    if (!wasSelected || !profile?.id) return;
    // Deselect = unpublish so public profile does not keep showing the operation price.
    const existing = serviceMenuItems.find((row) => Number(row.repair_type) === typeId);
    if (!existing?.id || !existing.is_published) return;
    try {
      const token = await AsyncStorage.getItem('@access_token');
      if (!token) return;
      await updateServiceMenuItem(token, String(profile.id), existing.id, {
        is_published: false,
      });
      await refreshServiceMenuFromApi(token, profile.id);
    } catch (err) {
      // Roll back local selection if unpublish failed.
      setSelectedServices((prev) =>
        prev.includes(typeId) ? prev : [...prev, typeId]
      );
      Alert.alert('Error', err.message || 'Could not update published operation');
    }
  };

  const toggleId = (id, setter) => {
    const n = Number(id);
    setter((prev) => (prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n]));
  };

  const toggleContactMethod = (value) => {
    setPreferredContactMethods((prev) => {
      const has = prev.includes(value);
      if (has) {
        const next = prev.filter((v) => v !== value);
        return next.length ? next : ['chat'];
      }
      return [...prev, value];
    });
  };

  if (loading) {
    return (
      <ScreenBackground safeArea={false}>
        <View style={styles.loadingCenter}>
          <ActivityIndicator color="#fff" />
        </View>
      </ScreenBackground>
    );
  }

  if (!profile) {
    return (
      <ScreenBackground safeArea={false}>
        <View style={styles.loadingCenter}>
          <Text style={{ color: '#fff' }}>{t('partnerProfile.noProfile')}</Text>
        </View>
      </ScreenBackground>
    );
  }

  const previewVehicleNames = vehicleTypeOptions
    .filter((v) => selectedVehicleTypes.includes(Number(v.id)))
    .map((v) => v.name);
  // Pricing list = published ∩ selected (same as public API filter).
  // Services chips = all selected operations (matches available_repairs on ShopDetail).
  const previewRepairNames = repairTypeOptions
    .filter((r) => selectedServices.includes(Number(r.id)))
    .map((r) => r.name);
  const previewPublishedMenuItems = (publishedMenuItems || []).filter((row) =>
    selectedServices.includes(Number(row.repair_type ?? row.repair_type_id))
  );
  const previewBrandNames = allBrandsServiced
    ? ['All brands']
    : makeOptions.filter((m) => selectedBrandIds.includes(Number(m.id))).map((m) => m.name);
  const previewPhone =
    String(profile.phone_e164 || '').trim() ||
    [profile.phone_country_code, profile.phone_national].filter(Boolean).join(' ').trim() ||
    String(profile.phone || '').trim();
  const workingHoursPayloadPreview = buildWorkingHoursPayload(
    hoursRows,
    lunchBreakHours,
    lunchStart
  );
  const completenessOptions = {
    vehicleTypeIds: selectedVehicleTypes,
    operationIds: selectedServices,
    serviceMenuItems,
    photoCount: toSafeArray(profile?.images).length,
    workingHours: workingHoursPayloadPreview,
    hasWorkingHours: hoursRows.some((row) => !row.closed && row.start && row.end),
    legalEntity,
  };
  const missingFields = getShopProfileIncompleteFields(profileForCompleteness, completenessOptions);
  const gateMissing = getShopProfileGateIncompleteFields(profileForCompleteness, completenessOptions);
  const isEssentialsComplete = gateMissing.length === 0;
  const completionPercent = getShopProfileCompletionPercent(
    profileForCompleteness,
    completenessOptions
  );
  const strengthHints = getShopProfileStrengthHints(profile, completenessOptions);
  const sectionStatus = (key) =>
    getShopProfileSectionStatus(key, profileForCompleteness, completenessOptions);
  const showSetupBanner = (requireSetup || !isEssentialsComplete) && !isEssentialsComplete;
  const mapPinSet = hasShopMapPin(profile);
  const pickedLat = parseOptionalCoordinate(profile.latitude);
  const pickedLon = parseOptionalCoordinate(profile.longitude);

  const publicPagePreviewSection = (
    <ShopProfileAccordionSection
      title={t('partnerProfile.publicPreviewTitle')}
      expanded={!!expandedSections.public_preview}
      onToggle={() => toggleSection('public_preview')}
      status={isEssentialsComplete ? 'completed' : null}
    >
      <ShopViewPublicProfileButton shop={profile} navigation={navigation} />
      <Text style={styles.helperText}>
        {isEssentialsComplete
          ? t('partnerProfile.publicPreviewReady')
          : t('partnerProfile.publicPreviewDraft')}
      </Text>
      <ShopPublicPreviewTabs
        shopName={formatShopDisplayName(profile.name)}
        vehicleTypeNames={previewVehicleNames}
        repairTypeNames={previewRepairNames}
        address={profile.address}
        cityName={cityLabel}
        countryName={countryLabel}
        googleMapsUrl={profile.google_maps_url}
        latitude={profile.latitude}
        longitude={profile.longitude}
        phone={previewPhone}
        generatedSummary={generatedPublicProfile.summary}
        userDescription={profile.description}
        workingHours={workingHoursPayloadPreview}
        publishedMenuItems={previewPublishedMenuItems}
        offersGuarantee={profile.offers_guarantee === true}
        images={profile.images}
        brandNames={previewBrandNames}
      />
    </ShopProfileAccordionSection>
  );

  return (
    <ScreenBackground safeArea={false}>
      <PartnerAppHeader
        title={t('partnerProfile.title')}
        backLabel={t('navigation.backToDashboard')}
        onBack={handleBack}
        iconOnlyBack
        scrolled={scrolled}
      />
      <ScrollView
        ref={profileScrollRef}
        onScroll={onScroll}
        scrollEventThrottle={scrollEventThrottle}
        contentContainerStyle={[
          styles.container,
          { paddingTop: 12, paddingBottom: insets.bottom + 96 },
        ]}
      >
        <ShopProfileCompletionCard
          percent={completionPercent}
          strengthHints={strengthHints}
          encourageText={t('partnerProfile.profileEncourage')}
        />

        <ShopViewPublicProfileButton shop={profile} navigation={navigation} compact />

        {!isEssentialsComplete ? (
          <ShopProfileMissingAlert
            fields={gateMissing.length ? gateMissing : missingFields}
            onFieldPress={scrollToMissingField}
          />
        ) : missingFields.length ? (
          <ShopProfileMissingAlert fields={missingFields} onFieldPress={scrollToMissingField} />
        ) : null}

        {showSetupBanner ? (
          <AppCard variant="dark" contentStyle={styles.setupBannerInner}>
            <Text style={styles.setupBannerTitle}>Complete your center details</Text>
            <Text style={styles.setupBannerText}>
              Place your shop on the map, add a name and address, and pick vehicle types so clients
              can find you nearby. Phone is optional if you prefer chat-only contact.
            </Text>
          </AppCard>
        ) : null}

        {!isEssentialsComplete ? (
          <>
            <Pressable
              onPress={openMapPicker}
              style={({ pressed }) => [
                styles.mapCtaCard,
                (gateMissing.includes('map pin') || missingFields.includes('address')) &&
                  styles.mapCtaCardAttention,
                pressed && styles.mapCtaCardPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Place pin on map"
            >
              <View style={styles.mapCtaIconWrap}>
                <MaterialCommunityIcons name="map-marker-radius" size={28} color="#fff" />
              </View>
              <View style={styles.mapCtaTextWrap}>
                <Text style={styles.mapCtaTitle}>Place pin on map</Text>
                <Text style={styles.mapCtaBody}>
                  Drop a pin to fill street address, country, city, phone prefix, and coordinates.
                </Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={24} color={COLORS.PRIMARY} />
            </Pressable>
            {mapPinSet && pickedLat != null && pickedLon != null ? (
              <View style={styles.mapSummaryRow}>
                <MaterialCommunityIcons
                  name="check-circle"
                  size={18}
                  color={gateMissing.includes('map pin') || missingFields.includes('address') ? '#fbbf24' : COLORS.PRIMARY}
                />
                <Text style={styles.mapPickSummary}>
                  Location set · {pickedLat.toFixed(5)}, {pickedLon.toFixed(5)}
                  {resolvingMapLocation ? ' · matching city…' : ''}
                </Text>
              </View>
            ) : null}
          </>
        ) : null}

        {publicPagePreviewSection}

        <View onLayout={(e) => recordSectionOffset('business', e.nativeEvent.layout.y)}>
        <ShopProfileAccordionSection
          title={t('partnerProfile.businessInformation')}
          expanded={!!expandedSections.business || !!expandedSections.basic}
          onToggle={() => toggleSection('business')}
          needsAttention={
            missingFields.includes('business name') || missingFields.includes('description')
          }
          status={sectionStatus('business').completed ? 'completed' : null}
        >
          <TextInput
            label={t('partnerProfile.publicBusinessName')}
            mode="outlined"
            value={profile.name || ''}
            onChangeText={(text) => setProfile((prev) => ({ ...prev, name: text }))}
            style={styles.input}
          />
          <TextInput
            label={t('partnerProfile.shortTagline')}
            mode="outlined"
            value={profile.short_description || ''}
            onChangeText={(text) => setProfile((prev) => ({ ...prev, short_description: text }))}
            style={styles.input}
          />
          <Text style={styles.helperText}>{t('partnerProfile.descriptionHelper')}</Text>
          <TextInput
            label={t('partnerProfile.description')}
            mode="outlined"
            multiline
            numberOfLines={5}
            value={profile.description || ''}
            onChangeText={(text) => setProfile((prev) => ({ ...prev, description: text }))}
            style={styles.input}
          />
          <Text style={styles.label}>{t('partnerProfile.businessType')}</Text>
          <Text style={styles.helperText}>{t('partnerProfile.businessTypeHelper')}</Text>
          <View style={styles.pickerWrap}>
            <Picker
              style={styles.picker}
              selectedValue={primaryCategoryId != null ? Number(primaryCategoryId) : ''}
              onValueChange={(value) => {
                const next = value === '' || value == null ? null : Number(value);
                setPrimaryCategoryId(next);
                setSecondaryCategoryIds((prev) =>
                  prev.filter((id) => Number(id) !== Number(next))
                );
              }}
            >
              <Picker.Item label={t('partnerProfile.businessTypeSelect')} value="" />
              {businessCategoryOptions.map((cat) => (
                <Picker.Item key={cat.id} label={categoryLabel(cat)} value={Number(cat.id)} />
              ))}
            </Picker>
          </View>
          {!businessCategoryOptions.length && (
            <Text style={styles.helperMuted}>
              {t('partnerProfile.businessTypeLoading')}
            </Text>
          )}
          {primaryPinDefinition && (
            <View style={styles.pinPreviewRow}>
              <MaterialCommunityIcons
                name={primaryPinDefinition.icon || 'map-marker'}
                size={22}
                color={primaryPinDefinition.color || COLORS.primary}
              />
              <Text style={styles.pinPreviewText}>
                {t('partnerProfile.mapPinPreview')}
              </Text>
            </View>
          )}

          {!!businessCategoryOptions.length && (
            <>
              <Text style={[styles.label, { marginTop: 12 }]}>
                {t('partnerProfile.secondaryBusinessTypes')}
              </Text>
              <Text style={styles.helperText}>
                {t('partnerProfile.secondaryBusinessTypesHelper')}
              </Text>
              <SearchableChipSelector
                items={secondaryCategoryChipItems}
                selectedIds={secondaryCategoryIds}
                onChangeSelectedIds={setSecondaryCategoryIds}
                searchPlaceholder={t('partnerProfile.searchBusinessTypes')}
                emptyHint={t('partnerProfile.noBusinessTypesMatch')}
              />

              <Text style={[styles.label, { marginTop: 12 }]}>
                {t('partnerProfile.servicesOffered')}
              </Text>
              <Text style={styles.helperText}>
                {t('partnerProfile.servicesOfferedHelper')}
              </Text>
              <SearchableChipSelector
                items={businessServiceChipItems}
                selectedIds={businessServiceIds}
                onChangeSelectedIds={setBusinessServiceIds}
                searchPlaceholder={t('partnerProfile.searchServices')}
                emptyHint={t('partnerProfile.noServicesMatch')}
              />
              {primaryCategoryId == null && (
                <Text style={styles.helperMuted}>
                  {t('partnerProfile.selectBusinessTypeFirst')}
                </Text>
              )}
            </>
          )}

          <Text style={[styles.label, { marginTop: 12 }]}>Vehicle types you service</Text>
          <Text style={styles.helperText}>
            Full-service centers can tap Select all. Required for map discovery.
          </Text>
          <SearchableChipSelector
            items={vehicleTypeChipItems}
            selectedIds={selectedVehicleTypes}
            onChangeSelectedIds={setSelectedVehicleTypes}
            searchPlaceholder="Search vehicle types…"
            emptyHint="No vehicle types match your search."
          />
          {!vehicleTypeOptions.length && (
            <Text style={styles.helperMuted}>Vehicle types are loading from backend taxonomy.</Text>
          )}
          <Text style={[styles.label, { marginTop: 12 }]}>Brands you service</Text>
          <Text style={styles.helperText}>
            General garages can choose All brands. Specialists can search and pick (e.g. Volvo, BMW).
          </Text>
          <SearchableChipSelector
            items={brandChipItems}
            selectedIds={selectedBrandIds}
            onChangeSelectedIds={setSelectedBrandIds}
            searchPlaceholder="Search brands…"
            emptyHint="No brands match your search."
            allMode={allBrandsServiced}
            allModeLabel="All brands"
            onToggleAllMode={setAllBrandsServiced}
            allModeHint="Clients can find you for any make — brakes, engine, paint, diagnostics, and more."
          />
        </ShopProfileAccordionSection>
        </View>

        <View onLayout={(e) => recordSectionOffset('contact_location', e.nativeEvent.layout.y)}>
        <ShopProfileAccordionSection
          title={t('partnerProfile.contactLocation')}
          expanded={
            !!expandedSections.contact_location ||
            !!expandedSections.contact ||
            !!expandedSections.location
          }
          onToggle={() => toggleSection('contact_location')}
          needsAttention={
            missingFields.includes('map pin') ||
            missingFields.includes('address') ||
            missingFields.includes('country') ||
            missingFields.includes('city') ||
            missingFields.includes('phone')
          }
          status={sectionStatus('contact_location').completed ? 'completed' : null}
        >
          <Text style={styles.helperText}>
            Phone helps customers reach you. Chat still works without a phone number.
          </Text>
          <TextInput
            label="Country prefix"
            mode="outlined"
            placeholder="+359"
            value={profile.phone_country_code || ''}
            onChangeText={(text) => setProfile((prev) => ({ ...prev, phone_country_code: text }))}
            style={styles.input}
            keyboardType="phone-pad"
            left={<TextInput.Icon icon="phone-outline" />}
          />
          <TextInput
            label="Phone number"
            mode="outlined"
            placeholder="888123456"
            value={profile.phone_national || ''}
            onChangeText={(text) => setProfile((prev) => ({ ...prev, phone_national: text }))}
            style={styles.input}
            keyboardType="phone-pad"
            left={<TextInput.Icon icon="phone-outline" />}
          />
          <Text style={styles.label}>Preferred contact methods</Text>
          <Text style={styles.helperMuted}>
            Select all that apply. Email-only is fine — customers can still reach you via in-app chat.
          </Text>
          <View style={styles.chipWrap}>
            {PREFERRED_CONTACT_OPTIONS.map((option) => {
              const selected = preferredContactMethods.includes(option.value);
              return (
                <Pressable
                  key={option.value}
                  onPress={() => toggleContactMethod(option.value)}
                  style={[styles.chip, selected && styles.chipSelected]}
                >
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <TextInput
            label="Email"
            mode="outlined"
            value={profile.email || ''}
            onChangeText={(text) => setProfile((prev) => ({ ...prev, email: text }))}
            style={styles.input}
            keyboardType="email-address"
            left={<TextInput.Icon icon="email-outline" />}
          />

          <Text style={[styles.label, { marginTop: 12 }]}>Location</Text>
          <Text style={styles.helperText}>
            Usually filled from the map pin. Adjust street, country, or city if needed.
          </Text>
          <TextInput
            label="Address"
            mode="outlined"
            value={profile.address || ''}
            onChangeText={(text) => setProfile((prev) => ({ ...prev, address: text }))}
            style={styles.input}
          />
          <TextInput
            label="Postal code"
            mode="outlined"
            value={profile.postal_code || ''}
            onChangeText={(text) => setProfile((prev) => ({ ...prev, postal_code: text }))}
            style={styles.input}
          />
          <Text style={styles.label}>Country</Text>
          <View style={styles.pickerWrap}>
            <Picker selectedValue={profile.country} onValueChange={handleCountryChange} style={styles.picker}>
              <Picker.Item label="Select country..." value={null} />
              {countries.map((c) => (
                <Picker.Item key={c.id} label={c.name} value={c.id} />
              ))}
            </Picker>
          </View>

          <Text style={styles.label}>City</Text>
          <View style={styles.pickerWrap}>
            <Picker
              selectedValue={profile.city}
              onValueChange={(val) => setProfile((prev) => ({ ...prev, city: val }))}
              style={styles.picker}
              enabled={!!profile.country}
            >
              <Picker.Item label={profile.country ? 'Select city...' : 'Choose country first'} value={null} />
              {cities.map((c) => (
                <Picker.Item key={c.id} label={c.name} value={c.id} />
              ))}
            </Picker>
          </View>

          <View style={styles.coordinatesRow}>
            <TextInput
              label="Latitude"
              mode="outlined"
              value={profile.latitude != null ? String(profile.latitude) : ''}
              onChangeText={(text) => setProfile((prev) => ({ ...prev, latitude: text }))}
              style={[styles.input, styles.coordinatesInput]}
              keyboardType="numeric"
            />
            <TextInput
              label="Longitude"
              mode="outlined"
              value={profile.longitude != null ? String(profile.longitude) : ''}
              onChangeText={(text) => setProfile((prev) => ({ ...prev, longitude: text }))}
              style={[styles.input, styles.coordinatesInput]}
              keyboardType="numeric"
            />
          </View>

          <Button icon="map-marker" mode="outlined" onPress={openMapPicker} style={styles.locateButton}>
            Adjust pin on map
          </Button>

          <TextInput
            label="Google Maps URL"
            mode="outlined"
            value={profile.google_maps_url || ''}
            onChangeText={(text) => setProfile((prev) => ({ ...prev, google_maps_url: text }))}
            style={styles.input}
          />
        </ShopProfileAccordionSection>
        </View>

        <View onLayout={(e) => recordSectionOffset('operations', e.nativeEvent.layout.y)}>
        <ShopProfileAccordionSection
          title={t('partnerProfile.operationsPricing')}
          expanded={!!expandedSections.operations || !!expandedSections.services}
          onToggle={() => toggleSection('operations')}
          needsAttention={
            missingFields.includes('operation') || missingFields.includes('operation price')
          }
          status={sectionStatus('operations').completed ? 'completed' : null}
        >
          <ShopOperationsPricingSection
            styles={styles}
            repairTypesByCategory={repairTypesByCategory}
            selectedServices={selectedServices}
            serviceMenuItems={serviceMenuItems}
            savingPricing={savingPricing}
            onToggleService={handleToggleOperationService}
            onUpsertOperationPricing={handleUpsertOperationPricing}
          />
        </ShopProfileAccordionSection>
        </View>

        <View onLayout={(e) => recordSectionOffset('photos', e.nativeEvent.layout.y)}>
        <ShopProfileAccordionSection
          title={t('partnerProfile.photos')}
          expanded={!!expandedSections.photos}
          onToggle={() => toggleSection('photos')}
          needsAttention={missingFields.includes('photos')}
          status={sectionStatus('photos').completed ? 'completed' : null}
        >
          <ShopPhotoGallery
            images={toSafeArray(profile.images)}
            onDelete={handleDeleteImage}
            onReorder={handleReorderImages}
            onAddPhoto={handlePickAndUploadImage}
            maxPhotos={MAX_SHOP_PHOTOS}
            uploading={saving}
          />
        </ShopProfileAccordionSection>
        </View>

        <View onLayout={(e) => recordSectionOffset('working_hours', e.nativeEvent.layout.y)}>
        <ShopProfileAccordionSection
          title={t('partnerProfile.workingHours')}
          expanded={!!expandedSections.working_hours}
          onToggle={() => toggleSection('working_hours')}
          needsAttention={missingFields.includes('working hours')}
          status={sectionStatus('working_hours').completed ? 'completed' : null}
        >
          <Text style={styles.helperText}>
            Tap a time field to set hours, or use the quick fill below. Save your profile to publish
            changes.
          </Text>
          <TextInput
            mode="outlined"
            dense
            label="Max vehicles per day (optional)"
            keyboardType="number-pad"
            value={
              profile?.daily_vehicle_capacity != null
                ? String(profile.daily_vehicle_capacity)
                : ''
            }
            onChangeText={(text) => {
              const trimmed = String(text || '').trim();
              setProfile((prev) => ({
                ...prev,
                daily_vehicle_capacity: trimmed ? parseInt(trimmed, 10) : null,
              }));
            }}
            placeholder="e.g. 4"
            style={styles.capacityInput}
          />
          <Text style={styles.helperText}>
            Used on your calendar and when sending offers — busy days show as full when bookings reach
            this limit.
          </Text>
          <Text style={styles.lunchLabel}>Lunch break (all open days)</Text>
          <Text style={styles.helperText}>
            Set when lunch starts and how long it lasts — visit slots skip this window on every open
            day. Keep one time block per day above (e.g. 09:00–18:00).
          </Text>
          <View style={styles.lunchChipRow}>
            {[0, 1, 2, 3].map((hours) => (
              <Chip
                key={hours}
                compact
                selected={lunchBreakHours === hours}
                onPress={() => setLunchBreakHours(hours)}
                style={styles.lunchChip}
              >
                {hours === 0 ? 'None' : `${hours}h`}
              </Chip>
            ))}
          </View>
          {lunchBreakHours > 0 ? (
            <TextInput
              mode="outlined"
              dense
              label="Lunch starts"
              placeholder="12:00"
              value={lunchStart}
              onChangeText={setLunchStart}
              style={styles.lunchStartInput}
            />
          ) : null}
          <Button
            mode="outlined"
            compact
            onPress={() => setHoursRows(applyDefaultWeekdayHours(hoursRows))}
            style={styles.weekdayHoursBtn}
          >
            Weekdays 09:00–18:00 (Sat–Sun closed)
          </Button>
          {hoursRows.map((row, idx) => (
            <View key={row.day} style={styles.hoursRow}>
              <Text style={styles.dayLabel}>{row.day}</Text>
              <View style={styles.hoursInputsWrap}>
                <TextInput
                  mode="outlined"
                  dense
                  placeholder="09:00"
                  value={row.start}
                  onChangeText={(text) =>
                    setHoursRows((prev) =>
                      prev.map((r, i) => (i === idx ? { ...r, start: text, closed: false } : r))
                    )
                  }
                  onFocus={() =>
                    setHoursRows((prev) =>
                      prev.map((r, i) =>
                        i === idx && r.closed
                          ? { ...r, closed: false, start: r.start || '09:00', end: r.end || '18:00' }
                          : r
                      )
                    )
                  }
                  style={styles.hourInput}
                />
                <Text style={styles.hoursSeparator}>-</Text>
                <TextInput
                  mode="outlined"
                  dense
                  placeholder="18:00"
                  value={row.end}
                  onChangeText={(text) =>
                    setHoursRows((prev) =>
                      prev.map((r, i) => (i === idx ? { ...r, end: text, closed: false } : r))
                    )
                  }
                  onFocus={() =>
                    setHoursRows((prev) =>
                      prev.map((r, i) =>
                        i === idx && r.closed
                          ? { ...r, closed: false, start: r.start || '09:00', end: r.end || '18:00' }
                          : r
                      )
                    )
                  }
                  style={styles.hourInput}
                />
                <Pressable
                  onPress={() =>
                    setHoursRows((prev) =>
                      prev.map((r, i) =>
                        i === idx
                          ? r.closed
                            ? { ...r, closed: false, start: r.start || '09:00', end: r.end || '18:00' }
                            : { ...r, closed: true, start: '', end: '' }
                          : r
                      )
                    )
                  }
                  style={[styles.closedToggle, row.closed && styles.closedToggleActive]}
                >
                  <Text style={[styles.closedToggleText, row.closed && styles.closedToggleTextActive]}>
                    {row.closed ? 'Closed' : 'Open'}
                  </Text>
                </Pressable>
              </View>
            </View>
          ))}
        </ShopProfileAccordionSection>
        </View>

        <View onLayout={(e) => recordSectionOffset('warranty', e.nativeEvent.layout.y)}>
        <ShopProfileAccordionSection
          title={t('partnerProfile.warranty')}
          expanded={!!expandedSections.warranty || !!expandedSections.guarantee}
          onToggle={() => toggleSection('warranty')}
          status="optional"
        >
          <Text style={styles.helperText}>
            Tell customers whether this service center can provide warranty for offers or completed work.
          </Text>
          <View style={styles.guaranteeToggleRow}>
            <Pressable
              onPress={() => setProfile((prev) => ({ ...prev, offers_guarantee: true }))}
              style={[
                styles.guaranteePill,
                profile.offers_guarantee === true && styles.guaranteePillSelected,
              ]}
            >
              <Text
                style={[
                  styles.guaranteePillText,
                  profile.offers_guarantee === true && styles.guaranteePillTextSelected,
                ]}
              >
                Offers warranty
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setProfile((prev) => ({ ...prev, offers_guarantee: false }))}
              style={[
                styles.guaranteePill,
                profile.offers_guarantee !== true && styles.guaranteePillSelected,
              ]}
            >
              <Text
                style={[
                  styles.guaranteePillText,
                  profile.offers_guarantee !== true && styles.guaranteePillTextSelected,
                ]}
              >
                No warranty
              </Text>
            </Pressable>
          </View>
          <Text style={styles.helperMuted}>Optional — you can update this later.</Text>
        </ShopProfileAccordionSection>
        </View>

        <View onLayout={(e) => recordSectionOffset('company', e.nativeEvent.layout.y)}>
        <ShopProfileAccordionSection
          title={t('partnerProfile.companyLegal')}
          expanded={!!expandedSections.company || !!expandedSections.invoice}
          onToggle={() => toggleSection('company')}
          subtitle="Separate from your public profile — used on invoices"
        >
          <ShopInvoiceSettingsSection
            styles={styles}
            profile={profile}
            setProfile={setProfile}
            countries={countries}
            cityLabel={cityLabel}
            legalEntity={legalEntity}
            setLegalEntity={setLegalEntity}
            legalEntityOptions={legalEntityOptions}
            onFillBranchFromPublic={fillInvoiceFromPublicProfile}
            onUploadLogo={handlePickAndUploadInvoiceLogo}
            onRemoveLogo={handleRemoveInvoiceLogo}
            uploadingLogo={uploadingInvoiceLogo}
            companyOnly
          />
        </ShopProfileAccordionSection>
        </View>

        <View onLayout={(e) => recordSectionOffset('warehouse', e.nativeEvent.layout.y)}>
        <ShopProfileAccordionSection
          title={t('partnerProfile.warehouseStock')}
          expanded={!!expandedSections.warehouse}
          onToggle={() => toggleSection('warehouse')}
          status="optional"
        >
          <Text style={styles.helperText}>
            When enabled, completing supplier documents updates on-hand quantities. You can still import
            invoices and build your parts catalog when this is off.
          </Text>
          <View style={styles.switchRow}>
            <View style={styles.switchTextWrap}>
              <Text style={styles.switchLabel}>Stock tracking</Text>
              <Text style={styles.helperText}>
                Receive goods, track inventory, and see stock movements per part.
              </Text>
            </View>
            <Switch
              value={Boolean(profile?.warehouse_enabled)}
              onValueChange={(value) =>
                setProfile((prev) => ({ ...prev, warehouse_enabled: value }))
              }
            />
          </View>
        </ShopProfileAccordionSection>
        </View>

        <View onLayout={(e) => recordSectionOffset('notifications', e.nativeEvent.layout.y)}>
        <ShopProfileAccordionSection
          title={t('partnerProfile.notificationSettings', null, null) !== 'partnerProfile.notificationSettings'
            ? t('partnerProfile.notificationSettings')
            : 'Notification settings'}
          expanded={!!expandedSections.notifications}
          onToggle={() => toggleSection('notifications')}
          status="optional"
        >
          <ShopNotificationSettingsSection />
        </ShopProfileAccordionSection>
        </View>

        <View onLayout={(e) => recordSectionOffset('online_presence', e.nativeEvent.layout.y)}>
        <ShopProfileAccordionSection
          title={t('partnerProfile.onlinePresence')}
          expanded={!!expandedSections.online_presence || !!expandedSections.social}
          onToggle={() => toggleSection('online_presence')}
          status="optional"
        >
          <ShopOnlinePresenceSection
            styles={styles}
            profile={profile}
            setProfile={setProfile}
          />
        </ShopProfileAccordionSection>
        </View>

      </ScrollView>

      <Portal>
        <Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)}>
          <Dialog.Title>{t('common.notice')}</Dialog.Title>
          <Dialog.Content>
            <Text>{dialogMessage}</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDialogVisible(false)}>{t('common.ok')}</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {isDirty || saving ? (
        <FloatingSaveBar
          onPress={handleSave}
          loading={saving}
          label={
            requireSetup
              ? t('partnerProfile.saveAndContinue')
              : t('partnerProfile.saveCenterDetails')
          }
        />
      ) : null}
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
  },
  loadingCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  setupBannerInner: {
    gap: 6,
    paddingVertical: 14,
  },
  setupBannerTitle: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 6,
  },
  setupBannerText: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 14,
    lineHeight: 20,
  },
  mapCtaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(37,99,235,0.22)',
  },
  mapCtaCardPressed: {
    opacity: 0.92,
  },
  mapCtaCardAttention: {
    borderColor: '#f59e0b',
    backgroundColor: '#fffbeb',
  },
  mapCtaIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapCtaTextWrap: {
    flex: 1,
  },
  mapCtaTitle: {
    color: COLORS.TEXT_DARK,
    fontWeight: '800',
    fontSize: 16,
  },
  mapCtaBody: {
    color: COLORS.TEXT_MUTED,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
  },
  mapSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  mapPickSummary: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  setupSaveButton: {
    marginTop: 8,
    borderRadius: 12,
    alignSelf: 'stretch',
  },
  setupSaveButtonContent: {
    height: 48,
  },
  heroCardInner: {
    paddingVertical: 18,
  },
  heroTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '800',
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 15,
    marginTop: 4,
    fontWeight: '600',
  },
  heroDescription: {
    color: 'rgba(255,255,255,0.92)',
    marginTop: 10,
    lineHeight: 20,
  },
  sectionTitle: {
    color: COLORS.TEXT_DARK,
    fontWeight: '700',
    fontSize: 17,
    marginBottom: 10,
  },
  input: {
    marginBottom: 12,
    backgroundColor: 'rgba(255,255,255,0.96)',
  },
  helperText: {
    color: COLORS.TEXT_MUTED,
    fontSize: 13,
    marginBottom: 10,
  },
  lunchLabel: {
    color: COLORS.TEXT_DARK,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
    marginTop: 4,
  },
  lunchChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  lunchChip: {
    backgroundColor: 'rgba(255,255,255,0.96)',
  },
  lunchStartInput: {
    marginBottom: 12,
    maxWidth: 160,
    backgroundColor: 'rgba(255,255,255,0.96)',
  },
  helperMuted: {
    color: COLORS.TEXT_MUTED,
    fontSize: 13,
    marginTop: 2,
  },
  label: {
    marginBottom: 6,
    color: COLORS.TEXT_DARK,
    fontWeight: '600',
  },
  pickerWrap: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.12)',
  },
  picker: {
    backgroundColor: 'rgba(255,255,255,0.96)',
  },
  pinPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  pinPreviewText: {
    color: COLORS.TEXT_MUTED,
    fontSize: 13,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    borderColor: 'rgba(37,99,235,0.26)',
    backgroundColor: 'rgba(37,99,235,0.08)',
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 4,
  },
  chipSelected: {
    backgroundColor: COLORS.PRIMARY,
    borderColor: COLORS.PRIMARY,
  },
  chipText: {
    fontSize: 13,
    color: '#1e3a8a',
    fontWeight: '600',
  },
  chipTextSelected: {
    color: '#fff',
  },
  serviceChipInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  weekdayHoursBtn: {
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  categoryBlock: {
    marginBottom: 10,
  },
  categoryTitle: {
    fontSize: 14,
    color: COLORS.TEXT_DARK,
    fontWeight: '700',
    marginBottom: 8,
  },
  coordinatesRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  coordinatesInput: {
    flex: 1,
    minWidth: Platform.OS === 'web' ? 220 : 150,
  },
  locateButton: {
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  hoursRow: {
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(15,23,42,0.12)',
  },
  dayLabel: {
    color: COLORS.TEXT_DARK,
    fontWeight: '700',
    marginBottom: 8,
  },
  hoursInputsWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  hourInput: {
    width: 100,
    backgroundColor: '#fff',
  },
  capacityInput: {
    marginBottom: 8,
    backgroundColor: '#fff',
  },
  hoursSeparator: {
    color: COLORS.TEXT_DARK,
    fontWeight: '700',
  },
  closedToggle: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(100,116,139,0.35)',
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: 'rgba(241,245,249,0.8)',
  },
  closedToggleActive: {
    backgroundColor: 'rgba(100,116,139,0.18)',
    borderColor: 'rgba(100,116,139,0.6)',
  },
  closedToggleText: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '700',
  },
  closedToggleTextActive: {
    color: '#475569',
  },
  generatedPreviewBox: {
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  generatedPreviewText: {
    color: '#1f2937',
    fontSize: 14,
    lineHeight: 21,
  },
  smallDivider: {
    marginVertical: 6,
    backgroundColor: 'rgba(15,23,42,0.1)',
  },
  guaranteeToggleRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
    flexWrap: 'wrap',
  },
  guaranteePill: {
    borderWidth: 1,
    borderColor: 'rgba(37,99,235,0.25)',
    backgroundColor: 'rgba(37,99,235,0.08)',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  guaranteePillSelected: {
    backgroundColor: COLORS.PRIMARY,
    borderColor: COLORS.PRIMARY,
  },
  guaranteePillText: {
    color: '#1e3a8a',
    fontSize: 13,
    fontWeight: '700',
  },
  guaranteePillTextSelected: {
    color: '#fff',
  },
  photoScroller: {
    marginBottom: 10,
  },
  photoItem: {
    marginRight: 10,
    position: 'relative',
  },
  photo: {
    width: 140,
    height: 100,
    borderRadius: 12,
  },
  deleteBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(220,38,38,0.85)',
    borderRadius: 999,
    paddingVertical: 2,
    paddingHorizontal: 7,
  },
  deleteText: {
    color: '#fff',
    fontWeight: '800',
  },
  uploadButton: {
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  invoiceCopyBtn: {
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  vatRateReadonlyBox: {
    marginTop: 4,
    marginBottom: 8,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(15,23,42,0.12)',
    gap: 4,
  },
  vatRateReadonlyLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  vatRateReadonlyValue: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.TEXT_DARK,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 8,
    marginBottom: 8,
  },
  switchCopy: {
    flex: 1,
  },
  switchLabel: {
    color: COLORS.TEXT_DARK,
    fontWeight: '700',
    fontSize: 14,
  },
  invoiceLogoTitle: {
    marginTop: 8,
    fontWeight: '700',
    fontSize: 15,
    color: COLORS.TEXT_DARK,
  },
  invoiceLogoPreviewWrap: {
    marginTop: 8,
    marginBottom: 8,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(15,23,42,0.12)',
    alignItems: 'flex-start',
  },
  invoiceLogoPreview: {
    width: 220,
    height: 64,
  },
  invoiceLogoPlaceholder: {
    marginTop: 8,
    marginBottom: 8,
    padding: 16,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(15,23,42,0.12)',
    alignItems: 'center',
    gap: 6,
  },
  invoiceLogoActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  savingWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    gap: 10,
  },
  savingText: {
    color: '#fff',
    fontWeight: '600',
  },
});
