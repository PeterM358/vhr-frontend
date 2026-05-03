import React, { useState, useLayoutEffect } from 'react';
import { StyleSheet, View, Pressable, Platform } from 'react-native';
import { Text, TextInput, Button, Portal, Dialog, ActivityIndicator } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { register } from '../api/auth';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import BaseStyles from '../styles/base';
import ScreenBackground from '../components/ScreenBackground';
import Logo from '../assets/images/logo.svg';
import { COLORS } from '../constants/colors';

export default function RegisterScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const headerReserve = insets.top + (Platform.OS === 'ios' ? 52 : 56);

  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('client');
  const [saving, setSaving] = useState(false);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [dialogMessage, setDialogMessage] = useState('');

  useLayoutEffect(() => {
    const handleHeaderSave = () => {
      if (!emailOrPhone.trim()) {
        setDialogMessage('Email or Phone is required.');
        setDialogVisible(true);
        return;
      }
      saveRegistration();
    };

    navigation.setOptions({
      headerRight: () => (
        <Button
          mode="text"
          compact
          onPress={handleHeaderSave}
          labelStyle={{ color: '#fff', fontSize: 16 }}
        >
          Save
        </Button>
      ),
    });
  }, [navigation, emailOrPhone, password, role]);

  const saveRegistration = async () => {
    setSaving(true);
    try {
      const result = await register(
        emailOrPhone.trim(),
        password,
        role === 'client',
        role === 'shop'
      );

      setDialogMessage('Registration successful!');
      setDialogVisible(true);

      setTimeout(() => {
        setDialogVisible(false);
        if (result.is_shop) {
          navigation.reset({
            index: 0,
            routes: [{ name: 'ShopHome' }],
          });
        } else if (result.is_client) {
          navigation.reset({
            index: 0,
            routes: [{ name: 'Home' }],
          });
        } else {
          // fallback
          navigation.reset({
            index: 0,
            routes: [{ name: 'Login' }],
          });
        }
      }, 1500);
    } catch (err) {
      console.error('Registration error:', err);
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
          <View style={styles.sheet}>
            <View style={BaseStyles.logoContainer}>
              <Logo width={88} height={88} />
            </View>

            <Text style={styles.kicker}>Join</Text>
            <Text style={styles.title}>Create your account</Text>
            <Text style={styles.subtitle}>
              Add your credentials and pick how you will use Vehicle Repair Hub.
            </Text>

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
                  Repair shop
                </Text>
                <Text style={styles.roleSub}>Serve clients & manage jobs</Text>
              </Pressable>
            </View>

            {saving && (
              <ActivityIndicator animating size="small" color={COLORS.PRIMARY} style={{ marginTop: 8 }} />
            )}
          </View>
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
  sheet: {
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
    color: COLORS.TEXT_DARK,
    letterSpacing: 0.2,
  },
  roleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
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
    color: COLORS.TEXT_DARK,
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
});