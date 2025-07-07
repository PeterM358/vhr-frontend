// PATH: src/screens/CreateVehicleScreen.js

import React, { useEffect, useState } from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';
import { API_BASE_URL } from '../api/config';
import { Surface, Text, TextInput, Button, ActivityIndicator, Card, useTheme } from 'react-native-paper';

export default function CreateVehicleScreen({ navigation, route }) {
  const theme = useTheme();

  const clientEmail = route.params?.clientEmail || '';
  const clientPhone = route.params?.clientPhone || '';

  const [licensePlate, setLicensePlate] = useState('');
  const [year, setYear] = useState('');
  const [vin, setVin] = useState('');
  const [kilometers, setKilometers] = useState('');

  const [brands, setBrands] = useState([]);
  const [selectedBrand, setSelectedBrand] = useState('');
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState('');

  const [loadingBrands, setLoadingBrands] = useState(true);
  const [loadingModels, setLoadingModels] = useState(false);

  useEffect(() => {
    loadBrands();
  }, []);

  const loadBrands = async () => {
    try {
      const token = await AsyncStorage.getItem('@access_token');
      const res = await fetch(`${API_BASE_URL}/api/vehicles/brands/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load brands');
      const data = await res.json();
      setBrands(data);
    } catch (err) {
      console.error(err);
      alert('Error: Could not load brands');
    } finally {
      setLoadingBrands(false);
    }
  };

  const loadModelsForBrand = async (brandId) => {
    setModels([]);
    setSelectedModel('');
    if (!brandId) return;

    setLoadingModels(true);
    try {
      const token = await AsyncStorage.getItem('@access_token');
      const res = await fetch(`${API_BASE_URL}/api/vehicles/brands/${brandId}/models/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load models');
      const data = await res.json();
      setModels(data);
    } catch (err) {
      console.error(err);
      alert('Error: Could not load models');
    } finally {
      setLoadingModels(false);
    }
  };

  const handleBrandChange = (value) => {
    if (value) {
      setSelectedBrand(value);
      loadModelsForBrand(value);
    } else {
      setSelectedBrand('');
      setModels([]);
      setSelectedModel('');
    }
  };

  const handleSubmit = async () => {
    if (!licensePlate.trim() || !selectedBrand || !selectedModel) {
      alert('Please fill out all required fields.');
      return;
    }

    try {
      const token = await AsyncStorage.getItem('@access_token');
      const payload = {
        license_plate: licensePlate,
        brand: parseInt(selectedBrand),
        model: parseInt(selectedModel),
        year: year ? parseInt(year) : null,
        vin,
        kilometers: kilometers ? parseInt(kilometers) : null,
      };

      if (clientEmail) payload.client_email = clientEmail;
      if (clientPhone) payload.client_phone = clientPhone;

      const response = await fetch(`${API_BASE_URL}/api/vehicles/`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error data:', errorData);
        throw new Error('Failed to create vehicle');
      }

      alert('Vehicle created!');
      navigation.goBack();
    } catch (err) {
      console.error(err);
      alert(err.message || 'Failed to save vehicle');
    }
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      contentContainerStyle={{ padding: 16, paddingBottom: 50 }}
      keyboardShouldPersistTaps="handled"
    >
      <Surface style={styles.surface}>
        {(clientEmail || clientPhone) && (
          <Card style={styles.card}>
            <Card.Content>
              <Text variant="bodyMedium">
                Adding for: {clientEmail || clientPhone}
              </Text>
            </Card.Content>
          </Card>
        )}

        <Text variant="labelLarge" style={styles.label}>License Plate *</Text>
        <TextInput
          mode="outlined"
          placeholder="e.g. CA1234XX"
          value={licensePlate}
          onChangeText={setLicensePlate}
          style={styles.input}
        />

        <Text variant="labelLarge" style={styles.label}>Brand *</Text>
        {loadingBrands ? (
          <ActivityIndicator size="small" />
        ) : (
          <Picker
            selectedValue={selectedBrand}
            onValueChange={(val) => handleBrandChange(val)}
            style={styles.picker}
          >
            <Picker.Item label="Select Brand..." value="" />
            {brands.map((b) => (
              <Picker.Item key={b.id} label={b.name} value={String(b.id)} />
            ))}
          </Picker>
        )}

        <Text variant="labelLarge" style={styles.label}>Model *</Text>
        {loadingModels ? (
          <ActivityIndicator size="small" />
        ) : (
          <Picker
            selectedValue={selectedModel}
            onValueChange={(val) => setSelectedModel(val || '')}
            style={styles.picker}
            enabled={!!selectedBrand}
          >
            <Picker.Item
              label={selectedBrand ? 'Select Model...' : 'Choose Brand First'}
              value=""
            />
            {models.map((m) => (
              <Picker.Item key={m.id} label={m.name} value={String(m.id)} />
            ))}
          </Picker>
        )}

        <Text variant="labelLarge" style={styles.label}>Year</Text>
        <TextInput
          mode="outlined"
          placeholder="e.g. 2019"
          value={year}
          onChangeText={setYear}
          keyboardType="numeric"
          style={styles.input}
        />

        <Text variant="labelLarge" style={styles.label}>VIN (optional)</Text>
        <TextInput
          mode="outlined"
          placeholder="Vehicle Identification Number"
          value={vin}
          onChangeText={setVin}
          style={styles.input}
        />

        <Text variant="labelLarge" style={styles.label}>Kilometers</Text>
        <TextInput
          mode="outlined"
          placeholder="e.g. 85000"
          value={kilometers}
          onChangeText={setKilometers}
          keyboardType="numeric"
          style={styles.input}
        />

        <Button
          mode="contained"
          icon="check"
          onPress={handleSubmit}
          style={styles.saveButton}
        >
          Save Vehicle
        </Button>
      </Surface>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  surface: {
    flex: 1,
  },
  title: {
    textAlign: 'center',
    marginBottom: 16,
  },
  card: {
    marginVertical: 10,
  },
  label: {
    marginTop: 12,
    marginBottom: 4,
  },
  input: {
    marginBottom: 8,
  },
  picker: {
    backgroundColor: '#f4f4f4',
    borderRadius: 8,
    marginBottom: 8,
  },
  saveButton: {
    marginTop: 20,
  },
});