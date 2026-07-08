import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Chip, Text } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import { formatDistanceAway, distanceKmFromUser } from '../../utils/distance';
import { isShopOpenNow } from '../../utils/shopOpenNow';
import VeversalScoreBadge from './VeversalScoreBadge';
import { COLORS } from '../../styles/colors';
import { useTranslation } from '../../i18n';
import { joinList } from '../../i18n/joinLocalizedList';
import { translateRepairTypeLabels, translateVehicleTypePublicLabels } from '../../utils/translateShopTypeLabels';

function summarizeList(items, maxVisible = 3, { joinFn } = {}) {
  const list = (items || []).filter(Boolean);
  if (!list.length) return { visible: '', moreCount: 0 };
  const visibleItems = list.slice(0, maxVisible);
  const visible = typeof joinFn === 'function' ? joinFn(visibleItems) : visibleItems.join(', ');
  const moreCount = Math.max(0, list.length - maxVisible);
  return { visible, moreCount };
}

function CardActionButton({ label, icon, onPress, primary = false }) {
  return (
    <Pressable
      onPress={(e) => {
        e?.stopPropagation?.();
        onPress?.();
      }}
      style={({ pressed }) => [
        styles.actionBtn,
        primary ? styles.actionBtnPrimary : styles.actionBtnSecondary,
        pressed && styles.actionBtnPressed,
      ]}
    >
      <MaterialCommunityIcons
        name={icon}
        size={15}
        color={primary ? '#fff' : COLORS.primary}
        style={styles.actionBtnIcon}
      />
      <Text style={[styles.actionBtnText, primary && styles.actionBtnTextPrimary]}>{label}</Text>
    </Pressable>
  );
}

