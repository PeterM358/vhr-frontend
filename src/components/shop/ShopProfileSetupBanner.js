import React from 'react';
import { StyleSheet } from 'react-native';
import { Button, Text } from 'react-native-paper';
import AppCard from '../ui/AppCard';

export default function ShopProfileSetupBanner({ missingFields, onCompletePress }) {
  return (
    <AppCard variant="dark" contentStyle={styles.inner}>
      <Text style={styles.title}>
        Complete your service center profile to open repair requests from clients near you
      </Text>
      {missingFields.length > 0 ? (
        <Text style={styles.missing}>Still needed: {missingFields.join(', ')}</Text>
      ) : null}
      <Button
        mode="contained"
        icon="account-edit-outline"
        onPress={onCompletePress}
        style={styles.cta}
        contentStyle={styles.ctaContent}
        labelStyle={styles.ctaLabel}
      >
        Complete profile
      </Button>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  inner: {
    paddingVertical: 14,
    gap: 8,
  },
  title: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 21,
    marginBottom: 8,
  },
  missing: {
    color: '#fde68a',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 12,
  },
  cta: {
    alignSelf: 'stretch',
    borderRadius: 12,
  },
  ctaContent: {
    height: 44,
  },
  ctaLabel: {
    fontSize: 15,
    fontWeight: '700',
  },
});
