// src/screens/RepairDetailLimitedScreen.js

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Text, Divider } from 'react-native-paper';

export default function LimitedRepairView({ repair }) {
  return (
    <View style={styles.container}>
      <Card mode="outlined" style={styles.card}>
        <Card.Title
          title={`Repair #${repair.id}`}
          subtitle="Limited View"
        />
        <Card.Content>
          <Divider style={{ marginVertical: 8 }} />
          <Text>Status: {repair.status}</Text>
          <Text>Type: {repair.repair_type}</Text>
          <Text>Vehicle: {repair.vehicle_make} {repair.vehicle_model}</Text>
          <Text style={styles.note}>
            You have limited access to this repair. You can still view your offers and messages if available.
          </Text>
        </Card.Content>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  card: {
    padding: 10,
  },
  note: {
    marginTop: 20,
    fontStyle: 'italic',
    color: 'gray',
  },
});