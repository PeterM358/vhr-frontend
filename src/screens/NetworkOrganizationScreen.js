import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { ActivityIndicator, Button, Text } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import ScreenBackground from '../components/ScreenBackground';
import AppCard from '../components/ui/AppCard';
import AppNavigationBar from '../components/common/AppNavigationBar';
import useShopErpContext from '../hooks/useShopErpContext';
import { usePartnerDashboardBack } from '../navigation/appNavBarBack';
import { getMyOrganization } from '../api/network';
import { useTranslation } from '../i18n';

export default function NetworkOrganizationScreen({ navigation }) {
  const onBack = usePartnerDashboardBack(navigation);
  const { t } = useTranslation();
  const { shopId } = useShopErpContext();
  const [org, setOrg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!shopId) return;
    setLoading(true);
    setError('');
    try {
      const token = await AsyncStorage.getItem('@access_token');
      const data = await getMyOrganization(token);
      setOrg(data);
    } catch (e) {
      setOrg(null);
      setError(e.message || t('network.common.error'));
    } finally {
      setLoading(false);
    }
  }, [shopId, t]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <ScreenBackground>
      <AppNavigationBar title={t('network.organization.title')} onBack={onBack} />
      <ScrollView contentContainerStyle={styles.content}>
        {loading ? <ActivityIndicator /> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {org ? (
          <AppCard>
            <Text variant="titleMedium">{org.display_name}</Text>
            <Text>{org.organization_code}</Text>
            <Text>{org.legal_name}</Text>
            <Text>{org.vat_number || org.eik_number}</Text>
            <Text>{t('network.organization.status')}: {org.status}</Text>
          </AppCard>
        ) : null}
        <Button mode="contained" onPress={() => navigation.navigate('NetworkRoles')}>
          {t('network.roles.title')}
        </Button>
        <Button mode="outlined" onPress={() => navigation.navigate('NetworkPartners')}>
          {t('network.partners.title')}
        </Button>
        <Button mode="outlined" onPress={() => navigation.navigate('NetworkInvitePartner')}>
          {t('network.invite.title')}
        </Button>
        <Button mode="outlined" onPress={() => navigation.navigate('NetworkIncomingOrders')}>
          {t('network.incomingOrders.title')}
        </Button>
        <Button mode="outlined" onPress={() => navigation.navigate('NetworkProductMapping')}>
          {t('network.mapping.title')}
        </Button>
        <Button mode="outlined" onPress={() => navigation.navigate('NetworkPackaging')}>
          {t('network.packaging.title')}
        </Button>
        <Button mode="outlined" onPress={() => navigation.navigate('NetworkClaimsList')}>
          {t('network.claims.myClaims')}
        </Button>
        <Button mode="outlined" onPress={() => navigation.navigate('NetworkIncomingClaims')}>
          {t('network.claims.incoming')}
        </Button>
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12 },
  error: { color: '#b00020' },
});
