// PATH: src/screens/ClientVehiclesScreen.js

import React, { useEffect, useState } from 'react';
import { FlatList, ActivityIndicator, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getVehicles } from '../api/vehicles';
import { Surface, Text, Card, Button, FAB, useTheme } from 'react-native-paper';

export default function ClientVehiclesScreen({ navigation }) {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const theme = useTheme();

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
      <Surface style={styles.loader}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </Surface>
    );
  }

  return (
    <Surface style={styles.container}>
      <FlatList
        data={vehicles}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <Card
            style={styles.card}
            onPress={() => navigation.navigate('VehicleDetail', { vehicleId: item.id })}
          >
            <Card.Content>
              <Text variant="titleMedium">Plate: {item.license_plate}</Text>
              <Text>Make: {item.brand_name}</Text>
              <Text>Model: {item.model_name}</Text>
              <Text>Year: {item.year}</Text>
            </Card.Content>
          </Card>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No vehicles found. Add one!</Text>
        }
      />

      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        onPress={() => navigation.navigate('CreateVehicle')}
        label="Add Vehicle"
        color={theme.colors.onPrimary} 
      />
    </Surface>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    marginBottom: 16,
    textAlign: 'center',
  },
  listContent: {
    paddingBottom: 80,
  },
  card: {
    marginVertical: 8,
    elevation: 2,
  },
  emptyText: {
    textAlign: 'center',
    marginVertical: 20,
    color: '#888',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
  },
});