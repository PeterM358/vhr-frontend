// PATH: src/screens/CreateMasterPartScreen.js

import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Text,
  TextInput,
  Button,
  useTheme,
} from 'react-native-paper';
import { createPartsMaster } from '../api/parts';

const CATEGORY_OPTIONS = [
  'Liquids',
  'Body Parts',
  'Interior',
  'Consumables',
  'Electronics',
  'Brakes & Suspension',
  'Engine & Transmission',
];

export default function CreateMasterPartScreen({ navigation, route }) {
  const theme = useTheme();

  const [newPartData, setNewPartData] = useState({
    name: '',
    brand: '',
    category: '',
    description: '',
  });
  const [creating, setCreating] = useState(false);

  const handleCreateNewPart = async () => {
    if (!newPartData.name.trim() || !newPartData.brand.trim() || !newPartData.category.trim()) {
      Alert.alert('Validation', 'Name, Brand, and Category are required.');
      return;
    }

    setCreating(true);
    try {
      const token = await AsyncStorage.getItem('@access_token');
      const created = await createPartsMaster(token, newPartData);
      Alert.alert('Success', 'New part added!');
      navigation.navigate({
        name: route.params?.returnTo || 'SelectRepairParts',
        params: { newCreatedPart: created },
        merge: true,
      });
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to create new part');
    } finally {
      setCreating(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <Text variant="headlineSmall" style={styles.title}>
          Add New Part to Catalog
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

        <TextInput
          mode="outlined"
          label="Category *"
          placeholder="e.g. Liquids, Body Parts..."
          value={newPartData.category}
          onChangeText={(val) => setNewPartData({ ...newPartData, category: val })}
          style={styles.input}
        />

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
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 80 },
  title: { marginBottom: 12, textAlign: 'center' },
  input: { marginVertical: 8 },
});