import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AppState, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { ActivityIndicator, Button, Text, TextInput, useTheme } from 'react-native-paper';

import ScreenBackground from '../components/ScreenBackground';
import DashboardCard from '../components/dashboard/DashboardCard';
import AuthLanguageSelector from '../components/auth/AuthLanguageSelector';
import { AuthContext } from '../context/AuthManager';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { createOrganizationOnboarding } from '../api/organizationWorkspace';
import { fetchAuthSession, logout, resendEmailVerification } from '../api/auth';
import { useTranslation } from '../i18n';
import { buildShopAuthReset } from '../utils/shopAuthNavigation';
import {
  refreshOrganizationMemberships,
  setCurrentOrganizationId,
} from '../utils/orgWorkspace';
import { COLORS } from '../constants/colors';
import BaseStyles from '../styles/base';

const ACTIVITY_OPTIONS = ['transport', 'construction', 'service_center', 'other'];

export default function OrganizationOnboardingScreen({ navigation }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const { authToken, setAuthToken, setIsAuthenticated, setUserEmailOrPhone, userEmailOrPhone } =
    useContext(AuthContext);
  const [companyName, setCompanyName] = useState('');
  const [selectedActivities, setSelectedActivities] = useState(['other']);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [emailVerified, setEmailVerified] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);

  const authInputTheme = useMemo(
    () => ({
      ...theme,
      colors: {
        ...theme.colors,
        primary: COLORS.ACCENT,
        background: '#07111f',
        placeholder: 'rgba(226,232,240,0.65)',
        text: '#ffffff',
        onSurfaceVariant: 'rgba(226,232,240,0.75)',
      },
    }),
    [theme],
  );

  const typeLabels = useMemo(
    () => ({
      transport: t('org.onboarding.types.transport', null, 'Transport'),
      construction: t('org.onboarding.types.construction', null, 'Construction'),
      service_center: t('org.onboarding.types.serviceCenter', null, 'Service center'),
      other: t('org.onboarding.types.other', null, 'Other'),
    }),
    [t],
  );

  const typeHints = useMemo(
    () => ({
      transport: t(
        'org.onboarding.typeHints.transport',
        null,
        'Fleet & jobs; request repairs from service centers',
      ),
      construction: t(
        'org.onboarding.typeHints.construction',
        null,
        'Sites & fleet; request repairs from service centers',
      ),
      service_center: t(
        'org.onboarding.typeHints.serviceCenter',
        null,
        'Provide service; appear on the map and public listing',
      ),
      other: t(
        'org.onboarding.typeHints.other',
        null,
        'Company that needs service from service centers',
      ),
    }),
    [t],
  );

  const wantsServiceCenter = selectedActivities.includes('service_center');

  const toggleActivity = (type) => {
    setSelectedActivities((prev) => {
      if (prev.includes(type)) {
        if (prev.length <= 1) return prev;
        return prev.filter((item) => item !== type);
      }
      return [...prev, type];
    });
  };

  const syncEmailVerified = useCallback(async () => {
    setRefreshing(true);
    setError('');
    try {
      const token = authToken || (await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN));
      if (!token) {
        setEmailVerified(false);
        setSessionChecked(true);
        return false;
      }
      const session = await fetchAuthSession(token);
      const verified = Boolean(session?.email_verified);
      setEmailVerified(verified);
      await AsyncStorage.setItem(STORAGE_KEYS.EMAIL_VERIFIED, verified ? 'true' : 'false');
      if (verified) {
        setInfo(
          t(
            'org.onboarding.emailVerifiedReady',
            null,
            'Email verified. You can create your organization.',
          ),
        );
      }
      return verified;
    } catch {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.EMAIL_VERIFIED);
      const verified = String(stored || '').trim().toLowerCase() === 'true';
      setEmailVerified(verified);
      return verified;
    } finally {
      setSessionChecked(true);
      setRefreshing(false);
    }
  }, [authToken, t]);

  useFocusEffect(
    useCallback(() => {
      syncEmailVerified();
    }, [syncEmailVerified]),
  );

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        syncEmailVerified();
      }
    });
    return () => sub.remove();
  }, [syncEmailVerified]);

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
    setInfo('');
    try {
      const verified = await syncEmailVerified();
      if (!verified) {
        setError(
          t(
            'org.onboarding.verifyEmailFirst',
            null,
            'Verify your email before creating the organization. Check your inbox for the confirmation link.',
          ),
        );
        return;
      }
      const token = authToken || (await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN));
      const org = await createOrganizationOnboarding(token, {
        display_name: name,
        activities: selectedActivities,
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

  const handleResend = async () => {
    setResending(true);
    setError('');
    setInfo('');
    try {
      const email =
        (userEmailOrPhone && String(userEmailOrPhone).includes('@')
          ? String(userEmailOrPhone).trim()
          : null) ||
        (await AsyncStorage.getItem('@login_email')) ||
        (await AsyncStorage.getItem('@user_email_or_phone'));
      if (!email || !String(email).includes('@')) {
        setError(
          t(
            'org.onboarding.resendNeedsEmail',
            null,
            'Could not find your email to resend verification.',
          ),
        );
        return;
      }
      await resendEmailVerification(email);
      setInfo(
        t(
          'org.onboarding.verificationSent',
          null,
          'Verification email sent. Open the link, then tap Refresh status here.',
        ),
      );
    } catch (err) {
      setError(err?.message || t('org.onboarding.resendFailed', null, 'Could not resend email.'));
    } finally {
      setResending(false);
    }
  };

  const handleLogout = async () => {
    await logout(navigation, setAuthToken, setIsAuthenticated, setUserEmailOrPhone);
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
              'Company name and at least one activity are enough. You can change this later in Activities / settings.',
            )}
          </Text>

          {sessionChecked && !emailVerified ? (
            <Text style={styles.verifyNotice}>
              {t(
                'org.onboarding.verifyEmailFirst',
                null,
                'Verify your email before creating the organization. Check your inbox for the confirmation link.',
              )}
            </Text>
          ) : null}
          {sessionChecked && !emailVerified ? (
            <Text style={styles.verifyHint}>
              {t(
                'org.onboarding.verifyOtherDeviceHint',
                null,
                'If you confirmed on another device (phone), tap Refresh status here — this browser does not update automatically.',
              )}
            </Text>
          ) : null}

          <TextInput
            label={t('org.onboarding.companyName', null, 'Company name')}
            mode="outlined"
            value={companyName}
            onChangeText={setCompanyName}
            style={styles.input}
            theme={authInputTheme}
            textColor="#ffffff"
            outlineColor="rgba(148,163,184,0.45)"
            activeOutlineColor={COLORS.ACCENT}
          />

          <Text style={styles.sectionLabel}>
            {t('org.onboarding.activities', null, 'What does your company do?')}
          </Text>
          <Text style={styles.activitiesHint}>
            {t(
              'org.onboarding.activitiesHint',
              null,
              'Select at least one. Legal details and public listing can wait — change this later in Activities / settings.',
            )}
          </Text>
          <View style={styles.typeGrid}>
            {ACTIVITY_OPTIONS.map((type) => {
              const isOn = selectedActivities.includes(type);
              return (
                <Pressable
                  key={type}
                  onPress={() => toggleActivity(type)}
                  style={({ pressed }) => [
                    styles.typeButton,
                    isOn && styles.typeButtonSelected,
                    pressed && styles.typeButtonPressed,
                  ]}
                >
                  <Text style={[styles.checkMark, isOn && styles.checkMarkSelected]}>
                    {isOn ? '☑' : '☐'}
                  </Text>
                  <View style={styles.typeTextCol}>
                    <Text
                      style={[
                        styles.typeLabel,
                        isOn && styles.typeLabelSelected,
                      ]}
                    >
                      {typeLabels[type]}
                    </Text>
                    <Text style={[styles.typeHint, isOn && styles.typeHintSelected]}>
                      {typeHints[type]}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
          {wantsServiceCenter ? (
            <Text style={styles.serviceCenterTip}>
              {t(
                'org.onboarding.serviceCenterTip',
                null,
                'Service centers get a public listing automatically. You can review or turn it off later in Public profile.',
              )}
            </Text>
          ) : null}

          {error ? <Text style={styles.error}>{error}</Text> : null}
          {info ? <Text style={styles.info}>{info}</Text> : null}

          {saving || refreshing ? (
            <ActivityIndicator animating style={styles.spinner} color={COLORS.ACCENT} />
          ) : (
            <Button
              mode="contained"
              onPress={handleCreate}
              disabled={!emailVerified}
              style={[BaseStyles.loginButton, styles.submit]}
              contentStyle={BaseStyles.loginButtonContent}
              labelStyle={BaseStyles.loginButtonLabel}
              buttonColor={COLORS.PRIMARY}
              textColor={COLORS.ON_PRIMARY}
            >
              {t('org.onboarding.create', null, 'Create organization')}
            </Button>
          )}

          {!emailVerified ? (
            <Button
              mode="outlined"
              onPress={syncEmailVerified}
              disabled={refreshing}
              style={styles.secondaryBtn}
              textColor="#ffffff"
            >
              {t('org.onboarding.refreshStatus', null, 'Refresh status')}
            </Button>
          ) : null}

          {!emailVerified ? (
            <Button
              mode="text"
              onPress={handleResend}
              disabled={resending}
              loading={resending}
              textColor={COLORS.ACCENT}
              style={styles.secondaryBtn}
            >
              {t('org.onboarding.resendEmail', null, 'Resend verification email')}
            </Button>
          ) : null}

          <Button mode="text" onPress={handleLogout} textColor={COLORS.ACCENT} style={styles.secondaryBtn}>
            {t('common.logout', null, 'Log out')}
          </Button>
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
    color: '#ffffff',
    marginBottom: 8,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.78)',
    lineHeight: 20,
    marginBottom: 16,
  },
  input: {
    marginBottom: 16,
    backgroundColor: '#07111f',
    borderRadius: 14,
  },
  sectionLabel: {
    fontWeight: '600',
    color: 'rgba(255,255,255,0.92)',
    marginBottom: 8,
  },
  typeGrid: {
    gap: 8,
    marginBottom: 16,
  },
  typeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(148,163,184,0.45)',
    borderRadius: 14,
    padding: 14,
    backgroundColor: 'rgba(5,15,30,0.55)',
  },
  typeButtonSelected: {
    borderColor: COLORS.PRIMARY,
    backgroundColor: 'rgba(15,76,129,0.35)',
  },
  typeButtonPressed: {
    opacity: 0.88,
  },
  checkMark: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 18,
    width: 22,
  },
  checkMarkSelected: {
    color: '#ffffff',
  },
  typeTextCol: {
    flex: 1,
    gap: 2,
  },
  typeLabel: {
    color: 'rgba(255,255,255,0.82)',
    fontWeight: '600',
    fontSize: 16,
  },
  typeLabelSelected: {
    color: '#ffffff',
    fontWeight: '700',
  },
  typeHint: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 12,
    lineHeight: 16,
  },
  typeHintSelected: {
    color: 'rgba(255,255,255,0.72)',
  },
  activitiesHint: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 10,
  },
  serviceCenterTip: {
    color: 'rgba(186,230,253,0.95)',
    fontSize: 13,
    lineHeight: 18,
    marginTop: -8,
    marginBottom: 16,
  },
  error: {
    color: '#fca5a5',
    marginBottom: 12,
  },
  info: {
    color: '#86efac',
    marginBottom: 12,
    lineHeight: 20,
  },
  verifyNotice: {
    color: '#fbbf24',
    marginBottom: 8,
    lineHeight: 20,
  },
  verifyHint: {
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 12,
    lineHeight: 20,
    fontSize: 13,
  },
  spinner: {
    marginVertical: 12,
  },
  submit: {
    marginTop: 4,
    width: '100%',
  },
  secondaryBtn: {
    marginTop: 8,
  },
});
