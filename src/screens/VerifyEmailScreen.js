import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ActivityIndicator, Button, Text, useTheme } from 'react-native-paper';

import { confirmEmailVerification } from '../api/auth';
import ScreenBackground from '../components/ScreenBackground';
import BrandLogo from '../components/BrandLogo';
import DashboardCard from '../components/dashboard/DashboardCard';
import AuthLanguageSelector from '../components/auth/AuthLanguageSelector';
import { AuthContext } from '../context/AuthManager';
import { BRAND_LOCKUP_ASPECT, IMAGES } from '../constants/images';
import { COLORS } from '../constants/colors';
import { useTranslation } from '../i18n';
import {
  applyAuthSession,
  authDisplayIdentifier,
  resolveEmailVerifyParams,
} from '../utils/authSession';
import {
  resetToClientDashboard,
  consumeAuthReturnUrl,
} from '../navigation/authNavigation';
import { resetNavigationToCanonicalPath } from '../navigation/webLinking';
import { buildShopAuthReset, resolveShopEntryRoute } from '../utils/shopAuthNavigation';
import { safeError } from '../utils/logger';
import BaseStyles from '../styles/base';

const AUTH_BRAND_WIDTH = 220;
const AUTH_BRAND_HEIGHT = Math.round(AUTH_BRAND_WIDTH * BRAND_LOCKUP_ASPECT);

export default function VerifyEmailScreen({ route, navigation }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const headerReserve = insets.top + (Platform.OS === 'ios' ? 52 : 56);
  const authContext = useContext(AuthContext);
  const { uid, token } = useMemo(() => resolveEmailVerifyParams(route), [route]);
  const [status, setStatus] = useState('pending');
  const [error, setError] = useState('');
  const ranKeyRef = useRef('');

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!uid || !token) {
        setStatus('error');
        setError(t('auth.invalidVerifyLink'));
        return;
      }
      const key = `${uid}:${token}`;
      if (ranKeyRef.current === key) {
        return;
      }
      ranKeyRef.current = key;
      try {
        const data = await confirmEmailVerification(uid, token);
        if (cancelled) return;
        if (data?.access) {
          const identifier = authDisplayIdentifier(data);
          await applyAuthSession(data, identifier, authContext);
          setStatus('success');
          const returnPath = await consumeAuthReturnUrl();
          if (returnPath && resetNavigationToCanonicalPath(navigation, returnPath)) {
            return;
          }
          const shopRoute = await resolveShopEntryRoute({ authData: data });
          if (shopRoute.name === 'OrgHome' || shopRoute.name === 'OrgOnboarding' || data.is_shop) {
            navigation.reset(buildShopAuthReset(shopRoute));
            return;
          }
          resetToClientDashboard(navigation);
          return;
        }
        // Already verified (idempotent) — no new tokens; send user to login / onboarding.
        setStatus(data?.already_verified ? 'already' : 'success');
      } catch (err) {
        safeError('Email verification failed', err);
        if (cancelled) return;
        setStatus('error');
        setError(err?.message || t('auth.verifyFailed'));
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [uid, token, authContext, navigation, t]);

  return (
    <ScreenBackground safeArea={false}>
      <View style={[styles.container, { paddingTop: headerReserve + 12 }]}>
        <AuthLanguageSelector />
        <BrandLogo
          source={IMAGES.brandLockup}
          width={AUTH_BRAND_WIDTH}
          height={AUTH_BRAND_HEIGHT}
          style={styles.logo}
        />
        <DashboardCard style={styles.card}>
          <Text style={styles.title}>{t('auth.verifyEmailTitle')}</Text>
          {status === 'pending' && (
            <>
              <ActivityIndicator animating color={theme.colors.primary} style={{ marginVertical: 16 }} />
              <Text style={styles.body}>{t('auth.verifyEmailPending')}</Text>
            </>
          )}
          {status === 'success' && (
            <Text style={styles.body}>{t('auth.verifyEmailSuccess')}</Text>
          )}
          {status === 'already' && (
            <>
              <Text style={styles.body}>
                {t(
                  'auth.verifyEmailAlready',
                  null,
                  'Email already verified. Log in here, or on your other device tap Refresh status.',
                )}
              </Text>
              <Button mode="contained" onPress={() => navigation.navigate('Login')} style={{ marginTop: 16 }}>
                {t('auth.goToLogin')}
              </Button>
            </>
          )}
          {status === 'error' && (
            <>
              <Text style={[styles.body, styles.error]}>{error}</Text>
              <Button mode="contained" onPress={() => navigation.navigate('Login')} style={{ marginTop: 16 }}>
                {t('auth.goToLogin')}
              </Button>
            </>
          )}
        </DashboardCard>
      </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    ...BaseStyles.flexFill,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  logo: {
    marginBottom: 16,
  },
  card: {
    width: '100%',
    maxWidth: 440,
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 8,
  },
  body: {
    color: 'rgba(255,255,255,0.78)',
    lineHeight: 20,
  },
  error: {
    color: '#fca5a5',
  },
});
