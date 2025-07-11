// PATH: src/screens/CreateVehicleScreen.js

import React, { useEffect, useState, useLayoutEffect } from 'react';
import {
  StyleSheet,
  View,
  SafeAreaView,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
import {
  getMakes,
  getModelsForMake,
} from '../api/vehicles';
import { API_BASE_URL } from '../api/config';

export default function CreateVehicleScreen({ navigation, route }) {
  const theme = useTheme();

  const clientEmail = route.params?.clientEmail || '';
  const clientPhone = route.params?.clientPhone || '';

  const [licensePlate, setLicensePlate] = useState('');
  const [vin, setVin] = useState('');
  const [kilometers, setKilometers] = useState('');
  const [year, setYear] = useState('');
  const [engineDisplacement, setEngineDisplacement] = useState('');
  const [engineHp, setEngineHp] = useState('');
  const [gearbox, setGearbox] = useState('');
  const [fuelType, setFuelType] = useState('');

  const [makes, setMakes] = useState([]);
  const [selectedMake, setSelectedMake] = useState('');
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState('');

  const [loadingMakes, setLoadingMakes] = useState(true);
  const [loadingModels, setLoadingModels] = useState(false);
  const [saving, setSaving] = useState(false);

  const [dialogVisible, setDialogVisible] = useState(false);
  const [dialogMessage, setDialogMessage] = useState('');

  useEffect(() => {
    loadMakes();
  }, []);

  useLayoutEffect(() => {
    const handleHeaderSave = () => {
      if (!licensePlate.trim()) return showError('License plate is required.');
      if (!selectedMake) return showError('Make is required.');
      if (!selectedModel) return showError('Model is required.');
      if (!year) return showError('Year is required.');
      if (!gearbox) return showError('Gearbox is required.');
      if (!fuelType) return showError('Fuel type is required.');

      saveVehicle();
    };

    navigation.setOptions({
      headerRight: () => (
        <Button
          mode="text"
          compact
          onPress={handleHeaderSave}
          labelStyle={{ color: '#fff', fontSize: 16 }} // White button text
        >
          Save
        </Button>
      ),
    });
  }, [navigation, licensePlate, selectedMake, selectedModel, year, gearbox, fuelType, engineDisplacement, engineHp, vin, kilometers]);

  const showError = (message) => {
    setDialogMessage(message);
    setDialogVisible(true);
  };

  const loadMakes = async () => {
    try {
      const data = await getMakes();
      setMakes(data);
    } catch (err) {
      console.error(err);
      showError('Error: Could not load Makes');
    } finally {
      setLoadingMakes(false);
    }
  };

  const loadModelsForMake = async (makeId) => {
    setModels([]);
    setSelectedModel('');

    if (!makeId) return;

    setLoadingModels(true);
    try {
      const data = await getModelsForMake(makeId);
      setModels(data);
    } catch (err) {
      console.error(err);
      showError('Error: Could not load models');
    } finally {
      setLoadingModels(false);
    }
  };

  const handleMakeChange = (value) => {
    setSelectedMake(value);
    if (value) loadModelsForMake(value);
    else setModels([]);
  };

  const saveVehicle = async () => {
    setSaving(true);
    try {
      const token = await AsyncStorage.getItem('@access_token');
      const payload = {
        license_plate: licensePlate,
        make: parseInt(selectedMake),
        model: parseInt(selectedModel),
        year: parseInt(year),
        engine_displacement: engineDisplacement ? parseInt(engineDisplacement) : null,
        engine_hp: engineHp ? parseInt(engineHp) : null,
        gearbox,
        fuel_type: fuelType,
        vin,
        kilometers: kilometers ? parseInt(kilometers) : null,
      };

      if (clientEmail) payload.client_email = clientEmail;
      if (clientPhone) payload.client_phone = clientPhone;

      console.log('Saving vehicle with payload:', payload);

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
      showError(err.message || 'Failed to save vehicle');
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

            <Text variant="labelLarge" style={styles.label}>Make *</Text>
            {loadingMakes ? (
              <ActivityIndicator size="small" />
            ) : (
              <Picker
                selectedValue={selectedMake}
                onValueChange={handleMakeChange}
                style={styles.picker}
              >
                <Picker.Item label="Select Make..." value="" />
                {makes.map((b) => (
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
                enabled={!!selectedMake}
              >
                <Picker.Item label={selectedMake ? 'Select Model...' : 'Choose Make First'} value="" />
                {models.map((m) => (
                  <Picker.Item key={m.id} label={m.name} value={String(m.id)} />
                ))}
              </Picker>
            )}

            <Text variant="labelLarge" style={styles.label}>Year *</Text>
            <TextInput
              mode="outlined"
              placeholder="e.g. 2019"
              value={year}
              onChangeText={setYear}
              keyboardType="numeric"
              style={styles.input}
            />

            <Text variant="labelLarge" style={styles.label}>Engine Displacement (cc)</Text>
            <TextInput
              mode="outlined"
              placeholder="e.g. 2000"
              value={engineDisplacement}
              onChangeText={setEngineDisplacement}
              keyboardType="numeric"
              style={styles.input}
            />

            <Text variant="labelLarge" style={styles.label}>Engine HP</Text>
            <TextInput
              mode="outlined"
              placeholder="e.g. 150"
              value={engineHp}
              onChangeText={setEngineHp}
              keyboardType="numeric"
              style={styles.input}
            />

            <Text variant="labelLarge" style={styles.label}>Gearbox *</Text>
            <Picker
              selectedValue={gearbox}
              onValueChange={(val) => setGearbox(val || '')}
              style={styles.picker}
            >
              <Picker.Item label="Select Gearbox..." value="" />
              <Picker.Item label="Manual" value="Manual" />
              <Picker.Item label="Automatic" value="Automatic" />
            </Picker>

            <Text variant="labelLarge" style={styles.label}>Fuel Type *</Text>
            <Picker
              selectedValue={fuelType}
              onValueChange={(val) => setFuelType(val || '')}
              style={styles.picker}
            >
              <Picker.Item label="Select Fuel Type..." value="" />
              <Picker.Item label="Petrol" value="Petrol" />
              <Picker.Item label="Diesel" value="Diesel" />
              <Picker.Item label="Electric" value="Electric" />
              <Picker.Item label="Hybrid" value="Hybrid" />
              <Picker.Item label="LPG" value="LPG" />
            </Picker>

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