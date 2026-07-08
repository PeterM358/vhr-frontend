import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import AppNavigationBar from '../components/common/AppNavigationBar';
import { useScrollShadow } from '../hooks/useScrollShadow';
import { useClientDashboardBack } from '../navigation/appNavBarBack';
import FloatingCard from '../components/ui/FloatingCard';
import AppCard from '../components/ui/AppCard';
import { COLORS } from '../constants/colors';
import { useGarageScene } from '../context/GarageSceneContext';
import { getEnabledScenes } from '../theme/garageScenes';
import LanguagePicker from '../components/profile/LanguagePicker';
import ProfileHeaderSaveButton from '../components/profile/ProfileHeaderSaveButton';
import useDebouncedValue from '../utils/useDebouncedValue';
import { useTranslation } from '../i18n';
import { buildClientProfileSaveSnapshot } from '../utils/clientProfileSaveSnapshot';

const CONTACT_PREFERENCE_STORAGE_KEY = '@client_profile_contact_preference';
const INITIAL_CITY_LIMIT = 120;
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

function ensureSelectedCity(cityList, selectedId, selectedName) {
  if (!selectedId) return cityList;
  if (cityList.some((city) => Number(city.id) === Number(selectedId))) {
    return cityList;
  }
  return [{ id: selectedId, name: selectedName || 'Selected city' }, ...cityList];
}

function ProfileSkeleton() {
  return (
    <ScreenBackground safeArea={false}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={[styles.skeletonBlock, styles.skeletonHero]} />
        <View style={[styles.skeletonBlock, styles.skeletonCard]} />
        <View style={[styles.skeletonBlock, styles.skeletonCard]} />
        <View style={[styles.skeletonBlock, styles.skeletonCard]} />
      </ScrollView>
    </ScreenBackground>
  );
}

