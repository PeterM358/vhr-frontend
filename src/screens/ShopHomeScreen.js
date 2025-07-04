// PATH: src/screens/ShopHomeScreen.js
import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ImageBackground,
  StyleSheet,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { logout } from '../api/auth';

import PendingRepairs from '../components/shop/RepairsList';
import AuthorizedClients from '../components/shop/AuthorizedClients';
import ShopPromotions from '../components/shop/ShopPromotions';
import NotificationsList from '../components/shop/NotificationsList';

import { WebSocketContext } from '../context/WebSocketManager';
import BASE_STYLES from '../styles/base';

export default function ShopHomeScreen() {
  const [activeTab, setActiveTab] = useState('repairs');
  const navigation = useNavigation();

  // ✅ Access live websocket notifications
  const { notifications } = useContext(WebSocketContext);

  // ✅ Count unread notifications
  const unreadCount = notifications.filter(n => !n.is_read).length;

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity onPress={() => logout(navigation)}>
          <Text style={{ color: 'red', marginRight: 10 }}>Logout</Text>
        </TouchableOpacity>
      ),
      headerTitle: 'Shop Home',
    });
  }, [navigation]);

  const renderContent = () => {
    switch (activeTab) {
      case 'repairs':
        return <PendingRepairs />;
      case 'clients':
        return <AuthorizedClients navigation={navigation} />;
      case 'promotions':
        return <ShopPromotions />;
      case 'notifications':
        return <NotificationsList />;
      default:
        return null;
    }
  };

  return (
    <ImageBackground
      source={require('../assets/background.jpg')}
      style={BASE_STYLES.background}
      blurRadius={5}
    >
      <View style={BASE_STYLES.overlay}>
        <View style={BASE_STYLES.tabBar}>
          <TabButton label="Repairs" activeTab={activeTab} setActiveTab={setActiveTab} />
          <TabButton label="Clients" activeTab={activeTab} setActiveTab={setActiveTab} />
          <TabButton label="Promotions" activeTab={activeTab} setActiveTab={setActiveTab} />
          <TabButton 
            label="Notifications" 
            activeTab={activeTab} 
            setActiveTab={setActiveTab} 
            badgeCount={unreadCount}
          />
          <TouchableOpacity
            style={BASE_STYLES.inactiveTab}
            onPress={() => navigation.navigate('ShopMap')}
          >
            <Text>Map</Text>
          </TouchableOpacity>
        </View>

        <View style={{ marginVertical: 10, alignItems: 'center' }}>
          <TouchableOpacity
            style={BASE_STYLES.inactiveTab}
            onPress={() => navigation.navigate('ChooseShop')}
          >
            <Text>Switch Shop</Text>
          </TouchableOpacity>
        </View>

        <View style={{ flex: 1 }}>
          {renderContent()}
        </View>
      </View>
    </ImageBackground>
  );
}

// ✅ Extracted component for clean badge logic
function TabButton({ label, activeTab, setActiveTab, badgeCount }) {
  const isActive = activeTab.toLowerCase() === label.toLowerCase();

  return (
    <TouchableOpacity
      style={isActive ? BASE_STYLES.activeTab : BASE_STYLES.inactiveTab}
      onPress={() => setActiveTab(label.toLowerCase())}
    >
      <View style={styles.tabButtonContent}>
        <Text>{label}</Text>
        {badgeCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badgeCount}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  tabButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badge: {
    marginLeft: 6,
    backgroundColor: 'red',
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
});