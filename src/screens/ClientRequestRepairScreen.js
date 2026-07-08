/**
 * PATH: src/screens/ClientRequestRepairScreen.js
 */

import React, { useState, useEffect } from 'react';
import { View, ScrollView, Alert, StyleSheet } from 'react-native';
import { Text, TextInput, Button, useTheme, ActivityIndicator } from 'react-native-paper';
import { Picker } from '@react-native-picker/picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { API_BASE_URL } from '../api/config';
import BASE_STYLES from '../styles/base';
import ScreenBackground from '../components/ScreenBackground';
import { safeError } from '../utils/logger';
import { useTranslation } from '../i18n';

export default function ClientRequestRepairScreen({ route, navigation }) {
  const theme = useTheme();
  const { t } = useTranslation();

  const vehicleId = route.params?.vehicleId;
  const [description, setDescription] = useState('');
  const [kilometers, setKilometers] = useState('');
  const [repairType, setRepairType] = useState('');
  const [repairTypes, setRepairTypes] = useState([]);
  const [loadingTypes, setLoadingTypes] = useState(false);
  const [serviceCenterLabel, setServiceCenterLabel] = useState(t('public.serviceCenter'));

  const centerLabelForVehicleType = (vehicleTypeCode, vehicleTypeName) => {
    const code = String(vehicleTypeCode || '').toLowerCase();
    if (['car', 'van', 'truck'].includes(code)) return t('requestService.autoServiceCenter');
    if (['motorcycle', 'scooter'].includes(code)) return t('requestService.motorcycleServiceCenter');
    if (code === 'bicycle') return t('requestService.bicycleServiceCenter');
    if (code === 'ebike') return t('requestService.ebikeServiceCenter');
    if (code === 'trailer') return t('requestService.trailerServiceCenter');
    const n = String(vehicleTypeName || '').trim();
    if (n) return t('requestService.namedServiceCenter', { name: n });
    return t('public.serviceCenter');
  };

  useEffect(() => {
    const loadFormContext = async () => {
      setLoadingTypes(true);
      try {
        const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
        const response = await fetch(`${API_BASE_URL}/api/repairs/types/`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          setRepairTypes(await response.json());
        } else {
          throw new Error('Failed to fetch repair types');
        }

        if (vehicleId) {
          const vehicleRes = await fetch(`${API_BASE_URL}/api/vehicles/${vehicleId}/`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (vehicleRes.ok) {
            const vehicle = await vehicleRes.json();
            setServiceCenterLabel(
              centerLabelForVehicleType(vehicle.vehicle_type_code, vehicle.vehicle_type_name)
            );
          }
        }
      } catch (err) {
        console.error('❌ Error loading request context:', err);
        Alert.alert(t('common.error'), t('requestService.loadFormError'));
      } finally {
        setLoadingTypes(false);
      }
    };

    loadFormContext();
  }, [vehicleId, t]);

  const handleSubmit = async () => {
    if (!vehicleId) {
      Alert.alert(t('common.error'), t('requestService.vehicleRequiredError'));
      return;
    }
    if (!repairType) {
      Alert.alert(t('common.error'), t('requestService.selectRepairType'));
      return;
    }

    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      const payload = {
        vehicle: vehicleId,
        repair_type: repairType,
        description,
        kilometers: parseInt(kilometers) || 0,
        status: 'open',
      };

      const response = await fetch(`${API_BASE_URL}/api/repairs/repair/`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        Alert.alert(t('common.notice'), t('requestService.repairCreatedOpen'));
        navigation.goBack();
      } else {
        await response.text();
        Alert.alert(t('common.error'), t('requestService.createFailed'));
      }
    } catch (err) {
      safeError('Create repair request failed', err);
      Alert.alert(t('common.error'), t('common.error'));
    }
  };

  return (
    <ScreenBackground>
    <ScrollView contentContainerStyle={BASE_STYLES.formScreen}>
      <Text variant="titleMedium" style={styles.contextTitle}>
        {t('requestService.requestFrom', { label: serviceCenterLabel })}
      </Text>
      
      <TextInput
        mode="outlined"
        label={t('requestService.description')}
        value={description}
        onChangeText={setDescription}
        style={styles.input}
      />
      
      <TextInput
        mode="outlined"
        label={t('requestService.kilometersOptional')}
        keyboardType="numeric"
        value={kilometers}
        onChangeText={setKilometers}
        style={styles.input}
      />

      <Text variant="labelLarge" style={styles.pickerLabel}>{t('requestService.selectRepairType')}</Text>

      {loadingTypes ? (
        <ActivityIndicator animating size="small" style={{ marginVertical: 8 }} />
      ) : (
        <View style={styles.pickerWrap}>
          <Picker
            selectedValue={repairType}
            onValueChange={(itemValue) => setRepairType(itemValue)}
            style={styles.picker}
            dropdownIconColor="#0f172a"
          >
            <Picker.Item label={t('requestService.selectRepairType')} value="" />
            {repairTypes.map((type) => (
              <Picker.Item key={type.id} label={type.name} value={type.id} />
            ))}
          </Picker>
        </View>
      )}

      <Button
        mode="contained"
        onPress={handleSubmit}
        style={{ marginTop: 20 }}
      >
        {t('requestService.submitRequest')}
      </Button>
    </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  contextTitle: { marginBottom: 12, color: 'rgba(255,255,255,0.92)', fontWeight: '600' },
  input: { marginVertical: 8 },
  pickerLabel: {
    marginTop: 16,
    color: '#fff',
    fontWeight: '600',
  },
  pickerWrap: {
    marginTop: 8,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.12)',
    backgroundColor: 'rgba(255,255,255,0.95)',
    overflow: 'hidden',
  },
  picker: {
    color: '#0f172a',
    backgroundColor: 'rgba(255,255,255,0.95)',
  },
});
