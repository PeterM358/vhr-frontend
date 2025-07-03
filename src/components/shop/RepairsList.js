// PATH: src/components/shop/RepairsList.js
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getRepairs } from '../../api/repairs';
import { getMyOffers } from '../../api/offers';
import { useNavigation } from '@react-navigation/native';
import BASE_STYLES from '../../styles/base';

export default function RepairsList() {
  const [repairs, setRepairs] = useState([]);
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState('open');
  const navigation = useNavigation();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const token = await AsyncStorage.getItem('@access_token');
      try {
        if (selectedTab === 'offers') {
          const offersData = await getMyOffers(token);
          setOffers(offersData);
        } else {
          const repairsData = await getRepairs(token, selectedTab);
          setRepairs(repairsData);
        }
      } catch (err) {
        console.error('Failed to load data', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedTab]);

  const renderRepair = ({ item }) => (
    <TouchableOpacity
      style={BASE_STYLES.listItem}
      onPress={() => navigation.navigate('RepairDetail', { repairId: item.id })}
    >
      <Text style={BASE_STYLES.subText}>
        {item.vehicle_brand} {item.vehicle_model} ({item.vehicle_license_plate})
      </Text>
      <Text>Status: {item.status}</Text>
      <Text>Description: {item.description}</Text>
      <Text>Kilometers: {item.kilometers}</Text>
    </TouchableOpacity>
  );

  const renderOffer = ({ item }) => (
    <TouchableOpacity
      style={BASE_STYLES.listItem}
      onPress={() => navigation.navigate('RepairDetail', { repairId: item.repair })}
    >
      <Text style={BASE_STYLES.subText}>
        Vehicle: {item.vehicle_brand} {item.vehicle_model} ({item.vehicle_license_plate})
      </Text>
      <Text>Price: {item.price} BGN</Text>
      <Text>Description: {item.description}</Text>
    </TouchableOpacity>
  );

  const tabOptions = ['open', 'ongoing', 'done', 'offers'];

  return (
    <View style={BASE_STYLES.overlay}>
      <Text style={BASE_STYLES.title}>
        {selectedTab === 'offers' ? 'My Sent Offers' : `Repairs (${selectedTab.toUpperCase()})`}
      </Text>

      <View style={BASE_STYLES.tabBar}>
        {tabOptions.map((tab) => (
          <TouchableOpacity
            key={tab}
            style={tab === selectedTab ? BASE_STYLES.activeTab : BASE_STYLES.inactiveTab}
            onPress={() => setSelectedTab(tab)}
          >
            <Text>{tab.toUpperCase()}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator size="large" />
      ) : selectedTab === 'offers' ? (
        <FlatList
          data={offers}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderOffer}
          ListEmptyComponent={
            <Text style={{ textAlign: 'center', marginVertical: 20 }}>
              No offers sent yet
            </Text>
          }
        />
      ) : (
        <FlatList
          data={repairs}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderRepair}
          ListEmptyComponent={
            <Text style={{ textAlign: 'center', marginVertical: 20 }}>
              No repairs found for status "{selectedTab}"
            </Text>
          }
        />
      )}
    </View>
  );
}