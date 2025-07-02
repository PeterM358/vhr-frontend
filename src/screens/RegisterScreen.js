import React, { useState } from 'react';
import { View, TextInput, Text, ScrollView, StyleSheet } from 'react-native';
import { register } from '../api/auth';
import SegmentedControlTab from 'react-native-segmented-control-tab';
import BASE_STYLES from '../styles/base';
import CommonButton from '../components/CommonButton';

export default function RegisterScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [selection, setSelection] = useState(0); // 0: Client, 1: Shop
  const [error, setError] = useState('');

  const handleRegister = async () => {
    if (!email.trim() && !phone.trim()) {
      setError('Email or Phone number is required.');
      return;
    }

    const isClient = selection === 0;
    const isShop = selection === 1;

    try {
      await register(email.trim(), phone.trim(), password, isClient, isShop);
      navigation.reset({
        index: 0,
        routes: [{ name: isShop ? 'ShopHome' : 'ClientVehicles' }],
      });
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <ScrollView contentContainerStyle={BASE_STYLES.overlay}>
      <Text style={BASE_STYLES.title}>Register New Account</Text>
      {error ? <Text style={BASE_STYLES.error}>{error}</Text> : null}

      <Text style={BASE_STYLES.label}>Email (optional)</Text>
      <TextInput
        style={BASE_STYLES.formInput}
        placeholder="Enter your email"
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

      <Text style={BASE_STYLES.label}>Register as:</Text>
      <SegmentedControlTab
        values={['Client', 'Shop']}
        selectedIndex={selection}
        onTabPress={setSelection}
        tabsContainerStyle={styles.segmented}
      />

      <CommonButton title="Register" onPress={handleRegister} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  segmented: {
    marginVertical: 16,
    maxWidth: 400,
    alignSelf: 'center',
    width: '100%',
  },
});