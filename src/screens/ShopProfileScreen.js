import React, { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
  Pressable,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ScreenBackground from '../components/ScreenBackground';
import {
  Text,
  TextInput,
  Button,
  Portal,
  Dialog,
  ActivityIndicator,
  useTheme,
  Divider,
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
import { API_BASE_URL } from '../api/config';
import { uploadShopImage, deleteShopImage } from '../api/shops';

import AppCard from '../components/ui/AppCard';
import FloatingCard from '../components/ui/FloatingCard';
import EmptyStateCard from '../components/ui/EmptyStateCard';
import { COLORS } from '../constants/colors';
import { stackContentPaddingTop } from '../navigation/stackContentInset';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DAY_KEY = {
  Monday: 'monday',
  Tuesday: 'tuesday',
  Wednesday: 'wednesday',
  Thursday: 'thursday',
  Friday: 'friday',
  Saturday: 'saturday',
  Sunday: 'sunday',
};

const DEFAULT_HOURS = DAYS.map((day) => ({ day, start: '', end: '', closed: false }));

const VEHICLE_EMOJI = {
  car: '🚗',
  motorcycle: '🏍️',
  bike: '🏍️',
  bicycle: '🚲',
  ebike: '⚡',
  truck: '🚚',
  van: '🚐',
  scooter: '🛵',
};

const CONTACT_METHOD_OPTIONS = [
  { value: 'phone', label: 'Phone' },
  { value: 'chat', label: 'Chat' },
  { value: 'viber', label: 'Viber' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'telegram', label: 'Telegram' },
];

function toSafeArray(v) {
  return Array.isArray(v) ? v : [];
}

function titleize(s) {
  if (!s) return '';
  const t = String(s).trim();
  if (!t) return '';
  if (/[\-_]/.test(t)) {
    return t
      .split(/[\-_]+/)
      .filter(Boolean)
      .map((w) => w[0].toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
  }
  return t[0].toUpperCase() + t.slice(1);
}

function parseWorkingHours(value) {
  let src = value;
  if (typeof src === 'string') {
    try {
      src = JSON.parse(src);
    } catch (_e) {
      return DEFAULT_HOURS;
    }
  }

  if (!src || typeof src !== 'object' || Array.isArray(src)) {
    return DEFAULT_HOURS;
  }

  return DAYS.map((day) => {
    const key = DAY_KEY[day];
    const row = src[key] ?? src[day.toLowerCase()] ?? src[day];

    if (row == null) return { day, start: '', end: '', closed: true };
    if (typeof row === 'string') {
      const m = row.match(/([^\-]+)-(.+)/);
      if (m) {
        return {
          day,
          start: m[1].trim(),
          end: m[2].trim(),
          closed: false,
        };
      }
      if (row.toLowerCase().includes('closed')) return { day, start: '', end: '', closed: true };
      return { day, start: row.trim(), end: '', closed: false };
    }

    if (typeof row === 'object') {
      const start = row.start != null ? String(row.start) : '';
      const end = row.end != null ? String(row.end) : '';
      const closed = !!row.closed || (!start && !end);
      return { day, start, end, closed };
    }

    return { day, start: '', end: '', closed: true };
  });
}

function buildWorkingHours(rows) {
  const out = {};
  rows.forEach((r) => {
    const key = DAY_KEY[r.day] || r.day.toLowerCase();
    if (r.closed || (!r.start && !r.end)) {
      out[key] = { closed: true };
    } else {
      out[key] = {
        start: (r.start || '').trim(),
        end: (r.end || '').trim(),
      };
    }
  });
  return out;
}

function sanitizeArray(value) {
  return toSafeArray(value).filter((v) => v != null).map((v) => Number(v));
}

export default function ShopProfileScreen({ navigation }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const [profile, setProfile] = useState(null);
  const [countries, setCountries] = useState([]);
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [dialogMessage, setDialogMessage] = useState('');

  const [repairTypeOptions, setRepairTypeOptions] = useState([]);
  const [vehicleTypeOptions, setVehicleTypeOptions] = useState([]);

  const [selectedServices, setSelectedServices] = useState([]);
  const [selectedVehicleTypes, setSelectedVehicleTypes] = useState([]);
  const [hoursRows, setHoursRows] = useState(DEFAULT_HOURS);

  useEffect(() => {
    loadData();
  }, []);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Button mode="text" onPress={handleSave} labelStyle={{ color: '#fff', fontSize: 16 }}>
          Save
        </Button>
      ),
    });
  }, [navigation, profile, selectedServices, selectedVehicleTypes, hoursRows]);

  const repairTypesByCategory = useMemo(() => {
    const grouped = {};
    repairTypeOptions.forEach((item) => {
      const cat = item.category_name || 'Other';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(item);
    });
    return Object.entries(grouped).sort((a, b) => a[0].localeCompare(b[0]));
  }, [repairTypeOptions]);

  function roundCoordinate(value) {
    if (value == null || value === '') return null;
    const n = Number(value);
    if (Number.isNaN(n)) return null;
    return Math.round(n * 1e6) / 1e6;
  }

  async function loadTaxonomy(token) {
    const res = await fetch(`${API_BASE_URL}/api/repairs/types/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to fetch service types');
    const repairTypes = await res.json();
    setRepairTypeOptions(toSafeArray(repairTypes));

    try {
      const direct = await fetch(`${API_BASE_URL}/api/vehicles/types/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (direct.ok) {
        const rows = await direct.json();
        if (Array.isArray(rows) && rows.length) {
          setVehicleTypeOptions(rows.map((x) => ({ id: x.id, name: x.name, code: x.code })));
          return;
        }
      }
    } catch (_e) {
      // Fallback below when dedicated endpoint is unavailable.
    }

    const map = new Map();
    toSafeArray(repairTypes).forEach((rt) => {
      const ids = toSafeArray(rt.vehicle_types);
      const names = toSafeArray(rt.vehicle_type_names);
      ids.forEach((id, i) => {
        const name = names[i] || `Type ${id}`;
        if (!map.has(Number(id))) {
          map.set(Number(id), {
            id: Number(id),
            name,
            code: String(name).toLowerCase().replace(/\s+/g, '-'),
          });
        }
      });
    });
    setVehicleTypeOptions(Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name)));
  }

  const loadData = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('@access_token');
      const [shopProfiles, countryList] = await Promise.all([
        getMyShopProfiles(),
        getCountries(),
      ]);

      setCountries(countryList);
      if (token) await loadTaxonomy(token);

      if (shopProfiles.length > 0) {
        const p = shopProfiles[0];
        setProfile(p);
        setSelectedServices(sanitizeArray(p.available_repairs));
        setSelectedVehicleTypes(sanitizeArray(p.supported_vehicle_types));
        setHoursRows(parseWorkingHours(p.working_hours));

        if (p.country) {
          const cityList = await getCitiesForCountry(p.country);
          setCities(cityList);
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
    setProfile((prev) => ({ ...prev, country: value, city: null }));
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
      phone_country_code: profile.phone_country_code,
      phone_national: profile.phone_national,
      phone_e164: profile.phone_e164,
      phone_verified: !!profile.phone_verified,
      preferred_contact_method: profile.preferred_contact_method || 'phone',
      country: profile.country,
      city: profile.city,
      latitude: roundCoordinate(profile.latitude),
      longitude: roundCoordinate(profile.longitude),
      languages: profile.languages,
      email: profile.email,
      website: profile.website,
      offers_guarantee: profile.offers_guarantee,
      brands: profile.brands,
      working_hours: buildWorkingHours(hoursRows),
      service_center_type: profile.service_center_type,
      short_description: profile.short_description,
      description: profile.description,
      seo_city: profile.seo_city,
      seo_country: profile.seo_country,
      google_maps_url: profile.google_maps_url,
      youtube_url: profile.youtube_url,
      facebook_url: profile.facebook_url,
      instagram_url: profile.instagram_url,
      supported_vehicle_types: selectedVehicleTypes,
      available_repairs: selectedServices,
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
      setProfile((prev) => ({
        ...prev,
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      }));
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
        await uploadShopImage(profile.id, token, uri);
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
      await deleteShopImage(profile.id, imageId, token);
      await loadData();
      Alert.alert('Deleted', 'Image deleted.');
    } catch (err) {
      console.error(err);
      Alert.alert('Error', err.message || 'Delete failed');
    } finally {
      setSaving(false);
    }
  };

  const toggleId = (id, setter) => {
    const n = Number(id);
    setter((prev) => (prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n]));
  };

  if (loading) {
    return (
      <ScreenBackground safeArea={false}>
        <View style={styles.loadingCenter}>
          <ActivityIndicator color="#fff" />
        </View>
      </ScreenBackground>
    );
  }

  if (!profile) {
    return (
      <ScreenBackground safeArea={false}>
        <View style={styles.loadingCenter}>
          <Text style={{ color: '#fff' }}>No service center profile found.</Text>
        </View>
      </ScreenBackground>
    );
  }

  const profileName = (profile.name || 'Service Center').trim() || 'Service Center';
  const profileType = titleize(profile.service_center_type) || 'Service Center';
  const profileShort = (profile.short_description || '').trim();

  return (
    <ScreenBackground safeArea={false}>
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingTop: stackContentPaddingTop(insets, 8), paddingBottom: 28 },
        ]}
      >
        <AppCard variant="dark" contentStyle={styles.heroCardInner}>
          <Text style={styles.heroTitle}>{profileName}</Text>
          <Text style={styles.heroSubtitle}>{profileType}</Text>
          {!!profileShort && <Text style={styles.heroDescription}>{profileShort}</Text>}
        </AppCard>

        <FloatingCard>
          <Text style={styles.sectionTitle}>Basic information</Text>
          <TextInput
            label="Service center name"
            mode="outlined"
            value={profile.name || ''}
            onChangeText={(text) => setProfile((prev) => ({ ...prev, name: text }))}
            style={styles.input}
          />
          <TextInput
            label="Service center type"
            mode="outlined"
            placeholder="Auto Service, Bike Service..."
            value={profile.service_center_type || ''}
            onChangeText={(text) => setProfile((prev) => ({ ...prev, service_center_type: text }))}
            style={styles.input}
          />
          <TextInput
            label="Short description"
            mode="outlined"
            multiline
            value={profile.short_description || ''}
            onChangeText={(text) => setProfile((prev) => ({ ...prev, short_description: text }))}
            style={styles.input}
          />
        </FloatingCard>

        <FloatingCard>
          <Text style={styles.sectionTitle}>Contact</Text>
          <TextInput
            label="Country prefix"
            mode="outlined"
            placeholder="+359"
            value={profile.phone_country_code || ''}
            onChangeText={(text) => setProfile((prev) => ({ ...prev, phone_country_code: text }))}
            style={styles.input}
            keyboardType="phone-pad"
            left={<TextInput.Icon icon="phone-outline" />}
          />
          <TextInput
            label="Phone number"
            mode="outlined"
            placeholder="888123456"
            value={profile.phone_national || ''}
            onChangeText={(text) => setProfile((prev) => ({ ...prev, phone_national: text }))}
            style={styles.input}
            keyboardType="phone-pad"
            left={<TextInput.Icon icon="phone-outline" />}
          />
          <Text style={styles.helperText}>Used for calls and customer contact.</Text>
          <Text style={styles.helperMuted}>
            TODO: Add SMS verification, phone login, and business verification in future phases.
          </Text>
          <Text style={styles.helperMuted}>
            TODO: Add deep links for Viber/WhatsApp/Telegram when contact workflows are expanded.
          </Text>
          <TextInput
            label="Legacy phone (compatibility)"
            mode="outlined"
            value={profile.phone || ''}
            onChangeText={(text) => setProfile((prev) => ({ ...prev, phone: text }))}
            style={styles.input}
            keyboardType="phone-pad"
          />
          <Text style={styles.label}>Preferred contact method</Text>
          <View style={styles.pickerWrap}>
            <Picker
              selectedValue={profile.preferred_contact_method || 'phone'}
              onValueChange={(val) => setProfile((prev) => ({ ...prev, preferred_contact_method: val }))}
              style={styles.picker}
            >
              {CONTACT_METHOD_OPTIONS.map((option) => (
                <Picker.Item key={option.value} label={option.label} value={option.value} />
              ))}
            </Picker>
          </View>
          <TextInput
            label="Email"
            mode="outlined"
            value={profile.email || ''}
            onChangeText={(text) => setProfile((prev) => ({ ...prev, email: text }))}
            style={styles.input}
            keyboardType="email-address"
            left={<TextInput.Icon icon="email-outline" />}
          />
          <TextInput
            label="Website"
            mode="outlined"
            value={profile.website || ''}
            onChangeText={(text) => setProfile((prev) => ({ ...prev, website: text }))}
            style={styles.input}
            left={<TextInput.Icon icon="web" />}
          />
        </FloatingCard>

        <FloatingCard>
          <Text style={styles.sectionTitle}>Vehicle types</Text>
          <Text style={styles.helperText}>Select all vehicle types you support.</Text>
          <View style={styles.chipWrap}>
            {vehicleTypeOptions.map((item) => {
              const selected = selectedVehicleTypes.includes(Number(item.id));
              const codeKey = String(item.code || item.name || '').toLowerCase().replace(/\s+/g, '');
              const emoji = VEHICLE_EMOJI[codeKey] || '🔧';
              return (
                <Pressable
                  key={item.id}
                  onPress={() => toggleId(item.id, setSelectedVehicleTypes)}
                  style={[styles.chip, selected && styles.chipSelected]}
                >
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{emoji} {item.name}</Text>
                </Pressable>
              );
            })}
          </View>
          {!vehicleTypeOptions.length && (
            <Text style={styles.helperMuted}>Vehicle types are loading from backend taxonomy.</Text>
          )}
        </FloatingCard>

        <FloatingCard>
          <Text style={styles.sectionTitle}>Services</Text>
          <Text style={styles.helperText}>Choose the services your center offers.</Text>
          {repairTypesByCategory.map(([category, rows]) => (
            <View key={category} style={styles.categoryBlock}>
              <Text style={styles.categoryTitle}>{category}</Text>
              <View style={styles.chipWrap}>
                {rows.map((row) => {
                  const selected = selectedServices.includes(Number(row.id));
                  return (
                    <Pressable
                      key={row.id}
                      onPress={() => toggleId(row.id, setSelectedServices)}
                      style={[styles.chip, selected && styles.chipSelected]}
                    >
                      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{row.name}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}
          {!repairTypesByCategory.length && (
            <Text style={styles.helperMuted}>Services are loading from backend taxonomy.</Text>
          )}
        </FloatingCard>

        <FloatingCard>
          <Text style={styles.sectionTitle}>Location</Text>
          <TextInput
            label="Address"
            mode="outlined"
            value={profile.address || ''}
            onChangeText={(text) => setProfile((prev) => ({ ...prev, address: text }))}
            style={styles.input}
          />
          <Text style={styles.label}>Country</Text>
          <View style={styles.pickerWrap}>
            <Picker selectedValue={profile.country} onValueChange={handleCountryChange} style={styles.picker}>
              <Picker.Item label="Select country..." value={null} />
              {countries.map((c) => (
                <Picker.Item key={c.id} label={c.name} value={c.id} />
              ))}
            </Picker>
          </View>

          <Text style={styles.label}>City</Text>
          <View style={styles.pickerWrap}>
            <Picker
              selectedValue={profile.city}
              onValueChange={(val) => setProfile((prev) => ({ ...prev, city: val }))}
              style={styles.picker}
              enabled={!!profile.country}
            >
              <Picker.Item label={profile.country ? 'Select city...' : 'Choose country first'} value={null} />
              {cities.map((c) => (
                <Picker.Item key={c.id} label={c.name} value={c.id} />
              ))}
            </Picker>
          </View>

          <View style={styles.coordinatesRow}>
            <TextInput
              label="Latitude"
              mode="outlined"
              value={profile.latitude != null ? String(profile.latitude) : ''}
              onChangeText={(text) => setProfile((prev) => ({ ...prev, latitude: text }))}
              style={[styles.input, styles.coordinatesInput]}
              keyboardType="numeric"
            />
            <TextInput
              label="Longitude"
              mode="outlined"
              value={profile.longitude != null ? String(profile.longitude) : ''}
              onChangeText={(text) => setProfile((prev) => ({ ...prev, longitude: text }))}
              style={[styles.input, styles.coordinatesInput]}
              keyboardType="numeric"
            />
          </View>

          <Button icon="crosshairs-gps" mode="outlined" onPress={handleLocateMe} style={styles.locateButton}>
            Use current location
          </Button>

          <TextInput
            label="Google Maps URL"
            mode="outlined"
            value={profile.google_maps_url || ''}
            onChangeText={(text) => setProfile((prev) => ({ ...prev, google_maps_url: text }))}
            style={styles.input}
          />
        </FloatingCard>

        <FloatingCard>
          <Text style={styles.sectionTitle}>Working hours</Text>
          {hoursRows.map((row, idx) => (
            <View key={row.day} style={styles.hoursRow}>
              <Text style={styles.dayLabel}>{row.day}</Text>
              <View style={styles.hoursInputsWrap}>
                <TextInput
                  mode="outlined"
                  dense
                  placeholder="09:00"
                  value={row.start}
                  onChangeText={(text) =>
                    setHoursRows((prev) => prev.map((r, i) => (i === idx ? { ...r, start: text, closed: false } : r)))
                  }
                  style={styles.hourInput}
                  editable={!row.closed}
                />
                <Text style={styles.hoursSeparator}>-</Text>
                <TextInput
                  mode="outlined"
                  dense
                  placeholder="18:00"
                  value={row.end}
                  onChangeText={(text) =>
                    setHoursRows((prev) => prev.map((r, i) => (i === idx ? { ...r, end: text, closed: false } : r)))
                  }
                  style={styles.hourInput}
                  editable={!row.closed}
                />
                <Pressable
                  onPress={() =>
                    setHoursRows((prev) =>
                      prev.map((r, i) =>
                        i === idx
                          ? {
                              ...r,
                              closed: !r.closed,
                              start: r.closed ? r.start : '',
                              end: r.closed ? r.end : '',
                            }
                          : r
                      )
                    )
                  }
                  style={[styles.closedToggle, row.closed && styles.closedToggleActive]}
                >
                  <Text style={[styles.closedToggleText, row.closed && styles.closedToggleTextActive]}>
                    {row.closed ? 'Closed' : 'Open'}
                  </Text>
                </Pressable>
              </View>
            </View>
          ))}
        </FloatingCard>

        <FloatingCard>
          <Text style={styles.sectionTitle}>Social links</Text>
          <TextInput
            label="YouTube"
            mode="outlined"
            value={profile.youtube_url || ''}
            onChangeText={(text) => setProfile((prev) => ({ ...prev, youtube_url: text }))}
            style={styles.input}
            left={<TextInput.Icon icon="youtube" />}
          />
          <TextInput
            label="Facebook"
            mode="outlined"
            value={profile.facebook_url || ''}
            onChangeText={(text) => setProfile((prev) => ({ ...prev, facebook_url: text }))}
            style={styles.input}
            left={<TextInput.Icon icon="facebook" />}
          />
          <TextInput
            label="Instagram"
            mode="outlined"
            value={profile.instagram_url || ''}
            onChangeText={(text) => setProfile((prev) => ({ ...prev, instagram_url: text }))}
            style={styles.input}
            left={<TextInput.Icon icon="instagram" />}
          />
        </FloatingCard>

        <FloatingCard>
          <Text style={styles.sectionTitle}>SEO/public identity</Text>
          <Text style={styles.helperText}>This helps customers discover your service center.</Text>
          <TextInput
            label="SEO city"
            mode="outlined"
            value={profile.seo_city || ''}
            onChangeText={(text) => setProfile((prev) => ({ ...prev, seo_city: text }))}
            style={styles.input}
          />
          <TextInput
            label="SEO country"
            mode="outlined"
            value={profile.seo_country || ''}
            onChangeText={(text) => setProfile((prev) => ({ ...prev, seo_country: text }))}
            style={styles.input}
          />
          <TextInput
            label="Description"
            mode="outlined"
            multiline
            numberOfLines={5}
            value={profile.description || ''}
            onChangeText={(text) => setProfile((prev) => ({ ...prev, description: text }))}
            style={styles.input}
          />
          <Divider style={styles.smallDivider} />
          <TextInput
            label="Languages (comma separated)"
            mode="outlined"
            value={profile.languages || ''}
            onChangeText={(text) => setProfile((prev) => ({ ...prev, languages: text }))}
            style={styles.input}
          />
          <TextInput
            label="Brands (comma separated)"
            mode="outlined"
            value={profile.brands || ''}
            onChangeText={(text) => setProfile((prev) => ({ ...prev, brands: text }))}
            style={styles.input}
          />
        </FloatingCard>

        <FloatingCard>
          <Text style={styles.sectionTitle}>Guarantee</Text>
          <Text style={styles.helperText}>
            Tell customers whether this service center can provide guarantee for offers or completed work.
          </Text>
          <View style={styles.guaranteeToggleRow}>
            <Pressable
              onPress={() => setProfile((prev) => ({ ...prev, offers_guarantee: true }))}
              style={[
                styles.guaranteePill,
                profile.offers_guarantee === true && styles.guaranteePillSelected,
              ]}
            >
              <Text
                style={[
                  styles.guaranteePillText,
                  profile.offers_guarantee === true && styles.guaranteePillTextSelected,
                ]}
              >
                Offers guarantee
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setProfile((prev) => ({ ...prev, offers_guarantee: false }))}
              style={[
                styles.guaranteePill,
                profile.offers_guarantee !== true && styles.guaranteePillSelected,
              ]}
            >
              <Text
                style={[
                  styles.guaranteePillText,
                  profile.offers_guarantee !== true && styles.guaranteePillTextSelected,
                ]}
              >
                No guarantee
              </Text>
            </Pressable>
          </View>
          <Text style={styles.helperMuted}>You can update this later.</Text>
        </FloatingCard>

        <FloatingCard>
          <Text style={styles.sectionTitle}>Photos</Text>
          <Text style={styles.helperText}>Show your workspace, tools, and real service moments.</Text>
          {toSafeArray(profile.images).length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoScroller}>
              {profile.images.map((img) => (
                <View key={img.id} style={styles.photoItem}>
                  <Image source={{ uri: img.image_url }} style={styles.photo} />
                  <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDeleteImage(img.id)}>
                    <Text style={styles.deleteText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          ) : (
            <EmptyStateCard
              icon="image-outline"
              title="No photos uploaded"
              subtitle="Add photos to build trust and improve profile quality."
            />
          )}

          <Button mode="contained" icon="plus" onPress={handlePickAndUploadImage} style={styles.uploadButton}>
            Add photo
          </Button>
        </FloatingCard>

        {saving ? (
          <View style={styles.savingWrap}>
            <ActivityIndicator animating size="small" color="#fff" />
            <Text style={styles.savingText}>Saving...</Text>
          </View>
        ) : null}
      </ScrollView>

      <Portal>
        <Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)}>
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
  },
  loadingCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroCardInner: {
    paddingVertical: 18,
  },
  heroTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '800',
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 15,
    marginTop: 4,
    fontWeight: '600',
  },
  heroDescription: {
    color: 'rgba(255,255,255,0.92)',
    marginTop: 10,
    lineHeight: 20,
  },
  sectionTitle: {
    color: COLORS.TEXT_DARK,
    fontWeight: '700',
    fontSize: 17,
    marginBottom: 10,
  },
  input: {
    marginBottom: 12,
    backgroundColor: 'rgba(255,255,255,0.96)',
  },
  helperText: {
    color: COLORS.TEXT_MUTED,
    fontSize: 13,
    marginBottom: 10,
  },
  helperMuted: {
    color: COLORS.TEXT_MUTED,
    fontSize: 13,
    marginTop: 2,
  },
  label: {
    marginBottom: 6,
    color: COLORS.TEXT_DARK,
    fontWeight: '600',
  },
  pickerWrap: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.12)',
  },
  picker: {
    backgroundColor: 'rgba(255,255,255,0.96)',
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    borderColor: 'rgba(37,99,235,0.26)',
    backgroundColor: 'rgba(37,99,235,0.08)',
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 4,
  },
  chipSelected: {
    backgroundColor: COLORS.PRIMARY,
    borderColor: COLORS.PRIMARY,
  },
  chipText: {
    fontSize: 13,
    color: '#1e3a8a',
    fontWeight: '600',
  },
  chipTextSelected: {
    color: '#fff',
  },
  categoryBlock: {
    marginBottom: 10,
  },
  categoryTitle: {
    fontSize: 14,
    color: COLORS.TEXT_DARK,
    fontWeight: '700',
    marginBottom: 8,
  },
  coordinatesRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  coordinatesInput: {
    flex: 1,
    minWidth: Platform.OS === 'web' ? 220 : 150,
  },
  locateButton: {
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  hoursRow: {
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(15,23,42,0.12)',
  },
  dayLabel: {
    color: COLORS.TEXT_DARK,
    fontWeight: '700',
    marginBottom: 8,
  },
  hoursInputsWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  hourInput: {
    width: 100,
    backgroundColor: '#fff',
  },
  hoursSeparator: {
    color: COLORS.TEXT_DARK,
    fontWeight: '700',
  },
  closedToggle: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(100,116,139,0.35)',
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: 'rgba(241,245,249,0.8)',
  },
  closedToggleActive: {
    backgroundColor: 'rgba(100,116,139,0.18)',
    borderColor: 'rgba(100,116,139,0.6)',
  },
  closedToggleText: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '700',
  },
  closedToggleTextActive: {
    color: '#475569',
  },
  smallDivider: {
    marginVertical: 6,
    backgroundColor: 'rgba(15,23,42,0.1)',
  },
  guaranteeToggleRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
    flexWrap: 'wrap',
  },
  guaranteePill: {
    borderWidth: 1,
    borderColor: 'rgba(37,99,235,0.25)',
    backgroundColor: 'rgba(37,99,235,0.08)',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  guaranteePillSelected: {
    backgroundColor: COLORS.PRIMARY,
    borderColor: COLORS.PRIMARY,
  },
  guaranteePillText: {
    color: '#1e3a8a',
    fontSize: 13,
    fontWeight: '700',
  },
  guaranteePillTextSelected: {
    color: '#fff',
  },
  photoScroller: {
    marginBottom: 10,
  },
  photoItem: {
    marginRight: 10,
    position: 'relative',
  },
  photo: {
    width: 140,
    height: 100,
    borderRadius: 12,
  },
  deleteBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(220,38,38,0.85)',
    borderRadius: 999,
    paddingVertical: 2,
    paddingHorizontal: 7,
  },
  deleteText: {
    color: '#fff',
    fontWeight: '800',
  },
  uploadButton: {
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  savingWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    gap: 10,
  },
  savingText: {
    color: '#fff',
    fontWeight: '600',
  },
});
