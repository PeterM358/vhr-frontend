// PATH: src/screens/partner/PartnerOnboardingSteps.js
//
// Partner onboarding wizard steps. These reuse the shared shop-profile fields
// (name, business category, vehicle types, operations) and persist through the
// existing PATCH /api/profiles/shop-profiles/{id}/ endpoint via the wizard
// adapter — no duplicate profile API. State lives in the engine's shared
// `values`; taxonomy + completion come from the wizard `context`.
//
// Full guided flow (all editable in-wizard): Business → Location → Vehicles →
// Services → Prices → Hours → Photos → About → Legal → Preview → Publish.
// Never hand incomplete partners off to ShopProfileScreen to finish sections.

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, Pressable, ScrollView, Platform, Alert } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Text, TextInput, ProgressBar, Button, Switch } from 'react-native-paper';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';

import FloatingCard from '../../components/ui/FloatingCard';
import SearchableChipSelector from '../../components/ui/SearchableChipSelector';
import ShopPhotoGallery from '../../components/shop/ShopPhotoGallery';
import ShopPublicPreviewTabs from '../../components/shop/ShopPublicPreviewTabs';
import ShopViewPublicProfileButton from '../../components/shop/ShopViewPublicProfileButton';
import { COLORS } from '../../constants/colors';
import { useTranslation } from '../../i18n';
import { useWizard } from '../../wizard';
import { getCountries, getCitiesForCountry } from '../../api/profiles';
import { uploadShopImage, deleteShopImage } from '../../api/shops';
import { pickVehiclePhotoAttachment } from '../../utils/pickDocumentFile';
import { formatShopDisplayName } from '../../utils/shopDisplayName';
import { roundCoordinateForApi } from '../../utils/manualServiceCenter';
import { buildE164Phone, dialPrefixForCountry } from '../../utils/phoneE164';
import {
  dedupeRepeatedAddressText,
  resolveCountryCityFromCoords,
} from '../../utils/reverseGeocodeLocation';
import { sortCitiesForPicker } from '../../utils/sortCitiesForPicker';
import {
  WEEKDAYS_MON_FIRST,
  DAY_KEY,
  normalizeWorkingHoursObject,
} from '../../utils/shopWorkingHours';
import {
  translateBusinessCategoryLabel,
  translateBusinessServiceLabel,
  translateVehicleTypeLabel,
  translateRepairTypeLabel,
} from '../../utils/translateShopTypeLabels';
import { filterRepairTypesForShop } from '../../utils/repairTypeShopCompatibility';

const MAX_SHOP_PHOTOS = 6;
/* --------------------------- Step 1: business type ------------------------ */

