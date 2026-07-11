/**
 * Compact premium selected-service panel for native map-first discovery.
 */
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import { discoveryDistanceKm, formatDistanceAway } from '../../utils/distance';
import { isShopOpenNow } from '../../utils/shopOpenNow';
import VeversalScoreBadge from './VeversalScoreBadge';
import { COLORS } from '../../styles/colors';
import { useTranslation } from '../../i18n';
import { joinList } from '../../i18n/joinLocalizedList';
import { translateRepairTypeLabels, translateVehicleTypePublicLabels } from '../../utils/translateShopTypeLabels';
import DISCOVERY_MOBILE, { discoveryMinFont } from './discoveryMobileTokens';

function PanelActionButton({ label, icon, onPress, primary = false }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionBtn,
        primary ? styles.actionBtnPrimary : styles.actionBtnSecondary,
        pressed && styles.actionBtnPressed,
      ]}
      accessibilityRole="button"
    >
      <MaterialCommunityIcons
        name={icon}
        size={16}
        color={primary ? '#fff' : COLORS.primary}
        style={styles.actionBtnIcon}
      />
      <Text style={[styles.actionBtnText, primary && styles.actionBtnTextPrimary]}>{label}</Text>
    </Pressable>
  );
}

export default function DiscoverySelectedServicePanel({
  shop,
  userLocation = null,
  showDistance = false,
  onClose,
  onViewProfile,
  onDirections,
  onRequestService,
}) {
  const { t } = useTranslation();

  if (!shop) return null;

  const distanceKm = showDistance ? discoveryDistanceKm(userLocation, shop) : null;
  const distanceLabel = showDistance
    ? formatDistanceAway(distanceKm) || t('serviceCenters.distanceUnavailable')
    : null;
  const openNow = shop.is_open_now ?? isShopOpenNow(shop.working_hours);
  const isVerified = shop.is_verified || shop.verification_status === 'verified_partner';
  const vehicleTypesTranslated = translateVehicleTypePublicLabels(shop.supported_vehicle_type_names || [], t);
  const vehicleSummary = vehicleTypesTranslated.length ? joinList(vehicleTypesTranslated, { t }) : '';
  const serviceNamesRaw = shop.observed_repair_type_names || shop.available_repair_names || [];
  const serviceNames = translateRepairTypeLabels(serviceNamesRaw, t);
  const serviceSummary = serviceNames.length ? joinList(serviceNames.slice(0, 2), { t }) : '';
  const locationLine = [shop.address, shop.city_name].filter(Boolean).join(' · ');
  const hasRating = shop.average_rating > 0;

  return (
    <View style={styles.panel}>
      <View style={styles.headerRow}>
        <Text style={styles.name} numberOfLines={2}>
          {shop.name}
        </Text>
        <Pressable
          onPress={onClose}
          style={({ pressed }) => [styles.closeBtn, pressed && styles.closeBtnPressed]}
          accessibilityRole="button"
          accessibilityLabel={t('serviceCenters.closeSelectedPanelA11y')}
          hitSlop={8}
        >
          <MaterialCommunityIcons name="close" size={20} color={DISCOVERY_MOBILE.color.textMuted} />
        </Pressable>
      </View>

      <View style={styles.metaRow}>
        {openNow === true ? (
          <View style={styles.openBadge}>
            <Text style={styles.openBadgeText}>{t('serviceCenters.openNow')}</Text>
          </View>
        ) : null}
        {openNow === false ? <Text style={styles.closed}>{t('serviceCenters.closed')}</Text> : null}
        {isVerified ? (
          <View style={styles.verifiedBadge}>
            <MaterialCommunityIcons name="shield-check" size={12} color="#0369a1" />
            <Text style={styles.verifiedBadgeText}>{t('serviceCenters.verified')}</Text>
          </View>
        ) : null}
        {hasRating ? (
          <Text style={styles.rating}>
            {Number(shop.average_rating).toFixed(1)} ★ ({shop.review_count || 0})
          </Text>
        ) : null}
        <VeversalScoreBadge score={shop.versal_score} compact />
      </View>

      {locationLine ? (
        <Text style={styles.location} numberOfLines={2}>
          {locationLine}
        </Text>
      ) : null}

      {distanceLabel ? (
        <Text
          style={[
            styles.distance,
            distanceKm == null && styles.distanceUnavailable,
          ]}
          numberOfLines={1}
        >
          {distanceLabel}
        </Text>
      ) : null}

      {vehicleSummary ? (
        <Text style={styles.summary} numberOfLines={1}>
          {t('serviceCenterList.vehiclesLabel', { vehicles: vehicleSummary })}
        </Text>
      ) : null}

      {serviceSummary ? (
        <Text style={styles.summary} numberOfLines={1}>
          {t('serviceCenterList.servicesLabel', { services: serviceSummary })}
        </Text>
      ) : null}

      <View style={styles.actions}>
        {onRequestService ? (
          <PanelActionButton
            label={t('serviceCenters.requestService')}
            icon="wrench-outline"
            onPress={onRequestService}
            primary
          />
        ) : null}
        <View style={styles.secondaryRow}>
          {onViewProfile ? (
            <PanelActionButton
              label={t('serviceCenters.viewProfile')}
              icon="store-outline"
              onPress={onViewProfile}
            />
          ) : null}
          {onDirections ? (
            <PanelActionButton
              label={t('serviceCenters.directions')}
              icon="directions"
              onPress={onDirections}
            />
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: DISCOVERY_MOBILE.color.panelBg,
    borderRadius: DISCOVERY_MOBILE.radius.card,
    borderWidth: 1,
    borderColor: DISCOVERY_MOBILE.color.panelBorder,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
    ...DISCOVERY_MOBILE.shadow.cardSelected,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 6,
  },
  name: {
    flex: 1,
    fontSize: discoveryMinFont(16),
    fontWeight: '700',
    color: DISCOVERY_MOBILE.color.text,
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
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  openBadge: {
    backgroundColor: '#dcfce7',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  openBadgeText: {
    fontSize: discoveryMinFont(11),
    fontWeight: '700',
    color: '#166534',
  },
  closed: {
    fontSize: discoveryMinFont(11),
    fontWeight: '600',
    color: '#b91c1c',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#e0f2fe',
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  verifiedBadgeText: {
    fontSize: discoveryMinFont(10),
    fontWeight: '700',
    color: '#0369a1',
  },
  rating: {
    fontSize: discoveryMinFont(12),
    fontWeight: '600',
    color: '#334155',
  },
  location: {
    marginTop: 2,
    fontSize: discoveryMinFont(12),
    lineHeight: 17,
    color: DISCOVERY_MOBILE.color.textMuted,
  },
  distance: {
    marginTop: 4,
    fontSize: discoveryMinFont(12),
    fontWeight: '500',
    color: DISCOVERY_MOBILE.color.textSubtle,
  },
  distanceUnavailable: {
    fontStyle: 'italic',
  },
  summary: {
    marginTop: 4,
    fontSize: discoveryMinFont(12),
    lineHeight: 16,
    color: '#475569',
  },
  actions: {
    marginTop: 12,
    gap: 8,
  },
  secondaryRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 46,
    paddingHorizontal: 12,
    borderRadius: DISCOVERY_MOBILE.radius.cta,
  },
  actionBtnPrimary: {
    backgroundColor: COLORS.primary,
    borderWidth: 1,
    borderColor: COLORS.primaryDark,
  },
  actionBtnSecondary: {
    backgroundColor: DISCOVERY_MOBILE.color.surface,
    borderWidth: 1,
    borderColor: DISCOVERY_MOBILE.color.border,
  },
  actionBtnPressed: {
    opacity: 0.9,
  },
  actionBtnIcon: {
    marginRight: 6,
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
