// PATH: src/screens/RegisterScreen.js

import React, { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Text, TextInput, Button, useTheme, ToggleButton } from 'react-native-paper';
import { register } from '../api/auth';

export default function RegisterScreen({ navigation }) {
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('client'); // 'client' or 'shop'
  const [error, setError] = useState('');

  const theme = useTheme();

  const handleRegister = async () => {
    if (!emailOrPhone.trim()) {
      setError('Email or Phone number is required.');
      return;
    }

    const isClient = role === 'client';
    const isShop = role === 'shop';

    try {
      await register(emailOrPhone.trim(), password, isClient, isShop);
      navigation.reset({
        index: 0,
        routes: [{ name: isShop ? 'ShopHome' : 'Home' }],
      });
    } catch (err) {
      console.error('Registration error:', err);
      setError(err.message);
    }
  };

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
        Register New Account
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

      <Button
        mode="contained"
        onPress={handleRegister}
        style={{ marginTop: 24 }}
      >
        Register
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  toggleGroup: {
    justifyContent: 'center',
    marginBottom: 20,
  },
});