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
  Pressable,
  Platform,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Appbar, Badge } from 'react-native-paper';
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
import {
  comparePartnerLifecycle,
  countByLifecycle,
  formatLifecycleCounterLine,
} from '../utils/partnerRepairLifecycle';
import { navigateToPartnerProfile, navigateToPartnerPublicPreview, navigateToPartnerCalendar, navigateToPartnerNotifications, navigateToPartnerRepairOffer, navigateToPartnerRepairDetail } from '../navigation/webNavigation';
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
} from '../utils/partnerSubscription';
import { todayCalendarRange, isScheduledToday } from '../utils/dashboardDate';
import { showMessage } from '../utils/crossPlatformAlert';
import { resetShopDrawerRepairs } from '../navigation/drawerNavigation';
import { useTranslation } from '../i18n';
import CompactLanguageSelector from '../components/common/CompactLanguageSelector';

const SHOP_TOP_BAR = 'rgba(11,18,32,0.92)';

function asRepairRows(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  return [];
}

function openPartnerProfile(navigation, params = {}) {
  if (Platform.OS === 'web') {
    navigateToPartnerProfile(navigation, params);
    return;
  }
  navigation.navigate('ShopProfile', params);
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

  const lastRepairNotifIdRef = React.useRef(null);

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
      setCachedShopRepairs('open', openRows);
    } catch (err) {
      console.error('Failed to load dashboard repairs', err);
      setDashboardRepairs([]);
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

      const [ongoing, offers, calendar] = await Promise.all([
        getRepairs(token, 'ongoing').then(asRepairRows).catch(() => []),
        getMyOffers(token).catch(() => []),
        getShopCalendar(token, { from, to, shopId }).catch(() => ({ scheduled: [] })),
      ]);

      setOngoingRepairs(asRepairRows(ongoing));
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
    if (latestNotificationId === lastRepairNotifIdRef.current) return;
    const latest = notifications[0];
    const eventType = String(
      latest?.data?.event_type || latest?.event_type || latest?.notification_type || ''
    ).toLowerCase();
    if (!eventType.includes('repair_request')) return;
    lastRepairNotifIdRef.current = latestNotificationId;
    loadDashboardRepairs({ background: true });
  }, [latestNotificationId, notifications, loadDashboardRepairs]);

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
      backLabel: t('common.home'),
    });
  };

  const handleRepairOffer = (repair) => {
    const repairId = repair?.id;
    if (!repairId) return;
    if (!canSendOffers) {
      showMessage(
        t('partnerDashboard.activation.requiredTitle'),
        t('partnerDashboard.activation.requiredBody'),
        { variant: 'info' }
      );
      openPartnerProfile(navigation, { requireSetup: true });
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
        onPress: () =>
          openPartnerProfile(navigation, {
            requireSetup: !profileComplete,
          }),
      },
      {
        key: 'public-preview',
        icon: 'web',
        title: t('partnerDashboard.publicPagePreviewTitle'),
        subtitle: t('partnerDashboard.publicPagePreviewSubtitle'),
        onPress: () =>
          openPartnerPublicPreview(navigation, {
            requireSetup: !profileComplete,
          }),
      },
    ],
    [
      navigation,
      pendingOffers.length,
      todayBookings.length,
      ongoingRepairs.length,
      unscheduledCount,
      profileComplete,
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
      <Appbar.Header style={{ backgroundColor: SHOP_TOP_BAR }}>
        <Appbar.Action icon="menu" onPress={() => navigation.openDrawer()} color="#fff" />
        <View style={styles.languageSelectorWrap}>
          <CompactLanguageSelector
            variant="dark"
            compact
            presentation={Platform.OS === 'web' ? 'portalDropdown' : 'modal'}
            style={styles.languageSelector}
          />
        </View>
        <Pressable
          onPress={() => openPartnerProfile(navigation, { requireSetup: !profileComplete })}
          style={styles.titlePressable}
          accessibilityRole="button"
          accessibilityLabel={t('partnerDashboard.openCenterDetails')}
        >
          <Appbar.Content title={shopDisplayName} titleStyle={{ color: '#fff' }} />
        </Pressable>
        <View style={styles.iconWithBadge}>
          <Appbar.Action
            icon="calendar-month-outline"
            onPress={() => {
              if (Platform.OS === 'web') {
                navigateToPartnerCalendar(navigation);
                return;
              }
              navigation.navigate('ShopCalendar', {
                returnTo: 'ShopDashboard',
                backLabel: t('common.home'),
              });
            }}
            color="#fff"
          />
          {unscheduledCount > 0 ? (
            <Badge style={styles.notificationBadge}>{unscheduledCount}</Badge>
          ) : null}
        </View>
        <View style={styles.iconWithBadge}>
          <Appbar.Action
            icon="bell-outline"
            onPress={() => {
              if (Platform.OS === 'web') {
                navigateToPartnerNotifications(navigation);
                return;
              }
              navigation.navigate('NotificationsList');
            }}
            color="#fff"
          />
          {unreadCount > 0 ? <Badge style={styles.notificationBadge}>{unreadCount}</Badge> : null}
        </View>
        <Appbar.Action icon="logout" onPress={handleLogout} color="#fff" />
      </Appbar.Header>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {!profileComplete ? (
          <ShopProfileSetupBanner
            missingFields={missingProfileFields}
            onCompletePress={() => openPartnerProfile(navigation, { requireSetup: true })}
          />
        ) : null}

        {!partnerActive ? (
          <PartnerActivationBanner
            openRequestCount={openRepairs.length}
            onActivatePress={() => openPartnerProfile(navigation, { requireSetup: true })}
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
  languageSelectorWrap: {
    justifyContent: 'center',
    marginLeft: 2,
    marginRight: 4,
  },
  languageSelector: {
    maxWidth: 92,
  },
  titlePressable: {
    flex: 1,
    justifyContent: 'center',
  },
  iconWithBadge: {
    position: 'relative',
    marginRight: 8,
  },
  notificationBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'red',
    color: 'white',
  },
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
