import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, Text } from 'react-native-paper';

import ScreenBackground from '../ScreenBackground';
import AppNavigationBar from '../common/AppNavigationBar';
import AppCard from '../ui/AppCard';
import { useTranslation } from '../../i18n';
import { getPartnerRouteDeniedReason } from '../../utils/shopErpAccess';

export default function ErpAccessGate({
  routeName,
  shopProfile,
  membership,
  loading,
  error,
  onBack,
  title,
  children,
}) {
  const { t } = useTranslation();

  if (loading) {
    return (
      <ScreenBackground>
        <AppNavigationBar title={title} onBack={onBack} />
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      </ScreenBackground>
    );
  }

  if (error) {
    return (
      <ScreenBackground>
        <AppNavigationBar title={title} onBack={onBack} />
        <View style={styles.body}>
          <AppCard>
            <Text style={styles.error}>{error}</Text>
          </AppCard>
        </View>
      </ScreenBackground>
    );
  }

  const deniedReason = getPartnerRouteDeniedReason(routeName, { profile: shopProfile, membership });
  if (deniedReason) {
    const isCapability = deniedReason === 'capability';
    return (
      <ScreenBackground>
        <AppNavigationBar title={title} onBack={onBack} />
        <View style={styles.body}>
          <AppCard>
            <Text variant="titleMedium">
              {isCapability ? t('erp.access.capabilityDisabledTitle') : t('erp.access.permissionDeniedTitle')}
            </Text>
            <Text style={styles.muted}>
              {isCapability ? t('erp.access.capabilityDisabledBody') : t('erp.access.permissionDeniedBody')}
            </Text>
          </AppCard>
        </View>
      </ScreenBackground>
    );
  }

  return children;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  body: { padding: 16 },
  error: { color: '#b00020' },
  muted: { marginTop: 8, color: '#64748b' },
});
