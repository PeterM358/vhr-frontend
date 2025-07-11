import React, { useEffect, useState, useLayoutEffect } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  ScrollView,
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
import { Picker } from '@react-native-picker/picker';

import {
  getClientProfile,
  updateClientProfile,
  getCountries,
  getCitiesForCountry,
} from '../api/profiles';

export default function ClientProfileScreen({ navigation }) {
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

  const loadData = async () => {
    setLoading(true);
    try {
      const [clientData, countryList] = await Promise.all([
        getClientProfile(),
        getCountries(),
      ]);

      setProfile(clientData);
      setCountries(countryList);

      if (clientData.country) {
        const cityList = await getCitiesForCountry(clientData.country);
        setCities(cityList);
      }
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
      country: profile.country,
      city: profile.city,
      town: profile.town,
      phone: profile.phone,
    };

    setSaving(true);
    try {
      await updateClientProfile(payload);
      setDialogMessage('Profile updated successfully!');
      setDialogVisible(true);
    } catch (err) {
      console.error(err);
      setDialogMessage('Error saving profile');
      setDialogVisible(true);
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
        <Text>No client profile found.</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScrollView contentContainerStyle={styles.container}>
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

        <TextInput
          label="Town"
          mode="outlined"
          value={profile.town || ''}
          onChangeText={(text) => setProfile({ ...profile, town: text })}
          style={styles.input}
        />

        <TextInput
          label="Phone Number"
          mode="outlined"
          value={profile.phone || ''}
          onChangeText={(text) => setProfile({ ...profile, phone: text })}
          style={styles.input}
          keyboardType="phone-pad"
        />

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
  container: {
    padding: 16,
  },
  input: {
    marginBottom: 12,
  },
  label: {
    marginTop: 12,
    marginBottom: 4,
    fontWeight: 'bold',
  },
  picker: {
    backgroundColor: '#f4f4f4',
    borderRadius: 8,
    marginBottom: 12,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});