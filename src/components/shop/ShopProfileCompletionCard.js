import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, ProgressBar } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import AppCard from '../ui/AppCard';
import { COLORS } from '../../constants/colors';
import { useTranslation } from '../../i18n';

export default function ShopProfileCompletionCard({
  percent = 0,
  strengthHints = [],
  encourageText = null,
}) {
  const { t } = useTranslation();
  const complete = percent >= 100;

  return (
    <AppCard variant="dark" contentStyle={styles.inner}>
      <View style={styles.headerRow}>
        <MaterialCommunityIcons
          name={complete ? 'check-decagram' : 'progress-clock'}
          size={22}
          color={complete ? '#4ade80' : COLORS.PRIMARY}
        />
        <Text style={styles.title}>
          {complete ? t('partnerProfile.profileReady') : t('partnerProfile.profileCompletion')}
        </Text>
        <Text style={[styles.percent, complete && styles.percentComplete]}>{percent}%</Text>
      </View>
      <ProgressBar
        progress={percent / 100}
        color={complete ? '#4ade80' : COLORS.PRIMARY}
        style={styles.bar}
      />
      {!complete && encourageText ? (
        <Text style={styles.readyText}>{encourageText}</Text>
      ) : null}
      {complete ? (
        <Text style={styles.readyText}>
          {t('partnerProfile.profileReadyBody')}
          {strengthHints.length
            ? t('partnerProfile.profileReadyPolish', { hints: strengthHints.join(', ') })
            : t('partnerProfile.profileReadyAddMore')}
        </Text>
      ) : null}
    </AppCard>
  );
}

const styles = StyleSheet.create({
  inner: {
    gap: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    flex: 1,
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  percent: {
    color: COLORS.PRIMARY,
    fontWeight: '800',
    fontSize: 15,
  },
  percentComplete: {
    color: '#4ade80',
  },
  bar: {
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  readyText: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 13,
    lineHeight: 18,
  },
});
