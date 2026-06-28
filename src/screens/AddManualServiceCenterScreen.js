/**
 * Dedicated flow for adding an unlisted service center to a service record.
 * Form draft is persisted in route params so it survives map picker navigation.
 */

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View, Pressable, Platform } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Text, TextInput, Button, ActivityIndicator, Portal, Dialog } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import ScreenBackground from '../components/ScreenBackground';
import FloatingCard from '../components/ui/FloatingCard';
import { COLORS } from '../constants/colors';
import { getCountries, getCitiesForCountry } from '../api/profiles';
import {
  validateManualServiceCenterInput,
  parseOptionalCoordinate,
  roundCoordinateForApi,
} from '../utils/manualServiceCenter';
import {
  buildManualServiceCenterDraft,
  manualDraftHasData,
} from '../utils/manualServiceCenterDraft';
import { sortCitiesForPicker } from '../utils/sortCitiesForPicker';
import {
  resolveCountryCityFromCoords,
  dedupeRepeatedAddressText,
} from '../utils/reverseGeocodeLocation';
import {
  buildE164Phone,
  dialPrefixForCountry,
  parseStoredPhone,
} from '../utils/phoneE164';

function applyPhoneFromDraft(draft, setPhonePrefix, setPhoneNational) {
  if (!draft) return;
  if (draft.phonePrefix || draft.phoneNational) {
    setPhonePrefix(draft.phonePrefix || '');
    setPhoneNational(draft.phoneNational || '');
    return;
  }
  const parsed = parseStoredPhone(draft.phone);
  setPhonePrefix(parsed.prefix || '');
  setPhoneNational(parsed.national || '');
}

function applyDraftToForm(draft, setters) {
  if (!draft) return;
  setters.setManualName(draft.name || '');
  applyPhoneFromDraft(draft, setters.setPhonePrefix, setters.setPhoneNational);
  setters.setManualEmail(draft.email || '');
  setters.setManualAddress(draft.address || '');
  setters.setManualCountryId(draft.countryId ?? null);
  setters.setManualCityId(draft.cityId ?? null);
  setters.setManualLatitude(draft.latitude || '');
  setters.setManualLongitude(draft.longitude || '');
}

