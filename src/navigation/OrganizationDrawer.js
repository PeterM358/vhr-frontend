/**
 * Organization workspace drawer — fleet and org ERP live here, not behind ShopDrawer.
 */

import React, { useCallback, useContext, useMemo, useState } from 'react';
import { View, Platform } from 'react-native';
import { createDrawerNavigator, DrawerContentScrollView, DrawerItem } from '@react-navigation/drawer';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Text } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';

import OrganizationHomeScreen from '../screens/OrganizationHomeScreen';
import FleetDashboardScreen from '../screens/FleetDashboardScreen';
import NetworkOrganizationScreen from '../screens/NetworkOrganizationScreen';
import OrgWorkforceScreen from '../screens/OrgWorkforceScreen';
import OrgOperationsScreen from '../screens/OrgOperationsScreen';
import OrgTasksScreen from '../screens/OrgTasksScreen';
import OrgCreateTaskScreen from '../screens/OrgCreateTaskScreen';
import OrgProjectsScreen from '../screens/OrgProjectsScreen';
import OrgWarehouseScreen from '../screens/OrgWarehouseScreen';
import OrgAccountingScreen from '../screens/OrgAccountingScreen';
import OrgFleetPlanningScreen from '../screens/OrgFleetPlanningScreen';
import OrgInvoicingScreen from '../screens/OrgInvoicingScreen';
import OrgLegalEntityScreen from '../screens/OrgLegalEntityScreen';
import OrgActivitiesScreen from '../screens/OrgActivitiesScreen';
import OrgPublicProfileScreen from '../screens/OrgPublicProfileScreen';
import OrgCalendarScreen from '../screens/OrgCalendarScreen';
import ChooseShopScreen from '../screens/ChooseShopScreen';

import { AuthContext } from '../context/AuthManager';
import { WebSocketContext } from '../context/WebSocketManager';
import { logout } from '../api/auth';
import { STORAGE_KEYS } from '../constants/storageKeys';
import {
  buildOrgNavItems,
  organizationMembershipFor,
  readOrganizationMemberships,
  setCurrentOrganizationId,
} from '../utils/orgWorkspace';
import {
  WORKSPACE_MODE,
  isDriverMembership,
  setWorkspaceMode,
} from '../utils/orgRoleHome';
import { buildShopAuthReset } from '../utils/shopAuthNavigation';
import {
  navigateToNotifications,
  navigateToOrgAccounting,
  navigateToOrgCalendar,
  navigateToOrgFleet,
  navigateToOrgFleetPlanning,
  navigateToOrgInvoicing,
  navigateToOrgLegalEntity,
  navigateToOrgActivities,
  navigateToOrgPublicProfile,
  navigateToOrgNetwork,
  navigateToOrgOperations,
  navigateToOrgProjects,
  navigateToOrgTasks,
  navigateToOrgWarehouse,
  navigateToOrgWorkforce,
  navigateToPartnerDashboard,
  navigateToPartnerSwitchCenter,
  navigateToProfile,
} from '../navigation/webNavigation';
import {
  DrawerMenuIcon,
  DrawerLabelWithBadge,
  DrawerVeversalLogoFooter,
  drawerGlassStyles,
  drawerMenuItemProps,
  drawerScreenOptions,
} from './DrawerBranding';
import CompactLanguageSelector from '../components/common/CompactLanguageSelector';
import WorkspaceModeSwitch from '../components/org/WorkspaceModeSwitch';
import { useTranslation } from '../i18n';

const Drawer = createDrawerNavigator();

const ROUTE_ICONS = {
  OrgOverview: 'view-dashboard-outline',
  OrgFleet: 'truck',
  OrgOperations: 'clipboard-list-outline',
  OrgTasks: 'clipboard-check-outline',
  OrgWorkOrders: 'clipboard-check-outline',
  OrgProjects: 'briefcase-outline',
  OrgWarehouse: 'warehouse',
  OrgLegalEntity: 'domain',
  OrgActivities: 'briefcase-check-outline',
  OrgWorkforce: 'account-hard-hat',
  OrgNetwork: 'transit-connection-variant',
  OrgDocuments: 'file-document-outline',
  OrgLocations: 'map-marker-radius',
  OrgTransport: 'bus',
  OrgConstruction: 'hard-hat',
  OrgInvoicing: 'receipt',
  OrgLedger: 'book-open-outline',
  OrgAccounting: 'book-open-outline',
  OrgFleetPlanning: 'table-clock',
  OrgPublicProfile: 'earth',
  OrgCalendar: 'calendar-month-outline',
};

