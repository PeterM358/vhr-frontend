// PATH: src/screens/LoginScreen.js

import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useTheme, Text, TextInput, Button } from 'react-native-paper';
import { login } from '../api/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants/storageKeys';
import BASE_STYLES from '../styles/base';

export default function LoginScreen({ navigation }) {
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const theme = useTheme();

  useEffect(() => {
    const loadLastLogin = async () => {
      const lastEmail = await AsyncStorage.getItem('@last_login_email');
      if (lastEmail) setEmailOrPhone(lastEmail);
    };
    loadLastLogin();
  }, []);

  const handleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      await AsyncStorage.setItem('@last_login_email', emailOrPhone.trim());

      const data = await login(emailOrPhone.trim(), password);
      const { access, refresh, is_client, is_shop, user_id, shop_profiles } = data;

      await AsyncStorage.multiSet([
        [STORAGE_KEYS.ACCESS_TOKEN, access],
        [STORAGE_KEYS.REFRESH_TOKEN, refresh],
        [STORAGE_KEYS.IS_CLIENT, JSON.stringify(is_client)],
        [STORAGE_KEYS.IS_SHOP, JSON.stringify(is_shop)],
        [STORAGE_KEYS.USER_ID, user_id.toString()],
        [STORAGE_KEYS.SHOP_PROFILES, JSON.stringify(shop_profiles || [])]
      ]);

      if (is_shop && shop_profiles && shop_profiles.length === 1) {
        await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_SHOP_ID, shop_profiles[0].id.toString());
      }

      const targetScreen = is_shop ? 'ShopHome' : 'Home';
      navigation.reset({ index: 0, routes: [{ name: targetScreen }] });
    } catch (err) {
      console.error('Login error', err);
      setError('Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const goToRegister = () => navigation.navigate('Register');

  return (
    <ScrollView
      contentContainerStyle={{
        flexGrow: 1,
        backgroundColor: theme.colors.background,
        justifyContent: 'center',
        padding: 20,
      }}
    >
      <Text variant="headlineMedium" style={{ textAlign: 'center', marginBottom: 20, color: theme.colors.primary }}>
        Login
      </Text>

      {error ? (
        <Text style={{ color: theme.colors.error, textAlign: 'center', marginBottom: 12 }}>
          {error}
        </Text>
      ) : null}

      <TextInput
        label="Email or Phone"
        mode="outlined"
        value={emailOrPhone}
        onChangeText={setEmailOrPhone}
        keyboardType="email-address"
        autoCapitalize="none"
        style={{ marginBottom: 16 }}
      />

      <TextInput
        label="Password"
        mode="outlined"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        style={{ marginBottom: 24 }}
      />

      {loading ? (
        <ActivityIndicator size="large" style={{ marginVertical: 20 }} />
      ) : (
        <Button
          mode="contained"
          onPress={handleLogin}
          style={{ marginBottom: 16 }}
        >
          Login
        </Button>
      )}

      <Text style={{ textAlign: 'center', marginBottom: 8 }}>
        Don't have an account?
      </Text>
      <Button
        mode="outlined"
        onPress={goToRegister}
        textColor={theme.colors.primary}
      >
        Register
      </Button>
    </ScrollView>
  );
}