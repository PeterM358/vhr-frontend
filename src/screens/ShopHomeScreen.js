/**
 * PATH: src/screens/ShopHomeScreen.js
 */

import React, { useContext, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, FlatList } from 'react-native';
import { DrawerActions, useNavigation, useFocusEffect } from '@react-navigation/native';
import { Appbar, Badge, Button, useTheme } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logout } from '../api/auth';
import { getRepairs } from '../api/repairs';

import { WebSocketContext } from '../context/WebSocketManager';
import { AuthContext } from '../context/AuthManager';
import Logo from '../assets/images/logo.svg';
import ScreenBackground from '../components/ScreenBackground';
import FloatingCard from '../components/ui/FloatingCard';
import { COLORS } from '../constants/colors';

const SHOP_TOP_BAR = 'rgba(11,18,32,0.92)';

export default function ShopHomeScreen() {
  const navigation = useNavigation();
  const theme = useTheme();

  const { setAuthToken, setIsAuthenticated, setUserEmailOrPhone } = useContext(AuthContext);
  const { notifications } = useContext(WebSocketContext);

  const [loading, setLoading] = useState(true);
  const [shopDisplayName, setShopDisplayName] = useState('Shop');
  const [openRepairs, setOpenRepairs] = useState([]);
  const [repairsLoading, setRepairsLoading] = useState(true);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  useFocusEffect(
    React.useCallback(() => {
      const loadShopUser = async () => {
        const stored = await AsyncStorage.getItem('@user_email_or_phone');
        let display = 'Shop';
        if (stored?.trim()) {
          display = stored.includes('@') ? stored.split('@')[0] : stored;
        }
        setShopDisplayName(display);
        setLoading(false);
      };

      const loadOpenRepairs = async () => {
        setRepairsLoading(true);
        try {
          const token = await AsyncStorage.getItem('@access_token');
          const data = await getRepairs(token, 'open');
          setOpenRepairs(Array.isArray(data) ? data : []);
        } catch (err) {
          console.error('Failed to load open repairs', err);
          setOpenRepairs([]);
        } finally {
          setRepairsLoading(false);
        }
      };

      loadShopUser();
      loadOpenRepairs();
    }, [])
  );

  const handleLogout = async () => {
    await logout(navigation, setAuthToken, setIsAuthenticated, setUserEmailOrPhone);
  };

  const renderRepair = ({ item }) => (
    <FloatingCard
      onPress={() => navigation.navigate('RepairDetail', { repairId: item.id })}
    >
      <Text style={styles.repairTitle} numberOfLines={2}>
        {`${item.vehicle_make || ''} ${item.vehicle_model || ''}`.trim() || 'Vehicle'}
      </Text>
      <Text style={styles.repairMeta}>Plate hidden until booking</Text>
      {!!item.description && (
        <Text style={styles.repairDesc} numberOfLines={2}>
          {item.description}
        </Text>
      )}
      {item.kilometers != null && item.kilometers !== '' && (
        <Text style={styles.repairMeta}>
          {Number(item.kilometers).toLocaleString()} km
        </Text>
      )}
    </FloatingCard>
  );

  if (loading) {
    return (
      <ScreenBackground>
        <View style={styles.loaderCenter}>
          <ActivityIndicator size="large" color="#fff" />
        </View>
      </ScreenBackground>
    );
  }

  return (
    <ScreenBackground safeArea={false}>
      <Appbar.Header style={{ backgroundColor: SHOP_TOP_BAR }}>
        <Appbar.Action
          icon="menu"
          onPress={() => navigation.openDrawer()}
          color="#fff"
        />
        <Appbar.Content
          title={shopDisplayName}
          titleStyle={{ color: '#fff' }}
        />
        <View style={styles.iconWithBadge}>
          <Appbar.Action
            icon="bell-outline"
            onPress={() => navigation.navigate('ShopNotificationsScreen')}
            color="#fff"
          />
          {unreadCount > 0 && (
            <Badge style={styles.notificationBadge}>{unreadCount}</Badge>
          )}
        </View>
        <Appbar.Action
          icon="logout"
          onPress={handleLogout}
          color="#fff"
        />
      </Appbar.Header>

      <View style={styles.content}>
        <View style={styles.headerCard}>
          <Logo width={72} height={72} style={styles.shopLogo} />
          <Text style={styles.welcomeText}>
            Welcome to Your Shop Dashboard
          </Text>
          <Button
            mode="contained"
            icon="map"
            onPress={() => navigation.navigate('ShopMap')}
            style={[styles.mapButton, { backgroundColor: theme.colors.primary }]}
            contentStyle={styles.mapButtonContent}
            labelStyle={styles.mapButtonLabel}
          >
            Find Shops on Map
          </Button>
        </View>

        <View style={styles.repairsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Open Repair Requests
            </Text>
            <Button
              mode="text"
              compact
              onPress={() =>
                navigation.dispatch(DrawerActions.jumpTo('RepairsList'))
              }
              labelStyle={{ color: '#fff' }}
            >
              See all
            </Button>
          </View>

          {repairsLoading ? (
            <ActivityIndicator size="small" color="#fff" style={{ marginTop: 12 }} />
          ) : (
            <FlatList
              data={openRepairs}
              keyExtractor={(item) => item.id.toString()}
              renderItem={renderRepair}
              contentContainerStyle={styles.repairsListContent}
              ListEmptyComponent={
                <FloatingCard accent={false} style={styles.emptyCard}>
                  <Text style={styles.emptyText}>
                    No open requests from customers yet
                  </Text>
                </FloatingCard>
              }
            />
          )}
        </View>
      </View>
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
  content: {
    flex: 1,
    paddingHorizontal: 12,
    paddingTop: 12,
    backgroundColor: 'transparent',
  },
  loaderCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCard: {
    backgroundColor: 'rgba(5,15,30,0.72)',
    borderColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  shopLogo: {
    alignSelf: 'center',
    marginBottom: 10,
  },
  welcomeText: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 14,
    color: '#fff',
  },
  mapButton: {
    alignSelf: 'stretch',
    borderRadius: 12,
    elevation: 2,
  },
  mapButtonContent: {
    flexDirection: 'row-reverse',
    height: 46,
  },
  mapButtonLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  repairsSection: {
    flex: 1,
    paddingTop: 4,
    backgroundColor: 'transparent',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  repairsListContent: {
    paddingBottom: 12,
    paddingHorizontal: 2,
  },
  repairTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.TEXT_DARK,
    marginBottom: 4,
  },
  repairDesc: {
    fontSize: 13,
    color: COLORS.TEXT_MUTED,
    lineHeight: 18,
  },
  repairMeta: {
    fontSize: 12,
    color: COLORS.TEXT_MUTED,
    marginTop: 6,
  },
  emptyCard: {
    alignItems: 'center',
    marginTop: 8,
  },
  emptyText: {
    textAlign: 'center',
    color: COLORS.TEXT_MUTED,
    fontSize: 14,
  },
});
