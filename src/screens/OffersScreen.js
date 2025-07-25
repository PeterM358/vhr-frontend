import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme, Text, Badge } from 'react-native-paper';
import ClientPromotions from '../components/client/ClientPromotions';
import ClientRepairOffers from '../components/client/ClientRepairOffers';

export default function OffersScreen({ navigation }) {
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState('promotions');
  const [unseenCount, setUnseenCount] = useState(0);
  const [unseenOffersCount, setUnseenOffersCount] = useState(0);

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
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={[
              styles.tabText,
              activeTab === 'promotions' && { color: 'white', fontWeight: 'bold' },
            ]}>
              Promotions
            </Text>
            {/* Always show badge if unseenCount > 0 for testing */}
            {unseenCount > 0 && (
              <Badge style={[
                styles.badge,
                { backgroundColor: 'red' }
              ]}>
                {unseenCount}
              </Badge>
            )}
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 'offers' && { backgroundColor: theme.colors.primary },
          ]}
          onPress={() => setActiveTab('offers')}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={[
              styles.tabText,
              activeTab === 'offers' && { color: 'white', fontWeight: 'bold' },
            ]}>
              Repair Offers
            </Text>
            {unseenOffersCount > 0 && (
              <Badge style={[styles.badge, { backgroundColor: 'red' }]}>
                {unseenOffersCount}
              </Badge>
            )}
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={[styles.tabContent, activeTab === 'promotions' ? styles.active : styles.inactive]}>
          <ClientPromotions
            navigation={navigation}
            onUpdateUnseenCount={(unseenCount) => {
              console.log('📤 Unseen promotions count sent to OffersScreen:', unseenCount);
              setUnseenCount(unseenCount);
            }}
          />
        </View>
        <View style={[styles.tabContent, activeTab === 'offers' ? styles.active : styles.inactive]}>
          <ClientRepairOffers
            navigation={navigation}
            onUpdateUnseenOffersCount={(unseenCount) => {
              console.log('📤 Unseen offers count sent to OffersScreen:', unseenCount);
              setUnseenOffersCount(unseenCount);
            }}
          />
        </View>
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
    color: 'white',
  },
  content: {
    flex: 1,
  },
  tabContent: {
    flex: 1,
  },
  active: {
    display: 'flex',
  },
  inactive: {
    display: 'none',
  },
});