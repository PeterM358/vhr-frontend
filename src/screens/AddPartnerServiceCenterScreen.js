import React, { useCallback, useEffect, useState } from 'react';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ActivityIndicator,
  Button,
  Text,
  TextInput,
  useTheme,
} from 'react-native-paper';
import { Picker } from '@react-native-picker/picker';

import ScreenBackground from '../components/ScreenBackground';
import AppNavigationBar from '../components/common/AppNavigationBar';
import { useGoBackOr } from '../navigation/appNavBarBack';
import AppCard from '../components/ui/AppCard';
import { COLORS } from '../constants/colors';
import { stackContentPaddingTop } from '../navigation/stackContentInset';
import { createShopProfile, getCountries, getCitiesForCountry } from '../api/profiles';
import useDebouncedValue from '../utils/useDebouncedValue';
import { navigateToPartnerSwitchCenter } from '../navigation/webNavigation';

const INITIAL_CITY_LIMIT = 120;

function ensureSelectedCity(cityList, selectedId, selectedName) {
  if (!selectedId) return cityList;
  if (cityList.some((city) => Number(city.id) === Number(selectedId))) {
    return cityList;
  }
  return [{ id: selectedId, name: selectedName || 'Selected city' }, ...cityList];
}

export default function AddPartnerServiceCenterScreen({ navigation }) {
  const handleBack = useGoBackOr(navigation);
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [countries, setCountries] = useState([]);
  const [cities, setCities] = useState([]);
  const [countryId, setCountryId] = useState(null);
  const [cityId, setCityId] = useState(null);
  const [citySearch, setCitySearch] = useState('');
  const debouncedCitySearch = useDebouncedValue(citySearch, 300);

  const [loadingCountries, setLoadingCountries] = useState(true);
  const [loadingCities, setLoadingCities] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const rows = await getCountries();
        if (!active) return;
        const list = Array.isArray(rows) ? rows : [];
        setCountries(list);
        if (list.length === 1) {
          setCountryId(list[0].id);
        }
      } catch {
        if (active) setError('Could not load countries.');
      } finally {
        if (active) setLoadingCountries(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const loadCities = useCallback(async (nextCountryId, search = '') => {
    if (!nextCountryId) {
      setCities([]);
      return;
    }
    setLoadingCities(true);
    try {
      const trimmed = String(search || '').trim();
      const cityList = await getCitiesForCountry(nextCountryId, {
        search: trimmed.length >= 2 ? trimmed : undefined,
        limit: trimmed.length >= 2 ? 50 : INITIAL_CITY_LIMIT,
      });
      const rows = Array.isArray(cityList) ? cityList : [];
      setCities(ensureSelectedCity(rows, cityId, ''));
    } catch {
      setCities([]);
    } finally {
      setLoadingCities(false);
    }
  }, [cityId]);

  useEffect(() => {
    if (!countryId) {
      setCities([]);
      setCityId(null);
      return;
    }
    loadCities(countryId, debouncedCitySearch);
  }, [countryId, debouncedCitySearch, loadCities]);

  const handleCountryChange = (value) => {
    const next = value ? Number(value) : null;
    setCountryId(next);
    setCityId(null);
    setCitySearch('');
  };

  const handleSubmit = async () => {
    const trimmedName = String(name || '').trim();
    const trimmedAddress = String(address || '').trim();
    if (!trimmedName) {
      setError('Service center name is required.');
      return;
    }
    if (!cityId) {
      setError('City is required.');
      return;
    }
    if (!trimmedAddress) {
      setError('Address is required.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const created = await createShopProfile({
        name: trimmedName,
        address: trimmedAddress,
        country: countryId,
        city: cityId,
      });
      if (Platform.OS === 'web') {
        navigateToPartnerSwitchCenter(navigation, { selectedShopId: created.id });
        return;
      }
      navigation.navigate('ChooseShop', { selectedShopId: created.id });
    } catch (e) {
      setError('Could not create service center. Check the details and try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenBackground safeArea={false}>
      <AppNavigationBar title="Add service center" backLabel="Switch center" onBack={handleBack} />
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingTop: 12 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <Text variant="titleLarge" style={styles.title}>
          Add service center
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          Add another location under your partner account. You can complete the profile later.
        </Text>

        <AppCard style={styles.card}>
          <TextInput
            label="Service center name"
            value={name}
            onChangeText={setName}
            mode="outlined"
            style={styles.input}
            autoCapitalize="words"
          />

          {loadingCountries ? (
            <ActivityIndicator style={styles.inlineLoader} />
          ) : (
            <View style={styles.pickerWrap}>
              <Text variant="labelLarge" style={styles.pickerLabel}>
                Country
              </Text>
              <View style={styles.pickerSurface}>
                <Picker
                  selectedValue={countryId ?? ''}
                  onValueChange={handleCountryChange}
                  style={styles.picker}
                >
                  <Picker.Item label="Select country" value="" />
                  {countries.map((country) => (
                    <Picker.Item
                      key={country.id}
                      label={country.name}
                      value={country.id}
                    />
                  ))}
                </Picker>
              </View>
            </View>
          )}

          <TextInput
            label="Search city"
            value={citySearch}
            onChangeText={setCitySearch}
            mode="outlined"
            style={styles.input}
            disabled={!countryId}
          />

          <View style={styles.pickerWrap}>
            <Text variant="labelLarge" style={styles.pickerLabel}>
              City
            </Text>
            <View style={styles.pickerSurface}>
              {loadingCities ? (
                <ActivityIndicator style={styles.inlineLoader} />
              ) : (
                <Picker
                  selectedValue={cityId ?? ''}
                  onValueChange={(value) => setCityId(value ? Number(value) : null)}
                  style={styles.picker}
                  enabled={Boolean(countryId) && cities.length > 0}
                >
                  <Picker.Item label={countryId ? 'Select city' : 'Choose country first'} value="" />
                  {cities.map((city) => (
                    <Picker.Item key={city.id} label={city.name} value={city.id} />
                  ))}
                </Picker>
              )}
            </View>
          </View>

          <TextInput
            label="Address"
            value={address}
            onChangeText={setAddress}
            mode="outlined"
            style={styles.input}
            multiline
          />

          {error ? (
            <Text variant="bodySmall" style={styles.errorText}>
              {error}
            </Text>
          ) : null}

          <Button
            mode="contained"
            onPress={handleSubmit}
            loading={saving}
            disabled={saving || loadingCountries}
            style={styles.submitButton}
            buttonColor={COLORS.PRIMARY}
          >
            Create service center
          </Button>
        </AppCard>
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  title: {
    color: '#fff',
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    marginBottom: 20,
  },
  card: {
    padding: 16,
  },
  input: {
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  pickerWrap: {
    marginBottom: 12,
  },
  pickerLabel: {
    marginBottom: 6,
    color: '#334155',
  },
  pickerSurface: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  picker: {
    width: '100%',
  },
  inlineLoader: {
    marginVertical: 12,
  },
  errorText: {
    color: '#b91c1c',
    marginBottom: 8,
  },
  submitButton: {
    marginTop: 8,
  },
});
