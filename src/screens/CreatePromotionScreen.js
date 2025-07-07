// PATH: src/screens/CreatePromotionScreen.js

import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  View,
  StyleSheet,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';
import { ActivityIndicator, Text, TextInput, Button, useTheme } from 'react-native-paper';
import { API_BASE_URL } from '../api/config';
import { STORAGE_KEYS } from '../constants/storageKeys';

import DropDown from "react-native-paper-dropdown";

export default function CreatePromotionScreen({ navigation }) {
  const theme = useTheme();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [validFrom, setValidFrom] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [maxBookings, setMaxBookings] = useState('');

  const [repairTypes, setRepairTypes] = useState([]);
  const [selectedRepairType, setSelectedRepairType] = useState('');
  const [loadingTypes, setLoadingTypes] = useState(true);

  
  useEffect(() => {
    fetchRepairTypes();
  }, []);

  const fetchRepairTypes = async () => {
    setLoadingTypes(true);
    try {
      const token = await AsyncStorage.getItem('@access_token');
      const res = await fetch(`${API_BASE_URL}/api/repairs/types/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setRepairTypes(data);
    } catch (err) {
      console.error('Error fetching repair types:', err);
    } finally {
      setLoadingTypes(false);
    }
  };

  const handleSubmit = async () => {
    if (!title.trim() || !price || !selectedRepairType) {
      alert('Please fill out all required fields.');
      return;
    }

    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      const response = await fetch(`${API_BASE_URL}/api/offers/`, {
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
        }),
      });

      if (!response.ok) throw new Error('Failed to create promotion');
      alert('Promotion created!');
      navigation.goBack();
    } catch (err) {
      console.error(err);
      alert(err.message || 'Failed to save promotion');
    }
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <Text variant="labelLarge" style={styles.label}>Title *</Text>
      <TextInput
        mode="outlined"
        placeholder="e.g. Oil Change Special"
        value={title}
        onChangeText={setTitle}
        style={styles.input}
      />

      <Text variant="labelLarge" style={styles.label}>Description</Text>
      <TextInput
        mode="outlined"
        placeholder="Promotion details"
        value={description}
        onChangeText={setDescription}
        multiline
        style={styles.input}
      />

      <Text variant="labelLarge" style={styles.label}>Repair Type *</Text>
      {loadingTypes ? (
        <ActivityIndicator animating={true} size="small" />
      ) : (
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={selectedRepairType}
            onValueChange={(val) => setSelectedRepairType(val || '')}
          >
            <Picker.Item label="Select Repair Type..." value="" />
            {repairTypes.map((rt) => (
              <Picker.Item key={rt.id} label={rt.name} value={String(rt.id)} />
            ))}
          </Picker>
        </View>
      )}

      <Text variant="labelLarge" style={styles.label}>Price (BGN) *</Text>
      <TextInput
        mode="outlined"
        placeholder="e.g. 50"
        value={price}
        onChangeText={setPrice}
        keyboardType="numeric"
        style={styles.input}
      />

      <Text variant="labelLarge" style={styles.label}>Valid From (YYYY-MM-DD)</Text>
      <TextInput
        mode="outlined"
        placeholder="e.g. 2024-06-01"
        value={validFrom}
        onChangeText={setValidFrom}
        style={styles.input}
      />

      <Text variant="labelLarge" style={styles.label}>Valid Until (YYYY-MM-DD)</Text>
      <TextInput
        mode="outlined"
        placeholder="e.g. 2024-12-31"
        value={validUntil}
        onChangeText={setValidUntil}
        style={styles.input}
      />

      <Text variant="labelLarge" style={styles.label}>Max Bookings (optional)</Text>
      <TextInput
        mode="outlined"
        placeholder="e.g. 10"
        value={maxBookings}
        onChangeText={setMaxBookings}
        keyboardType="numeric"
        style={styles.input}
      />

      <Button
        mode="contained"
        icon="check"
        onPress={handleSubmit}
        style={styles.button}
      >
        Save Promotion
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 50,
  },
  title: {
    marginBottom: 16,
    textAlign: 'center',
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
  button: {
    marginTop: 20,
  },
});