export default function AddManualServiceCenterScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const vehicleId = route.params?.vehicleId != null ? String(route.params.vehicleId) : '';
  const repairTypeLabel = String(route.params?.repairTypeLabel || '').trim();

  const [manualName, setManualName] = useState('');
  const [phonePrefix, setPhonePrefix] = useState('');
  const [phoneNational, setPhoneNational] = useState('');
  const [manualEmail, setManualEmail] = useState('');
  const [manualAddress, setManualAddress] = useState('');
  const [manualCountryId, setManualCountryId] = useState(null);
  const [manualCityId, setManualCityId] = useState(null);
  const [manualLatitude, setManualLatitude] = useState('');
  const [manualLongitude, setManualLongitude] = useState('');

  const [countries, setCountries] = useState([]);
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingCities, setLoadingCities] = useState(false);
  const [resolvingMapLocation, setResolvingMapLocation] = useState(false);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [dialogMessage, setDialogMessage] = useState('');

  const lastHydratedDraftKey = useRef('');
  const mapPickHandledRef = useRef(null);

  const selectedManualCountry = useMemo(
    () => countries.find((c) => Number(c.id) === Number(manualCountryId)) || null,
    [countries, manualCountryId]
  );

  const selectedManualCity = useMemo(
    () => cities.find((c) => Number(c.id) === Number(manualCityId)) || null,
    [cities, manualCityId]
  );

  const manualCountryIso = selectedManualCountry?.iso2
    ? String(selectedManualCountry.iso2).trim().toUpperCase()
    : '';
  const manualCityName = selectedManualCity?.name ? String(selectedManualCity.name).trim() : '';

  const sortedManualCities = useMemo(
    () => sortCitiesForPicker(cities, selectedManualCountry?.name),
    [cities, selectedManualCountry?.name]
  );

  const effectivePhonePrefix = useMemo(() => {
    if (String(phonePrefix || '').trim()) return phonePrefix;
    return dialPrefixForCountry(selectedManualCountry) || '';
  }, [phonePrefix, selectedManualCountry]);

  const phoneE164 = useMemo(
    () => buildE164Phone(effectivePhonePrefix, phoneNational),
    [effectivePhonePrefix, phoneNational]
  );

  const buildCurrentDraft = useCallback(
    () =>
      buildManualServiceCenterDraft({
        name: manualName,
        phone: phoneE164,
        phonePrefix: effectivePhonePrefix,
        phoneNational,
        email: manualEmail,
        address: manualAddress,
        countryId: manualCountryId,
        cityId: manualCityId,
        countryIso: manualCountryIso,
        cityName: manualCityName,
        latitude: manualLatitude,
        longitude: manualLongitude,
      }),
    [
      manualName,
      phoneE164,
      effectivePhonePrefix,
      phoneNational,
      manualEmail,
      manualAddress,
      manualCountryId,
      manualCityId,
      manualCountryIso,
      manualCityName,
      manualLatitude,
      manualLongitude,
    ]
  );

  const hydrateFromDraft = useCallback(async (draft) => {
    if (!draft || !manualDraftHasData(draft)) return;
    const key = JSON.stringify(draft);
    if (lastHydratedDraftKey.current === key) return;
    lastHydratedDraftKey.current = key;

    applyDraftToForm(draft, {
      setManualName,
      setPhonePrefix,
      setPhoneNational,
      setManualEmail,
      setManualAddress,
      setManualCountryId,
      setManualCityId,
      setManualLatitude,
      setManualLongitude,
    });

    if (draft.countryId) {
      setLoadingCities(true);
      try {
        const cityList = await getCitiesForCountry(draft.countryId);
        setCities(Array.isArray(cityList) ? cityList : []);
      } catch (e) {
        console.warn('Could not load cities for draft country', e);
        setCities([]);
      } finally {
        setLoadingCities(false);
      }
    }
  }, []);

  const persistDraftToRoute = useCallback(
    (draft) => {
      navigation.setParams({ draft });
    },
    [navigation]
  );

  const applyPrefixForCountryId = useCallback(
    (countryId, countryRows) => {
      const row = (countryRows || countries).find((c) => Number(c.id) === Number(countryId));
      const prefix = dialPrefixForCountry(row);
      if (prefix) setPhonePrefix(prefix);
    },
    [countries]
  );

  const handleManualCountryChange = useCallback(async (countryId) => {
    const id = countryId ? Number(countryId) : null;
    setManualCountryId(Number.isFinite(id) ? id : null);
    setManualCityId(null);
    setCities([]);
    if (id) applyPrefixForCountryId(id, countries);
    if (!id) return;
    setLoadingCities(true);
    try {
      const cityList = await getCitiesForCountry(id);
      setCities(Array.isArray(cityList) ? cityList : []);
    } catch (e) {
      console.error(e);
      setDialogMessage('Could not load cities for this country.');
      setDialogVisible(true);
    } finally {
      setLoadingCities(false);
    }
  }, [applyPrefixForCountryId, countries]);

  const restoreContactFromDraft = useCallback((draft) => {
    if (!draft) return;
    setManualName(draft.name || '');
    applyPhoneFromDraft(draft, setPhonePrefix, setPhoneNational);
    setManualEmail(draft.email || '');
  }, []);

  const applyMapPick = useCallback(
    async (pick, draft, countryRows) => {
      const lat = Number(pick.latitude);
      const lon = Number(pick.longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;

      restoreContactFromDraft(draft);
      const roundedLat = roundCoordinateForApi(lat);
      const roundedLon = roundCoordinateForApi(lon);
      setManualLatitude(roundedLat != null ? String(roundedLat) : '');
      setManualLongitude(roundedLon != null ? String(roundedLon) : '');

      setResolvingMapLocation(true);
      let nextCountryId = null;
      let nextCityId = null;
      let nextAddress = '';
      let nextCountryIso = '';
      let nextCityName = '';

      try {
        const resolved = await resolveCountryCityFromCoords({
          latitude: lat,
          longitude: lon,
          countries: countryRows,
          getCitiesForCountry,
        });
        if (resolved?.countryId) {
          nextCountryId = resolved.countryId;
          nextCountryIso = resolved.countryIso || '';
          setManualCountryId(resolved.countryId);
          applyPrefixForCountryId(resolved.countryId, countryRows);
          if (Array.isArray(resolved.cities)) {
            setCities(resolved.cities);
          } else {
            setLoadingCities(true);
            try {
              const cityList = await getCitiesForCountry(resolved.countryId);
              setCities(Array.isArray(cityList) ? cityList : []);
            } finally {
              setLoadingCities(false);
            }
          }
          if (resolved.cityId) {
            nextCityId = resolved.cityId;
            setManualCityId(resolved.cityId);
          } else {
            setManualCityId(null);
          }
          if (resolved.cityName) nextCityName = resolved.cityName;
        } else {
          setManualCountryId(null);
          setManualCityId(null);
          setCities([]);
        }
        if (resolved?.addressHint) {
          nextAddress = dedupeRepeatedAddressText(resolved.addressHint);
          setManualAddress(nextAddress);
        }
      } catch (e) {
        console.warn('Could not resolve map location to country/city', e);
      } finally {
        setResolvingMapLocation(false);
        const e164 = buildE164Phone(
          draft?.phonePrefix || phonePrefix,
          draft?.phoneNational || phoneNational
        );
        const nextDraft = buildManualServiceCenterDraft({
          name: draft?.name || '',
          phone: e164,
          phonePrefix: draft?.phonePrefix || phonePrefix,
          phoneNational: draft?.phoneNational || phoneNational,
          email: draft?.email || '',
          address: nextAddress,
          countryId: nextCountryId,
          cityId: nextCityId,
          countryIso: nextCountryIso,
          cityName: nextCityName,
          latitude: roundedLat != null ? String(roundedLat) : '',
          longitude: roundedLon != null ? String(roundedLon) : '',
        });
        lastHydratedDraftKey.current = JSON.stringify(nextDraft);
        persistDraftToRoute(nextDraft);
      }
    },
    [restoreContactFromDraft, persistDraftToRoute, phonePrefix, phoneNational, applyPrefixForCountryId]
  );

  const openMapPicker = useCallback(() => {
    const draft = buildCurrentDraft();
    persistDraftToRoute(draft);
    const cityLat = selectedManualCity?.latitude != null ? Number(selectedManualCity.latitude) : null;
    const cityLon = selectedManualCity?.longitude != null ? Number(selectedManualCity.longitude) : null;
    const lat = parseOptionalCoordinate(manualLatitude) ?? (Number.isFinite(cityLat) ? cityLat : null);
    const lon = parseOptionalCoordinate(manualLongitude) ?? (Number.isFinite(cityLon) ? cityLon : null);
    navigation.navigate('MapLocationPicker', {
      returnScreen: 'AddManualServiceCenter',
      vehicleId,
      preservedDraft: draft,
      logServiceRecordDraft: route.params?.logServiceRecordDraft,
      initialLatitude: lat,
      initialLongitude: lon,
    });
  }, [
    buildCurrentDraft,
    navigation,
    vehicleId,
    manualLatitude,
    manualLongitude,
    selectedManualCity,
    persistDraftToRoute,
  ]);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: 'Add service center',
      headerRight: () => (
        <Pressable
          onPress={openMapPicker}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Pick location on map"
          style={({ pressed }) => [
            styles.headerMapBtn,
            pressed && styles.headerMapBtnPressed,
          ]}
        >
          <MaterialCommunityIcons name="map-marker" size={20} color="#fff" />
          <Text style={styles.headerMapBtnLabel}>Map</Text>
        </Pressable>
      ),
    });
  }, [navigation, openMapPicker]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const countryList = await getCountries();
        if (!cancelled) setCountries(Array.isArray(countryList) ? countryList : []);
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          setDialogMessage('Could not load countries.');
          setDialogVisible(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (route.params?.mapPick) return;
      const draft = route.params?.draft;
      if (draft && manualDraftHasData(draft)) {
        hydrateFromDraft(draft);
      }
    }, [route.params?.draft, route.params?.mapPick, hydrateFromDraft])
  );

  useEffect(() => {
    const pick = route.params?.mapPick;
    if (!pick || loading) return;

    const pickKey = `${pick.latitude},${pick.longitude}`;
    if (mapPickHandledRef.current === pickKey) return;

    let cancelled = false;
    (async () => {
      let countryRows = countries;
      if (!countryRows.length) {
        try {
          const fetched = await getCountries();
          countryRows = Array.isArray(fetched) ? fetched : [];
          if (!cancelled && countryRows.length) setCountries(countryRows);
        } catch (e) {
          console.warn('Map pick: could not load countries', e);
        }
      }
      if (cancelled || !countryRows.length) return;

      mapPickHandledRef.current = pickKey;
      const draft = route.params?.draft;
      await applyMapPick(pick, draft, countryRows);
      if (!cancelled) navigation.setParams({ mapPick: undefined });
    })();

    return () => {
      cancelled = true;
    };
  }, [route.params?.mapPick, route.params?.draft, loading, countries, applyMapPick, navigation]);

  const handleSave = () => {
    const manualErr = validateManualServiceCenterInput({
      phone: phoneE164,
      email: manualEmail,
      address: manualAddress,
      city: manualCityName,
      countryIso: manualCountryIso,
      latitude: manualLatitude,
      longitude: manualLongitude,
    });
    if (manualErr) {
      setDialogMessage(manualErr);
      setDialogVisible(true);
      return;
    }

    const draft = buildCurrentDraft();
    navigation.navigate({
      name: 'LogServiceRecord',
      params: {
        vehicleId,
        manualServiceCenterDraft: draft,
        logServiceRecordDraft: route.params?.logServiceRecordDraft,
      },
      merge: true,
    });
  };

  if (loading) {
    return <ActivityIndicator animating size="large" style={{ flex: 1 }} />;
  }

  const pickedLat = parseOptionalCoordinate(manualLatitude);
  const pickedLon = parseOptionalCoordinate(manualLongitude);

  return (
    <ScreenBackground>
      <View style={styles.root}>
        <KeyboardAwareScrollView
          contentContainerStyle={[
            styles.container,
            { paddingBottom: 100 + Math.max(insets.bottom, 10) },
          ]}
          keyboardShouldPersistTaps="handled"
          enableResetScrollToCoords={false}
        >
          <FloatingCard>
            {repairTypeLabel ? (
              <View style={styles.repairContextChip}>
                <Text style={styles.repairContextLabel}>Service record</Text>
                <Text style={styles.repairContextValue}>{repairTypeLabel}</Text>
              </View>
            ) : null}

            <Pressable
              onPress={openMapPicker}
              style={({ pressed }) => [styles.mapCtaCard, pressed && styles.mapCtaCardPressed]}
              accessibilityRole="button"
              accessibilityLabel="Pick workshop location on map"
            >
              <View style={styles.mapCtaIconWrap}>
                <MaterialCommunityIcons name="map-marker-radius" size={28} color="#fff" />
              </View>
              <View style={styles.mapCtaTextWrap}>
                <Text style={styles.mapCtaTitle}>Start with the map</Text>
                <Text style={styles.mapCtaBody}>
                  Drop a pin — we fill street, country, city, and phone prefix. Then add phone or email only.
                </Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={24} color={COLORS.PRIMARY} />
            </Pressable>

            {pickedLat != null && pickedLon != null ? (
              <View style={styles.mapSummaryRow}>
                <MaterialCommunityIcons name="check-circle" size={18} color={COLORS.PRIMARY} />
                <Text style={styles.mapPickSummary}>
                  Location set · {pickedLat.toFixed(5)}, {pickedLon.toFixed(5)}
                  {resolvingMapLocation ? ' · matching city…' : ''}
                </Text>
              </View>
            ) : null}

            <Text style={styles.disclaimer}>
              We save this workshop in our directory (deduped by phone or email) and link it to your service
              record. They are not on the platform or authorized on your vehicle until they register.
            </Text>

            <Text variant="labelLarge" style={styles.label}>
              Contact
            </Text>
            <Text style={styles.sectionHint}>At least one of phone or email — used for login and outreach later.</Text>
            <TextInput
              mode="outlined"
              label="Name (optional)"
              value={manualName}
              onChangeText={setManualName}
              style={styles.input}
            />
            <Text variant="labelLarge" style={styles.label}>
              Phone
            </Text>
            <View style={styles.phoneRow}>
              <TextInput
                mode="outlined"
                label="Prefix"
                value={phonePrefix}
                onChangeText={setPhonePrefix}
                style={[styles.input, styles.phonePrefixInput]}
                keyboardType="phone-pad"
                placeholder="+359"
              />
              <TextInput
                mode="outlined"
                label="Number"
                value={phoneNational}
                onChangeText={setPhoneNational}
                style={[styles.input, styles.phoneNationalInput]}
                keyboardType="phone-pad"
                placeholder="888123456"
              />
            </View>
            <Text style={styles.sectionHint}>
              {phoneE164
                ? `Stored as ${phoneE164} (international format for login matching).`
                : 'Prefix updates from country / map. Enter national digits without leading 0.'}
            </Text>
            <TextInput
              mode="outlined"
              label="Email"
              value={manualEmail}
              onChangeText={setManualEmail}
              style={styles.input}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text variant="labelLarge" style={[styles.label, styles.locationLabel]}>
              Location
            </Text>
            <Text style={styles.sectionHint}>
              Usually filled from the map. You can adjust street, country, or city below.
            </Text>
            <Text variant="labelLarge" style={styles.label}>
              Street address
            </Text>
            <TextInput
              mode="outlined"
              label="Address (optional)"
              value={manualAddress}
              onChangeText={setManualAddress}
              style={styles.input}
              placeholder="Street, number, building…"
            />
            <Text variant="labelLarge" style={styles.label}>
              Country
            </Text>
            {countries.length ? (
              <View style={styles.pickerContainer}>
                        <Picker
                          selectedValue={manualCountryId != null ? String(manualCountryId) : ''}
                          onValueChange={(value) => handleManualCountryChange(value || null)}
                          style={styles.picker}
                        >
                          <Picker.Item label="Select country…" value="" />
                          {countries.map((c) => (
                            <Picker.Item key={String(c.id)} label={c.name} value={String(c.id)} />
                          ))}
                </Picker>
              </View>
            ) : (
              <Text style={styles.sectionHint}>Countries could not be loaded.</Text>
            )}
            <Text variant="labelLarge" style={styles.label}>
              City
            </Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={manualCityId != null ? String(manualCityId) : ''}
                onValueChange={(value) => setManualCityId(value ? Number(value) : null)}
                enabled={!!manualCountryId && !loadingCities && !resolvingMapLocation}
                style={styles.picker}
              >
                <Picker.Item
                  label={
                    resolvingMapLocation
                      ? 'Matching city from map…'
                      : !manualCountryId
                        ? 'Select country first…'
                        : loadingCities
                          ? 'Loading cities…'
                          : 'Select city…'
                  }
                  value=""
                />
                {sortedManualCities.map((city) => (
                  <Picker.Item key={String(city.id)} label={city.name} value={String(city.id)} />
                ))}
              </Picker>
            </View>
          </FloatingCard>
        </KeyboardAwareScrollView>

        <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <Button mode="contained" onPress={handleSave} style={styles.saveBtn} contentStyle={styles.saveBtnContent}>
            Save workshop & link record
          </Button>
          <Text style={styles.bottomHint}>
            Adds to our workshop directory and attaches to this service record.
          </Text>
        </View>
      </View>

      <Portal>
        <Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)}>
          <Dialog.Title>Check details</Dialog.Title>
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
  root: { flex: 1 },
  container: { padding: 12, gap: 8 },
  sectionTitle: { color: COLORS.TEXT_DARK, fontWeight: '700', marginBottom: 4 },
  repairContextChip: {
    borderRadius: 8,
    backgroundColor: 'rgba(15,23,42,0.06)',
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 10,
  },
  repairContextLabel: { color: COLORS.TEXT_MUTED, fontSize: 11, fontWeight: '600' },
  repairContextValue: { color: COLORS.TEXT_DARK, fontWeight: '700', marginTop: 2 },
  mapCtaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.PRIMARY,
    backgroundColor: 'rgba(59,130,246,0.1)',
    padding: 12,
    marginBottom: 10,
  },
  mapCtaCardPressed: { opacity: 0.9 },
  mapCtaIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapCtaTextWrap: { flex: 1 },
  mapCtaTitle: { color: COLORS.TEXT_DARK, fontWeight: '800', fontSize: 16 },
  mapCtaBody: { color: COLORS.TEXT_MUTED, fontSize: 13, lineHeight: 18, marginTop: 2 },
  headerMapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.PRIMARY,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 4,
    minHeight: Platform.OS === 'android' ? 40 : 36,
  },
  headerMapBtnPressed: { opacity: 0.88 },
  headerMapBtnLabel: { color: '#fff', fontSize: 15, fontWeight: '700', marginLeft: 4 },
  disclaimer: { color: COLORS.TEXT_MUTED, fontSize: 13, lineHeight: 18, marginBottom: 10 },
  sectionHint: { color: COLORS.TEXT_MUTED, marginBottom: 10, fontSize: 13 },
  label: { marginTop: 10, marginBottom: 4, fontWeight: '600' },
  input: { marginBottom: 8 },
  phoneRow: { flexDirection: 'row', gap: 8 },
  phonePrefixInput: { flex: 0.38, marginBottom: 4 },
  phoneNationalInput: { flex: 0.62, marginBottom: 4 },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    marginBottom: 10,
    backgroundColor: '#fff',
  },
  picker: { width: '100%' },
  locationLabel: { marginTop: 14 },
  mapSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(59,130,246,0.08)',
  },
  mapPickSummary: { color: COLORS.TEXT_DARK, fontSize: 13, flex: 1 },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 12,
    paddingTop: 10,
    backgroundColor: 'rgba(245,247,250,0.96)',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(15,23,42,0.12)',
  },
  saveBtn: { borderRadius: 12 },
  saveBtnContent: { paddingVertical: 8 },
  bottomHint: {
    color: COLORS.TEXT_MUTED,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 17,
  },
});
