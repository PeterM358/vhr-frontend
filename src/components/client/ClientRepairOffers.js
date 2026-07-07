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
}) {
  const plate = repair.vehicle_license_plate || 'Your vehicle';
  const shop = repair.shop_profile_name || 'Service center';
  const serviceType =
    repair.final_repair_type_name ||
    repair.repair_type_name ||
    repair.repair_type?.name ||
    null;
  const checkedIn = clientReportedArrival(repair);

  return (
    <FloatingCard style={styles.summaryCard} accent={badge === 'IN SERVICE'}>
      <Pressable onPress={onPress} style={({ pressed }) => [pressed && { opacity: 0.92 }]}>
        <Text style={styles.summaryTitle}>{plate}</Text>
        {serviceType ? <Text style={styles.summaryMeta}>{serviceType}</Text> : null}
        {repair.scheduled_start ? (
          <Text style={styles.summaryHighlight}>
            {new Date(repair.scheduled_start).toLocaleString()}
          </Text>
        ) : null}
        <Text style={styles.summaryShop}>{shop}</Text>
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
          I&apos;m here for my appointment
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
  const hasLoadedRef = useRef(false);
  const { notifications, setNotifications } = useContext(WebSocketContext);

  const openRepairDetail = useCallback(
    (repairId) => {
      navigation.navigate('RepairDetail', {
        repairId,
        returnTo: activityReturnTo,
      });
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
    [notifications, openRepairDetail, setNotifications]
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
      const shopName = item.shop_name || 'Service center';
      const isBooked = item.is_booked;

      const pricing = formatOfferPricingLines(item);

      return (
        <FloatingCard
          accent={isUnread}
          onPress={() => handlePressOffer(item)}
          style={styles.offerCard}
        >
          <Text style={[styles.typeTitle, isUnread && styles.typeTitleBold]} numberOfLines={2}>
            {isBooked ? 'Repair booked' : 'New offer'}
          </Text>
          <Text style={styles.activityLine}>
            {isBooked
              ? `You booked ${shopName} — open the repair for details`
              : `${shopName} sent a quote — tap to review and book`}
          </Text>
          {!!item.description && (
            <Text style={styles.desc} numberOfLines={3}>
              {item.description}
            </Text>
          )}
          {pricing.estimateLine ? (
            <Text style={styles.priceLine}>
              <Text style={styles.priceLabel}>Estimate: </Text>
              <Text style={styles.priceValue}>
                {pricing.estimateLine.replace(/^Estimate\s+/, '')}
              </Text>
            </Text>
          ) : null}
          {pricing.quotedLine ? (
            <Text style={styles.priceLine}>
              <Text style={styles.priceLabel}>Quoted: </Text>
              <Text style={styles.priceValue}>
                {formatOfferPrimaryPrice(item)}
              </Text>
            </Text>
          ) : !pricing.estimateLine ? (
            <Text style={styles.priceLine}>
              <Text style={styles.priceLabel}>Price: </Text>
              <Text style={styles.priceValue}>{formatOfferPrimaryPrice(item)}</Text>
            </Text>
          ) : null}
          <View style={[styles.statusPill, isBooked ? styles.stateBooked : styles.stateNew]}>
            <Text style={styles.statusText}>{isBooked ? 'BOOKED' : 'NEW OFFER'}</Text>
          </View>
        </FloatingCard>
      );
    },
    [handlePressOffer]
  );

  const renderListHeader = () => (
    <>
      <ClientActionNeeded
        repairs={repairs}
        onChanged={handleActionNeededChange}
        onRescheduleResponded={handleRescheduleResponded}
      />

      {upcomingAppointments.length > 0 ? (
        <ActivitySection
          title="Upcoming appointments"
          hint="Your next scheduled visit"
        >
          {upcomingAppointments.map((repair) => (
            <RepairSummaryCard
              key={`appt-${repair.id}`}
              repair={repair}
              onPress={() => openRepairDetail(repair.id)}
              showCheckIn
              onCheckIn={handleClientCheckIn}
              checkingIn={checkingInId}
              badge={clientReportedArrival(repair) ? 'CHECKED IN' : 'SCHEDULED'}
              badgeStyle={clientReportedArrival(repair) ? styles.stateInService : styles.stateBooked}
              sublabel={
                clientReportedArrival(repair)
                  ? 'You checked in — waiting for the shop to confirm arrival'
                  : 'Tap check in when you arrive at the service center'
              }
            />
          ))}
        </ActivitySection>
      ) : null}

      {inServiceRepairs.length > 0 ? (
        <ActivitySection
          title="In service now"
          hint="Your vehicle is at the shop — tap to follow progress"
        >
          {inServiceRepairs.map((repair) => (
            <RepairSummaryCard
              key={`ongoing-${repair.id}`}
              repair={repair}
              onPress={() => openRepairDetail(repair.id)}
              badge="IN SERVICE"
              badgeStyle={styles.stateInService}
            />
          ))}
        </ActivitySection>
      ) : null}

      {offersToReview.length > 0 ? (
        <View style={styles.sectionWrap}>
          <Text style={styles.sectionHeading}>Offers to review</Text>
          <Text style={styles.sectionHint}>
            Compare quotes and book a time on the repair request
          </Text>
        </View>
      ) : null}

      {showEmptyState ? (
        <EmptyStateCard
          icon="check-circle-outline"
          title="Nothing needs attention"
          subtitle="Upcoming visits and in-progress work will show here. Completed repairs are in the menu under Repairs."
        />
      ) : null}
    </>
  );

  return (
    <View style={styles.root}>
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
  stateNew: { backgroundColor: 'rgba(37,99,235,0.15)' },
  stateBooked: { backgroundColor: 'rgba(245,158,11,0.2)' },
  stateInService: { backgroundColor: 'rgba(59,130,246,0.2)' },
});