export default function ServiceCenterListCard({
  shop,
  selected = false,
  userLocation = null,
  showDistance = false,
  onPress,
  onViewProfile,
  onDirections,
  onRequestService,
}) {
  const { t } = useTranslation();

  const distanceKm = showDistance
    ? shop.distance_km ?? distanceKmFromUser(userLocation, shop)
    : null;
  const distanceLabel = showDistance
    ? formatDistanceAway(distanceKm) || t('serviceCenters.distanceUnavailable')
    : t('serviceCenters.setLocationForDistance');
  const openNow = shop.is_open_now ?? isShopOpenNow(shop.working_hours);
  const isVerified = shop.is_verified || shop.verification_status === 'verified_partner';
  const isReported = shop.source === 'owner_reported';
  const allBrands = shop.all_brands_serviced || (shop.brand_names || []).includes('All brands');
  const vehicleTypesTranslated = translateVehicleTypePublicLabels(shop.supported_vehicle_type_names || [], t);
  const vehicleTypes = vehicleTypesTranslated.length ? joinList(vehicleTypesTranslated, { t }) : '';
  const serviceNamesRaw = shop.observed_repair_type_names || shop.available_repair_names || [];
  const serviceNames = translateRepairTypeLabels(serviceNamesRaw, t);
  const brandNames = allBrands ? [t('serviceCenters.allBrands')] : shop.brand_names || [];
  const services = summarizeList(serviceNames, 3, { joinFn: (items) => joinList(items, { t }) });
  const brands = summarizeList(brandNames, 3);
  const locationLine = [shop.address, shop.city_name].filter(Boolean).join(' · ');

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        selected && styles.cardSelected,
        pressed && styles.cardPressed,
      ]}
    >
      <View style={styles.headerRow}>
        <Text style={styles.name} numberOfLines={1}>
          {shop.name}
        </Text>
        <VeversalScoreBadge score={shop.versal_score} compact />
      </View>

      {locationLine ? (
        <Text style={styles.muted} numberOfLines={2}>
          {locationLine}
        </Text>
      ) : null}

      <View style={styles.metaRow}>
        <Text style={[styles.meta, !showDistance && styles.metaMuted]}>{distanceLabel}</Text>
        {openNow === true ? (
          <Chip compact style={styles.openChip} textStyle={styles.openChipText}>
            {t('serviceCenters.openNow')}
          </Chip>
        ) : null}
        {openNow === false ? <Text style={styles.closed}>{t('serviceCenters.closed')}</Text> : null}
      </View>

      {vehicleTypes ? (
        <Text style={styles.tags}>{t('serviceCenterList.vehiclesLabel', { vehicles: vehicleTypes })}</Text>
      ) : null}

      {services.visible ? (
        <Text style={styles.tags}>
          {t('serviceCenterList.servicesLabel', { services: services.visible })}
          {services.moreCount > 0 ? t('serviceCenterList.moreCount', { count: services.moreCount }) : ''}
        </Text>
      ) : null}

      {brands.visible ? (
        <Text style={styles.tags}>
          {t('serviceCenters.brandsLabel', { brands: brands.visible })}
          {brands.moreCount > 0 ? t('serviceCenterList.moreCount', { count: brands.moreCount }) : ''}
        </Text>
      ) : null}

      <View style={styles.badgeRow}>
        {shop.average_rating > 0 ? (
          <Chip compact style={styles.ratingChip} textStyle={styles.ratingChipText}>
            {Number(shop.average_rating).toFixed(1)} ★ ({shop.review_count || 0})
          </Chip>
        ) : null}
        {isVerified ? (
          <Chip compact icon="shield-check" style={styles.verifiedChip}>
            {t('serviceCenters.verified')}
          </Chip>
        ) : null}
        {isReported ? (
          <Chip compact icon="alert-outline" style={styles.reportedChip}>
            {t('serviceCenters.ownerReported')}
          </Chip>
        ) : null}
      </View>

      <View style={styles.actions}>
        <CardActionButton label={t('serviceCenters.viewProfile')} icon="store-outline" onPress={onViewProfile} />
        {onDirections ? (
          <CardActionButton label={t('serviceCenters.directions')} icon="directions" onPress={onDirections} />
        ) : null}
        {onRequestService ? (
          <CardActionButton
            label={t('serviceCenters.requestService')}
            icon="wrench-outline"
            onPress={onRequestService}
            primary
          />
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(15,23,42,0.1)',
    shadowColor: '#0f172a',
    shadowOpacity: 0.07,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    cursor: 'pointer',
  },
  cardSelected: {
    borderColor: COLORS.primary,
    borderWidth: 1.5,
    backgroundColor: 'rgba(226,237,255,0.5)',
    shadowOpacity: 0.14,
  },
  cardPressed: {
    opacity: 0.97,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 2,
  },
  name: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: '#0f172a',
  },
  muted: {
    marginTop: 6,
    color: '#64748b',
    fontSize: 13,
    lineHeight: 19,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  meta: {
    fontSize: 12,
    color: '#334155',
    fontWeight: '600',
  },
  metaMuted: {
    color: '#94a3b8',
    fontWeight: '500',
  },
  closed: {
    fontSize: 12,
    color: '#b91c1c',
    fontWeight: '600',
  },
  tags: {
    marginTop: 8,
    fontSize: 12,
    color: '#475569',
    lineHeight: 18,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 12,
  },
  openChip: {
    height: 24,
    backgroundColor: '#dcfce7',
  },
  openChipText: {
    fontSize: 11,
    color: '#166534',
    marginVertical: 0,
  },
  ratingChip: {
    height: 24,
    backgroundColor: '#fef9c3',
  },
  ratingChipText: {
    fontSize: 11,
    color: '#854d0e',
    marginVertical: 0,
  },
  verifiedChip: {
    height: 24,
    backgroundColor: '#e0f2fe',
  },
  reportedChip: {
    height: 24,
    backgroundColor: '#ffedd5',
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e2e8f0',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    cursor: 'pointer',
  },
  actionBtnSecondary: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  actionBtnPrimary: {
    backgroundColor: COLORS.primary,
    borderWidth: 1,
    borderColor: COLORS.primaryDark,
  },
  actionBtnPressed: {
    opacity: 0.88,
  },
  actionBtnIcon: {
    marginRight: 5,
  },
  actionBtnText: {
    color: COLORS.primary,
    fontWeight: '700',
    fontSize: 12,
  },
  actionBtnTextPrimary: {
    color: '#fff',
  },
});
