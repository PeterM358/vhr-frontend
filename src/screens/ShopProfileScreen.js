import React, { useEffect, useState, useLayoutEffect } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert
} from 'react-native';
import {
  Text,
  TextInput,
  Button,
  Portal,
  Dialog,
  ActivityIndicator,
  useTheme,
} from 'react-native-paper';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { Picker } from '@react-native-picker/picker';
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  getMyShopProfiles,
  updateShopProfile,
  getCountries,
  getCitiesForCountry,
} from '../api/profiles';

import {
  uploadShopImage,
  deleteShopImage
} from '../api/shops';

export default function ShopProfileScreen({ navigation }) {
  const theme = useTheme();

  const [profile, setProfile] = useState(null);
  const [countries, setCountries] = useState([]);
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [dialogMessage, setDialogMessage] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Button
          mode="text"
          onPress={handleSave}
          labelStyle={{ color: '#fff', fontSize: 16 }}
        >
          Save
        </Button>
      ),
    });
  }, [navigation, profile]);

  function roundCoordinate(value) {
    if (value == null) return null;
    return Math.round(value * 1e6) / 1e6;
  }

  const loadData = async () => {
    setLoading(true);
    try {
      const [shopProfiles, countryList] = await Promise.all([
        getMyShopProfiles(),
        getCountries(),
      ]);

      if (shopProfiles.length > 0) {
        setProfile(shopProfiles[0]);

        if (shopProfiles[0].country) {
          const cityList = await getCitiesForCountry(shopProfiles[0].country);
          setCities(cityList);
        }
      }

      setCountries(countryList);
    } catch (err) {
      console.error(err);
      setDialogMessage('Error loading profile data');
      setDialogVisible(true);
    } finally {
      setLoading(false);
    }
  };

  const handleCountryChange = async (value) => {
    setProfile({ ...profile, country: value, city: null });
    if (value) {
      try {
        const cityList = await getCitiesForCountry(value);
        setCities(cityList);
      } catch (err) {
        console.error(err);
        setDialogMessage('Error loading cities');
        setDialogVisible(true);
      }
    } else {
      setCities([]);
    }
  };

  const handleSave = async () => {
    if (!profile) return;

    const payload = {
      name: profile.name,
      address: profile.address,
      phone: profile.phone,
      country: profile.country,
      city: profile.city,
      latitude: roundCoordinate(profile.latitude),
      longitude: roundCoordinate(profile.longitude),
    };

    setSaving(true);
    try {
      await updateShopProfile(profile.id, payload);
      setDialogMessage('Profile updated successfully!');
      setDialogVisible(true);
      navigation.goBack();
    } catch (err) {
      console.error(err);
      setDialogMessage('Error saving profile');
      setDialogVisible(true);
    } finally {
      setSaving(false);
    }
  };

  const handleLocateMe = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setDialogMessage('Permission to access location was denied');
        setDialogVisible(true);
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      setProfile({
        ...profile,
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
    } catch (err) {
      console.error(err);
      setDialogMessage('Error getting location');
      setDialogVisible(true);
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

        const token = await AsyncStorage.getItem('@access_token');
        if (!token) {
          Alert.alert('Error', 'You are not logged in. Please log in again.');
          return;
        }

        setSaving(true);
        await uploadShopImage(profile.id, token, uri);  // profile.id = shopProfileId
        await loadData();
        Alert.alert('Success', 'Image uploaded!');
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Error', err.message || 'Upload failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteImage = async (imageId) => {
    try {
      const token = await AsyncStorage.getItem('@access_token');
      if (!token) {
        Alert.alert('Error', 'You are not logged in. Please log in again.');
        return;
      }

      setSaving(true);
      await deleteShopImage(profile.id, imageId, token);  // profile.id = shopProfileId
      await loadData();
      Alert.alert('Deleted', 'Image deleted.');
    } catch (err) {
      console.error(err);
      Alert.alert('Error', err.message || 'Delete failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <ActivityIndicator style={styles.loading} />;
  }

  if (!profile) {
    return (
      <View style={styles.emptyContainer}>
        <Text>No shop profile found.</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScrollView contentContainerStyle={styles.container}>
        <TextInput
          label="Name"
          mode="outlined"
          value={profile.name || ''}
          onChangeText={(text) => setProfile({ ...profile, name: text })}
          style={styles.input}
        />

        <TextInput
          label="Address"
          mode="outlined"
          value={profile.address || ''}
          onChangeText={(text) => setProfile({ ...profile, address: text })}
          style={styles.input}
        />

        <TextInput
          label="Phone"
          mode="outlined"
          value={profile.phone || ''}
          onChangeText={(text) => setProfile({ ...profile, phone: text })}
          style={styles.input}
          keyboardType="phone-pad"
        />

        <TextInput
          label="Latitude"
          mode="outlined"
          value={profile.latitude ? String(profile.latitude) : ''}
          onChangeText={(text) => setProfile({ ...profile, latitude: text })}
          style={styles.input}
          keyboardType="numeric"
        />

        <TextInput
          label="Longitude"
          mode="outlined"
          value={profile.longitude ? String(profile.longitude) : ''}
          onChangeText={(text) => setProfile({ ...profile, longitude: text })}
          style={styles.input}
          keyboardType="numeric"
        />

        <Button
          icon="crosshairs-gps"
          mode="outlined"
          onPress={handleLocateMe}
          style={styles.locateButton}
        >
          Use My Current Location
        </Button>

        <Text variant="labelLarge" style={styles.label}>Country</Text>
        <Picker
          selectedValue={profile.country}
          onValueChange={handleCountryChange}
          style={styles.picker}
        >
          <Picker.Item label="Select Country..." value={null} />
          {countries.map((c) => (
            <Picker.Item key={c.id} label={c.name} value={c.id} />
          ))}
        </Picker>

        <Text variant="labelLarge" style={styles.label}>City</Text>
        <Picker
          selectedValue={profile.city}
          onValueChange={(val) => setProfile({ ...profile, city: val })}
          style={styles.picker}
          enabled={!!profile.country}
        >
          <Picker.Item label={profile.country ? 'Select City...' : 'Choose Country First'} value={null} />
          {cities.map((c) => (
            <Picker.Item key={c.id} label={c.name} value={c.id} />
          ))}
        </Picker>

        <Text variant="labelLarge" style={styles.label}>Photos</Text>
        <ScrollView horizontal style={{ marginVertical: 12 }}>
          {profile.images?.map((img) => (
            <View key={img.id} style={{ marginRight: 10 }}>
              <Image
                source={{ uri: img.image_url }}
                style={{ width: 120, height: 90, borderRadius: 8 }}
              />
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => handleDeleteImage(img.id)}
              >
                <Text style={styles.deleteText}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>

        <Button
          mode="contained"
          icon="plus"
          onPress={handlePickAndUploadImage}
          style={styles.uploadButton}
        >
          Add Image
        </Button>

        {saving && <ActivityIndicator animating size="small" />}
      </ScrollView>

      <Portal>
        <Dialog
          visible={dialogVisible}
          onDismiss={() => setDialogVisible(false)}
        >
          <Dialog.Title>Notice</Dialog.Title>
          <Dialog.Content>
            <Text>{dialogMessage}</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDialogVisible(false)}>OK</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  input: { marginBottom: 12 },
  label: { marginTop: 12, marginBottom: 4, fontWeight: 'bold' },
  picker: { backgroundColor: '#f4f4f4', borderRadius: 8, marginBottom: 12 },
  locateButton: { marginBottom: 12 },
  loading: { flex: 1, justifyContent: 'center' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  uploadButton: { marginVertical: 12 },
  deleteBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(255,0,0,0.7)',
    borderRadius: 12,
    padding: 4,
  },
  deleteText: { color: '#fff', fontWeight: 'bold' },
});