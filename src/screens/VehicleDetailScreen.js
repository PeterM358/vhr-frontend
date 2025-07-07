// PATH: src/screens/VehicleDetailScreen.js

import React, { useEffect, useState } from 'react';
import { FlatList, ActivityIndicator, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Card, Text, Button, useTheme, Surface } from 'react-native-paper';
import CommonButton from '../components/CommonButton';

export default function VehicleDetailScreen({ route, navigation }) {
  const { vehicleId } = route.params;
  const [vehicle, setVehicle] = useState(null);
  const [repairs, setRepairs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('repairs');
  const theme = useTheme();

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

  if (loading) {
    return <ActivityIndicator size="large" style={styles.loading} />;
  }

  if (!vehicle) {
    return <Text style={styles.emptyText}>Vehicle not found.</Text>;
  }

  // Filtered repairs by tab
  const filteredRepairs = repairs.filter(r => {
    if (activeTab === 'repairs') return r.status === 'done';
    if (activeTab === 'offers') return r.status === 'offer';
    return false;
  });

  return (
    <Surface style={styles.container}>
      <Card mode="outlined" style={styles.vehicleCard}>
        <Card.Title title={`Plate: ${vehicle.license_plate}`} />
        <Card.Content>
          <Text>Make: {vehicle.brand_name}</Text>
          <Text>Model: {vehicle.model_name}</Text>
          <Text>Year: {vehicle.year}</Text>
        </Card.Content>
      </Card>

      <CommonButton
        title="➕ Create Repair for This Vehicle"
        onPress={() => navigation.navigate('CreateRepair', { vehicleId })}
      />

      <Surface style={styles.tabBar}>
        <Button
          mode={activeTab === 'repairs' ? 'contained' : 'outlined'}
          onPress={() => setActiveTab('repairs')}
          style={styles.tabButton}
        >
          Repairs
        </Button>
        <Button
          mode={activeTab === 'offers' ? 'contained' : 'outlined'}
          onPress={() => setActiveTab('offers')}
          style={styles.tabButton}
        >
          Offers
        </Button>
      </Surface>

      <FlatList
        data={filteredRepairs}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <Card
            mode="outlined"
            style={styles.repairCard}
            onPress={() => navigation.navigate('RepairDetail', { repairId: item.id })}
          >
            <Card.Content>
              <Text style={styles.repairTitle}>{item.repair_type_name}</Text>
              <Text>Status: {item.status}</Text>
              <Text>{item.description}</Text>
            </Card.Content>
          </Card>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No {activeTab} found.</Text>
        }
      />
    </Surface>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 12,
  },
  vehicleCard: {
    marginBottom: 12,
  },
  loading: {
    marginTop: 50,
  },
  tabBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: 8,
  },
  tabButton: {
    marginHorizontal: 6,
  },
  listContent: {
    paddingBottom: 20,
  },
  repairCard: {
    marginVertical: 6,
  },
  repairTitle: {
    fontWeight: 'bold',
  },
  emptyText: {
    textAlign: 'center',
    marginVertical: 20,
  },
});