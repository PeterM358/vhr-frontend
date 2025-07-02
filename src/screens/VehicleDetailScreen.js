// src/screens/VehicleDetailScreen.js
import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BASE_STYLES from '../styles/base';
import CommonButton from '../components/CommonButton';

export default function VehicleDetailScreen({ route, navigation }) {
  const { vehicleId } = route.params;
  const [vehicle, setVehicle] = useState(null);
  const [repairs, setRepairs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('repairs');

  useEffect(() => {
    const fetchVehicleDetails = async () => {
      const token = await AsyncStorage.getItem('@access_token');
      try {
        const res = await fetch(`http://127.0.0.1:8000/api/vehicles/${vehicleId}/`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setVehicle(data);
        setRepairs(data.repairs || []);
      } catch (err) {
        console.error('Error fetching vehicle details:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchVehicleDetails();
  }, [vehicleId]);

  if (loading) return <ActivityIndicator size="large" />;
  if (!vehicle) return <Text>Vehicle not found.</Text>;

  // Filter by tab
  const filteredRepairs = repairs.filter(r =>
    activeTab === 'repairs' ? r.status !== 'offer' : r.status === 'offer'
  );

  return (
    <View style={BASE_STYLES.overlay}>
      <Text style={BASE_STYLES.title}>Plate: {vehicle.license_plate}</Text>
      <Text style={BASE_STYLES.subText}>Make: {vehicle.brand_name}</Text>
      <Text style={BASE_STYLES.subText}>Model: {vehicle.model_name}</Text>
      <Text style={BASE_STYLES.subText}>Year: {vehicle.year}</Text>

      <CommonButton
        title="➕ Create Repair for This Vehicle"
        onPress={() => navigation.navigate('CreateRepair', { vehicleId })}
      />

      <View style={BASE_STYLES.tabBar}>
        <TouchableOpacity
          style={activeTab === 'repairs' ? BASE_STYLES.activeTab : BASE_STYLES.inactiveTab}
          onPress={() => setActiveTab('repairs')}
        >
          <Text>Repairs</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={activeTab === 'offers' ? BASE_STYLES.activeTab : BASE_STYLES.inactiveTab}
          onPress={() => setActiveTab('offers')}
        >
          <Text>Offers</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredRepairs}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={BASE_STYLES.listItem}
            onPress={() => navigation.navigate('RepairDetail', { repairId: item.id })}
          >
            <Text style={BASE_STYLES.offerTitle}>{item.repair_type_name}</Text>
            <Text style={BASE_STYLES.subText}>Status: {item.status}</Text>
            <Text style={BASE_STYLES.offerDetail}>{item.description}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Text style={{ textAlign: 'center', marginVertical: 20 }}>No {activeTab} found.</Text>
        }
      />
    </View>
  );
}
