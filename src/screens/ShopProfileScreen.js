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
import FloatingSaveBar from '../components/ui/FloatingSaveBar';
import SearchableChipSelector from '../components/ui/SearchableChipSelector';
import { vehicleTypeEmoji } from '../utils/vehicleTypeIcons';

import AppCard from '../components/ui/AppCard';
import EmptyStateCard from '../components/ui/EmptyStateCard';
import { COLORS } from '../constants/colors';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { stackContentPaddingTop } from '../navigation/stackContentInset';
import { AuthContext } from '../context/AuthManager';
import { logout } from '../api/auth';
import {
  getShopProfileIncompleteFields,
  getShopProfileCompletionPercent,
  getShopProfileStrengthHints,
  hasShopMapPin,
  isShopProfileEssentialsComplete,
} from '../utils/shopProfileCompleteness';
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
import ShopPublicPagePreview from '../components/shop/ShopPublicPagePreview';
import ShopPhotoGallery from '../components/shop/ShopPhotoGallery';
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
import { getServiceMenu } from '../api/serviceMenu';
import { resolveRepairTypeIcon } from '../utils/repairTypeIcons';
import ShopInvoiceSettingsSection from '../components/shop/ShopInvoiceSettingsSection';
import { pickVehiclePhotoAttachment, pickInvoiceLogoAttachment } from '../utils/pickDocumentFile';
import { emptyLegalEntityDraft } from '../utils/invoiceTaxLabels';
import { attachLunchBreak, parseLunchBreak } from '../utils/shopWorkingHours';

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
  const insets = useSafeAreaInsets();
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
  const [selectedBrandIds, setSelectedBrandIds] = useState([]);
  const [allBrandsServiced, setAllBrandsServiced] = useState(false);
  const [hoursRows, setHoursRows] = useState(DEFAULT_HOURS);
  const [lunchBreakHours, setLunchBreakHours] = useState(0);
  const [lunchStart, setLunchStart] = useState('12:00');
  const [publishedMenuItems, setPublishedMenuItems] = useState([]);
  const [preferredContactMethods, setPreferredContactMethods] = useState(['chat']);
  const [expandedSections, setExpandedSections] = useState({});
  const [resolvingMapLocation, setResolvingMapLocation] = useState(false);
  const [uploadingInvoiceLogo, setUploadingInvoiceLogo] = useState(false);
  const [legalEntity, setLegalEntity] = useState(null);
  const [legalEntityOptions, setLegalEntityOptions] = useState([]);
  const sectionsInitialized = useRef(false);
  const mapPickHandledRef = useRef(null);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const profileForCompleteness = useMemo(() => {
    if (!profile) return null;
    return { ...profile, supported_vehicle_types: selectedVehicleTypes };
  }, [profile, selectedVehicleTypes]);

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
      publishedMenuItems,
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
    setExpandedSections((prev) => ({ ...prev, [key]: true }));
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

  useLayoutEffect(() => {
    navigation.setOptions({
      title: requireSetup ? 'Complete center details' : 'Center details',
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
      const [shopProfiles, countryList, makes] = await Promise.all([
        getMyShopProfiles(),
        getCountries(),
        token ? getMakes().catch(() => []) : Promise.resolve([]),
      ]);

      setCountries(countryList);
      if (!countryList?.length) {
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
        setProfile(p);
        setLegalEntity(
          p.legal_entity_detail
            ? { ...p.legal_entity_detail }
            : emptyLegalEntityDraft(p)
        );
        setSelectedServices(sanitizeArray(p.available_repairs));
        setSelectedVehicleTypes(sanitizeArray(p.supported_vehicle_types));
        setSelectedBrandIds(sanitizeArray(p.brands));
        setAllBrandsServiced(!!p.all_brands_serviced);
        setHoursRows(
          p.working_hours != null && p.working_hours !== ''
            ? parseWorkingHours(p.working_hours)
            : DEFAULT_HOURS
        );
        const lunch = parseLunchBreak(p.working_hours);
        setLunchBreakHours(lunch.hours);
        setLunchStart(lunch.start);
        setPreferredContactMethods(parsePreferredContactMethods(p));

        if (p.country) {
          const cityList = await getCitiesForCountry(p.country);
          setCities(cityList);
        }

        if (token && p.id) {
          try {
            const [menuRows, entities] = await Promise.all([
              getServiceMenu(token, String(p.id)),
              getLegalEntities(token).catch(() => []),
            ]);
            setPublishedMenuItems(
              (Array.isArray(menuRows) ? menuRows : []).filter((row) => row.is_published)
            );
            setLegalEntityOptions(Array.isArray(entities) ? entities : []);
          } catch {
            setPublishedMenuItems([]);
            setLegalEntityOptions([]);
          }
        }
      }
    } catch (err) {
      console.error(err);
      setDialogMessage('Error loading profile data');
      setDialogVisible(true);
    } finally {
      setLoading(false);
    }
  };

  const handleCountryChange = async (value) => {
    const countryRow = countries.find((c) => Number(c.id) === Number(value));
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
        setCities(cityList);
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
    const missing = getShopProfileIncompleteFields(draftProfile);
    if (missing.length) {
      setDialogMessage(`Please add ${missing.join(', ')} before continuing.`);
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
        menuForSummary = (Array.isArray(menuRows) ? menuRows : []).filter((row) => row.is_published);
      }
    } catch {
      menuForSummary = publishedMenuItems;
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
      setProfile({
        ...updated,
        generated_public_summary: generated.summary,
        working_hours: workingHoursPayload,
      });
      if (updated.legal_entity_detail) {
        setLegalEntity({ ...updated.legal_entity_detail });
      }
      setPublishedMenuItems(menuForSummary);
      setHoursRows(parseWorkingHours(workingHoursPayload));
      if (requireSetup || !isShopProfileEssentialsComplete(updated)) {
        if (isShopProfileEssentialsComplete(updated)) {
          navigation.reset({ index: 0, routes: [{ name: 'ShopHome' }] });
        } else {
          setDialogMessage('Profile saved. Please finish the required fields to start serving jobs.');
          setDialogVisible(true);
        }
        return;
      }
      setDialogMessage('Profile updated successfully!');
      setDialogVisible(true);
    } catch (err) {
      console.error(err);
      let message = 'Error saving profile';
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
          <Text style={{ color: '#fff' }}>No service center profile found.</Text>
        </View>
      </ScreenBackground>
    );
  }

  const previewVehicleNames = vehicleTypeOptions
    .filter((v) => selectedVehicleTypes.includes(Number(v.id)))
    .map((v) => v.name);
  const previewRepairNames = repairTypeOptions
    .filter((r) => selectedServices.includes(Number(r.id)))
    .map((r) => r.name);
  const previewBrandNames = allBrandsServiced
    ? ['All brands']
    : makeOptions.filter((m) => selectedBrandIds.includes(Number(m.id))).map((m) => m.name);
  const previewPhone =
    String(profile.phone_e164 || '').trim() ||
    [profile.phone_country_code, profile.phone_national].filter(Boolean).join(' ').trim() ||
    String(profile.phone || '').trim();
  const missingFields = getShopProfileIncompleteFields(profileForCompleteness);
  const isEssentialsComplete = missingFields.length === 0;
  const completionPercent = getShopProfileCompletionPercent(profileForCompleteness, {
    servicesCount: selectedServices.length,
    hasPhotos: toSafeArray(profile?.images).length > 0,
    hasDescription: !!String(profile?.description || '').trim(),
  });
  const strengthHints = getShopProfileStrengthHints(profile, {
    servicesCount: selectedServices.length,
    hasPhotos: toSafeArray(profile?.images).length > 0,
  });
  const showSetupBanner = (requireSetup || !isEssentialsComplete) && !isEssentialsComplete;
  const mapPinSet = hasShopMapPin(profile);
  const pickedLat = parseOptionalCoordinate(profile.latitude);
  const pickedLon = parseOptionalCoordinate(profile.longitude);

  const publicPagePreviewSection = (
    <ShopProfileAccordionSection
      title="Public page preview"
      expanded={!!expandedSections.public_preview}
      onToggle={() => toggleSection('public_preview')}
    >
      <Text style={styles.helperText}>
        {isEssentialsComplete
          ? 'How clients see your shop on the map and in search.'
          : 'Live preview — finish required fields above to go live.'}
      </Text>
      <ShopPublicPagePreview
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
        workingHours={buildWorkingHoursPayload(hoursRows, lunchBreakHours, lunchStart)}
        publishedMenuItems={publishedMenuItems}
        offersGuarantee={profile.offers_guarantee === true}
        images={profile.images}
        brandNames={previewBrandNames}
      />
    </ShopProfileAccordionSection>
  );

  return (
    <ScreenBackground safeArea={false}>
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingTop: stackContentPaddingTop(insets, 8), paddingBottom: insets.bottom + 96 },
        ]}
      >
        <ShopProfileCompletionCard
          percent={completionPercent}
          strengthHints={strengthHints}
        />

        {!isEssentialsComplete ? <ShopProfileMissingAlert fields={missingFields} /> : null}

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
                missingFields.includes('map pin') && styles.mapCtaCardAttention,
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
                  color={missingFields.includes('map pin') ? '#fbbf24' : COLORS.PRIMARY}
                />
                <Text style={styles.mapPickSummary}>
                  Location set · {pickedLat.toFixed(5)}, {pickedLon.toFixed(5)}
                  {resolvingMapLocation ? ' · matching city…' : ''}
                </Text>
              </View>
            ) : null}
          </>
        ) : null}

        {isEssentialsComplete ? publicPagePreviewSection : null}

        <ShopProfileAccordionSection
          title="Shop name"
          expanded={!!expandedSections.basic}
          onToggle={() => toggleSection('basic')}
          needsAttention={missingFields.includes('shop name')}
        >
          <TextInput
            label="Service center name"
            mode="outlined"
            value={profile.name || ''}
            onChangeText={(text) => setProfile((prev) => ({ ...prev, name: text }))}
            style={styles.input}
          />
        </ShopProfileAccordionSection>

        <ShopProfileAccordionSection
          title="Vehicle types you service"
          expanded={!!expandedSections.vehicle_types}
          onToggle={() => toggleSection('vehicle_types')}
          needsAttention={missingFields.includes('vehicle type')}
        >
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
        </ShopProfileAccordionSection>

        <ShopProfileAccordionSection
          title="Brands you service"
          expanded={!!expandedSections.brands}
          onToggle={() => toggleSection('brands')}
        >
          <Text style={styles.helperText}>
            General garages can choose All brands. Specialists can search and pick (e.g. Volvo, BMW).
            Motorcycle / e-bike catalog brands (KTM, Yamaha, etc.) will expand in a future update.
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
          {!makeOptions.length && !allBrandsServiced && (
            <Text style={styles.helperMuted}>Brand list is loading from the vehicle catalog.</Text>
          )}
        </ShopProfileAccordionSection>

        <ShopProfileAccordionSection
          title="Repair services you offer"
          expanded={!!expandedSections.services}
          onToggle={() => toggleSection('services')}
        >
          <Text style={styles.helperText}>
            Select all repair types you do — e.g. body repair and engine repair together.
          </Text>
          {repairTypesByCategory.map(([category, rows]) => (
            <View key={category} style={styles.categoryBlock}>
              <Text style={styles.categoryTitle}>{category}</Text>
              <View style={styles.chipWrap}>
                {rows.map((row) => {
                  const selected = selectedServices.includes(Number(row.id));
                  return (
                    <Pressable
                      key={row.id}
                      onPress={() => toggleId(row.id, setSelectedServices)}
                      style={[styles.chip, selected && styles.chipSelected]}
                    >
                      <View style={styles.serviceChipInner}>
                        <MaterialCommunityIcons
                          name={resolveRepairTypeIcon(row)}
                          size={16}
                          color={selected ? COLORS.PRIMARY : COLORS.TEXT_MUTED}
                        />
                        <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                          {row.name}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}
          {!repairTypesByCategory.length && (
            <Text style={styles.helperMuted}>Services are loading from backend taxonomy.</Text>
          )}
        </ShopProfileAccordionSection>

        <ShopProfileAccordionSection
          title="Contact"
          expanded={!!expandedSections.contact}
          onToggle={() => toggleSection('contact')}
        >
          <Text style={styles.helperText}>
            Phone is optional — add it if you want customers to call. Chat works without a phone
            number.
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
            label="Phone number (optional)"
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
          <TextInput
            label="Website"
            mode="outlined"
            value={profile.website || ''}
            onChangeText={(text) => setProfile((prev) => ({ ...prev, website: text }))}
            style={styles.input}
            left={<TextInput.Icon icon="web" />}
          />
        </ShopProfileAccordionSection>

        <ShopProfileAccordionSection
          title="Location details"
          expanded={!!expandedSections.location}
          onToggle={() => toggleSection('location')}
          needsAttention={
            missingFields.includes('map pin') ||
            missingFields.includes('address') ||
            missingFields.includes('country') ||
            missingFields.includes('city')
          }
        >
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
          <Text style={styles.helperMuted}>Usually filled from the map pin together with the address.</Text>
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

        <ShopProfileAccordionSection
          title="Working hours"
          expanded={!!expandedSections.working_hours}
          onToggle={() => toggleSection('working_hours')}
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

        <ShopProfileAccordionSection
          title="Warehouse & stock"
          expanded={!!expandedSections.warehouse}
          onToggle={() => toggleSection('warehouse')}
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

        <ShopProfileAccordionSection
          title="Social links"
          expanded={!!expandedSections.social}
          onToggle={() => toggleSection('social')}
        >
          <TextInput
            label="YouTube"
            mode="outlined"
            value={profile.youtube_url || ''}
            onChangeText={(text) => setProfile((prev) => ({ ...prev, youtube_url: text }))}
            style={styles.input}
            left={<TextInput.Icon icon="youtube" />}
          />
          <TextInput
            label="Facebook"
            mode="outlined"
            value={profile.facebook_url || ''}
            onChangeText={(text) => setProfile((prev) => ({ ...prev, facebook_url: text }))}
            style={styles.input}
            left={<TextInput.Icon icon="facebook" />}
          />
          <TextInput
            label="Instagram"
            mode="outlined"
            value={profile.instagram_url || ''}
            onChangeText={(text) => setProfile((prev) => ({ ...prev, instagram_url: text }))}
            style={styles.input}
            left={<TextInput.Icon icon="instagram" />}
          />
        </ShopProfileAccordionSection>

        <ShopProfileAccordionSection
          title="Your description"
          expanded={!!expandedSections.description}
          onToggle={() => toggleSection('description')}
        >
          <Text style={styles.helperText}>
            Write a short introduction in your language. Clients will see a translated version later.
          </Text>
          <TextInput
            label="About your shop"
            mode="outlined"
            multiline
            numberOfLines={5}
            value={profile.description || ''}
            onChangeText={(text) => setProfile((prev) => ({ ...prev, description: text }))}
            style={styles.input}
          />
        </ShopProfileAccordionSection>

        {!isEssentialsComplete ? publicPagePreviewSection : null}

        <ShopProfileAccordionSection
          title="Guarantee"
          expanded={!!expandedSections.guarantee}
          onToggle={() => toggleSection('guarantee')}
        >
          <Text style={styles.helperText}>
            Tell customers whether this service center can provide guarantee for offers or completed work.
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
                Offers guarantee
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
                No guarantee
              </Text>
            </Pressable>
          </View>
          <Text style={styles.helperMuted}>You can update this later.</Text>
        </ShopProfileAccordionSection>

        <ShopProfileAccordionSection
          title="Invoice settings"
          expanded={!!expandedSections.invoice}
          onToggle={() => toggleSection('invoice')}
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
          />
        </ShopProfileAccordionSection>

        <ShopProfileAccordionSection
          title="Photos"
          expanded={!!expandedSections.photos}
          onToggle={() => toggleSection('photos')}
        >
          <Text style={styles.helperText}>
            Show your workspace, tools, and real service moments (up to {MAX_SHOP_PHOTOS} photos).
          </Text>
          {toSafeArray(profile.images).length > 0 ? (
            <ShopPhotoGallery
              images={profile.images}
              onDelete={handleDeleteImage}
              maxPhotos={MAX_SHOP_PHOTOS}
            />
          ) : (
            <EmptyStateCard
              icon="image-outline"
              title="No photos uploaded"
              subtitle="Add photos to build trust and improve profile quality."
            />
          )}

          <Button
            mode="contained"
            icon="plus"
            onPress={handlePickAndUploadImage}
            style={styles.uploadButton}
            disabled={toSafeArray(profile.images).length >= MAX_SHOP_PHOTOS}
          >
            Add photo
          </Button>
        </ShopProfileAccordionSection>

      </ScrollView>

      <FloatingSaveBar
        onPress={handleSave}
        loading={saving}
        disabled={saving}
        label={requireSetup ? 'Save and continue' : 'Save center details'}
      />

      <Portal>
        <Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)}>
          <Dialog.Title>Notice</Dialog.Title>
          <Dialog.Content>
            <Text>{dialogMessage}</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDialogVisible(false)}>OK</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
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
