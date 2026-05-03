// PATH: src/components/shop/AuthorizedClients.js

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  LayoutAnimation,
  UIManager,
  Platform,
  StyleSheet,
  FlatList,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import {
  Text,
  ActivityIndicator,
  Button,
} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import { API_BASE_URL } from '../../api/config';
import ScreenBackground from '../ScreenBackground';
import FloatingCard from '../ui/FloatingCard';
import AppCard from '../ui/AppCard';
import EmptyStateCard from '../ui/EmptyStateCard';
import {
  PRIMARY,
  PRIMARY_LIGHT,
  TEXT_DARK,
  TEXT_MUTED,
} from '../../constants/colors';
import { stackContentPaddingTop } from '../../navigation/stackContentInset';

const API_URL = `${API_BASE_URL}/api/profiles/shops/authorized-clients/`;

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function AuthorizedClients({ navigation }) {
  const insets = useSafeAreaInsets();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedClientIds, setExpandedClientIds] = useState([]);

  const fetchAuthorized = useCallback(async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('@access_token');
      const response = await fetch(API_URL, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setClients(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching authorized clients', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchAuthorized();
    }, [fetchAuthorized])
  );

  const toggleExpand = (clientId) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedClientIds((prev) =>
      prev.includes(clientId)
        ? prev.filter((id) => id !== clientId)
        : [...prev, clientId]
    );
  };

  const renderClient = ({ item }) => {
    const expanded = expandedClientIds.includes(item.client.id);
    const clientLabel =
      item.client.email ||
      item.client.phone ||
      'Unnamed Client';
    const vehicleCount = item.vehicles?.length ?? 0;

    return (
      <FloatingCard onPress={() => toggleExpand(item.client.id)}>
        <View style={styles.clientRow}>
          <View style={styles.avatar}>
            <MaterialCommunityIcons name="account" size={22} color={PRIMARY} />
          </View>
          <View style={styles.clientInfo}>
            <Text style={styles.clientLabel} numberOfLines={2}>
              {clientLabel}
            </Text>
            <Text style={styles.clientMeta}>
              {vehicleCount} {vehicleCount === 1 ? 'vehicle' : 'vehicles'}
            </Text>
          </View>
          <MaterialCommunityIcons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={22}
            color={TEXT_MUTED}
          />
        </View>

        {expanded && (
          <View style={styles.expandedContent}>
            {item.vehicles?.map((vehicle) => (
              <FloatingCard
                key={vehicle.id}
                accent={false}
                onPress={() =>
                  navigation.navigate('VehicleDetail', { vehicleId: vehicle.id })
                }
                style={styles.subCard}
              >
                <Text style={styles.vehicleTitle}>{vehicle.license_plate}</Text>
                <Text style={styles.vehicleLine}>
                  {vehicle.make_name} {vehicle.model_name}
                </Text>
                <View style={styles.vehicleMetaRow}>
                  {!!vehicle.year && (
                    <Text style={styles.vehicleMeta}>Year: {vehicle.year}</Text>
                  )}
                  {vehicle.kilometers != null && (
                    <Text style={styles.vehicleMeta}>
                      {Number(vehicle.kilometers).toLocaleString()} km
                    </Text>
                  )}
                </View>
              </FloatingCard>
            ))}

            <Button
              mode="contained"
              icon="plus"
              onPress={() =>
                navigation.navigate('CreateVehicle', {
                  clientId: item.client.id,
                  clientEmail: item.client.email,
                  clientPhone: item.client.phone,
                })
              }
              style={styles.addVehicleButton}
              buttonColor={PRIMARY}
              textColor="#fff"
            >
              Add Vehicle
            </Button>
          </View>
        )}
      </FloatingCard>
    );
  };

  if (loading) {
    return (
      <ScreenBackground>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#fff" />
        </View>
      </ScreenBackground>
    );
  }

  return (
    <ScreenBackground safeArea={false}>
      <View style={[styles.container, { paddingTop: stackContentPaddingTop(insets, 12) }]}>
        <AppCard variant="dark" accent={false} style={styles.heroCard}>
          <View style={styles.heroRow}>
            <View style={styles.heroIconWrap}>
              <MaterialCommunityIcons
                name="shield-account-outline"
                size={28}
                color={PRIMARY_LIGHT}
              />
            </View>
            <View style={styles.heroTextWrap}>
              <Text style={styles.heroTitle}>Authorized Clients</Text>
              <Text style={styles.heroSubtitle}>
                {clients.length} {clients.length === 1 ? 'client' : 'clients'} authorized
              </Text>
            </View>
          </View>
          <Button
            mode="contained"
            icon="plus"
            onPress={() => navigation.navigate('ShopRegisterClient')}
            style={styles.addButton}
            buttonColor={PRIMARY}
            textColor="#fff"
          >
            Add Client
          </Button>
        </AppCard>

        <FlatList
          data={clients}
          keyExtractor={(item) =>
            item.client.id?.toString() ?? Math.random().toString()
          }
          renderItem={renderClient}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <EmptyStateCard
              icon="account-multiple-outline"
              title="No authorized clients yet"
              subtitle="Add a client or authorize a vehicle to start managing repairs."
            />
          }
        />
      </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    flex: 1,
    paddingHorizontal: 12,
    backgroundColor: 'transparent',
  },
  heroCard: {
    marginBottom: 14,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  heroIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: 'rgba(96,165,250,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  heroTextWrap: {
    flex: 1,
  },
  heroTitle: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 13,
    marginTop: 2,
  },
  addButton: {
    borderRadius: 12,
  },
  listContent: {
    paddingBottom: 20,
  },
  clientRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(37,99,235,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  clientInfo: {
    flex: 1,
  },
  clientLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: TEXT_DARK,
  },
  clientMeta: {
    fontSize: 12,
    color: TEXT_MUTED,
    marginTop: 2,
  },
  expandedContent: {
    paddingTop: 12,
  },
  subCard: {
    marginTop: 8,
    marginBottom: 4,
    padding: 12,
  },
  vehicleTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: TEXT_DARK,
    letterSpacing: 0.4,
  },
  vehicleLine: {
    fontSize: 13,
    color: TEXT_DARK,
    marginTop: 2,
  },
  vehicleMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  vehicleMeta: {
    fontSize: 12,
    color: TEXT_MUTED,
    marginRight: 12,
  },
  addVehicleButton: {
    marginTop: 14,
    alignSelf: 'flex-start',
    borderRadius: 12,
  },
});
