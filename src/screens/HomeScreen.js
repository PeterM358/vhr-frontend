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
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { FAB, useTheme } from 'react-native-paper';
import { logout } from '../api/auth';
import { getCachedVehicles, getVehicles } from '../api/vehicles';
import { getRepairs } from '../api/repairs';
import { isTerminalRepairStatus, normalizeRepairStatus } from '../utils/repairArrival';
import { WebSocketContext } from '../context/WebSocketManager';
import { AuthContext } from '../context/AuthManager';
import ScreenBackground from '../components/ScreenBackground';
import GlobalNavigationBar from '../components/common/GlobalNavigationBar';
import DashboardSection from '../components/dashboard/DashboardSection';
import DashboardHeroCard from '../components/dashboard/DashboardHeroCard';
import DashboardSummaryRow from '../components/dashboard/DashboardSummaryRow';
import DashboardActionGrid from '../components/dashboard/DashboardActionGrid';
import VehicleHealthSection from '../components/dashboard/VehicleHealthSection';
import RecommendedActionsSection from '../components/dashboard/RecommendedActionsSection';
import { buildRecommendedActions } from '../utils/dashboardFormatters';
import { useScrollContentBottomPadding } from '../utils/mobileWebInsets';
import {
  navigateToDocuments,
  navigateToNotifications,
  navigateToRepairRequests,
  navigateToRepairDetail,
  navigateToServiceHistory,
  navigateToVehicleAdd,
  navigateToVehicleDetail,
  navigateToVehicleList,
  navigateToVehicleServiceRecordNew,
} from '../navigation/webNavigation';
import { API_BASE_URL } from '../api/config';
import { openServiceCenters } from '../navigation/serviceCentersNavigation';
import { resetToPublicHome } from '../navigation/authNavigation';
import { resolveIsPartnerSession } from '../utils/partnerSession';
import { buildShopAuthReset, resolveShopEntryRoute } from '../utils/shopAuthNavigation';
import { toCanonicalAppPath } from '../navigation/localizedRoutes';
import { useTranslation } from '../i18n';


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
  const { t } = useTranslation();
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
  const { unreadCount: unreadNotifications } = useContext(WebSocketContext);

  const [vehicles, setVehicles] = useState(() => getCachedVehicles());
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
          // Only bounce partner sessions off the client dashboard URL (refresh / deep link).
          // Do not block intentional dual-role navigation into client Home from elsewhere.
          const pathOnly =
            Platform.OS === 'web' && typeof window !== 'undefined'
              ? String(window.location.pathname || '').split('?')[0]
              : '';
          const canonical = toCanonicalAppPath(pathOnly) || pathOnly;
          const onClientDashboard =
            !pathOnly ||
            String(canonical).replace(/\/$/, '') === '/dashboard';
          if (onClientDashboard) {
            const isPartner = await resolveIsPartnerSession();
            if (isPartner) {
              const route = await resolveShopEntryRoute();
              navigation.reset(buildShopAuthReset(route));
              return;
            }
          }
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

      const cachedVehicleRows = getCachedVehicles();
      if (cachedVehicleRows.length > 0) {
        setVehicles(cachedVehicleRows);
      }

      const loadDashboard = async () => {
        if (!hasSession) return;
        setDashboardLoading(true);
        try {
          const token = await AsyncStorage.getItem('@access_token');
          const [vehicleRows, repairRows, offersRes] = await Promise.all([
            getVehicles().catch(() => null),
            getRepairs(token).catch(() => []),
            fetch(`${API_BASE_URL}/api/offers/`, {
              headers: { Authorization: `Bearer ${token}` },
            }).catch(() => null),
          ]);
          const safeVehicles = Array.isArray(vehicleRows)
            ? vehicleRows
            : getCachedVehicles();
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

  const hasVehicles = vehicles.length > 0;

  const handleLogout = async () => {
    await logout(navigation, setAuthToken, setIsAuthenticated, setUserEmailOrPhone);
  };

  const goRequestService = (vehicle) => {
    navigation.navigate('CreateRepair', {
      ...(vehicle?.id ? { vehicleId: vehicle.id } : {}),
      mode: 'request',
      returnTo: 'Home',
      origin: 'Home',
    });
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
    const root = navigation.getParent?.() || navigation;
    navigateToRepairDetail(root, repairId, { returnTo: 'Home' });
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
        navigateToVehicleServiceRecordNew(navigation, item.vehicleId, {
          returnTo: 'Home',
          origin: 'Home',
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
      { key: 'vehicles', value: vehicles.length, label: t('dashboard.summary.vehicles'), onPress: goVehicles },
      {
        key: 'requests',
        value: openRequestsCount,
        label: t('dashboard.summary.openRequests'),
        onPress: goRepairs,
      },
      {
        key: 'offers',
        value: pendingOffersCount,
        label: t('dashboard.summary.pendingOffers'),
        onPress: goPendingOffers,
      },
      {
        key: 'alerts',
        value: unreadNotifications,
        label: t('dashboard.summary.unreadAlerts'),
        onPress: goNotificationCenter,
      },
    ],
    [vehicles.length, openRequestsCount, pendingOffersCount, unreadNotifications, t]
  );

  const actionTiles = useMemo(
    () => [
      {
        key: 'vehicles',
        icon: 'car-multiple',
        title: t('dashboard.actions.vehiclesTitle'),
        subtitle: t('dashboard.actions.vehiclesSubtitle'),
        onPress: goVehicles,
      },
      {
        key: 'history',
        icon: 'book-open-page-variant',
        title: t('dashboard.actions.serviceHistoryTitle'),
        subtitle: t('dashboard.actions.serviceHistorySubtitle'),
        onPress: goServiceHistory,
      },
      {
        key: 'centers',
        icon: 'map-search',
        title: t('dashboard.actions.findCentersTitle'),
        subtitle: t('dashboard.actions.findCentersSubtitle'),
        onPress: goFindCenters,
      },
      {
        key: 'documents',
        icon: 'file-document-outline',
        title: t('dashboard.actions.documentsTitle'),
        subtitle: t('dashboard.actions.documentsSubtitle'),
        onPress: goDocuments,
      },
    ],
    [t]
  );

  const recommendedActions = useMemo(
    () => buildRecommendedActions(vehicles, activeRepairs, t),
    [vehicles, activeRepairs, t]
  );

  const fabConfig = hasVehicles
    ? { label: t('dashboard.fab.requestService'), onPress: () => goRequestService() }
    : { label: t('dashboard.fab.addVehicle'), onPress: goAddVehicle };

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
      <GlobalNavigationBar
        title={username}
        unreadNotifications={unreadNotifications}
        onMenuPress={() => navigation.openDrawer()}
        onNotificationsPress={goNotificationCenter}
        onLogoutPress={handleLogout}
      />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: scrollBottomPadding }]}
        keyboardShouldPersistTaps="handled"
      >
        <DashboardHeroCard
          title={t('dashboard.greeting', { name: heroName })}
          subtitle={t('dashboard.heroSubtitle')}
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
          title={t('dashboard.health.sectionTitle')}
          subtitle={t('dashboard.health.noVehiclesBody')}
          actionLabel={hasVehicles ? t('vehicles.title') : undefined}
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
            title={t('dashboard.recommendedActions.title')}
            subtitle={t('dashboard.recommendedActions.subtitle')}
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
