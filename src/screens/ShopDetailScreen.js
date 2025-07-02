import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Image,
  FlatList,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { getShopById, uploadShopImage, deleteShopImage } from '../api/shops';
import { getVehicles, updateVehicle } from '../api/vehicles';
import CommonButton from '../components/CommonButton';
import { COLORS } from '../styles/colors';
import BASE_STYLES from '../styles/base';

export default function ShopDetailScreen({ route }) {
  const { shopId } = route.params;
  const [shop, setShop] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [isClientAccount, setIsClientAccount] = useState(false);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    loadData();
  }, [shopId]);

  const loadData = async () => {
    const token = await AsyncStorage.getItem('@access_token');
    const storedUserId = await AsyncStorage.getItem('@user_id');
    const storedIsShop = await AsyncStorage.getItem('@is_shop');

    setUserId(storedUserId);
    const isShopAccount = storedIsShop === 'true';
    setIsClientAccount(!isShopAccount);

    try {
      // Load shop details first
      const shopData = await getShopById(shopId, token);
      setShop(shopData);

      // Determine ownership of THIS shop
      const ownerCheck = shopData.users.includes(parseInt(storedUserId));
      setIsOwner(ownerCheck);

      // Only load vehicles if user is client
      if (!isShopAccount) {
        const vehicleData = await getVehicles(token);
        setVehicles(vehicleData);
      } else {
        setVehicles([]);  // clear out
      }

    } catch (error) {
      Alert.alert('Error', 'Failed to load shop or vehicles.');
    } finally {
      setLoading(false);
    }
  };

  const toggleAuthorization = async (vehicle) => {
    const token = await AsyncStorage.getItem('@access_token');

    const isCurrentlyAuthorized = vehicle.shared_with_shops.some(
      (s) => Number(s.id) === Number(shopId)
    );

    const updatedSharedWithIds = isCurrentlyAuthorized
      ? vehicle.shared_with_shops.filter((s) => Number(s.id) !== Number(shopId)).map((s) => s.id)
      : [...vehicle.shared_with_shops.map((s) => s.id), Number(shopId)];

    try {
      await updateVehicle(
        vehicle.id,
        { shared_with_shops_ids: updatedSharedWithIds },
        token
      );

      setVehicles((prev) =>
        prev.map((v) =>
          v.id === vehicle.id
            ? {
                ...v,
                shared_with_shops: isCurrentlyAuthorized
                  ? v.shared_with_shops.filter((s) => Number(s.id) !== Number(shopId))
                  : [...v.shared_with_shops, { id: shopId, name: shop.name }],
              }
            : v
        )
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to update authorization.');
    }
  };

  const handlePickAndUploadImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Allow access to photos to upload.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.7,
      });

      if (!result.canceled && result.assets.length > 0) {
        const uri = result.assets[0].uri;
        setUploading(true);

        const token = await AsyncStorage.getItem('@access_token');
        await uploadShopImage(shopId, token, uri);

        Alert.alert('Success', 'Image uploaded!');
        await loadData();
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteImage = async (imageId) => {
    try {
      const token = await AsyncStorage.getItem('@access_token');
      await deleteShopImage(shopId, imageId, token);
      Alert.alert('Deleted', 'Image has been deleted.');
      await loadData();
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to delete image.');
    }
  };

  if (loading || !shop) return <ActivityIndicator size="large" style={{ flex: 1 }} />;

  const renderVehicle = ({ item }) => {
    const isAuthorized = item.shared_with_shops.some(
      (s) => Number(s.id) === Number(shopId)
    );
    return (
      <View style={styles.vehicleBox}>
        <Text style={styles.vehicleText}>
          {item.brand_name} {item.model_name} ({item.license_plate})
        </Text>
        <CommonButton
          title={isAuthorized ? 'Unauthorize' : 'Authorize'}
          onPress={() => toggleAuthorization(item)}
          color={isAuthorized ? COLORS.danger : undefined}
        />
      </View>
    );
  };

  const renderHeader = () => (
    <View>
      <Text style={styles.title}>{shop.name}</Text>
      <Text>Address: {shop.address}</Text>
      <Text>Phone: {shop.phone_number}</Text>

      <Text style={styles.subTitle}>Photos of this Shop:</Text>
      {shop.images && shop.images.length > 0 ? (
        <ScrollView horizontal style={styles.imageScroll}>
          {shop.images.map((img) => (
            <View key={img.id} style={styles.imageContainer}>
              <Image
                source={{ uri: img.image_url }}
                style={styles.shopImage}
              />
              {isOwner && (
                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => handleDeleteImage(img.id)}
                >
                  <Text style={styles.deleteText}>✕</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </ScrollView>
      ) : (
        <Text style={{ marginBottom: 10 }}>No images available.</Text>
      )}

      {isOwner && (
        uploading ? (
          <ActivityIndicator size="small" color="#007AFF" />
        ) : (
          <TouchableOpacity style={styles.uploadButton} onPress={handlePickAndUploadImage}>
            <Text style={styles.uploadText}>+ Add Image</Text>
          </TouchableOpacity>
        )
      )}

      {isClientAccount && (
        <>
          <Text style={styles.subTitle}>Authorize This Shop for Your Vehicles:</Text>
          {vehicles.length === 0 && <Text>You have no vehicles.</Text>}
        </>
      )}
    </View>
  );

  return (
    <FlatList
      style={styles.container}
      data={isClientAccount ? vehicles : []}
      keyExtractor={(item) => item.id.toString()}
      renderItem={isClientAccount ? renderVehicle : null}
      ListHeaderComponent={renderHeader}
      ListEmptyComponent={isClientAccount && !vehicles.length && <Text>No vehicles found.</Text>}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 10 },
  subTitle: { marginTop: 20, fontSize: 18, fontWeight: '600', marginBottom: 6 },
  imageScroll: {
    marginBottom: 20,
  },
  imageContainer: {
    position: 'relative',
    marginRight: 10,
  },
  shopImage: {
    width: 200,
    height: 150,
    borderRadius: 10,
  },
  deleteBtn: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: 'rgba(255,0,0,0.7)',
    borderRadius: 15,
    padding: 4,
  },
  deleteText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  uploadButton: {
    backgroundColor: '#007AFF',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  uploadText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  vehicleBox: {
    padding: 12,
    marginVertical: 8,
    borderWidth: 1,
    borderRadius: 8,
  },
  vehicleText: { marginBottom: 6, fontSize: 16 },
  authButton: {
    padding: 8,
    borderRadius: 6,
    marginTop: 6,
    alignItems: 'center',
  },
  authButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
