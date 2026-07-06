import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import AppCard from '../ui/AppCard';

export default function PartnerMarketComparisonCard({ onCompare }) {
  return (
    <AppCard style={styles.card}>
      <Text variant="titleMedium">Compare with mine</Text>
      <Text variant="bodyMedium" style={styles.body}>
        Market comparison is coming soon. You will see how your service center ranks against
        nearby competitors on services, ratings, and availability.
      </Text>
      <View style={styles.actions}>
        <Button mode="outlined" onPress={onCompare} disabled>
          Compare (soon)
        </Button>
      </View>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
  },
  body: {
    marginTop: 8,
    color: '#475569',
  },
  actions: {
    marginTop: 12,
    alignItems: 'flex-start',
  },
});
