import React, { useState } from 'react';
import { TextInput, Text, ScrollView, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BASE_STYLES from '../styles/base';
import CommonButton from '../components/CommonButton';

export default function ShopRegisterClientScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRegister = async () => {
    if (!email.trim() && !phone.trim()) {
      setError('Please enter at least an Email or Phone number.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('@access_token');
      const payload = {
        is_client: true,
        is_shop: false,
        password,
      };
      if (email.trim()) payload.email = email.trim();
      if (phone.trim()) payload.phone = phone.trim();

      const response = await fetch('http://127.0.0.1:8000/api/users/register/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        let msg = 'Failed to register client.';
        if (typeof data === 'object') {
          msg = Object.entries(data)
            .map(([field, errors]) => `${field}: ${errors.join(', ')}`)
            .join('\n');
        }
        throw new Error(msg);
      }

      Alert.alert('Success', `Client registered with ID: ${data.id}`);
      navigation.goBack();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={BASE_STYLES.overlay}>
      <Text style={BASE_STYLES.title}>Register New Client</Text>
      {error ? <Text style={BASE_STYLES.error}>{error}</Text> : null}

      <Text style={BASE_STYLES.label}>Email (optional)</Text>
      <TextInput
        style={BASE_STYLES.formInput}
        placeholder="Enter client email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <Text style={BASE_STYLES.label}>Phone (optional)</Text>
      <TextInput
        style={BASE_STYLES.formInput}
        placeholder="+359..."
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
      />

      <Text style={BASE_STYLES.subText}>
        Email or Phone is required.
      </Text>

      <Text style={BASE_STYLES.label}>Password</Text>
      <TextInput
        style={BASE_STYLES.formInput}
        placeholder="Enter password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      {loading ? (
        <ActivityIndicator size="large" style={styles.loader} />
      ) : (
        <CommonButton title="Register Client" onPress={handleRegister} />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  loader: { marginTop: 20 },
});