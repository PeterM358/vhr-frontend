import React, { useContext, useState } from 'react';
import { StyleSheet, View, Pressable, Platform } from 'react-native';
import { Text, TextInput, Button, Portal, Dialog, ActivityIndicator, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { register } from '../api/auth';
import { AuthContext } from '../context/AuthManager';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import BaseStyles from '../styles/base';
import ScreenBackground from '../components/ScreenBackground';
import Logo from '../assets/images/logo.svg';
import { COLORS } from '../constants/colors';
import { buildShopAuthReset, resolveShopEntryRoute } from '../utils/shopAuthNavigation';
import { resetToClientDashboard } from '../navigation/authNavigation';
import { safeError } from '../utils/logger';
import DashboardCard from '../components/dashboard/DashboardCard';
import AuthLanguageSelector from '../components/auth/AuthLanguageSelector';

export default function RegisterScreen({ navigation }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const headerReserve = insets.top + (Platform.OS === 'ios' ? 52 : 56);
  const { setIsAuthenticated, setAuthToken, setUserEmailOrPhone } = useContext(AuthContext);

  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('client');
  const [saving, setSaving] = useState(false);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [dialogMessage, setDialogMessage] = useState('');

  const applyAuthSession = async (data, identifier) => {
    setAuthToken(data.access);
    setIsAuthenticated(true);
    setUserEmailOrPhone(identifier);

    await AsyncStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, data.access);
    await AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, data.refresh);
    await AsyncStorage.setItem(STORAGE_KEYS.USER_ID, data.user_id?.toString() || '');
    await AsyncStorage.setItem(STORAGE_KEYS.IS_SHOP, data.is_shop ? 'true' : 'false');
    await AsyncStorage.setItem(STORAGE_KEYS.IS_CLIENT, data.is_client ? 'true' : 'false');

    if (data.shop_profiles && data.shop_profiles.length > 0) {
      await AsyncStorage.setItem(STORAGE_KEYS.SHOP_PROFILES, JSON.stringify(data.shop_profiles));
      await AsyncStorage.setItem(
        STORAGE_KEYS.CURRENT_SHOP_ID,
        data.shop_profiles[0].id.toString()
      );
    } else {
      await AsyncStorage.removeItem(STORAGE_KEYS.SHOP_PROFILES);
      await AsyncStorage.removeItem(STORAGE_KEYS.CURRENT_SHOP_ID);
    }
  };

  const saveRegistration = async () => {
    if (!emailOrPhone.trim()) {
      setDialogMessage('Email or phone is required.');
      setDialogVisible(true);
      return;
    }

    setSaving(true);
    try {
      const identifier = emailOrPhone.trim();
      const result = await register(
        identifier,
        password,
        role === 'client',
        role === 'shop'
      );

      await applyAuthSession(result, identifier);

      if (result.is_shop) {
        const route = await resolveShopEntryRoute();
        navigation.reset(buildShopAuthReset(route));
      } else if (result.is_client) {
        resetToClientDashboard(navigation);
      } else {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Login' }],
        });
      }
    } catch (err) {
      safeError('Registration failed', err);
      setDialogMessage(err.message || 'Failed to register');
      setDialogVisible(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenBackground safeArea={false}>
      <View style={{ flex: 1 }}>
        <KeyboardAwareScrollView
          contentContainerStyle={[
            styles.scroll,
            {
              paddingTop: headerReserve,
              paddingBottom: Math.max(insets.bottom, 16) + 24,
            },
          ]}
          keyboardShouldPersistTaps="always"
          enableOnAndroid
          extraScrollHeight={20}
        >
          <DashboardCard style={styles.authPanel}>
            <View style={BaseStyles.logoContainer}>
              <Logo width={88} height={88} />
            </View>
            <AuthLanguageSelector style={styles.langSelector} />

            <Text style={styles.title}>Create your account</Text>
            <Text style={styles.subtitle}>
              Choose client or service center, then add your sign-in details.
            </Text>

            <Text style={styles.rolePrompt}>Account type</Text>

            <View style={styles.roleContainer}>
              <Pressable
                onPress={() => setRole('client')}
                style={({ pressed }) => [
                  styles.roleButton,
                  role === 'client' && styles.roleButtonSelected,
                  pressed && styles.roleButtonPressed,
                ]}
              >
                <Text
                  style={[styles.roleTitle, role === 'client' && styles.roleTitleSelected]}
                >
                  Client
                </Text>
                <Text style={styles.roleSub}>Vehicles & repair history</Text>
              </Pressable>

              <Pressable
                onPress={() => setRole('shop')}
                style={({ pressed }) => [
                  styles.roleButton,
                  role === 'shop' && styles.roleButtonSelected,
                  pressed && styles.roleButtonPressed,
                ]}
              >
                <Text
                  style={[styles.roleTitle, role === 'shop' && styles.roleTitleSelected]}
                >
                  Service center
                </Text>
                <Text style={styles.roleSub}>Serve clients & manage jobs</Text>
              </Pressable>
            </View>

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

            {saving ? (
              <ActivityIndicator animating size="small" color={COLORS.PRIMARY} style={{ marginTop: 8 }} />
            ) : (
              <Button
                mode="contained"
                onPress={saveRegistration}
                style={styles.createButton}
                contentStyle={styles.createButtonContent}
                labelStyle={styles.createButtonLabel}
                buttonColor={theme.colors.primary}
              >
                Create account
              </Button>
            )}
          </DashboardCard>
        </KeyboardAwareScrollView>

        <Portal>
          <Dialog
            visible={dialogVisible}
            onDismiss={() => setDialogVisible(false)}
          >
            <Dialog.Title>Notice</Dialog.Title>
            <Dialog.Content>
              <Text>{dialogMessage}</Text>
            </Dialog.Content>
            <Dialog.Actions>
              <Button mode="text" onPress={() => setDialogVisible(false)}>
                OK
              </Button>
            </Dialog.Actions>
          </Dialog>
        </Portal>
      </View>
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
    fontSize: 26,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 8,
    textAlign: 'center',
  },
  langSelector: {
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.78)',
    textAlign: 'center',
    marginBottom: 22,
    lineHeight: 20,
  },
  input: {
    width: '100%',
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  rolePrompt: {
    fontSize: 14,
    marginBottom: 12,
    textAlign: 'center',
    fontWeight: '600',
    color: 'rgba(255,255,255,0.92)',
    letterSpacing: 0.2,
  },
  roleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 20,
  },
  roleButton: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: 'rgba(15,23,42,0.12)',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  roleButtonSelected: {
    borderColor: COLORS.PRIMARY,
    backgroundColor: 'rgba(37,99,235,0.07)',
  },
  roleButtonPressed: {
    opacity: 0.92,
  },
  roleTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#0F172A',
  },
  roleTitleSelected: {
    color: COLORS.PRIMARY,
    fontWeight: '700',
  },
  roleSub: {
    fontSize: 12,
    color: COLORS.TEXT_MUTED,
    marginTop: 4,
    textAlign: 'center',
    lineHeight: 16,
  },
  createButton: {
    marginTop: 4,
    borderRadius: 12,
    alignSelf: 'stretch',
  },
  createButtonContent: {
    height: 48,
  },
  createButtonLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});
