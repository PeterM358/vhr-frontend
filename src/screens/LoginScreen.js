// PATH: src/screens/LoginScreen.js

import React, { useState, useEffect, useContext } from 'react';
import { View, Text, TextInput, ScrollView, ActivityIndicator } from 'react-native';
import { login } from '../api/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BASE_STYLES from '../styles/base';
import CommonButton from '../components/CommonButton';
import { AuthContext } from '../context/AuthManager';

export default function LoginScreen({ navigation }) {
  const { setIsAuthenticated, setAuthToken, setUserEmailOrPhone } = useContext(AuthContext);

  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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

      console.log('✅ Login: setting AuthContext state');
      setAuthToken(data.access);
      setIsAuthenticated(true);
      setUserEmailOrPhone(emailOrPhone.trim());

      const targetScreen = data.is_shop ? 'ShopHome' : 'Home';
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