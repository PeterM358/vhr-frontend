import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import AppCard from '../ui/AppCard';
import { useTranslation } from '../../i18n';
import DISCOVERY_MOBILE, { discoveryMinFont } from '../serviceCenters/discoveryMobileTokens';

export default function PartnerMarketComparisonCard({ onCompare, compact = false }) {
  const { t } = useTranslation();

  if (compact) {
    return (
      <Pressable style={styles.banner} onPress={onCompare} disabled>
        <View style={styles.bannerIcon}>
          <MaterialCommunityIcons name="chart-bar" size={16} color={DISCOVERY_MOBILE.color.primary} />
        </View>
        <View style={styles.bannerBody}>
          <Text style={styles.bannerTitle}>{t('partnerDashboard.marketComparison.title')}</Text>
          <Text style={styles.bannerText} numberOfLines={2}>
            {t('partnerDashboard.marketComparison.body')}
          </Text>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={18} color={DISCOVERY_MOBILE.color.textSubtle} />
      </Pressable>
    );
  }

  return (
    <AppCard style={styles.card}>
      <Text variant="titleMedium">{t('partnerDashboard.marketComparison.title')}</Text>
      <Text variant="bodyMedium" style={styles.body}>
        {t('partnerDashboard.marketComparison.body')}
      </Text>
      <View style={styles.actions}>
        <Pressable style={styles.desktopBtn} onPress={onCompare} disabled>
          <Text style={styles.desktopBtnText}>{t('partnerDashboard.marketComparison.button')}</Text>
        </Pressable>
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
  desktopBtn: {
    borderWidth: 1,
    borderColor: DISCOVERY_MOBILE.color.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    opacity: 0.7,
  },
  desktopBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: DISCOVERY_MOBILE.radius.card,
    backgroundColor: 'rgba(15,76,129,0.06)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(15,76,129,0.14)',
    marginBottom: 8,
  },
  bannerIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(15,76,129,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerBody: {
    flex: 1,
    minWidth: 0,
  },
  bannerTitle: {
    fontSize: discoveryMinFont(13),
    fontWeight: '700',
    color: DISCOVERY_MOBILE.color.text,
    marginBottom: 2,
  },
  bannerText: {
    fontSize: discoveryMinFont(12),
    color: DISCOVERY_MOBILE.color.textMuted,
    lineHeight: 16,
  },
});
