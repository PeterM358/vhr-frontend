/**
 * PATH: src/navigation/ShopDrawer.js
 */

import React, { useContext, useState, useCallback } from 'react';
import { View, Platform } from 'react-native';
import { createDrawerNavigator, DrawerContentScrollView, DrawerItem } from '@react-navigation/drawer';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Text } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
import { getMyShopProfiles } from '../api/profiles';
import { resetFromShopDrawer, resetShopDrawerRepairs, resetShopDrawerCalendar } from './drawerNavigation';
import {
  navigateToPartnerClients,
  navigateToPartnerInvoicing,
  navigateToPartnerNotifications,
  navigateToPartnerPromotions,
  navigateToPartnerServiceCenters,
  navigateToPartnerServices,
  navigateToPartnerSwitchCenter,
  navigateToPartnerWarehouse,
  navigateToPartnerAnalytics,
  navigateToPartnerWorkforce,
  navigateToPartnerDocumentImports,
  navigateToPartnerComplaints,
  navigateToPartnerPurchaseOrders,
  navigateToPartnerStorageLocations,
} from './webNavigation';
import { readCachedUnscheduledCount } from '../utils/shopCalendarBadge';
import { openPartnerCenter } from '../utils/partnerSetupGate';
import {
  canAccessPartnerRoute,
  readShopMemberships,
  shopMembershipFor,
} from '../utils/shopErpAccess';
import { STORAGE_KEYS } from '../constants/storageKeys';
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
  const [shopProfile, setShopProfile] = useState(null);
  const [membership, setMembership] = useState(null);

  const loadErpContext = useCallback(async () => {
    try {
      const [shopId, memberships, profiles] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.CURRENT_SHOP_ID),
        readShopMemberships(),
        getMyShopProfiles(),
      ]);
      const profile =
        profiles?.find((row) => String(row.id) === String(shopId)) || profiles?.[0] || null;
      setShopProfile(profile);
      setMembership(shopMembershipFor(memberships, profile?.id ?? shopId));
    } catch {
      setShopProfile(null);
      setMembership(null);
    }
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      let active = true;
      (async () => {
        const count = await readCachedUnscheduledCount();
        if (active) setUnscheduledCount(count);
      })();
      loadErpContext();
      return () => {
        active = false;
      };
    }, [loadErpContext])
  );

  const handleLogout = async () => {
    await logout(navigation, setAuthToken, setIsAuthenticated, setUserEmailOrPhone);
  };

  const itemProps = drawerMenuItemProps;
  const erpContext = { profile: shopProfile, membership };
  const showWarehouse = canAccessPartnerRoute('ShopWarehouse', erpContext);
  const showInvoicing = canAccessPartnerRoute('ShopInvoicing', erpContext);
  const showAnalytics = canAccessPartnerRoute('ShopAnalytics', erpContext);
  const showWorkforce = canAccessPartnerRoute('ShopWorkforce', erpContext);
  const showDocumentImports = canAccessPartnerRoute('ShopDocumentImports', erpContext);
  const showComplaints = canAccessPartnerRoute('ShopComplaints', erpContext);
  const showPurchaseOrders = canAccessPartnerRoute('ShopPurchaseOrders', erpContext);
  const showStorageLocations = canAccessPartnerRoute('ShopStorageLocations', erpContext);
  const showBusinessNetwork = canAccessPartnerRoute('NetworkOrganization', erpContext);

  const openStackRoute = (webNav, routeName) => {
    props.navigation.closeDrawer();
    if (Platform.OS === 'web') {
      webNav(navigation);
      return;
    }
    resetFromShopDrawer(navigation, routeName);
  };

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
            props.navigation.closeDrawer();
            // Incomplete shops go into the guided wizard; ready shops edit the
            // full profile.
            openPartnerCenter(navigation, shopProfile);
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

        {showInvoicing ? (
          <DrawerItem
            label={t('drawer.partner.invoicing')}
            onPress={() => openStackRoute(navigateToPartnerInvoicing, 'ShopInvoicing')}
            icon={({ color, size }) => (
              <DrawerMenuIcon name="file-document-outline" color={color} size={size} />
            )}
            {...itemProps}
          />
        ) : null}

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

        {showWarehouse ? (
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
        ) : null}

        {showAnalytics ? (
          <DrawerItem
            label={t('drawer.partner.analytics')}
            onPress={() => openStackRoute(navigateToPartnerAnalytics, 'ShopAnalytics')}
            icon={({ color, size }) => <DrawerMenuIcon name="chart-line" color={color} size={size} />}
            {...itemProps}
          />
        ) : null}

        {showWorkforce ? (
          <DrawerItem
            label={t('drawer.partner.workforce')}
            onPress={() => openStackRoute(navigateToPartnerWorkforce, 'ShopWorkforce')}
            icon={({ color, size }) => <DrawerMenuIcon name="account-hard-hat" color={color} size={size} />}
            {...itemProps}
          />
        ) : null}

        {showDocumentImports ? (
          <DrawerItem
            label={t('drawer.partner.documentImports')}
            onPress={() => openStackRoute(navigateToPartnerDocumentImports, 'ShopDocumentImports')}
            icon={({ color, size }) => <DrawerMenuIcon name="file-upload-outline" color={color} size={size} />}
            {...itemProps}
          />
        ) : null}

        {showComplaints ? (
          <DrawerItem
            label={t('drawer.partner.complaints')}
            onPress={() => openStackRoute(navigateToPartnerComplaints, 'ShopComplaints')}
            icon={({ color, size }) => <DrawerMenuIcon name="alert-circle-outline" color={color} size={size} />}
            {...itemProps}
          />
        ) : null}

        {showPurchaseOrders ? (
          <DrawerItem
            label={t('drawer.partner.purchaseOrders')}
            onPress={() => openStackRoute(navigateToPartnerPurchaseOrders, 'ShopPurchaseOrders')}
            icon={({ color, size }) => <DrawerMenuIcon name="cart-outline" color={color} size={size} />}
            {...itemProps}
          />
        ) : null}

        {showStorageLocations ? (
          <DrawerItem
            label={t('drawer.partner.storageLocations')}
            onPress={() => openStackRoute(navigateToPartnerStorageLocations, 'ShopStorageLocations')}
            icon={({ color, size }) => <DrawerMenuIcon name="map-marker-path" color={color} size={size} />}
            {...itemProps}
          />
        ) : null}

        {showBusinessNetwork ? (
          <DrawerItem
            label={t('drawer.partner.businessNetwork')}
            onPress={() => openStackRoute(() => {}, 'NetworkOrganization')}
            icon={({ color, size }) => <DrawerMenuIcon name="domain" color={color} size={size} />}
            {...itemProps}
          />
        ) : null}

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
