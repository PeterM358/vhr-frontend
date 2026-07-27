import React, { useCallback, useContext, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { FAB, Text, useTheme } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useNavigation } from '@react-navigation/native';

import { AuthContext } from '../context/AuthManager';
import ScreenBackground from '../components/ScreenBackground';
import OrgAppHeader from '../components/org/OrgAppHeader';
import DashboardHeroCard from '../components/dashboard/DashboardHeroCard';
import DashboardSummaryRow from '../components/dashboard/DashboardSummaryRow';
import DashboardActionGrid from '../components/dashboard/DashboardActionGrid';
import DashboardCard from '../components/dashboard/DashboardCard';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { COLORS } from '../constants/colors';
import { listOrgFleet } from '../api/fleet';
import { listWorkOrders, startWorkOrder } from '../api/orgOperations';
import {
  buildOrgNavItems,
  isFleetFocusedOrg,
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
  navigateToOrgCalendar,
  navigateToOrgFleet,
  navigateToOrgNetwork,
  navigateToOrgCreateTask,
  navigateToOrgOperations,
  navigateToOrgProjects,
  navigateToOrgTasks,
  navigateToOrgWorkforce,
  navigateToPartnerDashboard,
  navigateToProfile,
} from '../navigation/webNavigation';

const PRIMARY_HOME_ROUTES = new Set(['OrgOverview', 'OrgFleet', 'OrgOperations', 'OrgTasks']);

