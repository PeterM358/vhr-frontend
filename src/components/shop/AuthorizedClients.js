// PATH: src/components/shop/AuthorizedClients.js

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  LayoutAnimation,
  UIManager,
  Platform,
  StyleSheet,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { API_BASE_URL } from '../../api/config';
import { FlatList } from 'react-native';
import {
  Card,
  Text,
  ActivityIndicator,
  Button,
  useTheme,
} from 'react-native-paper';
import CommonButton from '../CommonButton';
import BASE_STYLES from '../../styles/base';

const API_URL = `${API_BASE_URL}/api/profiles/shops/authorized-clients/`;

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function AuthorizedClients({ navigation }) {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedClientIds, setExpandedClientIds] = useState([]);
  const theme = useTheme();

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
    const clientLabel = item.client.email
      ? item.client.email
      : item.client.phone
      ? item.client.phone
      : 'Unnamed Client';

    return (
      <Card
        mode="outlined"
        style={[styles.card, { borderColor: theme.colors.primary }]}
        onPress={() => toggleExpand(item.client.id)}
      >
        <Card.Content style={styles.clientHeader}>
          <Text variant="titleMedium" style={styles.clientLabel} numberOfLines={3}>
            {clientLabel}
          </Text>
        </Card.Content>

        {expanded && (
          <View style={styles.expandedContent}>
            {item.vehicles.map((vehicle) => (
              <Card
                key={vehicle.id}
                mode="contained"
                style={styles.vehicleCard}
                onPress={() => navigation.navigate('VehicleDetail', { vehicleId: vehicle.id })}
              >
                <Card.Content>
                  <Text style={styles.vehicleTitle}>{vehicle.license_plate}</Text>
                  <Text>{vehicle.make_name} {vehicle.model_name}</Text>
                  <Text>Year: {vehicle.year}</Text>
                  <Text>Kilometers: {vehicle.kilometers}</Text>
                </Card.Content>
              </Card>
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
            >
              Add Vehicle
            </Button>
          </View>
        )}
      </Card>
    );
  };

  if (loading) {
    return <ActivityIndicator animating={true} size="large" style={styles.loading} />;
  }

  return (
    <View style={BASE_STYLES.overlay}>
      <Button
        mode="contained"
        icon="plus"
        onPress={() => navigation.navigate('ShopRegisterClient')}
        style={[styles.addButton, { backgroundColor: theme.colors.primary }]}
        labelStyle={{ color: theme.colors.onPrimary }}
      >
        Add Client
      </Button>

      <FlatList
        data={clients}
        keyExtractor={(item) => item.client.id?.toString() ?? Math.random().toString()}
        renderItem={renderClient}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No authorized clients</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  title: {
    marginBottom: 16,
    textAlign: 'center',
  },
  loading: {
    marginTop: 50,
  },
  listContent: {
    paddingBottom: 20,
  },
  card: {
    marginVertical: 10,
    marginHorizontal: 16,
    borderWidth: 1,
  },
  clientHeader: {
    paddingVertical: 16,
    paddingHorizontal: 12,
  },
  clientLabel: {
    fontSize: 16,
    flexWrap: 'wrap',
  },
  expandedContent: {
    padding: 12,
  },
  vehicleCard: {
    marginVertical: 6,
    backgroundColor: '#f5f5f5',
  },
  vehicleTitle: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  addButton: {
    marginVertical: 12,
    alignSelf: 'center',
  },
  addVehicleButton: {
    marginTop: 12,
    alignSelf: 'center',
  },
  emptyText: {
    textAlign: 'center',
    marginVertical: 20,
  },
});