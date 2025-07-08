// PATH: src/screens/RegisterScreen.js

import React, { useState, useLayoutEffect } from 'react';
import { StyleSheet, View, SafeAreaView } from 'react-native';
import { Text, TextInput, useTheme, ToggleButton, Button, Portal, Dialog } from 'react-native-paper';
import { register } from '../api/auth';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

export default function RegisterScreen({ navigation }) {
  const theme = useTheme();

  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('client'); // 'client' or 'shop'

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
          labelStyle={{
            color: theme.colors.primary,
            fontSize: 16,
          }}
        >
          Save
        </Button>
      ),
    });
  }, [navigation, emailOrPhone, password, role]);

  const saveRegistration = async () => {
    setSaving(true);
    const isClient = role === 'client';
    const isShop = role === 'shop';

    try {
      await register(emailOrPhone.trim(), password, isClient, isShop);
      setDialogMessage('Registration successful!');
      setDialogVisible(true);

      setTimeout(() => {
        setDialogVisible(false);
        navigation.reset({
          index: 0,
          routes: [{ name: isShop ? 'ShopHome' : 'Home' }],
        });
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
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: 'center',
            padding: 20,
          }}
          keyboardShouldPersistTaps="always"
          enableOnAndroid
          extraScrollHeight={20}
        >
          <Text
            variant="headlineMedium"
            style={{
              textAlign: 'center',
              marginBottom: 20,
              color: theme.colors.primary,
            }}
          >
            Register New Account
          </Text>

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

          <Text style={{ marginBottom: 8, color: theme.colors.onBackground }}>
            Register as:
          </Text>
          <ToggleButton.Row
            onValueChange={setRole}
            value={role}
            style={styles.toggleGroup}
          >
            <ToggleButton icon="account" value="client">
              Client
            </ToggleButton>
            <ToggleButton icon="store" value="shop">
              Shop
            </ToggleButton>
          </ToggleButton.Row>

          {saving && <ActivityIndicator animating size="small" />}
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
  toggleGroup: {
    justifyContent: 'center',
    marginBottom: 20,
  },
});