function localTodayIso() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function isOpenTaskStatus(status) {
  const value = String(status || '').toLowerCase();
  return value !== 'done' && value !== 'cancelled';
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

export default function OrganizationHomeScreen() {
  const navigation = useNavigation();
  const theme = useTheme();
  const { t } = useTranslation();
  const { authToken, userEmailOrPhone } = useContext(AuthContext);
  const [org, setOrg] = useState(null);
  const [memberships, setMemberships] = useState([]);
  const [fleetCount, setFleetCount] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [tasksExpanded, setTasksExpanded] = useState(false);
  const [busyStart, setBusyStart] = useState(false);
  const [loading, setLoading] = useState(true);
  const scrollBottomPadding = useScrollContentBottomPadding(80);
  const isDriver = isDriverMembership(org);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await readOrganizationMemberships();
      setMemberships(rows);
      const orgId = await AsyncStorage.getItem(STORAGE_KEYS.CURRENT_ORGANIZATION_ID);
      const active = organizationMembershipFor(rows, orgId) || rows[0] || null;
      setOrg(active);
      if (!active?.id) {
        setFleetCount(0);
        setTasks([]);
        return;
      }
      const token = authToken || (await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN));
      const resolved = await resolveActiveOrganizationId(active.id);
      const driverLike = isDriverMembership(active);
      try {
        if (driverLike) {
          const data = await listWorkOrders(token, resolved, { mine: 1 });
          setTasks(Array.isArray(data?.results) ? data.results : []);
          setFleetCount(null);
        } else {
          const data = await listOrgFleet(token, resolved, {});
          const list = Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [];
          setFleetCount(list.length);
          setTasks([]);
        }
      } catch {
        if (driverLike) setTasks([]);
        else setFleetCount(null);
      }
    } finally {
      setLoading(false);
    }
  }, [authToken]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const fleetFocused = isFleetFocusedOrg(org);
  const navItems = buildOrgNavItems(org, t);
  const hasFleet = fleetCount == null ? true : fleetCount > 0;
  const orgName = org?.display_name || t('org.home.title');
  const workerName =
    extractFirstName(userEmailOrPhone) ||
    toDisplayName(userEmailOrPhone) ||
    t('common.user');
  const today = localTodayIso();

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

  const openSection = (route) => {
    if (route === 'OrgFleet') {
      navigateToOrgFleet(navigation, { orgId: org?.id });
      return;
    }
    if (route === 'OrgNetwork') {
      navigateToOrgNetwork(navigation, { orgId: org?.id });
      return;
    }
    if (route === 'OrgWorkforce') {
      navigateToOrgWorkforce(navigation, { orgId: org?.id });
      return;
    }
    if (route === 'OrgOperations') {
      navigateToOrgOperations(navigation, { orgId: org?.id });
      return;
    }
    if (route === 'OrgTasks' || route === 'OrgWorkOrders') {
      navigateToOrgTasks(navigation, { orgId: org?.id });
      return;
    }
    if (route === 'OrgProjects') {
      navigateToOrgProjects(navigation, { orgId: org?.id });
      return;
    }
    if (route === 'OrgOverview') {
      return;
    }
    navigation.navigate(route, { organizationId: org?.id });
  };

  const switchOrganization = async (nextOrg) => {
    await setCurrentOrganizationId(nextOrg.id);
    setOrg(nextOrg);
    load();
  };

  const goImportFleet = () => {
    navigation.navigate('FleetRegisterImport', { organizationId: org?.id });
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

  const goRequestRepair = () => {
    if (!hasFleet && !isDriver) {
      Alert.alert(
        t('org.home.needVehicleTitle', null, 'Add vehicles first'),
        t(
          'org.home.needVehicleBody',
          null,
          'Import your fleet register (or add vehicles), then request a repair the same way customers do.',
        ),
        [
          { text: t('common.cancel', null, 'Cancel'), style: 'cancel' },
          ...(org?.manage_fleet
            ? [{ text: t('fleetImport.openAction', null, 'Import fleet'), onPress: goImportFleet }]
            : []),
          {
            text: t('fleet.openFleet', null, 'View fleet'),
            onPress: () => navigateToOrgFleet(navigation, { orgId: org?.id }),
          },
        ],
      );
      return;
    }
    if (isDriver) {
      Alert.alert(
        t('org.home.tasks.repairLaterTitle', null, 'Repair from a task'),
        t(
          'org.home.tasks.repairLaterBody',
          null,
          'Vehicles travel with your work cards. When a task includes a vehicle, you can request repair from there.',
        ),
      );
      return;
    }
    navigation.navigate('CreateRepair', {
      mode: 'request',
      organizationId: org?.id,
      returnTo: 'OrgHome',
      origin: 'OrgHome',
    });
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
        label: t('org.home.summary.fleet', null, 'Fleet'),
        onPress: () => navigateToOrgFleet(navigation, { orgId: org?.id }),
      },
      {
        key: 'repair',
        value: hasFleet
          ? t('org.home.summary.ready', null, 'Ready')
          : t('org.home.summary.needVehicles', null, 'Add cars'),
        label: t('org.home.summary.repair', null, 'Repair'),
        onPress: goRequestRepair,
      },
    ];
  }, [
    fleetCount,
    futureTasks.length,
    hasFleet,
    isDriver,
    navigation,
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

    const tiles = [
      {
        key: 'fleet',
        icon: 'truck',
        title: t('fleet.openFleet', null, 'View fleet'),
        subtitle: t(
          'org.home.actions.fleetSubtitle',
          null,
          'Browse company vehicles, readiness, and details.',
        ),
        onPress: () => navigateToOrgFleet(navigation, { orgId: org?.id }),
        count: typeof fleetCount === 'number' ? fleetCount : undefined,
      },
      {
        key: 'calendar',
        icon: 'calendar-month-outline',
        title: t('org.home.actions.calendar', null, 'Calendar'),
        subtitle: t(
          'org.home.actions.calendarSubtitle',
          null,
          'Fleet readiness deadlines and reminders.',
        ),
        onPress: () => navigateToOrgCalendar(navigation, { orgId: org?.id }),
      },
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
    ];

    if (org?.manage_fleet) {
      tiles.push({
        key: 'import',
        icon: 'file-upload-outline',
        title: t('fleetImport.openAction', null, 'Import fleet'),
        subtitle: t(
          'org.home.actions.importSubtitle',
          null,
          'Upload your register spreadsheet to add vehicles.',
        ),
        onPress: goImportFleet,
      });
    }

    if (org?.manage_fleet || org?.can_view_fleet || fleetFocused) {
      tiles.push({
        key: 'repair',
        icon: 'wrench',
        title: t('org.home.requestRepair', null, 'Request repair'),
        subtitle: hasFleet
          ? t(
              'org.home.actions.repairSubtitle',
              null,
              'Request service for a fleet vehicle like a customer.',
            )
          : t(
              'org.home.needVehicleHint',
              null,
              'Request repair needs at least one fleet vehicle — import your register first.',
            ),
        onPress: goRequestRepair,
      });
    }

    navItems
      .filter((item) => item.route && !PRIMARY_HOME_ROUTES.has(item.route))
      .forEach((item) => {
        const iconByRoute = {
          OrgWorkforce: 'account-hard-hat',
          OrgWarehouse: 'warehouse',
          OrgDocuments: 'file-document-outline',
          OrgConstruction: 'hard-hat',
          OrgTransport: 'bus',
          OrgWorkOrders: 'clipboard-list-outline',
          OrgNetwork: 'transit-connection-variant',
          OrgInvoicing: 'receipt',
          OrgLedger: 'book-open-outline',
          OrgLocations: 'map-marker-radius',
          OrgPublicProfile: 'earth',
        };
        tiles.push({
          key: item.key || item.route,
          icon: iconByRoute[item.route] || 'view-grid-outline',
          title: item.label,
          subtitle: t('org.home.actions.openSection', null, 'Open this workspace section.'),
          onPress: () => openSection(item.route),
        });
      });

    if (org?.manage_org_operations || org?.manage_fleet) {
      tiles.unshift({
        key: 'create-task',
        icon: 'clipboard-plus-outline',
        title: t('org.tasks.createTitle', null, 'Create task'),
        subtitle: t(
          'org.home.actions.createTaskSubtitle',
          null,
          'Assign multiple operations and people on one work card.',
        ),
        onPress: () => navigateToOrgCreateTask(navigation, { orgId: org?.id }),
      });
      tiles.unshift({
        key: 'tasks',
        icon: 'clipboard-check-outline',
        title: t('org.tasks.listTitle', null, 'Tasks'),
        subtitle: t(
          'org.home.actions.tasksSubtitle',
          null,
          'See work cards, people, vehicles, and status.',
        ),
        onPress: () => navigateToOrgTasks(navigation, { orgId: org?.id }),
      });
      tiles.unshift({
        key: 'projects',
        icon: 'briefcase-outline',
        title: t('org.projects.title', null, 'Projects'),
        subtitle: t(
          'org.home.actions.projectsSubtitle',
          null,
          'Volume, value, contacts, and counterparties.',
        ),
        onPress: () => navigateToOrgProjects(navigation, { orgId: org?.id }),
      });
      tiles.unshift({
        key: 'operations',
        icon: 'clipboard-list-outline',
        title: t('org.operations.title', null, 'Operations'),
        subtitle: t(
          'org.home.actions.operationsSubtitle',
          null,
          'Define company operations used on work cards.',
        ),
        onPress: () => navigateToOrgOperations(navigation, { orgId: org?.id }),
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
    fleetCount,
    fleetFocused,
    hasFleet,
    isDriver,
    navItems,
    navigation,
    org?.can_view_fleet,
    org?.has_shop_locations,
    org?.id,
    org?.manage_fleet,
    org?.manage_org_operations,
    t,
  ]);

  const canCreateTasks = Boolean(org?.manage_org_operations || org?.manage_fleet);

  const fabConfig = isDriver
    ? null
    : canCreateTasks
      ? {
          label: t('org.tasks.createTitle', null, 'Create task'),
          onPress: () => navigateToOrgCreateTask(navigation, { orgId: org?.id }),
        }
      : hasFleet
        ? { label: t('org.home.requestRepair', null, 'Request repair'), onPress: goRequestRepair }
        : org?.manage_fleet
          ? { label: t('fleetImport.openAction', null, 'Import fleet'), onPress: goImportFleet }
          : null;

  return (
    <ScreenBackground safeArea={false}>
      <OrgAppHeader
        mode="dashboard"
        title={orgName}
      />
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: scrollBottomPadding }]}
        keyboardShouldPersistTaps="handled"
      >
        <DashboardHeroCard
          title={t('org.home.greeting', { name: workerName }, `Welcome, ${workerName}`)}
          subtitle={t(
            'org.home.pleasantWork',
            { org: orgName },
            `Pleasant work with ${orgName}`,
          )}
        />

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
            <DashboardSummaryRow items={summaryItems} />

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
                            currentTask.vehicle?.license_plate || currentTask.vehicle?.display_name,
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
                        ) : currentTask.status === 'assigned' || currentTask.status === 'draft' ? (
                          <Pressable
                            onPress={(e) => {
                              e?.stopPropagation?.();
                              acknowledgeStart(currentTask);
                            }}
                            disabled={busyStart}
                            style={[styles.startBtn, busyStart && styles.startBtnDisabled]}
                            accessibilityRole="button"
                          >
                            <Text style={styles.startBtnText}>
                              {busyStart
                                ? t('common.loading', null, '…')
                                : t('org.tasks.startCta', null, 'Start')}
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

            <DashboardActionGrid tiles={actionTiles} />
          </>
        )}
      </ScrollView>

      {fabConfig ? (
        <FAB
          label={fabConfig.label}
          style={[styles.fab, { backgroundColor: theme.colors.primary }]}
          color="#fff"
          onPress={fabConfig.onPress}
        />
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
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 20,
  },
});
