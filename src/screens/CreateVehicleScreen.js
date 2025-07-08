// PATH: src/screens/CreateVehicleScreen.js

import React, { useEffect, useState, useLayoutEffect } from 'react';
import {
  StyleSheet,
  View,
  SafeAreaView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';
import {
  API_BASE_URL
} from '../api/config';
import {
  Surface,
  Text,
  TextInput,
  ActivityIndicator,
  Card,
  useTheme,
  Button,
  Portal,
  Dialog,
} from 'react-native-paper';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

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
  const [saving, setSaving] = useState(false);

  const [dialogVisible, setDialogVisible] = useState(false);
  const [dialogMessage, setDialogMessage] = useState('');

  useEffect(() => {
    loadBrands();
  }, []);

  useLayoutEffect(() => {
    const handleHeaderSave = () => {
      if (!licensePlate.trim()) {
        setDialogMessage('License plate is required.');
        setDialogVisible(true);
        return;
      }

      if (!selectedBrand) {
        setDialogMessage('Brand is required.');
        setDialogVisible(true);
        return;
      }

      if (!selectedModel) {
        setDialogMessage('Model is required.');
        setDialogVisible(true);
        return;
      }

      saveVehicle();
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
  }, [navigation, licensePlate, selectedBrand, selectedModel, year, vin, kilometers]);

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
      setDialogMessage('Error: Could not load brands');
      setDialogVisible(true);
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
      setDialogMessage('Error: Could not load models');
      setDialogVisible(true);
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

  const saveVehicle = async () => {
    setSaving(true);
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

      setDialogMessage('Vehicle created!');
      setDialogVisible(true);

      setTimeout(() => {
        setDialogVisible(false);
        navigation.goBack();
      }, 1500);
    } catch (err) {
      console.error(err);
      setDialogMessage(err.message || 'Failed to save vehicle');
      setDialogVisible(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <View style={{ flex: 1 }}>
        <KeyboardAwareScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          keyboardShouldPersistTaps="always"
          enableOnAndroid
          extraScrollHeight={20}
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
                onValueChange={handleBrandChange}
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

            {saving && <ActivityIndicator animating size="small" />}
          </Surface>
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
  surface: {
    flex: 1,
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
});