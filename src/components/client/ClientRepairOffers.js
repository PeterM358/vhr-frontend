import React, { useCallback, useEffect, useState, useContext, useMemo, useRef } from 'react';
import { View, Alert, RefreshControl, StyleSheet, FlatList, Pressable } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { WebSocketContext } from '../../context/WebSocketManager';
import { markNotificationRead } from '../../api/notifications';
import { getClientOffers, markOfferSeen } from '../../api/offers';
import { clientReportVehicleArrival, getRepairs, invalidateRepairsListCache } from '../../api/repairs';
import { Text, ActivityIndicator, Button } from 'react-native-paper';
import FloatingCard from '../ui/FloatingCard';
import EmptyStateCard from '../ui/EmptyStateCard';
import { COLORS } from '../../constants/colors';
import { formatOfferPricingLines, formatOfferPrimaryPrice } from '../../utils/offerPricing';

import ClientActionNeeded from './ClientActionNeeded';
import {
  isTerminalRepairStatus,
  isUpcomingAppointment,
  isVehicleAtShop,
  clientReportedArrival,
  normalizeRepairStatus,
} from '../../utils/repairArrival';
import { navigateToRepairDetail } from '../../navigation/webNavigation';
import { useTranslation } from '../../i18n';
import { translateRepairTypeLabel } from '../../utils/translateShopTypeLabels';
import { repairHistoryTotalLabel } from '../../utils/repairListUtils';

function isTerminalStatus(status) {
  return isTerminalRepairStatus(status);
}

function offerRepairStatus(offer, repairRow) {
  return normalizeRepairStatus(
    repairRow?.status || offer?.repair_status || offer?.repairStatus || null
  );
}

function ActivitySection({ title, hint, children }) {
  if (!children) return null;
  return (
    <View style={styles.sectionWrap}>
      <Text style={styles.sectionHeading}>{title}</Text>
      {hint ? <Text style={styles.sectionHint}>{hint}</Text> : null}
      {children}
    </View>
  );
}

function RepairSummaryCard({
  repair,
  onPress,
  badge,
  badgeStyle,
  sublabel,
  showCheckIn,
  onCheckIn,
  checkingIn,
  t,
  accent = false,
}) {
  const makeModel =
    `${repair.vehicle_make ?? ''} ${repair.vehicle_model ?? ''}`.trim();
  const plate = String(repair.vehicle_license_plate || '').trim();
  const title = makeModel || plate || t('repairs.vehicleFallback');
  const shop = repair.shop_profile_name || t('repairs.list.serviceCenterFallback');
  const serviceTypeName =
    repair.final_repair_type_name ||
    repair.effective_repair_type_name ||
    repair.repair_type_name ||
    repair.repair_type?.name ||
    null;
  const serviceType = serviceTypeName
    ? translateRepairTypeLabel(
        {
          name: serviceTypeName,
          repair_type_name: serviceTypeName,
          slug: repair.repair_type_slug || repair.effective_repair_type_slug,
        },
        t
      ) || serviceTypeName
    : null;
  const totalLabel = repairHistoryTotalLabel(repair);
  const checkedIn = clientReportedArrival(repair);

  return (
    <FloatingCard style={styles.summaryCard} accent={accent}>
      <Pressable onPress={onPress} style={({ pressed }) => [pressed && { opacity: 0.92 }]}>
        <Text style={styles.summaryTitle}>{title}</Text>
        {!!plate && makeModel ? <Text style={styles.summaryMeta}>{plate}</Text> : null}
        {serviceType ? <Text style={styles.summaryServiceType}>{serviceType}</Text> : null}
        {repair.scheduled_start ? (
          <Text style={styles.summaryHighlight}>
            {new Date(repair.scheduled_start).toLocaleString()}
          </Text>
        ) : null}
        <Text style={styles.summaryShop}>{shop}</Text>
        {totalLabel ? <Text style={styles.summaryPrice}>{totalLabel}</Text> : null}
        {sublabel ? <Text style={styles.summarySublabel}>{sublabel}</Text> : null}
        {badge ? (
          <View style={[styles.statusPill, badgeStyle]}>
            <Text style={styles.statusText}>{badge}</Text>
          </View>
        ) : null}
      </Pressable>
      {showCheckIn && !checkedIn ? (
        <Button
          mode="contained"
          compact
          onPress={() => onCheckIn(repair)}
          loading={checkingIn === repair.id}
          disabled={checkingIn === repair.id}
          style={styles.checkInBtn}
        >
          {t('repairs.list.checkInCta')}
        </Button>
      ) : null}
    </FloatingCard>
  );
}

