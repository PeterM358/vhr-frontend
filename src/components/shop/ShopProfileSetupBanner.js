import React from 'react';
import { StyleSheet, View, Pressable } from 'react-native';
import { Text, ProgressBar } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { COLORS } from '../../constants/colors';
import { useTranslation } from '../../i18n';

/**
 * Compact, fully-pressable setup readiness banner for the partner dashboard.
 * Tapping anywhere on the card resumes the partner onboarding wizard.
 */
export default function ShopProfileSetupBanner({
  missingFields = [],
  percent = null,
  onCompletePress,
}) {
  const { t } = useTranslation();
  const showPercent = typeof percent === 'number' && percent >= 0;

  return (
    <Pressable
      onPress={onCompletePress}
      android_ripple={{ color: 'rgba(255,255,255,0.12)' }}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      accessibilityRole="button"
      accessibilityLabel={t('partnerDashboard.profileSetup.title')}
    >
      <View style={styles.row}>
        <View style={styles.iconWrap}>
          <MaterialCommunityIcons name="rocket-launch-outline" size={20} color={COLORS.PRIMARY} />
        </View>
        <View style={styles.body}>
          <Text style={styles.title} numberOfLines={2}>
            {t('partnerDashboard.profileSetup.title')}
          </Text>
          <Text style={styles.cta} numberOfLines={1}>
            {t('partnerDashboard.profileSetup.continueButton')}
          </Text>
        </View>
        {showPercent ? <Text style={styles.percent}>{percent}%</Text> : null}
        <MaterialCommunityIcons
          name="chevron-right"
          size={22}
          color="rgba(255,255,255,0.6)"
          style={styles.chevron}
        />
      </View>
      {showPercent ? (
        <ProgressBar
          progress={Math.max(0, Math.min(1, percent / 100))}
          color={COLORS.PRIMARY}
          style={styles.bar}
        />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.CARD_DARK,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.BORDER_SOFT,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.PRIMARY,
    gap: 8,
  },
  cardPressed: {
    opacity: 0.85,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(226,237,255,0.12)',
  },
  body: {
    flex: 1,
  },
  title: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 19,
  },
  cta: {
    color: COLORS.PRIMARY,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 1,
  },
  percent: {
    color: COLORS.PRIMARY,
    fontSize: 16,
    fontWeight: '800',
  },
  chevron: {
    marginLeft: 2,
  },
  bar: {
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
});
