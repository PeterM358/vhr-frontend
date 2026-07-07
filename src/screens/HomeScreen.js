/**
 * PATH: src/screens/HomeScreen.js
 * Veversal client platform home — personal vehicle control center.
 */

import React, { useCallback, useContext, useMemo, useState } from 'react';
import {
  View,
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
import { isTerminalRepairStatus, normalizeRepairStatus } from '../utils/repairArrival';
import { WebSocketContext } from '../context/WebSocketManager';
import { AuthContext } from '../context/AuthManager';
import ScreenBackground from '../components/ScreenBackground';
import DashboardSection from '../components/dashboard/DashboardSection';
import DashboardHeroCard from '../components/dashboard/DashboardHeroCard';
import DashboardSummaryRow from '../components/dashboard/DashboardSummaryRow';
import DashboardActionGrid from '../components/dashboard/DashboardActionGrid';
import VehicleHealthSection from '../components/dashboard/VehicleHealthSection';
import RecommendedActionsSection from '../components/dashboard/RecommendedActionsSection';
import { buildRecommendedActions } from '../utils/dashboardFormatters';
import { useScrollContentBottomPadding } from '../utils/mobileWebInsets';
import { resetFromClientDrawer } from '../navigation/drawerNavigation';
import {
  navigateToDocuments,
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

const HOME_TOP_BAR = 'rgba(11,18,32,0.92)';

const HERO_SUBTITLE = 'Your vehicles, service history, and repair requests — in one control center.';

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
  const [activeRepairs, setActiveRepairs] = useState([]);
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
            (repair) => normalizeRepairStatus(repair?.status) === 'open'
          );
          let offersCount = 0;
          if (offersRes?.ok) {
            const offerRows = await offersRes.json().catch(() => []);
            offersCount = Array.isArray(offerRows)
              ? offerRows.filter((offer) => !offer.is_booked).length
              : 0;
          }
          setVehicles(safeVehicles);
          setActiveRepairs(nonTerminalRepairs);
          setOpenRequestsCount(openRepairRows.length);
          setPendingOffersCount(offersCount);
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

  const goRequestService = (vehicle) => {
    if (vehicle?.id) {
      navigation.navigate('CreateRepair', {
        vehicleId: vehicle.id,
        mode: 'request',
        returnTo: 'Home',
        origin: 'Home',
      });
      return;
    }
    resetFromClientDrawer(navigation, 'CreateRepair');
  };
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
  const goDocuments = () => {
    const root = navigation.getParent?.() || navigation;
    navigateToDocuments(root);
  };
  const goNotificationCenter = () => {
    const root = navigation.getParent?.() || navigation;
    navigateToNotifications(root);
  };
  const goServiceHistory = () => {
    const root = navigation.getParent?.() || navigation;
    navigateToServiceHistory(root);
  };
  const goRepairDetail = (repairId) => {
    if (!repairId) return;
    navigation.navigate('RepairDetail', { repairId, returnTo: 'Home' });
  };

  const handleRecommendedAction = (item) => {
    if (!item?.vehicleId) return;

    switch (item.actionKey) {
      case 'schedule_maintenance':
      case 'book_repair':
        navigation.navigate('CreateRepair', {
          vehicleId: item.vehicleId,
          mode: 'request',
          returnTo: 'Home',
          origin: 'Home',
        });
        break;
      case 'add_service_history':
        navigation.navigate('LogServiceRecord', {
          vehicleId: item.vehicleId,
          returnTo: 'Home',
        });
        break;
      case 'update_km':
      case 'configure_reminders':
        goVehicleDetail({ id: item.vehicleId });
        break;
      default:
        goVehicleDetail({ id: item.vehicleId });
        break;
    }
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

  const actionTiles = useMemo(
    () => [
      {
        key: 'vehicles',
        icon: 'car-multiple',
        title: 'Vehicles',
        subtitle: 'Manage your garage',
        onPress: goVehicles,
      },
      {
        key: 'history',
        icon: 'book-open-page-variant',
        title: 'Service History',
        subtitle: 'Repairs & maintenance',
        onPress: goServiceHistory,
      },
      {
        key: 'centers',
        icon: 'map-search',
        title: 'Find Service Centers',
        subtitle: 'Book trusted repairs',
        onPress: goFindCenters,
      },
      {
        key: 'documents',
        icon: 'file-document-outline',
        title: 'Documents',
        subtitle: 'Invoices, warranties & records',
        onPress: goDocuments,
      },
    ],
    []
  );

  const recommendedActions = useMemo(
    () => buildRecommendedActions(vehicles, activeRepairs),
    [vehicles, activeRepairs]
  );

  const fabConfig = hasVehicles
    ? { label: 'Request Service', onPress: () => goRequestService() }
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
        <DashboardHeroCard
          title={`Welcome, ${heroName}`}
          subtitle={HERO_SUBTITLE}
        />

        {dashboardLoading ? (
          <ActivityIndicator color="#fff" style={styles.gridLoader} />
        ) : (
          <>
            <DashboardSummaryRow items={summaryItems} />
            <DashboardActionGrid tiles={actionTiles} />
          </>
        )}

        <DashboardSection
          title="Vehicle Health"
          subtitle="Status and priority issues for each vehicle."
          actionLabel={hasVehicles ? 'All vehicles' : undefined}
          onActionPress={hasVehicles ? goVehicles : undefined}
        >
          <VehicleHealthSection
            vehicles={vehicles}
            activeRepairs={activeRepairs}
            onVehiclePress={goVehicleDetail}
            onViewAllPress={goVehicles}
            onRequestService={goRequestService}
            onViewRepair={goRepairDetail}
          />
        </DashboardSection>

        {recommendedActions.length > 0 ? (
          <DashboardSection
            title="Recommended Actions"
            subtitle="Maintenance and updates that need your attention."
          >
            <RecommendedActionsSection
              actions={recommendedActions}
              onActionPress={handleRecommendedAction}
            />
          </DashboardSection>
        ) : null}
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
  gridLoader: {
    marginVertical: 24,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 20,
  },
});
