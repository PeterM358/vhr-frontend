import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, Text } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';

import ScreenBackground from '../ScreenBackground';
import AppNavigationBar from '../common/AppNavigationBar';
import AppCard from '../ui/AppCard';
import { useTranslation } from '../../i18n';
import { getPartnerRouteDeniedReason } from '../../utils/shopErpAccess';
import { FEATURES, upgradeNavigationParams } from '../../utils/partnerEntitlements';

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
  const navigation = useNavigation();

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
    if (deniedReason === 'subscription') {
      return (
        <ScreenBackground>
          <AppNavigationBar title={title} onBack={onBack} />
          <View style={styles.body}>
            <AppCard>
              <Text variant="titleMedium">{t('subscription.upgradeTitle')}</Text>
              <Text style={styles.muted}>{t('subscription.upgradeSubtitle')}</Text>
              <Button
                mode="contained"
                style={{ marginTop: 16 }}
                onPress={() =>
                  navigation.navigate(
                    'ShopSubscriptionUpgrade',
                    upgradeNavigationParams({ featureKey: FEATURES.ERP })
                  )
                }
              >
                {t('subscription.upgradeCta')}
              </Button>
            </AppCard>
          </View>
        </ScreenBackground>
      );
    }
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
