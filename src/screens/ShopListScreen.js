import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getShops } from '../api/shops';

export default function ShopListScreen({ navigation, route }) {
  const { vehicleId } = route.params;
  const [addressFilter, setAddressFilter] = useState('');
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchShops = async () => {
    const token = await AsyncStorage.getItem('@access_token');
    setLoading(true);
    try {
      const data = await getShops(token, addressFilter);
      setShops(data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchShops();
  }, []);

  const handleSearch = () => {
    fetchShops();
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.itemBox}
      onPress={() => navigation.navigate('ShopDetail', { shopId: item.id, vehicleId })}
    >
      <Text style={styles.name}>{item.name}</Text>
      <Text>{item.address}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="Filter by address"
        value={addressFilter}
        onChangeText={setAddressFilter}
      />
      <TouchableOpacity onPress={handleSearch} style={styles.searchButton}>
        <Text style={styles.searchText}>Search</Text>
      </TouchableOpacity>

      {loading ? (
        <ActivityIndicator />
      ) : (
        <FlatList
          data={shops}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          ListEmptyComponent={<Text>No shops found</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  searchButton: {
    backgroundColor: '#007AFF',
    padding: 10,
    alignItems: 'center',
    borderRadius: 8,
    marginBottom: 10,
  },
  searchText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  itemBox: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
  },
});
