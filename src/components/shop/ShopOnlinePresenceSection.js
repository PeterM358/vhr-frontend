import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, TextInput, Button } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import { COLORS } from '../../constants/colors';
import { useTranslation } from '../../i18n';

function PresenceCard({
  icon,
  title,
  subtitle,
  connected = false,
  benefits = [],
  children,
  actionLabel,
  onAction,
  actionDisabled = false,
}) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.iconWrap}>
          <MaterialCommunityIcons name={icon} size={22} color={COLORS.PRIMARY} />
        </View>
        <View style={styles.cardCopy}>
          <Text style={styles.cardTitle}>{title}</Text>
          <Text style={styles.cardSubtitle}>{subtitle}</Text>
        </View>
        <View style={[styles.statusPill, connected && styles.statusPillOn]}>
          <Text style={[styles.statusText, connected && styles.statusTextOn]}>
            {connected ? 'Connected' : 'Not connected'}
          </Text>
        </View>
      </View>
      {benefits.length ? (
        <View style={styles.benefits}>
          {benefits.map((line) => (
            <View key={line} style={styles.benefitRow}>
              <MaterialCommunityIcons name="check" size={14} color={COLORS.PRIMARY} />
              <Text style={styles.benefitText}>{line}</Text>
            </View>
          ))}
        </View>
      ) : null}
      {children}
      {actionLabel ? (
        <Button
          mode="contained"
          onPress={onAction}
          disabled={actionDisabled}
          style={styles.actionBtn}
        >
          {actionLabel}
        </Button>
      ) : null}
    </View>
  );
}

/**
 * Online presence placeholders + existing social URL fields.
 */
export default function ShopOnlinePresenceSection({
  styles: parentStyles,
  profile,
  setProfile,
}) {
  const { t } = useTranslation();
  const inputStyle = parentStyles?.input;

  return (
    <View style={styles.wrap}>
      <Text style={parentStyles?.helperText || styles.fallbackHelper}>
        {t('partnerProfile.onlinePresenceHelper')}
      </Text>

      <PresenceCard
        icon="google"
        title={t('partnerProfile.googleBusinessTitle')}
        subtitle={t('partnerProfile.googleBusinessNotConnected')}
        connected={false}
        benefits={[
          t('partnerProfile.googleBenefitReviews'),
          t('partnerProfile.googleBenefitHours'),
          t('partnerProfile.googleBenefitDiscovery'),
        ]}
        actionLabel={t('partnerProfile.connectGoogle')}
        actionDisabled
        onAction={() => {}}
      />

      <TextInput
        label={t('partnerProfile.website')}
        mode="outlined"
        value={profile?.website || ''}
        onChangeText={(text) => setProfile((prev) => ({ ...prev, website: text }))}
        style={inputStyle}
        left={<TextInput.Icon icon="web" />}
      />
      <TextInput
        label="Facebook"
        mode="outlined"
        value={profile?.facebook_url || ''}
        onChangeText={(text) => setProfile((prev) => ({ ...prev, facebook_url: text }))}
        style={inputStyle}
        left={<TextInput.Icon icon="facebook" />}
      />
      <TextInput
        label="Instagram"
        mode="outlined"
        value={profile?.instagram_url || ''}
        onChangeText={(text) => setProfile((prev) => ({ ...prev, instagram_url: text }))}
        style={inputStyle}
        left={<TextInput.Icon icon="instagram" />}
      />
      <TextInput
        label="YouTube"
        mode="outlined"
        value={profile?.youtube_url || ''}
        onChangeText={(text) => setProfile((prev) => ({ ...prev, youtube_url: text }))}
        style={inputStyle}
        left={<TextInput.Icon icon="youtube" />}
      />

      <PresenceCard
        icon="music-note"
        title="TikTok"
        subtitle={t('partnerProfile.tiktokComingSoon')}
        connected={false}
        actionLabel={t('partnerProfile.comingSoon')}
        actionDisabled
        onAction={() => {}}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 10,
  },
  fallbackHelper: {
    color: COLORS.TEXT_MUTED,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 4,
  },
  card: {
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.1)',
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#f8fafc',
    gap: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(15,76,129,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardCopy: {
    flex: 1,
    gap: 2,
  },
  cardTitle: {
    color: COLORS.TEXT_DARK,
    fontWeight: '800',
    fontSize: 15,
  },
  cardSubtitle: {
    color: COLORS.TEXT_MUTED,
    fontSize: 12,
    lineHeight: 16,
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: '#e2e8f0',
  },
  statusPillOn: {
    backgroundColor: '#dcfce7',
  },
  statusText: {
    color: '#475569',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  statusTextOn: {
    color: '#166534',
  },
  benefits: {
    gap: 4,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  benefitText: {
    color: COLORS.TEXT_MUTED,
    fontSize: 12,
    flex: 1,
  },
  actionBtn: {
    alignSelf: 'flex-start',
  },
});
