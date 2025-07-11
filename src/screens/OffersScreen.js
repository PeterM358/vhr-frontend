// PATH: src/screens/OffersScreen.js

import React, { useState, useContext } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Badge, useTheme } from 'react-native-paper';
import { WebSocketContext } from '../context/WebSocketManager';
import ClientPromotions from '../components/client/ClientPromotions';
import ClientRepairOffers from '../components/client/ClientRepairOffers';

export default function OffersScreen({ navigation }) {
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState('promotions');
  const { notifications } = useContext(WebSocketContext);

  const unseenPromotions = notifications.filter(n => !n.is_read && n.repair == null).length;
  const unseenOffers = notifications.filter(n => !n.is_read && n.repair != null).length;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>

      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 'promotions' && { backgroundColor: theme.colors.primary },
          ]}
          onPress={() => setActiveTab('promotions')}
        >
          <Text style={[
            styles.tabText,
            activeTab === 'promotions' && { color: 'white', fontWeight: 'bold' },
          ]}>
            Promotions
          </Text>
          {unseenPromotions > 0 && (
            <Badge style={styles.badge}>{unseenPromotions}</Badge>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 'offers' && { backgroundColor: theme.colors.primary },
          ]}
          onPress={() => setActiveTab('offers')}
        >
          <Text style={[
            styles.tabText,
            activeTab === 'offers' && { color: 'white', fontWeight: 'bold' },
          ]}>
            Repair Offers
          </Text>
          {unseenOffers > 0 && (
            <Badge style={styles.badge}>{unseenOffers}</Badge>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {activeTab === 'promotions' && <ClientPromotions navigation={navigation} />}
        {activeTab === 'offers' && <ClientRepairOffers navigation={navigation} />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  tabRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    marginHorizontal: 4,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  tabText: {
    fontSize: 16,
  },
  badge: {
    marginLeft: 8,
    backgroundColor: 'red',
    color: 'white',
  },
  content: {
    flex: 1,
  },
});