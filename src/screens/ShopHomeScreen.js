import React, { useState, useEffect } from 'react';
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
import BASE_STYLES from '../styles/base';

export default function ShopHomeScreen() {
  const [activeTab, setActiveTab] = useState('repairs');
  const navigation = useNavigation();

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
          <TouchableOpacity
            style={activeTab === 'repairs' ? BASE_STYLES.activeTab : BASE_STYLES.inactiveTab}
            onPress={() => setActiveTab('repairs')}
          >
            <Text>Repairs</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={activeTab === 'clients' ? BASE_STYLES.activeTab : BASE_STYLES.inactiveTab}
            onPress={() => setActiveTab('clients')}
          >
            <Text>Clients</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={activeTab === 'promotions' ? BASE_STYLES.activeTab : BASE_STYLES.inactiveTab}
            onPress={() => setActiveTab('promotions')}
          >
            <Text>Promotions</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={BASE_STYLES.inactiveTab}
            onPress={() => navigation.navigate('ShopMap')}
          >
            <Text>Map</Text>
          </TouchableOpacity>
        </View>

        <View style={{ flex: 1 }}>
          {renderContent()}
        </View>
      </View>
    </ImageBackground>
  );
}