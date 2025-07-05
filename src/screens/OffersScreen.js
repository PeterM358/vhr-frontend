// PATH: src/screens/OffersScreen.js

import React, { useState, useContext } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { WebSocketContext } from '../context/WebSocketManager';
import ClientPromotions from '../components/client/ClientPromotions';
import ClientRepairOffers from '../components/client/ClientRepairOffers';
import BASE_STYLES from '../styles/base';
import CommonButton from '../components/CommonButton';

export default function OffersScreen({ navigation }) {
  const [activeTab, setActiveTab] = useState('promotions');
  const { notifications, markNotificationRead } = useContext(WebSocketContext);

  const unseenPromotions = notifications.filter(n => !n.is_read && n.repair == null).length;
  const unseenOffers = notifications.filter(n => !n.is_read && n.repair != null).length;

  const handleTabPress = (tab) => {
    setActiveTab(tab);
    // Optionally mark these as read
    // markNotificationReadForType(tab)
  };

  return (
    <View style={BASE_STYLES.overlay}>
      <Text style={BASE_STYLES.title}>Offers</Text>

      <View style={styles.tabBar}>
        <TouchableOpacity
          style={activeTab === 'promotions' ? BASE_STYLES.activeTab : BASE_STYLES.inactiveTab}
          onPress={() => handleTabPress('promotions')}
        >
          <View style={styles.tabButtonContent}>
            <Text>Promotions</Text>
            {unseenPromotions > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unseenPromotions}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={activeTab === 'offers' ? BASE_STYLES.activeTab : BASE_STYLES.inactiveTab}
          onPress={() => handleTabPress('offers')}
        >
          <View style={styles.tabButtonContent}>
            <Text>Repair Offers</Text>
            {unseenOffers > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unseenOffers}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </View>

      {activeTab === 'promotions' && <ClientPromotions navigation={navigation} />}
      {activeTab === 'offers' && <ClientRepairOffers navigation={navigation} />}

      <CommonButton title="Back" onPress={() => navigation.goBack()} />
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: 10,
  },
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