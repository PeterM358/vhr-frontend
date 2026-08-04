/**
 * Repair-centric hub for service_center org homes — mirrors ShopHome request list + ops tiles.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useNavigation } from '@react-navigation/native';

import { getRepairs, getShopCalendar } from '../../api/repairs';
import { getMyShopProfiles } from '../../api/profiles';
import { STORAGE_KEYS } from '../../constants/storageKeys';
import { COLORS } from '../../constants/colors';
import PartnerRepairRequestCard from '../shop/PartnerRepairRequestCard';
import DashboardSection from '../dashboard/DashboardSection';
import DashboardActionGrid from '../dashboard/DashboardActionGrid';
import DashboardCard from '../dashboard/DashboardCard';
import PartnerEmptyRequestsState from '../dashboard/PartnerEmptyRequestsState';
import {
  comparePartnerLifecycle,
  countByLifecycle,
  formatLifecycleCounterLine,
} from '../../utils/partnerRepairLifecycle';
import {
  canSendPartnerOffers,
  isLeadTeaserLocked,
  FEATURES,
  upgradeNavigationParams,
} from '../../utils/partnerSubscription';
import { todayCalendarRange, isScheduledToday } from '../../utils/dashboardDate';
import { resetShopDrawerRepairs } from '../../navigation/drawerNavigation';
import {
  navigateToPartnerAddServiceCenter,
  navigateToPartnerCalendar,
  navigateToPartnerDashboard,
  navigateToPartnerOnboarding,
  navigateToPartnerRepairDetail,
  navigateToPartnerRepairOffer,
  navigateToOrgCompanyAccount,
} from '../../navigation/webNavigation';
import { useTranslation } from '../../i18n';

function asRepairRows(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  return [];
}

function orgShopIds(org) {
  const fromPayload = Array.isArray(org?.shop_profile_ids)
    ? org.shop_profile_ids.map((id) => Number(id)).filter((id) => Number.isFinite(id) && id > 0)
    : [];
  return fromPayload;
}

/**
 * Resolve which shop profile the current user can use for repair APIs.
 * Prefer intersection of my profiles ∩ org-linked shops; else first of my profiles;
 * else first org-linked id (may still 403/empty if user lacks shop membership).
 */
async function resolveShopContext(org) {
  const linkedIds = orgShopIds(org);
  let profiles = [];
  try {
    profiles = await getMyShopProfiles();
  } catch {
    profiles = [];
  }
  const mine = Array.isArray(profiles) ? profiles.filter((p) => p?.id != null) : [];
  const linkedSet = new Set(linkedIds.map(String));
  const preferred =
    mine.find((p) => linkedSet.has(String(p.id))) ||
    (linkedIds.length === 0 ? mine[0] : null) ||
    mine[0] ||
    null;

  const shopId = preferred?.id != null
    ? preferred.id
    : linkedIds[0] != null
      ? linkedIds[0]
      : null;

  if (shopId != null) {
    await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_SHOP_ID, String(shopId));
  }

  return {
    shopId: shopId != null ? String(shopId) : null,
    shopProfile: preferred,
    hasLinkedLocation: linkedIds.length > 0 || Boolean(org?.has_shop_locations),
    hasShopMembership: mine.length > 0,
  };
}

