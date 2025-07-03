// PATH: src/screens/LoginScreen.js
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { login } from '../api/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants/storageKeys';
import BASE_STYLES from '../styles/base';
import CommonButton from '../components/CommonButton';

export default function LoginScreen({ navigation }) {
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      const data = await login(emailOrPhone.trim(), password);
      const { access, refresh, is_client, is_shop, user_id, shop_profiles } = data;

      // Store basic info
      await AsyncStorage.multiSet([
        [STORAGE_KEYS.ACCESS_TOKEN, access],
        [STORAGE_KEYS.REFRESH_TOKEN, refresh],
        [STORAGE_KEYS.IS_CLIENT, JSON.stringify(is_client)],
        [STORAGE_KEYS.IS_SHOP, JSON.stringify(is_shop)],
        [STORAGE_KEYS.USER_ID, user_id.toString()],
        [STORAGE_KEYS.SHOP_PROFILES, JSON.stringify(shop_profiles || [])]
      ]);

      // If user is shop and has shops, set the current one
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
    <ScrollView contentContainerStyle={BASE_STYLES.overlay}>
      <Text style={BASE_STYLES.title}>Login</Text>

      {error ? <Text style={BASE_STYLES.error}>{error}</Text> : null}

      <Text style={BASE_STYLES.label}>Email or Phone</Text>
      <TextInput
        style={BASE_STYLES.formInput}
        placeholder="Enter email or phone"
        value={emailOrPhone}
        onChangeText={setEmailOrPhone}
        autoCapitalize="none"
        keyboardType="email-address"
      />

      <Text style={BASE_STYLES.label}>Password</Text>
      <TextInput
        style={BASE_STYLES.formInput}
        placeholder="Enter password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      {loading ? (
        <ActivityIndicator size="large" style={{ marginVertical: 20 }} />
      ) : (
        <CommonButton title="Login" onPress={handleLogin} />
      )}

      <Text style={BASE_STYLES.subText}>Don't have an account?</Text>
      <CommonButton title="Register" onPress={goToRegister} color="#555" />
    </ScrollView>
  );
}