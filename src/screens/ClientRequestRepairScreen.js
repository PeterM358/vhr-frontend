/**
 * PATH: src/screens/ClientRequestRepairScreen.js
 */

import React, { useState, useEffect } from 'react';
import { View, ScrollView, Alert, StyleSheet } from 'react-native';
import { Text, TextInput, Button, useTheme, ActivityIndicator } from 'react-native-paper';
import { Picker } from '@react-native-picker/picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { API_BASE_URL } from '../api/config';
import BASE_STYLES from '../styles/base';
import ScreenBackground from '../components/ScreenBackground';

export default function ClientRequestRepairScreen({ route, navigation }) {
  const theme = useTheme();

  const vehicleId = route.params?.vehicleId;
  const [description, setDescription] = useState('');
  const [kilometers, setKilometers] = useState('');
  const [repairType, setRepairType] = useState('');
  const [repairTypes, setRepairTypes] = useState([]);
  const [loadingTypes, setLoadingTypes] = useState(false);
  const [serviceCenterLabel, setServiceCenterLabel] = useState('Service Center');

  const centerLabelForVehicleType = (vehicleTypeCode, vehicleTypeName) => {
    const code = String(vehicleTypeCode || '').toLowerCase();
    if (['car', 'van', 'truck'].includes(code)) return 'Auto Service Center';
    if (['motorcycle', 'scooter'].includes(code)) return 'Motorcycle Service Center';
    if (code === 'bicycle') return 'Bicycle Service Center';
    if (code === 'ebike') return 'E-bike Service Center';
    if (code === 'trailer') return 'Trailer Service Center';
    const n = String(vehicleTypeName || '').trim();
    if (n) return `${n} Service Center`;
    return 'Service Center';
  };

  useEffect(() => {
    const loadFormContext = async () => {
      setLoadingTypes(true);
      try {
        const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
        const response = await fetch(`${API_BASE_URL}/api/repairs/types/`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          setRepairTypes(await response.json());
        } else {
          throw new Error('Failed to fetch repair types');
        }

        if (vehicleId) {
          const vehicleRes = await fetch(`${API_BASE_URL}/api/vehicles/${vehicleId}/`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (vehicleRes.ok) {
            const vehicle = await vehicleRes.json();
            setServiceCenterLabel(
              centerLabelForVehicleType(vehicle.vehicle_type_code, vehicle.vehicle_type_name)
            );
          }
        }
      } catch (err) {
        console.error('❌ Error loading request context:', err);
        Alert.alert('Error', 'Could not load repair data. Please try again.');
      } finally {
        setLoadingTypes(false);
      }
    };

    loadFormContext();
  }, [vehicleId]);

  const handleSubmit = async () => {
    if (!vehicleId) {
      Alert.alert('Error', 'Missing vehicle ID.');
      return;
    }
    if (!repairType) {
      Alert.alert('Error', 'Please select repair type.');
      return;
    }

    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      const payload = {
        vehicle: vehicleId,
        repair_type: repairType,
        description,
        kilometers: parseInt(kilometers) || 0,
        status: 'open',
      };

      console.log('📤 Creating Repair Request with:', payload);

      const response = await fetch(`${API_BASE_URL}/api/repairs/repair/`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        Alert.alert('Success', 'Repair request created as OPEN.');
        navigation.goBack();
      } else {
        const errorText = await response.text();
        console.error('❌ Error creating repair:', errorText);
        Alert.alert('Error', 'Failed to create repair request.');
      }
    } catch (err) {
      console.error('❌ Exception:', err);
      Alert.alert('Error', 'An unexpected error occurred.');
    }
  };

  return (
    <ScreenBackground>
    <ScrollView contentContainerStyle={BASE_STYLES.formScreen}>
      <Text variant="titleMedium" style={styles.contextTitle}>
        Request from {serviceCenterLabel}
      </Text>
      
      <TextInput
        mode="outlined"
        label="Description"
        value={description}
        onChangeText={setDescription}
        style={styles.input}
      />
      
      <TextInput
        mode="outlined"
        label="Kilometers"
        keyboardType="numeric"
        value={kilometers}
        onChangeText={setKilometers}
        style={styles.input}
      />

      <Text variant="labelLarge" style={styles.pickerLabel}>Select Repair Type *</Text>

      {loadingTypes ? (
        <ActivityIndicator animating size="small" style={{ marginVertical: 8 }} />
      ) : (
        <View style={styles.pickerWrap}>
          <Picker
            selectedValue={repairType}
            onValueChange={(itemValue) => setRepairType(itemValue)}
            style={styles.picker}
            dropdownIconColor="#0f172a"
          >
            <Picker.Item label="Select Repair Type" value="" />
            {repairTypes.map((type) => (
              <Picker.Item key={type.id} label={type.name} value={type.id} />
            ))}
          </Picker>
        </View>
      )}

      <Button
        mode="contained"
        onPress={handleSubmit}
        style={{ marginTop: 20 }}
      >
        Submit Request
      </Button>
    </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  contextTitle: { marginBottom: 12, color: 'rgba(255,255,255,0.92)', fontWeight: '600' },
  input: { marginVertical: 8 },
  pickerLabel: {
    marginTop: 16,
    color: '#fff',
    fontWeight: '600',
  },
  pickerWrap: {
    marginTop: 8,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.12)',
    backgroundColor: 'rgba(255,255,255,0.95)',
    overflow: 'hidden',
  },
  picker: {
    color: '#0f172a',
    backgroundColor: 'rgba(255,255,255,0.95)',
  },
});