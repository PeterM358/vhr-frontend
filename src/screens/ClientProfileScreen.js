import React, { useEffect, useState, useLayoutEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Text,
  TextInput,
  Button,
  Portal,
  Dialog,
  ActivityIndicator,
  SegmentedButtons,
} from 'react-native-paper';
import { Picker } from '@react-native-picker/picker';

import {
  getClientProfile,
  updateClientProfile,
  getCountries,
  getCitiesForCountry,
} from '../api/profiles';
import ScreenBackground from '../components/ScreenBackground';
import { stackContentPaddingTop } from '../navigation/stackContentInset';
import FloatingCard from '../components/ui/FloatingCard';
import AppCard from '../components/ui/AppCard';
import { COLORS } from '../constants/colors';

const CONTACT_PREFERENCE_STORAGE_KEY = '@client_profile_contact_preference';
/** Fallback when API country has no phone_code yet */
const COUNTRY_PHONE_PREFIX_FALLBACK = {
  bulgaria: '+359',
};
// Backward-compatible alias for stale hot-reload bundles.
const COUNTRY_PHONE_PREFIX = COUNTRY_PHONE_PREFIX_FALLBACK;

function formatPhoneCodeFromApi(phoneCode) {
  if (phoneCode == null) return '';
  const d = String(phoneCode).replace(/\D/g, '');
  if (!d) return '';
  return `+${d}`;
}

function dialPrefixForCountry(country) {
  if (!country) return '';
  const fromApi = formatPhoneCodeFromApi(country.phone_code);
  if (fromApi) return fromApi;
  const name = String(country.name || '').trim().toLowerCase();
  return COUNTRY_PHONE_PREFIX_FALLBACK[name] || '';
}

/**
 * Parse stored single-field phone into prefix + national digits.
 * Uses a simple +CC... split (1–3 digit country codes cover most cases including +359).
 */
function parseStoredPhone(stored) {
  const raw = String(stored || '').trim();
  if (!raw) return { prefix: '', national: '' };
  if (raw.startsWith('+')) {
    const m = raw.match(/^\+(\d{1,3})(.*)$/);
    if (m) {
      const national = String(m[2] || '').replace(/\D/g, '');
      return { prefix: `+${m[1]}`, national };
    }
  }
  return { prefix: '', national: raw.replace(/\D/g, '') };
}

function nationalDigitsOnly(national) {
  return String(national || '').replace(/\D/g, '').replace(/^0+/, '');
}

function buildE164Phone(prefix, national) {
  const n = nationalDigitsOnly(national);
  if (!n) return '';
  let p = String(prefix || '').trim().replace(/\s/g, '');
  if (!p) return '';
  if (!p.startsWith('+')) p = `+${p.replace(/\D/g, '')}`;
  else p = `+${p.slice(1).replace(/\D/g, '')}`;
  const full = `${p}${n}`;
  if (n.length < 4 || full.replace(/\D/g, '').length > 15) return '';
  return full;
}

