// src/components/shop/RepairsList.js
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getRepairs } from '../../api/repairs';
import { useNavigation } from '@react-navigation/native';
import BASE_STYLES from '../../styles/base';

export default function RepairsList() {
  const [repairs, setRepairs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('open');
  const navigation = useNavigation();

  useEffect(() => {
    const fetchRepairs = async () => {
      const token = await AsyncStorage.getItem('@access_token');
      try {
        const data = await getRepairs(token, statusFilter);
        setRepairs(data);
      } catch (err) {
        console.error('Failed to load repairs', err);
      } finally {
        setLoading(false);
      }
    };

    fetchRepairs();
  }, [statusFilter]);

  const renderRepair = ({ item }) => (
    <TouchableOpacity
      style={BASE_STYLES.listItem}
      onPress={() => navigation.navigate('RepairDetail', { repairId: item.id })}
    >
      <Text style={BASE_STYLES.subText}>
        {item.vehicle_brand} {item.vehicle_model} ({item.vehicle_license_plate})
      </Text>
      <Text>Status: {item.status}</Text>
      <Text>Description: {item.description}</Text>
      <Text>Kilometers: {item.kilometers}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={BASE_STYLES.overlay}>
      <Text style={BASE_STYLES.title}>Repairs ({statusFilter.toUpperCase()})</Text>

      <View style={BASE_STYLES.tabBar}>
        {['open', 'ongoing', 'done'].map((status) => (
          <TouchableOpacity
            key={status}
            style={status === statusFilter ? BASE_STYLES.activeTab : BASE_STYLES.inactiveTab}
            onPress={() => setStatusFilter(status)}
          >
            <Text>{status.toUpperCase()}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator size="large" />
      ) : (
        <FlatList
          data={repairs}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderRepair}
          ListEmptyComponent={
            <Text style={{ textAlign: 'center', marginVertical: 20 }}>
              No repairs found for status "{statusFilter}"
            </Text>
          }
        />
      )}
    </View>
  );
}
