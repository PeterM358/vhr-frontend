// PATH: src/screens/PasswordRequestResetScreen.js

import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Text, TextInput, ActivityIndicator, useTheme } from 'react-native-paper';
import { requestPasswordReset } from '../api/auth';
import ScreenBackground from '../components/ScreenBackground';
import DashboardCard from '../components/dashboard/DashboardCard';
import AuthLanguageSelector from '../components/auth/AuthLanguageSelector';
import BrandLogo from '../components/BrandLogo';
import BaseStyles from '../styles/base';
import { BRAND_LOCKUP_ASPECT, IMAGES } from '../constants/images';
import { COLORS } from '../constants/colors';
import { useTranslation } from '../i18n';
import { showMessage } from '../utils/crossPlatformAlert';

/** Full brand lockup width; height follows 512×720 intrinsic ratio. */
const AUTH_BRAND_WIDTH = 220;
const AUTH_BRAND_HEIGHT = Math.round(AUTH_BRAND_WIDTH * BRAND_LOCKUP_ASPECT);

export default function PasswordRequestResetScreen({ navigation }) {
  const theme = useTheme();
  const { t, locale } = useTranslation();
  const insets = useSafeAreaInsets();
  const headerReserve = insets.top + (Platform.OS === 'ios' ? 52 : 56);
  const [email, setEmail] = useState('');
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

  const handleRequestReset = async () => {
    if (!email.trim()) {
      setError(t('auth.enterEmailRequired'));
      return;
    }

    setError('');
    try {
      setLoading(true);
      await requestPasswordReset(email.trim(), locale);
      showMessage(t('common.notice'), t('auth.resetEmailSent'));
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    } catch (err) {
      const message = err.message || t('common.error');
      setError(message);
      showMessage(t('common.error'), message, { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenBackground safeArea={false}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.scroll,
          {
            paddingTop: headerReserve + 8,
            paddingBottom: Math.max(insets.bottom, 24) + 24,
          },
        ]}
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
          <Text style={styles.title}>{t('auth.resetPasswordHeading')}</Text>
          <Text style={styles.subtitle}>{t('auth.resetPasswordSubtitle')}</Text>

          {error ? (
            <Text style={[styles.errorText, { color: theme.colors.error }]}>{error}</Text>
          ) : null}

          <TextInput
            label={t('auth.emailPlaceholder')}
            mode="outlined"
            theme={authInputTheme}
            outlineColor="rgba(148,163,184,0.45)"
            activeOutlineColor={COLORS.ACCENT}
            textColor="#ffffff"
            outlineStyle={styles.inputOutline}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            style={styles.input}
          />

          {loading ? (
            <ActivityIndicator size="large" style={BaseStyles.loginLoading} color={COLORS.ACCENT} />
          ) : (
            <Button
              mode="contained"
              onPress={handleRequestReset}
              style={[BaseStyles.loginButton, styles.fullBtn]}
              contentStyle={BaseStyles.loginButtonContent}
              labelStyle={BaseStyles.loginButtonLabel}
              buttonColor={COLORS.PRIMARY}
              textColor={COLORS.ON_PRIMARY}
            >
              {t('auth.sendResetEmail')}
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
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.78)',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  errorText: {
    textAlign: 'center',
    marginBottom: 12,
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
  fullBtn: {
    width: '100%',
    alignSelf: 'center',
    marginTop: 8,
  },
  backBtn: {
    marginTop: 12,
  },
});
