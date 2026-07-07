/**
 * PATH: src/screens/HomeScreen.js
 * Veversal client platform home — personal vehicle control center.
 */

import React, { useCallback, useContext, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { Appbar, Badge, FAB, useTheme } from 'react-native-paper';
import { logout } from '../api/auth';
import { getVehicles } from '../api/vehicles';
import { getRepairs } from '../api/repairs';
import { isTerminalRepairStatus } from '../utils/repairArrival';
import { WebSocketContext } from '../context/WebSocketManager';
import { AuthContext } from '../context/AuthManager';
import ScreenBackground from '../components/ScreenBackground';
import DashboardHero from '../components/dashboard/DashboardHero';
import DashboardSection from '../components/dashboard/DashboardSection';
import DashboardQuickActions from '../components/dashboard/DashboardQuickActions';
import DashboardSummaryRow from '../components/dashboard/DashboardSummaryRow';
import DashboardEmptyState from '../components/dashboard/DashboardEmptyState';
import NotificationCenterPreview from '../components/dashboard/NotificationCenterPreview';
import VehicleHealthSection from '../components/dashboard/VehicleHealthSection';
import SmartRemindersCard from '../components/dashboard/SmartRemindersCard';
import RecommendedForYouSection from '../components/dashboard/RecommendedForYouSection';
import FloatingCard from '../components/ui/FloatingCard';
import { NOTIFICATION_CENTER_PLACEHOLDERS } from '../constants/clientDashboardPlaceholders';
import { COLORS } from '../constants/colors';
import { useScrollContentBottomPadding } from '../utils/mobileWebInsets';
import { resetFromClientDrawer } from '../navigation/drawerNavigation';
import {
  navigateToNotifications,
  navigateToRepairRequests,
  navigateToServiceHistory,
  navigateToVehicleAdd,
  navigateToVehicleDetail,
  navigateToVehicleList,
} from '../navigation/webNavigation';
import { API_BASE_URL } from '../api/config';
import { openServiceCenters } from '../navigation/serviceCentersNavigation';
import { resetToPublicHome } from '../navigation/authNavigation';
import { showMessage } from '../utils/crossPlatformAlert';

const HOME_TOP_BAR = 'rgba(11,18,32,0.92)';

const HERO_SUBTITLE =
  'Manage your vehicles, discover trusted service centers, compare offers, get timely reminders and keep your complete service history in one place.';

function toDisplayName(rawValue) {
  const raw = String(rawValue || '').trim();
  if (!raw) return 'there';
  if (raw.includes('@')) {
    return raw.split('@')[0] || raw;
  }
  return raw;
}

function extractFirstName(rawValue) {
  const raw = String(rawValue || '').trim();
  if (!raw) return '';
  const fromEmail = raw.includes('@') ? raw.split('@')[0] : raw;
  const normalized = fromEmail.replace(/[._-]+/g, ' ').trim();
  if (!normalized) return '';
  const firstToken = normalized.split(/\s+/)[0] || '';
  const lettersOnly = firstToken.replace(/[0-9]+/g, '');
  if (!lettersOnly) return '';
  return lettersOnly.charAt(0).toUpperCase() + lettersOnly.slice(1);
}

export default function HomeScreen({ navigation }) {
  const theme = useTheme();
  const {
    authToken,
    isAuthenticated,
    isLoading,
    setAuthToken,
    setIsAuthenticated,
    userEmailOrPhone,
    setUserEmailOrPhone,
  } = useContext(AuthContext);
  const hasSession = isAuthenticated || !!authToken;
  const { notifications } = useContext(WebSocketContext);

  const [vehicles, setVehicles] = useState([]);
  const [openRepairs, setOpenRepairs] = useState([]);
  const [activeRepairs, setActiveRepairs] = useState([]);
  const [recentRepairs, setRecentRepairs] = useState([]);
  const [openRequestsCount, setOpenRequestsCount] = useState(0);
  const [pendingOffersCount, setPendingOffersCount] = useState(0);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [sessionChecked, setSessionChecked] = useState(false);
  const scrollBottomPadding = useScrollContentBottomPadding(80);

  useFocusEffect(
    useCallback(() => {
      const loadUser = async () => {
        const last = await AsyncStorage.getItem('@user_email_or_phone');
        if (setUserEmailOrPhone) setUserEmailOrPhone(last || '');
      };

      const ensureAuthOrPublicHome = async () => {
        if (isLoading) return;

        const token = await AsyncStorage.getItem('@access_token');
        const hasToken = !!(token && token !== 'null' && token !== 'undefined');
        if (hasToken) {
          if (!isAuthenticated || !authToken) {
            setAuthToken?.(token);
            setIsAuthenticated?.(true);
          }
          setSessionChecked(true);
          return;
        }

        if (!hasSession) {
          resetToPublicHome(navigation);
        }
        setSessionChecked(true);
      };

      const loadDashboard = async () => {
        if (!hasSession) return;
        setDashboardLoading(true);
        try {
          const token = await AsyncStorage.getItem('@access_token');
          const [vehicleRows, repairRows, offersRes] = await Promise.all([
            getVehicles().catch(() => []),
            getRepairs(token).catch(() => []),
            fetch(`${API_BASE_URL}/api/offers/`, {
              headers: { Authorization: `Bearer ${token}` },
            }).catch(() => null),
          ]);
          const safeVehicles = Array.isArray(vehicleRows) ? vehicleRows : [];
          const safeRepairs = Array.isArray(repairRows) ? repairRows : [];
          const nonTerminalRepairs = safeRepairs.filter(
            (repair) => !isTerminalRepairStatus(repair?.status)
          );
          const openRepairRows = nonTerminalRepairs.filter(
            (repair) => String(repair?.status || '').toLowerCase() === 'open'
          );
          let offersCount = 0;
          if (offersRes?.ok) {
            const offerRows = await offersRes.json().catch(() => []);
            offersCount = Array.isArray(offerRows)
              ? offerRows.filter((offer) => !offer.is_booked).length
              : 0;
          }
          setVehicles(safeVehicles);
          setOpenRepairs(openRepairRows);
          setActiveRepairs(nonTerminalRepairs);
          setOpenRequestsCount(openRepairRows.length);
          setPendingOffersCount(offersCount);
          setRecentRepairs(openRepairRows.slice(0, 4));
        } finally {
          setDashboardLoading(false);
        }
      };

      loadUser();
      ensureAuthOrPublicHome();
      loadDashboard();
    }, [
      authToken,
      hasSession,
      isAuthenticated,
      isLoading,
      navigation,
      setAuthToken,
      setIsAuthenticated,
      setUserEmailOrPhone,
    ])
  );

  const unreadNotifications = notifications.filter((n) => !n.is_read).length;
  const hasVehicles = vehicles.length > 0;

  const handleLogout = async () => {
    await logout(navigation, setAuthToken, setIsAuthenticated, setUserEmailOrPhone);
  };

  const goRequestService = () => resetFromClientDrawer(navigation, 'CreateRepair');
  const goAddVehicle = () => {
    const root = navigation.getParent?.() || navigation;
    navigateToVehicleAdd(root);
  };
  const goFindCenters = () => openServiceCenters(navigation);
  const goVehicleDetail = (vehicle) => {
    if (!vehicle?.id) return;
    const root = navigation.getParent?.() || navigation;
    navigateToVehicleDetail(root, vehicle.id);
  };
  const goVehicles = () => {
    const root = navigation.getParent?.() || navigation;
    navigateToVehicleList(root);
  };
  const goRepairs = () => {
    const root = navigation.getParent?.() || navigation;
    navigateToRepairRequests(root);
  };
  const goPendingOffers = () => {
    const root = navigation.getParent?.() || navigation;
    navigateToRepairRequests(root, { tab: 'offers' });
  };
  const goNotificationCenter = () => {
    const root = navigation.getParent?.() || navigation;
    navigateToNotifications(root);
  };
  const goServiceHistory = () => {
    const root = navigation.getParent?.() || navigation;
    navigateToServiceHistory(root);
  };

  const summaryItems = useMemo(
    () => [
      { key: 'vehicles', value: vehicles.length, label: 'Vehicles', onPress: goVehicles },
      {
        key: 'requests',
        value: openRequestsCount,
        label: 'Open Requests',
        onPress: goRepairs,
      },
      {
        key: 'offers',
        value: pendingOffersCount,
        label: 'Pending Offers',
        onPress: goPendingOffers,
      },
      {
        key: 'alerts',
        value: unreadNotifications,
        label: 'Unread Alerts',
        onPress: goNotificationCenter,
      },
    ],
    [vehicles.length, openRequestsCount, pendingOffersCount, unreadNotifications]
  );

  const quickActions = useMemo(
    () => [
      { key: 'vehicles', icon: 'car-multiple', label: 'My Vehicles', onPress: goVehicles },
      {
        key: 'history',
        icon: 'book-open-page-variant',
        label: 'Service History',
        onPress: goServiceHistory,
      },
      {
        key: 'repairs',
        icon: 'wrench-outline',
        label: 'Repair Requests',
        onPress: goRepairs,
      },
      {
        key: 'notifications',
        icon: 'bell-outline',
        label: 'Notifications',
        onPress: goNotificationCenter,
        badge: unreadNotifications,
      },
    ],
    [unreadNotifications]
  );

  const handlePlaceholderNotificationAction = (item) => {
    showMessage(item.title, `${item.description}\n\nThis action will connect to live data later.`, {
      variant: 'info',
    });
  };

  const fabConfig = hasVehicles
    ? { label: 'Request Service', onPress: goRequestService }
    : { label: 'Add Vehicle', onPress: goAddVehicle };

  if (isLoading || !sessionChecked) {
    return (
      <ScreenBackground>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#fff" />
        </View>
      </ScreenBackground>
    );
  }

  if (!hasSession) {
    return (
      <ScreenBackground>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#fff" />
        </View>
      </ScreenBackground>
    );
  }

  let username = userEmailOrPhone?.trim() || 'User';
  if (username.includes('@')) username = username.split('@')[0];
  const firstName = extractFirstName(userEmailOrPhone);
  const heroName = firstName || toDisplayName(userEmailOrPhone);

  return (
    <ScreenBackground safeArea={false}>
      <Appbar.Header style={{ backgroundColor: HOME_TOP_BAR }}>
        <Appbar.Action icon="menu" onPress={() => navigation.openDrawer()} color="#fff" />
        <Appbar.Content title={username} titleStyle={{ color: '#fff' }} />
        <View style={styles.iconWithBadge}>
          <Appbar.Action icon="bell-outline" onPress={goNotificationCenter} color="#fff" />
          {unreadNotifications > 0 ? (
            <Badge style={styles.notificationBadge}>{unreadNotifications}</Badge>
          ) : null}
        </View>
        <Appbar.Action icon="logout" onPress={handleLogout} color="#fff" />
      </Appbar.Header>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: scrollBottomPadding }]}
        keyboardShouldPersistTaps="handled"
      >
        <DashboardHero
          title={`Welcome, ${heroName}`}
          subtitle={HERO_SUBTITLE}
          primaryLabel="Find Service Centers"
          primaryIcon="map-search"
          onPrimaryPress={goFindCenters}
        />

        <DashboardSummaryRow items={summaryItems} />

        <DashboardQuickActions actions={quickActions} />

        <DashboardSection
          title="Vehicle Health"
          subtitle="Prevent problems before they happen — see status, risks and service gaps per vehicle."
        >
          <VehicleHealthSection
            vehicles={vehicles}
            activeRepairs={activeRepairs}
            onVehiclePress={goVehicleDetail}
            onViewAllPress={goVehicles}
          />
        </DashboardSection>

        <DashboardSection
          title="Reminders & Preventive Care"
          subtitle="Stay ahead of maintenance with smart reminders, safety alerts and preventive recommendations."
        >
          <SmartRemindersCard hasVehicles={hasVehicles} />
        </DashboardSection>

        <DashboardSection
          title="Recommended For You"
          subtitle="Personalized suggestions from your vehicle history — not generic ads."
        >
          <RecommendedForYouSection />
        </DashboardSection>

        <DashboardSection
          title="Recent repair requests"
          subtitle="Open requests and offers from service centers."
          actionLabel={recentRepairs.length > 0 ? 'View all' : undefined}
          onActionPress={recentRepairs.length > 0 ? goRepairs : undefined}
        >
          {dashboardLoading ? (
            <ActivityIndicator color="#fff" style={{ marginVertical: 12 }} />
          ) : recentRepairs.length === 0 ? (
            <DashboardEmptyState
              title="No repair requests yet"
              body="When you request service, offers from trusted service centers will appear here."
            />
          ) : (
            recentRepairs.map((item) => {
              const title =
                `${item.vehicle_make || ''} ${item.vehicle_model || ''}`.trim() || 'Vehicle';
              return (
                <FloatingCard
                  key={String(item.id)}
                  onPress={() => navigation.navigate('RepairDetail', { repairId: item.id })}
                >
                  <Text style={styles.repairTitle}>{title}</Text>
                  {item.vehicle_license_plate ? (
                    <Text style={styles.repairMeta}>{item.vehicle_license_plate}</Text>
                  ) : null}
                  {item.description ? (
                    <Text style={styles.repairDesc} numberOfLines={2}>
                      {item.description}
                    </Text>
                  ) : null}
                </FloatingCard>
              );
            })
          )}
        </DashboardSection>

        <DashboardSection
          title="Notification Center"
          subtitle="Alerts, maintenance, offers, bookings and documents for your vehicles."
        >
          <NotificationCenterPreview
            items={NOTIFICATION_CENTER_PLACEHOLDERS}
            limit={2}
            onActionPress={handlePlaceholderNotificationAction}
            onViewAllPress={goNotificationCenter}
          />
        </DashboardSection>

        <DashboardSection
          title="Learn with Veversal"
          subtitle="Guides and videos about vehicle maintenance, repairs and service records will appear here."
        >
          <DashboardEmptyState
            title="Coming soon"
            body="Educational content and support videos will be available in this section."
          />
        </DashboardSection>
      </ScrollView>

      <FAB
        label={fabConfig.label}
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        color="#fff"
        onPress={fabConfig.onPress}
      />
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
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
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  scroll: {
    paddingHorizontal: 14,
    paddingTop: 12,
  },
  repairTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.TEXT_DARK,
  },
  repairMeta: {
    fontSize: 12,
    color: COLORS.TEXT_MUTED,
    marginTop: 4,
  },
  repairDesc: {
    fontSize: 13,
    color: COLORS.TEXT_MUTED,
    marginTop: 6,
    lineHeight: 18,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 20,
  },
});
