// PATH: src/screens/CreateMasterPartScreen.js

import React, { useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Text,
  TextInput,
  Button,
} from 'react-native-paper';
import { createPartsMaster, getMaterialCategories } from '../api/parts';
import ScreenBackground from '../components/ScreenBackground';
import BASE_STYLES from '../styles/base';
import { showMessage } from '../utils/crossPlatformAlert';

const FALLBACK_CATEGORIES = [
  'Brakes',
  'Clutch',
  'Fluids',
  'Filters',
  'Ignition',
  'Electrical',
  'Sensors',
  'Engine',
  'Suspension',
  'Tires',
  'Accessories',
  'Lighting',
  'Air Conditioning',
  'Drive',
];

const OTHER = '__other__';

export default function CreateMasterPartScreen({ navigation, route }) {
  const [newPartData, setNewPartData] = useState({
    name: '',
    brand: '',
    category: '',
    description: '',
  });
  const [categoryChoice, setCategoryChoice] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const [categories, setCategories] = useState(FALLBACK_CATEGORIES);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const token = await AsyncStorage.getItem('@access_token');
        const rows = await getMaterialCategories(token);
        const names = (Array.isArray(rows) ? rows : [])
          .map((r) => r.name)
          .filter(Boolean);
        if (active && names.length) {
          setCategories(names);
        }
      } catch (err) {
        console.warn('Material categories load failed; using fallback list', err);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const resolvedCategory =
    categoryChoice === OTHER ? customCategory.trim() : categoryChoice;

  const handleCreateNewPart = async () => {
    if (!newPartData.name.trim() || !newPartData.brand.trim() || !resolvedCategory) {
      showMessage('Validation', 'Name, Brand, and Category are required.', {
        variant: 'error',
      });
      return;
    }

    setCreating(true);
    try {
      const token = await AsyncStorage.getItem('@access_token');
      const created = await createPartsMaster(token, {
        ...newPartData,
        category: resolvedCategory,
      });
      showMessage('Success', 'New material added to catalog.', { variant: 'success' });
      navigation.navigate({
        name: route.params?.returnTo || 'SelectRepairParts',
        params: { newCreatedPart: created },
        merge: true,
      });
    } catch (err) {
      console.error(err);
      showMessage('Error', 'Failed to create new material', { variant: 'error' });
    } finally {
      setCreating(false);
    }
  };

  return (
    <ScreenBackground>
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: 'transparent' }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={BASE_STYLES.formScreenScroll}
        keyboardShouldPersistTaps="handled"
      >
        <Text variant="headlineSmall" style={styles.title}>
          Add New Material to Catalog
        </Text>
        <Text style={styles.helper}>
          Creates a platform materials catalog entry. Your shop sell price is set when you
          save materials on the repair.
        </Text>

        <TextInput
          mode="outlined"
          label="Name *"
          value={newPartData.name}
          onChangeText={(val) => setNewPartData({ ...newPartData, name: val })}
          style={styles.input}
        />

        <TextInput
          mode="outlined"
          label="Brand *"
          value={newPartData.brand}
          onChangeText={(val) => setNewPartData({ ...newPartData, brand: val })}
          style={styles.input}
        />

        <Text style={styles.fieldLabel}>Category *</Text>
        <View style={styles.pickerWrap}>
          <Picker
            selectedValue={categoryChoice}
            onValueChange={(val) => setCategoryChoice(val)}
            style={styles.picker}
          >
            <Picker.Item label="Select category…" value="" />
            {categories.map((name) => (
              <Picker.Item key={name} label={name} value={name} />
            ))}
            <Picker.Item label="Other…" value={OTHER} />
          </Picker>
        </View>

        {categoryChoice === OTHER ? (
          <TextInput
            mode="outlined"
            label="Custom category *"
            value={customCategory}
            onChangeText={setCustomCategory}
            style={styles.input}
          />
        ) : null}

        <TextInput
          mode="outlined"
          label="Description"
          value={newPartData.description}
          onChangeText={(val) => setNewPartData({ ...newPartData, description: val })}
          style={styles.input}
          multiline
        />

        <Button
          mode="contained"
          onPress={handleCreateNewPart}
          loading={creating}
          style={{ marginVertical: 20 }}
        >
          Add to Catalog
        </Button>
      </ScrollView>
    </KeyboardAvoidingView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  title: { marginBottom: 8, textAlign: 'center' },
  helper: {
    marginBottom: 12,
    textAlign: 'center',
    color: '#64748B',
    fontSize: 13,
  },
  input: { marginVertical: 8 },
  fieldLabel: {
    marginTop: 8,
    marginBottom: 4,
    color: '#475569',
    fontSize: 13,
    fontWeight: '600',
  },
  pickerWrap: {
    borderWidth: 1,
    borderColor: '#94A3B8',
    borderRadius: 4,
    marginBottom: 8,
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  picker: {
    width: '100%',
    ...(Platform.OS === 'web' ? { height: 44 } : null),
  },
});
