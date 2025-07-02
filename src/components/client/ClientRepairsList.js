import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getRepairs } from '../../api/repairs';

export default function ClientRepairsList({ navigation }) {
  const [repairs, setRepairs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('open');

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
      style={styles.repairBox}
      onPress={() => navigation.navigate('RepairDetail', { repairId: item.id })}
    >
      <Text style={styles.vehicleTitle}>
        {item.vehicle_brand} {item.vehicle_model} ({item.vehicle_license_plate})
      </Text>
      <Text>Status: {item.status}</Text>
      <Text>Description: {item.description}</Text>
      <Text>Kilometers: {item.kilometers}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1 }}>
      <View style={{ padding: 16 }}>
        <Text style={styles.title}>My Repairs ({statusFilter.toUpperCase()})</Text>

        <View style={styles.filterBar}>
          {['open', 'ongoing', 'done'].map((status) => (
            <TouchableOpacity
              key={status}
              style={[
                styles.filterButton,
                status === statusFilter && styles.activeFilter,
              ]}
              onPress={() => setStatusFilter(status)}
            >
              <Text style={styles.filterText}>{status.toUpperCase()}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" style={{ flex: 1 }} />
      ) : (
        <FlatList
          contentContainerStyle={{ paddingHorizontal: 16 }}
          data={repairs}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderRepair}
          ListEmptyComponent={<Text style={{ padding: 16 }}>No repairs found.</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  filterBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: 10,
  },
  filterButton: {
    padding: 10,
    borderRadius: 6,
    backgroundColor: '#eee',
    marginHorizontal: 5,
  },
  activeFilter: {
    backgroundColor: '#007AFF',
  },
  filterText: {
    color: '#000',
    fontWeight: 'bold',
  },
  repairBox: {
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
    borderRadius: 8,
  },
  vehicleTitle: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
});
