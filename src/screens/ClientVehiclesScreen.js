import React, { useEffect, useState } from 'react';
import { FlatList, ActivityIndicator, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getVehicles } from '../api/vehicles';
import { Text, FAB, useTheme, TouchableRipple } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import ScreenBackground from '../components/ScreenBackground';
import { stackContentPaddingTop } from '../navigation/stackContentInset';

export default function ClientVehiclesScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isShop, setIsShop] = useState(false);
  const theme = useTheme();

  useEffect(() => {
    const fetchIsShop = async () => {
      const shopFlag = await AsyncStorage.getItem('@is_shop');
      setIsShop(shopFlag === 'true');
    };
    fetchIsShop();
  }, []);

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

  const renderVehicle = ({ item }) => (
    <TouchableRipple
      style={styles.card}
      borderless
      onPress={() => navigation.navigate('VehicleDetail', { vehicleId: item.id })}
    >
      <View style={styles.cardInner}>
        <View style={styles.thumb}>
          <MaterialCommunityIcons name="car" size={32} color="#475569" />
        </View>

        <View style={styles.cardBody}>
          <View style={styles.rowTop}>
            <Text style={styles.plate} numberOfLines={1}>
              {item.license_plate || '—'}
            </Text>
            {item.year ? (
              <View style={styles.yearBadge}>
                <Text style={styles.yearBadgeText}>{item.year}</Text>
              </View>
            ) : null}
          </View>

          <Text style={styles.makeModel} numberOfLines={1}>
            {[item.make_name, item.model_name].filter(Boolean).join(' ') || 'Unknown vehicle'}
          </Text>

          {item.kilometers != null && item.kilometers !== '' ? (
            <Text style={styles.km} numberOfLines={1}>
              {Number(item.kilometers).toLocaleString()} km
            </Text>
          ) : null}
        </View>

        <MaterialCommunityIcons name="chevron-right" size={24} color="#94a3b8" />
      </View>
    </TouchableRipple>
  );

  if (loading) {
    return (
      <ScreenBackground safeArea={false}>
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="#fff" />
        </View>
      </ScreenBackground>
    );
  }

  return (
    <ScreenBackground safeArea={false}>
      <View style={[styles.container, { paddingTop: stackContentPaddingTop(insets, 12) }]}>
        <FlatList
          data={vehicles}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          renderItem={renderVehicle}
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
      </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingBottom: 100,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.08)',
  },
  cardInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  cardBody: {
    flex: 1,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  plate: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: '#0f172a',
    letterSpacing: 0.5,
  },
  yearBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: '#e2e8f0',
    marginLeft: 8,
  },
  yearBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  makeModel: {
    fontSize: 14,
    color: '#1e293b',
    marginBottom: 2,
  },
  km: {
    fontSize: 12,
    color: '#64748b',
  },
  emptyText: {
    textAlign: 'center',
    marginVertical: 30,
    color: 'rgba(255,255,255,0.85)',
    fontSize: 15,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
  },
});