export function PartnerBusinessTypeStep() {
  const { t } = useTranslation();
  const { values, setValues, context } = useWizard();
  const categories = context.businessCategories || [];

  const selectedPrimary = values.primary_business_category_id;
  const selectedKeys = useMemo(() => {
    const ids = new Set(
      [selectedPrimary, ...(values.secondary_business_category_ids || [])]
        .filter((v) => v != null)
        .map(Number)
    );
    return new Set(categories.filter((c) => ids.has(Number(c.id))).map((c) => c.key));
  }, [categories, selectedPrimary, values.secondary_business_category_ids]);

  const serviceItems = useMemo(() => {
    const services = context.businessServices || [];
    const hasCats = selectedKeys.size > 0;
    return services
      .filter((svc) => {
        if (!hasCats) return true;
        const compat = Array.isArray(svc.category_keys) ? svc.category_keys : [];
        if (!compat.length) return true;
        return compat.some((k) => selectedKeys.has(k));
      })
      .map((svc) => ({
        id: svc.id,
        label: translateBusinessServiceLabel(svc, t),
      }));
  }, [context.businessServices, selectedKeys, t]);

  return (
    <View>
      <FloatingCard>
        <Text style={styles.cardTitle}>{t('partnerOnboarding.businessName', null, 'Business name')}</Text>
        <TextInput
          mode="outlined"
          value={values.name || ''}
          onChangeText={(v) => setValues({ name: v })}
          placeholder={t('partnerOnboarding.businessNamePlaceholder', null, 'e.g. Veversal Auto Service')}
          style={styles.input}
        />
      </FloatingCard>

      <FloatingCard>
        <Text style={styles.cardTitle}>{t('partnerOnboarding.businessType', null, 'Business type')}</Text>
        <Text style={styles.hint}>
          {t('partnerOnboarding.businessTypeHint', null, 'Choose your primary business type.')}
        </Text>
        <View style={styles.chipWrap}>
          {categories.map((cat) => {
            const active = Number(selectedPrimary) === Number(cat.id);
            return (
              <Pressable
                key={cat.id}
                onPress={() => {
                  // Drop services that are incompatible with the new primary
                  // category so Save doesn't 400 on taxonomy validation.
                  const nextKeys = new Set([cat.key]);
                  const services = context.businessServices || [];
                  const kept = (values.business_service_ids || []).filter((id) => {
                    const svc = services.find((s) => Number(s.id) === Number(id));
                    if (!svc) return false;
                    const compat = Array.isArray(svc.category_keys) ? svc.category_keys : [];
                    if (!compat.length) return true;
                    return compat.some((k) => nextKeys.has(k));
                  });
                  setValues({
                    primary_business_category_id: cat.id,
                    business_service_ids: kept,
                  });
                }}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {translateBusinessCategoryLabel(cat, t)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </FloatingCard>

      {selectedPrimary != null ? (
        <FloatingCard>
          <Text style={styles.cardTitle}>{t('partnerOnboarding.services', null, 'Services offered')}</Text>
          <Text style={styles.hint}>
            {t('partnerOnboarding.servicesHint', null, 'Filtered to your selected business type.')}
          </Text>
          <SearchableChipSelector
            items={serviceItems}
            selectedIds={values.business_service_ids || []}
            onChangeSelectedIds={(ids) => setValues({ business_service_ids: ids })}
            searchPlaceholder={t('partnerOnboarding.searchServices', null, 'Search services…')}
            emptyHint={t('partnerOnboarding.noServices', null, 'No services for this business type.')}
          />
        </FloatingCard>
      ) : null}
    </View>
  );
}

/* ----------------------------- Step 2: vehicles --------------------------- */

export function PartnerVehiclesStep() {
  const { t } = useTranslation();
  const { values, setValues, context } = useWizard();
  const items = (context.vehicleTypes || []).map((vt) => ({
    id: vt.id,
    label: translateVehicleTypeLabel(vt, t),
  }));

  return (
    <View>
      <FloatingCard>
        <Text style={styles.cardTitle}>{t('partnerOnboarding.vehicleTypes', null, 'Vehicle types you service')}</Text>
        <Text style={styles.hint}>
          {t('partnerOnboarding.vehicleTypesHint', null, 'These drive which operations you can price.')}
        </Text>
        <SearchableChipSelector
          items={items}
          selectedIds={values.supported_vehicle_types || []}
          onChangeSelectedIds={(ids) => setValues({ supported_vehicle_types: ids })}
          searchPlaceholder={t('partnerOnboarding.searchVehicleTypes', null, 'Search vehicle types…')}
          emptyHint={t('partnerOnboarding.noVehicleTypes', null, 'No vehicle types found.')}
        />
      </FloatingCard>
    </View>
  );
}

/* ----------------------------- Step 3: services --------------------------- */

export function PartnerServicesStep() {
  const { t } = useTranslation();
  const { values, setValues, context } = useWizard();

  // Filter by BusinessCategory (e.g. tyre ops need tire_shop) AND VehicleType.
  const items = useMemo(() => {
    const categories = context.businessCategories || [];
    const selectedCatIds = new Set(
      [values.primary_business_category_id, ...(values.secondary_business_category_ids || [])]
        .filter((v) => v != null)
        .map(Number)
    );
    const businessCategoryKeys = categories
      .filter((c) => selectedCatIds.has(Number(c.id)))
      .map((c) => c.key)
      .filter(Boolean);

    return filterRepairTypesForShop(context.repairTypes || [], {
      businessCategoryKeys,
      supportedVehicleTypeIds: values.supported_vehicle_types || [],
    }).map((rt) => ({
      id: rt.id,
      label: translateRepairTypeLabel(rt, t) || rt.name || rt.slug || `#${rt.id}`,
    }));
  }, [
    context.repairTypes,
    context.businessCategories,
    values.supported_vehicle_types,
    values.primary_business_category_id,
    values.secondary_business_category_ids,
    t,
  ]);

  return (
    <View>
      <FloatingCard>
        <Text style={styles.cardTitle}>{t('partnerOnboarding.operations', null, 'Operations you offer')}</Text>
        <Text style={styles.hint}>
          {t(
            'partnerOnboarding.operationsHint',
            null,
            'Filtered to your business type and vehicle types. Add prices in the full price list.'
          )}
        </Text>
        <SearchableChipSelector
          items={items}
          selectedIds={values.available_repairs || []}
          onChangeSelectedIds={(ids) => setValues({ available_repairs: ids })}
          searchPlaceholder={t('partnerOnboarding.searchOperations', null, 'Search operations…')}
          emptyHint={t('partnerOnboarding.noOperations', null, 'Select vehicle types first to see operations.')}
        />
      </FloatingCard>
    </View>
  );
}

/* ----------------------------- Step 4: working hours ---------------------- */

function hoursRowsFromValue(value) {
  const src = normalizeWorkingHoursObject(value);
  return WEEKDAYS_MON_FIRST.map((day) => {
    const row = src[DAY_KEY[day]] || src[day.toLowerCase()] || null;
    if (!row || typeof row !== 'object') {
      const weekend = day === 'Saturday' || day === 'Sunday';
      return { day, start: weekend ? '' : '09:00', end: weekend ? '' : '18:00', closed: weekend };
    }
    const start = row.start != null ? String(row.start) : '';
    const end = row.end != null ? String(row.end) : '';
    const closed = !!row.closed || (!start && !end);
    return { day, start, end, closed };
  });
}

function hoursValueFromRows(rows) {
  const out = {};
  rows.forEach((r) => {
    const key = DAY_KEY[r.day] || r.day.toLowerCase();
    const start = (r.start || '').trim();
    const end = (r.end || '').trim();
    out[key] = r.closed || (!start && !end) ? { closed: true } : { start, end };
  });
  return out;
}

export function hasAnyOpenDay(value) {
  const rows = hoursRowsFromValue(value);
  return rows.some((r) => !r.closed && r.start && r.end);
}

export function PartnerHoursStep() {
  const { t } = useTranslation();
  const { values, setValues } = useWizard();
  const rows = useMemo(() => hoursRowsFromValue(values.working_hours), [values.working_hours]);

  const commit = (nextRows) => setValues({ working_hours: hoursValueFromRows(nextRows) });

  const setWeekdayDefaults = () => {
    commit(
      rows.map((r) => {
        const weekend = r.day === 'Saturday' || r.day === 'Sunday';
        return weekend
          ? { ...r, closed: true, start: '', end: '' }
          : { ...r, closed: false, start: '09:00', end: '18:00' };
      })
    );
  };

  const updateRow = (idx, patch) =>
    commit(rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)));

  return (
    <View>
      <FloatingCard>
        <Text style={styles.cardTitle}>{t('partnerOnboarding.hoursTitle', null, 'Working hours')}</Text>
        <Text style={styles.hint}>
          {t('partnerOnboarding.hoursHint', null, 'Set the days and times you are open. Customers see these on your public page.')}
        </Text>
        <Button
          mode="outlined"
          compact
          onPress={setWeekdayDefaults}
          style={styles.hoursQuickBtn}
        >
          {t('partnerOnboarding.hoursWeekdayQuickFill', null, 'Weekdays 09:00–18:00 (Sat–Sun closed)')}
        </Button>
        {rows.map((row, idx) => (
          <View key={row.day} style={styles.hoursRow}>
            <Text style={styles.dayLabel}>
              {t(`partnerOnboarding.day.${row.day.toLowerCase()}`, null, row.day)}
            </Text>
            <View style={styles.hoursInputsWrap}>
              <TextInput
                mode="outlined"
                dense
                placeholder="09:00"
                value={row.start}
                onChangeText={(text) => updateRow(idx, { start: text, closed: false })}
                style={styles.hourInput}
              />
              <Text style={styles.hoursSeparator}>-</Text>
              <TextInput
                mode="outlined"
                dense
                placeholder="18:00"
                value={row.end}
                onChangeText={(text) => updateRow(idx, { end: text, closed: false })}
                style={styles.hourInput}
              />
              <Pressable
                onPress={() =>
                  updateRow(
                    idx,
                    row.closed
                      ? { closed: false, start: row.start || '09:00', end: row.end || '18:00' }
                      : { closed: true, start: '', end: '' }
                  )
                }
                style={[styles.closedToggle, row.closed && styles.closedToggleActive]}
              >
                <Text style={[styles.closedToggleText, row.closed && styles.closedToggleTextActive]}>
                  {row.closed
                    ? t('partnerOnboarding.closed', null, 'Closed')
                    : t('partnerOnboarding.open', null, 'Open')}
                </Text>
              </Pressable>
            </View>
          </View>
        ))}
      </FloatingCard>
    </View>
  );
}

/* ----------------------------- Step 5: legal ------------------------------ */

export function PartnerLegalStep() {
  const { t } = useTranslation();
  const { values, setValues } = useWizard();
  const vatRegistered = values.vat_registered !== false;

  return (
    <View>
      <FloatingCard>
        <Text style={styles.cardTitle}>{t('partnerOnboarding.legalTitle', null, 'Company & invoicing')}</Text>
        <Text style={styles.hint}>
          {t('partnerOnboarding.legalHint', null, 'Used on invoices. Kept separate from your public profile.')}
        </Text>
        <TextInput
          mode="outlined"
          label={t('partnerOnboarding.legalName', null, 'Registered company name')}
          value={values.legal_name || ''}
          onChangeText={(v) => setValues({ legal_name: v })}
          style={styles.input}
        />
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>{t('partnerOnboarding.vatRegistered', null, 'VAT registered')}</Text>
          <Switch value={vatRegistered} onValueChange={(v) => setValues({ vat_registered: v })} />
        </View>
        {vatRegistered ? (
          <TextInput
            mode="outlined"
            label={t('partnerOnboarding.vatNumber', null, 'VAT number')}
            value={values.vat_number || ''}
            onChangeText={(v) => setValues({ vat_number: v })}
            style={styles.input}
          />
        ) : (
          <TextInput
            mode="outlined"
            label={t('partnerOnboarding.eikNumber', null, 'Company ID (EIK)')}
            value={values.eik_number || ''}
            onChangeText={(v) => setValues({ eik_number: v })}
            style={styles.input}
          />
        )}
        <TextInput
          mode="outlined"
          label={t('partnerOnboarding.invoiceAddress', null, 'Invoice address')}
          value={values.invoice_address_line1 || ''}
          onChangeText={(v) => setValues({ invoice_address_line1: v })}
          style={styles.input}
        />
        <TextInput
          mode="outlined"
          label={t('partnerOnboarding.invoiceCity', null, 'Invoice city')}
          value={values.invoice_city || ''}
          onChangeText={(v) => setValues({ invoice_city: v })}
          style={styles.input}
        />
      </FloatingCard>
    </View>
  );
}

/* ----------------------------- Step: location ----------------------------- */

function ensureSelectedRow(list, selectedId, selectedName, fallbackLabel) {
  const rows = Array.isArray(list) ? list : [];
  if (selectedId == null || selectedId === '') return rows;
  if (rows.some((row) => Number(row.id) === Number(selectedId))) return rows;
  return [{ id: selectedId, name: selectedName || fallbackLabel }, ...rows];
}

function syncPhoneFields(patch) {
  const prefix = patch.phone_country_code;
  const national = patch.phone_national;
  if (prefix == null && national == null) return patch;
  const e164 = buildE164Phone(
    prefix != null ? prefix : '',
    national != null ? national : ''
  );
  return {
    ...patch,
    phone_e164: e164,
    phone: e164 || [prefix, national].filter(Boolean).join(' ').trim(),
  };
}

export function PartnerLocationStep() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const route = useRoute();
  const { values, setValues } = useWizard();
  const [countries, setCountries] = useState([]);
  const [cities, setCities] = useState([]);
  const [resolvingMapLocation, setResolvingMapLocation] = useState(false);
  const mapPickHandledRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rows = await getCountries();
        if (cancelled) return;
        setCountries(
          ensureSelectedRow(
            Array.isArray(rows) ? rows : [],
            values.country,
            values.country_name,
            t('partnerOnboarding.selectedCountry', null, 'Selected country')
          )
        );
      } catch {
        // Country list is best-effort; map reverse-geocode can still fill IDs.
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once; seed selection from initial values
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (values.country == null || values.country === '') {
        setCities([]);
        return;
      }
      try {
        const rows = await getCitiesForCountry(values.country);
        if (cancelled) return;
        const countryRow = countries.find((c) => Number(c.id) === Number(values.country));
        const sorted = sortCitiesForPicker(
          Array.isArray(rows) ? rows : [],
          countryRow?.name || values.country_name
        );
        setCities(
          ensureSelectedRow(
            sorted,
            values.city,
            values.city_name,
            t('partnerOnboarding.selectedCity', null, 'Selected city')
          )
        );
      } catch {
        if (!cancelled) setCities([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [values.country, values.city, values.city_name, values.country_name, countries, t]);

  const applyMapPick = useCallback(
    async (pick) => {
      const lat = Number(pick?.latitude);
      const lon = Number(pick?.longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;

      const roundedLat = roundCoordinateForApi(lat);
      const roundedLon = roundCoordinateForApi(lon);
      setValues({ latitude: roundedLat, longitude: roundedLon });
      setResolvingMapLocation(true);

      try {
        let countryRows = countries;
        if (!countryRows.length) {
          const fetched = await getCountries().catch(() => []);
          countryRows = Array.isArray(fetched) ? fetched : [];
          if (countryRows.length) setCountries(countryRows);
        }

        const resolved = await resolveCountryCityFromCoords({
          latitude: lat,
          longitude: lon,
          countries: countryRows,
          getCitiesForCountry,
        });

        const patch = {
          latitude: roundedLat,
          longitude: roundedLon,
        };
        if (resolved?.addressHint) {
          patch.address = dedupeRepeatedAddressText(resolved.addressHint);
        }
        if (resolved?.postalCode) patch.postal_code = resolved.postalCode;
        if (resolved?.countryId != null) {
          patch.country = resolved.countryId;
          const countryRow = countryRows.find(
            (c) => Number(c.id) === Number(resolved.countryId)
          );
          if (countryRow?.name) patch.country_name = countryRow.name;
          const prefix = dialPrefixForCountry(countryRow);
          if (prefix && !String(values.phone_country_code || '').trim()) {
            Object.assign(patch, syncPhoneFields({
              phone_country_code: prefix,
              phone_national: values.phone_national || '',
            }));
          }
        }
        if (resolved?.cityId != null) {
          patch.city = resolved.cityId;
        }

        setValues(patch);

        if (resolved?.countryId) {
          const cityList = Array.isArray(resolved.cities)
            ? resolved.cities
            : await getCitiesForCountry(resolved.countryId);
          const countryRow = countryRows.find(
            (c) => Number(c.id) === Number(resolved.countryId)
          );
          setCities(
            ensureSelectedRow(
              sortCitiesForPicker(Array.isArray(cityList) ? cityList : [], countryRow?.name),
              resolved.cityId,
              null,
              t('partnerOnboarding.selectedCity', null, 'Selected city')
            )
          );
        }
      } catch (e) {
        console.warn('Partner location: could not resolve map pin', e);
      } finally {
        setResolvingMapLocation(false);
      }
    },
    [countries, setValues, t, values.phone_country_code, values.phone_national]
  );

  // MapLocationPicker returns { mapPick: { latitude, longitude } } (same as Profile).
  useEffect(() => {
    const pick = route?.params?.mapPick;
    if (!pick) return;
    const pickKey = `${pick.latitude},${pick.longitude}`;
    if (mapPickHandledRef.current === pickKey) return;
    mapPickHandledRef.current = pickKey;

    let cancelled = false;
    (async () => {
      await applyMapPick(pick);
      if (!cancelled) {
        navigation.setParams?.({ mapPick: undefined });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [route?.params?.mapPick, applyMapPick, navigation]);

  const handleCountryChange = async (value) => {
    const countryId = value === '' || value == null ? null : Number(value);
    const countryRow = countries.find((c) => Number(c.id) === Number(countryId));
    const prefix = dialPrefixForCountry(countryRow);
    const phonePatch = prefix
      ? syncPhoneFields({
          phone_country_code: prefix,
          phone_national: values.phone_national || '',
        })
      : {};
    setValues({
      country: countryId,
      country_name: countryRow?.name || '',
      city: null,
      city_name: '',
      ...phonePatch,
    });
    if (countryId == null) {
      setCities([]);
      return;
    }
    try {
      const cityList = await getCitiesForCountry(countryId);
      setCities(sortCitiesForPicker(Array.isArray(cityList) ? cityList : [], countryRow?.name));
    } catch {
      setCities([]);
    }
  };

  const hasPin =
    values.latitude != null &&
    values.longitude != null &&
    Number.isFinite(Number(values.latitude)) &&
    Number.isFinite(Number(values.longitude));

  const openMapPicker = () => {
    navigation.navigate('MapLocationPicker', {
      returnScreen: 'PartnerOnboarding',
      initialLatitude: values.latitude,
      initialLongitude: values.longitude,
    });
  };

  return (
    <View>
      <FloatingCard>
        <Text style={styles.cardTitle}>
          {t('partnerOnboarding.locationTitle', null, 'Where customers find you')}
        </Text>
        <Text style={styles.hint}>
          {t(
            'partnerOnboarding.locationHint',
            null,
            'Address and map pin power discovery, SEO, and incoming requests.'
          )}
        </Text>

        <Button mode="contained" icon="map-marker" onPress={openMapPicker} style={{ marginBottom: 8 }}>
          {hasPin
            ? t('partnerOnboarding.editMapPin', null, 'Edit map pin')
            : t('partnerOnboarding.setMapPin', null, 'Set map pin')}
        </Button>
        {hasPin ? (
          <Text style={[styles.hint, { marginBottom: 8 }]}>
            {t('partnerOnboarding.coordinates', null, 'Coordinates')}:{' '}
            {Number(values.latitude).toFixed(5)}, {Number(values.longitude).toFixed(5)}
            {resolvingMapLocation
              ? ` · ${t('partnerOnboarding.matchingCity', null, 'matching city…')}`
              : ''}
          </Text>
        ) : (
          <Text style={[styles.hint, { marginBottom: 8 }]}>
            {t(
              'partnerOnboarding.mapPinHint',
              null,
              'Drop a pin — we fill street, country, city, and phone prefix.'
            )}
          </Text>
        )}

        <View style={styles.coordinatesRow}>
          <TextInput
            mode="outlined"
            label={t('partnerOnboarding.latitude', null, 'Latitude')}
            value={values.latitude != null ? String(values.latitude) : ''}
            editable={false}
            style={[styles.input, styles.coordinatesInput]}
          />
          <TextInput
            mode="outlined"
            label={t('partnerOnboarding.longitude', null, 'Longitude')}
            value={values.longitude != null ? String(values.longitude) : ''}
            editable={false}
            style={[styles.input, styles.coordinatesInput]}
          />
        </View>

        <TextInput
          mode="outlined"
          label={t('partnerOnboarding.address', null, 'Street address')}
          value={values.address || ''}
          onChangeText={(v) => setValues({ address: v })}
          style={styles.input}
        />
        <TextInput
          mode="outlined"
          label={t('partnerOnboarding.postalCode', null, 'Postal code')}
          value={values.postal_code || ''}
          onChangeText={(v) => setValues({ postal_code: v })}
          style={styles.input}
        />

        <Text style={styles.fieldLabel}>{t('partnerOnboarding.country', null, 'Country')}</Text>
        <View style={styles.pickerWrap}>
          <Picker
            selectedValue={values.country != null ? Number(values.country) : null}
            onValueChange={handleCountryChange}
            style={styles.picker}
          >
            <Picker.Item
              label={t('partnerOnboarding.selectCountry', null, 'Select country…')}
              value={null}
            />
            {countries.map((c) => (
              <Picker.Item key={c.id} label={c.name} value={Number(c.id)} />
            ))}
          </Picker>
        </View>

        <Text style={styles.fieldLabel}>{t('partnerOnboarding.city', null, 'City')}</Text>
        <View style={styles.pickerWrap}>
          <Picker
            selectedValue={values.city != null ? Number(values.city) : null}
            onValueChange={(val) => {
              const cityId = val === '' || val == null ? null : Number(val);
              const cityRow = cities.find((c) => Number(c.id) === Number(cityId));
              setValues({ city: cityId, city_name: cityRow?.name || '' });
            }}
            style={styles.picker}
            enabled={values.country != null && values.country !== ''}
          >
            <Picker.Item
              label={
                values.country
                  ? t('partnerOnboarding.selectCity', null, 'Select city…')
                  : t('partnerOnboarding.chooseCountryFirst', null, 'Choose country first')
              }
              value={null}
            />
            {cities.map((c) => (
              <Picker.Item key={c.id} label={c.name} value={Number(c.id)} />
            ))}
          </Picker>
        </View>

        <TextInput
          mode="outlined"
          label={t('partnerOnboarding.phonePrefix', null, 'Country prefix')}
          value={values.phone_country_code || ''}
          onChangeText={(text) =>
            setValues(
              syncPhoneFields({
                phone_country_code: text,
                phone_national: values.phone_national || '',
              })
            )
          }
          style={styles.input}
          keyboardType="phone-pad"
          placeholder="+359"
        />
        <TextInput
          mode="outlined"
          label={t('partnerOnboarding.phoneNational', null, 'Phone number')}
          value={values.phone_national || ''}
          onChangeText={(text) =>
            setValues(
              syncPhoneFields({
                phone_country_code: values.phone_country_code || '',
                phone_national: text,
              })
            )
          }
          style={styles.input}
          keyboardType="phone-pad"
          placeholder="888123456"
        />
      </FloatingCard>
    </View>
  );
}

/* ------------------------------ Step: prices ------------------------------ */

export function PartnerPricesStep() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const { values, context } = useWizard();
  const completion = context.getCompletion ? context.getCompletion() : null;
  const pricesSection = (completion?.sections || []).find((s) => s.key === 'prices');
  const priced = pricesSection?.complete;
  const opCount = (values.available_repairs || []).length;

  return (
    <View>
      <FloatingCard>
        <Text style={styles.cardTitle}>
          {t('partnerOnboarding.pricesTitle', null, 'Publish your prices')}
        </Text>
        <Text style={styles.hint}>
          {t(
            'partnerOnboarding.pricesHint',
            null,
            'Customers need at least one published operation price before your profile can go live.'
          )}
        </Text>
        <Text style={styles.readinessLead}>
          {opCount
            ? t('partnerOnboarding.pricesSelectedOps', { count: opCount }, `${opCount} operations selected`)
            : t('partnerOnboarding.pricesNoOps', null, 'Select operations in the Services step first.')}
        </Text>
        <Text style={[styles.sectionStatus, priced ? styles.statusDone : styles.statusTodo, { marginTop: 8 }]}>
          {priced
            ? t('partnerOnboarding.pricesReady', null, 'At least one price is published')
            : t('partnerOnboarding.pricesMissing', null, 'No published prices yet')}
        </Text>
        <Button
          mode="contained"
          icon="currency-usd"
          style={{ marginTop: 12 }}
          onPress={() => navigation.navigate('ShopServiceMenu')}
          disabled={!opCount}
        >
          {t('partnerOnboarding.openPriceList', null, 'Open price list')}
        </Button>
      </FloatingCard>
    </View>
  );
}

/* ------------------------------ Step: photos ------------------------------ */

export function PartnerPhotosStep() {
  const { t } = useTranslation();
  const { values, setValues, context } = useWizard();
  const [uploading, setUploading] = useState(false);
  const images = Array.isArray(values.images) ? values.images : [];
  const profileId = values.profileId;

  const syncImagesFromProfile = async () => {
    if (typeof context.refreshProfile === 'function') {
      const profile = await context.refreshProfile();
      if (profile) {
        setValues({ images: Array.isArray(profile.images) ? profile.images : [] });
        return;
      }
    }
  };

  const handleAddPhoto = async () => {
    if (!profileId) return;
    try {
      if (images.length >= MAX_SHOP_PHOTOS) {
        Alert.alert(
          t('partnerOnboarding.photosLimitTitle', null, 'Photo limit'),
          t(
            'partnerOnboarding.photosLimitBody',
            { max: MAX_SHOP_PHOTOS },
            `You can upload up to ${MAX_SHOP_PHOTOS} photos.`
          )
        );
        return;
      }

      let uri = null;
      let file = null;
      if (Platform.OS === 'web') {
        const attachment = await pickVehiclePhotoAttachment();
        if (!attachment) return;
        uri = attachment.uri;
        file = attachment.file;
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            t('partnerOnboarding.photosPermissionTitle', null, 'Permission required'),
            t('partnerOnboarding.photosPermissionBody', null, 'Allow access to photos to upload.')
          );
          return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          quality: 0.7,
        });
        if (result.canceled || !result.assets.length) return;
        uri = result.assets[0].uri;
      }

      const token = await AsyncStorage.getItem('@access_token');
      if (!token) {
        Alert.alert(
          t('common.error', null, 'Error'),
          t('partnerOnboarding.notLoggedIn', null, 'You are not logged in.')
        );
        return;
      }

      setUploading(true);
      await uploadShopImage(profileId, token, uri, file);
      await syncImagesFromProfile();
    } catch (err) {
      Alert.alert(
        t('common.error', null, 'Error'),
        err?.message || t('partnerOnboarding.photosUploadFailed', null, 'Upload failed')
      );
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteImage = async (imageId) => {
    if (!profileId || imageId == null) return;
    try {
      const token = await AsyncStorage.getItem('@access_token');
      if (!token) return;
      setUploading(true);
      await deleteShopImage(profileId, imageId, token);
      await syncImagesFromProfile();
    } catch (err) {
      Alert.alert(
        t('common.error', null, 'Error'),
        err?.message || t('partnerOnboarding.photosDeleteFailed', null, 'Delete failed')
      );
    } finally {
      setUploading(false);
    }
  };

  const handleReorderImages = (nextImages) => {
    setValues({ images: nextImages });
  };

  return (
    <View>
      <FloatingCard>
        <Text style={styles.cardTitle}>
          {t('partnerOnboarding.photosTitle', null, 'Photos (optional)')}
        </Text>
        <Text style={styles.hint}>
          {t(
            'partnerOnboarding.photosHint',
            null,
            'A logo or shop photo builds trust. You can skip and add these later.'
          )}
        </Text>
        <ShopPhotoGallery
          images={images}
          onDelete={handleDeleteImage}
          onReorder={handleReorderImages}
          onAddPhoto={handleAddPhoto}
          maxPhotos={MAX_SHOP_PHOTOS}
          uploading={uploading}
        />
      </FloatingCard>
    </View>
  );
}

/* ------------------------------ Step: about ------------------------------- */

export function PartnerAboutStep() {
  const { t } = useTranslation();
  const { values, setValues } = useWizard();

  return (
    <View>
      <FloatingCard>
        <Text style={styles.cardTitle}>
          {t('partnerOnboarding.aboutTitle', null, 'About your business')}
        </Text>
        <Text style={styles.hint}>
          {t(
            'partnerOnboarding.aboutHint',
            null,
            'A short description helps customers choose you. Optional for publish.'
          )}
        </Text>
        <TextInput
          mode="outlined"
          label={t('partnerOnboarding.shortDescription', null, 'Short tagline')}
          value={values.short_description || ''}
          onChangeText={(v) => setValues({ short_description: v })}
          style={styles.input}
        />
        <TextInput
          mode="outlined"
          label={t('partnerOnboarding.description', null, 'Description')}
          value={values.description || ''}
          onChangeText={(v) => setValues({ description: v })}
          style={styles.input}
          multiline
          numberOfLines={5}
        />
      </FloatingCard>
    </View>
  );
}

/* ----------------------------- Step: preview ------------------------------ */

export function PartnerPreviewStep() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const { values, context } = useWizard();
  const completion = context.getCompletion ? context.getCompletion() : null;

  const vehicleTypeNames = useMemo(() => {
    const selected = new Set((values.supported_vehicle_types || []).map(Number));
    return (context.vehicleTypes || [])
      .filter((vt) => selected.has(Number(vt.id)))
      .map((vt) => translateVehicleTypeLabel(vt, t));
  }, [context.vehicleTypes, values.supported_vehicle_types, t]);

  const repairTypeNames = useMemo(() => {
    const selected = new Set((values.available_repairs || []).map(Number));
    return (context.repairTypes || [])
      .filter((rt) => selected.has(Number(rt.id)))
      .map((rt) => translateRepairTypeLabel(rt, t));
  }, [context.repairTypes, values.available_repairs, t]);

  const previewShop = useMemo(
    () => ({
      id: values.profileId,
      name: values.name,
      public_slug: values.public_slug,
      slug: values.public_slug,
      is_fallback_public_slug: values.is_fallback_public_slug,
    }),
    [values.profileId, values.name, values.public_slug, values.is_fallback_public_slug]
  );

  return (
    <View>
      <FloatingCard>
        <Text style={styles.cardTitle}>
          {t('partnerOnboarding.previewTitle', null, 'Public preview')}
        </Text>
        <Text style={styles.hint}>
          {t(
            'partnerOnboarding.previewHint',
            null,
            'One preview of how customers will see your service center.'
          )}
        </Text>
        <Text style={styles.readinessLead}>{values.name || '—'}</Text>
        <Text style={styles.hint}>
          {values.address || t('partnerOnboarding.previewNoAddress', null, 'Address not set')}
        </Text>
        <Text style={[styles.hint, { marginTop: 4 }]}>
          {t(
            'partnerOnboarding.previewCompletion',
            { percent: completion?.percent ?? 0 },
            `${completion?.percent ?? 0}% complete`
          )}
        </Text>
        <ShopViewPublicProfileButton
          shop={previewShop}
          navigation={navigation}
          returnTo="PartnerOnboarding"
          backLabelKey="partnerOnboarding.title"
          compact
        />
        <ShopPublicPreviewTabs
          shopName={formatShopDisplayName(values.name)}
          vehicleTypeNames={vehicleTypeNames}
          repairTypeNames={repairTypeNames}
          address={values.address}
          cityName={values.city_name || ''}
          countryName={values.country_name || ''}
          googleMapsUrl={values.google_maps_url}
          latitude={values.latitude}
          longitude={values.longitude}
          phone={values.phone}
          generatedSummary=""
          userDescription={values.description}
          workingHours={values.working_hours}
          publishedMenuItems={[]}
          offersGuarantee={values.offers_guarantee === true}
          images={values.images}
          brandNames={[]}
        />
      </FloatingCard>
    </View>
  );
}

/* ----------------------------- Step: publish ------------------------------ */

const SECTION_LABEL_KEYS = {
  business: 'partnerOnboarding.section.business',
  location: 'partnerOnboarding.section.location',
  vehicles: 'partnerOnboarding.section.vehicles',
  services: 'partnerOnboarding.section.services',
  prices: 'partnerOnboarding.section.prices',
  hours: 'partnerOnboarding.section.hours',
  photos: 'partnerOnboarding.section.photos',
  about: 'partnerOnboarding.section.about',
  legal: 'partnerOnboarding.section.legal',
};

const SECTION_TO_STEP_ID = {
  business: 'business',
  location: 'location',
  vehicles: 'vehicles',
  services: 'services',
  prices: 'prices',
  hours: 'hours',
  photos: 'photos',
  about: 'about',
  legal: 'legal',
};

export function PartnerPublishStep() {
  const { t } = useTranslation();
  const { context, progress, progressPercent, goTo, findStepIndexById } = useWizard();
  const completion = context.getCompletion ? context.getCompletion() : null;
  const sections = completion?.step_states || completion?.sections || [];
  const readyToPublish = completion?.ready_to_publish;

  const handleSectionPress = (section) => {
    if (section.complete) return;
    const stepId = SECTION_TO_STEP_ID[section.key];
    if (!stepId) return;
    const idx = findStepIndexById(stepId);
    if (idx >= 0) goTo(idx);
  };

  return (
    <View>
      <FloatingCard>
        <Text style={styles.cardTitle}>{t('partnerOnboarding.publishTitle', null, 'Publish checklist')}</Text>
        <View style={styles.readinessHeader}>
          <Text style={styles.percentBig}>{completion?.percent ?? progressPercent}%</Text>
          <Text style={styles.readinessLead}>
            {readyToPublish
              ? t('partnerOnboarding.readyToPublish', null, 'Your profile is ready to publish.')
              : t('partnerOnboarding.notReady', null, 'A few things are left before you can publish.')}
          </Text>
        </View>
        <ProgressBar
          progress={completion ? completion.score : progress}
          color={COLORS.PRIMARY}
          style={styles.progressBar}
        />
      </FloatingCard>

      <FloatingCard>
        <Text style={styles.cardTitle}>{t('partnerOnboarding.checklist', null, 'Setup checklist')}</Text>
        <ScrollView>
          {sections.map((section) => {
            const actionable = !section.complete;
            return (
              <Pressable
                key={section.key}
                onPress={() => handleSectionPress(section)}
                disabled={!actionable}
                style={styles.sectionRow}
              >
                <Text style={[styles.sectionDot, section.complete ? styles.dotDone : styles.dotTodo]}>
                  {section.complete ? '✓' : '•'}
                </Text>
                <Text style={styles.sectionLabel}>
                  {t(SECTION_LABEL_KEYS[section.key] || '', null, section.key)}
                </Text>
                <Text
                  style={[
                    styles.sectionStatus,
                    section.complete ? styles.statusDone : styles.statusTodo,
                  ]}
                >
                  {section.complete
                    ? t('partnerOnboarding.done', null, 'Done')
                    : t('partnerOnboarding.fix', null, 'Fix')}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
        <Text style={styles.hint}>
          {readyToPublish
            ? t('partnerOnboarding.publishReadyHint', null, 'Finish to open your profile dashboard.')
            : t('partnerOnboarding.publishMissingHint', null, 'Tap a missing item to jump to its wizard step.')}
        </Text>
      </FloatingCard>
    </View>
  );
}

/** @deprecated Prefer PartnerPublishStep — kept for older imports. */
export function PartnerReadinessStep() {
  return <PartnerPublishStep />;
}

const styles = StyleSheet.create({
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.TEXT_DARK,
    marginBottom: 6,
  },
  hint: {
    fontSize: 13,
    color: COLORS.TEXT_MUTED,
    marginBottom: 10,
  },
  input: {
    marginBottom: 4,
    backgroundColor: '#fff',
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.TEXT_DARK,
    marginTop: 6,
    marginBottom: 4,
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
    width: '100%',
    color: COLORS.TEXT_DARK,
  },
  coordinatesRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  coordinatesInput: {
    flex: 1,
    minWidth: Platform.OS === 'web' ? 220 : 140,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.16)',
    backgroundColor: '#fff',
    marginRight: 8,
    marginBottom: 8,
  },
  chipActive: {
    backgroundColor: COLORS.PRIMARY,
    borderColor: COLORS.PRIMARY,
  },
  chipText: {
    color: COLORS.TEXT_DARK,
    fontWeight: '600',
    fontSize: 13,
  },
  chipTextActive: {
    color: '#fff',
  },
  readinessHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  percentBig: {
    fontSize: 34,
    fontWeight: '800',
    color: COLORS.PRIMARY,
    marginRight: 12,
  },
  readinessLead: {
    flex: 1,
    fontSize: 14,
    color: COLORS.TEXT_DARK,
    fontWeight: '600',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(15,23,42,0.08)',
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(15,23,42,0.08)',
  },
  sectionDot: {
    width: 22,
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  dotDone: { color: '#16A34A' },
  dotTodo: { color: COLORS.TEXT_MUTED },
  sectionLabel: {
    flex: 1,
    fontSize: 14,
    color: COLORS.TEXT_DARK,
    fontWeight: '600',
    marginLeft: 6,
  },
  sectionStatus: {
    fontSize: 12,
    fontWeight: '700',
  },
  statusDone: { color: '#16A34A' },
  statusTodo: { color: COLORS.PRIMARY, fontWeight: '800' },
  readinessCta: {
    marginTop: 12,
    borderRadius: 12,
  },
  hoursQuickBtn: {
    alignSelf: 'flex-start',
    marginBottom: 12,
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
    paddingHorizontal: 12,
    paddingVertical: 8,
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
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginVertical: 8,
  },
  switchLabel: {
    color: COLORS.TEXT_DARK,
    fontWeight: '600',
    fontSize: 14,
  },
});