export default function ClientProfileScreen({ navigation }) {
  const insets = useSafeAreaInsets();

  const [profile, setProfile] = useState(null);
  const [countries, setCountries] = useState([]);
  const [cities, setCities] = useState([]);
  const [loadingCities, setLoadingCities] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [contactPreference, setContactPreference] = useState('phone');
  const [phonePrefix, setPhonePrefix] = useState('');
  const [phoneNational, setPhoneNational] = useState('');

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
  }, [navigation, profile, phonePrefix, phoneNational, contactPreference, displayName, cities, countries]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [clientData, countryList] = await Promise.all([
        getClientProfile(),
        getCountries(),
      ]);
      const storedContactPreference = await AsyncStorage.getItem(CONTACT_PREFERENCE_STORAGE_KEY);

      setProfile(clientData);
      setCountries(countryList);
      setDisplayName(
        clientData?.display_name ||
        clientData?.nickname ||
        clientData?.first_name ||
        ''
      );
      if (storedContactPreference) {
        setContactPreference(storedContactPreference === 'chat' ? 'phone' : storedContactPreference);
      }
      const matchedCountry = countryList.find((c) => Number(c.id) === Number(clientData?.country));
      const { prefix: parsedPrefix, national: parsedNational } = parseStoredPhone(clientData?.phone);
      let initialPrefix = parsedPrefix;
      const initialNational = parsedNational;
      const fromCountry = dialPrefixForCountry(matchedCountry);
      if (!initialPrefix && fromCountry) {
        initialPrefix = fromCountry;
      }
      setPhonePrefix(initialPrefix);
      setPhoneNational(initialNational);
      if (clientData?.country) {
        setLoadingCities(true);
        try {
          const cityList = await getCitiesForCountry(clientData.country);
          setCities(cityList);
        } catch (e) {
          console.warn('Could not load cities for selected country', e);
          setCities([]);
        } finally {
          setLoadingCities(false);
        }
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
    const matchedCountry = countries.find((c) => Number(c.id) === Number(value));
    const fromCountry = dialPrefixForCountry(matchedCountry);
    if (fromCountry) {
      setPhonePrefix(fromCountry);
    }
    setProfile({
      ...profile,
      country: value,
      city: null,
    });
    setCities([]);
    if (!value) return;
    setLoadingCities(true);
    try {
      const cityList = await getCitiesForCountry(value);
      setCities(cityList);
    } catch (err) {
      console.error(err);
      setDialogMessage('Error loading cities for this country');
      setDialogVisible(true);
    } finally {
      setLoadingCities(false);
    }
  };

  const handleSave = async () => {
    if (!profile) return;

    const selectedCity = cities.find((c) => Number(c.id) === Number(profile.city));
    const nationalDigits = nationalDigitsOnly(phoneNational);
    let effectivePrefix = String(phonePrefix || '').trim();
    if (!effectivePrefix && profile.country) {
      const c = countries.find((x) => Number(x.id) === Number(profile.country));
      effectivePrefix = dialPrefixForCountry(c);
    }
    const mergedPhone = buildE164Phone(effectivePrefix, phoneNational);

    if (contactPreference === 'phone' || nationalDigits.length > 0) {
      if (!nationalDigits) {
        setDialogMessage('Enter your phone number (digits after the country prefix).');
        setDialogVisible(true);
        return;
      }
      if (!effectivePrefix || !effectivePrefix.replace(/\s/g, '').startsWith('+')) {
        setDialogMessage(
          !profile.country
            ? 'Select a country to set the prefix automatically, or enter a country code (e.g. +359) in the prefix field.'
            : 'Enter a country prefix (e.g. +359). Your selected country did not provide one — fill the prefix field manually.'
        );
        setDialogVisible(true);
        return;
      }
      if (!mergedPhone) {
        setDialogMessage('Check the country prefix and number — the full phone could not be built.');
        setDialogVisible(true);
        return;
      }
    }

    const payload = {
      country: profile.country,
      city: profile.city || null,
      town: selectedCity?.name || profile.town || '',
      phone: mergedPhone || '',
    };

    setSaving(true);
    try {
      await updateClientProfile(payload);
      await AsyncStorage.setItem(CONTACT_PREFERENCE_STORAGE_KEY, contactPreference);
      setDialogMessage('Profile updated successfully!');
      setDialogVisible(true);
      setProfile((prev) => ({
        ...prev,
        town: selectedCity?.name || prev?.town || '',
        phone: mergedPhone || prev?.phone || '',
      }));
      if (mergedPhone) {
        const split = parseStoredPhone(mergedPhone);
        setPhonePrefix(split.prefix || effectivePrefix);
        setPhoneNational(split.national);
      }
    } catch (err) {
      console.error(err);
      setDialogMessage('Error saving profile');
      setDialogVisible(true);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <ScreenBackground safeArea={false}>
        <ActivityIndicator style={styles.loading} color="#fff" />
      </ScreenBackground>
    );
  }

  if (!profile) {
    return (
      <ScreenBackground safeArea={false}>
        <View style={styles.emptyContainer}>
          <Text style={{ color: '#fff' }}>No client profile found.</Text>
        </View>
      </ScreenBackground>
    );
  }

  const selectedCountryName = countries.find((c) => Number(c.id) === Number(profile.country))?.name || '';
  const sortedCities = (() => {
    const base = [...cities];
    if (!/bulgaria/i.test(selectedCountryName)) return base;
    const priority = ['sofia', 'plovdiv', 'varna', 'burgas'];
    const rank = (name) => {
      const idx = priority.indexOf(String(name || '').trim().toLowerCase());
      return idx === -1 ? 999 : idx;
    };
    return base.sort((a, b) => {
      const r = rank(a.name) - rank(b.name);
      if (r !== 0) return r;
      return String(a.name || '').localeCompare(String(b.name || ''));
    });
  })();

  return (
    <ScreenBackground safeArea={false}>
      <ScrollView contentContainerStyle={[
        styles.container,
        { paddingTop: stackContentPaddingTop(insets, 8), paddingBottom: Math.max(insets.bottom, 16) },
      ]}>
        <AppCard variant="dark" contentStyle={styles.heroContent}>
          <Text style={styles.heroTitle}>Profile</Text>
          <Text style={styles.heroSubtitle}>
            Use any display name you prefer. Real/legal names are not required.
          </Text>
        </AppCard>

        <FloatingCard>
          <Text style={styles.sectionTitle}>Basic profile</Text>
          <TextInput
            label="Display name / nickname"
            mode="outlined"
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="How should service centers address you?"
            style={styles.input}
          />
          <Text style={styles.helper}>
            Privacy-first: choose a friendly name you are comfortable sharing.
          </Text>
        </FloatingCard>

        <FloatingCard>
          <Text style={styles.sectionTitle}>Location</Text>
          <Text variant="labelLarge" style={styles.label}>Country</Text>
          <View style={styles.pickerWrap}>
            <Picker
              selectedValue={profile.country}
              onValueChange={handleCountryChange}
              style={styles.picker}
            >
              <Picker.Item label="Select country..." value={null} />
              {countries.map((c) => (
                <Picker.Item key={c.id} label={c.name} value={c.id} />
              ))}
            </Picker>
          </View>

          <Text variant="labelLarge" style={styles.label}>City (selectable)</Text>
          <View style={styles.pickerWrap}>
            <Picker
              selectedValue={profile.city}
              onValueChange={(value) => setProfile({ ...profile, city: value })}
              enabled={!!profile.country && !loadingCities}
              style={styles.picker}
            >
              <Picker.Item
                label={
                  !profile.country
                    ? 'Select country first...'
                    : loadingCities
                      ? 'Loading cities...'
                      : 'Select city...'
                }
                value={null}
              />
              {sortedCities.map((city) => (
                <Picker.Item key={city.id} label={city.name} value={city.id} />
              ))}
            </Picker>
          </View>
        </FloatingCard>

        <FloatingCard>
          <Text style={styles.sectionTitle}>Contact preferences</Text>
          <Text style={styles.helper}>
            This information helps service centers contact you about repairs and service updates.
          </Text>
          <Text variant="labelLarge" style={styles.label}>Phone</Text>
          <View style={styles.phoneRow}>
            <TextInput
              label="Prefix"
              mode="outlined"
              dense
              placeholder={dialPrefixForCountry(countries.find((c) => Number(c.id) === Number(profile.country))) || '+359'}
              value={phonePrefix}
              onChangeText={setPhonePrefix}
              style={[styles.input, styles.phonePrefixInput]}
              keyboardType="phone-pad"
            />
            <TextInput
              label="Number"
              mode="outlined"
              dense
              placeholder="e.g. 888123456"
              value={phoneNational}
              onChangeText={setPhoneNational}
              style={[styles.input, styles.phoneNationalInput]}
              keyboardType="phone-pad"
            />
          </View>
          <Text style={styles.helper}>
            {profile.country
              ? 'Prefix is set from your country when available — you can edit it if needed.'
              : 'No country selected: enter your international prefix (e.g. +359) so we can store a callable number.'}
          </Text>
          <Text variant="labelLarge" style={styles.label}>Preferred contact</Text>
          <SegmentedButtons
            value={contactPreference}
            onValueChange={setContactPreference}
            buttons={[
              { value: 'phone', label: 'Phone' },
              { value: 'email', label: 'Email' },
            ]}
            style={styles.segmented}
          />
          <Text style={styles.helper}>Saved locally for now.</Text>
        </FloatingCard>

        <FloatingCard>
          <Text style={styles.sectionTitle}>Vehicle access & sharing</Text>
          <Text style={styles.helper}>
            You’ll later be able to share vehicle access with family members, drivers, or fleet managers.
          </Text>
        </FloatingCard>

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
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    paddingBottom: 24,
    gap: 10,
  },
  input: {
    marginBottom: 12,
  },
  phoneRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  phonePrefixInput: {
    flex: 0.42,
    minWidth: 108,
    marginBottom: 12,
  },
  phoneNationalInput: {
    flex: 1,
    marginBottom: 12,
  },
  heroContent: {
    paddingVertical: 6,
  },
  heroTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.9)',
    marginTop: 6,
    lineHeight: 19,
  },
  sectionTitle: {
    color: COLORS.TEXT_DARK,
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 8,
  },
  label: {
    marginTop: 4,
    marginBottom: 4,
    fontWeight: '700',
  },
  helper: {
    color: COLORS.TEXT_MUTED,
    marginBottom: 10,
    lineHeight: 18,
  },
  pickerWrap: {
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.12)',
    borderRadius: 10,
    backgroundColor: '#fff',
    marginBottom: 12,
  },
  picker: {
    width: '100%',
  },
  segmented: {
    marginBottom: 8,
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