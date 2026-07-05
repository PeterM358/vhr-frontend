import React, { useEffect, useState, useLayoutEffect, useCallback } from 'react';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import { formatDayHoursWithLunch, parseLunchBreak } from '../utils/shopWorkingHours';
import { getVehicles, updateVehicle } from '../api/vehicles';
import { getShopById, deleteShopImage } from '../api/shops';
import { fetchSeoServiceCenterDetail, resolveShopSeoPath } from '../api/seo';
import { applySeoPageMeta } from '../utils/seo/seoMetadata';

import { Text, Button, ActivityIndicator, useTheme, Chip, Divider } from 'react-native-paper';
import ScreenBackground from '../components/ScreenBackground';
import AppCard from '../components/ui/AppCard';
import FloatingCard from '../components/ui/FloatingCard';
import EmptyStateCard from '../components/ui/EmptyStateCard';
import StatusBadge from '../components/ui/StatusBadge';
import { COLORS } from '../constants/colors';
import { formatAuthorizeConfirmMessage, formatRevokeConfirmMessage } from '../utils/shopDataAccess';
import { formatShopDisplayName } from '../utils/shopDisplayName';
import { formatMoneyAmount } from '../constants/currency';
import { resolveRepairTypeIcon } from '../utils/repairTypeIcons';
import { buildShopGeneratedPublicProfile } from '../utils/shopPublicProfileText';
import { openShopInMaps, resolveShopMapsUrl } from '../utils/shopMapsLink';
import ShopQuickRequestSheet from '../components/shop/ShopQuickRequestSheet';

const GENERIC_TERM = 'Service Center';

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

function formatRatingSnippet(avg, count) {
  if (avg == null || avg === '') return null;
  const n = Number(avg);
  if (Number.isNaN(n)) return null;
  const star = `${n.toFixed(1)}`;
  const rc = Number(count);
  if (Number.isFinite(rc) && rc > 0) return `${star} · ${rc} reviews`;
  return `${star}`;
}

