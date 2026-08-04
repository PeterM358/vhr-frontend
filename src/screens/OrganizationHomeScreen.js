import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AuthContext } from '../context/AuthManager';
import ScreenBackground from '../components/ScreenBackground';
import OrgAppHeader from '../components/org/OrgAppHeader';
import DashboardSummaryRow from '../components/dashboard/DashboardSummaryRow';
import DashboardActionGrid from '../components/dashboard/DashboardActionGrid';
import DashboardCard from '../components/dashboard/DashboardCard';
import { appNavBarTotalHeight } from '../components/common/appNavBarMetrics';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { COLORS } from '../constants/colors';
import { listOrgFleet } from '../api/fleet';
import { ackWorkOrder, listProjects, listWorkOrders, startWorkOrder } from '../api/orgOperations';
import {
  buildOrgNavItems,
  organizationMembershipFor,
  readOrganizationMemberships,
  resolveActiveOrganizationId,
  setCurrentOrganizationId,
} from '../utils/orgWorkspace';
import {
  WORKSPACE_MODE,
  isDriverMembership,
  setWorkspaceMode,
} from '../utils/orgRoleHome';
import { buildShopAuthReset } from '../utils/shopAuthNavigation';
import { useScrollContentBottomPadding } from '../utils/mobileWebInsets';
import { useTranslation } from '../i18n';
import {
  navigateToNotifications,
  navigateToOrgFleet,
  navigateToOrgOperations,
  navigateToOrgProjects,
  navigateToOrgAccounting,
  navigateToOrgFleetPlanning,
  navigateToOrgTasks,
  navigateToOrgWarehouse,
  navigateToOrgWorkforce,
  navigateToPartnerDashboard,
  navigateToOrgCompanyAccount,
  navigateToProfile,
} from '../navigation/webNavigation';

