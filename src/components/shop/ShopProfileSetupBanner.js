import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Text, ProgressBar } from 'react-native-paper';
import AppCard from '../ui/AppCard';
import { COLORS } from '../../constants/colors';
import { useTranslation } from '../../i18n';

export default function ShopProfileSetupBanner({
  missingFields = [],
  percent = null,
  onCompletePress,
}) {
  const { t } = useTranslation();
  const showPercent = typeof percent === 'number' && percent >= 0;

  return (
    <AppCard variant="dark" contentStyle={styles.inner}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>{t('partnerDashboard.profileSetup.title')}</Text>
        {showPercent ? <Text style={styles.percent}>{percent}%</Text> : null}
      </View>
      {showPercent ? (
        <ProgressBar
          progress={Math.max(0, Math.min(1, percent / 100))}
          color={COLORS.PRIMARY}
          style={styles.bar}
        />
      ) : null}
      {missingFields.length > 0 ? (
        <Text style={styles.missing}>
          {t('partnerDashboard.profileSetup.missing', { fields: missingFields.join(', ') })}
        </Text>
      ) : null}
      <Button
        mode="contained"
        icon="rocket-launch-outline"
        onPress={onCompletePress}
        style={styles.cta}
        contentStyle={styles.ctaContent}
        labelStyle={styles.ctaLabel}
      >
        {t('partnerDashboard.profileSetup.continueButton')}
      </Button>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  inner: {
    paddingVertical: 14,
    gap: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  title: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 21,
    flex: 1,
  },
  percent: {
    color: COLORS.PRIMARY,
    fontSize: 15,
    fontWeight: '800',
  },
  bar: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginTop: 4,
    marginBottom: 4,
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
