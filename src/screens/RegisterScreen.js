// PATH: src/screens/RegisterScreen.js

import React, { useState, useLayoutEffect } from 'react';
import { StyleSheet, View, SafeAreaView, Pressable } from 'react-native';
import { Text, TextInput, useTheme, Button, Portal, Dialog, ActivityIndicator } from 'react-native-paper';
import { register } from '../api/auth';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

export default function RegisterScreen({ navigation }) {
  const theme = useTheme();

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
          labelStyle={{ color: '#fff', fontSize: 16 }} // White button text
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
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <View style={{ flex: 1 }}>
        <KeyboardAwareScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="always"
          enableOnAndroid
          extraScrollHeight={20}
        >
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

          <Text style={styles.rolePrompt}>Select your role:</Text>

          <View style={styles.roleContainer}>
            <Pressable
              onPress={() => setRole('client')}
              style={({ pressed }) => [
                styles.roleButton,
                {
                  backgroundColor: role === 'client'
                    ? theme.colors.primaryContainer
                    : 'transparent',
                  borderColor: role === 'client'
                    ? theme.colors.primary
                    : '#ccc',
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <Text
                style={[
                  styles.roleText,
                  role === 'client' && { color: theme.colors.primary }
                ]}
              >
                👤 Client
              </Text>
              <Text style={styles.roleSubtext}>Manage your vehicles & repairs</Text>
            </Pressable>

            <Pressable
              onPress={() => setRole('shop')}
              style={({ pressed }) => [
                styles.roleButton,
                {
                  backgroundColor: role === 'shop'
                    ? theme.colors.primaryContainer
                    : 'transparent',
                  borderColor: role === 'shop'
                    ? theme.colors.primary
                    : '#ccc',
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <Text
                style={[
                  styles.roleText,
                  role === 'shop' && { color: theme.colors.primary }
                ]}
              >
                🛠️ Repair Shop
              </Text>
              <Text style={styles.roleSubtext}>Offer services & manage client fleet</Text>
            </Pressable>
          </View>

          {saving && <ActivityIndicator animating size="small" color={theme.colors.primary} />}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  input: {
    marginBottom: 16,
  },
  rolePrompt: {
    fontSize: 16,
    marginBottom: 10,
    textAlign: 'center',
    fontWeight: '600',
  },
  roleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 20,
  },
  roleButton: {
    flex: 1,
    borderWidth: 2,
    borderRadius: 12,
    paddingVertical: 20,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  roleSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
});