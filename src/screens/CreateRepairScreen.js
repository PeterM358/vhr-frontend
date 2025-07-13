/**
 * PATH: src/screens/CreateRepairScreen.js
 */

import React, { useState, useEffect, useLayoutEffect } from 'react';
import {
  StyleSheet,
  View,
  SafeAreaView,
  Alert,
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
  SegmentedButtons,
  Card,
  Divider,
} from 'react-native-paper';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

import { API_BASE_URL } from '../api/config';
import { createRepair } from '../api/repairs';
import { getShopParts, prepareRepairPartsData } from '../api/parts';
import { STORAGE_KEYS } from '../constants/storageKeys';



export default function CreateRepairScreen({ navigation, route }) {
  const theme = useTheme();

  const preselectedVehicleId = route.params?.vehicleId?.toString() || '';
  const [vehicles, setVehicles] = useState([]);
  const [repairTypes, setRepairTypes] = useState([]);
  const [shopParts, setShopParts] = useState([]);

  const [vehicleId, setVehicleId] = useState(preselectedVehicleId);
  const [repairTypeId, setRepairTypeId] = useState('');
  const [description, setDescription] = useState('');
  const [kilometers, setKilometers] = useState('');
  const [status, setStatus] = useState('done');
  const [selectedParts, setSelectedParts] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [dialogMessage, setDialogMessage] = useState('');

  // ✅ Restore state when returning from parts selector
  useEffect(() => {
    if (route.params) {
      if (route.params.addedParts) setSelectedParts(route.params.addedParts);
      if (route.params.vehicleId) setVehicleId(route.params.vehicleId.toString());
      if (route.params.repairTypeId) setRepairTypeId(route.params.repairTypeId.toString());
      if (route.params.description !== undefined) setDescription(route.params.description);
      if (route.params.kilometers !== undefined) setKilometers(route.params.kilometers);
      if (route.params.status) setStatus(route.params.status);
    }
  }, [route.params]);

  // ✅ Initial data load
  useEffect(() => {
    const fetchFormData = async () => {
      try {
        const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
        const [vehicleRes, typeRes, shopPartsData] = await Promise.all([
          fetch(`${API_BASE_URL}/api/vehicles/`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API_BASE_URL}/api/repairs/types/`, { headers: { Authorization: `Bearer ${token}` } }),
          getShopParts(token),
        ]);

        if (!vehicleRes.ok || !typeRes.ok) throw new Error('Failed to fetch form data');

        const vehicleData = await vehicleRes.json();
        setVehicles(vehicleData);
        setRepairTypes(await typeRes.json());
        setShopParts(shopPartsData);

        if (!vehicleId && vehicleData.length > 0) {
          setVehicleId(vehicleData[0].id.toString());
        }
      } catch (err) {
        console.error('❌ Error:', err);
        setDialogMessage('Error loading form data');
        setDialogVisible(true);
      } finally {
        setLoading(false);
      }
    };
    fetchFormData();
  }, []);

  // ✅ Header save button
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Button
          mode="text"
          compact
          onPress={handleHeaderSave}
          labelStyle={{ color: '#fff', fontSize: 16 }}
        >
          Save
        </Button>
      ),
    });
  }, [navigation, vehicleId, repairTypeId, description, kilometers, status, selectedParts]);

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

  // ✅ Navigate to add/select parts
  const openAddPartsScreen = () => {
    navigation.push('SelectRepairParts', {
      currentParts: selectedParts,
      vehicleId,
      repairTypeId,
      description,
      kilometers,
      status,
      returnTo: 'CreateRepair',
    });
  };

  // ✅ Save repair, creating or updating ShopParts
  const saveRepair = async () => {
    setSaving(true);
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      const shopProfileId = await AsyncStorage.getItem(STORAGE_KEYS.CURRENT_SHOP_ID);

      // 👇 Prepare the parts (auto create / update ShopParts as needed)
      const { repairPartsData, newShopParts } = await prepareRepairPartsData(
        token,
        shopProfileId,
        selectedParts,
        shopParts
      );
      setShopParts(newShopParts);

      const body = {
        vehicle: parseInt(vehicleId),
        repair_type: parseInt(repairTypeId),
        description,
        kilometers: kilometers ? parseInt(kilometers) : null,
        status,
        repair_parts_data: repairPartsData,
      };

      await createRepair(token, body);

      setDialogMessage('Repair created!');
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
      <KeyboardAwareScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="always"
      >
        <Text variant="labelLarge" style={styles.label}>Vehicle *</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={vehicleId}
            onValueChange={setVehicleId}
            style={styles.picker}
          >
            {vehicles.map((v) => (
              <Picker.Item
                key={v.id}
                label={`${v.license_plate} (${v.make_name} ${v.model_name})`}
                value={v.id.toString()}
              />
            ))}
          </Picker>
        </View>

        <Text variant="labelLarge" style={styles.label}>Repair Type *</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={repairTypeId}
            onValueChange={setRepairTypeId}
            style={styles.picker}
          >
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
        <SegmentedButtons
          value={status}
          onValueChange={setStatus}
          style={styles.segmented}
          buttons={[
            {
              value: 'done',
              label: 'Done',
              icon: 'check-circle-outline',
              style: {
                backgroundColor: status === 'done' ? theme.colors.primary : theme.colors.background,
                borderColor: theme.colors.primary,
                borderWidth: 1,
              },
              labelStyle: {
                color: status === 'done' ? theme.colors.onPrimary : theme.colors.primary,
                fontWeight: 'bold',
              },
              icon: {
                color: status === 'done' ? theme.colors.onPrimary : theme.colors.primary,
              },
            },
            {
              value: 'open',
              label: 'Open',
              icon: 'alert-circle-outline',
              style: {
                backgroundColor: status === 'open' ? theme.colors.primary : theme.colors.background,
                borderColor: theme.colors.primary,
                borderWidth: 1,
              },
              labelStyle: {
                color: status === 'open' ? theme.colors.onPrimary : theme.colors.primary,
                fontWeight: 'bold',
              },
              icon: {
                color: status === 'open' ? theme.colors.onPrimary : theme.colors.primary,
              },
            },
          ]}
        />

        <Divider style={{ marginVertical: 20 }} />

        <Button mode="contained" onPress={openAddPartsScreen} style={{ marginBottom: 10 }}>
          Add Parts
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
            <Button mode="text" onPress={() => setDialogVisible(false)}>
              OK
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
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
    fontWeight: '600',
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
  picker: {
    width: '100%',
  },
  segmented: {
    marginVertical: 12,
    alignSelf: 'center',
    width: '90%',
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
});