// src/screens/HomeScreen.js
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  ImageBackground,
  StyleSheet,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logout } from '../api/auth';
import { getRepairs } from '../api/repairs';
import { getVehicles } from '../api/vehicles';
import { getPromotions } from '../api/offers';
import ClientRepairsList from '../components/client/ClientRepairsList';
import BASE_STYLES from '../styles/base';
import CommonButton from '../components/CommonButton';

export default function HomeScreen({ navigation }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [repairs, setRepairs] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [promotions, setPromotions] = useState([]);
  const [activeTab, setActiveTab] = useState('repairs');

  useEffect(() => {
    const checkAuth = async () => {
      const token = await AsyncStorage.getItem('@access_token');
      const email = await AsyncStorage.getItem('@user_email');
      setIsAuthenticated(!!token);
      if (email) setUserEmail(email);

      if (token) {
        try {
          const [repairsData, vehiclesData, promotionsData] = await Promise.all([
            getRepairs(token),
            getVehicles(token),
            getPromotions(token),
          ]);
          setRepairs(repairsData);
          setVehicles(vehiclesData);
          setPromotions(promotionsData);
        } catch (error) {
          console.error('Failed to fetch data:', error);
        }
      }
    };

    const unsubscribe = navigation.addListener('focus', checkAuth);
    return unsubscribe;
  }, [navigation]);

  const handleLogout = async () => {
    await logout(navigation);
  };

  const renderVehicleItem = ({ item }) => (
    <TouchableOpacity
      style={BASE_STYLES.listItem}
      onPress={() => navigation.navigate('VehicleDetail', { vehicleId: item.id })}
    >
      <Text style={BASE_STYLES.subText}>Plate: {item.license_plate}</Text>
      <Text style={BASE_STYLES.subText}>Make: {item.brand_name}</Text>
      <Text style={BASE_STYLES.subText}>Model: {item.model_name}</Text>
      <Text style={BASE_STYLES.subText}>Year: {item.year}</Text>
    </TouchableOpacity>
  );

  const renderPromotionItem = ({ item }) => (
    <TouchableOpacity
      style={BASE_STYLES.offerCard}
      onPress={() => navigation.navigate('PromotionDetail', { promotion: item })}
    >
      <Text style={BASE_STYLES.offerTitle}>{item.repair_type_name}</Text>
      <Text style={BASE_STYLES.offerDetail}>{item.description}</Text>
      <Text style={BASE_STYLES.price}>Price: {item.price} BGN</Text>
      <Text style={BASE_STYLES.offerDetail}>Shop: {item.shop_name}</Text>
    </TouchableOpacity>
  );

  if (!isAuthenticated) {
    return (
      <ImageBackground
        source={require('../assets/background.jpg')}
        style={BASE_STYLES.background}
        blurRadius={5}
      >
        <View style={BASE_STYLES.overlay}>
          <CommonButton title="Login" onPress={() => navigation.navigate('Login')} />
          <CommonButton title="Register" onPress={() => navigation.navigate('Register')} />
        </View>
      </ImageBackground>
    );
  }

  return (
    <ImageBackground
      source={require('../assets/background.jpg')}
      style={BASE_STYLES.background}
      blurRadius={5}
    >
      <View style={BASE_STYLES.overlay}>
        <Text style={BASE_STYLES.title}>Welcome, {userEmail}</Text>

        <View style={BASE_STYLES.tabBar}>
          <TouchableOpacity
            onPress={() => setActiveTab('repairs')}
            style={activeTab === 'repairs' ? BASE_STYLES.activeTab : BASE_STYLES.inactiveTab}
          >
            <Text>Repairs</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveTab('vehicles')}
            style={activeTab === 'vehicles' ? BASE_STYLES.activeTab : BASE_STYLES.inactiveTab}
          >
            <Text>Vehicles</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveTab('promotions')}
            style={activeTab === 'promotions' ? BASE_STYLES.activeTab : BASE_STYLES.inactiveTab}
          >
            <Text>Promotions</Text>
          </TouchableOpacity>
        </View>

        <CommonButton title="Find Shops on Map" onPress={() => navigation.navigate('ShopMap')} />

        {activeTab === 'repairs' && (
          <ClientRepairsList navigation={navigation} />
        )}

        {activeTab === 'vehicles' && (
          <>
            <CommonButton
              title="➕ Add New Vehicle"
              onPress={() => navigation.navigate('CreateVehicle')}
            />

            <FlatList
              data={vehicles}
              keyExtractor={(item) => item.id.toString()}
              renderItem={renderVehicleItem}
              ListEmptyComponent={<Text style={{ textAlign: 'center', marginVertical: 20 }}>No vehicles found. Add one!</Text>}
            />
          </>
        )}

        {activeTab === 'promotions' && (
          <FlatList
            data={promotions}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderPromotionItem}
            ListEmptyComponent={<Text style={{ textAlign: 'center', marginVertical: 20 }}>No promotions available</Text>}
          />
        )}

        <CommonButton title="Logout" color="red" onPress={handleLogout} />
      </View>
    </ImageBackground>
  );
}