function localTodayIso() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function startOfWeekDate() {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? 6 : day - 1;
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function isOpenTaskStatus(status) {
  const value = String(status || '').toLowerCase();
  return value !== 'done' && value !== 'cancelled';
}

function isFleetIssueStatus(status) {
  return String(status || '').toLowerCase() === 'not_ready';
}

function isDoneThisWeek(row, weekStart) {
  if (String(row?.status || '').toLowerCase() !== 'done') return false;
  const raw = row?.ended_at || row?.completed_at || row?.updated_at;
  if (!raw) return false;
  const ended = new Date(raw);
  if (Number.isNaN(ended.getTime())) return false;
  return ended >= weekStart;
}

function sumExpectedRevenue(projects) {
  let total = 0;
  let found = false;
  (projects || []).forEach((row) => {
    const raw = row?.expected_revenue;
    if (raw == null || raw === '') return;
    const n = Number(raw);
    if (!Number.isFinite(n)) return;
    found = true;
    total += n;
  });
  return found ? total : null;
}

function formatMoneySignal(value) {
  if (value == null) return '—';
  try {
    return new Intl.NumberFormat(undefined, {
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return String(Math.round(value));
  }
}

/** Same person-name heuristic as client Home ("Hi, Mihailov"). Empty → ''. */
function toDisplayName(rawValue) {
  const raw = String(rawValue || '').trim();
  if (!raw) return '';
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

function normalizeOrgRoute(route) {
  if (route === 'OrgWorkOrders') return 'OrgTasks';
  return route;
}

export default function OrganizationHomeScreen() {
  const navigation = useNavigation();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { authToken, userEmailOrPhone } = useContext(AuthContext);
  const [org, setOrg] = useState(null);
  const [memberships, setMemberships] = useState([]);
  const [fleetCount, setFleetCount] = useState(null);
  const [notReadyCount, setNotReadyCount] = useState(null);
  const [jobsDoneWeek, setJobsDoneWeek] = useState(null);
  const [expectedValueSum, setExpectedValueSum] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [tasksExpanded, setTasksExpanded] = useState(false);
  const [busyStart, setBusyStart] = useState(false);
  const [loading, setLoading] = useState(true);
  const [greetingToast, setGreetingToast] = useState('');
  const toastTimerRef = useRef(null);
  const scrollBottomPadding = useScrollContentBottomPadding(40);
  const toastTop = appNavBarTotalHeight(insets) + 8;
  const isDriver = isDriverMembership(org);
  const [listingCtaDismissed, setListingCtaDismissed] = useState(false);
  const needsServiceListing = useMemo(() => {
    if (isDriver || !org || listingCtaDismissed) return false;
    const activities = Array.isArray(org.activities) ? org.activities : [];
    // Soft, non-blocking tip — only when service_center is selected and no shop location yet.
    return activities.includes('service_center') && !org.has_shop_locations;
  }, [isDriver, listingCtaDismissed, org]);

  const showGreetingToast = useCallback((name, company) => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }
    const person = name || t('common.user');
    const orgLabel = company || t('org.home.title');
    setGreetingToast(
      t(
        'org.home.greetingToast',
        { name: person, org: orgLabel },
        `Hi, ${person} — ${orgLabel} dashboard`,
      ),
    );
    toastTimerRef.current = setTimeout(() => {
      setGreetingToast('');
      toastTimerRef.current = null;
    }, 3400);
  }, [t]);

  useEffect(
    () => () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    },
    [],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await readOrganizationMemberships();
      setMemberships(rows);
      const orgId = await AsyncStorage.getItem(STORAGE_KEYS.CURRENT_ORGANIZATION_ID);
      const active = organizationMembershipFor(rows, orgId) || rows[0] || null;
      setOrg(active);
      if (active?.id) {
        const dismissed = await AsyncStorage.getItem(
          STORAGE_KEYS.orgListingCtaDismissedKey(active.id),
        );
        setListingCtaDismissed(dismissed === '1');
      } else {
        setListingCtaDismissed(false);
      }
      if (!active?.id) {
        setFleetCount(0);
        setNotReadyCount(0);
        setJobsDoneWeek(null);
        setExpectedValueSum(null);
        setTasks([]);
        return;
      }
      const token = authToken || (await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN));
      const resolved = await resolveActiveOrganizationId(active.id);
      const driverLike = isDriverMembership(active);
      const displayOrg = active.display_name || t('org.home.title');
      const person =
        extractFirstName(userEmailOrPhone) ||
        toDisplayName(userEmailOrPhone) ||
        t('common.user');
      showGreetingToast(person, displayOrg);
      try {
        if (driverLike) {
          const data = await listWorkOrders(token, resolved, { mine: 1 });
          setTasks(Array.isArray(data?.results) ? data.results : []);
          setFleetCount(null);
          setNotReadyCount(null);
          setJobsDoneWeek(null);
          setExpectedValueSum(null);
        } else {
          const weekStart = startOfWeekDate();
          const [fleetData, workOrdersData, projectsData] = await Promise.all([
            listOrgFleet(token, resolved, {}),
            listWorkOrders(token, resolved, {}).catch(() => ({ results: [] })),
            listProjects(token, resolved, { active: 1 }).catch(() => ({ results: [] })),
          ]);
          const list = Array.isArray(fleetData?.results)
            ? fleetData.results
            : Array.isArray(fleetData)
              ? fleetData
              : [];
          setFleetCount(list.length);
          setNotReadyCount(
            list.filter((row) => isFleetIssueStatus(row?.readiness?.status)).length,
          );
          const orders = Array.isArray(workOrdersData?.results)
            ? workOrdersData.results
            : Array.isArray(workOrdersData)
              ? workOrdersData
              : [];
          setJobsDoneWeek(orders.filter((row) => isDoneThisWeek(row, weekStart)).length);
          const projects = Array.isArray(projectsData?.results)
            ? projectsData.results
            : Array.isArray(projectsData)
              ? projectsData
              : [];
          setExpectedValueSum(sumExpectedRevenue(projects));
          setTasks([]);
        }
      } catch {
        if (driverLike) setTasks([]);
        else {
          setFleetCount(null);
          setNotReadyCount(null);
          setJobsDoneWeek(null);
          setExpectedValueSum(null);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [authToken, showGreetingToast, t, userEmailOrPhone]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const navItems = buildOrgNavItems(org, t);
  const navRoutes = useMemo(
    () => new Set(navItems.map((item) => normalizeOrgRoute(item.route))),
    [navItems],
  );
  const orgName = org?.display_name || t('org.home.title');
  const today = localTodayIso();
  const canManageOps = Boolean(org?.manage_org_operations || org?.manage_fleet);
  const canPlanFleet = Boolean(org?.can_plan_fleet || canManageOps);
  const canViewAccounting = Boolean(org?.view_org_accounting);

  const { todayTasks, upcomingTasks } = useMemo(() => {
    const open = tasks.filter((row) => isOpenTaskStatus(row.status));
    const todayRows = open.filter((row) => row.scheduled_date === today);
    const upcoming = open
      .filter((row) => row.scheduled_date && row.scheduled_date > today)
      .sort((a, b) => String(a.scheduled_date || '').localeCompare(String(b.scheduled_date || '')));
    // Include undated / past open tasks in today's board so drivers still see them.
    const undatedOrPast = open.filter(
      (row) => !row.scheduled_date || row.scheduled_date < today,
    );
    const mergedToday = [...todayRows];
    undatedOrPast.forEach((row) => {
      if (!mergedToday.some((item) => item.id === row.id)) mergedToday.push(row);
    });
    return { todayTasks: mergedToday, upcomingTasks: upcoming };
  }, [tasks, today]);

  const currentTask = todayTasks[0] || null;
  const futureTasks = useMemo(() => {
    const restToday = todayTasks.slice(1);
    return [...restToday, ...upcomingTasks.filter((row) => row.id !== currentTask?.id)];
  }, [todayTasks, upcomingTasks, currentTask]);

  const switchOrganization = async (nextOrg) => {
    await setCurrentOrganizationId(nextOrg.id);
    setOrg(nextOrg);
    load();
  };

  const switchToPersonal = async () => {
    await setWorkspaceMode(WORKSPACE_MODE.PERSONAL);
    navigation.reset(buildShopAuthReset({ name: 'Home' }));
  };

  const acknowledgeStart = async (task) => {
    if (!org?.id || !task?.id) return;
    setBusyStart(true);
    try {
      const token = authToken || (await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN));
      const updated = await startWorkOrder(token, org.id, task.id);
      setTasks((prev) => prev.map((row) => (row.id === updated.id ? updated : row)));
    } catch (e) {
      Alert.alert(
        t('org.tasks.startTitle', null, 'Start task'),
        e.message || t('org.tasks.startError', null, 'Could not start the task.'),
      );
    } finally {
      setBusyStart(false);
    }
  };

  const statusLabel = useCallback(
    (status) => t(`org.home.tasks.status.${status}`, null, status),
    [t],
  );

  const summaryItems = useMemo(() => {
    if (isDriver) {
      return [
        {
          key: 'today',
          value: todayTasks.length,
          label: t('org.home.summary.todayTasks', null, 'Today'),
        },
        {
          key: 'upcoming',
          value: futureTasks.length,
          label: t('org.home.summary.upcomingTasks', null, 'Upcoming'),
        },
      ];
    }
    return [
      {
        key: 'fleet',
        value: fleetCount == null ? '—' : fleetCount,
        label: t('org.home.summary.fleetTotal', null, 'Fleet total'),
        onPress: () => navigateToOrgFleet(navigation, { orgId: org?.id }),
      },
      {
        key: 'notReady',
        value: notReadyCount == null ? '—' : notReadyCount,
        label: t('org.home.summary.needAttention', null, 'Need attention'),
        onPress: () =>
          navigateToOrgFleet(navigation, { orgId: org?.id, tab: 'issues' }),
      },
    ];
  }, [
    fleetCount,
    futureTasks.length,
    isDriver,
    navigation,
    notReadyCount,
    org?.id,
    t,
    todayTasks.length,
  ]);

  const actionTiles = useMemo(() => {
    if (isDriver) {
      return [
        {
          key: 'notifications',
          icon: 'bell-outline',
          title: t('org.home.actions.notifications', null, 'Notifications'),
          subtitle: t(
            'org.home.actions.notificationsSubtitle',
            null,
            'Open your notification inbox.',
          ),
          onPress: () =>
            navigateToNotifications(navigation, {
              returnTo: 'OrgHome',
              backLabelKey: 'org.home.title',
            }),
        },
        {
          key: 'profile',
          icon: 'account-circle-outline',
          title: t('org.home.actions.profile', null, 'Profile'),
          subtitle: t(
            'org.home.actions.profileSubtitle',
            null,
            'Open your account profile.',
          ),
          onPress: () => navigateToProfile(navigation),
        },
        {
          key: 'fleet',
          icon: 'truck',
          title: t('org.home.actions.fleetSecondary', null, 'Fleet (optional)'),
          subtitle: t(
            'org.home.actions.fleetSecondarySubtitle',
            null,
            'Vehicles usually come with your tasks — open fleet only if you need it.',
          ),
          onPress: () => navigateToOrgFleet(navigation, { orgId: org?.id }),
        },
      ];
    }

    const tiles = [];

    if (canManageOps || navRoutes.has('OrgTasks')) {
      tiles.push({
        key: 'tasks',
        icon: 'clipboard-check-outline',
        title: t('org.nav.tasks', null, 'Tasks'),
        subtitle: t(
          'org.home.actions.tasksSubtitle',
          null,
          'Open, all, and add work cards.',
        ),
        onPress: () => navigateToOrgTasks(navigation, { orgId: org?.id }),
      });
    }

    if (canPlanFleet || navRoutes.has('OrgFleetPlanning')) {
      tiles.push({
        key: 'fleet-planning',
        icon: 'table-clock',
        title: t('org.nav.fleetPlanning', null, 'Fleet planning'),
        subtitle: t(
          'org.home.actions.fleetPlanningSubtitle',
          null,
          'Month board: see truck occupancy and create tasks from the grid.',
        ),
        onPress: () => navigateToOrgFleetPlanning(navigation, { orgId: org?.id }),
      });
    }

    // Fleet lives on the summary strip — avoid duplicating the department tile.

    if (canManageOps) {
      tiles.push({
        key: 'projects',
        icon: 'briefcase-outline',
        title: t('org.nav.projects', null, 'Projects'),
        subtitle: t(
          'org.home.actions.projectsSubtitle',
          null,
          'Volume, value, contacts, and counterparties.',
        ),
        onPress: () => navigateToOrgProjects(navigation, { orgId: org?.id }),
      });
      tiles.push({
        key: 'operations',
        icon: 'clipboard-list-outline',
        title: t('org.nav.operations', null, 'Operations'),
        subtitle: t(
          'org.home.actions.operationsSubtitle',
          null,
          'Define company operations used on work cards.',
        ),
        onPress: () => navigateToOrgOperations(navigation, { orgId: org?.id }),
      });
    }

    if (navRoutes.has('OrgWorkforce')) {
      tiles.push({
        key: 'workforce',
        icon: 'account-hard-hat',
        title: t('org.nav.workforce', null, 'Workforce'),
        subtitle: t('org.home.actions.openSection', null, 'Open this workspace section.'),
        onPress: () => navigateToOrgWorkforce(navigation, { orgId: org?.id }),
      });
    }

    if (
      canManageOps
      || org?.manage_org_warehouse
      || org?.can_post_materials_intake
      || navRoutes.has('OrgWarehouse')
    ) {
      tiles.push({
        key: 'warehouse',
        icon: 'warehouse',
        title: t('org.nav.warehouse', null, 'Warehouse'),
        subtitle: t(
          'org.home.actions.warehouseSubtitle',
          null,
          'Import supplier invoices and stock materials for operations.',
        ),
        onPress: () => navigateToOrgWarehouse(navigation, { orgId: org?.id }),
      });
    }

    if (canViewAccounting || navRoutes.has('OrgAccounting') || navRoutes.has('OrgLedger')) {
      tiles.push({
        key: 'accounting',
        icon: 'book-open-outline',
        title: t('org.nav.accounting', null, 'Accounting'),
        subtitle: t(
          'org.home.actions.accountingSubtitle',
          null,
          'Month pulse, workforce cost, and budget share pie.',
        ),
        onPress: () => navigateToOrgAccounting(navigation, { orgId: org?.id }),
      });
    }

    if (org?.has_shop_locations) {
      tiles.push({
        key: 'shop',
        icon: 'storefront-outline',
        title: t('org.home.openServiceCenter', null, 'Open service center workspace'),
        subtitle: t(
          'org.home.actions.shopSubtitle',
          null,
          'Switch to bay operations, offers, and shop tools.',
        ),
        onPress: () => navigateToPartnerDashboard(navigation),
      });
    }

    return tiles;
  }, [
    canManageOps,
    canPlanFleet,
    canViewAccounting,
    isDriver,
    navRoutes,
    navigation,
    org?.has_shop_locations,
    org?.id,
    org?.manage_org_warehouse,
    org?.can_post_materials_intake,
    t,
  ]);

  return (
    <ScreenBackground safeArea={false}>
      <OrgAppHeader
        mode="dashboard"
        title={orgName}
        onTitlePress={
          isDriver
            ? undefined
            : () => navigateToOrgCompanyAccount(navigation, { orgId: org?.id })
        }
      />
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: scrollBottomPadding }]}
        keyboardShouldPersistTaps="handled"
      >
        {isDriver ? (
          <DashboardCard style={styles.switcherCard}>
            <Text style={styles.switcherLabel}>{t('org.mode.label', null, 'Mode')}</Text>
            <View style={styles.switcherList}>
              <Pressable
                style={[styles.switcherChip, styles.switcherChipActive]}
                accessibilityRole="button"
              >
                <Text style={[styles.switcherChipText, styles.switcherChipTextActive]}>
                  {t('org.mode.working', null, 'Working')}
                </Text>
              </Pressable>
              <Pressable
                onPress={switchToPersonal}
                style={({ pressed }) => [
                  styles.switcherChip,
                  pressed && styles.switcherChipPressed,
                ]}
                accessibilityRole="button"
              >
                <Text style={styles.switcherChipText}>
                  {t('org.mode.personal', null, 'Personal')}
                </Text>
              </Pressable>
            </View>
          </DashboardCard>
        ) : null}

        {memberships.length > 1 ? (
          <DashboardCard style={styles.switcherCard}>
            <Text style={styles.switcherLabel}>{t('org.switcher.label', null, 'Organization')}</Text>
            <View style={styles.switcherList}>
              {memberships.map((row) => {
                const active = row.id === org?.id;
                return (
                  <Pressable
                    key={row.id}
                    onPress={() => switchOrganization(row)}
                    style={({ pressed }) => [
                      styles.switcherChip,
                      active && styles.switcherChipActive,
                      pressed && styles.switcherChipPressed,
                    ]}
                    accessibilityRole="button"
                  >
                    <Text style={[styles.switcherChipText, active && styles.switcherChipTextActive]} numberOfLines={1}>
                      {row.display_name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </DashboardCard>
        ) : null}

        {loading ? (
          <ActivityIndicator color="#fff" style={styles.loader} />
        ) : (
          <>
            <DashboardSummaryRow items={summaryItems} compact={!isDriver} />

            {isDriver ? (
              <DashboardCard style={styles.tasksCard}>
                <Text style={styles.tasksHeading}>
                  {t('org.home.tasks.title', null, 'Tasks')}
                </Text>
                {!currentTask && futureTasks.length === 0 ? (
                  <Text style={styles.tasksEmpty}>
                    {t(
                      'org.home.tasks.empty',
                      null,
                      'No tasks yet — your manager will assign work cards.',
                    )}
                  </Text>
                ) : (
                  <>
                    {currentTask ? (
                      <Pressable
                        style={styles.currentTask}
                        onPress={() =>
                          navigateToOrgTasks(navigation, {
                            orgId: org?.id,
                            taskId: currentTask.id,
                          })
                        }
                        accessibilityRole="button"
                      >
                        <Text style={styles.currentTaskEyebrow}>
                          {t('org.home.tasks.current', null, 'Current task')}
                        </Text>
                        <Text style={styles.currentTaskTitle}>{currentTask.title}</Text>
                        <Text style={styles.currentTaskMeta}>
                          {[
                            statusLabel(currentTask.status),
                            Array.isArray(currentTask.operations) && currentTask.operations.length > 1
                              ? t(
                                  'org.home.tasks.operationCount',
                                  { count: currentTask.operations.length },
                                  `${currentTask.operations.length} operations`,
                                )
                              : currentTask.activity?.name || currentTask.operations?.[0]?.activity?.name,
                            Array.isArray(currentTask.vehicles) && currentTask.vehicles.length
                              ? currentTask.vehicles
                                  .map((v) => v?.license_plate || v?.fleet_id || v?.display_name)
                                  .filter(Boolean)
                                  .join(', ')
                              : currentTask.vehicle?.license_plate || currentTask.vehicle?.display_name,
                            currentTask.scheduled_date,
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </Text>
                        {Array.isArray(currentTask.operations) && currentTask.operations.length > 0 ? (
                          <View style={styles.opList}>
                            {currentTask.operations.map((op, idx) => (
                              <Text key={op.id || idx} style={styles.opLine} numberOfLines={2}>
                                {`${idx + 1}. ${op.activity?.name || '—'}${
                                  op.assignees?.length
                                    ? ` · ${op.assignees.map((a) => a.display_name).filter(Boolean).join(', ')}`
                                    : ''
                                }`}
                              </Text>
                            ))}
                          </View>
                        ) : null}
                        {currentTask.instructions ? (
                          <Text style={styles.currentTaskInstructions} numberOfLines={4}>
                            {currentTask.instructions}
                          </Text>
                        ) : null}
                        <Text style={styles.openTaskHint}>
                          {t('org.home.tasks.tapToOpen', null, 'Tap to open task')}
                        </Text>
                        {currentTask.start_acknowledged_at || currentTask.started_at ? (
                          <Text style={styles.startedBadge}>
                            {t('org.tasks.startedDone', null, 'You started this task')}
                          </Text>
                        ) : currentTask.viewer_needs_ack ||
                          (currentTask.needs_ack &&
                            (currentTask.status === 'assigned' || currentTask.status === 'draft')) ? (
                          <Pressable
                            onPress={async (e) => {
                              e?.stopPropagation?.();
                              if (!org?.id || !currentTask?.id) return;
                              setBusyStart(true);
                              try {
                                const token =
                                  authToken ||
                                  (await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN));
                                const updated = await ackWorkOrder(token, org.id, currentTask.id);
                                setTasks((prev) =>
                                  prev.map((row) => (row.id === updated.id ? updated : row)),
                                );
                              } catch (err) {
                                Alert.alert(
                                  t(
                                    'org.tasks.confirmSeenCta',
                                    null,
                                    "Confirm I've seen this task",
                                  ),
                                  err.message ||
                                    t(
                                      'org.tasks.confirmSeenError',
                                      null,
                                      'Could not confirm this task.',
                                    ),
                                );
                              } finally {
                                setBusyStart(false);
                              }
                            }}
                            disabled={busyStart}
                            style={[styles.startBtn, busyStart && styles.startBtnDisabled]}
                            accessibilityRole="button"
                          >
                            <Text style={styles.startBtnText}>
                              {t(
                                'org.tasks.confirmSeenCta',
                                null,
                                "Confirm I've seen this task",
                              )}
                            </Text>
                          </Pressable>
                        ) : currentTask.status === 'assigned' || currentTask.status === 'draft' ? (
                          <Pressable
                            onPress={(e) => {
                              e?.stopPropagation?.();
                              navigateToOrgTasks(navigation, {
                                orgId: org?.id,
                                taskId: currentTask.id,
                              });
                            }}
                            disabled={busyStart}
                            style={[styles.startBtn, busyStart && styles.startBtnDisabled]}
                            accessibilityRole="button"
                          >
                            <Text style={styles.startBtnText}>
                              {t('org.tasks.startOpenWizard', null, 'Start (enter km / L)')}
                            </Text>
                          </Pressable>
                        ) : null}
                      </Pressable>
                    ) : (
                      <Text style={styles.tasksEmpty}>
                        {t('org.home.tasks.noneToday', null, 'No task scheduled for today.')}
                      </Text>
                    )}

                    {futureTasks.length > 0 ? (
                      <View style={styles.upcomingBlock}>
                        <Pressable
                          onPress={() => setTasksExpanded((value) => !value)}
                          style={styles.upcomingToggle}
                          accessibilityRole="button"
                        >
                          <Text style={styles.upcomingToggleText}>
                            {tasksExpanded
                              ? t('org.home.tasks.hideUpcoming', null, 'Hide upcoming')
                              : t(
                                  'org.home.tasks.showUpcoming',
                                  { count: futureTasks.length },
                                  `Upcoming (${futureTasks.length})`,
                                )}
                          </Text>
                        </Pressable>
                        {tasksExpanded
                          ? futureTasks.map((row) => (
                              <Pressable
                                key={row.id}
                                style={styles.upcomingRow}
                                onPress={() =>
                                  navigateToOrgTasks(navigation, {
                                    orgId: org?.id,
                                    taskId: row.id,
                                  })
                                }
                                accessibilityRole="button"
                              >
                                <Text style={styles.upcomingTitle} numberOfLines={1}>
                                  {row.title}
                                </Text>
                                <Text style={styles.upcomingMeta} numberOfLines={1}>
                                  {[
                                    row.scheduled_date || t('org.home.tasks.unscheduled', null, 'No date'),
                                    statusLabel(row.status),
                                    row.activity?.name,
                                  ]
                                    .filter(Boolean)
                                    .join(' · ')}
                                </Text>
                              </Pressable>
                            ))
                          : null}
                      </View>
                    ) : null}
                  </>
                )}
              </DashboardCard>
            ) : null}

            {needsServiceListing ? (
              <DashboardCard style={styles.listingCard}>
                <Text style={styles.listingTitle}>
                  {t('org.home.serviceListingTitle', null, 'Company setup')}
                </Text>
                <Text style={styles.listingBody}>
                  {t(
                    'org.home.serviceListingBody',
                    null,
                    'Finish company setup (legal details, public URL) so customers can find your service center.',
                  )}
                </Text>
                <View style={styles.listingActions}>
                  <Button
                    mode="text"
                    onPress={() => navigateToOrgCompanyAccount(navigation, { orgId: org?.id })}
                    textColor={COLORS.PRIMARY}
                  >
                    {t('org.home.serviceListingButton', null, 'Open setup')}
                  </Button>
                  <Button
                    mode="text"
                    onPress={async () => {
                      setListingCtaDismissed(true);
                      if (org?.id) {
                        await AsyncStorage.setItem(
                          STORAGE_KEYS.orgListingCtaDismissedKey(org.id),
                          '1',
                        );
                      }
                    }}
                    textColor="rgba(255,255,255,0.72)"
                  >
                    {t('org.home.serviceListingDismiss', null, 'Dismiss')}
                  </Button>
                </View>
              </DashboardCard>
            ) : null}

            <DashboardActionGrid tiles={actionTiles} />

            {!isDriver ? (
              <DashboardCard style={styles.statsCard}>
                <Text style={styles.statsHeading}>
                  {t('org.home.stats.title', null, 'This week')}
                </Text>
                <Text style={styles.statsHint}>
                  {t(
                    'org.home.stats.hint',
                    null,
                    'Simple pulse — are we finishing work day by day.',
                  )}
                </Text>
                <View style={styles.statsRow}>
                  <View style={styles.statsCell}>
                    <Text style={styles.statsValue}>
                      {jobsDoneWeek == null ? '—' : jobsDoneWeek}
                    </Text>
                    <Text style={styles.statsLabel}>
                      {t('org.home.stats.jobsDone', null, 'Jobs done')}
                    </Text>
                  </View>
                  <View style={styles.statsDivider} />
                  <View style={styles.statsCell}>
                    <Text style={styles.statsValue}>
                      {formatMoneySignal(expectedValueSum)}
                    </Text>
                    <Text style={styles.statsLabel}>
                      {t(
                        'org.home.stats.expectedValue',
                        null,
                        'Project expected value',
                      )}
                    </Text>
                  </View>
                </View>
                {canViewAccounting ? (
                  <>
                    <Text style={styles.statsFootnote}>
                      {t(
                        'org.home.stats.moneyFootnote',
                        null,
                        'Open Accounting for m² / km / hours, salaries, and budget pie.',
                      )}
                    </Text>
                    <Button
                      mode="text"
                      compact
                      onPress={() => navigateToOrgAccounting(navigation, { orgId: org?.id })}
                    >
                      {t('org.home.stats.openAccounting', null, 'Open accounting')}
                    </Button>
                  </>
                ) : null}
              </DashboardCard>
            ) : null}
          </>
        )}
      </ScrollView>

      {greetingToast ? (
        <View style={[styles.toastWrap, { top: toastTop }]} pointerEvents="none">
          <Text style={styles.toastText}>{greetingToast}</Text>
        </View>
      ) : null}
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: 14,
    paddingTop: 12,
  },
  loader: {
    marginVertical: 24,
  },
  toastWrap: {
    position: 'absolute',
    left: 16,
    right: 16,
    backgroundColor: 'rgba(15,23,42,0.94)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    // Above OrgAppHeader / AppNavigationBar (zIndex 50); keep fully visible.
    zIndex: 10000,
    elevation: 24,
  },
  toastText: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '600',
  },
  switcherCard: {
    marginBottom: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  listingCard: {
    marginBottom: 12,
    paddingVertical: 16,
    paddingHorizontal: 14,
  },
  listingTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  listingBody: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  listingActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 4,
  },
  listingBtn: {
    alignSelf: 'flex-start',
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
  tasksCard: {
    marginBottom: 12,
    paddingVertical: 16,
    paddingHorizontal: 14,
  },
  tasksHeading: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 12,
  },
  tasksEmpty: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 15,
    lineHeight: 22,
  },
  currentTask: {
    marginBottom: 8,
  },
  opList: {
    marginTop: 8,
    gap: 4,
  },
  opLine: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 13,
    lineHeight: 18,
  },
  currentTaskEyebrow: {
    color: COLORS.ACCENT,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 6,
  },
  currentTaskTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 28,
    marginBottom: 8,
  },
  currentTaskMeta: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    marginBottom: 8,
  },
  currentTaskInstructions: {
    color: 'rgba(255,255,255,0.86)',
    fontSize: 14,
    lineHeight: 20,
  },
  openTaskHint: {
    color: COLORS.ACCENT,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 10,
  },
  startBtn: {
    marginTop: 14,
    borderRadius: 14,
    backgroundColor: '#fff',
    paddingVertical: 14,
    alignItems: 'center',
  },
  startBtnDisabled: {
    opacity: 0.6,
  },
  startBtnText: {
    color: COLORS.TEXT_DARK,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  startedBadge: {
    marginTop: 12,
    color: '#86EFAC',
    fontSize: 14,
    fontWeight: '700',
  },
  upcomingBlock: {
    marginTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.14)',
    paddingTop: 10,
  },
  upcomingToggle: {
    paddingVertical: 4,
    marginBottom: 4,
  },
  upcomingToggleText: {
    color: COLORS.ACCENT,
    fontSize: 13,
    fontWeight: '700',
  },
  upcomingRow: {
    paddingVertical: 8,
  },
  upcomingTitle: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 14,
    fontWeight: '600',
  },
  upcomingMeta: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    marginTop: 2,
  },
  statsCard: {
    marginTop: 4,
    marginBottom: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  statsHeading: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 4,
  },
  statsHint: {
    color: 'rgba(255,255,255,0.62)',
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  statsCell: {
    flex: 1,
    alignItems: 'flex-start',
  },
  statsDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.16)',
    marginHorizontal: 12,
  },
  statsValue: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 4,
  },
  statsLabel: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 12,
    fontWeight: '600',
  },
  statsFootnote: {
    marginTop: 10,
    color: 'rgba(255,255,255,0.48)',
    fontSize: 11,
  },
});
