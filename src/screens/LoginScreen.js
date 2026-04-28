import React, { useState, useEffect, useContext } from 'react';
import { ScrollView, StyleSheet, View, Platform } from 'react-native';
import { Text, TextInput, Button, ActivityIndicator, useTheme } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { login } from '../api/auth';
import { sendFirebaseTokenToBackend } from '../api/notifications';

import { getFirebaseToken } from '../notifications/firebaseMessaging';
import { AuthContext } from '../context/AuthManager';
import Logo from '../../assets/logo.svg';
import { STORAGE_KEYS } from '../constants/storageKeys'; // ✅ Make sure you have these constants
import * as Google from 'expo-auth-session/providers/google';
import { googleLogin } from '../api/auth';
import { makeRedirectUri } from 'expo-auth-session';
import BaseStyles from '../styles/base';

export default function LoginScreen({ navigation }) {
  const theme = useTheme();
  const { setIsAuthenticated, setAuthToken, setUserEmailOrPhone } = useContext(AuthContext);

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
    console.log("🟢 Google response changed:", googleResponse);

    const handleGoogleLogin = async () => {
      console.log("🟢 Starting handleGoogleLogin with response:", googleResponse);

      if (googleResponse?.type === 'success') {
        try {
          const { code } = googleResponse.params;
          console.log("📡 Authorization Code:", code);

          console.log("🔁 Using redirect URI for token exchange:", redirectUri);

          console.log("📤 Requesting token exchange with code:", code);
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

          console.log("⏳ Waiting for token response...");
          const tokenData = await tokenResponse.json();
          console.log("🔐 Received tokenData from Google:", tokenData);

          if (!tokenData.id_token) {
            console.error("❌ No id_token received from token exchange");
            setError("Google login failed: No ID token received.");
            return;
          }

          const id_token = tokenData.id_token;
          console.log("📡 Sending id_token to Django:", id_token);

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
        console.warn("⚠️ Google login response type is not success:", googleResponse?.type);
      }
    };

    handleGoogleLogin();
  }, [googleResponse]);

  const handleLogin = async () => {
    console.log("🟢 Starting handleLogin with:", emailOrPhone);
    setError('');
    setLoading(true);
    try {
      await AsyncStorage.setItem('@last_login_email', emailOrPhone.trim());
      console.log("📤 Sending login request...");
      const data = await login(emailOrPhone.trim(), password);

      console.log("✅ Login success. Data:", data);

      setAuthToken(data.access);
      setIsAuthenticated(true);
      setUserEmailOrPhone(emailOrPhone.trim());

      // Save tokens
      await AsyncStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, data.access);
      await AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, data.refresh);
      await AsyncStorage.setItem(STORAGE_KEYS.USER_ID, data.user_id.toString());
      await AsyncStorage.setItem(STORAGE_KEYS.IS_SHOP, data.is_shop ? 'true' : 'false');
      await AsyncStorage.setItem(STORAGE_KEYS.IS_CLIENT, data.is_client ? 'true' : 'false');

      // Save shop profiles
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
    <ScrollView contentContainerStyle={BaseStyles.container}>
      <View style={BaseStyles.logoContainer}>
        <Logo width={180} height={180} />
      </View>
      <Text style={BaseStyles.loginTitle}>Welcome Back!</Text>

      {error ? (
        <Text style={[BaseStyles.loginError, { color: theme.colors.error }]}>{error}</Text>
      ) : null}

      <TextInput
        label="Email or Phone"
        mode="outlined"
        value={emailOrPhone}
        onChangeText={setEmailOrPhone}
        keyboardType="email-address"
        autoCapitalize="none"
        style={BaseStyles.formInput}
      />

      <TextInput
        label="Password"
        mode="outlined"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        style={BaseStyles.formInput}
      />
      <Button
        mode="text"
        onPress={() => navigation.navigate('PasswordRequestReset')}
        labelStyle={{ color: theme.colors.primary }}
      >
        Forgot Password?
      </Button>

      {loading ? (
        <ActivityIndicator size="large" style={BaseStyles.loginLoading} color={theme.colors.primary} />
      ) : (
        <>
          <Button
            mode="contained"
            icon="login"
            onPress={handleLogin}
            style={BaseStyles.loginButton}
            contentStyle={BaseStyles.loginButtonContent}
            labelStyle={BaseStyles.loginButtonLabel}
          >
            Sign In
          </Button>
          {/*
          <Button
            mode="contained"
            icon="google"
            onPress={() => promptGoogleLogin()}
            style={[BaseStyles.loginButton, { backgroundColor: '#DB4437' }]}
            contentStyle={BaseStyles.loginButtonContent}
            labelStyle={BaseStyles.loginButtonLabel}
          >
            Sign In with Google
          </Button>
          */}
        </>
      )}


      <Text style={BaseStyles.loginSubText}>Don't have an account?</Text>
      <Button
        mode="text"
        onPress={goToRegister}
        labelStyle={{ color: theme.colors.primary }}
      >
        Sign Up
      </Button>
    </ScrollView>
  );
}