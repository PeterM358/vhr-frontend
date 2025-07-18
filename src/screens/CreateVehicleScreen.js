import React, { useState, useEffect, useLayoutEffect } from 'react';
import {
  StyleSheet,
  View,
  SafeAreaView,
  ScrollView,
  Alert,
} from 'react-native';
import {
  Text,
  TextInput,
  Button,
  ActivityIndicator,
  useTheme,
  Portal,
  Dialog,
} from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { createVehicle, getMakes, getModelsForMake } from '../api/vehicles';

export default function CreateVehicleScreen({ navigation, route }) {
  const theme = useTheme();

  const clientEmail = route?.params?.clientEmail || null;
  const clientPhone = route?.params?.clientPhone || null;

  const [makes, setMakes] = useState([]);
  const [models, setModels] = useState([]);

  const [selectedMake, setSelectedMake] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [year, setYear] = useState('');
  const [kilometers, setKilometers] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  const [fuelType, setFuelType] = useState('');
  const [gearbox, setGearbox] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const [dialogVisible, setDialogVisible] = useState(false);
  const [dialogMessage, setDialogMessage] = useState('');

  const fuelTypes = ['Petrol', 'Diesel', 'Hybrid', 'Electric', 'LPG', 'CNG', 'Hydrogen', 'Other'];
  const gearboxTypes = ['Manual', 'Automatic', 'Semi-Automatic', 'CVT', 'Dual-Clutch', 'Other'];

  useEffect(() => {
    const fetchMakes = async () => {
      try {
        const token = await AsyncStorage.getItem('@access_token');
        const data = await getMakes(token);
        setMakes(data);
        if (data.length > 0) setSelectedMake(data[0].id.toString());
      } catch (err) {
        console.error(err);
        setDialogMessage('Error loading vehicle makes');
        setDialogVisible(true);
      } finally {
        setLoading(false);
      }
    };
    fetchMakes();
  }, []);

  useEffect(() => {
    const fetchModels = async () => {
      if (!selectedMake) return;
      try {
        const token = await AsyncStorage.getItem('@access_token');
        const data = await getModelsForMake(selectedMake, token);
        setModels(data);
        if (data.length > 0) setSelectedModel(data[0].id.toString());
      } catch (err) {
        console.error(err);
        setDialogMessage('Error loading models');
        setDialogVisible(true);
      }
    };
    fetchModels();
  }, [selectedMake]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: 'Add Vehicle',
      headerStyle: { backgroundColor: theme.colors.primary },
      headerTintColor: theme.colors.onPrimary,
    });
  }, [navigation, theme.colors.primary, theme.colors.onPrimary]);

  const handleSave = async () => {
    if (!selectedMake || !selectedModel || !year) {
      Alert.alert('Validation', 'Make, Model, and Year are required.');
      return;
    }

    setSaving(true);
    try {
      const token = await AsyncStorage.getItem('@access_token');
      await createVehicle(token, {
        make: parseInt(selectedMake),
        model: parseInt(selectedModel),
        year: parseInt(year),
        kilometers: kilometers ? parseInt(kilometers) : 0,
        license_plate: licensePlate,
        fuel_type: fuelType,
        gearbox,
        client_email: clientEmail || '',
        client_phone: clientPhone || '',
      });

      setDialogMessage('Vehicle created!');
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
          <Text variant="labelLarge" style={styles.label}>License Plate</Text>
          <TextInput
            mode="outlined"
            value={licensePlate}
            onChangeText={setLicensePlate}
            placeholder="e.g. CA1234AB"
            style={styles.input}
          />

          <Text variant="labelLarge" style={styles.label}>Make *</Text>
          <View style={styles.pickerContainer}>
            <Picker selectedValue={selectedMake} onValueChange={setSelectedMake} style={styles.picker}>
              {makes.map((m) => (
                <Picker.Item key={m.id} label={m.name} value={m.id.toString()} />
              ))}
            </Picker>
          </View>

          <Text variant="labelLarge" style={styles.label}>Model *</Text>
          <View style={styles.pickerContainer}>
            <Picker selectedValue={selectedModel} onValueChange={setSelectedModel} style={styles.picker}>
              {models.map((m) => (
                <Picker.Item key={m.id} label={m.name} value={m.id.toString()} />
              ))}
            </Picker>
          </View>

          <Text variant="labelLarge" style={styles.label}>Year *</Text>
          <TextInput
            mode="outlined"
            value={year}
            onChangeText={setYear}
            placeholder="e.g. 2016"
            keyboardType="numeric"
            style={styles.input}
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

          <Text variant="labelLarge" style={styles.label}>Fuel Type</Text>
          <View style={styles.pickerContainer}>
            <Picker selectedValue={fuelType} onValueChange={setFuelType} style={styles.picker}>
              {fuelTypes.map((f) => (
                <Picker.Item key={f} label={f} value={f} />
              ))}
            </Picker>
          </View>

          <Text variant="labelLarge" style={styles.label}>Gearbox</Text>
          <View style={styles.pickerContainer}>
            <Picker selectedValue={gearbox} onValueChange={setGearbox} style={styles.picker}>
              {gearboxTypes.map((g) => (
                <Picker.Item key={g} label={g} value={g} />
              ))}
            </Picker>
          </View>

          <Button mode="contained" onPress={handleSave} style={{ marginVertical: 20 }}>
            Save Vehicle
          </Button>

          {saving && <ActivityIndicator animating size="small" />}
        </KeyboardAwareScrollView>

        <Portal>
          <Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)}>
            <Dialog.Title>Notice</Dialog.Title>
            <Dialog.Content>
              <Text>{dialogMessage}</Text>
            </Dialog.Content>
            <Dialog.Actions>
              <Button mode="text" onPress={() => setDialogVisible(false)}>OK</Button>
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
    marginBottom: 12,
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
});