// PATH: src/screens/CreateRepairScreen.js

import React, { useState, useEffect } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';
import {
  Text,
  TextInput,
  Button,
  ActivityIndicator,
  useTheme,
} from 'react-native-paper';
import { API_BASE_URL } from '../api/config';

export default function CreateRepairScreen({ navigation, route }) {
  const theme = useTheme();

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
        alert('Error loading repair form data');
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

      alert('Repair created!');
      navigation.goBack();
    } catch (err) {
      console.error(err);
      alert(err.message || 'Submission failed');
    }
  };

  if (loading) return <ActivityIndicator animating={true} size="large" style={{ flex: 1 }} />;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <Text variant="labelLarge" style={styles.label}>Vehicle</Text>
      <View style={styles.pickerContainer}>
        <Picker selectedValue={vehicleId} onValueChange={setVehicleId}>
          {vehicles.map((v) => (
            <Picker.Item
              key={v.id}
              label={`${v.license_plate} (${v.brand_name} ${v.model_name})`}
              value={v.id.toString()}
            />
          ))}
        </Picker>
      </View>

      <Text variant="labelLarge" style={styles.label}>Repair Type</Text>
      <View style={styles.pickerContainer}>
        <Picker selectedValue={repairTypeId} onValueChange={setRepairTypeId}>
          {repairTypes.map((t) => (
            <Picker.Item key={t.id} label={t.name} value={t.id.toString()} />
          ))}
        </Picker>
      </View>

      <Text variant="labelLarge" style={styles.label}>Description</Text>
      <TextInput
        mode="outlined"
        value={description}
        onChangeText={setDescription}
        placeholder="Optional description"
        style={styles.input}
        multiline
      />

      <Text variant="labelLarge" style={styles.label}>Kilometers</Text>
      <TextInput
        mode="outlined"
        value={kilometers}
        onChangeText={setKilometers}
        placeholder="e.g. 95000"
        keyboardType="numeric"
        style={styles.input}
      />

      <Text variant="labelLarge" style={styles.label}>Status</Text>
      <View style={styles.pickerContainer}>
        <Picker selectedValue={status} onValueChange={setStatus}>
          <Picker.Item label="Done" value="done" />
          <Picker.Item label="Open" value="open" />
        </Picker>
      </View>

      <Button
        mode="contained"
        icon="check"
        onPress={handleSubmit}
        style={styles.button}
      >
        Create Repair
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
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  input: {
    marginBottom: 16,
  },
  button: {
    marginTop: 20,
  },
});