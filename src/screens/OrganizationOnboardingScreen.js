import React, { useContext, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityIndicator, Button, Text, TextInput } from 'react-native-paper';

import ScreenBackground from '../components/ScreenBackground';
import DashboardCard from '../components/dashboard/DashboardCard';
import AuthLanguageSelector from '../components/auth/AuthLanguageSelector';
import { AuthContext } from '../context/AuthManager';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { createOrganizationOnboarding } from '../api/organizationWorkspace';
import { useTranslation } from '../i18n';
import { buildShopAuthReset } from '../utils/shopAuthNavigation';
import {
  refreshOrganizationMemberships,
  setCurrentOrganizationId,
} from '../utils/orgWorkspace';
import { COLORS } from '../constants/colors';
import BaseStyles from '../styles/base';

const BUSINESS_TYPES = ['transport', 'construction', 'service_center', 'other'];

export default function OrganizationOnboardingScreen({ navigation }) {
  const { t } = useTranslation();
  const { authToken } = useContext(AuthContext);
  const [companyName, setCompanyName] = useState('');
  const [businessType, setBusinessType] = useState('other');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [emailVerified, setEmailVerified] = useState(true);

  const typeLabels = useMemo(
    () => ({
      transport: t('org.onboarding.types.transport', null, 'Transport company'),
      construction: t('org.onboarding.types.construction', null, 'Construction'),
      service_center: t('org.onboarding.types.serviceCenter', null, 'Service center'),
      other: t('org.onboarding.types.other', null, 'Other business'),
    }),
    [t],
  );

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEYS.EMAIL_VERIFIED).then((raw) => {
      setEmailVerified(String(raw || '').trim().toLowerCase() === 'true');
    });
  }, [authToken]);

  const finishToOrgHome = async (org) => {
    await setCurrentOrganizationId(org.id);
    await AsyncStorage.removeItem(STORAGE_KEYS.SIGNUP_ACCOUNT_KIND);
    navigation.reset(buildShopAuthReset({ name: 'OrgHome' }));
  };

  const handleCreate = async () => {
    const name = companyName.trim();
    if (!name) {
      setError(t('org.onboarding.nameRequired', null, 'Enter your company name.'));
      return;
    }
    setSaving(true);
    setError('');
    try {
      const token = authToken || (await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN));
      const org = await createOrganizationOnboarding(token, {
        display_name: name,
        business_type: businessType,
        country_iso2: 'BG',
      });
      await refreshOrganizationMemberships(token);
      await finishToOrgHome(org);
    } catch (err) {
      setError(err?.message || t('org.onboarding.failed', null, 'Could not create organization.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenBackground safeArea={false}>
      <ScrollView contentContainerStyle={styles.container}>
        <AuthLanguageSelector />
        <DashboardCard style={styles.card}>
          <Text style={styles.title}>{t('org.onboarding.title', null, 'Create your organization')}</Text>
          <Text style={styles.subtitle}>
            {t(
              'org.onboarding.subtitle',
              null,
              'Set up your company workspace. You can import a fleet later when you are ready.',
            )}
          </Text>

          {!emailVerified ? (
            <Text style={styles.verifyNotice}>
              {t(
                'org.onboarding.verifyEmailFirst',
                null,
                'Verify your email before creating the organization. Check your inbox for the confirmation link.',
              )}
            </Text>
          ) : null}

          <TextInput
            label={t('org.onboarding.companyName', null, 'Company name')}
            mode="outlined"
            value={companyName}
            onChangeText={setCompanyName}
            style={styles.input}
          />

          <Text style={styles.sectionLabel}>
            {t('org.onboarding.businessType', null, 'Business type')}
          </Text>
          <View style={styles.typeGrid}>
            {BUSINESS_TYPES.map((type) => (
              <Pressable
                key={type}
                onPress={() => setBusinessType(type)}
                style={({ pressed }) => [
                  styles.typeButton,
                  businessType === type && styles.typeButtonSelected,
                  pressed && styles.typeButtonPressed,
                ]}
              >
                <Text
                  style={[
                    styles.typeLabel,
                    businessType === type && styles.typeLabelSelected,
                  ]}
                >
                  {typeLabels[type]}
                </Text>
              </Pressable>
            ))}
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          {saving ? (
            <ActivityIndicator animating style={styles.spinner} />
          ) : (
            <Button
              mode="contained"
              onPress={handleCreate}
              disabled={!emailVerified}
              style={[BaseStyles.loginButton, styles.submit]}
              buttonColor={COLORS.PRIMARY}
              textColor={COLORS.ON_PRIMARY}
            >
              {t('org.onboarding.create', null, 'Create organization')}
            </Button>
          )}
        </DashboardCard>
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingTop: 24,
    alignItems: 'center',
  },
  card: {
    width: '100%',
    maxWidth: 520,
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.TEXT_DARK,
    marginBottom: 8,
  },
  subtitle: {
    color: COLORS.TEXT_MUTED,
    lineHeight: 20,
    marginBottom: 16,
  },
  input: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontWeight: '600',
    color: COLORS.TEXT_DARK,
    marginBottom: 8,
  },
  typeGrid: {
    gap: 8,
    marginBottom: 16,
  },
  typeButton: {
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.45)',
    borderRadius: 10,
    padding: 12,
  },
  typeButtonSelected: {
    borderColor: COLORS.PRIMARY,
    backgroundColor: 'rgba(37,99,235,0.08)',
  },
  typeButtonPressed: {
    opacity: 0.85,
  },
  typeLabel: {
    color: COLORS.TEXT_DARK,
    fontWeight: '500',
  },
  typeLabelSelected: {
    color: COLORS.PRIMARY,
  },
  error: {
    color: '#b91c1c',
    marginBottom: 12,
  },
  verifyNotice: {
    color: '#b45309',
    marginBottom: 12,
    lineHeight: 20,
  },
  spinner: {
    marginVertical: 12,
  },
  submit: {
    marginTop: 4,
  },
});
