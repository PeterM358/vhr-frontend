/**
 * PATH: src/screens/ClientLogRepairScreen.js
 */

import React, { useState, useEffect } from 'react';
import { View, ScrollView, Alert, StyleSheet } from 'react-native';
import { Text, TextInput, Button, useTheme, Card, Divider, Portal, Dialog, ActivityIndicator } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';

import { createRepair } from '../api/repairs';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { API_BASE_URL } from '../api/config';

export default function ClientLogRepairScreen({ navigation, route }) {
  const theme = useTheme();

  const [description, setDescription] = useState('');
  const [kilometers, setKilometers] = useState('');
  const [selectedParts, setSelectedParts] = useState([]);
  const [repairTypeId, setRepairTypeId] = useState(null);
  const [repairTypes, setRepairTypes] = useState([]);

  const [vehicleId, setVehicleId] = useState(route.params?.vehicleId || null);

  const [saving, setSaving] = useState(false);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [dialogMessage, setDialogMessage] = useState('');

  useEffect(() => {
    const loadRepairTypes = async () => {
      try {
        const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
        const response = await fetch(`${API_BASE_URL}/api/repairs/types/`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          setRepairTypes(await response.json());
        }
      } catch (err) {
        console.error('❌ Failed to load repair types', err);
      }
    };
    loadRepairTypes();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      (async () => {
        if (route.params?.vehicleId) {
          setVehicleId(route.params.vehicleId);
          await AsyncStorage.setItem('CURRENT_VEHICLE_ID', route.params.vehicleId.toString());
        } else {
          const stored = await AsyncStorage.getItem('CURRENT_VEHICLE_ID');
          if (stored) setVehicleId(parseInt(stored));
        }

        if (route.params?.addedParts) {
          setSelectedParts(route.params.addedParts);
        }
      })();
    }, [route.params])
  );

  const handleSelectParts = () => {
    navigation.navigate('SelectRepairParts', {
      currentParts: selectedParts,
      returnTo: 'ClientLogRepair',
      vehicleId: vehicleId,
    });
  };

  const handleSubmit = async () => {
    if (!vehicleId) {
      setDialogMessage('Vehicle is required.');
      setDialogVisible(true);
      return;
    }

    if (!repairTypeId) {
      setDialogMessage('Repair Type is required.');
      setDialogVisible(true);
      return;
    }

    if (selectedParts.length === 0) {
      setDialogMessage('Please select at least one part.');
      setDialogVisible(true);
      return;
    }

    setSaving(true);
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);

      const repairPartsData = selectedParts.map(p => ({
        part_master_id: parseInt(p.partsMasterId),
        quantity: parseInt(p.quantity),
        price_per_item_at_use: p.price,
        labor_cost: p.labor,
        note: p.note,
      }));

      const body = {
        vehicle: parseInt(vehicleId),
        description,
        kilometers: kilometers ? parseInt(kilometers) : null,
        repair_type: repairTypeId,
        status: 'done',
        repair_parts_data: repairPartsData,
      };

      console.log('✅ Submitting client repair:', body);

      await createRepair(token, body);

      setDialogMessage('Repair saved as done.');
      setDialogVisible(true);

      setTimeout(() => {
        setDialogVisible(false);
        navigation.reset({
          index: 0,
          routes: [
            { name: 'VehicleDetail', params: { vehicleId: parseInt(vehicleId) } }
          ]
        });
      }, 1500);

    } catch (err) {
      console.error('❌ Save Error:', err);
      setDialogMessage(err.message || 'Failed to save repair.');
      setDialogVisible(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text variant="titleLarge" style={styles.title}>Log Personal Repair</Text>

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

      <View style={styles.pickerContainer}>
        <Text style={styles.pickerLabel}>Repair Type *</Text>
        <Picker
          selectedValue={repairTypeId}
          onValueChange={(val) => setRepairTypeId(val)}
        >
          <Picker.Item label="Select Repair Type" value={null} />
          {repairTypes.map(type => (
            <Picker.Item key={type.id} label={type.name} value={type.id} />
          ))}
        </Picker>
      </View>

      <Divider style={{ marginVertical: 12 }} />

      <Button
        mode="outlined"
        onPress={handleSelectParts}
        style={styles.input}
      >
        Manage Parts ({selectedParts.length} selected)
      </Button>

      {selectedParts.length > 0 && (
        <>
          <Text variant="titleMedium" style={styles.label}>
            Selected Parts
          </Text>
          {selectedParts.map((part, index) => (
            <Card key={index} style={styles.partCard}>
              <Card.Content>
                <Text style={styles.partHeader}>
                  {part.partsMaster?.name} ({part.partsMaster?.brand})
                </Text>
                <View style={styles.partRow}>
                  <Text style={styles.partDetail}>Qty: {part.quantity}</Text>
                  <Text style={styles.partDetail}>Price: {part.price}</Text>
                  <Text style={styles.partDetail}>Labor: {part.labor}</Text>
                </View>
                {part.note ? (
                  <Text style={styles.partNote}>
                    Note: {part.note}
                  </Text>
                ) : null}
              </Card.Content>
            </Card>
          ))}
        </>
      )}

      <Button
        mode="contained"
        onPress={handleSubmit}
        disabled={saving}
        style={{ marginTop: 16 }}
      >
        Save as Done
      </Button>

      {saving && <ActivityIndicator animating size="small" style={{ marginTop: 12 }} />}

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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  title: { marginBottom: 16 },
  input: { marginVertical: 8 },
  label: {
    marginTop: 16,
    marginBottom: 4,
    fontWeight: '600',
  },
  pickerContainer: {
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  pickerLabel: {
    margin: 8,
    fontWeight: '600',
  },
  partRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    marginBottom: 4,
  },
  partDetail: {
    flexBasis: '30%',
    fontSize: 14,
    color: '#555',
  },
  partHeader: {
    fontWeight: '600',
    fontSize: 16,
    marginBottom: 4,
    color: '#333',
  },
  partNote: {
    fontStyle: 'italic',
    color: '#777',
    marginTop: 4,
  },
  partCard: {
    marginVertical: 8,
    backgroundColor: '#f9f9f9',
  },
});