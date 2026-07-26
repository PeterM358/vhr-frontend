/**
 * PATH: src/navigation/HomeDrawer.js
 */

import React, { useCallback, useContext, useState } from 'react';
import { View } from 'react-native';
import { createDrawerNavigator, DrawerContentScrollView, DrawerItem } from '@react-navigation/drawer';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Text } from 'react-native-paper';
import HomeScreen from '../screens/HomeScreen';
import { WebSocketContext } from '../context/WebSocketManager';
import { AuthContext } from '../context/AuthManager';
import { logout } from '../api/auth';
import { openServiceCenters } from './serviceCentersNavigation';
import {
  navigateToNotifications,
  navigateToProfile,
  navigateToRepairRequests,
  navigateToVehicleList,
} from './webNavigation';
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
import { readOrganizationMemberships } from '../utils/orgWorkspace';
import {
  WORKSPACE_MODE,
  isDriverMembership,
  pickActiveOrganization,
  setWorkspaceMode,
} from '../utils/orgRoleHome';
import { buildShopAuthReset } from '../utils/shopAuthNavigation';

const Drawer = createDrawerNavigator();

function CustomDrawerContent(props) {
  const navigation = useNavigation();
  const { t } = useTranslation();
  const { unreadCount: unreadNotifications } = useContext(WebSocketContext);
  const { setAuthToken, setIsAuthenticated, setUserEmailOrPhone } = useContext(AuthContext);
  const [driverOrg, setDriverOrg] = useState(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        const rows = await readOrganizationMemberships();
        const active = pickActiveOrganization(rows);
        if (!cancelled) {
          setDriverOrg(isDriverMembership(active) ? active : null);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, []),
  );

  const handleLogout = async () => {
    await logout(navigation, setAuthToken, setIsAuthenticated, setUserEmailOrPhone);
  };

  const switchToWorking = async () => {
    props.navigation.closeDrawer();
    await setWorkspaceMode(WORKSPACE_MODE.WORKING);
    const root = navigation.getParent?.() || navigation;
    root.reset(
      buildShopAuthReset({
        name: 'OrgHome',
        params: driverOrg?.id != null ? { organizationId: driverOrg.id, screen: 'OrgFleet' } : { screen: 'OrgFleet' },
      }),
    );
  };

  const itemProps = drawerMenuItemProps;

  return (
    <DrawerContentScrollView
      {...props}
      style={drawerGlassStyles.scrollView}
      contentContainerStyle={drawerGlassStyles.container}
    >
      <View style={drawerGlassStyles.menuContainer}>
        <Text style={drawerGlassStyles.drawerTitle}>{t('common.menu')}</Text>

        {driverOrg ? (
          <DrawerItem
            label={t('org.mode.switchToWorking', null, 'Working mode')}
            onPress={switchToWorking}
            icon={({ color, size }) => <DrawerMenuIcon name="briefcase-outline" color={color} size={size} />}
            {...itemProps}
          />
        ) : null}

        <DrawerItem
          label={t('common.home')}
          onPress={() => props.navigation.closeDrawer()}
          icon={({ color, size }) => <DrawerMenuIcon name="home-outline" color={color} size={size} />}
          {...itemProps}
        />

        <DrawerItem
          label={t('drawer.client.profile')}
          onPress={() => {
            const root = navigation.getParent?.() || navigation;
            navigateToProfile(root);
          }}
          icon={({ color, size }) => (
            <DrawerMenuIcon name="account-circle-outline" color={color} size={size} />
          )}
          {...itemProps}
        />

        <DrawerItem
          label={t('drawer.client.repairs')}
          onPress={() => {
            const root = navigation.getParent?.() || navigation;
            navigateToRepairRequests(root);
          }}
          icon={({ color, size }) => <DrawerMenuIcon name="wrench-outline" color={color} size={size} />}
          {...itemProps}
        />

        <DrawerItem
          label={t('drawer.client.vehicles')}
          onPress={() => {
            const root = navigation.getParent?.() || navigation;
            navigateToVehicleList(root);
          }}
          icon={({ color, size }) => <DrawerMenuIcon name="car-outline" color={color} size={size} />}
          {...itemProps}
        />

        <DrawerItem
          label={() => (
            <DrawerLabelWithBadge label={t('drawer.client.notifications')} badge={unreadNotifications} />
          )}
          onPress={() => {
            const root = navigation.getParent?.() || navigation;
            navigateToNotifications(root);
          }}
          icon={({ color, size }) => <DrawerMenuIcon name="bell-outline" color={color} size={size} />}
          {...itemProps}
        />

        <DrawerItem
          label={t('drawer.client.findServiceCenters')}
          onPress={() => openServiceCenters(navigation)}
          icon={({ color, size }) => (
            <DrawerMenuIcon name="map-marker-radius" color={color} size={size} />
          )}
          {...itemProps}
        />

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

export default function HomeDrawer() {
  return (
    <Drawer.Navigator
      screenOptions={{
        ...drawerScreenOptions,
        drawerLabelStyle: drawerGlassStyles.itemLabel,
        drawerItemStyle: drawerGlassStyles.drawerItem,
      }}
      drawerContent={(props) => <CustomDrawerContent {...props} />}
    >
      <Drawer.Screen name="HomeMain" component={HomeScreen} />
    </Drawer.Navigator>
  );
}
