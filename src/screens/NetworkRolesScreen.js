import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { ActivityIndicator, Button, Text } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import ScreenBackground from '../components/ScreenBackground';
import AppCard from '../components/ui/AppCard';
import AppNavigationBar from '../components/common/AppNavigationBar';
import { activateOrganizationRole, getMyOrganization, listOrganizationRoles } from '../api/network';
import { useTranslation } from '../i18n';

const ROLE_TYPES = ['SUPPLIER', 'MANUFACTURER', 'DISTRIBUTOR', 'FLEET_OPERATOR'];

export default function NetworkRolesScreen({ navigation }) {
  const { t } = useTranslation();
  const [org, setOrg] = useState(null);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const token = await AsyncStorage.getItem('@access_token');
      const orgData = await getMyOrganization(token);
      setOrg(orgData);
      const roleRows = await listOrganizationRoles(token, orgData.id);
      setRoles(roleRows);
    } catch (e) {
      setError(e.message || t('network.common.error'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const activate = async (roleType) => {
    try {
      const token = await AsyncStorage.getItem('@access_token');
      await activateOrganizationRole(token, org.id, roleType);
      await load();
    } catch (e) {
      setError(e.message || t('network.common.error'));
    }
  };

  return (
    <ScreenBackground>
      <AppNavigationBar title={t('network.roles.title')} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content}>
        {loading ? <ActivityIndicator /> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {roles.map((role) => (
          <AppCard key={role.id}>
            <Text variant="titleMedium">{t(`network.roles.types.${role.role_type}`, role.role_type)}</Text>
            <Text>{role.is_active ? t('network.common.active') : t('network.common.inactive')}</Text>
          </AppCard>
        ))}
        {ROLE_TYPES.map((roleType) => (
          <Button key={roleType} mode="outlined" onPress={() => activate(roleType)}>
            {t('network.roles.activate', { role: t(`network.roles.types.${roleType}`, roleType) })}
          </Button>
        ))}
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12 },
  error: { color: '#b00020' },
});
