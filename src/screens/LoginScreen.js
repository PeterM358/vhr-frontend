import React, { useState, useEffect, useContext } from 'react';
import { ScrollView, StyleSheet, View, Platform } from 'react-native';
import { Text, TextInput, Button, ActivityIndicator, useTheme } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { login } from '../api/auth';
import { sendFirebaseTokenToBackend } from '../api/notifications';

import { getFirebaseToken } from '../notifications/firebaseMessaging';
import { AuthContext } from '../context/AuthManager';
import Logo from '../assets/images/logo.svg';
import { STORAGE_KEYS } from '../constants/storageKeys';
import * as Google from 'expo-auth-session/providers/google';
import { googleLogin } from '../api/auth';
import { makeRedirectUri } from 'expo-auth-session';
import BaseStyles from '../styles/base';
import ScreenBackground from '../components/ScreenBackground';
import { COLORS } from '../constants/colors';

export default function LoginScreen({ navigation }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { setIsAuthenticated, setAuthToken, setUserEmailOrPhone } = useContext(AuthContext);

  const headerReserve = insets.top + (Platform.OS === 'ios' ? 52 : 56);

  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadLastLogin = async () => {
      const last = await AsyncStorage.getItem('@last_login_email');
      if (last) setEmailOrPhone(last);
    };
    loadLastLogin();
  }, []);

  const redirectUri = makeRedirectUri({ useProxy: true });

  const [googleRequest, googleResponse, promptGoogleLogin] = Google.useAuthRequest(
    {
      expoClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
      androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
      iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
      webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    },
    { useProxy: true }
  );

  useEffect(() => {
    console.log('🟢 Google response changed:', googleResponse);

    const handleGoogleLogin = async () => {
      console.log('🟢 Starting handleGoogleLogin with response:', googleResponse);

      if (googleResponse?.type === 'success') {
        try {
          const { code } = googleResponse.params;
          console.log('📡 Authorization Code:', code);

          console.log('🔁 Using redirect URI for token exchange:', redirectUri);

          console.log('📤 Requesting token exchange with code:', code);
          const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              code,
              client_id: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
              client_secret: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_SECRET,
              redirect_uri: redirectUri,
              grant_type: 'authorization_code',
            }).toString(),
          });

          console.log('⏳ Waiting for token response...');
          const tokenData = await tokenResponse.json();
          console.log('🔐 Received tokenData from Google:', tokenData);

          if (!tokenData.id_token) {
            console.error('❌ No id_token received from token exchange');
            setError('Google login failed: No ID token received.');
            return;
          }

          const id_token = tokenData.id_token;
          console.log('📡 Sending id_token to Django:', id_token);

          const data = await googleLogin(id_token);
          console.log('✅ Google Login Response from backend:', data);

          setAuthToken(data.access);
          setIsAuthenticated(true);
          setUserEmailOrPhone(data.email);

          await AsyncStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, data.access);
          await AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, data.refresh);
          await AsyncStorage.setItem(STORAGE_KEYS.IS_SHOP, data.is_shop ? 'true' : 'false');
          await AsyncStorage.setItem(STORAGE_KEYS.IS_CLIENT, data.is_client ? 'true' : 'false');

          const target = data.is_shop ? 'ShopHome' : 'Home';
          navigation.reset({ index: 0, routes: [{ name: target }] });
        } catch (error) {
          console.error('❌ Google login error', error);
          setError('Google login failed. Try again.');
        }
      } else {
        console.warn('⚠️ Google login response type is not success:', googleResponse?.type);
      }
    };

    handleGoogleLogin();
  }, [googleResponse]);

  const handleLogin = async () => {
    console.log('🟢 Starting handleLogin with:', emailOrPhone);
    setError('');
    setLoading(true);
    try {
      await AsyncStorage.setItem('@last_login_email', emailOrPhone.trim());
      console.log('📤 Sending login request...');
      const data = await login(emailOrPhone.trim(), password);

      console.log('✅ Login success. Data:', data);

      setAuthToken(data.access);
      setIsAuthenticated(true);
      setUserEmailOrPhone(emailOrPhone.trim());

      await AsyncStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, data.access);
      await AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, data.refresh);
      await AsyncStorage.setItem(STORAGE_KEYS.USER_ID, data.user_id.toString());
      await AsyncStorage.setItem(STORAGE_KEYS.IS_SHOP, data.is_shop ? 'true' : 'false');
      await AsyncStorage.setItem(STORAGE_KEYS.IS_CLIENT, data.is_client ? 'true' : 'false');

      if (data.shop_profiles && data.shop_profiles.length > 0) {
        await AsyncStorage.setItem(STORAGE_KEYS.SHOP_PROFILES, JSON.stringify(data.shop_profiles));
        await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_SHOP_ID, data.shop_profiles[0].id.toString());
        console.log('✅ Default CURRENT_SHOP_ID set to:', data.shop_profiles[0].id);
      } else {
        await AsyncStorage.removeItem(STORAGE_KEYS.SHOP_PROFILES);
        await AsyncStorage.removeItem(STORAGE_KEYS.CURRENT_SHOP_ID);
        console.log('⚠️ No shop profiles found');
      }

      const target = data.is_shop ? 'ShopHome' : 'Home';

      navigation.reset({ index: 0, routes: [{ name: target }] });
    } catch (err) {
      console.error('❌ Login error', err);
      setError('Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const goToRegister = () => navigation.navigate('Register');

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
        <View style={styles.card}>
          <View style={BaseStyles.logoContainer}>
            <Logo width={112} height={112} />
          </View>
          <Text style={styles.kicker}>Sign in</Text>
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>
            Use your email or phone and password to continue.
          </Text>

          {error ? (
            <Text style={[styles.errorText, { color: theme.colors.error }]}>{error}</Text>
          ) : null}

          <TextInput
            label="Email or Phone"
            mode="outlined"
            value={emailOrPhone}
            onChangeText={setEmailOrPhone}
            keyboardType="email-address"
            autoCapitalize="none"
            style={styles.input}
          />

          <TextInput
            label="Password"
            mode="outlined"
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
            Forgot password?
          </Button>

          {loading ? (
            <ActivityIndicator size="large" style={BaseStyles.loginLoading} color={COLORS.PRIMARY} />
          ) : (
            <Button
              mode="contained"
              icon="login"
              onPress={handleLogin}
              style={[BaseStyles.loginButton, styles.fullBtn]}
              contentStyle={BaseStyles.loginButtonContent}
              labelStyle={BaseStyles.loginButtonLabel}
              buttonColor={theme.colors.primary}
            >
              Sign In
            </Button>
          )}

          <Text style={styles.subText}>{"Don't have an account?"}</Text>
          <Button mode="text" onPress={goToRegister} textColor={COLORS.PRIMARY}>
            Create account
          </Button>
        </View>
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
  card: {
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
    backgroundColor: COLORS.CARD_FLOATING,
    borderRadius: 22,
    paddingHorizontal: 22,
    paddingVertical: 26,
    alignItems: 'stretch',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 14,
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
    color: COLORS.TEXT_DARK,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.TEXT_MUTED,
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
    backgroundColor: '#fff',
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
    color: COLORS.TEXT_MUTED,
  },
});
