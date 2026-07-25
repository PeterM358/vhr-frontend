import React, { useCallback, useState } from 'react';
import { Alert, Platform, ScrollView, Share, StyleSheet } from 'react-native';
import { ActivityIndicator, Button, Text, TextInput } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import ScreenBackground from '../components/ScreenBackground';
import AppCard from '../components/ui/AppCard';
import AppNavigationBar from '../components/common/AppNavigationBar';
import useShopErpContext from '../hooks/useShopErpContext';
import { usePartnerDashboardBack } from '../navigation/appNavBarBack';
import { createOrganizationMembershipInvite, getMyOrganization } from '../api/network';
import { useTranslation } from '../i18n';

async function copyInviteLink(text) {
  if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
    await navigator.clipboard.writeText(text);
    return;
  }
  await Share.share({ message: text });
}

export default function NetworkOrganizationScreen({ navigation }) {
  const onBack = usePartnerDashboardBack(navigation);
  const { t } = useTranslation();
  const { shopId } = useShopErpContext();
  const [org, setOrg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('transport');
  const [inviteBusy, setInviteBusy] = useState(false);
  const [inviteLink, setInviteLink] = useState('');
  const [inviteMessage, setInviteMessage] = useState('');

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

  const createInvite = async () => {
    if (!org?.id || !inviteEmail.trim()) return;
    setInviteBusy(true);
    setInviteMessage('');
    setInviteLink('');
    setError('');
    try {
      const token = await AsyncStorage.getItem('@access_token');
      const result = await createOrganizationMembershipInvite(token, org.id, {
        email: inviteEmail.trim().toLowerCase(),
        role: inviteRole,
      });
      setInviteLink(result.invite_url || '');
      setInviteMessage(t('network.membershipInvite.created'));
      setInviteEmail('');
    } catch (e) {
      setError(e.message || t('network.common.error'));
    } finally {
      setInviteBusy(false);
    }
  };

  const handleCopyLink = async () => {
    if (!inviteLink) return;
    try {
      await copyInviteLink(inviteLink);
      setInviteMessage(t('network.membershipInvite.copied'));
    } catch (e) {
      setError(e.message || t('network.common.error'));
    }
  };

  const handleShareLink = async () => {
    if (!inviteLink) return;
    try {
      if (Platform.OS === 'web') {
        await copyInviteLink(inviteLink);
        setInviteMessage(t('network.membershipInvite.copied'));
        return;
      }
      await Share.share({ message: inviteLink });
    } catch (e) {
      if (Platform.OS !== 'web') {
        Alert.alert(t('network.common.error'), e.message || t('network.common.error'));
      }
    }
  };

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
        {org ? (
          <AppCard>
            <Text variant="titleMedium">{t('network.membershipInvite.title')}</Text>
            <TextInput
              label={t('network.membershipInvite.email')}
              value={inviteEmail}
              onChangeText={setInviteEmail}
              mode="outlined"
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <TextInput
              label={t('network.membershipInvite.role')}
              value={inviteRole}
              onChangeText={setInviteRole}
              mode="outlined"
              autoCapitalize="none"
            />
            <Button mode="contained" loading={inviteBusy} disabled={inviteBusy} onPress={createInvite}>
              {t('network.membershipInvite.send')}
            </Button>
            {inviteLink ? (
              <>
                <Text style={styles.helper}>{t('network.membershipInvite.linkReady')}</Text>
                <Text selectable style={styles.link}>{inviteLink}</Text>
                <Button mode="outlined" onPress={handleCopyLink}>{t('network.membershipInvite.copyLink')}</Button>
                <Button mode="outlined" onPress={handleShareLink}>{t('network.membershipInvite.shareLink')}</Button>
              </>
            ) : null}
            {inviteMessage ? <Text style={styles.success}>{inviteMessage}</Text> : null}
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
        <Button mode="contained" onPress={() => navigation.navigate('FleetDashboard', { organizationId: org?.id })}>
          {t('fleet.openFleet')}
        </Button>
        <Button mode="outlined" onPress={() => navigation.navigate('FleetRegisterImport')}>
          {t('fleetImport.openAction')}
        </Button>
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12 },
  error: { color: '#b00020' },
  success: { color: '#1b5e20' },
  helper: { color: '#555', marginTop: 8 },
  link: { fontSize: 12, marginVertical: 8 },
});
