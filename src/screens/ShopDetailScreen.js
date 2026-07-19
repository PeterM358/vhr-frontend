import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Alert,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Platform,
  Pressable,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import { formatDayHoursWithLunch, parseLunchBreak } from '../utils/shopWorkingHours';
import { getVehicles } from '../api/vehicles';
import { getShopById, deleteShopImage } from '../api/shops';
import { applySeoPageMeta } from '../utils/seo/seoMetadata';
import { loadShopDetailWithOptionalSeo, syncShopDetailWebUrl } from '../api/seo';

import { Text, Button, ActivityIndicator, useTheme, Chip, Divider } from 'react-native-paper';
import ScreenBackground from '../components/ScreenBackground';
import AppNavigationBar from '../components/common/AppNavigationBar';
import { useScrollShadow } from '../hooks/useScrollShadow';
import AppCard from '../components/ui/AppCard';
import FloatingCard from '../components/ui/FloatingCard';
import EmptyStateCard from '../components/ui/EmptyStateCard';
import StatusBadge from '../components/ui/StatusBadge';
import { COLORS } from '../constants/colors';
import { formatAuthorizeConfirmMessage, formatRevokeConfirmMessage } from '../utils/shopDataAccess';
import {
  authorizeVehicleForShop,
  formatVehicleAuthorizeLabel,
  isShopAuthorizedForVehicle,
  resolveAuthorizeVehicleId,
  resolveShopIdForAuthorization,
} from '../utils/vehicleShopAuthorization';
import { confirmMessage, showMessage } from '../utils/crossPlatformAlert';
import { formatShopDisplayName } from '../utils/shopDisplayName';
import { navigateToServiceCenters } from '../navigation/webNavigation';
import { formatMoneyAmount } from '../constants/currency';
import { getOperationIcon } from '../icons/operationIconRegistry';
import { formatTypicalLaborTime } from '../utils/laborDuration';
import { useTranslation } from '../i18n';
import { joinList } from '../i18n/joinLocalizedList';
import {
  translateRepairTypeLabel,
  translateRepairTypeLabels,
  translateVehicleTypePublicLabels,
} from '../utils/translateShopTypeLabels';
import { openShopInMaps, resolveShopMapsUrl } from '../utils/shopMapsLink';
import ShopQuickRequestSheet from '../components/shop/ShopQuickRequestSheet';

const WEEKDAYS_MON_FIRST = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const DAY_ALIAS = {
  monday: 0,
  mon: 0,
  mo: 0,
  tuesday: 1,
  tue: 1,
  tu: 1,
  wednesday: 2,
  wed: 2,
  we: 2,
  thursday: 3,
  thu: 3,
  th: 3,
  friday: 4,
  fri: 4,
  fr: 4,
  saturday: 5,
  sat: 5,
  sa: 5,
  sunday: 6,
  sun: 6,
  su: 6,
};

