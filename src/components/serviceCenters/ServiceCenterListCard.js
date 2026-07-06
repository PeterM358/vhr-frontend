import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Chip, Text } from 'react-native-paper';

import { formatDistanceAway, distanceKmFromUser } from '../../utils/distance';
import { isShopOpenNow } from '../../utils/shopOpenNow';
import VeversalScoreBadge from './VeversalScoreBadge';
import { COLORS } from '../../styles/colors';

function summarizeList(items, maxVisible = 3) {
  const list = (items || []).filter(Boolean);
  if (!list.length) return { visible: '', moreCount: 0 };
  const visible = list.slice(0, maxVisible).join(', ');
  const moreCount = Math.max(0, list.length - maxVisible);
  return { visible, moreCount };
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
  const distanceKm = showDistance
    ? shop.distance_km ?? distanceKmFromUser(userLocation, shop)
    : null;
  const distanceLabel = showDistance
    ? formatDistanceAway(distanceKm) || 'Distance unavailable'
    : 'Set location to see distance';
  const openNow = shop.is_open_now ?? isShopOpenNow(shop.working_hours);
  const isVerified = shop.is_verified || shop.verification_status === 'verified_partner';
  const isReported = shop.source === 'owner_reported';
  const allBrands = shop.all_brands_serviced || (shop.brand_names || []).includes('All brands');
  const vehicleTypes = (shop.supported_vehicle_type_names || []).join(', ');
  const serviceNames = shop.observed_repair_type_names || shop.available_repair_names || [];
  const brandNames = allBrands ? ['All brands'] : shop.brand_names || [];
  const services = summarizeList(serviceNames, 3);
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
            Open now
          </Chip>
        ) : null}
        {openNow === false ? <Text style={styles.closed}>Closed</Text> : null}
      </View>

      {vehicleTypes ? <Text style={styles.tags}>Vehicles: {vehicleTypes}</Text> : null}

      {services.visible ? (
        <Text style={styles.tags}>
          Services: {services.visible}
          {services.moreCount > 0 ? ` +${services.moreCount} more` : ''}
        </Text>
      ) : null}

      {brands.visible ? (
        <Text style={styles.tags}>
          Brands: {brands.visible}
          {brands.moreCount > 0 ? ` +${brands.moreCount} more` : ''}
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
            Verified
          </Chip>
        ) : null}
        {isReported ? (
          <Chip compact icon="alert-outline" style={styles.reportedChip}>
            Owner reported
          </Chip>
        ) : null}
      </View>

      <View style={styles.actions}>
        <Pressable onPress={onViewProfile} style={styles.actionButton}>
          <Text style={styles.actionLink}>View profile</Text>
        </Pressable>
        {onDirections ? (
          <Pressable onPress={onDirections} style={styles.actionButton}>
            <Text style={styles.actionLink}>Directions</Text>
          </Pressable>
        ) : null}
        {onRequestService ? (
          <Pressable onPress={onRequestService} style={styles.actionButton}>
            <Text style={styles.actionLink}>Request service</Text>
          </Pressable>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(15,23,42,0.1)',
    shadowColor: '#0f172a',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    cursor: 'pointer',
  },
  cardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(226,237,255,0.42)',
    shadowOpacity: 0.12,
  },
  cardPressed: {
    opacity: 0.96,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  name: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: '#0f172a',
  },
  muted: {
    marginTop: 4,
    color: '#64748b',
    fontSize: 13,
    lineHeight: 18,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
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
    marginTop: 6,
    fontSize: 12,
    color: '#475569',
    lineHeight: 17,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
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
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e2e8f0',
  },
  actionButton: {
    paddingVertical: 2,
    paddingHorizontal: 2,
    cursor: 'pointer',
  },
  actionLink: {
    color: COLORS.primary,
    fontWeight: '700',
    fontSize: 13,
  },
});
