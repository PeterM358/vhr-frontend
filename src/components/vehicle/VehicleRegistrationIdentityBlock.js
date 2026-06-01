import React, { useMemo, useState } from 'react';
import {
  View,
  Pressable,
  StyleSheet,
  Platform,
  Modal,
  KeyboardAvoidingView,
} from 'react-native';
import { Text, Button, ActivityIndicator } from 'react-native-paper';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { COLORS } from '../../constants/colors';
import WebDateInput from './WebDateInput';
import {
  parseIsoToLocalDate,
  localDateToIso,
  registrationDatePickerPlaceholder,
  isoToDisplayDate,
} from './dateFieldUtils';
import { profileCountriesToPickerOptions } from './vehicleFormConfig';

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
  /** When true and date is set, first registration date is read-only (fill once). */
  lockFirstRegistrationDate = false,
}) {
  const [dateModalOpen, setDateModalOpen] = useState(false);
  const [countryModalOpen, setCountryModalOpen] = useState(false);
  const [androidDateOpen, setAndroidDateOpen] = useState(false);
  const [draftDate, setDraftDate] = useState(firstRegistrationIso || '');

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
      {!hideHint ? (
        <Text style={styles.hintMuted}>
          Optional. Not filled from VIN or plate yet. Country can be updated if the vehicle is registered elsewhere later.
        </Text>
      ) : null}
      <Text style={styles.fieldLabel}>First registration</Text>
      {dateLocked ? (
        <Text style={styles.rowValue}>{dateSummary}</Text>
      ) : (
        <WebDateInput
          value={firstRegistrationIso || ''}
          onChange={onChangeFirstRegistrationIso}
          style={disabled ? { opacity: 0.6 } : undefined}
        />
      )}
      <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Registration country</Text>
      {renderCountryPickerInline()}
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
      {!hideHint ? (
        <Text style={styles.hintMuted}>
          Optional. Add first registration if you skipped it at create. You can change country later (e.g. if the vehicle was registered abroad).
          {dateLocked ? ' First registration date cannot be changed after it is saved.' : ''}
        </Text>
      ) : null}

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
          onChange={(event, d) => {
            setAndroidDateOpen(false);
            if (event.type === 'set' && d) {
              onChangeFirstRegistrationIso(localDateToIso(d));
            }
          }}
        />
      ) : null}

      <Modal visible={dateModalOpen} transparent animationType="slide" onRequestClose={() => setDateModalOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setDateModalOpen(false)}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
              <Text style={styles.modalTitle}>First registration</Text>
              <DateTimePicker
                value={pickerDate}
                mode="date"
                display="spinner"
                onChange={(_e, d) => {
                  if (d) setDraftDate(localDateToIso(d));
                }}
                style={styles.modalPicker}
              />
              <View style={styles.modalActions}>
                <Button mode="text" onPress={() => onChangeFirstRegistrationIso('')}>
                  Clear
                </Button>
                <Button mode="text" onPress={() => setDateModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  mode="contained"
                  onPress={() => {
                    onChangeFirstRegistrationIso(draftDate || '');
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
