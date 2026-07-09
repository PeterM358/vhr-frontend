import React, { useCallback, useContext, useState, useEffect, useMemo } from 'react';
import { ScrollView, StyleSheet, View, Platform } from 'react-native';
import { Text, TextInput, Button, ActivityIndicator, useTheme } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { login, googleLogin } from '../api/auth';
import { buildShopAuthReset, resolveShopEntryRoute } from '../utils/shopAuthNavigation';
import {
  resetToClientDashboard,
  consumeAuthReturnUrl,
  waitForAuthContextCommit,
} from '../navigation/authNavigation';
import { resetNavigationToCanonicalPath } from '../navigation/webLinking';
import { AuthContext } from '../context/AuthManager';
import Logo from '../assets/images/logo.svg';
import { STORAGE_KEYS } from '../constants/storageKeys';
import BaseStyles from '../styles/base';
import ScreenBackground from '../components/ScreenBackground';
import { COLORS } from '../constants/colors';
import { shouldEnableGoogleOAuth } from '../components/auth/googleOAuthConfig';
import { safeError, safeWarn } from '../utils/logger';
import LoginGoogleOAuthBridge from '../components/auth/LoginGoogleOAuthBridge';
import DashboardCard from '../components/dashboard/DashboardCard';
import { useTranslation } from '../i18n';
import AuthLanguageSelector from '../components/auth/AuthLanguageSelector';

