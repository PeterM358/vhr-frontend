// PATH: src/screens/PromotionDetailScreen.js

import React, { useEffect, useState } from 'react';
import {
  View,
  Alert,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';
import { bookPromotion, unbookPromotion } from '../api/offers';
import { getVehicles } from '../api/vehicles';
import { API_BASE_URL } from '../api/config';

import { Card, Text, Button, useTheme, Divider } from 'react-native-paper';

export default function PromotionDetailScreen({ route, navigation }) {
  const { promotion } = route.params;
  const theme = useTheme();

  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState(null);
  const [alreadyBooked, setAlreadyBooked] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = await AsyncStorage.getItem('@access_token');
        const data = await getVehicles(token);
        setVehicles(data);

        if (data.length > 0) {
          const defaultId = data[0].id.toString();
          setSelectedVehicleId(defaultId);

          const response = await fetch(`${API_BASE_URL}/api/offers/${promotion.id}/`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const offerDetail = await response.json();

          const already = offerDetail.bookings?.some(
            (b) => b.vehicle === parseInt(defaultId)
          );
          setAlreadyBooked(already);
        }
      } catch (err) {
        Alert.alert('Error', 'Failed to load vehicles or booking info');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleBook = async () => {
    try {
      const token = await AsyncStorage.getItem('@access_token');
      await bookPromotion(token, promotion.id, parseInt(selectedVehicleId));
      Alert.alert('Success', 'Promotion booked!');
      navigation.goBack();
    } catch (err) {
      Alert.alert('Error', err.message || 'Booking failed');
    }
  };

  const handleUnbook = async () => {
    try {
      const token = await AsyncStorage.getItem('@access_token');
      await unbookPromotion(token, promotion.id, parseInt(selectedVehicleId));
      Alert.alert('Cancelled', 'Booking has been removed.');
      navigation.goBack();
    } catch (err) {
      Alert.alert('Error', err.message || 'Unbooking failed');
    }
  };

  if (loading) return <ActivityIndicator size="large" style={{ flex: 1 }} />;

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Card style={styles.card} mode="outlined">
        <Card.Title title={promotion.repair_type_name} subtitle={promotion.shop_name} />
        <Card.Content>
          <Divider style={{ marginVertical: 8 }} />
          <Text variant="bodyMedium">{promotion.description}</Text>
          <Text variant="titleMedium" style={{ marginTop: 8 }}>Price: {promotion.price} BGN</Text>
        </Card.Content>
      </Card>

      <Card style={styles.card} mode="outlined">
        <Card.Content>
          <Text variant="labelLarge">Select Vehicle</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={selectedVehicleId}
              onValueChange={(val) => setSelectedVehicleId(val)}
            >
              {vehicles.map((v) => (
                <Picker.Item
                  key={v.id.toString()}
                  label={`${v.license_plate} (${v.brand_name} ${v.model_name})`}
                  value={v.id.toString()}
                />
              ))}
            </Picker>
          </View>

          {alreadyBooked ? (
            <Button
              mode="contained"
              onPress={handleUnbook}
              style={styles.button}
              buttonColor={theme.colors.error}
            >
              Unbook Promotion
            </Button>
          ) : (
            <Button
              mode="contained"
              onPress={handleBook}
              style={styles.button}
            >
              Book Promotion
            </Button>
          )}
        </Card.Content>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    margin: 12,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    marginVertical: 12,
    overflow: 'hidden',
  },
  button: {
    marginTop: 12,
  },
});