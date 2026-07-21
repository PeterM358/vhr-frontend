/**
 * PATH: src/screens/ShopHomeScreen.js
 * Veversal partner platform dashboard — open work first, ERP modules as tiles.
 */

import React, { useContext, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Platform,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logout } from '../api/auth';
import { getRepairs, getShopCalendar } from '../api/repairs';
import { getMyOffers } from '../api/offers';
import {
  cacheUnscheduledCount,
  readCachedUnscheduledCount,
  shouldRefreshUnscheduledCount,
} from '../utils/shopCalendarBadge';
import {
  fetchShopProfileCompleteness,
  gateRepairNavigation,
} from '../utils/shopProfileGate';
import { setCachedShopRepairs } from '../utils/shopRepairsPrefetch';
import PartnerRepairRequestCard from '../components/shop/PartnerRepairRequestCard';
import PartnerAppHeader from '../components/partner/PartnerAppHeader';
import { partnerInAppAlertCopy } from '../utils/partnerInAppAlert';
import {
  comparePartnerLifecycle,
  countByLifecycle,
  formatLifecycleCounterLine,
} from '../utils/partnerRepairLifecycle';
import { navigateToPartnerPublicPreview, navigateToPartnerCalendar, navigateToPartnerRepairOffer, navigateToPartnerRepairDetail } from '../navigation/webNavigation';
import {
  isPartnerSetupComplete,
  partnerSetupPercent,
  openPartnerCenter,
} from '../utils/partnerSetupGate';
import ShopProfileSetupBanner from '../components/shop/ShopProfileSetupBanner';
import { getMyShopProfiles } from '../api/profiles';
import { formatShopDisplayName } from '../utils/shopDisplayName';
import { WebSocketContext } from '../context/WebSocketManager';
import { AuthContext } from '../context/AuthManager';
import ScreenBackground from '../components/ScreenBackground';
import DashboardHero from '../components/dashboard/DashboardHero';
import DashboardSection from '../components/dashboard/DashboardSection';
import DashboardActionGrid from '../components/dashboard/DashboardActionGrid';
import DashboardComingSoonSection from '../components/dashboard/DashboardComingSoonSection';
import ReadyToDriveComingSoonCard from '../components/dashboard/ReadyToDriveComingSoonCard';
import PartnerActivationBanner from '../components/dashboard/PartnerActivationBanner';
import PartnerEmptyRequestsState from '../components/dashboard/PartnerEmptyRequestsState';
import {
  canSendPartnerOffers,
  isPartnerSubscriptionActive,
  isLeadTeaserLocked,
  FEATURES,
  upgradeNavigationParams,
} from '../utils/partnerSubscription';
import { todayCalendarRange, isScheduledToday } from '../utils/dashboardDate';
import { showMessage } from '../utils/crossPlatformAlert';
import { resetShopDrawerRepairs } from '../navigation/drawerNavigation';
import { useTranslation } from '../i18n';

function asRepairRows(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  return [];
}

function openPartnerPublicPreview(navigation, params = {}) {
  if (Platform.OS === 'web') {
    navigateToPartnerPublicPreview(navigation, params);
    return;
  }
  navigation.navigate('ShopProfile', { expandSection: 'public_preview', ...params });
}

