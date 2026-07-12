import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Button, Text, TextInput } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import ScreenBackground from '../components/ScreenBackground';
import AppCard from '../components/ui/AppCard';
import AppNavigationBar from '../components/common/AppNavigationBar';
import { getMyOrganization, getNetworkClaim, networkClaimAction } from '../api/network';
import { useTranslation } from '../i18n';

export default function NetworkClaimDetailScreen({ navigation, route }) {
  const { t } = useTranslation();
  const claimId = route.params?.claimId;
  const [claim, setClaim] = useState(route.params?.claim || null);
  const [response, setResponse] = useState('');
  const [evidenceDesc, setEvidenceDesc] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!claimId) return;
    try {
      const token = await AsyncStorage.getItem('@access_token');
      const org = await getMyOrganization(token);
      const data = await getNetworkClaim(token, org.id, claimId);
      setClaim(data);
    } catch (e) {
      setError(e.message || t('network.common.error'));
    }
  }, [claimId, t]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const act = async (action, payload = {}) => {
    setError('');
    try {
      const token = await AsyncStorage.getItem('@access_token');
      const org = await getMyOrganization(token);
      const updated = await networkClaimAction(token, org.id, claimId, action, payload);
      setClaim(updated);
    } catch (e) {
      setError(e.message || t('network.common.error'));
    }
  };

  if (!claim) {
    return (
      <ScreenBackground>
        <AppNavigationBar title={t('network.claims.detail')} onBack={() => navigation.goBack()} />
        <Text style={styles.content}>{t('network.common.empty')}</Text>
      </ScreenBackground>
    );
  }

  const payload = claim.hop_payload || {};
  const evidence = payload.evidence || [];

  return (
    <ScreenBackground>
      <AppNavigationBar title={t('network.claims.detail')} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content}>
        <AppCard>
          <Text variant="titleMedium">{payload.subject || claim.id}</Text>
          <Text>{payload.description || '—'}</Text>
          <Text>{t('network.claims.status')}: {t(`network.claims.statuses.${claim.status}`, claim.status)}</Text>
          <Text>{t('network.claims.hopRole')}: {t(`network.claims.roles.${claim.current_hop_role}`, claim.current_hop_role)}</Text>
          {payload.response ? <Text>{t('network.claims.response')}: {payload.response}</Text> : null}
        </AppCard>

        {evidence.length ? (
          <AppCard>
            <Text variant="titleMedium">{t('network.claims.evidence')}</Text>
            {evidence.map((item, idx) => (
              <Text key={`ev-${idx}`}>{item.description || item.filename || `#${idx + 1}`}</Text>
            ))}
          </AppCard>
        ) : null}

        {claim.is_originator ? (
          <>
            <Button mode="contained" onPress={() => act('forward')}>{t('network.claims.forward')}</Button>
            <Button mode="outlined" onPress={() => act('resolve')}>{t('network.claims.resolve')}</Button>
            <Button mode="outlined" onPress={() => act('close')}>{t('network.claims.close')}</Button>
          </>
        ) : null}

        {claim.is_current_hop ? (
          <>
            <TextInput
              label={t('network.claims.response')}
              value={response}
              onChangeText={setResponse}
              mode="outlined"
              multiline
            />
            <Button mode="contained" onPress={() => act('respond', { response })}>{t('network.claims.respond')}</Button>
            <Button mode="outlined" onPress={() => act('accept')}>{t('network.claims.accept')}</Button>
            <Button mode="outlined" onPress={() => act('reject', { reason: response })}>{t('network.claims.reject')}</Button>
            <Button mode="outlined" onPress={() => act('forward')}>{t('network.claims.forward')}</Button>
          </>
        ) : null}

        <TextInput
          label={t('network.claims.evidenceDescription')}
          value={evidenceDesc}
          onChangeText={setEvidenceDesc}
          mode="outlined"
        />
        <Button
          mode="outlined"
          onPress={() => act('evidence', { description: evidenceDesc })}
          disabled={!evidenceDesc.trim()}
        >
          {t('network.claims.uploadEvidence')}
        </Button>

        {error ? <Text style={styles.error}>{error}</Text> : null}
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12 },
  error: { color: '#b00020' },
});
