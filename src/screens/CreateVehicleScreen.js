// PATH: src/screens/CreateRepairScreen.js

import React, { useState, useEffect, useLayoutEffect } from 'react';
import {
  StyleSheet,
  View,
  SafeAreaView,
  Pressable,
  ScrollView,
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
import { API_BASE_URL } from '../api/config';
import { createRepair, createShopPart, getShopParts } from '../api/repairs';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

export default function CreateRepairScreen({ navigation, route }) {
  const theme = useTheme();

  // Navigation param for preselect
  const preselectedVehicleId = route.params?.vehicleId?.toString() || '';
  const returnedParts = route.params?.addedParts || [];

  const [vehicles, setVehicles] = useState([]);
  const [repairTypes, setRepairTypes] = useState([]);
  const [selectedParts, setSelectedParts] = useState([]);
  const [shopParts, setShopParts] = useState([]);

  const [vehicleId, setVehicleId] = useState(preselectedVehicleId);
  const [repairTypeId, setRepairTypeId] = useState('');
  const [description, setDescription] = useState('');
  const [kilometers, setKilometers] = useState('');
  const [status, setStatus] = useState('done');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [dialogVisible, setDialogVisible] = useState(false);
  const [dialogMessage, setDialogMessage] = useState('');

  // Handle returned parts from SelectRepairPartsScreen
  useEffect(() => {
    if (returnedParts.length) {
      setSelectedParts(returnedParts);
    }
  }, [returnedParts]);

  useEffect(() => {
    const fetchFormData = async () => {
      try {
        const token = await AsyncStorage.getItem('@access_token');
        const [vehicleRes, typeRes, shopPartsData] = await Promise.all([
          fetch(`${API_BASE_URL}/api/vehicles/`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API_BASE_URL}/api/repairs/types/`, { headers: { Authorization: `Bearer ${token}` } }),
          getShopParts(token),
        ]);

        if (!vehicleRes.ok || !typeRes.ok) throw new Error('Failed to fetch form data');

        const vehicleData = await vehicleRes.json();
        const typeData = await typeRes.json();

        setVehicles(vehicleData);
        setRepairTypes(typeData);
        setShopParts(shopPartsData);

        if (!preselectedVehicleId && vehicleData.length > 0) setVehicleId(vehicleData[0].id.toString());
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
          labelStyle={{ color: '#fff', fontSize: 16 }}
        >
          Save
        </Button>
      ),
    });
  }, [navigation, vehicleId, repairTypeId, description, kilometers, status, selectedParts]);

  const openAddPartsScreen = () => {
    navigation.navigate('SelectRepairPartsScreen', {
      returnTo: 'CreateRepairScreen',
    });
  };

  const saveRepair = async () => {
    setSaving(true);
    try {
      const token = await AsyncStorage.getItem('@access_token');
      const shopProfileId = await AsyncStorage.getItem('@shop_profile_id');

      // Check or create ShopParts
      const repairPartsData = [];
      for (let part of selectedParts) {
        if (!part.partsMasterId) continue;

        let shopPart = shopParts.find(sp => sp.part.id === parseInt(part.partsMasterId));
        if (!shopPart) {
          // Create new ShopPart if missing
          shopPart = await createShopPart(token, {
            shop_profile: parseInt(shopProfileId),
            part: parseInt(part.partsMasterId),
            price: part.price || '0',
            labor: part.labor || '0',
            shop_sku: '',
          });
          setShopParts(prev => [...prev, shopPart]);
        }

        repairPartsData.push({
          shop_part_id: shopPart.id,
          quantity: parseInt(part.quantity),
          price_per_item_at_use: part.price,
          note: part.note,
        });
      }

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
            buttons={[
              { value: 'done', label: 'Done', icon: 'check-circle-outline' },
              { value: 'open', label: 'Open', icon: 'alert-circle-outline' },
            ]}
            style={styles.segmented}
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
                  <Card.Title title={`${part.name} (${part.brand})`} />
                  <Card.Content>
                    <Text>Quantity: {part.quantity}</Text>
                    <Text>Price: {part.price}</Text>
                    <Text>Labor: {part.labor}</Text>
                    <Text>Note: {part.note}</Text>
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
  partCard: {
    marginVertical: 6,
    padding: 10,
  },
});