import React, { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Button, Text, TextInput } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';

import ScreenBackground from '../components/ScreenBackground';
import AppNavigationBar from '../components/common/AppNavigationBar';
import { createNetworkClaim, getMyOrganization } from '../api/network';
import { useTranslation } from '../i18n';

export default function NetworkClaimCreateScreen({ navigation }) {
  const { t } = useTranslation();
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [repairId, setRepairId] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    setError('');
    try {
      const token = await AsyncStorage.getItem('@access_token');
      const org = await getMyOrganization(token);
      const claim = await createNetworkClaim(token, org.id, {
        subject,
        description,
        repair_id: repairId ? Number(repairId) : undefined,
      });
      navigation.replace('NetworkClaimDetail', { claimId: claim.id, claim });
    } catch (e) {
      setError(e.message || t('network.common.error'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenBackground>
      <AppNavigationBar title={t('network.claims.create')} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content}>
        <TextInput label={t('network.claims.subject')} value={subject} onChangeText={setSubject} mode="outlined" />
        <TextInput
          label={t('network.claims.description')}
          value={description}
          onChangeText={setDescription}
          mode="outlined"
          multiline
        />
        <TextInput
          label={t('network.claims.repairId')}
          value={repairId}
          onChangeText={setRepairId}
          mode="outlined"
          keyboardType="numeric"
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button mode="contained" onPress={submit} loading={saving} disabled={saving || !subject.trim()}>
          {t('network.claims.submit')}
        </Button>
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12 },
  error: { color: '#b00020' },
});
