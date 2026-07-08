import React from 'react';
import { StyleSheet } from 'react-native';
import { Button, Text } from 'react-native-paper';
import AppCard from '../ui/AppCard';
import { useTranslation } from '../../i18n';

export default function ShopProfileSetupBanner({ missingFields, onCompletePress }) {
  const { t } = useTranslation();

  return (
    <AppCard variant="dark" contentStyle={styles.inner}>
      <Text style={styles.title}>{t('partnerDashboard.profileSetup.title')}</Text>
      {missingFields.length > 0 ? (
        <Text style={styles.missing}>
          {t('partnerDashboard.profileSetup.missing', { fields: missingFields.join(', ') })}
        </Text>
      ) : null}
      <Button
        mode="contained"
        icon="account-edit-outline"
        onPress={onCompletePress}
        style={styles.cta}
        contentStyle={styles.ctaContent}
        labelStyle={styles.ctaLabel}
      >
        {t('partnerDashboard.profileSetup.completeButton')}
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
