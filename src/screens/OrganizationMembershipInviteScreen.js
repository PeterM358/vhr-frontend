import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityIndicator, Button, Text } from 'react-native-paper';

import ScreenBackground from '../components/ScreenBackground';
import DashboardCard from '../components/dashboard/DashboardCard';
import BrandLogo from '../components/BrandLogo';
import AuthLanguageSelector from '../components/auth/AuthLanguageSelector';
import { acceptOrganizationMembershipInvite, previewOrganizationMembershipInvite } from '../api/network';
import { fetchAuthSession, resendEmailVerification } from '../api/auth';
import { AuthContext } from '../context/AuthManager';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { BRAND_LOCKUP_ASPECT, IMAGES } from '../constants/images';
import { COLORS } from '../constants/colors';
import { useTranslation } from '../i18n';
import { storeAuthReturnUrl } from '../navigation/authNavigation';
import { resetNavigationToCanonicalPath } from '../navigation/webLinking';
import { safeError } from '../utils/logger';
import {
  inviteReturnPath,
  localizeOrgMembershipRole,
  resolveInviteTokenFromRoute,
} from '../utils/orgInviteHelpers';
import { refreshOrganizationMemberships } from '../utils/orgWorkspace';
import { buildShopAuthReset } from '../utils/shopAuthNavigation';
import BaseStyles from '../styles/base';

const AUTH_BRAND_WIDTH = 220;
const AUTH_BRAND_HEIGHT = Math.round(AUTH_BRAND_WIDTH * BRAND_LOCKUP_ASPECT);

function resolveInviteToken(route) {
  const pathname =
    Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.pathname : '';
  return resolveInviteTokenFromRoute(route, pathname);
}

