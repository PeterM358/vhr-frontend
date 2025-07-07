// PATH: src/components/shop/RepairsList.js

import React, { useEffect, useState } from 'react';
import { View, FlatList } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getRepairs } from '../../api/repairs';
import { getMyOffers } from '../../api/offers';
import { useNavigation } from '@react-navigation/native';
import { Text, ActivityIndicator, Button, Chip, Card, useTheme } from 'react-native-paper';

export default function RepairsList() {
  const [repairs, setRepairs] = useState([]);
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState('open');
  const navigation = useNavigation();
  const theme = useTheme();

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
    <Card
      style={{ marginVertical: 6 }}
      onPress={() => navigation.navigate('RepairDetail', { repairId: item.id })}
    >
      <Card.Title title={`${item.vehicle_brand} ${item.vehicle_model} (${item.vehicle_license_plate})`} />
      <Card.Content>
        <Text>Status: {item.status}</Text>
        <Text>Description: {item.description}</Text>
        <Text>Kilometers: {item.kilometers}</Text>
      </Card.Content>
    </Card>
  );

  const renderOffer = ({ item }) => (
    <Card
      style={{ marginVertical: 6 }}
      onPress={() => navigation.navigate('RepairDetail', { repairId: item.repair })}
    >
      <Card.Title title={`Vehicle: ${item.vehicle_brand} ${item.vehicle_model} (${item.vehicle_license_plate})`} />
      <Card.Content>
        <Text>Price: {item.price} BGN</Text>
        <Text>Description: {item.description}</Text>
      </Card.Content>
    </Card>
  );

  const tabOptions = ['open', 'ongoing', 'done', 'offers'];

  return (
    <View style={{ flex: 1, padding: 10, backgroundColor: theme.colors.background }}>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginBottom: 12 }}>
        {tabOptions.map((tab) => (
          <Chip
            key={tab}
            selected={tab === selectedTab}
            onPress={() => setSelectedTab(tab)}
            style={{ margin: 4 }}
          >
            {tab.toUpperCase()}
          </Chip>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator size="large" style={{ marginTop: 20 }} />
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