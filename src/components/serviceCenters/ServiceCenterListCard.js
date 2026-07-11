import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Chip, Text } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import { formatDistanceAway, discoveryDistanceKm } from '../../utils/distance';
import { isShopOpenNow } from '../../utils/shopOpenNow';
import VeversalScoreBadge from './VeversalScoreBadge';
import { COLORS } from '../../styles/colors';
import { useTranslation } from '../../i18n';
import { joinList } from '../../i18n/joinLocalizedList';
import { translateRepairTypeLabels, translateVehicleTypePublicLabels } from '../../utils/translateShopTypeLabels';
import DISCOVERY_MOBILE, { discoveryMinFont } from './discoveryMobileTokens';

function summarizeList(items, maxVisible = 3, { joinFn } = {}) {
  const list = (items || []).filter(Boolean);
  if (!list.length) return { visible: '', moreCount: 0 };
  const visibleItems = list.slice(0, maxVisible);
  const visible = typeof joinFn === 'function' ? joinFn(visibleItems) : visibleItems.join(', ');
  const moreCount = Math.max(0, list.length - maxVisible);
  return { visible, moreCount };
}

function CardActionButton({ label, icon, onPress, primary = false, mobile = false }) {
  return (
    <Pressable
      onPress={(e) => {
        e?.stopPropagation?.();
        onPress?.();
      }}
      style={({ pressed }) => [
        styles.actionBtn,
        primary ? styles.actionBtnPrimary : styles.actionBtnSecondary,
        mobile && (primary ? styles.actionBtnPrimaryMobile : styles.actionBtnMobile),
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
  compact = false,
  mobile = false,
  hideActions = false,
  onClose,
  onPress,
  onViewProfile,
  onDirections,
  onRequestService,
}) {
  const { t } = useTranslation();

  const distanceKm = showDistance
    ? discoveryDistanceKm(userLocation, shop)
    : null;
  const distanceLabel = showDistance
    ? formatDistanceAway(distanceKm) || t('serviceCenters.distanceUnavailable')
    : null;
  const openNow = shop.is_open_now ?? isShopOpenNow(shop.working_hours);
  const isVerified = shop.is_verified || shop.verification_status === 'verified_partner';
  const isReported = shop.source === 'owner_reported';
  const allBrands = shop.all_brands_serviced || (shop.brand_names || []).includes('All brands');
  const vehicleTypesTranslated = translateVehicleTypePublicLabels(shop.supported_vehicle_type_names || [], t);
  const vehicleTypes = vehicleTypesTranslated.length ? joinList(vehicleTypesTranslated, { t }) : '';
  const serviceNamesRaw = shop.observed_repair_type_names || shop.available_repair_names || [];
  const serviceNames = translateRepairTypeLabels(serviceNamesRaw, t);
  const brandNames = allBrands ? [t('serviceCenters.allBrands')] : shop.brand_names || [];
  const services = summarizeList(serviceNames, mobile || compact ? 2 : 3, {
    joinFn: (items) => joinList(items, { t }),
  });
  const brands = summarizeList(brandNames, 3);
  const locationLine = [shop.address, shop.city_name].filter(Boolean).join(' · ');

  const requestAction = onRequestService ? (
    <CardActionButton
      label={t('serviceCenters.requestService')}
      icon="wrench-outline"
      onPress={onRequestService}
      primary
      mobile={mobile}
    />
  ) : null;

  const secondaryActions = (
    <>
      {onViewProfile ? (
        <CardActionButton
          label={t('serviceCenters.viewProfile')}
          icon="store-outline"
          onPress={onViewProfile}
          mobile={mobile}
        />
      ) : null}
      {onDirections ? (
        <CardActionButton label={t('serviceCenters.directions')} icon="directions" onPress={onDirections} mobile={mobile} />
      ) : null}
    </>
  );

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        mobile && styles.cardMobile,
        compact && styles.cardCompact,
        selected && styles.cardSelected,
        pressed && styles.cardPressed,
      ]}
    >
      <View style={styles.headerRow}>
        <Text
          style={[styles.name, (compact || mobile) && styles.nameCompact, onClose && styles.nameWithClose]}
          numberOfLines={onClose ? 2 : 1}
        >
          {shop.name}
        </Text>
        {isVerified ? (
          <View style={styles.verifiedBadge}>
            <MaterialCommunityIcons name="shield-check" size={13} color="#0369a1" />
            <Text style={styles.verifiedBadgeText}>{t('serviceCenters.verified')}</Text>
          </View>
        ) : null}
        <VeversalScoreBadge score={shop.versal_score} compact />
        {onClose ? (
          <Pressable
            onPress={(e) => {
              e?.stopPropagation?.();
              onClose();
            }}
            style={({ pressed }) => [styles.closeBtn, pressed && styles.closeBtnPressed]}
            accessibilityRole="button"
            accessibilityLabel={t('serviceCenters.closeSelectedPanelA11y')}
            hitSlop={8}
          >
            <MaterialCommunityIcons name="close" size={20} color={DISCOVERY_MOBILE.color.textMuted} />
          </Pressable>
        ) : null}
      </View>

      {locationLine ? (
        <Text
          style={[styles.location, (compact || mobile) && styles.locationCompact]}
          numberOfLines={compact ? 1 : 2}
        >
          {locationLine}
        </Text>
      ) : null}

      <View style={[styles.metaRow, mobile && styles.metaRowMobile]}>
        {shop.average_rating > 0 ? (
          <Text style={styles.meta}>
            {Number(shop.average_rating).toFixed(1)} ★ ({shop.review_count || 0})
          </Text>
        ) : null}
        {openNow === true ? (
          <Chip compact style={styles.openChip} textStyle={styles.openChipText}>
            {t('serviceCenters.openNow')}
          </Chip>
        ) : null}
        {openNow === false ? <Text style={styles.closed}>{t('serviceCenters.closed')}</Text> : null}
        {distanceLabel ? <Text style={styles.distanceHint}>{distanceLabel}</Text> : null}
      </View>

      {vehicleTypes ? (
        <Text style={[styles.tags, (compact || mobile) && styles.tagsCompact]} numberOfLines={compact ? 1 : 2}>
          {t('serviceCenterList.vehiclesLabel', { vehicles: vehicleTypes })}
        </Text>
      ) : null}

      {services.visible ? (
        <Text style={[styles.tags, (compact || mobile) && styles.tagsCompact]} numberOfLines={compact ? 1 : 2}>
          {t('serviceCenterList.servicesLabel', { services: services.visible })}
          {services.moreCount > 0 ? t('serviceCenterList.moreCount', { count: services.moreCount }) : ''}
        </Text>
      ) : null}

      {!compact && !mobile && brands.visible ? (
        <Text style={styles.tags}>
          {t('serviceCenters.brandsLabel', { brands: brands.visible })}
          {brands.moreCount > 0 ? t('serviceCenterList.moreCount', { count: brands.moreCount }) : ''}
        </Text>
      ) : null}

      {!compact && !mobile ? (
        <View style={styles.badgeRow}>
          {isReported ? (
            <Chip compact icon="alert-outline" style={styles.reportedChip}>
              {t('serviceCenters.ownerReported')}
            </Chip>
          ) : null}
        </View>
      ) : null}

      {!hideActions ? (
        <View style={[styles.actions, (compact || mobile) && styles.actionsCompact, mobile && styles.actionsMobile]}>
          {mobile ? (
            <>
              {requestAction}
              <View style={styles.secondaryRow}>{secondaryActions}</View>
            </>
          ) : (
            <>
              {secondaryActions}
              {requestAction}
            </>
          )}
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: DISCOVERY_MOBILE.radius.card,
    padding: 16,
    marginBottom: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(15,23,42,0.08)',
    ...DISCOVERY_MOBILE.shadow.card,
    cursor: 'pointer',
  },
  cardMobile: {
    padding: 14,
    marginBottom: 12,
  },
  cardCompact: {
    padding: 12,
    marginBottom: 10,
    borderRadius: 15,
  },
  cardSelected: {
    borderColor: DISCOVERY_MOBILE.color.selectedBorder,
    borderWidth: 1,
    backgroundColor: DISCOVERY_MOBILE.color.selectedTint,
    ...DISCOVERY_MOBILE.shadow.cardSelected,
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
  nameCompact: {
    fontSize: discoveryMinFont(15),
  },
  nameWithClose: {
    fontSize: discoveryMinFont(16),
    lineHeight: 21,
  },
  closeBtn: {
    width: 44,
    height: 44,
    marginTop: -10,
    marginRight: -10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: 'rgba(148,163,184,0.12)',
  },
  closeBtnPressed: {
    opacity: 0.85,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e0f2fe',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginRight: 6,
    gap: 3,
  },
  verifiedBadgeText: {
    fontSize: discoveryMinFont(10),
    fontWeight: '700',
    color: '#0369a1',
  },
  location: {
    marginTop: 4,
    color: DISCOVERY_MOBILE.color.textMuted,
    fontSize: discoveryMinFont(13),
    lineHeight: 18,
  },
  locationCompact: {
    marginTop: 2,
    fontSize: discoveryMinFont(12),
    lineHeight: 16,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  metaRowMobile: {
    marginTop: 6,
    gap: 6,
  },
  meta: {
    fontSize: discoveryMinFont(12),
    color: '#334155',
    fontWeight: '600',
  },
  distanceHint: {
    fontSize: discoveryMinFont(12),
    color: DISCOVERY_MOBILE.color.textSubtle,
    fontWeight: '500',
  },
  closed: {
    fontSize: discoveryMinFont(12),
    color: '#b91c1c',
    fontWeight: '600',
  },
  tags: {
    marginTop: 8,
    fontSize: discoveryMinFont(12),
    color: '#475569',
    lineHeight: 18,
  },
  tagsCompact: {
    marginTop: 6,
    lineHeight: 16,
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
    fontSize: discoveryMinFont(11),
    color: '#166534',
    marginVertical: 0,
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
  actionsCompact: {
    marginTop: 10,
    paddingTop: 10,
  },
  actionsMobile: {
    flexDirection: 'column',
    gap: 8,
    flexShrink: 0,
  },
  secondaryRow: {
    flexDirection: 'row',
    gap: 8,
    alignSelf: 'stretch',
    flexShrink: 0,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: DISCOVERY_MOBILE.radius.cta,
    cursor: 'pointer',
  },
  actionBtnMobile: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: DISCOVERY_MOBILE.height.cta,
    paddingHorizontal: 12,
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
  actionBtnPrimaryMobile: {
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: DISCOVERY_MOBILE.height.cta,
    paddingHorizontal: 12,
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
    fontSize: discoveryMinFont(12),
  },
  actionBtnTextPrimary: {
    color: '#fff',
  },
});