export default function OrganizationMembershipInviteScreen({ route, navigation }) {
  const { t } = useTranslation();
  const { isAuthenticated, isLoading: authLoading, userEmailOrPhone } = useContext(AuthContext);
  const token = useMemo(() => resolveInviteToken(route), [route]);

  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState('');
  const [error, setError] = useState('');
  const [emailVerified, setEmailVerified] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);

  const loadPreview = useCallback(async () => {
    if (!token) {
      setError(t('orgInvite.invalid'));
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const data = await previewOrganizationMembershipInvite(token);
      setPreview(data);
    } catch (err) {
      setPreview(null);
      setError(err?.message || t('orgInvite.invalid'));
    } finally {
      setLoading(false);
    }
  }, [token, t]);

  useEffect(() => {
    loadPreview();
  }, [loadPreview]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!isAuthenticated || authLoading) {
        if (!cancelled) {
          setSessionChecked(false);
        }
        return;
      }
      setSessionChecked(false);
      try {
        const accessToken = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
        if (!accessToken) {
          if (!cancelled) {
            setEmailVerified(false);
            setSessionChecked(true);
          }
          return;
        }
        const session = await fetchAuthSession(accessToken);
        if (cancelled) return;
        const verified = Boolean(session?.email_verified);
        setEmailVerified(verified);
        await AsyncStorage.setItem(STORAGE_KEYS.EMAIL_VERIFIED, verified ? 'true' : 'false');
      } catch {
        const stored = await AsyncStorage.getItem(STORAGE_KEYS.EMAIL_VERIFIED);
        if (!cancelled) {
          setEmailVerified(stored === 'true');
        }
      } finally {
        if (!cancelled) {
          setSessionChecked(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, authLoading]);

  useEffect(() => {
    if (!isAuthenticated || authLoading || emailVerified || !token) return;
    storeAuthReturnUrl(inviteReturnPath(token)).catch(() => {});
  }, [isAuthenticated, authLoading, emailVerified, token]);

  const goToLogin = async () => {
    await storeAuthReturnUrl(inviteReturnPath(token));
    navigation.navigate('Login');
  };

  const goToRegister = async () => {
    await storeAuthReturnUrl(inviteReturnPath(token));
    navigation.navigate('Register');
  };

  const handleResendVerification = async () => {
    setResending(true);
    setResendMessage('');
    setError('');
    try {
      await storeAuthReturnUrl(inviteReturnPath(token));
      const email =
        (userEmailOrPhone && userEmailOrPhone.includes('@') ? userEmailOrPhone : null) ||
        (await AsyncStorage.getItem('@login_email'));
      if (!email) {
        setError(t('orgInvite.resendNeedsEmail'));
        return;
      }
      await resendEmailVerification(email);
      setResendMessage(t('orgInvite.verificationSent'));
    } catch (err) {
      setError(err?.message || t('orgInvite.resendFailed'));
    } finally {
      setResending(false);
    }
  };

  const handleAccept = async () => {
    setAccepting(true);
    setError('');
    try {
      const accessToken = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      if (!accessToken) {
        await goToLogin();
        return;
      }
      const result = await acceptOrganizationMembershipInvite(accessToken, token);
      await refreshOrganizationMemberships(accessToken);
      navigation.reset(
        buildShopAuthReset({
          name: 'OrgHome',
          params: { organizationId: result.organization_id },
        }),
      );
      if (Platform.OS === 'web') {
        resetNavigationToCanonicalPath(
          navigation,
          `/partner/organization/fleet?organizationId=${result.organization_id}`,
        );
      }
    } catch (err) {
      safeError('Organization invite accept failed', err);
      const message = String(err?.message || '');
      if (message.toLowerCase().includes('verify your email')) {
        setEmailVerified(false);
        await AsyncStorage.setItem(STORAGE_KEYS.EMAIL_VERIFIED, 'false');
        setError(t('orgInvite.verifyEmailFirst'));
      } else if (message.toLowerCase().includes('different user')) {
        setError(t('orgInvite.wrongUser'));
      } else if (message.toLowerCase().includes('expired')) {
        setError(t('orgInvite.expired'));
      } else if (message.toLowerCase().includes('already')) {
        setError(t('orgInvite.alreadyUsed'));
      } else {
        setError(message || t('orgInvite.acceptFailed'));
      }
    } finally {
      setAccepting(false);
    }
  };

  const recipientLabel = preview?.masked_email || preview?.masked_phone || t('orgInvite.recipientHidden');
  const roleLabel = localizeOrgMembershipRole(t, preview?.role);
  const showAccept = isAuthenticated && sessionChecked && emailVerified;
  const showVerify = isAuthenticated && sessionChecked && !emailVerified;

  return (
    <ScreenBackground safeArea={false}>
      <ScrollView contentContainerStyle={styles.container}>
        <AuthLanguageSelector />
        <BrandLogo
          source={IMAGES.brandLockup}
          width={AUTH_BRAND_WIDTH}
          height={AUTH_BRAND_HEIGHT}
          style={styles.logo}
        />
        <DashboardCard style={styles.card}>
          <Text style={styles.title}>{t('orgInvite.title')}</Text>
          {loading || authLoading || (isAuthenticated && !sessionChecked) ? (
            <ActivityIndicator animating style={styles.spinner} />
          ) : null}
          {!loading && preview ? (
            <View style={styles.details}>
              <Text style={styles.label}>{t('orgInvite.organization')}</Text>
              <Text style={styles.value}>{preview.organization_name}</Text>
              <Text style={styles.label}>{t('orgInvite.role')}</Text>
              <Text style={styles.value}>{roleLabel}</Text>
              <Text style={styles.label}>{t('orgInvite.recipient')}</Text>
              <Text style={styles.value}>{recipientLabel}</Text>
            </View>
          ) : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}
          {resendMessage ? <Text style={styles.success}>{resendMessage}</Text> : null}
          {!loading && preview && !isAuthenticated ? (
            <View style={styles.actions}>
              <Button mode="contained" onPress={goToLogin} style={styles.actionButton}>
                {t('auth.login')}
              </Button>
              <Button mode="outlined" onPress={goToRegister} style={styles.actionButton}>
                {t('auth.register')}
              </Button>
            </View>
          ) : null}
          {!loading && preview && showVerify ? (
            <View style={styles.actions}>
              <Text style={styles.body}>{t('orgInvite.verifyEmailFirst')}</Text>
              <Button
                mode="contained"
                loading={resending}
                disabled={resending}
                onPress={handleResendVerification}
                style={styles.actionButton}
              >
                {t('orgInvite.sendVerificationEmail')}
              </Button>
            </View>
          ) : null}
          {!loading && preview && showAccept ? (
            <Button
              mode="contained"
              loading={accepting}
              disabled={accepting}
              onPress={handleAccept}
              style={styles.actionButton}
            >
              {t('orgInvite.accept')}
            </Button>
          ) : null}
        </DashboardCard>
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    ...BaseStyles.flexFill,
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 32,
    alignItems: 'center',
  },
  logo: {
    marginBottom: 16,
  },
  card: {
    width: '100%',
    maxWidth: 480,
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.TEXT_DARK,
    marginBottom: 12,
  },
  details: {
    gap: 4,
    marginBottom: 16,
  },
  label: {
    color: COLORS.TEXT_MUTED,
    fontSize: 13,
    marginTop: 8,
  },
  value: {
    color: COLORS.TEXT_DARK,
    fontSize: 16,
    fontWeight: '600',
  },
  body: {
    color: COLORS.TEXT_MUTED,
    lineHeight: 20,
    marginBottom: 12,
  },
  error: {
    color: '#b91c1c',
    marginBottom: 12,
  },
  success: {
    color: COLORS.TEXT_MUTED,
    marginBottom: 12,
  },
  actions: {
    gap: 8,
    marginTop: 8,
  },
  actionButton: {
    marginTop: 4,
  },
  spinner: {
    marginVertical: 16,
  },
});
