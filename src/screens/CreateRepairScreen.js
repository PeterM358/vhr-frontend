// src/screens/CreateRepairScreen.js
import React, { useState, useEffect } from 'react';
import {
  ScrollView,
  View,
  Text,
  TextInput,
  Button,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../api/config';

export default function CreateRepairScreen({ navigation, route }) {
  const preselectedVehicleId = route.params?.vehicleId?.toString() || '';
  const [vehicles, setVehicles] = useState([]);
  const [repairTypes, setRepairTypes] = useState([]);
  const [vehicleId, setVehicleId] = useState(preselectedVehicleId);
  const [repairTypeId, setRepairTypeId] = useState('');
  const [description, setDescription] = useState('');
  const [kilometers, setKilometers] = useState('');
  const [status, setStatus] = useState('done');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFormData = async () => {
      try {
        const token = await AsyncStorage.getItem('@access_token');
        const [vehicleRes, typeRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/vehicles/`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API_BASE_URL}/api/repairs/types/`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        if (!vehicleRes.ok || !typeRes.ok) throw new Error('Failed to fetch form data');

        const vehicleData = await vehicleRes.json();
        const typeData = await typeRes.json();

        setVehicles(vehicleData);
        setRepairTypes(typeData);

        if (!preselectedVehicleId && vehicleData.length > 0) {
          setVehicleId(vehicleData[0].id.toString());
        }
        if (typeData.length > 0) setRepairTypeId(typeData[0].id.toString());
      } catch (err) {
        console.error(err);
        Alert.alert('Error', 'Failed to load repair form data');
      } finally {
        setLoading(false);
      }
    };
    fetchFormData();
  }, []);

  const handleSubmit = async () => {
    try {
      const token = await AsyncStorage.getItem('@access_token');
      const response = await fetch(`${API_BASE_URL}/api/repairs/`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          vehicle: parseInt(vehicleId),
          repair_type: parseInt(repairTypeId),
          description,
          kilometers: parseInt(kilometers),
          status,
        }),
      });

      if (!response.ok) throw new Error('Failed to create repair');

      Alert.alert('Success', 'Repair created!');
      navigation.goBack();
    } catch (err) {
      console.error(err);
      Alert.alert('Error', err.message || 'Submission failed');
    }
  };

  if (loading) return <ActivityIndicator size="large" style={{ flex: 1 }} />;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.label}>Vehicle</Text>
      <Picker selectedValue={vehicleId} onValueChange={setVehicleId} style={styles.picker}>
        {vehicles.map((v) => (
          <Picker.Item
            key={v.id}
            label={`${v.license_plate} (${v.brand_name} ${v.model_name})`}
            value={v.id.toString()}
          />
        ))}
      </Picker>

      <Text style={styles.label}>Repair Type</Text>
      <Picker selectedValue={repairTypeId} onValueChange={setRepairTypeId} style={styles.picker}>
        {repairTypes.map((t) => (
          <Picker.Item key={t.id} label={t.name} value={t.id.toString()} />
        ))}
      </Picker>

      <Text style={styles.label}>Description</Text>
      <TextInput style={styles.input} value={description} onChangeText={setDescription} placeholder="Optional description" />

      <Text style={styles.label}>Kilometers</Text>
      <TextInput
        style={styles.input}
        value={kilometers}
        onChangeText={setKilometers}
        placeholder="e.g. 95000"
        keyboardType="numeric"
      />

      <Text style={styles.label}>Status</Text>
      <Picker selectedValue={status} onValueChange={setStatus} style={styles.picker}>
        <Picker.Item label="Done" value="done" />
        <Picker.Item label="Open" value="open" />
      </Picker>

      <Button title="Create Repair" onPress={handleSubmit} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 20 },
  label: { marginTop: 10, fontWeight: 'bold' },
  picker: { backgroundColor: '#eee', marginVertical: 5 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    marginVertical: 5,
    borderRadius: 6,
  },
});
