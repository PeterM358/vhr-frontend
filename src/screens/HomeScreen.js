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
  Pressable,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { FAB, Text, useTheme } from 'react-native-paper';
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
import DashboardCard from '../components/dashboard/DashboardCard';
import VehicleHealthSection from '../components/dashboard/VehicleHealthSection';
import RecommendedActionsSection from '../components/dashboard/RecommendedActionsSection';
import { buildRecommendedActions } from '../utils/dashboardFormatters';
import { useScrollContentBottomPadding } from '../utils/mobileWebInsets';
import { useFabBottomOffset } from '../components/common/StickyFormFooter';
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
import { readOrganizationMemberships, resolveIsOrgOnlySession } from '../utils/orgWorkspace';
import {
  WORKSPACE_MODE,
  getWorkspaceMode,
  isDriverMembership,
  pickActiveOrganization,
  setWorkspaceMode,
} from '../utils/orgRoleHome';
import { buildShopAuthReset, resolveShopEntryRoute } from '../utils/shopAuthNavigation';
import { toCanonicalAppPath } from '../navigation/localizedRoutes';
import { COLORS } from '../constants/colors';
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
  const [driverOrg, setDriverOrg] = useState(null);
  const scrollBottomPadding = useScrollContentBottomPadding(80);
  const fabBottom = useFabBottomOffset(16);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      const loadUser = async () => {
        const last = await AsyncStorage.getItem('@user_email_or_phone');
        if (setUserEmailOrPhone) setUserEmailOrPhone(last || '');
      };

      const resolveDriverOrg = async () => {
        const rows = await readOrganizationMemberships();
        const active = pickActiveOrganization(rows);
        if (!cancelled) {
          setDriverOrg(isDriverMembership(active) ? active : null);
        }
        return active;
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
            const isOrgOnly = !isPartner && (await resolveIsOrgOnlySession());
            if (isPartner) {
              const route = await resolveShopEntryRoute();
              navigation.reset(buildShopAuthReset(route));
              return;
            }
            if (isOrgOnly) {
              const route = await resolveShopEntryRoute();
              // Drivers in personal mode intentionally stay on client Home.
              if (route?.name === 'Home') {
                if (!cancelled) setSessionChecked(true);
                return;
              }
              navigation.reset(buildShopAuthReset(route));
              return;
            }
          }
          if (!isAuthenticated || !authToken) {
            setAuthToken?.(token);
            setIsAuthenticated?.(true);
          }
          if (!cancelled) setSessionChecked(true);
          return;
        }

        if (!hasSession) {
          resetToPublicHome(navigation);
        }
        if (!cancelled) setSessionChecked(true);
      };

      const cachedVehicleRows = getCachedVehicles();
      if (cachedVehicleRows.length > 0) {
        setVehicles(cachedVehicleRows);
      }

      const loadDashboard = async () => {
        if (!hasSession) {
          if (!cancelled) setDashboardLoading(false);
          return;
        }

        // Org-only users normally leave client Home via ensureAuthOrPublicHome.
        // Drivers in personal mode stay — they need personal vehicle/repair data.
        // The previous early return left dashboardLoading stuck true forever.
        const isOrgOnly = await resolveIsOrgOnlySession();
        if (isOrgOnly) {
          const active = await resolveDriverOrg();
          const mode = await getWorkspaceMode();
          const allowPersonalDriver =
            isDriverMembership(active) && mode === WORKSPACE_MODE.PERSONAL;
          if (!allowPersonalDriver) {
            if (!cancelled) setDashboardLoading(false);
            return;
          }
        } else {
          await resolveDriverOrg();
        }

        if (!cancelled) setDashboardLoading(true);
        try {
          const token = await AsyncStorage.getItem('@access_token');
          const [vehicleRows, repairRows, offersRes] = await Promise.all([
            getVehicles().catch(() => null),
            getRepairs(token).catch(() => []),
            fetch(`${API_BASE_URL}/api/offers/`, {
              headers: { Authorization: `Bearer ${token}` },
            }).catch(() => null),
          ]);
          if (cancelled) return;
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
          if (!cancelled) setDashboardLoading(false);
        }
      };

      loadUser();
      ensureAuthOrPublicHome();
      loadDashboard();

      return () => {
        cancelled = true;
      };
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

  const switchToWorking = async () => {
    await setWorkspaceMode(WORKSPACE_MODE.WORKING);
    navigation.reset(
      buildShopAuthReset({
        name: 'OrgHome',
        params:
          driverOrg?.id != null
            ? { organizationId: driverOrg.id, screen: 'OrgOverview' }
            : { screen: 'OrgOverview' },
      }),
    );
  };

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
        {driverOrg ? (
          <DashboardCard style={styles.switcherCard}>
            <Text style={styles.switcherLabel}>{t('org.mode.label', null, 'Mode')}</Text>
            <View style={styles.switcherList}>
              <Pressable
                onPress={switchToWorking}
                style={({ pressed }) => [
                  styles.switcherChip,
                  pressed && styles.switcherChipPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel={t('org.mode.switchToWorking', null, 'Working mode')}
              >
                <Text style={styles.switcherChipText}>
                  {t('org.mode.working', null, 'Working')}
                </Text>
              </Pressable>
              <Pressable
                style={[styles.switcherChip, styles.switcherChipActive]}
                accessibilityRole="button"
                accessibilityState={{ selected: true }}
              >
                <Text style={[styles.switcherChipText, styles.switcherChipTextActive]}>
                  {t('org.mode.personal', null, 'Personal')}
                </Text>
              </Pressable>
            </View>
          </DashboardCard>
        ) : null}

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
        style={[styles.fab, { backgroundColor: theme.colors.primary, bottom: fabBottom }]}
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
  switcherCard: {
    marginBottom: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  switcherLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  switcherList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  switcherChip: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: COLORS.BORDER_SOFT,
    maxWidth: '100%',
  },
  switcherChipActive: {
    backgroundColor: COLORS.PRIMARY_GLASS,
    borderColor: COLORS.ACCENT,
  },
  switcherChipPressed: {
    opacity: 0.88,
  },
  switcherChipText: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 13,
    fontWeight: '600',
  },
  switcherChipTextActive: {
    color: '#fff',
  },
  gridLoader: {
    marginVertical: 24,
  },
  fab: {
    position: 'absolute',
    right: 16,
  },
});
