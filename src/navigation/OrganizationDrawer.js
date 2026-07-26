/**
 * Organization workspace drawer — fleet and org ERP live here, not behind ShopDrawer.
 */

import React, { useCallback, useContext, useState } from 'react';
import { View, Platform } from 'react-native';
import { createDrawerNavigator, DrawerContentScrollView, DrawerItem } from '@react-navigation/drawer';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Text } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';

import OrganizationHomeScreen from '../screens/OrganizationHomeScreen';
import FleetDashboardScreen from '../screens/FleetDashboardScreen';
import NetworkOrganizationScreen from '../screens/NetworkOrganizationScreen';
import OrgWorkforceScreen from '../screens/OrgWorkforceScreen';
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
  navigateToNotifications,
  navigateToOrgCalendar,
  navigateToOrgFleet,
  navigateToOrgNetwork,
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
import { useTranslation } from '../i18n';

const Drawer = createDrawerNavigator();

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
  const navItems = buildOrgNavItems(org, t);

  const openRoute = (route) => {
    props.navigation.closeDrawer();
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
    if (route === 'OrgCalendar') {
      navigateToOrgCalendar(navigation, { orgId: org?.id });
      return;
    }
    if (Platform.OS === 'web') {
      if (route === 'OrgOverview') {
        navigation.navigate('OrgOverview');
      }
      return;
    }
    props.navigation.navigate(route === 'OrgOverview' ? 'OrgOverview' : route);
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

        {navItems.map((item) => (
          <DrawerItem
            key={item.key}
            label={item.label}
            onPress={() => openRoute(item.route)}
            icon={({ color, size }) => <DrawerMenuIcon name="domain" color={color} size={size} />}
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

        <DrawerItem
          label={t('org.drawer.profile', null, 'Profile')}
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

        {org?.has_shop_locations ? (
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

        {org?.has_shop_locations ? (
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
      <Drawer.Screen name="OrgCalendar" component={OrgCalendarScreen} />
      <Drawer.Screen name="OrgWorkforce" component={OrgWorkforceScreen} />
      <Drawer.Screen name="OrgNetwork" component={NetworkOrganizationScreen} />
      <Drawer.Screen name="ChooseShop" component={ChooseShopScreen} />
    </Drawer.Navigator>
  );
}
