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

  const handleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      await AsyncStorage.setItem('@last_login_email', emailOrPhone.trim());
      const data = await login(emailOrPhone.trim(), password);

      console.log('✅ Login Response:', data);

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

  const testPasswordReset = () => {
    navigation.navigate('PasswordConfirmReset', {
      uid: 'MQ',
      token: 'ctlvi3-f5074152adbec6b5d26f0fa89331e7c1',
    });
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.logoContainer}>
        <Logo width={180} height={180} />
      </View>
      <Text style={styles.title}>Welcome Back!</Text>

      {error ? (
        <Text style={[styles.error, { color: theme.colors.error }]}>{error}</Text>
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
        labelStyle={{ color: theme.colors.primary }}
      >
        Forgot Password?
      </Button>

      {loading ? (
        <ActivityIndicator size="large" style={styles.loading} color={theme.colors.primary} />
      ) : (
        <Button
          mode="contained"
          icon="login"
          onPress={handleLogin}
          style={styles.button}
          contentStyle={styles.buttonContent}
          labelStyle={styles.buttonLabel}
        >
          Sign In
        </Button>
      )}


      <Text style={styles.subText}>Don't have an account?</Text>
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

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    textAlign: 'center',
    marginBottom: 24,
    fontWeight: 'bold',
  },
  error: {
    textAlign: 'center',
    marginBottom: 16,
  },
  input: {
    marginBottom: 16,
  },
  loading: {
    marginVertical: 20,
  },
  button: {
    marginVertical: 12,
    borderRadius: 8,
    alignSelf: 'center',
    width: '85%',
    maxWidth: 400,
  },
  buttonContent: {
    height: 50,
    flexDirection: 'row-reverse',
  },
  buttonLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  subText: {
    textAlign: 'center',
    marginTop: 16,
    fontSize: 16,
    color: '#555',
  },
});