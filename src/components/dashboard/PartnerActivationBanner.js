import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { useTranslation } from '../../i18n';

export default function PartnerActivationBanner({
  openRequestCount = 0,
  onActivatePress,
}) {
  const { t } = useTranslation();

  return (
    <View style={styles.banner}>
      <Text style={styles.title}>{t('partnerDashboard.activation.title')}</Text>
      <Text style={styles.body}>
        {openRequestCount > 0
          ? openRequestCount === 1
            ? t('partnerDashboard.activation.openRequestsBodyOne')
            : t('partnerDashboard.activation.openRequestsBodyMany', { count: openRequestCount })
          : t('partnerDashboard.activation.waitingBody')}
      </Text>
      <Text style={styles.hint}>{t('partnerDashboard.activation.hint')}</Text>
      <Button mode="contained" onPress={onActivatePress} style={styles.button}>
        {t('partnerDashboard.activation.activateButton')}
      </Button>
      <Button mode="text" onPress={onActivatePress} textColor="#bfdbfe" compact>
        {t('partnerDashboard.activation.subscribeButton')}
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: COLORS.PRIMARY_GLASS,
    borderColor: COLORS.ACCENT_SOFT,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 6,
  },
  body: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 20,
    marginBottom: 6,
  },
  hint: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.72)',
    lineHeight: 18,
    marginBottom: 12,
  },
  button: {
    borderRadius: 10,
    marginBottom: 4,
  },
});
