/**
 * PATH: src/screens/VehicleDetailScreen.js
 */

import React, { useEffect, useState } from 'react';
import { FlatList, ActivityIndicator, StyleSheet, View, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Text,
  useTheme,
  FAB,
  SegmentedButtons,
  TouchableRipple,
} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { API_BASE_URL } from '../api/config';
import ScreenBackground from '../components/ScreenBackground';
import { stackContentPaddingTop } from '../navigation/stackContentInset';

export default function VehicleDetailScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { vehicleId } = route.params;
  const [vehicle, setVehicle] = useState(null);
  const [repairs, setRepairs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('repairs');
  const [isShop, setIsShop] = useState(false);

  const theme = useTheme();

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
    return (
      <ScreenBackground safeArea={false}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#fff" />
        </View>
      </ScreenBackground>
    );
  }

  if (!vehicle) {
    return (
      <ScreenBackground safeArea={false}>
        <View style={styles.center}>
          <Text style={styles.emptyText}>Vehicle not found.</Text>
        </View>
      </ScreenBackground>
    );
  }

  const filteredRepairs = repairs.filter((r) => {
    if (activeTab === 'repairs') return r.status === 'done';
    if (activeTab === 'offers') return r.status === 'offer';
    return false;
  });

  const renderRepair = ({ item }) => (
    <TouchableRipple
      borderless
      style={styles.repairCard}
      onPress={() => navigation.navigate('RepairChat', { repairId: item.id })}
    >
      <View>
        <Text style={styles.repairTitle} numberOfLines={1}>
          {item.repair_type_name || 'Repair'}
        </Text>
        <Text style={styles.repairMeta}>Status: {item.status}</Text>
        {item.description ? (
          <Text style={styles.repairDesc} numberOfLines={2}>
            {item.description}
          </Text>
        ) : null}
      </View>
    </TouchableRipple>
  );

  return (
    <ScreenBackground safeArea={false}>
      <View style={[styles.container, { paddingTop: stackContentPaddingTop(insets, 12) }]}>
        {/* Hero card */}
        <View style={styles.heroCard}>
          <View style={styles.heroIconWrap}>
            <MaterialCommunityIcons name="car-sports" size={36} color="#fff" />
          </View>

          <View style={styles.heroBody}>
            <View style={styles.heroTopRow}>
              <Text style={styles.heroPlate} numberOfLines={1}>
                {vehicle.license_plate || '—'}
              </Text>
              {vehicle.year ? (
                <View style={styles.heroBadge}>
                  <Text style={styles.heroBadgeText}>{vehicle.year}</Text>
                </View>
              ) : null}
            </View>
            <Text style={styles.heroMakeModel} numberOfLines={1}>
              {[vehicle.make_name, vehicle.model_name].filter(Boolean).join(' ') ||
                'Unknown vehicle'}
            </Text>
            {vehicle.kilometers != null && vehicle.kilometers !== '' ? (
              <Text style={styles.heroKm}>
                {Number(vehicle.kilometers).toLocaleString()} km
              </Text>
            ) : null}
          </View>
        </View>

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
                  activeTab === 'repairs' ? theme.colors.primary : 'rgba(255,255,255,0.92)',
                borderColor: theme.colors.primary,
                borderWidth: 1,
              },
              labelStyle: {
                color:
                  activeTab === 'repairs' ? theme.colors.onPrimary : theme.colors.primary,
                fontWeight: 'bold',
              },
            },
            {
              value: 'offers',
              label: 'Offers',
              icon: 'tag-outline',
              style: {
                backgroundColor:
                  activeTab === 'offers' ? theme.colors.primary : 'rgba(255,255,255,0.92)',
                borderColor: theme.colors.primary,
                borderWidth: 1,
              },
              labelStyle: {
                color:
                  activeTab === 'offers' ? theme.colors.onPrimary : theme.colors.primary,
                fontWeight: 'bold',
              },
            },
          ]}
        />

        <FlatList
          data={filteredRepairs}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          renderItem={renderRepair}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No {activeTab} found.</Text>
          }
        />
      </View>

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
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(5,15,30,0.72)',
    borderColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
  },
  heroIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  heroBody: {
    flex: 1,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  heroPlate: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },
  heroBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.14)',
    marginLeft: 8,
  },
  heroBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  heroMakeModel: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.92)',
    marginBottom: 2,
  },
  heroKm: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
  },
  segmented: {
    marginVertical: 12,
    alignSelf: 'center',
    width: '90%',
  },
  listContent: {
    paddingBottom: 100,
  },
  repairCard: {
    backgroundColor: 'rgba(5,15,30,0.72)',
    borderColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
  },
  repairTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  repairMeta: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.78)',
    marginBottom: 2,
  },
  repairDesc: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.65)',
  },
  emptyText: {
    textAlign: 'center',
    marginVertical: 20,
    color: 'rgba(255,255,255,0.85)',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
  },
});
