import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Chip, Text } from 'react-native-paper';

import { formatDistanceAway, distanceKmFromUser } from '../../utils/distance';
import { isShopOpenNow } from '../../utils/shopOpenNow';
import VeversalScoreBadge from './VeversalScoreBadge';
import { COLORS } from '../../styles/colors';

export default function ServiceCenterListCard({
  shop,
  selected = false,
  userLocation = null,
  onPress,
  onDirections,
}) {
  const distanceKm = shop.distance_km ?? distanceKmFromUser(userLocation, shop);
  const distanceLabel = formatDistanceAway(distanceKm);
  const openNow = shop.is_open_now ?? isShopOpenNow(shop.working_hours);
  const isVerified = shop.is_verified || shop.verification_status === 'verified_partner';
  const isReported = shop.source === 'owner_reported';
  const vehicleTypes = (shop.supported_vehicle_type_names || []).slice(0, 3).join(', ');
  const services = (shop.observed_repair_type_names || shop.available_repair_names || [])
    .slice(0, 3)
    .join(', ');
  const brands = (shop.brand_names || []).slice(0, 2).join(', ');

  return (
    <View style={[styles.card, selected && styles.cardSelected]}>
      <View style={styles.headerRow}>
        <Text style={styles.name} numberOfLines={1} onPress={onPress}>
          {shop.name}
        </Text>
        <VeversalScoreBadge score={shop.versal_score} compact />
      </View>

      {shop.address ? (
        <Text style={styles.muted} numberOfLines={2}>
          {shop.address}
        </Text>
      ) : null}

      <View style={styles.metaRow}>
        {distanceLabel ? <Text style={styles.meta}>{distanceLabel}</Text> : null}
        {shop.average_rating > 0 ? (
          <Text style={styles.meta}>
            {Number(shop.average_rating).toFixed(1)} ★ ({shop.review_count || 0})
          </Text>
        ) : null}
        {openNow === true ? (
          <Chip compact style={styles.openChip} textStyle={styles.openChipText}>
            Open now
          </Chip>
        ) : null}
        {openNow === false ? <Text style={styles.closed}>Closed</Text> : null}
      </View>

      {vehicleTypes ? <Text style={styles.tags}>Vehicles: {vehicleTypes}</Text> : null}
      {brands ? <Text style={styles.tags}>Brands: {brands}</Text> : null}
      {services ? <Text style={styles.tags}>Services: {services}</Text> : null}

      <View style={styles.badgeRow}>
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
        <Text style={styles.actionLink} onPress={onPress}>
          View profile
        </Text>
        {onDirections ? (
          <Text style={styles.actionLink} onPress={onDirections}>
            Directions
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(15,23,42,0.12)',
    cursor: 'pointer',
  },
  cardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(226,237,255,0.35)',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  name: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  muted: {
    marginTop: 4,
    color: '#64748b',
    fontSize: 13,
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
  closed: {
    fontSize: 12,
    color: '#b91c1c',
    fontWeight: '600',
  },
  tags: {
    marginTop: 4,
    fontSize: 12,
    color: '#475569',
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
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
    gap: 16,
    marginTop: 10,
  },
  actionLink: {
    color: COLORS.primary,
    fontWeight: '700',
    fontSize: 13,
    cursor: 'pointer',
  },
});
