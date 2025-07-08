// PATH: src/screens/CreateRepairScreen.js

import React, { useState, useEffect, useLayoutEffect } from 'react';
import {
  StyleSheet,
  View,
  SafeAreaView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';
import {
  Text,
  TextInput,
  Button,
  ActivityIndicator,
  useTheme,
  Portal,
  Dialog,
} from 'react-native-paper';
import { API_BASE_URL } from '../api/config';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

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
  const [saving, setSaving] = useState(false);

  const [dialogVisible, setDialogVisible] = useState(false);
  const [dialogMessage, setDialogMessage] = useState('');

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
        setDialogMessage('Error loading form data');
        setDialogVisible(true);
      } finally {
        setLoading(false);
      }
    };
    fetchFormData();
  }, []);

  useLayoutEffect(() => {
    const handleHeaderSave = () => {
      if (!vehicleId) {
        setDialogMessage('Vehicle is required.');
        setDialogVisible(true);
        return;
      }

      if (!repairTypeId) {
        setDialogMessage('Repair type is required.');
        setDialogVisible(true);
        return;
      }

      saveRepair();
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
  }, [navigation, vehicleId, repairTypeId, description, kilometers, status]);

  const saveRepair = async () => {
    setSaving(true);
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
          kilometers: kilometers ? parseInt(kilometers) : null,
          status,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(errorText);
        throw new Error('Failed to create repair');
      }

      setDialogMessage('Repair created!');
      setDialogVisible(true);

      setTimeout(() => {
        setDialogVisible(false);
        navigation.goBack();
      }, 1500);
    } catch (err) {
      console.error(err);
      setDialogMessage(err.message || 'Submission failed');
      setDialogVisible(true);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <ActivityIndicator animating={true} size="large" style={{ flex: 1 }} />;
  }

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
          <Text variant="labelLarge" style={styles.label}>Vehicle *</Text>
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

          <Text variant="labelLarge" style={styles.label}>Repair Type *</Text>
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

          {saving && <ActivityIndicator animating size="small" />}
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