export default function OrgServiceCenterRepairsHub({ org, onCountsChange }) {
  const navigation = useNavigation();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [repairs, setRepairs] = useState([]);
  const [ongoingCount, setOngoingCount] = useState(0);
  const [todayBookings, setTodayBookings] = useState(0);
  const [shopContext, setShopContext] = useState({
    shopId: null,
    shopProfile: null,
    hasLinkedLocation: false,
    hasShopMembership: false,
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      const ctx = await resolveShopContext(org);
      setShopContext(ctx);

      if (!ctx.shopId || !ctx.hasShopMembership) {
        setRepairs([]);
        setOngoingCount(0);
        setTodayBookings(0);
        onCountsChange?.({ open: 0, ongoing: 0, done: 0, canLoad: false });
        return;
      }

      const shopFilter = { shop_profile_id: ctx.shopId };
      const { from, to } = todayCalendarRange();
      const [openRows, ongoingRows, doneRows, deniedRows, calendar] = await Promise.all([
        getRepairs(token, { status: 'open', ...shopFilter }).then(asRepairRows).catch(() => []),
        getRepairs(token, { status: 'ongoing', ...shopFilter }).then(asRepairRows).catch(() => []),
        getRepairs(token, { status: 'done', ...shopFilter }).then(asRepairRows).catch(() => []),
        getRepairs(token, { status: 'denied', ...shopFilter }).then(asRepairRows).catch(() => []),
        getShopCalendar(token, { from, to, shopId: ctx.shopId })
          .then((data) => data)
          .catch(() => ({ scheduled: [] })),
      ]);

      const merged = new Map();
      [...openRows, ...ongoingRows, ...doneRows, ...deniedRows].forEach((row) => {
        if (row?.id != null) merged.set(row.id, row);
      });
      const rows = [...merged.values()];
      setRepairs(rows);
      setOngoingCount(ongoingRows.length);
      const scheduled = Array.isArray(calendar?.scheduled) ? calendar.scheduled : [];
      setTodayBookings(scheduled.filter(isScheduledToday).length);
      onCountsChange?.({
        open: openRows.length,
        ongoing: ongoingRows.length,
        done: doneRows.length,
        canLoad: true,
      });
    } catch {
      setRepairs([]);
      setOngoingCount(0);
      setTodayBookings(0);
      onCountsChange?.({ open: 0, ongoing: 0, done: 0, canLoad: false });
    } finally {
      setLoading(false);
    }
  }, [onCountsChange, org]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const sorted = useMemo(() => [...repairs].sort(comparePartnerLifecycle), [repairs]);
  const lifecycleCounts = useMemo(() => countByLifecycle(repairs), [repairs]);
  const lifecycleLine = useMemo(
    () => formatLifecycleCounterLine(lifecycleCounts, t),
    [lifecycleCounts, t],
  );
  const canSendOffers = canSendPartnerOffers(shopContext.shopProfile);

  const openFullWorkspace = useCallback(() => {
    if (shopContext.hasShopMembership || shopContext.hasLinkedLocation) {
      navigateToPartnerDashboard(navigation);
      return;
    }
    navigateToPartnerOnboarding(navigation);
  }, [navigation, shopContext.hasLinkedLocation, shopContext.hasShopMembership]);

  const handleRepairPress = (repairId) => {
    navigateToPartnerRepairDetail(navigation, repairId, {
      returnTo: 'OrgOverview',
      backLabelKey: 'org.home.title',
    });
  };

  const handleRepairOffer = (repair) => {
    const repairId = repair?.id;
    if (!repairId) return;
    if (!canSendOffers || isLeadTeaserLocked(repair)) {
      navigation.navigate(
        'ShopSubscriptionUpgrade',
        upgradeNavigationParams({ featureKey: FEATURES.MARKETPLACE_SEND_OFFER }),
      );
      return;
    }
    const offerParams = {
      selectedOfferParts: [],
      includeRepairDetail: false,
    };
    if (repair?.current_offer_id) {
      offerParams.offerId = repair.current_offer_id;
    }
    navigateToPartnerRepairOffer(navigation, repairId, offerParams);
  };

  const opsTiles = useMemo(() => {
    const tiles = [
      {
        key: 'view-requests',
        icon: 'clipboard-text-outline',
        title: t('partnerDashboard.viewRequests', null, 'View Requests'),
        subtitle: t(
          'org.home.repairs.viewRequestsSubtitle',
          null,
          'Open, in progress, and completed repair jobs.',
        ),
        count: sorted.length || undefined,
        onPress: () => {
          if (shopContext.hasShopMembership) {
            resetShopDrawerRepairs(navigation);
            return;
          }
          openFullWorkspace();
        },
      },
      {
        key: 'active',
        icon: 'car-wrench',
        title: t('partnerDashboard.activeRepairsTitle', null, 'Active Repairs'),
        subtitle: t('partnerDashboard.activeRepairsSubtitle', null, 'Jobs currently in progress'),
        count: ongoingCount || undefined,
        onPress: () => {
          if (shopContext.hasShopMembership) {
            resetShopDrawerRepairs(navigation);
            return;
          }
          openFullWorkspace();
        },
      },
      {
        key: 'calendar',
        icon: 'calendar-month-outline',
        title: t('partnerDashboard.bookingsCalendarTitle', null, 'Bookings / Calendar'),
        subtitle: t(
          'partnerDashboard.bookingsCalendarSubtitle',
          null,
          "Today's appointments, schedule and capacity",
        ),
        count: todayBookings > 0 ? todayBookings : undefined,
        onPress: () => {
          if (!shopContext.hasShopMembership) {
            openFullWorkspace();
            return;
          }
          if (Platform.OS === 'web') {
            navigateToPartnerCalendar(navigation);
            return;
          }
          navigation.navigate('ShopCalendar', {
            returnTo: 'OrgOverview',
            backLabel: t('org.home.title', null, 'Organization'),
          });
        },
      },
    ];

    if (shopContext.hasShopMembership || shopContext.hasLinkedLocation) {
      tiles.push({
        key: 'full-sc',
        icon: 'storefront-outline',
        title: t('org.home.openServiceCenter', null, 'Open service center workspace'),
        subtitle: t(
          'org.home.actions.shopSubtitle',
          null,
          'Switch to bay operations, offers, and shop tools.',
        ),
        onPress: () => navigateToPartnerDashboard(navigation),
      });
    } else {
      tiles.push({
        key: 'setup-sc',
        icon: 'store-plus-outline',
        title: t('org.home.repairs.setupTitle', null, 'Set up service center'),
        subtitle: t(
          'org.home.repairs.setupSubtitle',
          null,
          'Link a shop location to receive requests and run bay repairs.',
        ),
        onPress: () => navigateToPartnerAddServiceCenter(navigation),
      });
    }

    return tiles;
  }, [
    navigation,
    ongoingCount,
    openFullWorkspace,
    shopContext.hasLinkedLocation,
    shopContext.hasShopMembership,
    sorted.length,
    t,
    todayBookings,
  ]);

  const needsShopPath = !shopContext.hasShopMembership;

  return (
    <View style={styles.wrap}>
      <DashboardSection
        title={t('partnerDashboard.openRepairRequests', null, 'Open Repair Requests')}
        subtitle={
          needsShopPath
            ? t(
                'org.home.repairs.needShopSubtitle',
                null,
                'Repairs live on your service center location. Link or open it to see requests.',
              )
            : lifecycleLine || t('partnerDashboard.openRequestsEmptySubtitle')
        }
        actionLabel={
          needsShopPath
            ? t('org.home.repairs.setupCta', null, 'Set up')
            : t('partnerDashboard.viewRequests', null, 'View Requests')
        }
        onActionPress={() => {
          if (needsShopPath) {
            openFullWorkspace();
            return;
          }
          resetShopDrawerRepairs(navigation);
        }}
      >
        {loading ? (
          <ActivityIndicator color="#fff" style={styles.loader} />
        ) : needsShopPath ? (
          <DashboardCard style={styles.setupCard}>
            <Text style={styles.setupTitle}>
              {t('org.home.repairs.needShopTitle', null, 'Connect your service center')}
            </Text>
            <Text style={styles.setupBody}>
              {shopContext.hasLinkedLocation
                ? t(
                    'org.home.repairs.needMembershipBody',
                    null,
                    'This company has a linked location, but your account needs the service center workspace to open the repair inbox.',
                  )
                : t(
                    'org.home.repairs.needShopBody',
                    null,
                    'Add a service center location to receive customer requests, run open repairs, and use the bay calendar.',
                  )}
            </Text>
            <View style={styles.setupActions}>
              <Button
                mode="contained"
                onPress={openFullWorkspace}
                buttonColor={COLORS.ACCENT}
                textColor="#0f172a"
              >
                {shopContext.hasLinkedLocation
                  ? t('org.home.openServiceCenter', null, 'Open service center workspace')
                  : t('org.home.repairs.setupCta', null, 'Set up')}
              </Button>
              <Button
                mode="text"
                onPress={() => navigateToOrgCompanyAccount(navigation, { orgId: org?.id })}
                textColor={COLORS.PRIMARY}
              >
                {t('org.drawer.companyAccount', null, 'Company account')}
              </Button>
            </View>
          </DashboardCard>
        ) : sorted.length === 0 ? (
          <PartnerEmptyRequestsState />
        ) : (
          sorted.slice(0, 8).map((item) => (
            <PartnerRepairRequestCard
              key={String(item.id)}
              repair={item}
              canSendOffers={canSendOffers}
              onPressDetails={(repair) => handleRepairPress(repair.id)}
              onPressOffer={handleRepairOffer}
              onPressPrimary={(repair) => handleRepairPress(repair.id)}
            />
          ))
        )}
      </DashboardSection>

      <DashboardSection
        title={t('partnerDashboard.operationsTitle', null, 'Operations')}
        subtitle={t(
          'org.home.repairs.operationsSubtitle',
          null,
          'Requests, open repairs, and calendar — company modules stay below.',
        )}
      >
        {loading ? (
          <ActivityIndicator color="#fff" style={styles.loader} />
        ) : (
          <DashboardActionGrid tiles={opsTiles} />
        )}
      </DashboardSection>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 4,
  },
  loader: {
    marginVertical: 12,
  },
  setupCard: {
    marginTop: 4,
    paddingVertical: 16,
    paddingHorizontal: 14,
  },
  setupTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  setupBody: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  setupActions: {
    gap: 4,
    alignItems: 'flex-start',
  },
});