export default function LoginScreen({ navigation, route }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { setIsAuthenticated, setAuthToken, setUserEmailOrPhone } = useContext(AuthContext);

  const headerReserve = insets.top + (Platform.OS === 'ios' ? 52 : 56);

  const [loginMethod, setLoginMethod] = useState('email');
  const [email, setEmail] = useState('');
  const [phonePrefix, setPhonePrefix] = useState('+359');
  const [phoneNational, setPhoneNational] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const googleOAuthEnabled = shouldEnableGoogleOAuth();

  const authInputTheme = useMemo(
    () => ({
      ...theme,
      colors: {
        ...theme.colors,
        primary: '#60a5fa',
        background: '#07111f',
        placeholder: 'rgba(226,232,240,0.65)',
        text: '#ffffff',
      },
    }),
    [theme]
  );

  // route is optional on web deep links — never assume params exist
  void route;

  useEffect(() => {
    const loadLastLogin = async () => {
      try {
        const last = await AsyncStorage.getItem('@last_login_email');
        if (!last) return;
        if (last.startsWith('+')) {
          setLoginMethod('phone');
          const digits = last.slice(1);
          if (digits.startsWith('359')) {
            setPhonePrefix('+359');
            setPhoneNational(digits.slice(3));
          } else {
            setPhonePrefix('+');
            setPhoneNational(digits);
          }
        } else {
          setLoginMethod('email');
          setEmail(last);
        }
      } finally {
        setReady(true);
      }
    };
    loadLastLogin();
  }, []);

  const finishClientLogin = useCallback(async (navigationRef) => {
    await waitForAuthContextCommit();
    const returnPath = await consumeAuthReturnUrl();
    if (returnPath && resetNavigationToCanonicalPath(navigationRef, returnPath)) {
      return;
    }
    resetToClientDashboard(navigationRef);
  }, []);

  const handleGoogleOAuthResponse = useCallback(
    async (googleResponse, redirectUri) => {
      if (googleResponse?.type !== 'success') {
        return;
      }

      try {
        const { code } = googleResponse.params || {};
        if (!code) {
          setError(t('auth.googleNoCode'));
          return;
        }

        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            code,
            client_id: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || '',
            client_secret: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_SECRET || '',
            redirect_uri: redirectUri,
            grant_type: 'authorization_code',
          }).toString(),
        });

        const tokenData = await tokenResponse.json();
        if (!tokenData.id_token) {
          setError(t('auth.googleNoToken'));
          return;
        }

        const data = await googleLogin(tokenData.id_token);

        setAuthToken(data.access);
        setIsAuthenticated(true);
        setUserEmailOrPhone(data.email);

        await AsyncStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, data.access);
        await AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, data.refresh);
        await AsyncStorage.setItem(STORAGE_KEYS.IS_SHOP, data.is_shop ? 'true' : 'false');
        await AsyncStorage.setItem(STORAGE_KEYS.IS_CLIENT, data.is_client ? 'true' : 'false');

        if (data.is_shop) {
          const shopRoute = await resolveShopEntryRoute();
          await waitForAuthContextCommit();
          navigation.reset(buildShopAuthReset(shopRoute));
        } else {
          await finishClientLogin(navigation);
        }
      } catch (oauthError) {
        safeError('Google login failed', oauthError);
        setError(t('auth.googleLoginFailed'));
      }
    },
    [navigation, setAuthToken, setIsAuthenticated, setUserEmailOrPhone, finishClientLogin]
  );

  const handleLogin = async () => {
    const identifier =
      loginMethod === 'phone'
        ? `${(phonePrefix || '').trim()}${(phoneNational || '').trim()}`
        : (email || '').trim();
    setError('');
    setLoading(true);
    try {
      await AsyncStorage.setItem('@last_login_email', identifier);
      const data = await login(identifier, password);

      setAuthToken(data.access);
      setIsAuthenticated(true);
      setUserEmailOrPhone(identifier);

      await AsyncStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, data.access);
      await AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, data.refresh);
      await AsyncStorage.setItem(STORAGE_KEYS.USER_ID, data.user_id.toString());
      await AsyncStorage.setItem(STORAGE_KEYS.IS_SHOP, data.is_shop ? 'true' : 'false');
      await AsyncStorage.setItem(STORAGE_KEYS.IS_CLIENT, data.is_client ? 'true' : 'false');

      if (data.shop_profiles && data.shop_profiles.length > 0) {
        await AsyncStorage.setItem(STORAGE_KEYS.SHOP_PROFILES, JSON.stringify(data.shop_profiles));
        await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_SHOP_ID, data.shop_profiles[0].id.toString());
      } else {
        await AsyncStorage.removeItem(STORAGE_KEYS.SHOP_PROFILES);
        await AsyncStorage.removeItem(STORAGE_KEYS.CURRENT_SHOP_ID);
      }

      if (data.is_shop) {
        const shopRoute = await resolveShopEntryRoute();
        await waitForAuthContextCommit();
        navigation.reset(buildShopAuthReset(shopRoute));
      } else {
        await finishClientLogin(navigation);
      }
    } catch (err) {
      safeError('Login failed', err);
      setError(t('auth.loginFailed'));
    } finally {
      setLoading(false);
    }
  };

  const goToRegister = () => navigation.navigate('Register');

  if (!ready) {
    return (
      <ScreenBackground safeArea={false}>
        <View style={styles.loadingCenter}>
          <ActivityIndicator size="large" color={COLORS.PRIMARY} />
        </View>
      </ScreenBackground>
    );
  }

  return (
    <ScreenBackground safeArea={false}>
      {googleOAuthEnabled ? (
        <LoginGoogleOAuthBridge onOAuthResponse={handleGoogleOAuthResponse} />
      ) : null}
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
            <Logo width={112} height={112} />
          </View>
          <AuthLanguageSelector style={styles.langSelector} />
          <Text style={styles.kicker}>{t('auth.signIn')}</Text>
          <Text style={styles.title}>{t('auth.welcomeBack')}</Text>
          <Text style={styles.subtitle}>
            {googleOAuthEnabled
              ? t('auth.loginSubtitleOAuth')
              : t('auth.loginSubtitle')}
          </Text>

          {error ? (
            <Text style={[styles.errorText, { color: theme.colors.error }]}>{error}</Text>
          ) : null}

          <View style={styles.methodSwitchRow}>
            <Button
              mode={loginMethod === 'email' ? 'contained' : 'outlined'}
              compact
              onPress={() => setLoginMethod('email')}
              style={styles.methodBtn}
            >
              {t('common.email')}
            </Button>
            <Button
              mode={loginMethod === 'phone' ? 'contained' : 'outlined'}
              compact
              onPress={() => setLoginMethod('phone')}
              style={styles.methodBtn}
            >
              {t('common.phone')}
            </Button>
          </View>

          {loginMethod === 'email' ? (
            <TextInput
              label={t('common.email')}
              mode="outlined"
              theme={authInputTheme}
              outlineColor="rgba(148,163,184,0.45)"
              activeOutlineColor="#60a5fa"
              textColor="#ffffff"
              outlineStyle={styles.inputOutline}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              style={styles.input}
            />
          ) : (
            <>
              <View style={styles.phoneRow}>
                <TextInput
                  label={t('auth.phonePrefix')}
                  mode="outlined"
                  theme={authInputTheme}
                  outlineColor="rgba(148,163,184,0.45)"
                  activeOutlineColor="#60a5fa"
                  textColor="#ffffff"
                  outlineStyle={styles.inputOutline}
                  value={phonePrefix}
                  onChangeText={setPhonePrefix}
                  keyboardType="phone-pad"
                  style={[styles.input, styles.prefixInput]}
                />
                <TextInput
                  label={t('auth.phoneNumber')}
                  mode="outlined"
                  theme={authInputTheme}
                  outlineColor="rgba(148,163,184,0.45)"
                  activeOutlineColor="#60a5fa"
                  textColor="#ffffff"
                  outlineStyle={styles.inputOutline}
                  value={phoneNational}
                  onChangeText={setPhoneNational}
                  keyboardType="phone-pad"
                  style={[styles.input, styles.phoneInput]}
                />
              </View>
              <Text style={styles.helperText}>{t('auth.phoneLoginHelper')}</Text>
            </>
          )}

          <TextInput
            label={t('auth.password')}
            mode="outlined"
            theme={authInputTheme}
            outlineColor="rgba(148,163,184,0.45)"
            activeOutlineColor="#60a5fa"
            textColor="#ffffff"
            outlineStyle={styles.inputOutline}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            style={styles.input}
          />

          <Button
            mode="text"
            onPress={() => navigation.navigate('PasswordRequestReset')}
            textColor={COLORS.PRIMARY}
            compact
          >
            {t('auth.forgotPassword')}
          </Button>

          {loading ? (
            <ActivityIndicator size="large" style={BaseStyles.loginLoading} color={COLORS.PRIMARY} />
          ) : (
            <Button
              mode="contained"
              onPress={handleLogin}
              style={[BaseStyles.loginButton, styles.fullBtn]}
              contentStyle={BaseStyles.loginButtonContent}
              labelStyle={BaseStyles.loginButtonLabel}
              buttonColor={theme.colors.primary}
            >
              {t('auth.signIn')}
            </Button>
          )}

          <Text style={styles.subText}>{t('auth.noAccount')}</Text>
          <Button mode="text" onPress={goToRegister} textColor={COLORS.PRIMARY}>
            {t('auth.createAccount')}
          </Button>
        </DashboardCard>
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  loadingCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
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
  kicker: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: COLORS.PRIMARY,
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
  langSelector: {
    marginBottom: 8,
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
  methodSwitchRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  methodBtn: {
    flex: 1,
  },
  phoneRow: {
    flexDirection: 'row',
    gap: 10,
  },
  prefixInput: {
    flex: 0.7,
  },
  phoneInput: {
    flex: 1.3,
  },
  helperText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.65)',
    marginBottom: 8,
    marginTop: -2,
  },
  fullBtn: {
    width: '100%',
    alignSelf: 'center',
    marginTop: 8,
  },
  subText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 14,
    color: 'rgba(255,255,255,0.72)',
  },
});
