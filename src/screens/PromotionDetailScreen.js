import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Button,
  Alert,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';
import { bookPromotion, unbookPromotion } from '../api/offers';
import { getVehicles } from '../api/vehicles';
import { API_BASE_URL } from '../api/config';
import BASE_STYLES from '../styles/base';
import CommonButton from '../components/CommonButton';


export default function PromotionDetailScreen({ route, navigation }) {
  const { promotion } = route.params;

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
    <View style={BASE_STYLES.overlay}>
       <View style={BASE_STYLES.sectionBox}>
        <Text style={BASE_STYLES.title}>{promotion.repair_type_name}</Text>
        <Text style={BASE_STYLES.subText}>{promotion.description}</Text>
        <Text style={BASE_STYLES.subText}>Price: {promotion.price} BGN</Text>
        <Text style={BASE_STYLES.subText}>Shop: {promotion.shop_name}</Text>
      </View>
      <Text style={BASE_STYLES.label}>Select Vehicle:</Text>
      <Picker
        selectedValue={selectedVehicleId}
        onValueChange={(val) => setSelectedVehicleId(val)}
        style={BASE_STYLES.picker}
      >
        {vehicles.map((v) => (
          <Picker.Item
            key={v.id.toString()}
            label={`${v.license_plate} (${v.brand_name} ${v.model_name})`}
            value={v.id.toString()}
          />
        ))}
      </Picker>
  
      {alreadyBooked ? (
        <CommonButton title="Unbook Promotion" onPress={handleUnbook} color="red" />
      ) : (
        <CommonButton title="Book Promotion" onPress={handleBook} />
      )}
    </View>
  );
  
}