export default function ClientRepairOffers({
  isActive = true,
  onUpdateUnseenOffersCount,
  onUpdateActionNeededCount,
  activityReturnTo = 'ClientActivity',
}) {
  const [offers, setOffers] = useState([]);
  const [repairs, setRepairs] = useState([]);
  const [actionNeededCount, setActionNeededCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [checkingInId, setCheckingInId] = useState(null);
  const navigation = useNavigation();
  const { t } = useTranslation();
  const hasLoadedRef = useRef(false);
  const { notifications, setNotifications, refreshUnreadFromRest } =
    useContext(WebSocketContext);

  const openRepairDetail = useCallback(
    (repairId) => {
      const params = {
        returnTo: activityReturnTo,
      };
      if (activityReturnTo === 'ClientRepairs') {
        params.initialTab = 'offers';
        params.backLabelKey = 'repairs.navBackToRequests';
      } else if (activityReturnTo === 'ClientActivity') {
        params.backLabelKey = 'notifications.title';
      }
      navigateToRepairDetail(navigation, repairId, params);
    },
    [navigation, activityReturnTo]
  );

  const fetchRepairOffers = useCallback(async ({ force = false } = {}) => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('@access_token');
      if (force) {
        invalidateRepairsListCache();
      }

      const [offersData, repairsData] = await Promise.all([
        getClientOffers(token),
        getRepairs(token, null, { force }).catch(() => []),
      ]);
      const repairRows = Array.isArray(repairsData) ? repairsData : [];

      setOffers(Array.isArray(offersData) ? offersData : []);
      setRepairs(repairRows);
      hasLoadedRef.current = true;
    } catch (err) {
      console.error('Failed to load repair offers', err);
      Alert.alert('Error', 'Could not load repair offers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isActive) return undefined;
    if (hasLoadedRef.current) return undefined;
    fetchRepairOffers();
    return undefined;
  }, [isActive, fetchRepairOffers]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchRepairOffers({ force: true });
    setRefreshing(false);
  }, [fetchRepairOffers]);

  const handleClientCheckIn = useCallback(
    async (repair) => {
      setCheckingInId(repair.id);
      try {
        const token = await AsyncStorage.getItem('@access_token');
        await clientReportVehicleArrival(token, repair.id);
        invalidateRepairsListCache();
        await fetchRepairOffers({ force: true });
        Alert.alert(
          'Checked in',
          'The service center has been notified. They will confirm when your vehicle is on site.'
        );
      } catch (err) {
        Alert.alert('Could not check in', err?.message || 'Please try again.');
      } finally {
        setCheckingInId(null);
      }
    },
    [fetchRepairOffers]
  );

  const handlePressOffer = useCallback(
    async (item) => {
      try {
        const token = await AsyncStorage.getItem('@access_token');
        const matchingNotif = notifications.find(
          (n) => !n.is_read && n.repair === item.repair
        );

        if (matchingNotif) {
          await markNotificationRead(token, matchingNotif.id);
          setNotifications((prev) =>
            prev.map((n) =>
              n.id === matchingNotif.id ? { ...n, is_read: true } : n
            )
          );
          if (typeof refreshUnreadFromRest === 'function') {
            await refreshUnreadFromRest();
          }
        }

        await markOfferSeen(token, item.id);

        setOffers((prev) =>
          prev.map((o) =>
            o.id === item.id ? { ...o, is_seen_by_client: true } : o
          )
        );

        openRepairDetail(item.repair);
      } catch (err) {
        Alert.alert('Error', 'Could not open detail');
      }
    },
    [notifications, openRepairDetail, refreshUnreadFromRest, setNotifications]
  );

  const { upcomingAppointments, inServiceRepairs, offersToReview } = useMemo(() => {
    const activeRepairs = repairs.filter(
      (r) => !isTerminalStatus(normalizeRepairStatus(r.status))
    );

    const upcoming = activeRepairs.filter((r) => isUpcomingAppointment(r));

    const inService = activeRepairs.filter((r) => isVehicleAtShop(r));

    const upcomingIds = new Set(upcoming.map((r) => r.id));
    const inServiceIds = new Set(inService.map((r) => r.id));

    const pendingOffers = offers.filter((o) => {
      const repairRow = activeRepairs.find((r) => r.id === o.repair);
      const status = offerRepairStatus(o, repairRow);
      if (!status || isTerminalStatus(status)) return false;
      if (repairRow && isVehicleAtShop(repairRow)) return false;
      if (inServiceIds.has(o.repair)) return false;
      if (upcomingIds.has(o.repair) && o.is_booked) return false;
      return status === 'open' || status === 'ongoing';
    });

    return {
      upcomingAppointments: upcoming,
      inServiceRepairs: inService,
      offersToReview: pendingOffers,
    };
  }, [repairs, offers]);

  useEffect(() => {
    if (typeof onUpdateUnseenOffersCount === 'function') {
      const unseen = offersToReview.filter((o) => !o.is_seen_by_client).length;
      onUpdateUnseenOffersCount(unseen);
    }
  }, [offersToReview, onUpdateUnseenOffersCount]);

  const handleRescheduleResponded = useCallback(async () => {
    invalidateRepairsListCache();
    await fetchRepairOffers({ force: true });
  }, [fetchRepairOffers]);

  const handleActionNeededChange = useCallback(
    (count) => {
      setActionNeededCount(count);
      if (typeof onUpdateActionNeededCount === 'function') {
        onUpdateActionNeededCount(count);
      }
    },
    [onUpdateActionNeededCount]
  );

  const showEmptyState =
    actionNeededCount === 0 &&
    upcomingAppointments.length === 0 &&
    inServiceRepairs.length === 0 &&
    offersToReview.length === 0;

  const renderOfferItem = useCallback(
    ({ item }) => {
      const isUnread = !item.is_seen_by_client;
      const shopName = item.shop_name || t('repairs.list.serviceCenterFallback');
      const isBooked = item.is_booked;
      const linked = repairs.find((r) => r.id === item.repair);
      const vehicleTitle =
        `${linked?.vehicle_make ?? ''} ${linked?.vehicle_model ?? ''}`.trim() ||
        String(linked?.vehicle_license_plate || item.vehicle_license_plate || '').trim() ||
        t('repairs.vehicleFallback');
      const plate = String(
        linked?.vehicle_license_plate || item.vehicle_license_plate || ''
      ).trim();
      const serviceTypeName =
        linked?.final_repair_type_name ||
        linked?.effective_repair_type_name ||
        linked?.repair_type_name ||
        item.repair_type_name ||
        null;
      const serviceTypeLabel = serviceTypeName
        ? translateRepairTypeLabel(
            {
              name: serviceTypeName,
              repair_type_name: serviceTypeName,
              slug: linked?.repair_type_slug || linked?.effective_repair_type_slug,
            },
            t
          ) || serviceTypeName
        : null;

      const pricing = formatOfferPricingLines(item);

      return (
        <FloatingCard
          accent={isUnread}
          onPress={() => handlePressOffer(item)}
          style={styles.offerCard}
        >
          <Text style={[styles.typeTitle, isUnread && styles.typeTitleBold]} numberOfLines={2}>
            {isBooked ? t('repairs.list.offerBookedTitle') : t('repairs.list.offerNewTitle')}
          </Text>
          <Text style={styles.vehicleLine} numberOfLines={1}>
            {vehicleTitle}
            {plate && vehicleTitle !== plate ? ` · ${plate}` : ''}
          </Text>
          {serviceTypeLabel ? (
            <Text style={styles.summaryServiceType} numberOfLines={1}>
              {serviceTypeLabel}
            </Text>
          ) : null}
          <Text style={styles.activityLine}>
            {isBooked
              ? t('repairs.list.offerBookedHint', { shop: shopName })
              : t('repairs.list.offerNewHint', { shop: shopName })}
          </Text>
          {!!item.description && (
            <Text style={styles.desc} numberOfLines={3}>
              {item.description}
            </Text>
          )}
          {pricing.estimateLine ? (
            <Text style={styles.priceLine}>
              <Text style={styles.priceLabel}>{t('repairs.list.estimateLabel')} </Text>
              <Text style={styles.priceValue}>
                {pricing.estimateLine.replace(/^Estimate\s+/, '')}
              </Text>
            </Text>
          ) : null}
          {pricing.quotedLine ? (
            <Text style={styles.priceLine}>
              <Text style={styles.priceLabel}>{t('repairs.list.quotedLabel')} </Text>
              <Text style={styles.priceValue}>
                {formatOfferPrimaryPrice(item)}
              </Text>
            </Text>
          ) : !pricing.estimateLine ? (
            <Text style={styles.priceLine}>
              <Text style={styles.priceLabel}>{t('repairs.list.priceLabel')} </Text>
              <Text style={styles.priceValue}>{formatOfferPrimaryPrice(item)}</Text>
            </Text>
          ) : null}
          <View style={[styles.statusPill, isBooked ? styles.stateBooked : styles.stateNew]}>
            <Text style={styles.statusText}>
              {isBooked ? t('repairs.list.badgeBooked') : t('repairs.list.badgeNewOffer')}
            </Text>
          </View>
        </FloatingCard>
      );
    },
    [handlePressOffer, repairs, t]
  );

  const renderListHeader = () => (
    <>
      {upcomingAppointments.length > 0 ? (
        <ActivitySection
          title={t('repairs.list.upcomingTitle')}
          hint={t('repairs.list.upcomingHint')}
        >
          {upcomingAppointments.map((repair) => (
            <RepairSummaryCard
              key={`appt-${repair.id}`}
              repair={repair}
              t={t}
              onPress={() => openRepairDetail(repair.id)}
              showCheckIn
              onCheckIn={handleClientCheckIn}
              checkingIn={checkingInId}
              badge={
                clientReportedArrival(repair)
                  ? t('repairs.list.badgeCheckedIn')
                  : t('repairs.list.badgeScheduled')
              }
              badgeStyle={clientReportedArrival(repair) ? styles.stateInService : styles.stateBooked}
              sublabel={
                clientReportedArrival(repair)
                  ? t('repairs.list.checkedInHint')
                  : t('repairs.list.checkInHint')
              }
            />
          ))}
        </ActivitySection>
      ) : null}

      {inServiceRepairs.length > 0 ? (
        <ActivitySection
          title={t('repairs.list.inServiceTitle')}
          hint={t('repairs.list.inServiceHint')}
        >
          {inServiceRepairs.map((repair) => (
            <RepairSummaryCard
              key={`ongoing-${repair.id}`}
              repair={repair}
              t={t}
              accent
              onPress={() => openRepairDetail(repair.id)}
              badge={t('repairs.list.badgeInService')}
              badgeStyle={styles.stateInService}
            />
          ))}
        </ActivitySection>
      ) : null}

      {offersToReview.length > 0 ? (
        <View style={styles.sectionWrap}>
          <Text style={styles.sectionHeading}>{t('repairs.list.offersTitle')}</Text>
          <Text style={styles.sectionHint}>{t('repairs.list.offersHint')}</Text>
        </View>
      ) : null}

      {showEmptyState ? (
        <EmptyStateCard
          icon="check-circle-outline"
          title={t('repairs.list.emptyTitle')}
          subtitle={t('repairs.list.emptySubtitle')}
        />
      ) : null}
    </>
  );

  return (
    <View style={styles.root}>
      <ClientActionNeeded
        repairs={repairs}
        onChanged={handleActionNeededChange}
        onRescheduleResponded={handleRescheduleResponded}
      />
      {loading ? (
        <ActivityIndicator size="large" color={COLORS.PRIMARY} />
      ) : (
        <FlatList
          data={offersToReview}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderOfferItem}
          ListHeaderComponent={renderListHeader}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={null}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: 4,
    paddingBottom: 8,
    backgroundColor: 'transparent',
  },
  listContent: {
    paddingBottom: 16,
  },
  sectionWrap: {
    marginBottom: 12,
  },
  sectionHeading: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
    marginLeft: 4,
  },
  sectionHint: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 12,
    marginBottom: 8,
    marginLeft: 4,
    lineHeight: 17,
  },
  summaryCard: {
    marginBottom: 8,
  },
  checkInBtn: {
    marginTop: 10,
  },
  offerCard: {
    marginBottom: 8,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.TEXT_DARK,
  },
  summaryMeta: {
    fontSize: 13,
    color: COLORS.TEXT_MUTED,
    marginTop: 2,
  },
  summaryServiceType: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.PRIMARY,
    marginTop: 4,
  },
  summaryHighlight: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.PRIMARY,
    marginTop: 4,
  },
  summaryShop: {
    fontSize: 13,
    color: COLORS.TEXT_MUTED,
    marginTop: 2,
  },
  summaryPrice: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.TEXT_DARK,
    marginTop: 4,
  },
  summarySublabel: {
    fontSize: 12,
    color: COLORS.TEXT_MUTED,
    marginTop: 6,
    lineHeight: 17,
  },
  typeTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.PRIMARY_DARK,
    marginBottom: 4,
  },
  typeTitleBold: {
    fontWeight: '700',
  },
  vehicleLine: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.TEXT_DARK,
    marginBottom: 2,
  },
  activityLine: {
    color: COLORS.TEXT_DARK,
    marginBottom: 8,
    fontSize: 13,
    fontWeight: '500',
  },
  desc: {
    fontSize: 13,
    color: COLORS.TEXT_MUTED,
    lineHeight: 18,
    marginBottom: 8,
  },
  priceLine: {
    fontSize: 14,
    marginBottom: 4,
  },
  priceLabel: {
    color: COLORS.TEXT_MUTED,
  },
  priceValue: {
    fontWeight: '800',
    color: COLORS.PRIMARY,
  },
  statusPill: {
    alignSelf: 'flex-start',
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusText: {
    fontWeight: '700',
    fontSize: 12,
    color: '#0f172a',
  },
  stateNew: { backgroundColor: 'rgba(15,76,129,0.15)' },
  stateBooked: { backgroundColor: 'rgba(245,158,11,0.2)' },
  stateInService: { backgroundColor: 'rgba(59,130,246,0.2)' },
});
