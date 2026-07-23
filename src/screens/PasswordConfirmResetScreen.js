// PATH: src/screens/PasswordConfirmResetScreen.js

import React, { useContext, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Text, TextInput, ActivityIndicator, useTheme } from 'react-native-paper';
import { confirmPasswordReset } from '../api/auth';
import { AuthContext } from '../context/AuthManager';
import BaseStyles from '../styles/base';
import ScreenBackground from '../components/ScreenBackground';
import DashboardCard from '../components/dashboard/DashboardCard';
import { showMessage } from '../utils/crossPlatformAlert';
import {
  applyAuthSession,
  authDisplayIdentifier,
  resolvePasswordResetParams,
} from '../utils/authSession';
import { buildShopAuthReset, resolveShopEntryRoute } from '../utils/shopAuthNavigation';
import { resetToClientDashboard } from '../navigation/authNavigation';
import { safeError } from '../utils/logger';
import AuthLanguageSelector from '../components/auth/AuthLanguageSelector';
import BrandLogo from '../components/BrandLogo';
import { BRAND_LOCKUP_ASPECT, IMAGES } from '../constants/images';
import { COLORS } from '../constants/colors';
import { useTranslation } from '../i18n';

/** Full brand lockup width; height follows 512×720 intrinsic ratio. */
const AUTH_BRAND_WIDTH = 220;
const AUTH_BRAND_HEIGHT = Math.round(AUTH_BRAND_WIDTH * BRAND_LOCKUP_ASPECT);

export default function PasswordConfirmResetScreen({ route, navigation }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const headerReserve = insets.top + (Platform.OS === 'ios' ? 52 : 56);
  const authContext = useContext(AuthContext);
  const { uid, token } = useMemo(() => resolvePasswordResetParams(route), [route]);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const authInputTheme = useMemo(
    () => ({
      ...theme,
      colors: {
        ...theme.colors,
        primary: COLORS.ACCENT,
        background: '#07111f',
        placeholder: 'rgba(226,232,240,0.65)',
        text: '#ffffff',
      },
    }),
    [theme]
  );

  const handleConfirmReset = async () => {
    setError('');

    if (!uid || !token) {
      const message = t('auth.invalidResetLink');
      setError(message);
      showMessage(t('auth.invalidResetLinkTitle'), message, { variant: 'error' });
      return;
    }

    if (!password.trim() || !confirmPassword.trim()) {
      setError(t('auth.fillBothPasswords'));
      return;
    }

    if (password !== confirmPassword) {
      setError(t('auth.passwordsDoNotMatch'));
      return;
    }

    if (password.length < 6) {
      setError(t('auth.passwordMinLength'));
      return;
    }

    try {
      setLoading(true);
      const data = await confirmPasswordReset(uid, token, password.trim());

      if (!data?.access) {
        throw new Error(t('auth.resetSignInFailed'));
      }

      const identifier = authDisplayIdentifier(data);
      await applyAuthSession(data, identifier, authContext);

      if (data.is_shop) {
        const shopRoute = await resolveShopEntryRoute();
        navigation.reset(buildShopAuthReset(shopRoute));
      } else {
        resetToClientDashboard(navigation);
      }
    } catch (err) {
      safeError('Password reset confirm failed', err);
      const message = err.message || t('auth.resetFailed');
      setError(message);
      showMessage(t('common.error'), message, { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenBackground safeArea={false}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={BaseStyles.flexFill}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            {
              paddingTop: headerReserve + 8,
              paddingBottom: Math.max(insets.bottom, 24) + 24,
            },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <DashboardCard style={styles.authPanel}>
            <View style={BaseStyles.logoContainer}>
              <BrandLogo
                source={IMAGES.brandLogin}
                width={AUTH_BRAND_WIDTH}
                height={AUTH_BRAND_HEIGHT}
                accessibilityLabel="Veversal"
              />
            </View>
            <AuthLanguageSelector style={styles.langSelector} />
            <Text style={styles.kicker}>{t('auth.resetPasswordTitle')}</Text>
            <Text style={styles.title}>{t('auth.enterNewPasswordHeading')}</Text>

            <TextInput
              label={t('auth.newPassword')}
              mode="outlined"
              theme={authInputTheme}
              outlineColor="rgba(148,163,184,0.45)"
              activeOutlineColor={COLORS.ACCENT}
              textColor="#ffffff"
              outlineStyle={styles.inputOutline}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              autoComplete="new-password"
              textContentType="newPassword"
              style={styles.input}
            />
            <TextInput
              label={t('auth.confirmNewPassword')}
              mode="outlined"
              theme={authInputTheme}
              outlineColor="rgba(148,163,184,0.45)"
              activeOutlineColor={COLORS.ACCENT}
              textColor="#ffffff"
              outlineStyle={styles.inputOutline}
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              autoComplete="new-password"
              textContentType="newPassword"
              style={styles.input}
            />

            {error ? (
              <Text style={[styles.errorText, { color: theme.colors.error }]}>{error}</Text>
            ) : null}

            {loading ? (
              <ActivityIndicator size="large" style={BaseStyles.loginLoading} color={COLORS.ACCENT} />
            ) : (
              <Button
                mode="contained"
                onPress={handleConfirmReset}
                disabled={loading}
                style={[BaseStyles.loginButton, styles.fullBtn]}
                contentStyle={BaseStyles.loginButtonContent}
                labelStyle={BaseStyles.loginButtonLabel}
                buttonColor={COLORS.PRIMARY}
                textColor={COLORS.ON_PRIMARY}
              >
                {t('auth.resetPasswordButton')}
              </Button>
            )}

            <Button
              mode="text"
              onPress={() => navigation.navigate('Login')}
              textColor={COLORS.ACCENT}
              style={styles.backBtn}
            >
              {t('auth.backToLogin')}
            </Button>
          </DashboardCard>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  authPanel: {
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
  },
  langSelector: {
    marginBottom: 8,
  },
  kicker: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: COLORS.ACCENT,
    textTransform: 'uppercase',
    textAlign: 'center',
    marginBottom: 6,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    width: '100%',
    marginBottom: 10,
    backgroundColor: '#07111f',
    borderRadius: 14,
    color: '#ffffff',
  },
  inputOutline: {
    borderRadius: 14,
    overflow: 'visible',
  },
  errorText: {
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 20,
  },
  fullBtn: {
    width: '100%',
    alignSelf: 'center',
    marginTop: 8,
  },
  backBtn: {
    marginTop: 12,
  },
});