export default function ShopDetailScreen({ route, navigation }) {
  const { shopId, locale, citySlug, centerSlug } = route.params || {};
  const resolvedShopId = shopId;
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const headerUnderlay = insets.top + (Platform.OS === 'ios' ? 44 : 56);

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

  const loadData = useCallback(async () => {
    setLoadError(false);
    setLoadErrorMessage('');
    setLoading(true);
    try {
      if (!resolvedShopId && !(locale && citySlug && centerSlug)) {
        throw new Error('Missing service center identifier.');
      }

      const token = await AsyncStorage.getItem('@access_token');
      const storedUserId = await AsyncStorage.getItem('@user_id');
      const storedIsShop = await AsyncStorage.getItem('@is_shop');

      let shopData;
      if (locale && citySlug && centerSlug) {
        const seoPayload = await fetchSeoServiceCenterDetail(locale, citySlug, centerSlug);
        shopData = seoPayload.service_center;
        if (Platform.OS === 'web') {
          applySeoPageMeta(seoPayload.meta, seoPayload.structured_data);
        }
      } else {
        shopData = await getShopById(resolvedShopId, token || null);
        if (Platform.OS === 'web' && resolvedShopId) {
          try {
            const resolved = await resolveShopSeoPath(resolvedShopId, 'en');
            if (resolved?.canonical_path && typeof window !== 'undefined') {
              window.history.replaceState(window.history.state, '', resolved.canonical_path);
            }
          } catch {
            if (typeof window !== 'undefined') {
              window.history.replaceState(window.history.state, '', `/service-center/${resolvedShopId}`);
            }
          }
        }
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
        setLoadErrorMessage('The Veversal service is temporarily unavailable. Please try again in a moment.');
      } else if (/missing service center identifier/i.test(message)) {
        setLoadErrorMessage('This service center link is invalid or outdated.');
      } else {
        setLoadErrorMessage('Check your connection and try again.');
      }
      if (Platform.OS !== 'web') {
        Alert.alert('Error', 'Failed to load service center details.');
      }
    } finally {
      setLoading(false);
    }
  }, [resolvedShopId, locale, citySlug, centerSlug]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useLayoutEffect(() => {
    if (!shop?.name) {
      navigation.setOptions({ title: 'Service Center Details' });
      return;
    }
    const displayName = formatShopDisplayName(shop.name);
    navigation.setOptions({
      title: displayName.length > 32 ? `${displayName.slice(0, 29)}…` : displayName,
    });
  }, [navigation, shop?.name]);

  const applyAuthorizationChange = async (vehicle, isAuthorized) => {
    const token = await AsyncStorage.getItem('@access_token');

    const updatedIds = isAuthorized
      ? vehicle.shared_with_shops
          .filter((s) => Number(s.id) !== Number(shopId))
          .map((s) => s.id)
      : [...vehicle.shared_with_shops.map((s) => s.id), Number(shopId)];

    try {
      await updateVehicle(vehicle.id, { shared_with_shops_ids: updatedIds }, token);

      const displayName = shop?.name ?? GENERIC_TERM;
      setVehicles((prev) =>
        prev.map((v) =>
          v.id === vehicle.id
            ? {
                ...v,
                shared_with_shops: isAuthorized
                  ? v.shared_with_shops.filter((s) => Number(s.id) !== Number(shopId))
                  : [...v.shared_with_shops, { id: shopId, name: displayName }],
              }
            : v
        )
      );

      const returnTo = route.params?.returnTo;
      const returnVehicleId = route.params?.vehicleId;
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
    } catch (_error) {
      Alert.alert('Error', 'Failed to update authorization.');
    }
  };

  const toggleAuthorization = (vehicle) => {
    const isAuthorized = vehicle.shared_with_shops.some((s) => Number(s.id) === Number(shopId));
    const shopName = shop?.name ?? GENERIC_TERM;

    if (isAuthorized) {
      Alert.alert('Remove access?', formatRevokeConfirmMessage(shopName), [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove access',
          style: 'destructive',
          onPress: () => applyAuthorizationChange(vehicle, true),
        },
      ]);
      return;
    }

    Alert.alert('Authorize service center?', formatAuthorizeConfirmMessage(shopName), [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Authorize', onPress: () => applyAuthorizationChange(vehicle, false) },
    ]);
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
            title="Could not load service center"
            subtitle={loadErrorMessage || 'Check your connection and try again.'}
            icon="alert-circle-outline"
          />
          <Button mode="contained" onPress={loadData} style={styles.retryBtn}>
            Retry
          </Button>
        </View>
      </ScreenBackground>
    );
  }

  const serviceName = formatShopDisplayName(shop.name || GENERIC_TERM);
  const vehicleNamesForSubtitle = collectVehicleTypeNames(shop);
  const subtitleType = vehicleNamesForSubtitle.length
    ? vehicleNamesForSubtitle.join(' · ')
    : presentationServiceCenterType(shop.service_center_type) ?? GENERIC_TERM;
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

  const generatedSummary =
    typeof shop.generated_public_summary === 'string'
      ? shop.generated_public_summary.trim()
      : '';

  const repairNames = collectRepairNames(shop);
  const liveAboutSummary = buildShopGeneratedPublicProfile({
    shopName: serviceName,
    vehicleTypeNames: vehicleNamesForSubtitle,
    repairTypeNames: repairNames,
    publishedMenuItems: Array.isArray(shop.service_menu) ? shop.service_menu : [],
    cityName,
    countryName,
    address: addr,
    workingHours: shop.working_hours,
    offersGuarantee: shop.offers_guarantee === true,
    brands: Array.isArray(shop.brand_names) ? shop.brand_names : [],
    allBrandsServiced: shop.all_brands_serviced === true,
  }).summary;

  const aboutLead =
    liveAboutSummary ||
    generatedSummary ||
    (locationLine
      ? `${serviceName} is a ${subtitleType} located in ${locationLine}.`
      : `${serviceName} is a ${subtitleType}.`);

  const longDescription =
    typeof shop.description === 'string' ? shop.description.trim() : '';

  const ratingSnippet = formatRatingSnippet(shop.average_rating, shop.review_count);
  const completedCount =
    shop.completed_repairs_count != null && shop.completed_repairs_count !== ''
      ? Number(shop.completed_repairs_count)
      : null;

  const vehicleNames = vehicleNamesForSubtitle;
  const hoursRows = workingHoursEntries(shop.working_hours).filter((r) => r?.label && r?.text != null);

  const imagesList = Array.isArray(shop.images) ? shop.images : [];

  const showClientRequest = !isOwner && !isShopAccount;

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
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.listContent,
          {
            paddingTop: headerUnderlay + 8,
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
              <Text style={styles.guaranteeText}>Offers guarantees</Text>
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
            <HeroIconRow icon="star-outline">Not rated yet</HeroIconRow>
          )}

          <HeroIconRow icon="wrench-outline">
            {completedCount != null && !Number.isNaN(completedCount)
              ? `${completedCount.toLocaleString()} completed jobs`
              : 'Completed jobs · —'}
          </HeroIconRow>
        </AppCard>

        {shop.is_claimed === false || shop.registration_origin === 'owner_reported' ? (
          <FloatingCard style={styles.unclaimedBanner}>
            <Text style={styles.unclaimedTitle}>Owner-reported · not claimed yet</Text>
            <Text style={styles.unclaimedBody}>
              This service center was added from a customer service record. The business can claim this profile
              later to manage bookings and confirm records.
            </Text>
          </FloatingCard>
        ) : null}

        <SectionHeading title="Photos" />
        {imagesList.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoScroller}>
            {imagesList.map((img) => {
              const uri = img.thumbnail_url || img.image_url;
              if (!uri) return null;
              return (
                <View key={img.id} style={styles.photoItem}>
                  <Image source={{ uri }} style={styles.photoImage} />
                  {isOwner ? (
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
            title="No photos yet"
            subtitle="This service center has not uploaded photos."
          />
        )}

        <SectionHeading title="About" />
        <FloatingCard>
          <Text style={styles.aboutLead}>{aboutLead}</Text>
          {longDescription ? (
            <Text style={styles.aboutBody}>{longDescription}</Text>
          ) : null}
        </FloatingCard>

        <SectionHeading title="Services" />
        <FloatingCard>
          {repairNames.length ? (
            <ChipWrap labels={repairNames} />
          ) : (
            <Text style={styles.placeholderMuted}>Services not added yet</Text>
          )}
        </FloatingCard>

        {Array.isArray(shop.service_menu) && shop.service_menu.length > 0 ? (
          <>
            <SectionHeading title="Published pricing" />
            <FloatingCard>
              {shop.service_menu.map((item) => {
                const label = item.repair_type_name || 'Service';
                const from = item.price_from;
                const to = item.price_to;
                let priceLine = 'Price on request';
                if (from != null && to != null && String(from) !== String(to)) {
                  priceLine = `${formatMoneyAmount(from)} – ${formatMoneyAmount(to)}`;
                } else if (from != null) {
                  priceLine = `from ${formatMoneyAmount(from)}`;
                } else if (to != null) {
                  priceLine = `from ${formatMoneyAmount(to)}`;
                }
                return (
                  <View key={`${item.repair_type_id}-${label}`} style={styles.menuRow}>
                    <View style={styles.menuIconCircle}>
                      <MaterialCommunityIcons
                        name={resolveRepairTypeIcon(item)}
                        size={20}
                        color={COLORS.PRIMARY}
                      />
                    </View>
                    <View style={styles.menuTextCol}>
                      <Text style={styles.menuServiceName}>{label}</Text>
                      <Text style={styles.menuPriceLine}>{priceLine}</Text>
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

        <SectionHeading title="Vehicle types" />
        <FloatingCard>
          {vehicleNames.length ? (
            <ChipWrap labels={vehicleNames} />
          ) : (
            <Text style={styles.placeholderMuted}>Vehicle types not added yet</Text>
          )}
        </FloatingCard>

        {Array.isArray(shop.brand_names) && shop.brand_names.length > 0 ? (
          <>
            <SectionHeading title="Brands" />
            <FloatingCard>
              <ChipWrap labels={shop.brand_names} />
            </FloatingCard>
          </>
        ) : null}

        {isOwner ? (
          <Button
            mode="contained-tonal"
            onPress={() => navigation.navigate('ShopProfile')}
            style={styles.manageProfileBtn}
          >
            Edit center details
          </Button>
        ) : null}

        <SectionHeading title="Working hours" />
        <FloatingCard>
          {hoursRows.length ? (
            hoursRows.map((row) => (
              <View key={row.label} style={styles.hoursRow}>
                <Text style={styles.hoursDay}>{row.label}</Text>
                <Text style={styles.hoursTime}>{row.text}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.placeholderMuted}>Working hours not added yet</Text>
          )}
        </FloatingCard>

        {linkRow.length > 0 ? (
          <>
            <SectionHeading title="Links" />
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
          <>
            <Divider style={{ marginVertical: 12, opacity: 0.35 }} />
            <SectionHeading title="Authorize this service center" />
            <FloatingCard>
              <Text style={styles.authExplainer}>
                Authorization shares full mechanical service history for the vehicles you select. Booking a repair
                without authorizing only grants access to that job and related prior work in the same category.
              </Text>
              {vehicles.length === 0 ? (
                <Text style={styles.placeholderOnCard}>You have no vehicles registered.</Text>
              ) : (
                vehicles.map((item) => {
                  const isAuthorized = item.shared_with_shops.some(
                    (s) => Number(s.id) === Number(shopId)
                  );
                  return (
                    <View key={item.id} style={styles.vehicleRow}>
                      <Text style={styles.vehicleMeta}>
                        {item.make_name} {item.model_name} ({item.license_plate})
                      </Text>
                      <Button
                        mode="contained"
                        compact
                        onPress={() => toggleAuthorization(item)}
                        style={styles.authButton}
                        buttonColor={isAuthorized ? theme.colors.error : theme.colors.primary}
                      >
                        {isAuthorized ? 'Unauthorize' : 'Authorize'}
                      </Button>
                    </View>
                  );
                })
              )}
            </FloatingCard>
          </>
        ) : null}
      </ScrollView>

      {showClientRequest ? (
        <Pressable
          onPress={() => setRequestSheetOpen(true)}
          style={({ pressed }) => [
            styles.requestFab,
            { bottom: insets.bottom + 16 },
            pressed && styles.requestFabPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Request service at this shop"
        >
          <MaterialCommunityIcons name="calendar-clock" size={22} color="#fff" />
          <Text style={styles.requestFabLabel}>Request service</Text>
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
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(15,23,42,0.08)',
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
});