function presentationServiceCenterType(value) {
  if (value == null || String(value).trim() === '') return null;
  const s = String(value).trim().replace(/\s+/g, ' ');
  if (/[_\-]/.test(s)) {
    return s
      .split(/[_\-]+/)
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
  }
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function normalizeUrl(url) {
  if (!url || typeof url !== 'string') return null;
  const t = url.trim();
  if (!t) return null;
  return /^https?:\/\//i.test(t) ? t : `https://${t}`;
}


/** Python weekday convention: Monday = 0 … Sunday = 6 (when keys are numeric). */
function workingHoursEntries(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return [];

  const lunch = parseLunchBreak(raw);
  const keyed = [];

  const pushParsed = (dayIndex, hoursValue) => {
    if (
      typeof dayIndex !== 'number' ||
      dayIndex < 0 ||
      dayIndex > 6 ||
      WEEKDAYS_MON_FIRST[dayIndex] == null
    ) {
      return;
    }
    keyed.push({
      order: dayIndex,
      label: WEEKDAYS_MON_FIRST[dayIndex],
      text: formatDayHoursWithLunch(hoursValue, lunch),
    });
  };

  for (const [key, hoursValue] of Object.entries(raw)) {
    if (String(key).trim().toLowerCase() === 'lunch_break') continue;
    let dayIndex = null;
    const k = String(key).trim().toLowerCase();
    if (DAY_ALIAS[k] !== undefined) {
      dayIndex = DAY_ALIAS[k];
    } else {
      const numeric = /^(\d+)$/.exec(k);
      if (numeric) dayIndex = parseInt(numeric[1], 10);
    }

    if (dayIndex !== null && dayIndex >= 0 && dayIndex <= 6) {
      pushParsed(dayIndex, hoursValue);
      continue;
    }

    const m = /^weekday[_-]?(\d+)$/i.exec(k);
    if (m) pushParsed(parseInt(m[1], 10), hoursValue);
  }

  keyed.sort((a, b) => a.order - b.order);
  return keyed;
}

function collectRepairNames(shop) {
  const fromApi = shop?.available_repair_names;
  if (Array.isArray(fromApi) && fromApi.length) {
    return fromApi.map(String).filter((s) => s.trim()).sort((a, b) => a.localeCompare(b));
  }
  const rel = shop?.available_repairs;
  if (!Array.isArray(rel)) return [];
  return rel
    .map((r) => (typeof r === 'object' && r?.name ? r.name : ''))
    .filter(Boolean)
    .sort((a, b) => String(a).localeCompare(String(b)));
}

function collectVehicleTypeNames(shop) {
  const fromApi = shop?.supported_vehicle_type_names;
  if (Array.isArray(fromApi) && fromApi.length) {
    return fromApi.map(String).filter((s) => s.trim()).sort((a, b) => a.localeCompare(b));
  }
  const rel = shop?.supported_vehicle_types;
  if (!Array.isArray(rel)) return [];
  return rel
    .map((vt) => (typeof vt === 'object' && vt?.name ? vt.name : ''))
    .filter(Boolean)
    .sort((a, b) => String(a).localeCompare(String(b)));
}

function formatRatingSnippet(avg, count, t) {
  if (avg == null || avg === '') return null;
  const n = Number(avg);
  if (Number.isNaN(n)) return null;
  const star = `${n.toFixed(1)}`;
  const rc = Number(count);
  if (Number.isFinite(rc) && rc > 0) {
    return t('serviceCenters.profile.reviews', { rating: star, count: rc });
  }
  return `${star}`;
}

function isNumericCenterSegment(value) {
  return /^\d+$/.test(String(value || '').trim());
}

export default function ShopDetailScreen({ route, navigation }) {
  const { shopId, locale: routeLocale, citySlug, centerSlug } = route.params || {};
  const numericCenterSlug = centerSlug && isNumericCenterSegment(centerSlug);
  const resolvedShopId =
    shopId != null ? shopId : numericCenterSlug ? parseInt(String(centerSlug).trim(), 10) : null;
  const resolvedCenterSlug = numericCenterSlug ? undefined : centerSlug;
  const { t, locale } = useTranslation();
  const genericServiceCenter = t('public.serviceCenter');
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { scrolled, onScroll, scrollEventThrottle } = useScrollShadow();
  const { returnTo, publicPreview, backLabel: backLabelParam, backLabelKey } = route.params || {};
  const canGoBack = Boolean(navigation.canGoBack?.());
  const handleBack = useCallback(() => {
    // Prefer native stack history whenever it exists (Profile → public preview,
    // discovery → detail, client flows). Only cold-open / deep-link falls back to Map.
    if (navigation.canGoBack?.()) {
      navigation.goBack();
      return;
    }
    if (returnTo === 'ShopProfile') {
      navigation.navigate('ShopProfile');
      return;
    }
    if (returnTo) {
      navigation.navigate(returnTo);
      return;
    }
    navigateToServiceCenters(navigation);
  }, [navigation, returnTo]);
  const backLabel = useMemo(() => {
    if (backLabelKey) return t(backLabelKey);
    if (backLabelParam) return backLabelParam;
    if (returnTo || canGoBack) return t('navigation.back');
    return t('navigation.map');
  }, [backLabelKey, backLabelParam, returnTo, canGoBack, t]);

  const [shop, setShop] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [isClientAccount, setIsClientAccount] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isShopAccount, setIsShopAccount] = useState(false);
  const [requestSheetOpen, setRequestSheetOpen] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [loadErrorMessage, setLoadErrorMessage] = useState('');
  const [authorizingVehicleId, setAuthorizingVehicleId] = useState(null);
  const skipNextVehicleFocusReload = useRef(true);
  const scrollRef = useRef(null);
  const authorizationSectionY = useRef(0);
  const vehicleRowYs = useRef({});

  const authorizeVehicleId = resolveAuthorizeVehicleId(route.params);
  const effectiveShopId = resolveShopIdForAuthorization({
    shop,
    resolvedShopId,
    centerSlug: resolvedCenterSlug,
  });
  const authorizeVehicle = useMemo(() => {
    if (!authorizeVehicleId) return null;
    return vehicles.find((item) => Number(item.id) === Number(authorizeVehicleId)) || null;
  }, [authorizeVehicleId, vehicles]);
  const isAuthorizedForContextVehicle = isShopAuthorizedForVehicle(authorizeVehicle, effectiveShopId);

  const reloadClientVehicles = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('@access_token');
      const storedIsShop = await AsyncStorage.getItem('@is_shop');
      if (!token || storedIsShop === 'true') {
        setVehicles([]);
        return;
      }
      const vehicleData = await getVehicles(token);
      setVehicles(vehicleData);
    } catch (error) {
      console.warn('Failed to refresh vehicles on shop detail:', error);
    }
  }, []);

  const goAddVehicle = useCallback(() => {
    navigation.navigate('CreateVehicle');
  }, [navigation]);

  const handleRequestServicePress = useCallback(() => {
    if (isLoggedIn && isClientAccount && vehicles.length === 0) {
      Alert.alert(
        t('serviceCenters.profile.addVehicleFirstTitle'),
        t('serviceCenters.profile.addVehicleFirstBody'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('vehicles.addVehicle'), onPress: goAddVehicle },
        ]
      );
      return;
    }
    setRequestSheetOpen(true);
  }, [goAddVehicle, isClientAccount, isLoggedIn, t, vehicles.length]);

  const loadData = useCallback(async () => {
    setLoadError(false);
    setLoadErrorMessage('');
    setLoading(true);
    try {
      if (!resolvedShopId && !resolvedCenterSlug && !(locale && citySlug && resolvedCenterSlug)) {
        throw new Error('Missing service center identifier.');
      }

      const token = await AsyncStorage.getItem('@access_token');
      const storedUserId = await AsyncStorage.getItem('@user_id');
      const storedIsShop = await AsyncStorage.getItem('@is_shop');

      let shopData;
      let seoPayload = null;
      const detail = await loadShopDetailWithOptionalSeo({
        shopId: resolvedShopId,
        locale: locale || 'en',
        citySlug,
        centerSlug: resolvedCenterSlug,
        token,
        getShopById,
      });
      shopData = detail.shop;
      seoPayload = detail.seoPayload;

      if (Platform.OS === 'web') {
        if (seoPayload?.meta) {
          applySeoPageMeta(seoPayload.meta, seoPayload.structured_data);
        }
        syncShopDetailWebUrl(shopData, shopData?.id || resolvedShopId);
      }

      if (!token) {
        setShop(shopData);
        setIsOwner(false);
        setIsClientAccount(false);
        setIsLoggedIn(false);
        setIsShopAccount(false);
        setVehicles([]);
        return;
      }

      const shopUser = storedIsShop === 'true';
      setIsLoggedIn(true);
      setIsShopAccount(shopUser);
      setIsClientAccount(!shopUser);
      setShop(shopData);

      const uid = storedUserId ? parseInt(storedUserId, 10) : null;
      const owners = Array.isArray(shopData.users) ? shopData.users : [];
      setIsOwner(
        uid != null && owners.some((u) => Number(u?.id ?? u) === uid)
      );

      if (!shopUser) {
        const vehicleData = await getVehicles(token);
        setVehicles(vehicleData);
      } else {
        setVehicles([]);
      }
    } catch (error) {
      console.error('Failed to load shop detail:', error);
      setShop(null);
      setLoadError(true);
      const message = String(error?.message || '');
      if (/failed to fetch|network|connection refused|load failed/i.test(message)) {
        setLoadErrorMessage(t('serviceCenters.profile.loadErrorNetwork'));
      } else if (/missing service center identifier/i.test(message)) {
        setLoadErrorMessage(t('serviceCenters.profile.loadErrorInvalid'));
      } else {
        setLoadErrorMessage(t('serviceCenters.profile.loadErrorGeneric'));
      }
      if (Platform.OS !== 'web') {
        Alert.alert(t('common.error'), t('serviceCenters.profile.loadErrorTitle'));
      }
    } finally {
      setLoading(false);
    }
  }, [resolvedShopId, locale, citySlug, centerSlug]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useFocusEffect(
    useCallback(() => {
      if (skipNextVehicleFocusReload.current) {
        skipNextVehicleFocusReload.current = false;
        return;
      }
      reloadClientVehicles();
    }, [reloadClientVehicles])
  );

  const navTitle = useMemo(() => {
    if (!shop?.name) return t('serviceCenters.profile.defaultTitle');
    const displayName = formatShopDisplayName(shop.name);
    return displayName.length > 32 ? `${displayName.slice(0, 29)}…` : displayName;
  }, [shop?.name, t]);

  const scrollToAuthorization = useCallback(
    (targetVehicleId = authorizeVehicleId) => {
      const scrollToY = (y) => {
        scrollRef.current?.scrollTo({ y: Math.max(0, y - 16), animated: true });
      };

      if (targetVehicleId != null && vehicleRowYs.current[targetVehicleId] != null) {
        scrollToY(vehicleRowYs.current[targetVehicleId]);
      } else if (authorizationSectionY.current) {
        scrollToY(authorizationSectionY.current);
      }

      if (Platform.OS === 'web' && typeof document !== 'undefined') {
        const section = document.getElementById('authorization');
        section?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        if (targetVehicleId != null) {
          const row = document.getElementById(`authorize-vehicle-${targetVehicleId}`);
          row?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    },
    [authorizeVehicleId]
  );

  useEffect(() => {
    if (!authorizeVehicleId || !isClientAccount || loading) return undefined;
    const timer = setTimeout(() => scrollToAuthorization(authorizeVehicleId), 450);
    return () => clearTimeout(timer);
  }, [authorizeVehicleId, isClientAccount, loading, vehicles.length, scrollToAuthorization]);

  const applyAuthorizationChange = async (vehicle, isAuthorized) => {
    const shopIdForAuth = resolveShopIdForAuthorization({
      shop,
      resolvedShopId,
      centerSlug: resolvedCenterSlug,
    });
    if (!shopIdForAuth) {
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        console.warn('[ShopDetail] authorize skipped: missing shopId', {
          shopId: shop?.id,
          resolvedShopId,
          centerSlug: resolvedCenterSlug,
        });
      }
      showMessage('Error', 'Could not determine service center ID. Please refresh and try again.');
      return;
    }

    setAuthorizingVehicleId(vehicle.id);
    try {
      const token = await AsyncStorage.getItem('@access_token');
      if (!token) {
        showMessage('Sign in required', 'Please sign in to authorize a service center for your vehicle.');
        return;
      }

      const updated = await authorizeVehicleForShop(
        vehicle,
        shopIdForAuth,
        !isAuthorized,
        token
      );
      setVehicles((prev) => prev.map((v) => (v.id === vehicle.id ? updated : v)));

      showMessage(
        isAuthorized ? 'Access removed' : 'Authorized',
        isAuthorized
          ? 'This service center no longer has full access to your vehicle history.'
          : 'This service center can now see your full mechanical service history for this vehicle.'
      );

      const returnTo = route.params?.returnTo;
      const returnVehicleId = route.params?.vehicleId ?? authorizeVehicleId;
      if (returnTo === 'VehicleDetail' && returnVehicleId != null) {
        navigation.navigate({
          name: 'VehicleDetail',
          params: { vehicleId: returnVehicleId, expandAuthorizedCenters: true },
          merge: true,
        });
      } else if (returnTo === 'ManageVehicleServiceCenters' && returnVehicleId != null) {
        navigation.navigate({
          name: 'ManageVehicleServiceCenters',
          params: { vehicleId: returnVehicleId },
          merge: true,
        });
      }
    } catch (error) {
      console.error('Failed to update authorization:', error);
      showMessage('Error', 'Failed to update authorization. Please try again.');
    } finally {
      setAuthorizingVehicleId(null);
    }
  };

  const toggleAuthorization = async (vehicle) => {
    const shopIdForAuth = resolveShopIdForAuthorization({
      shop,
      resolvedShopId,
      centerSlug: resolvedCenterSlug,
    });
    const isAuthorized = isShopAuthorizedForVehicle(vehicle, shopIdForAuth);
    const shopName = shop?.name ?? genericServiceCenter;

    if (isAuthorized) {
      const confirmed = await confirmMessage('Remove access?', formatRevokeConfirmMessage(shopName), {
        confirmLabel: 'Remove access',
      });
      if (confirmed) {
        await applyAuthorizationChange(vehicle, true);
      }
      return;
    }

    const confirmed = await confirmMessage(
      'Authorize service center?',
      formatAuthorizeConfirmMessage(shopName),
      { confirmLabel: 'Authorize' }
    );
    if (confirmed) {
      await applyAuthorizationChange(vehicle, false);
    }
  };

  const handleDeleteImage = async (imageId) => {
    try {
      const token = await AsyncStorage.getItem('@access_token');
      await deleteShopImage(shopId, imageId, token);
      Alert.alert('Deleted', 'Image has been deleted.');
      await loadData();
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to delete image.');
    }
  };

  const openExternal = async (label, url) => {
    const n = normalizeUrl(url);
    if (!n) return;
    try {
      const supported = await Linking.canOpenURL(n);
      if (!supported) {
        Alert.alert('Unable to open link', `${label ?? 'Link'} cannot be opened on this device.`);
        return;
      }
      await Linking.openURL(n);
    } catch (e) {
      console.warn(e);
      Alert.alert('Unable to open link', `${label ?? 'Link'} could not be opened.`);
    }
  };

  if (loading) {
    return (
      <ScreenBackground safeArea={false}>
        <View style={styles.center}>
          <ActivityIndicator animating size="large" color="#fff" />
        </View>
      </ScreenBackground>
    );
  }

  if (loadError || !shop) {
    return (
      <ScreenBackground safeArea={false}>
        <View style={styles.center}>
          <EmptyStateCard
            title={t('serviceCenters.profile.loadErrorTitle')}
            subtitle={loadErrorMessage || t('serviceCenters.profile.loadErrorGeneric')}
            icon="alert-circle-outline"
          />
          <Button mode="contained" onPress={loadData} style={styles.retryBtn}>
            {t('common.retry')}
          </Button>
        </View>
      </ScreenBackground>
    );
  }

  const serviceName = formatShopDisplayName(shop.name || genericServiceCenter);

  const vehicleNamesForSubtitleRaw = collectVehicleTypeNames(shop);
  const vehicleNamesForSubtitle = translateVehicleTypePublicLabels(vehicleNamesForSubtitleRaw, t);
  const subtitleType =
    vehicleNamesForSubtitle.length > 0 ? joinList(vehicleNamesForSubtitle, { t }) : genericServiceCenter;
  const addr = typeof shop.address === 'string' ? shop.address.trim() : '';
  const phone =
    (typeof shop.display_phone === 'string' && shop.display_phone.trim()) ||
    (typeof shop.phone_e164 === 'string' && shop.phone_e164.trim()) ||
    (typeof shop.phone === 'string' && shop.phone.trim()) ||
    '';
  const cityName =
    (typeof shop.city_name === 'string' && shop.city_name.trim()) ||
    (typeof shop.seo_city === 'string' && shop.seo_city.trim()) ||
    '';
  const countryName =
    (typeof shop.country_name === 'string' && shop.country_name.trim()) ||
    (typeof shop.seo_country === 'string' && shop.seo_country.trim()) ||
    '';

  const locationLine = [addr, cityName, countryName].filter(Boolean).join(', ');
  const mapsUrl = resolveShopMapsUrl({
    googleMapsUrl: shop.google_maps_url,
    latitude: shop.latitude,
    longitude: shop.longitude,
    address: addr,
    cityName,
    countryName,
  });

  const repairNamesRaw = collectRepairNames(shop);
  const repairNames = translateRepairTypeLabels(repairNamesRaw, t);

  const vehicleList = vehicleNamesForSubtitle.length
    ? joinList(vehicleNamesForSubtitle, { t })
    : '';
  const servicesList = repairNames.length ? joinList(repairNames, { t }) : '';

  const vehiclePhrase = vehicleList ? t('serviceCenterProfile.vehiclePhrase', { vehicleTypes: vehicleList }) : '';
  const servicesPhrase = servicesList ? t('serviceCenterProfile.servicesPhrase', { services: servicesList }) : '';
  const locationPhrase = locationLine ? t('serviceCenterProfile.locationPhrase', { locationLine }) : '';

  const aboutLead = t('serviceCenterProfile.aboutTemplate', {
    serviceCenterName: serviceName,
    vehiclePhrase,
    servicesPhrase,
    locationPhrase,
  });

  const longDescription =
    typeof shop.description === 'string' ? shop.description.trim() : '';

  const ratingSnippet = formatRatingSnippet(shop.average_rating, shop.review_count, t);
  const completedCount =
    shop.completed_repairs_count != null && shop.completed_repairs_count !== ''
      ? Number(shop.completed_repairs_count)
      : null;

  const vehicleNames = vehicleNamesForSubtitle;
  const hoursRows = workingHoursEntries(shop.working_hours).filter((r) => r?.label && r?.text != null);

  const imagesList = Array.isArray(shop.images) ? shop.images : [];

  const showClientRequest = !isOwner && !isShopAccount;
  const showOwnerControls = isOwner && !publicPreview;

  const linkRow = [
    { key: 'website', icon: 'web', url: shop.website },
    { key: 'maps', icon: 'map-marker', url: shop.google_maps_url },
    { key: 'youtube', icon: 'youtube', url: shop.youtube_url },
    { key: 'facebook', icon: 'facebook', url: shop.facebook_url },
    { key: 'instagram', icon: 'instagram', url: shop.instagram_url },
  ].filter((x) => x.url && String(x.url).trim());

  function HeroIconRow({
    icon,
    children,
    onPress,
  }) {
    const row = (
      <View style={styles.heroIconRow}>
        <MaterialCommunityIcons name={icon} size={22} color="rgba(255,255,255,0.92)" />
        <View style={styles.heroTextSlot}>
          <Text style={styles.heroRowText}>{children}</Text>
        </View>
      </View>
    );
    if (onPress) {
      return (
        <Pressable onPress={onPress} hitSlop={8}>
          {row}
        </Pressable>
      );
    }
    return row;
  }

  function SectionHeading({ title }) {
    return <Text style={styles.sectionHeading}>{title}</Text>;
  }

  function ChipWrap({ labels }) {
    return (
      <View style={styles.chipWrap}>
        {labels.map((label, i) => (
          <Chip
            key={`${label}-${i}`}
            mode="outlined"
            compact
            style={styles.chip}
            textStyle={styles.chipText}
          >
            {label}
          </Chip>
        ))}
      </View>
    );
  }

  return (
    <ScreenBackground safeArea={false}>
      <AppNavigationBar
        title={navTitle}
        backLabel={backLabel}
        onBack={handleBack}
        iconOnlyBack={canGoBack || Boolean(returnTo)}
        variant="transparent"
        scrolled={scrolled}
      />
      <ScrollView
        ref={scrollRef}
        onScroll={onScroll}
        scrollEventThrottle={scrollEventThrottle}
        style={styles.container}
        contentContainerStyle={[
          styles.listContent,
          {
            paddingTop: 12,
            paddingBottom: showClientRequest ? insets.bottom + 96 : insets.bottom + 32,
          },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <AppCard variant="dark" contentStyle={styles.heroInner}>
          <View style={styles.heroTitleRow}>
            <Text style={styles.heroTitle}>{serviceName}</Text>
            {shop.is_verified ? <StatusBadge status="verified" /> : null}
            {!shop.is_verified && shop.verification_status_label ? (
              <Chip compact icon="information-outline" style={styles.verificationChip}>
                {shop.verification_status_label}
              </Chip>
            ) : null}
          </View>
          <Text style={styles.heroSubtitle}>{subtitleType}</Text>
          {shop.offers_guarantee ? (
            <View style={styles.guaranteeRow}>
              <MaterialCommunityIcons name="shield-check" size={18} color="rgba(255,255,255,0.88)" />
              <Text style={styles.guaranteeText}>{t('serviceCenters.profile.offersGuarantee')}</Text>
            </View>
          ) : null}

          <Divider style={styles.heroDivider} />

          {locationLine ? (
            <Pressable
              onPress={() =>
                openShopInMaps({
                  googleMapsUrl: shop.google_maps_url,
                  latitude: shop.latitude,
                  longitude: shop.longitude,
                  address: addr,
                  cityName,
                  countryName,
                })
              }
              disabled={!mapsUrl}
              hitSlop={8}
              style={({ pressed }) => [styles.heroIconRow, pressed && mapsUrl && styles.heroIconRowPressed]}
            >
              <MaterialCommunityIcons name="map-marker-outline" size={22} color="rgba(255,255,255,0.92)" />
              <Text style={[styles.heroRowText, mapsUrl && styles.heroRowLink]}>{locationLine}</Text>
            </Pressable>
          ) : null}

          {phone ? (
            <Pressable onPress={() => Linking.openURL(`tel:${phone.replace(/\s+/g, '')}`)} hitSlop={8}>
              <HeroIconRow icon="phone-outline">{phone}</HeroIconRow>
            </Pressable>
          ) : null}

          {ratingSnippet ? (
            <HeroIconRow icon="star-outline">{ratingSnippet}</HeroIconRow>
          ) : (
            <HeroIconRow icon="star-outline">{t('serviceCenters.profile.notRated')}</HeroIconRow>
          )}

          <HeroIconRow icon="wrench-outline">
            {completedCount != null && !Number.isNaN(completedCount)
              ? t('serviceCenters.profile.completedJobs', {
                  count: completedCount.toLocaleString(),
                })
              : t('serviceCenters.profile.completedJobsUnknown')}
          </HeroIconRow>
        </AppCard>

        {isClientAccount ? (
          <FloatingCard style={styles.authorizeScrollCard}>
            {authorizeVehicleId && authorizeVehicle ? (
              <View style={styles.authorizeScrollSummary}>
                <MaterialCommunityIcons
                  name={isAuthorizedForContextVehicle ? 'shield-check' : 'car-info'}
                  size={20}
                  color={isAuthorizedForContextVehicle ? '#166534' : COLORS.PRIMARY}
                />
                <Text style={styles.authorizeScrollSummaryText}>
                  {isAuthorizedForContextVehicle
                    ? t('serviceCenters.profile.alreadyAuthorized', {
                        vehicle: formatVehicleAuthorizeLabel(authorizeVehicle),
                      })
                    : t('serviceCenters.profile.chooseForVehicle', {
                        vehicle: formatVehicleAuthorizeLabel(authorizeVehicle),
                      })}
                </Text>
                {isAuthorizedForContextVehicle ? (
                  <Chip compact icon="check" style={styles.authorizedChip}>
                    {t('serviceCenters.profile.authorized')}
                  </Chip>
                ) : null}
              </View>
            ) : (
              <Text style={styles.authorizeScrollHint}>
                {t('serviceCenters.profile.authorizeHint')}
              </Text>
            )}
            <Button
              mode="contained"
              icon="shield-check"
              onPress={() => scrollToAuthorization(authorizeVehicleId)}
              style={styles.authorizeScrollButton}
            >
              {t('serviceCenters.profile.chooseVehicles')}
            </Button>
          </FloatingCard>
        ) : null}

        {shop.is_claimed === false || shop.registration_origin === 'owner_reported' ? (
          <FloatingCard style={styles.unclaimedBanner}>
            <Text style={styles.unclaimedTitle}>{t('serviceCenters.profile.unclaimedTitle')}</Text>
            <Text style={styles.unclaimedBody}>{t('serviceCenters.profile.unclaimedBody')}</Text>
          </FloatingCard>
        ) : null}

        <SectionHeading title={t('serviceCenters.profile.photos')} />
        {imagesList.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoScroller}>
            {imagesList.map((img) => {
              const uri = img.thumbnail_url || img.image_url;
              if (!uri) return null;
              return (
                <View key={img.id} style={styles.photoItem}>
                  <Image source={{ uri }} style={styles.photoImage} />
                  {showOwnerControls ? (
                    <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDeleteImage(img.id)}>
                      <Text style={styles.deleteText}>✕</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              );
            })}
          </ScrollView>
        ) : (
          <EmptyStateCard
            icon="image-outline"
            title={t('serviceCenters.profile.noPhotosTitle')}
            subtitle={t('serviceCenters.profile.noPhotosSubtitle')}
          />
        )}

        <SectionHeading title={t('serviceCenters.profile.about')} />
        <FloatingCard>
          <Text style={styles.aboutLead}>{aboutLead}</Text>
          {longDescription ? (
            <Text style={styles.aboutBody}>{longDescription}</Text>
          ) : null}
        </FloatingCard>

        <SectionHeading title={t('serviceCenters.profile.services')} />
        <FloatingCard>
          {repairNames.length ? (
            <ChipWrap labels={repairNames} />
          ) : (
            <Text style={styles.placeholderMuted}>{t('serviceCenters.profile.servicesNotAdded')}</Text>
          )}
        </FloatingCard>

        {Array.isArray(shop.service_menu) && shop.service_menu.length > 0 ? (
          <>
            <SectionHeading title={t('serviceCenters.profile.publishedPricing')} />
            <FloatingCard>
              <Text style={styles.menuDisclaimer}>
                {t('serviceCenters.profile.partsQuotedSeparately')}
              </Text>
              {shop.service_menu.map((item) => {
                const label = translateRepairTypeLabel(item, t) || t('common.service');
                const from = item.labor_from ?? item.price_from;
                const to = item.labor_to ?? item.price_to;
                let priceLine = t('serviceCenters.profile.priceOnRequest');
                if (from != null && to != null && String(from) !== String(to)) {
                  priceLine = t('serviceCenters.profile.laborPriceRange', {
                    from: formatMoneyAmount(from),
                    to: formatMoneyAmount(to),
                  });
                } else if (from != null) {
                  priceLine = t('serviceCenters.profile.laborPriceFrom', {
                    price: formatMoneyAmount(from),
                  });
                } else if (to != null) {
                  priceLine = t('serviceCenters.profile.laborPriceFrom', {
                    price: formatMoneyAmount(to),
                  });
                }
                const laborTime = formatTypicalLaborTime(
                  item.typical_labor_minutes,
                  item.typical_labor_minutes_to
                );
                return (
                  <View key={`${item.repair_type_id}-${label}`} style={styles.menuRow}>
                    <View style={styles.menuIconCircle}>
                      <MaterialCommunityIcons
                        name={getOperationIcon(item)}
                        size={20}
                        color={COLORS.PRIMARY}
                      />
                    </View>
                    <View style={styles.menuTextCol}>
                      <Text style={styles.menuServiceName}>{label}</Text>
                      <Text style={styles.menuPriceLine}>{priceLine}</Text>
                      {laborTime ? (
                        <Text style={styles.menuDisclaimer}>
                          {t('serviceCenters.profile.typicalLaborTime', { time: laborTime })}
                        </Text>
                      ) : null}
                      {item.disclaimer ? (
                        <Text style={styles.menuDisclaimer}>{item.disclaimer}</Text>
                      ) : null}
                    </View>
                  </View>
                );
              })}
            </FloatingCard>
          </>
        ) : null}

        <SectionHeading title={t('serviceCenters.profile.vehicleTypes')} />
        <FloatingCard>
          {vehicleNames.length ? (
            <ChipWrap labels={vehicleNames} />
          ) : (
            <Text style={styles.placeholderMuted}>{t('serviceCenters.profile.vehicleTypesNotAdded')}</Text>
          )}
        </FloatingCard>

        {Array.isArray(shop.brand_names) && shop.brand_names.length > 0 ? (
          <>
            <SectionHeading title={t('serviceCenters.profile.brands')} />
            <FloatingCard>
              <ChipWrap labels={shop.brand_names} />
            </FloatingCard>
          </>
        ) : null}

        {showOwnerControls ? (
          <Button
            mode="contained-tonal"
            onPress={() => navigation.navigate('ShopProfile')}
            style={styles.manageProfileBtn}
          >
            {t('serviceCenters.profile.editCenterDetails')}
          </Button>
        ) : null}

        <SectionHeading title={t('serviceCenters.profile.workingHours')} />
        <FloatingCard>
          {hoursRows.length ? (
            hoursRows.map((row) => (
              <View key={row.label} style={styles.hoursRow}>
                <Text style={styles.hoursDay}>{row.label}</Text>
                <Text style={styles.hoursTime}>{row.text}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.placeholderMuted}>{t('serviceCenters.profile.workingHoursNotAdded')}</Text>
          )}
        </FloatingCard>

        {linkRow.length > 0 ? (
          <>
            <SectionHeading title={t('serviceCenters.profile.links')} />
            <FloatingCard>
              <View style={styles.linksRow}>
                {linkRow.map((item) => (
                  <Pressable
                    key={item.key}
                    style={({ pressed }) => [styles.linkIconBtn, pressed && styles.linkIconBtnPressed]}
                    onPress={() => openExternal(item.key, item.url)}
                  >
                    <MaterialCommunityIcons name={item.icon} size={28} color={COLORS.PRIMARY} />
                  </Pressable>
                ))}
              </View>
            </FloatingCard>
          </>
        ) : null}

        {isClientAccount ? (
          <View
            nativeID="authorization"
            onLayout={(e) => {
              authorizationSectionY.current = e.nativeEvent.layout.y;
            }}
          >
            <Divider style={{ marginVertical: 12, opacity: 0.35 }} />
            <SectionHeading title={t('serviceCenters.profile.authorizeSection')} />
            <FloatingCard>
              <Text style={styles.authExplainer}>{t('serviceCenters.profile.authorizeExplainer')}</Text>
              {vehicles.length === 0 ? (
                <>
                  <Text style={styles.placeholderOnCard}>You have no vehicles registered.</Text>
                  <Button mode="contained" onPress={goAddVehicle} style={styles.addFirstVehicleBtn}>
                    Add your first vehicle
                  </Button>
                </>
              ) : (
                vehicles.map((item) => {
                  const isAuthorized = isShopAuthorizedForVehicle(item, effectiveShopId);
                  const isContextVehicle =
                    authorizeVehicleId != null && Number(item.id) === Number(authorizeVehicleId);
                  const isAuthorizing = authorizingVehicleId === item.id;
                  return (
                    <View
                      key={item.id}
                      nativeID={`authorize-vehicle-${item.id}`}
                      onLayout={(e) => {
                        vehicleRowYs.current[item.id] = e.nativeEvent.layout.y + authorizationSectionY.current;
                      }}
                      style={[styles.vehicleRow, isContextVehicle && styles.vehicleRowHighlighted]}
                    >
                      <View style={styles.vehicleRowHeader}>
                        <Text style={styles.vehicleMeta}>
                          {item.make_name} {item.model_name} ({item.license_plate})
                        </Text>
                        {isAuthorized ? (
                          <Chip compact icon="check" style={styles.authorizedRowChip}>
                            Authorized
                          </Chip>
                        ) : null}
                      </View>
                      <Button
                        mode={isAuthorized ? 'outlined' : 'contained'}
                        compact
                        loading={isAuthorizing}
                        disabled={isAuthorizing}
                        onPress={() => toggleAuthorization(item)}
                        style={styles.authButton}
                        buttonColor={isAuthorized ? undefined : theme.colors.primary}
                        textColor={isAuthorized ? theme.colors.error : undefined}
                      >
                        {isAuthorized ? 'Remove access' : 'Authorize'}
                      </Button>
                    </View>
                  );
                })
              )}
            </FloatingCard>
          </View>
        ) : null}
      </ScrollView>

      {showClientRequest ? (
        <Pressable
          onPress={handleRequestServicePress}
          style={({ pressed }) => [
            styles.requestFab,
            { bottom: insets.bottom + 16 },
            pressed && styles.requestFabPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel={t('serviceCenters.profile.requestServiceA11y')}
        >
          <MaterialCommunityIcons name="calendar-clock" size={22} color="#fff" />
          <Text style={styles.requestFabLabel}>{t('serviceCenters.requestService')}</Text>
        </Pressable>
      ) : null}

      <ShopQuickRequestSheet
        visible={requestSheetOpen}
        onClose={() => setRequestSheetOpen(false)}
        shop={shop}
        shopId={shopId}
        vehicles={vehicles}
        navigation={navigation}
        isLoggedIn={isLoggedIn}
        repairType={route.params?.repairType}
        vehicleType={route.params?.vehicleType}
      />
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  retryBtn: {
    marginTop: 16,
    alignSelf: 'stretch',
    maxWidth: 280,
  },
  container: { flex: 1, backgroundColor: 'transparent' },
  listContent: {
    paddingHorizontal: 12,
  },
  requestFab: {
    position: 'absolute',
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 999,
    backgroundColor: COLORS.PRIMARY,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.35)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 10,
  },
  requestFabPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.98 }],
  },
  requestFabLabel: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.15,
  },
  sectionHeading: {
    marginTop: 14,
    marginBottom: 8,
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  heroInner: {
    paddingBottom: 4,
  },
  heroTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  verificationChip: {
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    flexShrink: 1,
  },
  heroSubtitle: {
    marginTop: 4,
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.88)',
  },
  heroShortDesc: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 20,
    color: 'rgba(255,255,255,0.9)',
  },
  guaranteeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 8,
  },
  guaranteeText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.88)',
    fontWeight: '600',
  },
  heroDivider: {
    marginTop: 14,
    marginBottom: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  heroIconRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 12,
    gap: 10,
    paddingRight: 4,
  },
  heroCol: {
    flex: 1,
    minWidth: 0,
  },
  heroTextSlot: {
    flex: 1,
    minWidth: 0,
  },
  heroIconRowPressed: {
    opacity: 0.85,
  },
  heroRowText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: 'rgba(255,255,255,0.95)',
  },
  heroRowLink: {
    color: '#93c5fd',
    textDecorationLine: 'underline',
  },
  aboutLead: {
    fontSize: 14,
    lineHeight: 22,
    color: COLORS.TEXT_DARK,
    fontWeight: '600',
    marginBottom: 8,
  },
  aboutBody: {
    fontSize: 14,
    lineHeight: 21,
    color: COLORS.TEXT_MUTED,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderColor: 'rgba(15,23,42,0.12)',
  },
  chipText: {
    fontSize: 12,
  },
  placeholderMuted: {
    color: COLORS.TEXT_MUTED,
    fontSize: 14,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(15,23,42,0.12)',
  },
  menuIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(37,99,235,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuTextCol: {
    flex: 1,
  },
  menuServiceName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.TEXT_DARK,
  },
  menuPriceLine: {
    marginTop: 4,
    fontSize: 14,
    color: COLORS.TEXT_DARK,
  },
  menuDisclaimer: {
    marginTop: 4,
    fontSize: 12,
    color: COLORS.TEXT_MUTED,
    lineHeight: 16,
  },
  placeholderOnCard: {
    color: COLORS.TEXT_MUTED,
    fontSize: 14,
    textAlign: 'center',
  },
  photoScroller: {
    marginBottom: 8,
  },
  photoItem: {
    position: 'relative',
    marginRight: 12,
  },
  photoImage: {
    width: 220,
    height: 160,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  deleteBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(220,38,38,0.85)',
    borderRadius: 14,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  deleteText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  manageProfileBtn: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  hoursRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(15,23,42,0.08)',
  },
  hoursDay: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.TEXT_DARK,
  },
  hoursTime: {
    fontSize: 14,
    color: COLORS.TEXT_MUTED,
    textAlign: 'right',
    flexShrink: 0,
    maxWidth: '55%',
  },
  linksRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  linkIconBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(37,99,235,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(37,99,235,0.2)',
  },
  linkIconBtnPressed: {
    opacity: 0.75,
  },
  authExplainer: {
    color: COLORS.TEXT_MUTED,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 10,
  },
  vehicleRow: {
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(15,23,42,0.08)',
    borderRadius: 10,
  },
  vehicleRowHighlighted: {
    backgroundColor: 'rgba(37,99,235,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(37,99,235,0.25)',
    marginBottom: 4,
  },
  vehicleRowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 10,
  },
  unclaimedBanner: {
    marginBottom: 8,
    borderColor: 'rgba(180,83,9,0.25)',
    backgroundColor: 'rgba(254,243,199,0.5)',
  },
  unclaimedTitle: {
    fontWeight: '700',
    color: '#92400e',
    marginBottom: 4,
  },
  unclaimedBody: {
    color: COLORS.TEXT_MUTED,
    fontSize: 13,
    lineHeight: 18,
  },
  vehicleMeta: {
    fontSize: 14,
    color: COLORS.TEXT_DARK,
    marginBottom: 10,
    fontWeight: '600',
  },
  authButton: {
    alignSelf: 'flex-start',
  },
  addFirstVehicleBtn: {
    marginTop: 12,
    alignSelf: 'stretch',
  },
  authorizeScrollCard: {
    marginTop: 10,
    borderColor: 'rgba(37,99,235,0.2)',
    backgroundColor: 'rgba(37,99,235,0.04)',
  },
  authorizeScrollHint: {
    color: COLORS.TEXT_DARK,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  authorizeScrollSummary: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 12,
  },
  authorizeScrollSummaryText: {
    flex: 1,
    color: COLORS.TEXT_DARK,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  authorizeScrollButton: {
    alignSelf: 'stretch',
  },
  authorizedChip: {
    backgroundColor: 'rgba(34,197,94,0.12)',
  },
  authorizedRowChip: {
    backgroundColor: 'rgba(34,197,94,0.12)',
  },
});