export default function ClientProfileScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { scrolled, onScroll, scrollEventThrottle } = useScrollShadow();
  const handleBack = useClientDashboardBack(navigation);
  const { getSelectedScene, setSelectedSceneId } = useGarageScene();
  const garageScene = getSelectedScene();
  const garageScenes = getEnabledScenes();

  const [profile, setProfile] = useState(null);
  const [countries, setCountries] = useState([]);
  const [cities, setCities] = useState([]);
  const [loadingCities, setLoadingCities] = useState(false);
  const [citySearch, setCitySearch] = useState('');
  const debouncedCitySearch = useDebouncedValue(citySearch, 300);
  const [displayName, setDisplayName] = useState('');
  const [contactPreference, setContactPreference] = useState('phone');
  const [phonePrefix, setPhonePrefix] = useState('');
  const [phoneNational, setPhoneNational] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [dialogVisible, setDialogVisible] = useState(false);
  const [dialogMessage, setDialogMessage] = useState('');
  const [savedSnapshot, setSavedSnapshot] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadCities = useCallback(async (countryId, search = '', selectedCityId = null, selectedCityName = '') => {
    if (!countryId) {
      setCities([]);
      return;
    }
    setLoadingCities(true);
    try {
      const trimmed = String(search || '').trim();
      const cityList = await getCitiesForCountry(countryId, {
        search: trimmed.length >= 2 ? trimmed : undefined,
        limit: trimmed.length >= 2 ? 50 : INITIAL_CITY_LIMIT,
      });
      const rows = Array.isArray(cityList) ? cityList : [];
      setCities(ensureSelectedCity(rows, selectedCityId, selectedCityName));
    } catch (e) {
      console.warn('Could not load cities for selected country', e);
      setCities([]);
    } finally {
      setLoadingCities(false);
    }
  }, []);

  useEffect(() => {
    if (!profile?.country) return;
    loadCities(profile.country, debouncedCitySearch, profile.city, profile.city_name);
  }, [profile?.country, profile?.city, profile?.city_name, debouncedCitySearch, loadCities]);

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
      const initialPreference = storedContactPreference === 'chat' ? 'phone' : storedContactPreference || 'phone';
      setSavedSnapshot(
        buildClientProfileSaveSnapshot({
          profile: clientData,
          phoneE164: buildE164Phone(initialPrefix, initialNational) || clientData?.phone || '',
          contactPreference: initialPreference,
        })
      );
    } catch (err) {
      console.error(err);
      setDialogMessage(t('profile.loadError'));
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
    setCitySearch('');
    setProfile({
      ...profile,
      country: value,
      city: null,
    });
    setCities([]);
    if (!value) return;
    await loadCities(value);
  };

  const mergedPhonePreview = useMemo(() => {
    let effectivePrefix = String(phonePrefix || '').trim();
    if (!effectivePrefix && profile?.country) {
      const c = countries.find((x) => Number(x.id) === Number(profile.country));
      effectivePrefix = dialPrefixForCountry(c);
    }
    return buildE164Phone(effectivePrefix, phoneNational);
  }, [phonePrefix, phoneNational, profile?.country, countries]);

  const currentSnapshot = useMemo(
    () =>
      buildClientProfileSaveSnapshot({
        profile,
        phoneE164: mergedPhonePreview || '',
        contactPreference,
      }),
    [profile, mergedPhonePreview, contactPreference]
  );

  const isDirty = Boolean(savedSnapshot && currentSnapshot && savedSnapshot !== currentSnapshot);

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
        setDialogMessage(t('profile.phoneRequired'));
        setDialogVisible(true);
        return;
      }
      if (!effectivePrefix || !effectivePrefix.replace(/\s/g, '').startsWith('+')) {
        setDialogMessage(
          !profile.country
            ? t('profile.phonePrefixMissingNoCountry')
            : t('profile.phonePrefixMissing')
        );
        setDialogVisible(true);
        return;
      }
      if (!mergedPhone) {
        setDialogMessage(t('profile.phoneInvalid'));
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
      setDialogMessage(t('profile.savedSuccess'));
      setDialogVisible(true);
      const nextProfile = {
        ...profile,
        town: selectedCity?.name || profile?.town || '',
        phone: mergedPhone || profile?.phone || '',
      };
      setProfile(nextProfile);
      setSavedSnapshot(
        buildClientProfileSaveSnapshot({
          profile: nextProfile,
          phoneE164: mergedPhone || '',
          contactPreference,
        })
      );
      if (mergedPhone) {
        const split = parseStoredPhone(mergedPhone);
        setPhonePrefix(split.prefix || effectivePrefix);
        setPhoneNational(split.national);
      }
    } catch (err) {
      console.error(err);
      setDialogMessage(t('profile.saveError'));
      setDialogVisible(true);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <ProfileSkeleton />;
  }

  if (!profile) {
    return (
      <ScreenBackground safeArea={false}>
        <View style={styles.emptyContainer}>
          <Text style={{ color: '#fff' }}>{t('profile.noProfile')}</Text>
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
      <AppNavigationBar
        title={t('profile.title')}
        backLabel={t('navigation.dashboard')}
        onBack={handleBack}
        scrolled={scrolled}
        rightAction={
          <ProfileHeaderSaveButton onPress={handleSave} saving={saving} dirty={isDirty} />
        }
      />
      <ScrollView
        onScroll={onScroll}
        scrollEventThrottle={scrollEventThrottle}
        contentContainerStyle={[
        styles.container,
        { paddingTop: 12, paddingBottom: Math.max(insets.bottom, 16) },
      ]}>
        <AppCard variant="dark" contentStyle={styles.heroContent}>
          <Text style={styles.heroTitle}>{t('profile.title')}</Text>
          <Text style={styles.heroSubtitle}>{t('profile.heroSubtitle')}</Text>
        </AppCard>

        <FloatingCard>
          <Text style={styles.sectionTitle}>{t('profile.basicProfile')}</Text>
          <TextInput
            label={t('profile.displayNameLabel')}
            mode="outlined"
            value={displayName}
            onChangeText={setDisplayName}
            placeholder={t('profile.displayNamePlaceholder')}
            style={styles.input}
          />
          <Text style={styles.helper}>{t('profile.displayNameHelper')}</Text>
        </FloatingCard>

        <FloatingCard>
          <Text style={styles.sectionTitle}>{t('profile.location')}</Text>
          <Text variant="labelLarge" style={styles.label}>{t('profile.country')}</Text>
          <View style={styles.pickerWrap}>
            <Picker
              selectedValue={profile.country}
              onValueChange={handleCountryChange}
              style={styles.picker}
            >
              <Picker.Item label={t('profile.selectCountry')} value={null} />
              {countries.map((c) => (
                <Picker.Item key={c.id} label={c.name} value={c.id} />
              ))}
            </Picker>
          </View>

          <Text variant="labelLarge" style={styles.label}>{t('profile.city')}</Text>
          {!!profile.country ? (
            <TextInput
              label={t('profile.searchCity')}
              mode="outlined"
              value={citySearch}
              onChangeText={setCitySearch}
              placeholder={t('profile.searchCityPlaceholder')}
              style={styles.input}
            />
          ) : null}
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
                    ? t('profile.selectCountryFirst')
                    : loadingCities
                      ? t('profile.loadingCities')
                      : t('profile.selectCity')
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
          <Text style={styles.sectionTitle}>{t('profile.contactPreferences')}</Text>
          <Text style={styles.helper}>{t('profile.contactHelper')}</Text>
          <Text variant="labelLarge" style={styles.label}>{t('common.phone')}</Text>
          <View style={styles.phoneRow}>
            <TextInput
              label={t('profile.prefix')}
              mode="outlined"
              dense
              placeholder={dialPrefixForCountry(countries.find((c) => Number(c.id) === Number(profile.country))) || '+359'}
              value={phonePrefix}
              onChangeText={setPhonePrefix}
              style={[styles.input, styles.phonePrefixInput]}
              keyboardType="phone-pad"
            />
            <TextInput
              label={t('profile.number')}
              mode="outlined"
              dense
              placeholder={t('profile.numberPlaceholder')}
              value={phoneNational}
              onChangeText={setPhoneNational}
              style={[styles.input, styles.phoneNationalInput]}
              keyboardType="phone-pad"
            />
          </View>
          <Text style={styles.helper}>
            {profile.country
              ? t('profile.phonePrefixHelperWithCountry')
              : t('profile.phonePrefixHelperNoCountry')}
          </Text>
          <Text variant="labelLarge" style={styles.label}>{t('profile.preferredContact')}</Text>
          <SegmentedButtons
            value={contactPreference}
            onValueChange={setContactPreference}
            buttons={[
              { value: 'phone', label: t('common.phone') },
              { value: 'email', label: t('common.email') },
            ]}
            style={styles.segmented}
          />
          <Text style={styles.helper}>{t('profile.contactHelperSavedLocally')}</Text>
        </FloatingCard>

        <FloatingCard>
          <Text style={styles.sectionTitle}>{t('profile.appearance')}</Text>
          <LanguagePicker />
          <Text variant="labelLarge" style={[styles.label, styles.languageSpacer]}>{t('profile.garageScene')}</Text>
          <View style={styles.pickerWrap}>
            <Picker
              selectedValue={garageScene.id}
              onValueChange={setSelectedSceneId}
              style={styles.picker}
            >
              {garageScenes.map((scene) => (
                <Picker.Item key={scene.id} label={scene.label} value={scene.id} />
              ))}
            </Picker>
          </View>
          <Text style={styles.helper}>
            {garageScene.description || t('profile.garageSceneHelper')}
          </Text>
        </FloatingCard>

        <FloatingCard>
          <Text style={styles.sectionTitle}>{t('profile.vehicleAccess')}</Text>
          <Text style={styles.helper}>
            {t('profile.vehicleAccessHelper')}
          </Text>
        </FloatingCard>

        {saving && <ActivityIndicator animating size="small" />}
      </ScrollView>

      <Portal>
        <Dialog
          visible={dialogVisible}
          onDismiss={() => setDialogVisible(false)}
        >
          <Dialog.Title>{t('common.notice')}</Dialog.Title>
          <Dialog.Content>
            <Text>{dialogMessage}</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDialogVisible(false)}>{t('common.ok')}</Button>
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
  languageSpacer: {
    marginTop: 16,
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
  skeletonBlock: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 16,
  },
  skeletonHero: {
    height: 96,
    marginBottom: 4,
  },
  skeletonCard: {
    height: 160,
  },
});