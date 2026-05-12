import React, { useEffect, useState } from 'react';
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

import { getShopById, deleteShopImage } from '../api/shops';
import { getVehicles, updateVehicle } from '../api/vehicles';

import { Text, Button, ActivityIndicator, useTheme, Chip, Divider } from 'react-native-paper';
import ScreenBackground from '../components/ScreenBackground';
import AppCard from '../components/ui/AppCard';
import FloatingCard from '../components/ui/FloatingCard';
import EmptyStateCard from '../components/ui/EmptyStateCard';
import StatusBadge from '../components/ui/StatusBadge';
import { COLORS } from '../constants/colors';

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

function formatHoursLine(dayValue) {
  if (dayValue == null || dayValue === '') return 'Closed';
  if (typeof dayValue === 'string') return dayValue;
  if (typeof dayValue === 'object') {
    if ('closed' in dayValue && dayValue.closed) return 'Closed';
    const start = dayValue.start != null ? String(dayValue.start) : '';
    const end = dayValue.end != null ? String(dayValue.end) : '';
    if (!start && !end) return 'Closed';
    if (!start || !end) return start || end;
    return `${start} – ${end}`;
  }
  return String(dayValue);
}

/** Python weekday convention: Monday = 0 … Sunday = 6 (when keys are numeric). */
function workingHoursEntries(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return [];

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
      text: formatHoursLine(hoursValue),
    });
  };

  for (const [key, hoursValue] of Object.entries(raw)) {
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
  const { shopId } = route.params;
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const headerUnderlay = insets.top + (Platform.OS === 'ios' ? 44 : 56);

  const [shop, setShop] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [isClientAccount, setIsClientAccount] = useState(false);

  useEffect(() => {
    loadData();
  }, [shopId]);

  const loadData = async () => {
    try {
      const token = await AsyncStorage.getItem('@access_token');
      const storedUserId = await AsyncStorage.getItem('@user_id');
      const storedIsShop = await AsyncStorage.getItem('@is_shop');

      if (!token) {
        const shopData = await getShopById(shopId, null);
        setShop(shopData);
        setIsOwner(false);
        setIsClientAccount(false);
        setVehicles([]);
        return;
      }

      const isShopAccount = storedIsShop === 'true';
      setIsClientAccount(!isShopAccount);

      const shopData = await getShopById(shopId, token);
      setShop(shopData);

      const uid = storedUserId ? parseInt(storedUserId, 10) : null;
      const owners = Array.isArray(shopData.users) ? shopData.users : [];
      setIsOwner(
        uid != null && owners.some((u) => Number(u?.id ?? u) === uid)
      );

      if (!isShopAccount) {
        const vehicleData = await getVehicles(token);
        setVehicles(vehicleData);
      } else {
        setVehicles([]);
      }
    } catch (error) {
      console.error('Failed to load shop detail:', error);
      Alert.alert('Error', 'Failed to load service details.');
    } finally {
      setLoading(false);
    }
  };

  const toggleAuthorization = async (vehicle) => {
    const token = await AsyncStorage.getItem('@access_token');
    const isAuthorized = vehicle.shared_with_shops.some((s) => Number(s.id) === Number(shopId));

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
    } catch (_error) {
      Alert.alert('Error', 'Failed to update authorization.');
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

  if (loading || !shop) {
    return (
      <ScreenBackground safeArea={false}>
        <View style={styles.center}>
          <ActivityIndicator animating size="large" color="#fff" />
        </View>
      </ScreenBackground>
    );
  }

  const serviceName = (shop.name && String(shop.name).trim()) || GENERIC_TERM;
  const subtitleType =
    presentationServiceCenterType(shop.service_center_type) ?? GENERIC_TERM;
  const shortDesc =
    typeof shop.short_description === 'string' ? shop.short_description.trim() : '';
  const addr = typeof shop.address === 'string' ? shop.address.trim() : '';
  const phone =
    (typeof shop.display_phone === 'string' && shop.display_phone.trim()) ||
    (typeof shop.phone_e164 === 'string' && shop.phone_e164.trim()) ||
    (typeof shop.phone === 'string' && shop.phone.trim()) ||
    '';
  const seoPlace =
    (typeof shop.seo_city === 'string' && shop.seo_city.trim()) ||
    (typeof shop.city_name === 'string' && shop.city_name.trim()) ||
    '';

  const locationForAbout =
    addr || seoPlace ? (addr || seoPlace) : '';

  const aboutLead =
    locationForAbout
      ? `${serviceName} is a ${subtitleType} located in ${locationForAbout}.`
      : `${serviceName} is a ${subtitleType}.`;

  const longDescription =
    typeof shop.description === 'string' ? shop.description.trim() : '';

  const ratingSnippet = formatRatingSnippet(shop.average_rating, shop.review_count);
  const completedCount =
    shop.completed_repairs_count != null && shop.completed_repairs_count !== ''
      ? Number(shop.completed_repairs_count)
      : null;

  const repairNames = collectRepairNames(shop);
  const vehicleNames = collectVehicleTypeNames(shop);
  const hoursRows = workingHoursEntries(shop.working_hours).filter((r) => r?.label && r?.text != null);

  const imagesList = Array.isArray(shop.images) ? shop.images : [];

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
          { paddingTop: headerUnderlay + 8 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <AppCard variant="dark" contentStyle={styles.heroInner}>
          <View style={styles.heroTitleRow}>
            <Text style={styles.heroTitle}>{serviceName}</Text>
            {shop.is_verified ? <StatusBadge status="verified" /> : null}
          </View>
          <Text style={styles.heroSubtitle}>{subtitleType}</Text>
          {!!shortDesc && <Text style={styles.heroShortDesc}>{shortDesc}</Text>}
          {shop.offers_guarantee ? (
            <View style={styles.guaranteeRow}>
              <MaterialCommunityIcons name="shield-check" size={18} color="rgba(255,255,255,0.88)" />
              <Text style={styles.guaranteeText}>Offers guarantees</Text>
            </View>
          ) : null}

          <Divider style={styles.heroDivider} />

          {addr ? (
            <View style={styles.heroIconRow}>
              <MaterialCommunityIcons name="map-marker-outline" size={22} color="rgba(255,255,255,0.92)" />
              <View style={styles.heroCol}>
                <Text style={styles.heroRowText}>{addr}</Text>
                {normalizeUrl(shop.google_maps_url) ? (
                  <Pressable onPress={() => openExternal('Maps', shop.google_maps_url)} hitSlop={6}>
                    <Text style={styles.mapsLink}>Open in Maps</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
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

        <SectionHeading title="Vehicle types" />
        <FloatingCard>
          {vehicleNames.length ? (
            <ChipWrap labels={vehicleNames} />
          ) : (
            <Text style={styles.placeholderMuted}>Vehicle types not added yet</Text>
          )}
        </FloatingCard>

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

        {isOwner ? (
          <Button
            mode="contained-tonal"
            onPress={() => navigation.navigate('ShopProfile')}
            style={styles.manageProfileBtn}
          >
            Edit service profile
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
            <SectionHeading title="Authorize this Service Center" />
            <FloatingCard>
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
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: { flex: 1, backgroundColor: 'transparent' },
  listContent: {
    paddingHorizontal: 12,
    paddingBottom: 32,
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
  mapsLink: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: '700',
    color: '#93c5fd',
    textDecorationLine: 'underline',
  },
  heroRowText: {
    fontSize: 14,
    lineHeight: 20,
    color: 'rgba(255,255,255,0.95)',
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
  vehicleRow: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(15,23,42,0.08)',
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
