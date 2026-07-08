import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import AppCard from '../ui/AppCard';
import { useTranslation } from '../../i18n';

export default function PartnerMarketComparisonCard({ onCompare }) {
  const { t } = useTranslation();

  return (
    <AppCard style={styles.card}>
      <Text variant="titleMedium">{t('partnerDashboard.marketComparison.title')}</Text>
      <Text variant="bodyMedium" style={styles.body}>
        {t('partnerDashboard.marketComparison.body')}
      </Text>
      <View style={styles.actions}>
        <Button mode="outlined" onPress={onCompare} disabled>
          {t('partnerDashboard.marketComparison.button')}
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
