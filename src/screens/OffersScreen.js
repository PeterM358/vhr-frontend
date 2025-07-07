// PATH: src/screens/OffersScreen.js

import React, { useState, useContext } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Badge, useTheme, SegmentedButtons, Button } from 'react-native-paper';
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

      <SegmentedButtons
        value={activeTab}
        onValueChange={setActiveTab}
        buttons={[
          {
            value: 'promotions',
            label: `Promotions${unseenPromotions ? ` (${unseenPromotions})` : ''}`,
          },
          {
            value: 'offers',
            label: `Repair Offers${unseenOffers ? ` (${unseenOffers})` : ''}`,
          },
        ]}
        style={styles.segmented}
      />

      <View style={styles.content}>
        {activeTab === 'promotions' && <ClientPromotions navigation={navigation} />}
        {activeTab === 'offers' && <ClientRepairOffers navigation={navigation} />}
      </View>

      <Button
        mode="outlined"
        icon="arrow-left"
        onPress={() => navigation.goBack()}
        style={styles.backButton}
      >
        Back
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    textAlign: 'center',
    marginBottom: 16,
  },
  segmented: {
    marginBottom: 16,
  },
  content: {
    flex: 1,
  },
  backButton: {
    marginTop: 16,
    alignSelf: 'center',
  },
});