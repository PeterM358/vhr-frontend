// src/screens/ShopRepairsScreen.js

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { getRepairs } from '../api/repairs';

export default function ShopRepairsScreen({ navigation }) {
  const [repairs, setRepairs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const token = 'your-jwt-token-here'; // Use the token you received from login

  useEffect(() => {
    const fetchRepairs = async () => {
      try {
        const repairsData = await getRepairs(token);
        setRepairs(repairsData);
        setLoading(false);
      } catch (err) {
        setError('Failed to fetch repairs');
        setLoading(false);
      }
    };

    fetchRepairs();
  }, [token]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <Text>Loading repairs...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Repairs</Text>
      <FlatList
        data={repairs}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.repairItem}>
            <Text>Repair ID: {item.id}</Text>
            <Text>Repair Status: {item.status}</Text>
            <Text>Client: {item.client}</Text>
            {/* Display more repair details here */}
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  repairItem: {
    marginBottom: 15,
    padding: 15,
    borderWidth: 1,
    borderRadius: 8,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
  },
});