/** Shown once under Company / Profile — strip from backend nav_sections to avoid duplicates. */
const COMPANY_PROFILE_ROUTES = new Set(['OrgLegalEntity', 'OrgActivities', 'OrgPublicProfile']);

function normalizeOrgRoute(route) {
  if (route === 'OrgWorkOrders') return 'OrgTasks';
  if (route === 'OrgLedger') return 'OrgAccounting';
  return route;
}

function CustomDrawerContent(props) {
  const navigation = useNavigation();
  const { t } = useTranslation();
  const { setAuthToken, setIsAuthenticated, setUserEmailOrPhone } = useContext(AuthContext);
  const { unreadCount: unreadNotifications } = useContext(WebSocketContext);
  const [org, setOrg] = useState(null);
  const [memberships, setMemberships] = useState([]);

  const load = useCallback(async () => {
    const rows = await readOrganizationMemberships();
    setMemberships(rows);
    const orgId = await AsyncStorage.getItem(STORAGE_KEYS.CURRENT_ORGANIZATION_ID);
    setOrg(organizationMembershipFor(rows, orgId) || rows[0] || null);
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      load();
    }, [load]),
  );

  const itemProps = drawerMenuItemProps;
  const isDriver = isDriverMembership(org);
  const personalUnread = isDriver ? unreadNotifications || 0 : 0;
  const canManageOps = Boolean(org?.manage_org_operations || org?.manage_fleet);
  const canPlanFleet = Boolean(org?.can_plan_fleet || canManageOps);
  const canViewAccounting = Boolean(org?.view_org_accounting);

  const departmentItems = useMemo(() => {
    if (isDriver) {
      return [
        {
          key: 'tasks-home',
          route: 'OrgOverview',
          label: t('org.home.tasks.title', null, 'Tasks'),
          icon: 'clipboard-check-outline',
        },
      ];
    }

    const fromNav = buildOrgNavItems(org, t);
    const seen = new Set();
    const items = [];

    fromNav.forEach((item) => {
      const route = normalizeOrgRoute(item.route);
      if (seen.has(route)) return;
      // Company/legal/public profile live in the dedicated section below — never duplicate.
      if (COMPANY_PROFILE_ROUTES.has(route)) {
        seen.add(route);
        return;
      }
      seen.add(route);
      items.push({
        key: item.key || route,
        route,
        label:
          route === 'OrgTasks'
            ? t('org.nav.tasks', null, 'Tasks')
            : item.label,
        icon: ROUTE_ICONS[route] || 'view-grid-outline',
      });
    });

    if (canManageOps && !seen.has('OrgTasks')) {
      const overviewIdx = items.findIndex((row) => row.route === 'OrgOverview');
      const insertAt = overviewIdx >= 0 ? overviewIdx + 1 : 0;
      items.splice(insertAt, 0, {
        key: 'tasks',
        route: 'OrgTasks',
        label: t('org.nav.tasks', null, 'Tasks'),
        icon: 'clipboard-check-outline',
      });
      seen.add('OrgTasks');
    }

    if (canPlanFleet && !seen.has('OrgFleetPlanning')) {
      const tasksIdx = items.findIndex((row) => row.route === 'OrgTasks');
      const fleetIdx = items.findIndex((row) => row.route === 'OrgFleet');
      const insertAt =
        tasksIdx >= 0 ? tasksIdx + 1 : fleetIdx >= 0 ? fleetIdx + 1 : items.length;
      items.splice(insertAt, 0, {
        key: 'fleet-planning',
        route: 'OrgFleetPlanning',
        label: t('org.nav.fleetPlanning', null, 'Fleet planning'),
        icon: 'table-clock',
      });
      seen.add('OrgFleetPlanning');
    }

    if (canManageOps && !seen.has('OrgProjects')) {
      const opsIdx = items.findIndex((row) => row.route === 'OrgOperations');
      const insertAt = opsIdx >= 0 ? opsIdx + 1 : items.length;
      items.splice(insertAt, 0, {
        key: 'projects',
        route: 'OrgProjects',
        label: t('org.nav.projects', null, 'Projects'),
        icon: 'briefcase-outline',
      });
      seen.add('OrgProjects');
    }

    const canWarehouse = Boolean(
      canManageOps || org?.manage_org_warehouse || org?.can_post_materials_intake,
    );
    if (canWarehouse && !seen.has('OrgWarehouse')) {
      const workforceIdx = items.findIndex((row) => row.route === 'OrgWorkforce');
      const projectsIdx = items.findIndex((row) => row.route === 'OrgProjects');
      const opsIdx = items.findIndex((row) => row.route === 'OrgOperations');
      const insertAt =
        workforceIdx >= 0
          ? workforceIdx
          : projectsIdx >= 0
            ? projectsIdx + 1
            : opsIdx >= 0
              ? opsIdx + 1
              : items.length;
      items.splice(insertAt, 0, {
        key: 'warehouse',
        route: 'OrgWarehouse',
        label: t('org.nav.warehouse', null, 'Warehouse'),
        icon: 'warehouse',
      });
      seen.add('OrgWarehouse');
    }

    if (canViewAccounting && !seen.has('OrgAccounting')) {
      items.push({
        key: 'accounting',
        route: 'OrgAccounting',
        label: t('org.nav.accounting', null, 'Accounting'),
        icon: 'book-open-outline',
      });
      seen.add('OrgAccounting');
    }

    if ((canViewAccounting || org?.membership_role === 'accounting') && !seen.has('OrgInvoicing')) {
      items.push({
        key: 'invoicing',
        route: 'OrgInvoicing',
        label: t('org.nav.invoicing', null, 'Invoicing'),
        icon: 'receipt',
      });
      seen.add('OrgInvoicing');
    }

    return items;
  }, [canManageOps, canPlanFleet, canViewAccounting, isDriver, org, t]);

  const openRoute = (route) => {
    props.navigation.closeDrawer();
    const normalized = normalizeOrgRoute(route);
    if (normalized === 'OrgFleet') {
      navigateToOrgFleet(navigation, { orgId: org?.id });
      return;
    }
    if (normalized === 'OrgNetwork') {
      navigateToOrgNetwork(navigation, { orgId: org?.id });
      return;
    }
    if (normalized === 'OrgWorkforce') {
      navigateToOrgWorkforce(navigation, { orgId: org?.id });
      return;
    }
    if (normalized === 'OrgOperations') {
      navigateToOrgOperations(navigation, { orgId: org?.id });
      return;
    }
    if (normalized === 'OrgTasks') {
      navigateToOrgTasks(navigation, { orgId: org?.id });
      return;
    }
    if (normalized === 'OrgFleetPlanning') {
      navigateToOrgFleetPlanning(navigation, { orgId: org?.id });
      return;
    }
    if (normalized === 'OrgProjects') {
      navigateToOrgProjects(navigation, { orgId: org?.id });
      return;
    }
    if (normalized === 'OrgCalendar') {
      navigateToOrgCalendar(navigation, { orgId: org?.id });
      return;
    }
    if (normalized === 'OrgWarehouse') {
      navigateToOrgWarehouse(navigation, { orgId: org?.id });
      return;
    }
    if (normalized === 'OrgAccounting') {
      navigateToOrgAccounting(navigation, { orgId: org?.id });
      return;
    }
    if (normalized === 'OrgInvoicing') {
      navigateToOrgInvoicing(navigation, { orgId: org?.id });
      return;
    }
    if (normalized === 'OrgLegalEntity') {
      navigateToOrgLegalEntity(navigation, { orgId: org?.id });
      return;
    }
    if (normalized === 'OrgActivities') {
      navigateToOrgActivities(navigation, { orgId: org?.id });
      return;
    }
    if (normalized === 'OrgPublicProfile') {
      navigateToOrgPublicProfile(navigation, { orgId: org?.id });
      return;
    }
    if (Platform.OS === 'web') {
      if (normalized === 'OrgOverview') {
        navigation.navigate('OrgOverview');
      }
      return;
    }
    props.navigation.navigate(normalized === 'OrgOverview' ? 'OrgOverview' : normalized);
  };

  const switchToPersonal = async () => {
    props.navigation.closeDrawer();
    await setWorkspaceMode(WORKSPACE_MODE.PERSONAL);
    const root = navigation.getParent?.() || navigation;
    root.reset(buildShopAuthReset({ name: 'Home' }));
  };

  const handleLogout = async () => {
    await logout(navigation, setAuthToken, setIsAuthenticated, setUserEmailOrPhone);
  };

  return (
    <DrawerContentScrollView
      {...props}
      style={drawerGlassStyles.scrollView}
      contentContainerStyle={drawerGlassStyles.container}
    >
      <View style={drawerGlassStyles.menuContainer}>
        <Text style={drawerGlassStyles.drawerTitle}>
          {org?.display_name || t('org.drawer.title', null, 'Organization')}
        </Text>

        {isDriver ? (
          <WorkspaceModeSwitch
            activeMode={WORKSPACE_MODE.WORKING}
            workingBadge={0}
            personalBadge={personalUnread}
            onSelectWorking={() => props.navigation.closeDrawer()}
            onSelectPersonal={switchToPersonal}
          />
        ) : null}

        {departmentItems.map((item) => (
          <DrawerItem
            key={item.key}
            label={item.label}
            onPress={() => openRoute(item.route)}
            icon={({ color, size }) => (
              <DrawerMenuIcon name={item.icon} color={color} size={size} />
            )}
            {...itemProps}
          />
        ))}

        <DrawerItem
          label={t('org.drawer.calendar', null, 'Calendar')}
          onPress={() => openRoute('OrgCalendar')}
          icon={({ color, size }) => (
            <DrawerMenuIcon name="calendar-month-outline" color={color} size={size} />
          )}
          {...itemProps}
        />

        <DrawerItem
          label={() => (
            <DrawerLabelWithBadge
              label={t('org.drawer.notifications', null, 'Notifications')}
              badge={unreadNotifications}
            />
          )}
          onPress={() => {
            props.navigation.closeDrawer();
            const root = navigation.getParent?.() || navigation;
            navigateToNotifications(root, {
              returnTo: 'OrgHome',
              backLabelKey: 'org.home.title',
            });
          }}
          icon={({ color, size }) => <DrawerMenuIcon name="bell-outline" color={color} size={size} />}
          {...itemProps}
        />

        {!isDriver ? (
          <>
            <Text style={drawerGlassStyles.drawerSectionTitle}>
              {t('org.drawer.companySection', null, 'Company / Profile')}
            </Text>

            <DrawerItem
              label={t('org.drawer.company', null, 'Company details')}
              onPress={() => openRoute('OrgLegalEntity')}
              icon={({ color, size }) => (
                <DrawerMenuIcon name="domain" color={color} size={size} />
              )}
              {...itemProps}
            />

            <DrawerItem
              label={t('org.drawer.activities', null, 'Company activities')}
              onPress={() => openRoute('OrgActivities')}
              icon={({ color, size }) => (
                <DrawerMenuIcon name="briefcase-check-outline" color={color} size={size} />
              )}
              {...itemProps}
            />

            <DrawerItem
              label={t('org.nav.publicProfile', null, 'Public profile')}
              onPress={() => openRoute('OrgPublicProfile')}
              icon={({ color, size }) => (
                <DrawerMenuIcon name="earth" color={color} size={size} />
              )}
              {...itemProps}
            />

            <DrawerItem
              label={t('org.drawer.account', null, 'My account')}
              onPress={() => {
                props.navigation.closeDrawer();
                const root = navigation.getParent?.() || navigation;
                navigateToProfile(root);
              }}
              icon={({ color, size }) => (
                <DrawerMenuIcon name="account-circle-outline" color={color} size={size} />
              )}
              {...itemProps}
            />
          </>
        ) : (
          <DrawerItem
            label={t('org.drawer.account', null, 'My account')}
            onPress={() => {
              props.navigation.closeDrawer();
              const root = navigation.getParent?.() || navigation;
              navigateToProfile(root);
            }}
            icon={({ color, size }) => (
              <DrawerMenuIcon name="account-circle-outline" color={color} size={size} />
            )}
            {...itemProps}
          />
        )}

        {!isDriver && org?.has_shop_locations ? (
          <DrawerItem
            label={t('org.drawer.serviceCenter', null, 'Service center')}
            onPress={() => {
              props.navigation.closeDrawer();
              navigateToPartnerDashboard(navigation);
            }}
            icon={({ color, size }) => <DrawerMenuIcon name="store-outline" color={color} size={size} />}
            {...itemProps}
          />
        ) : null}

        {memberships.length > 1 ? (
          memberships.map((row) => (
            <DrawerItem
              key={`switch-${row.id}`}
              label={row.display_name}
              onPress={async () => {
                await setCurrentOrganizationId(row.id);
                setOrg(row);
                props.navigation.closeDrawer();
              }}
              icon={({ color, size }) => <DrawerMenuIcon name="swap-horizontal" color={color} size={size} />}
              {...itemProps}
            />
          ))
        ) : null}

        {!isDriver && org?.has_shop_locations ? (
          <DrawerItem
            label={t('org.drawer.switchCenter', null, 'Switch service center')}
            onPress={() => {
              props.navigation.closeDrawer();
              navigateToPartnerSwitchCenter(navigation);
            }}
            icon={({ color, size }) => <DrawerMenuIcon name="map-marker-radius" color={color} size={size} />}
            {...itemProps}
          />
        ) : null}

        <View style={drawerGlassStyles.languageSection}>
          <Text style={drawerGlassStyles.languageLabel}>{t('language.label')}</Text>
          <CompactLanguageSelector variant="dark" compact presentation="modal" showFullLabel />
        </View>

        <View style={drawerGlassStyles.divider} />

        <DrawerItem
          label={t('common.logout')}
          onPress={handleLogout}
          icon={({ color, size }) => <DrawerMenuIcon name="logout" color={color} size={size} />}
          {...itemProps}
        />
      </View>

      <DrawerVeversalLogoFooter />
    </DrawerContentScrollView>
  );
}

