// src/components/shop/AuthorizedClients.js

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  FlatList,
  TouchableOpacity,
  LayoutAnimation,
  UIManager,
  Platform,
  StyleSheet,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { API_BASE_URL } from '../../api/config';
import CommonButton from '../CommonButton';
import BASE_STYLES from '../../styles/base';

const API_URL = `${API_BASE_URL}/api/shops/authorized-clients/`;

// Enable Layout Animation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function AuthorizedClients({ navigation }) {
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
      setClients(data);
    } catch (error) {
      console.error('Error fetching authorized clients', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch on mount + when screen refocuses
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

  if (loading) return <ActivityIndicator size="large" />;

  return (
    <View style={BASE_STYLES.overlay}>
      <Text style={BASE_STYLES.title}>Authorized Clients</Text>

      <CommonButton
        title="➕ Add Client"
        onPress={() => navigation.navigate('ShopRegisterClient')}
        style={styles.addButton}
      />

      <FlatList
        data={clients}
        keyExtractor={(item) => item.client.id.toString()}
        renderItem={({ item }) => {
          const expanded = expandedClientIds.includes(item.client.id);
          const clientLabel = item.client.email
            ? item.client.email
            : item.client.phone
            ? item.client.phone
            : 'Unnamed Client';

          return (
            <View style={BASE_STYLES.sectionBox}>
              <TouchableOpacity onPress={() => toggleExpand(item.client.id)}>
                <Text style={BASE_STYLES.subText}>{clientLabel}</Text>
              </TouchableOpacity>

              {expanded && (
                <View style={{ marginTop: 8 }}>
                  {item.vehicles.map((vehicle) => (
                    <TouchableOpacity
                      key={vehicle.id}
                      onPress={() => navigation.navigate('VehicleDetail', { vehicleId: vehicle.id })}
                      style={BASE_STYLES.listItem}
                    >
                      <Text style={BASE_STYLES.subText}>{vehicle.license_plate}</Text>
                      <Text>{vehicle.brand_name} {vehicle.model_name}</Text>
                      <Text>Year: {vehicle.year}</Text>
                      <Text>Kilometers: {vehicle.kilometers}</Text>
                    </TouchableOpacity>
                  ))}

                  <CommonButton
                    title="➕ Add Vehicle"
                    onPress={() =>
                      navigation.navigate('CreateVehicle', {
                        clientId: item.client.id,
                        clientEmail: item.client.email,
                        clientPhone: item.client.phone,
                      })
                    }
                    style={styles.addVehicleButton}
                  />
                </View>
              )}
            </View>
          );
        }}
        ListEmptyComponent={
          <Text style={{ textAlign: 'center', marginVertical: 20 }}>
            No authorized clients
          </Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  addButton: {
    marginVertical: 12,
    alignSelf: 'center',
  },
  addVehicleButton: {
    marginTop: 12,
    alignSelf: 'center',
  },
});