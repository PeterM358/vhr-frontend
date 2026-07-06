import React, { useMemo, useState } from 'react';
import {
  View,
  Pressable,
  StyleSheet,
  Platform,
  Modal,
  KeyboardAvoidingView,
  Alert,
} from 'react-native';
import { Text, Button, ActivityIndicator } from 'react-native-paper';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import * as Location from 'expo-location';
import { COLORS } from '../../constants/colors';
import WebDateInput from './WebDateInput';
import {
  parseIsoToLocalDate,
  localDateToIso,
  registrationDatePickerPlaceholder,
  isoToDisplayDate,
  normalizeRegistrationDateForApi,
  currentMonthIsoMax,
} from './dateFieldUtils';
import { profileCountriesToPickerOptions } from './vehicleFormConfig';
import { getWebGeolocation } from '../../utils/webGeolocation';
import { reverseGeocodeLatLon } from '../../utils/reverseGeocodeLocation';

function countryLabelForIso(iso, options) {
  const code = String(iso || '').trim().toUpperCase();
  if (!code) return '';
  const hit = (options || []).find((o) => o.value === code);
  return hit?.label || code;
}

/**
 * First registration date + registration country (ISO2).
 * Native: compact rows + modal pickers (no always-visible spinners).
 */
export default function VehicleRegistrationIdentityBlock({
  firstRegistrationIso,
  onChangeFirstRegistrationIso,
  registrationCountryIso,
  onChangeRegistrationCountryIso,
  countriesState,
  onRetryCountries,
  disabled = false,
  hideTitle = false,
  hideHint = false,
  /** When true, only render registration country (date handled elsewhere). */
  countryOnly = false,
  /** When true and date is set, first registration date is read-only (fill once). */
  lockFirstRegistrationDate = false,
}) {
  const [dateModalOpen, setDateModalOpen] = useState(false);
  const [countryModalOpen, setCountryModalOpen] = useState(false);
  const [androidDateOpen, setAndroidDateOpen] = useState(false);
  const [draftDate, setDraftDate] = useState(firstRegistrationIso || '');
  const [locating, setLocating] = useState(false);

  const monthValueForWeb = useMemo(() => {
    const raw = String(firstRegistrationIso || '').trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      return raw.slice(0, 7);
    }
    if (/^\d{4}-\d{2}$/.test(raw)) {
      return raw;
    }
    return '';
  }, [firstRegistrationIso]);

  const handleRegistrationDateChange = (value) => {
    onChangeFirstRegistrationIso(normalizeRegistrationDateForApi(value) || value);
  };

  const handleLocateRegistrationCountry = async () => {
    if (disabled || locating) return;
    setLocating(true);
    try {
      let latitude;
      let longitude;
      if (Platform.OS === 'web') {
        const coords = await getWebGeolocation();
        latitude = coords.latitude;
        longitude = coords.longitude;
      } else {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Location', 'Allow location access to detect your country.');
          return;
        }
        const loc = await Location.getCurrentPositionAsync({});
        latitude = loc.coords.latitude;
        longitude = loc.coords.longitude;
      }
      const geo = await reverseGeocodeLatLon(latitude, longitude);
      const iso = String(geo?.countryIso || '').trim().toUpperCase();
      if (!iso) {
        Alert.alert('Location', 'Could not determine your country from location.');
        return;
      }
      onChangeRegistrationCountryIso(iso);
    } catch (error) {
      Alert.alert('Location', error?.message || 'Could not get your location.');
    } finally {
      setLocating(false);
    }
  };

  const options = profileCountriesToPickerOptions(countriesState.rows || []);
  const countryLabel = countryLabelForIso(registrationCountryIso, options);
  const dateLocked = lockFirstRegistrationDate && !!String(firstRegistrationIso || '').trim();
  const dateSummary = firstRegistrationIso
    ? isoToDisplayDate(firstRegistrationIso) || firstRegistrationIso
    : 'Not set';

  const pickerDate = useMemo(() => {
    const iso = draftDate || firstRegistrationIso || '';
    return parseIsoToLocalDate(iso) || registrationDatePickerPlaceholder();
  }, [draftDate, firstRegistrationIso]);

  const openDateEditor = () => {
    if (disabled || dateLocked) return;
    setDraftDate(firstRegistrationIso || '');
    if (Platform.OS === 'android') {
      setAndroidDateOpen(true);
      return;
    }
    setDateModalOpen(true);
  };

  const openCountryEditor = () => {
    if (disabled) return;
    setCountryModalOpen(true);
  };

  const renderWebFields = () => (
    <>
      {!countryOnly && !hideHint ? (
        <Text style={styles.hintMuted}>
          Optional. Month and year when the vehicle was first registered. Country can be updated later.
        </Text>
      ) : null}
      {!countryOnly ? (
        <>
          <Text style={styles.fieldLabel}>First registration</Text>
          {dateLocked ? (
            <Text style={styles.rowValue}>{dateSummary}</Text>
          ) : (
            <WebDateInput
              value={monthValueForWeb}
              onChange={handleRegistrationDateChange}
              inputType="month"
              max={currentMonthIsoMax()}
              min="1980-01"
              style={disabled ? { opacity: 0.6 } : undefined}
            />
          )}
        </>
      ) : null}
      <Text style={[styles.fieldLabel, { marginTop: countryOnly ? 0 : 12 }]}>Registration country</Text>
      <View style={styles.countryRow}>
        <View style={styles.countryPickerFlex}>{renderCountryPickerInline()}</View>
        <Button
          mode="outlined"
          compact
          icon="crosshairs-gps"
          loading={locating}
          disabled={disabled || locating}
          onPress={handleLocateRegistrationCountry}
          style={styles.locateBtn}
        >
          Locate me
        </Button>
      </View>
    </>
  );

  const renderCountryPickerInline = () => {
    if (countriesState.status === 'loading') {
      return <ActivityIndicator animating style={styles.spinner} />;
    }
    if (countriesState.status === 'error') {
      return (
        <View>
          <Text style={styles.helperMuted}>{countriesState.error || 'Could not load countries.'}</Text>
          {onRetryCountries ? (
            <Button mode="outlined" compact onPress={onRetryCountries} style={styles.retry}>
              Retry
            </Button>
          ) : null}
        </View>
      );
    }
    if (!options.length) {
      return <Text style={styles.helperMuted}>No countries available.</Text>;
    }
    return (
      <View style={styles.pickerBox}>
        <Picker
          enabled={!disabled}
          selectedValue={registrationCountryIso || ''}
          onValueChange={(v) => onChangeRegistrationCountryIso(v)}
          style={styles.picker}
        >
          <Picker.Item label="— Not set —" value="" />
          {options.map((o) => (
            <Picker.Item key={o.value} label={o.label} value={o.value} />
          ))}
        </Picker>
      </View>
    );
  };

  const renderCompactRows = () => (
    <>
      {!countryOnly && !hideHint ? (
        <Text style={styles.hintMuted}>
          Optional. Add first registration if you skipped it at create. You can change country later (e.g. if the vehicle was registered abroad).
          {dateLocked ? ' First registration date cannot be changed after it is saved.' : ''}
        </Text>
      ) : null}

      {!countryOnly ? (
      <Pressable
        onPress={openDateEditor}
        disabled={disabled || dateLocked}
        style={({ pressed }) => [
          styles.compactRow,
          pressed && !dateLocked ? styles.compactRowPressed : null,
          dateLocked ? styles.compactRowDisabled : null,
        ]}
      >
        <View style={styles.compactRowMain}>
          <Text style={styles.compactRowLabel}>First registration</Text>
          <Text style={styles.compactRowValue}>{dateSummary}</Text>
        </View>
        {!dateLocked ? (
          <MaterialCommunityIcons name="chevron-right" size={22} color={COLORS.TEXT_MUTED} />
        ) : null}
      </Pressable>
      ) : null}

      <Pressable
        onPress={openCountryEditor}
        disabled={disabled}
        style={({ pressed }) => [styles.compactRow, pressed && styles.compactRowPressed]}
      >
        <View style={styles.compactRowMain}>
          <Text style={styles.compactRowLabel}>Registration country</Text>
          <Text style={styles.compactRowValue}>{countryLabel || 'Not set'}</Text>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={22} color={COLORS.TEXT_MUTED} />
      </Pressable>

      {androidDateOpen ? (
        <DateTimePicker
          value={pickerDate}
          mode="date"
          display="default"
          maximumDate={new Date()}
          minimumDate={new Date(1980, 0, 1)}
          onChange={(event, d) => {
            setAndroidDateOpen(false);
            if (event.type === 'set' && d) {
              handleRegistrationDateChange(localDateToIso(d));
            }
          }}
        />
      ) : null}

      <Modal visible={dateModalOpen} transparent animationType="slide" onRequestClose={() => setDateModalOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setDateModalOpen(false)}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
              <Text style={styles.modalTitle}>First registration</Text>
              <Text style={styles.modalHint}>Pick the month and year the vehicle was first registered.</Text>
              <DateTimePicker
                value={pickerDate}
                mode="date"
                display="spinner"
                maximumDate={new Date()}
                minimumDate={new Date(1980, 0, 1)}
                onChange={(_e, d) => {
                  if (d) setDraftDate(localDateToIso(d));
                }}
                style={styles.modalPicker}
              />
              <View style={styles.modalActions}>
                <Button mode="text" onPress={() => handleRegistrationDateChange('')}>
                  Clear
                </Button>
                <Button mode="text" onPress={() => setDateModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  mode="contained"
                  onPress={() => {
                    handleRegistrationDateChange(draftDate || '');
                    setDateModalOpen(false);
                  }}
                >
                  Done
                </Button>
              </View>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>

      <Modal
        visible={countryModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setCountryModalOpen(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setCountryModalOpen(false)}>
          <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Registration country</Text>
            {countriesState.status === 'loading' ? (
              <ActivityIndicator animating style={styles.spinner} />
            ) : countriesState.status === 'error' ? (
              <>
                <Text style={styles.helperMuted}>{countriesState.error}</Text>
                {onRetryCountries ? (
                  <Button mode="outlined" onPress={onRetryCountries}>
                    Retry
                  </Button>
                ) : null}
              </>
            ) : (
              <View style={styles.modalPickerBox}>
                <Picker
                  selectedValue={registrationCountryIso || ''}
                  onValueChange={(v) => onChangeRegistrationCountryIso(v)}
                  style={styles.modalPickerWheel}
                >
                  <Picker.Item label="— Not set —" value="" />
                  {options.map((o) => (
                    <Picker.Item key={o.value} label={o.label} value={o.value} />
                  ))}
                </Picker>
              </View>
            )}
            <Button mode="contained" onPress={() => setCountryModalOpen(false)} style={styles.modalDone}>
              Done
            </Button>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );

  return (
    <View style={styles.wrap}>
      {!hideTitle ? <Text style={styles.cardTitle}>Registration</Text> : null}
      {Platform.OS === 'web' ? renderWebFields() : renderCompactRows()}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 4,
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.TEXT_DARK,
    marginBottom: 6,
  },
  hintMuted: {
    fontSize: 12,
    color: COLORS.TEXT_MUTED,
    marginBottom: 10,
    lineHeight: 17,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.TEXT_MUTED,
    marginBottom: 4,
  },
  compactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.1)',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  compactRowPressed: {
    backgroundColor: 'rgba(59,130,246,0.06)',
  },
  compactRowDisabled: {
    opacity: 0.85,
  },
  compactRowMain: {
    flex: 1,
  },
  compactRowLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.TEXT_MUTED,
    marginBottom: 2,
  },
  compactRowValue: {
    fontSize: 15,
    color: COLORS.TEXT_DARK,
    fontWeight: '500',
  },
  rowValue: {
    fontSize: 15,
    color: COLORS.TEXT_DARK,
    marginBottom: 4,
  },
  pickerBox: {
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.12)',
    borderRadius: 8,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  picker: {
    width: '100%',
  },
  helperMuted: {
    fontSize: 13,
    color: COLORS.TEXT_MUTED,
  },
  retry: {
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  spinner: {
    alignSelf: 'center',
    marginVertical: 12,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.TEXT_DARK,
    marginBottom: 8,
    textAlign: 'center',
  },
  modalHint: {
    fontSize: 13,
    color: COLORS.TEXT_MUTED,
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 18,
  },
  countryRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  countryPickerFlex: {
    flex: 1,
    minWidth: 0,
  },
  locateBtn: {
    marginTop: 0,
    alignSelf: 'center',
  },
  modalPicker: {
    alignSelf: 'stretch',
  },
  modalPickerBox: {
    height: 220,
    overflow: 'hidden',
  },
  modalPickerWheel: {
    width: '100%',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  modalDone: {
    marginTop: 12,
  },
});
