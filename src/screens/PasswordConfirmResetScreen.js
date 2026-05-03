// PATH: src/screens/PasswordConfirmResetScreen.js

import React, { useState, useEffect } from 'react';
import { useLinkTo } from '@react-navigation/native';
import {
  View,
  StyleSheet,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Text } from 'react-native-paper';
import { confirmPasswordReset } from '../api/auth';
import BASE_STYLES from '../styles/base';
import ScreenBackground from '../components/ScreenBackground';

export default function PasswordConfirmResetScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const headerReserve = insets.top + (Platform.OS === 'ios' ? 52 : 56);
  const { uid, token } = route.params || {};
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!uid || !token) {
      Alert.alert('Invalid link', 'Missing token or user ID.');
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    }
  }, [uid, token]);

  const handleConfirmReset = async () => {
    if (!uid || !token) {
      Alert.alert('Invalid link', 'Missing token or user ID.');
      return;
    }

    if (!password.trim() || !confirmPassword.trim()) {
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters.');
      return;
    }

    try {
      setLoading(true);
      await confirmPasswordReset(uid, token, password.trim());
      Alert.alert('Success', 'Password reset successful.');
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenBackground safeArea={false}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={BASE_STYLES.flexFill}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            {
              paddingTop: headerReserve,
              paddingBottom: Math.max(insets.bottom, 16) + 24,
            },
          ]}
        >
          <View style={styles.card}>
            <Text style={styles.title}>Enter New Password</Text>
            <TextInput
              style={styles.input}
              placeholder="New Password"
              placeholderTextColor="rgba(255,255,255,0.6)"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
            <TextInput
              style={styles.input}
              placeholder="Confirm New Password"
              placeholderTextColor="rgba(255,255,255,0.6)"
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />
            <Button mode="contained" onPress={handleConfirmReset} loading={loading}>
              Reset Password
            </Button>
          </View>
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
  card: {
    backgroundColor: 'rgba(5,15,30,0.72)',
    borderColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderRadius: 22,
    padding: 22,
  },
  title: {
    fontSize: 22,
    marginBottom: 20,
    textAlign: 'center',
    color: '#fff',
    fontWeight: '700',
  },
  input: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    padding: 12,
    marginBottom: 16,
    borderRadius: 10,
    color: '#fff',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
});