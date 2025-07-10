// PATH: src/components/shop/RepairsList.js

import React, { useEffect, useState } from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getRepairs } from '../../api/repairs';
import { getMyOffers } from '../../api/offers';
import { useNavigation } from '@react-navigation/native';
import { Text, ActivityIndicator, Chip, Card, useTheme } from 'react-native-paper';

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
      mode="outlined"
      style={[styles.card, { borderColor: theme.colors.primary }]}
      onPress={() => navigation.navigate('RepairDetail', { repairId: item.id })}
    >
      <Card.Title
        title={`${item.vehicle_brand} ${item.vehicle_model} (${item.vehicle_license_plate})`}
        titleStyle={{ color: theme.colors.primary }}
      />
      <Card.Content>
        <Text>Status: {item.status}</Text>
        <Text>Description: {item.description}</Text>
        <Text>Kilometers: {item.kilometers}</Text>
      </Card.Content>
    </Card>
  );

  const renderOffer = ({ item }) => (
    <Card
      mode="outlined"
      style={[styles.card, { borderColor: theme.colors.primary }]}
      onPress={() => navigation.navigate('RepairDetail', { repairId: item.repair })}
    >
      <Card.Title
        title={`Vehicle: ${item.vehicle_brand} ${item.vehicle_model} (${item.vehicle_license_plate})`}
        titleStyle={{ color: theme.colors.primary }}
      />
      <Card.Content>
        <Text>Price: {item.price} BGN</Text>
        <Text>Description: {item.description}</Text>
      </Card.Content>
    </Card>
  );

  const tabOptions = ['open', 'ongoing', 'done', 'offers'];

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.tabContainer}>
        {tabOptions.map((tab) => {
          const isSelected = tab === selectedTab;
          return (
            <Chip
              key={tab}
              selected={isSelected}
              onPress={() => setSelectedTab(tab)}
              style={[
                styles.chip,
                isSelected
                  ? { backgroundColor: theme.colors.primary }
                  : { borderColor: theme.colors.primary, borderWidth: 1 },
              ]}
              textStyle={{
                color: isSelected ? theme.colors.onPrimary : theme.colors.primary,
              }}
            >
              {tab.toUpperCase()}
            </Chip>
          );
        })}
      </View>

      {loading ? (
        <ActivityIndicator size="large" style={styles.loading} color={theme.colors.primary} />
      ) : selectedTab === 'offers' ? (
        <FlatList
          data={offers}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderOffer}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              No offers sent yet
            </Text>
          }
        />
      ) : (
        <FlatList
          data={repairs}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderRepair}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              No repairs found for status "{selectedTab}"
            </Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
  },
  tabContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: 12,
  },
  chip: {
    margin: 4,
    borderRadius: 16,
  },
  card: {
    marginVertical: 6,
    marginHorizontal: 8,
    borderRadius: 8,
  },
  loading: {
    marginTop: 20,
  },
  listContent: {
    paddingBottom: 20,
  },
  emptyText: {
    textAlign: 'center',
    marginVertical: 20,
  },
});