// PATH: src/screens/ShopRegisterClientScreen.js

import React, { useState, useLayoutEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ScreenBackground from '../components/ScreenBackground';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Text,
  TextInput,
  ActivityIndicator,
  Button,
  Portal,
  Dialog,
} from 'react-native-paper';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { API_BASE_URL } from '../api/config';
import { stackContentPaddingTop } from '../navigation/stackContentInset';

export default function ShopRegisterClientScreen({ navigation }) {
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const [dialogVisible, setDialogVisible] = useState(false);
  const [dialogMessage, setDialogMessage] = useState('');

  useLayoutEffect(() => {
    const handleHeaderSave = () => {
      if (!email.trim() && !phone.trim()) {
        setDialogMessage('Please enter at least an Email or Phone number.');
        setDialogVisible(true);
        return;
      }
      saveClient();
    };

    navigation.setOptions({
      headerRight: () => (
        <Button
          mode="text"
          compact
          onPress={handleHeaderSave}
          labelStyle={{
            color: '#fff',
            fontSize: 16,
          }}
        >
          Save
        </Button>
      ),
    });
  }, [navigation, email, phone, password]);

  const saveClient = async () => {
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
      
      

      const response = await fetch(`${API_BASE_URL}/api/users/register/`, {
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

      setDialogMessage(`Client registered with ID: ${data.id}`);
      setDialogVisible(true);

      setTimeout(() => {
        setDialogVisible(false);
        navigation.goBack();
      }, 1500);
    } catch (err) {
      setDialogMessage(err.message);
      setDialogVisible(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenBackground safeArea={false}>
      <View style={{ flex: 1 }}>
        <KeyboardAwareScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[
            styles.container,
            {
              paddingTop: stackContentPaddingTop(insets, 8),
              paddingBottom: Math.max(insets.bottom, 16) + 100,
            },
          ]}
          keyboardShouldPersistTaps="always"
          enableOnAndroid
          extraScrollHeight={20}
        >
          <Text variant="labelLarge" style={styles.label}>Email (optional)</Text>
          <TextInput
            mode="outlined"
            placeholder="Enter client email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            style={styles.input}
          />

          <Text variant="labelLarge" style={styles.label}>Phone (optional)</Text>
          <TextInput
            mode="outlined"
            placeholder="+359..."
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            style={styles.input}
          />

          <Text variant="bodySmall" style={styles.subText}>
            Email or Phone is required.
          </Text>

          <Text variant="labelLarge" style={styles.label}>Password</Text>
          <TextInput
            mode="outlined"
            placeholder="Enter password"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            style={styles.input}
          />

          {loading && <ActivityIndicator animating={true} size="small" style={styles.loader} />}
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
              <Button
                mode="text"
                onPress={() => setDialogVisible(false)}
              >
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
  container: {
    paddingHorizontal: 16,
  },
  label: {
    marginTop: 16,
    marginBottom: 4,
    color: '#fff',
  },
  input: {
    marginBottom: 8,
  },
  subText: {
    marginBottom: 16,
    textAlign: 'center',
    color: 'rgba(255,255,255,0.7)',
  },
  loader: {
    marginTop: 20,
  },
});