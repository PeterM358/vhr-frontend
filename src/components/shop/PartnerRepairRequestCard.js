/**
 * Compact partner dashboard card for repair requests across lifecycle states.
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Button } from 'react-native-paper';
import FloatingCard from '../ui/FloatingCard';
import { COLORS } from '../../constants/colors';
import { DEFAULT_CURRENCY, formatMoneyAmount } from '../../constants/currency';
import {
  PARTNER_LIFECYCLE,
  getLifecyclePill,
  formatTimeSince,
  resolvePartnerLifecycle,
} from '../../utils/partnerRepairLifecycle';

function formatVisitTime(repair) {
  const visit =
    repair?.current_offer_visit_time ||
    repair?.scheduled_start ||
    null;
  if (!visit) return null;
  const date = new Date(visit);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatOfferAmount(repair) {
  const amount = repair?.current_offer_amount;
  if (amount == null || amount === '') return null;
  const currency = repair?.current_offer_currency || DEFAULT_CURRENCY;
  return formatMoneyAmount(amount, currency);
}

export default function PartnerRepairRequestCard({
  repair,
  canSendOffers = true,
  onPressDetails,
  onPressOffer,
  onPressPrimary,
}) {
  if (!repair || repair.id == null) {
    return null;
  }

  const lifecycle = resolvePartnerLifecycle(repair);
  const pill = getLifecyclePill(repair);
  const plate = String(repair?.vehicle_license_plate || '').trim();
  const title =
    `${repair?.vehicle_make || ''} ${repair?.vehicle_model || ''}`.trim() || 'Vehicle';
  const description = String(repair?.description || '').trim();
  const timeSince = formatTimeSince(repair?.created_at);
  const offerAmount = formatOfferAmount(repair);
  const visitTime = formatVisitTime(repair);

  const showOfferSummary =
    lifecycle === PARTNER_LIFECYCLE.OFFER_SENT || lifecycle === PARTNER_LIFECYCLE.OFFER_ACCEPTED;

  let primaryLabel = null;
  let primaryAction = null;
  let secondaryLabel = 'Details';
  let showSecondary = true;

  switch (lifecycle) {
    case PARTNER_LIFECYCLE.WAITING_FOR_OFFER:
      primaryLabel = 'Send Offer';
      primaryAction = () => onPressOffer?.(repair);
      break;
    case PARTNER_LIFECYCLE.OFFER_SENT:
      primaryLabel = 'Edit Offer';
      primaryAction = () => onPressOffer?.(repair);
      break;
    case PARTNER_LIFECYCLE.OFFER_ACCEPTED:
      primaryLabel = 'Open Repair';
      primaryAction = () => (onPressPrimary || onPressDetails)?.(repair);
      break;
    case PARTNER_LIFECYCLE.IN_PROGRESS:
      primaryLabel = 'Continue Repair';
      primaryAction = () => (onPressPrimary || onPressDetails)?.(repair);
      break;
    case PARTNER_LIFECYCLE.COMPLETED:
      primaryLabel = 'View Repair';
      primaryAction = () => (onPressPrimary || onPressDetails)?.(repair);
      secondaryLabel = null;
      showSecondary = false;
      break;
    case PARTNER_LIFECYCLE.DECLINED:
      primaryLabel = null;
      break;
    default:
      primaryLabel = 'Details';
      primaryAction = () => onPressDetails?.(repair);
      showSecondary = false;
      break;
  }

  const offerDisabled =
    !canSendOffers &&
    (lifecycle === PARTNER_LIFECYCLE.WAITING_FOR_OFFER ||
      lifecycle === PARTNER_LIFECYCLE.OFFER_SENT);

  return (
    <FloatingCard style={styles.card}>
      <Pressable onPress={() => onPressDetails?.(repair)} accessibilityRole="button">
        <View style={styles.headerRow}>
          <View style={styles.headerText}>
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
            <Text style={styles.meta} numberOfLines={1}>
              {plate || 'Plate hidden until booking'}
              {timeSince ? ` · ${timeSince}` : ''}
            </Text>
          </View>
          <View style={[styles.pill, { backgroundColor: pill.bg }]}>
            <Text style={[styles.pillText, { color: pill.fg }]} numberOfLines={2}>
              {pill.label}
            </Text>
          </View>
        </View>

        {description ? (
          <Text style={styles.description} numberOfLines={2}>
            {description}
          </Text>
        ) : null}

        {showOfferSummary && (offerAmount || visitTime) ? (
          <Text style={styles.offerSummary} numberOfLines={2}>
            {[offerAmount, visitTime ? `Visit ${visitTime}` : null].filter(Boolean).join(' · ')}
          </Text>
        ) : null}

        {lifecycle === PARTNER_LIFECYCLE.OFFER_ACCEPTED && visitTime ? (
          <Text style={styles.offerSummary} numberOfLines={1}>
            Appointment {visitTime}
          </Text>
        ) : null}
      </Pressable>

      {(primaryLabel || showSecondary) && (
        <View style={styles.actions}>
          {primaryLabel ? (
            <Button
              mode="contained"
              compact
              disabled={offerDisabled}
              onPress={primaryAction}
              style={styles.primaryBtn}
            >
              {primaryLabel}
            </Button>
          ) : null}
          {showSecondary && secondaryLabel ? (
            <Button
              mode="text"
              compact
              onPress={() => onPressDetails?.(repair)}
              textColor={COLORS.PRIMARY}
            >
              {secondaryLabel}
            </Button>
          ) : null}
        </View>
      )}
    </FloatingCard>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.TEXT_DARK,
  },
  meta: {
    fontSize: 12,
    color: COLORS.TEXT_MUTED,
    marginTop: 2,
  },
  pill: {
    maxWidth: 132,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  pillText: {
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
  },
  description: {
    fontSize: 13,
    color: COLORS.TEXT_MUTED,
    lineHeight: 18,
    marginTop: 6,
  },
  offerSummary: {
    fontSize: 12,
    color: COLORS.TEXT_DARK,
    marginTop: 4,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  primaryBtn: {
    borderRadius: 8,
  },
});
