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

export default function ClientRequestRepairScreen({ route, navigation }) {
  const theme = useTheme();

  const vehicleId = route.params?.vehicleId;
  const [description, setDescription] = useState('');
  const [kilometers, setKilometers] = useState('');
  const [repairType, setRepairType] = useState('');
  const [repairTypes, setRepairTypes] = useState([]);
  const [loadingTypes, setLoadingTypes] = useState(false);

  useEffect(() => {
    const loadRepairTypes = async () => {
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
      } catch (err) {
        console.error('❌ Error loading repair types:', err);
        Alert.alert('Error', 'Could not load repair types. Please try again.');
      } finally {
        setLoadingTypes(false);
      }
    };

    loadRepairTypes();
  }, []);

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
    <ScrollView contentContainerStyle={styles.container}>
      <Text variant="titleLarge" style={styles.title}>Request Repair from Shop</Text>
      
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

      <Text variant="labelLarge" style={{ marginTop: 16 }}>Select Repair Type *</Text>

      {loadingTypes ? (
        <ActivityIndicator animating size="small" style={{ marginVertical: 8 }} />
      ) : (
        <Picker
          selectedValue={repairType}
          onValueChange={(itemValue) => setRepairType(itemValue)}
          style={styles.input}
        >
          <Picker.Item label="Select Repair Type" value="" />
          {repairTypes.map((type) => (
            <Picker.Item key={type.id} label={type.name} value={type.id} />
          ))}
        </Picker>
      )}

      <Button
        mode="contained"
        onPress={handleSubmit}
        style={{ marginTop: 20 }}
      >
        Submit Request
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  title: { marginBottom: 16 },
  input: { marginVertical: 8 },
});