export default function ShopHomeScreen() {
  const navigation = useNavigation();
  const { t } = useTranslation();
  const { setAuthToken, setIsAuthenticated, setUserEmailOrPhone } = useContext(AuthContext);
  const { notifications, unreadCount, refreshUnreadFromRest } = useContext(WebSocketContext);

  const [loading, setLoading] = useState(true);
  const [shopProfile, setShopProfile] = useState(null);
  const [shopDisplayName, setShopDisplayName] = useState(() => t('partnerDashboard.serviceCenterDefault'));
  const [dashboardRepairs, setDashboardRepairs] = useState([]);
  const [ongoingRepairs, setOngoingRepairs] = useState([]);
  const [pendingOffers, setPendingOffers] = useState([]);
  const [todayBookings, setTodayBookings] = useState([]);
  const [repairsLoading, setRepairsLoading] = useState(true);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [unscheduledCount, setUnscheduledCount] = useState(0);
  const [profileComplete, setProfileComplete] = useState(true);
  const [missingProfileFields, setMissingProfileFields] = useState([]);
  // Publish-ready gate (wizard owns the profile until this is true).
  const [setupComplete, setSetupComplete] = useState(true);
  const [setupPercent, setSetupPercent] = useState(100);

  const lastRepairNotifIdRef = React.useRef(null);
  const lastInAppAlertIdRef = React.useRef(null);

  const openRepairs = dashboardRepairs;
  const lifecycleCounts = useMemo(() => countByLifecycle(dashboardRepairs), [dashboardRepairs]);
  const lifecycleCounterLine = useMemo(
    () => formatLifecycleCounterLine(lifecycleCounts, t),
    [lifecycleCounts, t]
  );
  const partnerActive = isPartnerSubscriptionActive(shopProfile);
  const canSendOffers = canSendPartnerOffers(shopProfile);

  const sortedDashboardRepairs = useMemo(
    () => [...dashboardRepairs].sort(comparePartnerLifecycle),
    [dashboardRepairs]
  );

  const loadDashboardRepairs = React.useCallback(async ({ background = false } = {}) => {
    if (!background) setRepairsLoading(true);
    try {
      const token = await AsyncStorage.getItem('@access_token');
      const shopId = await AsyncStorage.getItem('@current_shop_id');
      const shopFilter = shopId ? { shop_profile_id: shopId } : {};

      const [openRows, ongoingRows, doneRows, deniedRows] = await Promise.all([
        getRepairs(token, { status: 'open', ...shopFilter })
          .then(asRepairRows)
          .catch(() => []),
        getRepairs(token, { status: 'ongoing', ...shopFilter })
          .then(asRepairRows)
          .catch(() => []),
        getRepairs(token, { status: 'done', ...shopFilter })
          .then(asRepairRows)
          .catch(() => []),
        getRepairs(token, { status: 'denied', ...shopFilter })
          .then(asRepairRows)
          .catch(() => []),
      ]);

      const merged = new Map();
      [...openRows, ...ongoingRows, ...doneRows, ...deniedRows].forEach((row) => {
        if (row?.id != null) merged.set(row.id, row);
      });
      const rows = [...merged.values()];
      setDashboardRepairs(rows);
      // Reuse the ongoing rows already fetched here for the "active" tile count
      // instead of firing a separate getRepairs('ongoing') from loadDashboardMetrics.
      setOngoingRepairs(ongoingRows);
      setCachedShopRepairs('open', openRows);
    } catch (err) {
      console.error('Failed to load dashboard repairs', err);
      setDashboardRepairs([]);
      setOngoingRepairs([]);
    } finally {
      if (!background) setRepairsLoading(false);
    }
  }, []);

  const loadDashboardMetrics = React.useCallback(async () => {
    setDashboardLoading(true);
    try {
      const token = await AsyncStorage.getItem('@access_token');
      const shopId = await AsyncStorage.getItem('@current_shop_id');
      const { from, to } = todayCalendarRange();

      // Ongoing repairs are loaded by loadDashboardRepairs (which also feeds the
      // open-requests list), so we only fetch offers + today's calendar here.
      const [offers, calendar] = await Promise.all([
        getMyOffers(token).catch(() => []),
        getShopCalendar(token, { from, to, shopId }).catch(() => ({ scheduled: [] })),
      ]);

      const offerRows = Array.isArray(offers) ? offers : [];
      setPendingOffers(offerRows.filter((o) => !o.is_booked));
      const scheduled = Array.isArray(calendar?.scheduled) ? calendar.scheduled : [];
      setTodayBookings(scheduled.filter(isScheduledToday));
    } finally {
      setDashboardLoading(false);
    }
  }, []);

  const latestNotificationId = notifications[0]?.id ?? null;

  React.useEffect(() => {
    if (!latestNotificationId) return;
    const latest = notifications[0];
    const eventType = String(
      latest?.data?.event_type || latest?.event_type || latest?.notification_type || ''
    ).toLowerCase();

    if (
      eventType.includes('repair_request') &&
      latestNotificationId !== lastRepairNotifIdRef.current
    ) {
      lastRepairNotifIdRef.current = latestNotificationId;
      loadDashboardRepairs({ background: true });
    }

    if (latestNotificationId !== lastInAppAlertIdRef.current) {
      const alertCopy = partnerInAppAlertCopy(latest, t);
      if (alertCopy) {
        // Global PartnerInAppBannerHost owns CRITICAL/IMPORTANT banners.
        // Keep this path as a no-op marker so dashboard refresh still keys off arrival events.
        lastInAppAlertIdRef.current = latestNotificationId;
      }
    }
  }, [latestNotificationId, notifications, loadDashboardRepairs, t]);

  const refreshProfileGate = React.useCallback(async () => {
    try {
      const { isComplete, missingFields } = await fetchShopProfileCompleteness();
      setProfileComplete(isComplete);
      setMissingProfileFields(missingFields);
    } catch (err) {
      console.warn('Shop profile gate check failed', err);
    }
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      const loadShopUser = async () => {
        try {
          const profiles = await getMyShopProfiles();
          const profile = profiles?.[0] || null;
          setShopProfile(profile);
          setSetupComplete(isPartnerSetupComplete(profile));
          setSetupPercent(partnerSetupPercent(profile));
          const shopName = profile?.name?.trim();
          if (shopName) {
            setShopDisplayName(formatShopDisplayName(shopName));
          } else {
            const stored = await AsyncStorage.getItem('@user_email_or_phone');
            let display = t('partnerDashboard.serviceCenterDefault');
            if (stored?.trim()) {
              display = stored.includes('@') ? stored.split('@')[0] : stored;
            }
            setShopDisplayName(display);
          }
        } catch {
          setShopProfile(null);
          setShopDisplayName(t('partnerDashboard.serviceCenterDefault'));
        } finally {
          setLoading(false);
        }
      };

      const loadUnscheduledBadge = async () => {
        const cached = await readCachedUnscheduledCount();
        setUnscheduledCount(cached);
        const stale = await shouldRefreshUnscheduledCount();
        if (!stale) return;
        try {
          const token = await AsyncStorage.getItem('@access_token');
          const data = await getShopCalendar(token, { badge_only: true });
          const count = data.unscheduled_count ?? 0;
          setUnscheduledCount(count);
          await cacheUnscheduledCount(count);
        } catch {
          /* keep cached */
        }
      };

      refreshProfileGate();
      loadShopUser();
      loadDashboardRepairs();
      loadDashboardMetrics();
      loadUnscheduledBadge();
      if (typeof refreshUnreadFromRest === 'function') {
        refreshUnreadFromRest();
      }
    }, [refreshProfileGate, loadDashboardRepairs, loadDashboardMetrics, refreshUnreadFromRest])
  );

  const handleRepairPress = (repairId) => {
    if (
      !gateRepairNavigation(navigation, {
        isComplete: profileComplete,
        missingFields: missingProfileFields,
      })
    ) {
      return;
    }
    navigateToPartnerRepairDetail(navigation, repairId, {
      returnTo: 'ShopDashboard',
      backLabelKey: 'navigation.dashboard',
    });
  };

  const handleRepairOffer = (repair) => {
    const repairId = repair?.id;
    if (!repairId) return;
    if (!canSendOffers || isLeadTeaserLocked(repair)) {
      navigation.navigate(
        'ShopSubscriptionUpgrade',
        upgradeNavigationParams({ featureKey: FEATURES.MARKETPLACE_SEND_OFFER })
      );
      return;
    }
    if (
      !gateRepairNavigation(navigation, {
        isComplete: profileComplete,
        missingFields: missingProfileFields,
      })
    ) {
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

  const handleLogout = async () => {
    await logout(navigation, setAuthToken, setIsAuthenticated, setUserEmailOrPhone);
  };

  // Route "open my center" intents through the setup gate: wizard while
  // incomplete, full profile editor once publish-ready.
  const openCenter = useCallback(
    (params = {}) => openPartnerCenter(navigation, shopProfile, params),
    [navigation, shopProfile]
  );

  const operationsTiles = useMemo(
    () => [
      {
        key: 'pending-offers',
        icon: 'file-send-outline',
        title: t('partnerDashboard.pendingOffersTitle'),
        subtitle: t('partnerDashboard.pendingOffersSubtitle'),
        count: pendingOffers.length,
        onPress: () => resetShopDrawerRepairs(navigation),
      },
      {
        key: 'active',
        icon: 'car-wrench',
        title: t('partnerDashboard.activeRepairsTitle'),
        subtitle: t('partnerDashboard.activeRepairsSubtitle'),
        count: ongoingRepairs.length,
        onPress: () => resetShopDrawerRepairs(navigation),
      },
      {
        key: 'bookings-calendar',
        icon: 'calendar-month-outline',
        title: t('partnerDashboard.bookingsCalendarTitle'),
        subtitle: t('partnerDashboard.bookingsCalendarSubtitle'),
        count:
          todayBookings.length > 0
            ? todayBookings.length
            : unscheduledCount > 0
              ? unscheduledCount
              : undefined,
        onPress: () => {
          if (Platform.OS === 'web') {
            navigateToPartnerCalendar(navigation);
            return;
          }
          navigation.navigate('ShopCalendar', {
            returnTo: 'ShopDashboard',
            backLabel: t('common.home'),
          });
        },
      },
      {
        key: 'profile',
        icon: 'store-cog-outline',
        title: t('partnerDashboard.serviceCenterProfileTitle'),
        subtitle: t('partnerDashboard.serviceCenterProfileSubtitle'),
        onPress: () => openCenter(),
      },
      {
        key: 'public-preview',
        icon: 'web',
        title: t('partnerDashboard.publicPagePreviewTitle'),
        subtitle: t('partnerDashboard.publicPagePreviewSubtitle'),
        onPress: () =>
          setupComplete
            ? openPartnerPublicPreview(navigation)
            : openCenter(),
      },
    ],
    [
      navigation,
      pendingOffers.length,
      todayBookings.length,
      ongoingRepairs.length,
      unscheduledCount,
      setupComplete,
      openCenter,
      t,
    ]
  );

  const comingSoonItems = useMemo(
    () => [
      {
        key: 'documents',
        icon: 'file-document-outline',
        title: t('partnerDashboard.modules.documents.title'),
        subtitle: t('partnerDashboard.modules.documents.subtitle'),
        onPress: () =>
          showMessage(t('partnerDashboard.comingSoonDialog.title'), t('partnerDashboard.comingSoonDialog.documentsBody'), {
            variant: 'info',
          }),
      },
      {
        key: 'inventory',
        icon: 'warehouse',
        title: t('partnerDashboard.modules.inventory.title'),
        subtitle: t('partnerDashboard.modules.inventory.subtitle'),
        onPress: () =>
          showMessage(t('partnerDashboard.comingSoonDialog.title'), t('partnerDashboard.comingSoonDialog.inventoryBody'), {
            variant: 'info',
          }),
      },
      {
        key: 'reports',
        icon: 'chart-line',
        title: t('partnerDashboard.modules.reports.title'),
        subtitle: t('partnerDashboard.modules.reports.subtitle'),
        onPress: () =>
          showMessage(
            t('partnerDashboard.comingSoonDialog.title'),
            t('partnerDashboard.comingSoonDialog.reportsBody', {
              open: openRepairs.length,
              active: ongoingRepairs.length,
              pending: pendingOffers.length,
            }),
            { variant: 'info' }
          ),
      },
      {
        key: 'customers',
        icon: 'account-group-outline',
        title: t('partnerDashboard.modules.customers.title'),
        subtitle: t('partnerDashboard.modules.customers.subtitle'),
        onPress: () =>
          showMessage(
            t('partnerDashboard.comingSoonDialog.title'),
            t('partnerDashboard.comingSoonDialog.customersBody'),
            { variant: 'info' }
          ),
      },
      {
        key: 'market-intelligence',
        icon: 'chart-timeline-variant',
        title: t('partnerDashboard.modules.marketIntelligence.title'),
        subtitle: t('partnerDashboard.modules.marketIntelligence.subtitle'),
        onPress: () =>
          showMessage(
            t('partnerDashboard.comingSoonDialog.marketIntelligenceTitle'),
            t('partnerDashboard.comingSoonDialog.marketIntelligenceBody'),
            { variant: 'info' }
          ),
      },
    ],
    [openRepairs.length, ongoingRepairs.length, pendingOffers.length, t]
  );

  const renderDashboardRepair = (item) => (
    <PartnerRepairRequestCard
      key={String(item.id)}
      repair={item}
      canSendOffers={canSendOffers}
      onPressDetails={(repair) => handleRepairPress(repair.id)}
      onPressOffer={handleRepairOffer}
      onPressPrimary={(repair) => handleRepairPress(repair.id)}
    />
  );

  if (loading) {
    return (
      <ScreenBackground>
        <View style={styles.loaderCenter}>
          <ActivityIndicator size="large" color="#fff" />
        </View>
      </ScreenBackground>
    );
  }

  return (
    <ScreenBackground safeArea={false}>
      <PartnerAppHeader
        mode="dashboard"
        title={shopDisplayName}
        unreadCount={unreadCount}
        calendarBadgeCount={unscheduledCount}
        loadCalendarBadge={false}
        onTitlePress={() => openCenter()}
        onLogoutPress={handleLogout}
      />

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {!setupComplete ? (
          <ShopProfileSetupBanner
            missingFields={missingProfileFields}
            percent={setupPercent}
            onCompletePress={() => openCenter()}
          />
        ) : null}

        {!partnerActive ? (
          <PartnerActivationBanner
            openRequestCount={openRepairs.length}
            onActivatePress={() =>
              navigation.navigate(
                'ShopSubscriptionUpgrade',
                upgradeNavigationParams({ featureKey: FEATURES.REPAIRS })
              )
            }
          />
        ) : null}

        <DashboardHero
          compact
          title={t('partnerDashboard.heroTitle')}
          subtitle={t('partnerDashboard.heroSubtitle')}
        />

        <DashboardSection
          title={t('partnerDashboard.openRepairRequests')}
          subtitle={
            lifecycleCounterLine || t('partnerDashboard.openRequestsEmptySubtitle')
          }
          actionLabel={t('partnerDashboard.viewRequests')}
          onActionPress={() => resetShopDrawerRepairs(navigation)}
        >
          {repairsLoading ? (
            <ActivityIndicator color="#fff" style={{ marginVertical: 12 }} />
          ) : sortedDashboardRepairs.length === 0 ? (
            <PartnerEmptyRequestsState />
          ) : (
            sortedDashboardRepairs.slice(0, 8).map(renderDashboardRepair)
          )}
        </DashboardSection>

        <DashboardSection
          title={t('partnerDashboard.operationsTitle')}
          subtitle={t('partnerDashboard.operationsSubtitle')}
        >
          {dashboardLoading ? (
            <ActivityIndicator color="#fff" style={{ marginVertical: 8 }} />
          ) : (
            <DashboardActionGrid tiles={operationsTiles} />
          )}
        </DashboardSection>

        <DashboardComingSoonSection
          featured={<ReadyToDriveComingSoonCard />}
          items={comingSoonItems}
        />
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 28,
  },
  loaderCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
