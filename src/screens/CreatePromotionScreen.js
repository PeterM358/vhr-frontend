import React, { useEffect, useState, useLayoutEffect } from 'react';
import {
  StyleSheet,
  View,
  SafeAreaView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';
import {
  ActivityIndicator,
  Text,
  TextInput,
  useTheme,
  Portal,
  Dialog,
  Button,
} from 'react-native-paper';
import { API_BASE_URL } from '../api/config';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

export default function CreatePromotionScreen({ navigation }) {
  const theme = useTheme();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [validFrom, setValidFrom] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [maxBookings, setMaxBookings] = useState('');

  const [repairTypes, setRepairTypes] = useState([]);
  const [selectedRepairType, setSelectedRepairType] = useState(null);
  const [loadingTypes, setLoadingTypes] = useState(true);

  const [dialogVisible, setDialogVisible] = useState(false);
  const [dialogMessage, setDialogMessage] = useState('');

  useEffect(() => {
    fetchRepairTypes();
  }, []);

  useLayoutEffect(() => {
    const handleHeaderSave = () => {
      if (!title.trim()) {
        setDialogMessage('Title is required.');
        setDialogVisible(true);
        return;
      }

      if (!price || isNaN(parseFloat(price))) {
        setDialogMessage('Valid price is required.');
        setDialogVisible(true);
        return;
      }

      if (!selectedRepairType) {
        setDialogMessage('Repair type is required.');
        setDialogVisible(true);
        return;
      }

      savePromotion();
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
  }, [navigation, title, price, selectedRepairType, description, validFrom, validUntil, maxBookings]);

  const fetchRepairTypes = async () => {
    setLoadingTypes(true);
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      const res = await fetch(`${API_BASE_URL}/api/repairs/types/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      setRepairTypes(data);
      if (data.length) {
        setSelectedRepairType(String(data[0].id));
      }
    } catch (err) {
      console.error('Error fetching repair types:', err);
    } finally {
      setLoadingTypes(false);
    }
  };

  const savePromotion = async () => {
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      const shopProfileId = await AsyncStorage.getItem(STORAGE_KEYS.CURRENT_SHOP_ID);
      const response = await fetch(`${API_BASE_URL}/api/promotions/`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          description,
          repair_type: parseInt(selectedRepairType),
          price: parseFloat(price),
          valid_from: validFrom || null,
          valid_until: validUntil || null,
          max_bookings: maxBookings ? parseInt(maxBookings) : null,
          is_promotion: true,
          shop_profile_id: parseInt(shopProfileId),
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(errorText);
        throw new Error('Failed to create promotion');
      }

      setDialogMessage('Promotion created!');
      setDialogVisible(true);

      setTimeout(() => {
        setDialogVisible(false);
        navigation.goBack();
      }, 1500);
    } catch (err) {
      console.error(err);
      setDialogMessage(err.message || 'Failed to save promotion');
      setDialogVisible(true);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <View style={{ flex: 1 }}>
        <KeyboardAwareScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="always"
          enableOnAndroid
          extraScrollHeight={20}
        >
          <Text variant="labelLarge" style={styles.label}>Title *</Text>
          <TextInput
            mode="outlined"
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Oil Change Special"
            style={styles.input}
          />

          <Text variant="labelLarge" style={styles.label}>Description</Text>
          <TextInput
            mode="outlined"
            value={description}
            onChangeText={setDescription}
            multiline
            placeholder="Promotion details"
            style={styles.input}
          />

          <Text variant="labelLarge" style={styles.label}>Repair Type *</Text>
          {loadingTypes ? (
            <ActivityIndicator animating size="small" />
          ) : (
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={selectedRepairType}
                onValueChange={(val) => setSelectedRepairType(val)}
              >
                {repairTypes.map((rt) => (
                  <Picker.Item key={rt.id} label={rt.name} value={String(rt.id)} />
                ))}
              </Picker>
            </View>
          )}

          <Text variant="labelLarge" style={styles.label}>Price (BGN) *</Text>
          <TextInput
            mode="outlined"
            value={price}
            onChangeText={setPrice}
            keyboardType="numeric"
            placeholder="e.g. 50"
            style={styles.input}
          />

          <Text variant="labelLarge" style={styles.label}>Valid From (YYYY-MM-DD)</Text>
          <TextInput
            mode="outlined"
            value={validFrom}
            onChangeText={setValidFrom}
            placeholder="e.g. 2024-06-01"
            style={styles.input}
          />

          <Text variant="labelLarge" style={styles.label}>Valid Until (YYYY-MM-DD)</Text>
          <TextInput
            mode="outlined"
            value={validUntil}
            onChangeText={setValidUntil}
            placeholder="e.g. 2024-12-31"
            style={styles.input}
          />

          <Text variant="labelLarge" style={styles.label}>Max Bookings (optional)</Text>
          <TextInput
            mode="outlined"
            value={maxBookings}
            onChangeText={setMaxBookings}
            keyboardType="numeric"
            placeholder="e.g. 10"
            style={styles.input}
          />
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 100,
  },
  label: {
    marginTop: 16,
    marginBottom: 4,
  },
  input: {
    marginBottom: 8,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    marginBottom: 16,
    backgroundColor: '#fff',
  },
});