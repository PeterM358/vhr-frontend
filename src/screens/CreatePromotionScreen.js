import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';
import { API_BASE_URL } from '../api/config';
import BASE_STYLES from '../styles/base';
import CommonButton from '../components/CommonButton';

export default function CreatePromotionScreen({ navigation }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [validFrom, setValidFrom] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [maxBookings, setMaxBookings] = useState('');

  const [repairTypes, setRepairTypes] = useState([]);
  const [selectedRepairType, setSelectedRepairType] = useState('');
  const [loadingTypes, setLoadingTypes] = useState(true);

  useEffect(() => {
    fetchRepairTypes();
  }, []);

  const fetchRepairTypes = async () => {
    setLoadingTypes(true);
    try {
      const token = await AsyncStorage.getItem('@access_token');
      const res = await fetch(`${API_BASE_URL}/api/repairs/types/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setRepairTypes(data);
    } catch (err) {
      console.error('Error fetching repair types:', err);
      Alert.alert('Error', 'Failed to load repair types');
    } finally {
      setLoadingTypes(false);
    }
  };

  const handleSubmit = async () => {
    if (!title.trim() || !price || !selectedRepairType) {
      Alert.alert('Missing Info', 'Please fill out all required fields.');
      return;
    }

    try {
      const token = await AsyncStorage.getItem('@access_token');
      const response = await fetch(`${API_BASE_URL}/api/offers/`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          description,
          repair_type: parseInt(selectedRepairType),
          price: parseFloat(price),
          valid_from: validFrom || null,
          valid_until: validUntil || null,
          max_bookings: maxBookings ? parseInt(maxBookings) : null,
          is_promotion: true,
        }),
      });

      if (!response.ok) throw new Error('Failed to create promotion');
      Alert.alert('Success', 'Promotion created!');
      navigation.goBack();
    } catch (err) {
      console.error(err);
      Alert.alert('Error', err.message || 'Failed to save promotion');
    }
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: 'rgba(210,255,255,0.9)' }}
      contentContainerStyle={{ padding: 16, paddingBottom: 50 }}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={BASE_STYLES.title}>Add New Promotion</Text>

      <Text style={BASE_STYLES.label}>Title *</Text>
      <TextInput
        style={BASE_STYLES.formInput}
        placeholder="e.g. Oil Change Special"
        value={title}
        onChangeText={setTitle}
      />

      <Text style={BASE_STYLES.label}>Description</Text>
      <TextInput
        style={BASE_STYLES.formInput}
        placeholder="Promotion details"
        value={description}
        onChangeText={setDescription}
        multiline
      />

      <Text style={BASE_STYLES.label}>Repair Type *</Text>
      {loadingTypes ? (
        <ActivityIndicator size="small" />
      ) : (
        <Picker
          selectedValue={selectedRepairType || ''}
          onValueChange={(val) => setSelectedRepairType(val || '')}
          style={BASE_STYLES.picker}
        >
          <Picker.Item label="Select Repair Type..." value="" />
          {repairTypes.map((rt) => (
            <Picker.Item key={rt.id} label={rt.name} value={String(rt.id)} />
          ))}
        </Picker>
      )}

      <Text style={BASE_STYLES.label}>Price (BGN) *</Text>
      <TextInput
        style={BASE_STYLES.formInput}
        placeholder="e.g. 50"
        value={price}
        onChangeText={setPrice}
        keyboardType="numeric"
      />

      <Text style={BASE_STYLES.label}>Valid From (YYYY-MM-DD)</Text>
      <TextInput
        style={BASE_STYLES.formInput}
        placeholder="e.g. 2024-06-01"
        value={validFrom}
        onChangeText={setValidFrom}
      />

      <Text style={BASE_STYLES.label}>Valid Until (YYYY-MM-DD)</Text>
      <TextInput
        style={BASE_STYLES.formInput}
        placeholder="e.g. 2024-12-31"
        value={validUntil}
        onChangeText={setValidUntil}
      />

      <Text style={BASE_STYLES.label}>Max Bookings (optional)</Text>
      <TextInput
        style={BASE_STYLES.formInput}
        placeholder="e.g. 10"
        value={maxBookings}
        onChangeText={setMaxBookings}
        keyboardType="numeric"
      />

      <View style={{ marginTop: 20 }}>
        <CommonButton title="✅ Save Promotion" onPress={handleSubmit} />
      </View>
    </ScrollView>
  );
}
