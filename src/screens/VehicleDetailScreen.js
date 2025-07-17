/**
 * PATH: src/screens/VehicleDetailScreen.js
 */

import React, { useEffect, useState, useLayoutEffect } from 'react';
import { FlatList, ActivityIndicator, StyleSheet, View, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Card,
  Text,
  Button,
  useTheme,
  Surface,
  FAB,
  SegmentedButtons,
  IconButton
} from 'react-native-paper';
import { API_BASE_URL } from '../api/config';

export default function VehicleDetailScreen({ route, navigation }) {
  const { vehicleId } = route.params;
  const [vehicle, setVehicle] = useState(null);
  const [repairs, setRepairs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('repairs');
  const [isShop, setIsShop] = useState(false);

  const theme = useTheme();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerBackTitleVisible: false,
      headerTintColor: theme.colors.onPrimary,
      headerStyle: {
        backgroundColor: theme.colors.primary,
      },
      headerLeft: undefined,
    });
  }, [navigation, isShop, theme.colors.primary, theme.colors.onPrimary]);
  // ✅ Load isShop flag from storage
  useEffect(() => {
    const loadRole = async () => {
      const val = await AsyncStorage.getItem('@is_shop');
      setIsShop(val === 'true');
    };
    loadRole();
  }, []);

  useEffect(() => {
    const fetchVehicleDetails = async () => {
      const token = await AsyncStorage.getItem('@access_token');
      try {
        const res = await fetch(`${API_BASE_URL}/api/vehicles/${vehicleId}/`, {
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
    return <ActivityIndicator size="large" color={theme.colors.primary} style={styles.loading} />;
  }

  if (!vehicle) {
    return <Text style={[styles.emptyText, { color: theme.colors.onBackground }]}>Vehicle not found.</Text>;
  }

  const filteredRepairs = repairs.filter(r => {
    if (activeTab === 'repairs') return r.status === 'done';
    if (activeTab === 'offers') return r.status === 'offer';
    return false;
  });

  return (
    <View style={{ flex: 1 }}>
      <Surface style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Card mode="outlined" style={[styles.vehicleCard, { borderColor: theme.colors.primary }]}>
          <Card.Title
            title={`Plate: ${vehicle.license_plate}`}
            titleStyle={{ color: theme.colors.onSurface }}
          />
          <Card.Content>
            <Text style={{ color: theme.colors.onSurface }}>Make: {vehicle.make_name}</Text>
            <Text style={{ color: theme.colors.onSurface }}>Model: {vehicle.model_name}</Text>
            <Text style={{ color: theme.colors.onSurface }}>Year: {vehicle.year}</Text>
          </Card.Content>
        </Card>

        <SegmentedButtons
          value={activeTab}
          onValueChange={setActiveTab}
          style={styles.segmented}
          buttons={[
            {
              value: 'repairs',
              label: 'Repairs',
              icon: 'car-wrench',
              style: {
                backgroundColor:
                  activeTab === 'repairs' ? theme.colors.primary : theme.colors.surface,
                borderColor: theme.colors.primary,
                borderWidth: 1,
              },
              labelStyle: {
                color:
                  activeTab === 'repairs'
                    ? theme.colors.onPrimary
                    : theme.colors.primary,
                fontWeight: 'bold',
              },
              icon: {
                color:
                  activeTab === 'repairs'
                    ? theme.colors.onPrimary
                    : theme.colors.primary,
              },
            },
            {
              value: 'offers',
              label: 'Offers',
              icon: 'tag-outline',
              style: {
                backgroundColor:
                  activeTab === 'offers' ? theme.colors.primary : theme.colors.surface,
                borderColor: theme.colors.primary,
                borderWidth: 1,
              },
              labelStyle: {
                color:
                  activeTab === 'offers'
                    ? theme.colors.onPrimary
                    : theme.colors.primary,
                fontWeight: 'bold',
              },
              icon: {
                color:
                  activeTab === 'offers'
                    ? theme.colors.onPrimary
                    : theme.colors.primary,
              },
            },
          ]}
        />

        <FlatList
          data={filteredRepairs}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <Card
              mode="outlined"
              style={[styles.repairCard, { borderColor: theme.colors.primary }]}
              onPress={() => navigation.navigate('RepairChat', { repairId: item.id })}
            >
              <Card.Content>
                <Text style={[styles.repairTitle, { color: theme.colors.onSurface }]}>{item.repair_type_name}</Text>
                <Text style={{ color: theme.colors.onSurface }}>Status: {item.status}</Text>
                <Text style={{ color: theme.colors.onSurface }}>{item.description}</Text>
              </Card.Content>
            </Card>
          )}
          ListEmptyComponent={
            <Text style={[styles.emptyText, { color: theme.colors.onSurface }]}>No {activeTab} found.</Text>
          }
        />
      </Surface>

      <FAB
        icon="plus"
        label="Add Repair"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        color={theme.colors.onPrimary}
        onPress={() => {
          if (isShop) {
            navigation.navigate('CreateRepair', {
              vehicleId,
              preselectedStatus: 'done',
            });
          } else {
            Alert.alert(
              'New Repair',
              'What type of repair do you want to add?',
              [
                {
                  text: 'Log Personal Repair',
                  onPress: () =>
                    navigation.navigate('ClientLogRepair', {
                      vehicleId,
                      preselectedStatus: 'done',
                    }),
                },
                {
                  text: 'Request from Shop',
                  onPress: () =>
                    navigation.navigate('ClientRequestRepair', {
                      vehicleId,
                      preselectedStatus: 'open',
                    }),
                },
                { text: 'Cancel', style: 'cancel' },
              ]
            );
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 12,
  },
  vehicleCard: {
    marginBottom: 12,
    borderWidth: 1,
  },
  loading: {
    marginTop: 50,
  },
  listContent: {
    paddingBottom: 80,
  },
  repairCard: {
    marginVertical: 6,
    borderWidth: 1,
  },
  repairTitle: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  emptyText: {
    textAlign: 'center',
    marginVertical: 20,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
  },
  segmented: {
    marginVertical: 12,
    alignSelf: 'center',
    width: '90%',
  },
});