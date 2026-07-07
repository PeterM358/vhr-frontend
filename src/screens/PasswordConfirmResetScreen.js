// PATH: src/screens/PasswordConfirmResetScreen.js

import React, { useContext, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Text } from 'react-native-paper';
import { confirmPasswordReset } from '../api/auth';
import { AuthContext } from '../context/AuthManager';
import BASE_STYLES from '../styles/base';
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

export default function PasswordConfirmResetScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const headerReserve = insets.top + (Platform.OS === 'ios' ? 52 : 56);
  const authContext = useContext(AuthContext);
  const { uid, token } = useMemo(() => resolvePasswordResetParams(route), [route]);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleConfirmReset = async () => {
    setError('');

    if (!uid || !token) {
      const message = 'This reset link is invalid or incomplete. Request a new password reset email.';
      setError(message);
      showMessage('Invalid link', message, { variant: 'error' });
      return;
    }

    if (!password.trim() || !confirmPassword.trim()) {
      setError('Please fill in both password fields.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    try {
      setLoading(true);
      const data = await confirmPasswordReset(uid, token, password.trim());

      if (!data?.access) {
        throw new Error('Password was reset but sign-in failed. Please log in manually.');
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
      const message = err.message || 'Failed to reset password.';
      setError(message);
      showMessage('Error', message, { variant: 'error' });
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
          keyboardShouldPersistTaps="handled"
        >
          <DashboardCard style={styles.authPanel}>
            <Text style={styles.title}>Enter New Password</Text>
            <TextInput
              style={styles.input}
              placeholder="New Password"
              placeholderTextColor="rgba(255,255,255,0.6)"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              autoComplete="new-password"
              textContentType="newPassword"
            />
            <TextInput
              style={styles.input}
              placeholder="Confirm New Password"
              placeholderTextColor="rgba(255,255,255,0.6)"
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              autoComplete="new-password"
              textContentType="newPassword"
            />
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <Button
              mode="contained"
              onPress={handleConfirmReset}
              loading={loading}
              disabled={loading}
            >
              Reset Password
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
  errorText: {
    color: '#fca5a5',
    marginBottom: 12,
    textAlign: 'center',
    lineHeight: 20,
  },
});
