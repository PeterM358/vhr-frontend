import React, { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Button, Text, TextInput } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';

import ScreenBackground from '../components/ScreenBackground';
import AppNavigationBar from '../components/common/AppNavigationBar';
import { createBusinessInvitation, getMyOrganization } from '../api/network';
import { useTranslation } from '../i18n';

export default function NetworkInvitePartnerScreen({ navigation }) {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [vatNumber, setVatNumber] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const submit = async () => {
    setError('');
    setSuccess('');
    try {
      const token = await AsyncStorage.getItem('@access_token');
      const org = await getMyOrganization(token);
      await createBusinessInvitation(token, org.id, {
        invitee_email: email,
        invitee_company_name: companyName,
        invitee_vat_number: vatNumber,
        invitee_country_id: org.country_id,
        relationship_type: 'SUPPLIES',
      });
      setSuccess(t('network.invite.sent'));
      setEmail('');
      setCompanyName('');
      setVatNumber('');
    } catch (e) {
      setError(e.message || t('network.common.error'));
    }
  };

  return (
    <ScreenBackground>
      <AppNavigationBar title={t('network.invite.title')} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content}>
        <TextInput label={t('network.invite.email')} value={email} onChangeText={setEmail} mode="outlined" />
        <TextInput label={t('network.invite.companyName')} value={companyName} onChangeText={setCompanyName} mode="outlined" />
        <TextInput label={t('network.invite.vatNumber')} value={vatNumber} onChangeText={setVatNumber} mode="outlined" />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {success ? <Text style={styles.success}>{success}</Text> : null}
        <Button mode="contained" onPress={submit}>{t('network.invite.send')}</Button>
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12 },
  error: { color: '#b00020' },
  success: { color: '#1b5e20' },
});
