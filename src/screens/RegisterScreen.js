import React, { useContext, useState, useMemo } from 'react';
import { ScrollView, StyleSheet, View, Pressable, Platform } from 'react-native';
import { Text, TextInput, Button, Portal, Dialog, ActivityIndicator, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { register } from '../api/auth';
import { AuthContext } from '../context/AuthManager';
import { STORAGE_KEYS } from '../constants/storageKeys';
import BaseStyles from '../styles/base';
import ScreenBackground from '../components/ScreenBackground';
import Logo from '../assets/images/logo.svg';
import { COLORS } from '../constants/colors';
import { buildShopAuthReset, resolveShopEntryRoute } from '../utils/shopAuthNavigation';
import { resetToClientDashboard } from '../navigation/authNavigation';
import { safeError } from '../utils/logger';
import DashboardCard from '../components/dashboard/DashboardCard';
import AuthLanguageSelector from '../components/auth/AuthLanguageSelector';
import { useTranslation } from '../i18n';

export default function RegisterScreen({ navigation }) {
  const theme = useTheme();
  const { t, locale } = useTranslation();
  const insets = useSafeAreaInsets();
  const headerReserve = insets.top + (Platform.OS === 'ios' ? 52 : 56);
  const { setIsAuthenticated, setAuthToken, setUserEmailOrPhone } = useContext(AuthContext);

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
      setDialogMessage(t('auth.emailOrPhoneRequired'));
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
        role === 'shop',
        locale
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
      setDialogMessage(err.message || t('auth.registerFailed'));
      setDialogVisible(true);
    } finally {
      setSaving(false);
    }
  };

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
        <DashboardCard style={styles.authPanel}>
          <View style={BaseStyles.logoContainer}>
            <Logo width={112} height={112} />
          </View>
          <AuthLanguageSelector style={styles.langSelector} />

          <Text style={styles.kicker}>{t('auth.signUp')}</Text>
          <Text style={styles.title}>{t('auth.signUpTitle')}</Text>
          <Text style={styles.subtitle}>{t('auth.signUpSubtitle')}</Text>

          <Text style={styles.rolePrompt}>{t('auth.accountType')}</Text>

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
                {t('auth.clientRole')}
              </Text>
              <Text
                style={[styles.roleSub, role === 'client' && styles.roleSubSelected]}
              >
                {t('auth.clientRoleDescription')}
              </Text>
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
                {t('auth.serviceCenterRole')}
              </Text>
              <Text
                style={[styles.roleSub, role === 'shop' && styles.roleSubSelected]}
              >
                {t('auth.serviceCenterRoleDescription')}
              </Text>
            </Pressable>
          </View>

          <TextInput
            label={t('auth.emailOrPhone')}
            mode="outlined"
            theme={authInputTheme}
            outlineColor="rgba(148,163,184,0.45)"
            activeOutlineColor="#60a5fa"
            textColor="#ffffff"
            outlineStyle={styles.inputOutline}
            value={emailOrPhone}
            onChangeText={setEmailOrPhone}
            keyboardType="email-address"
            autoCapitalize="none"
            style={styles.input}
          />

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

          {saving ? (
            <ActivityIndicator animating size="large" color={COLORS.PRIMARY} style={styles.loading} />
          ) : (
            <Button
              mode="contained"
              onPress={saveRegistration}
              style={[BaseStyles.loginButton, styles.createButton]}
              contentStyle={BaseStyles.loginButtonContent}
              labelStyle={BaseStyles.loginButtonLabel}
              buttonColor={theme.colors.primary}
            >
              {t('auth.registerSubmit')}
            </Button>
          )}

          <Button
            mode="text"
            onPress={() => navigation.navigate('Login')}
            textColor={COLORS.PRIMARY}
            style={styles.backBtn}
          >
            {t('auth.backToLogin')}
          </Button>
        </DashboardCard>
      </ScrollView>

      <Portal>
        <Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)}>
          <Dialog.Title>{t('common.notice')}</Dialog.Title>
          <Dialog.Content>
            <Text>{dialogMessage}</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button mode="text" onPress={() => setDialogVisible(false)}>
              {t('common.ok')}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
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
    marginBottom: 22,
    lineHeight: 20,
  },
  input: {
    width: '100%',
    marginBottom: 12,
    backgroundColor: '#07111f',
    borderRadius: 14,
    color: '#ffffff',
  },
  inputOutline: {
    borderRadius: 14,
    overflow: 'visible',
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
    borderColor: 'rgba(148,163,184,0.35)',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.CARD_DARK,
    opacity: 0.72,
  },
  roleButtonSelected: {
    borderColor: COLORS.PRIMARY,
    backgroundColor: 'rgba(37,99,235,0.28)',
    opacity: 1,
  },
  roleButtonPressed: {
    opacity: 0.88,
  },
  roleTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.72)',
  },
  roleTitleSelected: {
    color: '#ffffff',
    fontWeight: '700',
  },
  roleSub: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.55)',
    marginTop: 4,
    textAlign: 'center',
    lineHeight: 16,
  },
  roleSubSelected: {
    color: 'rgba(255,255,255,0.82)',
  },
  loading: {
    marginTop: 8,
  },
  createButton: {
    marginTop: 4,
    alignSelf: 'stretch',
  },
  backBtn: {
    marginTop: 12,
  },
});
