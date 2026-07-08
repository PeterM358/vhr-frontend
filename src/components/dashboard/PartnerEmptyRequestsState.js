import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import FloatingCard from '../ui/FloatingCard';
import { COLORS } from '../../constants/colors';
import { useTranslation } from '../../i18n';

/** Partner empty state — explanatory copy only (no duplicate primary CTAs). */
export default function PartnerEmptyRequestsState() {
  const { t } = useTranslation();

  return (
    <FloatingCard accent={false}>
      <Text style={styles.title}>{t('partnerDashboard.emptyRequests.title')}</Text>
      <Text style={styles.body}>{t('partnerDashboard.emptyRequests.body')}</Text>
    </FloatingCard>
  );
}

const styles = StyleSheet.create({
  title: {
    textAlign: 'center',
    color: COLORS.TEXT_DARK,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  body: {
    textAlign: 'center',
    color: COLORS.TEXT_MUTED,
    fontSize: 13,
    lineHeight: 18,
  },
});
