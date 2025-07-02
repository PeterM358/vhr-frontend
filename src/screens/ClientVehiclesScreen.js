// src/screens/ClientVehiclesScreen.js
import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getVehicles } from '../api/vehicles';
import BASE_STYLES from '../styles/base';
import CommonButton from '../components/CommonButton';

export default function ClientVehiclesScreen({ navigation }) {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVehicles = async () => {
      const token = await AsyncStorage.getItem('@access_token');
      try {
        const data = await getVehicles(token);
        setVehicles(data);
      } catch (err) {
        console.error('Failed to fetch vehicles', err);
      } finally {
        setLoading(false);
      }
    };

    const unsubscribe = navigation.addListener('focus', fetchVehicles);
    return unsubscribe;
  }, [navigation]);

  if (loading) {
    return (
      <View style={BASE_STYLES.overlay}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={BASE_STYLES.overlay}>
      <Text style={BASE_STYLES.title}>My Vehicles</Text>
      <FlatList
        data={vehicles}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={BASE_STYLES.listItem}
            onPress={() => navigation.navigate('VehicleDetail', { vehicleId: item.id })}
          >
            <Text style={BASE_STYLES.subText}>Plate: {item.license_plate}</Text>
            <Text style={BASE_STYLES.subText}>Make: {item.brand_name}</Text>
            <Text style={BASE_STYLES.subText}>Model: {item.model_name}</Text>
            <Text style={BASE_STYLES.subText}>Year: {item.year}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Text style={{ textAlign: 'center', marginVertical: 20 }}>No vehicles found. Add one!</Text>
        }
      />
    </View>
  );
}
