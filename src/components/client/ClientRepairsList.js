// PATH: src/components/client/ClientRepairsList.js

import React, { useEffect, useState } from 'react';
import { View, FlatList } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getRepairs } from '../../api/repairs';
import { Text, ActivityIndicator, Chip, Card, useTheme } from 'react-native-paper';

export default function ClientRepairsList({ navigation }) {
  const [repairs, setRepairs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('open');
  const theme = useTheme();

  useEffect(() => {
    const fetchRepairs = async () => {
      setLoading(true);
      try {
        const token = await AsyncStorage.getItem('@access_token');
        const data = await getRepairs(token, statusFilter);
        setRepairs(data);
      } catch (err) {
        console.error('Failed to load repairs', err);
      } finally {
        setLoading(false);
      }
    };

    fetchRepairs();
  }, [statusFilter]);

  const renderRepair = ({ item }) => (
    <Card
      style={{ marginVertical: 6 }}
      onPress={() => navigation.navigate('RepairDetail', { repairId: item.id })}
    >
      <Card.Title title={`${item.vehicle_make} ${item.vehicle_model} (${item.vehicle_license_plate})`} />
      <Card.Content>
        <Text>Status: {item.status}</Text>
        <Text>Description: {item.description}</Text>
        <Text>Kilometers: {item.kilometers}</Text>
      </Card.Content>
    </Card>
  );

  return (
    <View style={{ flex: 1, padding: 10, backgroundColor: theme.colors.background }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginBottom: 12 }}>
        {['open', 'ongoing', 'done'].map((status) => (
          <Chip
            key={status}
            selected={status === statusFilter}
            onPress={() => setStatusFilter(status)}
            style={{ margin: 4 }}
          >
            {status.toUpperCase()}
          </Chip>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator size="large" style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={repairs}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderRepair}
          ListEmptyComponent={
            <Text style={{ textAlign: 'center', marginVertical: 20 }}>
              No repairs found.
            </Text>
          }
        />
      )}
    </View>
  );
}