export default function OrganizationDrawer() {
  return (
    <Drawer.Navigator
      screenOptions={{
        ...drawerScreenOptions,
        drawerLabelStyle: drawerGlassStyles.itemLabel,
        drawerItemStyle: drawerGlassStyles.drawerItem,
      }}
      drawerContent={(props) => <CustomDrawerContent {...props} />}
    >
      <Drawer.Screen name="OrgOverview" component={OrganizationHomeScreen} />
      <Drawer.Screen name="OrgFleet" component={FleetDashboardScreen} />
      <Drawer.Screen name="OrgOperations" component={OrgOperationsScreen} />
      <Drawer.Screen name="OrgTasks" component={OrgTasksScreen} />
      <Drawer.Screen
        name="OrgCreateTask"
        component={OrgCreateTaskScreen}
        options={{ drawerItemStyle: { display: 'none' } }}
      />
      <Drawer.Screen name="OrgFleetPlanning" component={OrgFleetPlanningScreen} />
      <Drawer.Screen name="OrgProjects" component={OrgProjectsScreen} />
      <Drawer.Screen name="OrgWarehouse" component={OrgWarehouseScreen} />
      <Drawer.Screen name="OrgAccounting" component={OrgAccountingScreen} />
      <Drawer.Screen name="OrgInvoicing" component={OrgInvoicingScreen} />
      <Drawer.Screen name="OrgLegalEntity" component={OrgLegalEntityScreen} />
      <Drawer.Screen name="OrgActivities" component={OrgActivitiesScreen} />
      <Drawer.Screen name="OrgPublicProfile" component={OrgPublicProfileScreen} />
      <Drawer.Screen name="OrgCalendar" component={OrgCalendarScreen} />
      <Drawer.Screen name="OrgWorkforce" component={OrgWorkforceScreen} />
      <Drawer.Screen name="OrgNetwork" component={NetworkOrganizationScreen} />
      <Drawer.Screen name="ChooseShop" component={ChooseShopScreen} />
    </Drawer.Navigator>
  );
}
