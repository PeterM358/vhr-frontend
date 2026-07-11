/**
 * PATH: src/navigation/ShopDrawer.js
 */

import React, { useContext, useState } from 'react';
import { View, Platform } from 'react-native';
import { createDrawerNavigator, DrawerContentScrollView, DrawerItem } from '@react-navigation/drawer';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Text } from 'react-native-paper';

import ShopHomeScreen from '../screens/ShopHomeScreen';
import ShopCalendarScreen from '../screens/ShopCalendarScreen';
import RepairsList from '../components/shop/RepairsList';
import AuthorizedClients from '../components/shop/AuthorizedClients';
import ShopPromotions from '../components/shop/ShopPromotions';
import NotificationsList from '../components/shop/NotificationsList';
import ChooseShopScreen from '../screens/ChooseShopScreen';
import ShopWarehouseHubScreen from '../screens/ShopWarehouseHubScreen';

import { WebSocketContext } from '../context/WebSocketManager';
import { AuthContext } from '../context/AuthManager';
import { logout } from '../api/auth';
import { resetFromShopDrawer, resetShopDrawerRepairs, resetShopDrawerCalendar } from './drawerNavigation';
import {
  navigateToPartnerClients,
  navigateToPartnerInvoicing,
  navigateToPartnerNotifications,
  navigateToPartnerProfile,
  navigateToPartnerPromotions,
  navigateToPartnerServiceCenters,
  navigateToPartnerServices,
  navigateToPartnerSwitchCenter,
  navigateToPartnerWarehouse,
} from './webNavigation';
import { readCachedUnscheduledCount } from '../utils/shopCalendarBadge';
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
  const { unreadCount } = useContext(WebSocketContext);
  const { setAuthToken, setIsAuthenticated, setUserEmailOrPhone } = useContext(AuthContext);
  const [unscheduledCount, setUnscheduledCount] = useState(0);

  useFocusEffect(
    React.useCallback(() => {
      let active = true;
      (async () => {
        const count = await readCachedUnscheduledCount();
        if (active) setUnscheduledCount(count);
      })();
      return () => {
        active = false;
      };
    }, [])
  );

  const handleLogout = async () => {
    await logout(navigation, setAuthToken, setIsAuthenticated, setUserEmailOrPhone);
  };

  const itemProps = drawerMenuItemProps;

  return (
    <DrawerContentScrollView
      {...props}
      style={drawerGlassStyles.scrollView}
      contentContainerStyle={drawerGlassStyles.container}
    >
      <View style={drawerGlassStyles.menuContainer}>
        <Text style={drawerGlassStyles.drawerTitle}>{t('drawer.partner.title')}</Text>

        <DrawerItem
          label={t('common.home')}
          onPress={() => props.navigation.closeDrawer()}
          icon={({ color, size }) => <DrawerMenuIcon name="home-outline" color={color} size={size} />}
          {...itemProps}
        />

        <DrawerItem
          label={t('drawer.partner.centerDetails')}
          onPress={() => {
            if (Platform.OS === 'web') {
              navigateToPartnerProfile(navigation);
            } else {
              resetFromShopDrawer(navigation, 'ShopProfile');
            }
          }}
          icon={({ color, size }) => <DrawerMenuIcon name="store-outline" color={color} size={size} />}
          {...itemProps}
        />

        <DrawerItem
          label={() => <DrawerLabelWithBadge label={t('drawer.partner.calendar')} badge={unscheduledCount} />}
          onPress={() => {
            props.navigation.closeDrawer();
            resetShopDrawerCalendar(props.navigation, {
              backLabel: t('common.home'),
            });
          }}
          icon={({ color, size }) => (
            <DrawerMenuIcon name="calendar-month-outline" color={color} size={size} />
          )}
          {...itemProps}
        />

        <DrawerItem
          label={t('drawer.partner.repairs')}
          onPress={() => resetShopDrawerRepairs(navigation)}
          icon={({ color, size }) => <DrawerMenuIcon name="car-wrench" color={color} size={size} />}
          {...itemProps}
        />

        <DrawerItem
          label={t('drawer.partner.clients')}
          onPress={() => {
            if (Platform.OS === 'web') {
              navigateToPartnerClients(navigation);
            } else {
              resetFromShopDrawer(navigation, 'AuthorizedClients');
            }
          }}
          icon={({ color, size }) => (
            <DrawerMenuIcon name="account-group-outline" color={color} size={size} />
          )}
          {...itemProps}
        />

        <DrawerItem
          label={t('drawer.partner.promotions')}
          onPress={() => {
            if (Platform.OS === 'web') {
              navigateToPartnerPromotions(navigation);
            } else {
              resetFromShopDrawer(navigation, 'ShopPromotions');
            }
          }}
          icon={({ color, size }) => <DrawerMenuIcon name="tag-outline" color={color} size={size} />}
          {...itemProps}
        />

        <DrawerItem
          label={t('drawer.partner.warehouse')}
          onPress={() => {
            if (Platform.OS === 'web') {
              navigateToPartnerWarehouse(navigation);
            } else {
              props.navigation.navigate('ShopWarehouse');
            }
            props.navigation.closeDrawer();
          }}
          icon={({ color, size }) => <DrawerMenuIcon name="warehouse" color={color} size={size} />}
          {...itemProps}
        />

        <DrawerItem
          label={t('drawer.partner.invoicing')}
          onPress={() => {
            if (Platform.OS === 'web') {
              navigateToPartnerInvoicing(navigation);
            } else {
              resetFromShopDrawer(navigation, 'ShopInvoicing');
            }
          }}
          icon={({ color, size }) => (
            <DrawerMenuIcon name="file-document-outline" color={color} size={size} />
          )}
          {...itemProps}
        />

        <DrawerItem
          label={t('drawer.partner.priceList')}
          onPress={() => {
            if (Platform.OS === 'web') {
              navigateToPartnerServices(navigation);
            } else {
              resetFromShopDrawer(navigation, 'ShopServiceMenu');
            }
          }}
          icon={({ color, size }) => (
            <DrawerMenuIcon name="clipboard-list-outline" color={color} size={size} />
          )}
          {...itemProps}
        />

        <DrawerItem
          label={() => <DrawerLabelWithBadge label={t('drawer.partner.notifications')} badge={unreadCount} />}
          onPress={() => {
            if (Platform.OS === 'web') {
              navigateToPartnerNotifications(navigation);
            } else {
              resetFromShopDrawer(navigation, 'NotificationsList');
            }
          }}
          icon={({ color, size }) => <DrawerMenuIcon name="bell-outline" color={color} size={size} />}
          {...itemProps}
        />

        <DrawerItem
          label={t('drawer.partner.explore')}
          onPress={() => {
            props.navigation.closeDrawer();
            navigateToPartnerServiceCenters(navigation);
          }}
          icon={({ color, size }) => <DrawerMenuIcon name="map-search-outline" color={color} size={size} />}
          {...itemProps}
        />

        <DrawerItem
          label={t('drawer.partner.switchCenter')}
          onPress={() => {
            if (Platform.OS === 'web') {
              navigateToPartnerSwitchCenter(navigation);
            } else {
              resetFromShopDrawer(navigation, 'ChooseShop');
            }
          }}
          icon={({ color, size }) => <DrawerMenuIcon name="swap-horizontal" color={color} size={size} />}
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

export default function ShopDrawer() {
  return (
    <Drawer.Navigator
      screenOptions={{
        ...drawerScreenOptions,
        drawerLabelStyle: drawerGlassStyles.itemLabel,
        drawerItemStyle: drawerGlassStyles.drawerItem,
      }}
      drawerContent={(props) => <CustomDrawerContent {...props} />}
    >
      <Drawer.Screen name="ShopDashboard" component={ShopHomeScreen} />
      <Drawer.Screen name="ShopCalendar" component={ShopCalendarScreen} />
      <Drawer.Screen name="RepairsList" component={RepairsList} />
      <Drawer.Screen name="AuthorizedClients" component={AuthorizedClients} />
      <Drawer.Screen name="ShopPromotions" component={ShopPromotions} />
      <Drawer.Screen name="NotificationsList" component={NotificationsList} />
      <Drawer.Screen name="ChooseShop" component={ChooseShopScreen} />
      <Drawer.Screen name="ShopWarehouse" component={ShopWarehouseHubScreen} />
    </Drawer.Navigator>
  );
}
