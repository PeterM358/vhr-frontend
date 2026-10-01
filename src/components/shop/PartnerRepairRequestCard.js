/**
 * Compact partner dashboard card for repair requests across lifecycle states.
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Button } from 'react-native-paper';
import FloatingCard from '../ui/FloatingCard';
import { COLORS } from '../../constants/colors';
import { DEFAULT_CURRENCY, formatMoneyAmount } from '../../constants/currency';
import { useTranslation } from '../../i18n';
import {
  PARTNER_LIFECYCLE,
  getLifecyclePill,
  formatTimeSince,
  resolvePartnerLifecycle,
} from '../../utils/partnerRepairLifecycle';
import { isLeadTeaserLocked } from '../../utils/partnerEntitlements';

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
  const { t } = useTranslation();

  if (!repair || repair.id == null) {
    return null;
  }

  const locked = isLeadTeaserLocked(repair);
  const teaserOperation = String(
    repair?.teaser_operation ||
      repair?.effective_repair_type_name ||
      repair?.final_repair_type_name ||
      repair?.repair_type_name ||
      ''
  ).trim();
  const teaserCity = String(repair?.teaser_city || repair?.broad_region || '').trim();

  if (locked) {
    return (
      <FloatingCard style={[styles.card, styles.lockedCard]}>
        <Pressable
          onPress={() => onPressOffer?.(repair)}
          accessibilityRole="button"
          accessibilityLabel={t('partnerDashboard.card.lockedA11y')}
        >
          <View style={styles.headerRow}>
            <View style={styles.headerText}>
              <Text style={styles.title} numberOfLines={1}>
                {teaserOperation || t('partnerDashboard.card.lockedRepairFallback')}
              </Text>
              <Text style={styles.meta} numberOfLines={1}>
                {teaserCity
                  ? t('partnerDashboard.card.lockedNearCity', { city: teaserCity })
                  : t('partnerDashboard.card.lockedNearby')}
              </Text>
            </View>
            <View style={[styles.pill, styles.lockedPill]}>
              <Text style={[styles.pillText, styles.lockedPillText]} numberOfLines={2}>
                {t('partnerDashboard.card.lockedBadge')}
              </Text>
            </View>
          </View>
          <Text style={styles.lockedHint} numberOfLines={2}>
            {t('partnerDashboard.card.lockedHint')}
          </Text>
          <View style={styles.blurMask} pointerEvents="none" />
        </Pressable>
        <View style={styles.actions}>
          <Button mode="contained" compact onPress={() => onPressOffer?.(repair)} style={styles.primaryBtn}>
            {t('partnerDashboard.card.lockedActivate')}
          </Button>
        </View>
      </FloatingCard>
    );
  }

  const lifecycle = resolvePartnerLifecycle(repair);
  const pill = getLifecyclePill(repair, t);
  const plate = String(repair?.vehicle_license_plate || '').trim();
  const title =
    `${repair?.vehicle_make || ''} ${repair?.vehicle_model || ''}`.trim() ||
    t('partnerDashboard.card.vehicleFallback');
  const description = String(repair?.description || '').trim();
  const timeSince = formatTimeSince(repair?.created_at, t);
  const offerAmount = formatOfferAmount(repair);
  const visitTime = formatVisitTime(repair);

  const showOfferSummary =
    lifecycle === PARTNER_LIFECYCLE.OFFER_SENT || lifecycle === PARTNER_LIFECYCLE.OFFER_ACCEPTED;

  let primaryLabel = null;
  let primaryAction = null;
  let secondaryLabel = t('partnerDashboard.actions.details');
  let showSecondary = true;

  switch (lifecycle) {
    case PARTNER_LIFECYCLE.WAITING_FOR_OFFER:
      primaryLabel = t('partnerDashboard.actions.sendOffer');
      primaryAction = () => onPressOffer?.(repair);
      break;
    case PARTNER_LIFECYCLE.OFFER_SENT:
      primaryLabel = t('partnerDashboard.actions.editOffer');
      primaryAction = () => onPressOffer?.(repair);
      break;
    case PARTNER_LIFECYCLE.OFFER_ACCEPTED:
      primaryLabel = t('partnerDashboard.actions.openRepair');
      primaryAction = () => (onPressPrimary || onPressDetails)?.(repair);
      break;
    case PARTNER_LIFECYCLE.IN_PROGRESS:
      primaryLabel = t('partnerDashboard.actions.continueRepair');
      primaryAction = () => (onPressPrimary || onPressDetails)?.(repair);
      break;
    case PARTNER_LIFECYCLE.COMPLETED:
      primaryLabel = t('partnerDashboard.viewRepair');
      primaryAction = () => (onPressPrimary || onPressDetails)?.(repair);
      secondaryLabel = null;
      showSecondary = false;
      break;
    case PARTNER_LIFECYCLE.DECLINED:
      primaryLabel = null;
      break;
    default:
      primaryLabel = t('partnerDashboard.actions.details');
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
              {plate || t('partnerDashboard.card.plateHidden')}
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
            {[offerAmount, visitTime ? t('partnerDashboard.card.visit', { time: visitTime }) : null]
              .filter(Boolean)
              .join(' · ')}
          </Text>
        ) : null}

        {lifecycle === PARTNER_LIFECYCLE.OFFER_ACCEPTED && visitTime ? (
          <Text style={styles.offerSummary} numberOfLines={1}>
            {t('partnerDashboard.card.appointment', { time: visitTime })}
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
  lockedCard: {
    overflow: 'hidden',
    opacity: 0.96,
  },
  blurMask: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(248,250,252,0.45)',
  },
  lockedHint: {
    fontSize: 12,
    color: COLORS.TEXT_MUTED,
    lineHeight: 17,
    marginTop: 8,
  },
  lockedPill: {
    backgroundColor: 'rgba(180,83,9,0.14)',
  },
  lockedPillText: {
    color: '#92400e',
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
