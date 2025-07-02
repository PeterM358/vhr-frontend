import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';
import { API_BASE_URL } from '../api/config';
import BASE_STYLES from '../styles/base';
import CommonButton from '../components/CommonButton';

export default function CreateVehicleScreen({ navigation, route }) {
  // Get passed client info
  const clientEmail = route.params?.clientEmail || '';
  const clientPhone = route.params?.clientPhone || '';

  // Form state
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
      Alert.alert('Error', 'Could not load brands');
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
      Alert.alert('Error', 'Could not load models');
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
      Alert.alert('Missing Info', 'Please fill out all required fields.');
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

      // Only pass client info if provided
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

      Alert.alert('Success', 'Vehicle created!');
      navigation.goBack();
    } catch (err) {
      console.error(err);
      Alert.alert('Error', err.message || 'Failed to save vehicle');
    }
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: 'rgba(210,255,255,0.9)' }}
      contentContainerStyle={{ padding: 16, paddingBottom: 50 }}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={BASE_STYLES.title}>Add New Vehicle</Text>

      {(clientEmail || clientPhone) && (
        <View style={BASE_STYLES.card}>
          <Text style={BASE_STYLES.subText}>
            Adding for: {clientEmail ? clientEmail : clientPhone}
          </Text>
        </View>
      )}

      <Text style={BASE_STYLES.label}>License Plate *</Text>
      <TextInput
        style={BASE_STYLES.formInput}
        placeholder="e.g. CA1234XX"
        value={licensePlate}
        onChangeText={setLicensePlate}
      />

      <Text style={BASE_STYLES.label}>Brand *</Text>
      {loadingBrands ? (
        <ActivityIndicator size="small" />
      ) : (
        <Picker
          selectedValue={selectedBrand || ''}
          onValueChange={(val) => handleBrandChange(val)}
          style={BASE_STYLES.picker}
        >
          <Picker.Item label="Select Brand..." value="" />
          {brands.map((b) => (
            <Picker.Item key={b.id} label={b.name} value={String(b.id)} />
          ))}
        </Picker>
      )}

      <Text style={BASE_STYLES.label}>Model *</Text>
      {loadingModels ? (
        <ActivityIndicator size="small" />
      ) : (
        <Picker
          selectedValue={selectedModel || ''}
          onValueChange={(val) => setSelectedModel(val || '')}
          style={BASE_STYLES.picker}
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

      <Text style={BASE_STYLES.label}>Year</Text>
      <TextInput
        style={BASE_STYLES.formInput}
        placeholder="e.g. 2019"
        value={year}
        onChangeText={setYear}
        keyboardType="numeric"
      />

      <Text style={BASE_STYLES.label}>VIN (optional)</Text>
      <TextInput
        style={BASE_STYLES.formInput}
        placeholder="Vehicle Identification Number"
        value={vin}
        onChangeText={setVin}
      />

      <Text style={BASE_STYLES.label}>Kilometers</Text>
      <TextInput
        style={BASE_STYLES.formInput}
        placeholder="e.g. 85000"
        value={kilometers}
        onChangeText={setKilometers}
        keyboardType="numeric"
      />

      <View style={{ marginTop: 20 }}>
        <CommonButton title="✅ Save Vehicle" onPress={handleSubmit} />
      </View>
    </ScrollView>
  );
}