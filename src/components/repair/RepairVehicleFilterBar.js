import React, { useEffect, useMemo, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { Picker } from '@react-native-picker/picker';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { API_BASE_URL } from '../../api/config';
import { getMakes, getModelsForMake } from '../../api/vehicles';
import { COLORS } from '../../constants/colors';

const ANY = '';

function buildDescendingYears(startYear, endYear) {
  const end = endYear || new Date().getFullYear();
  const start = startYear || 1980;
  const years = [];
  for (let y = end; y >= start; y -= 1) {
    years.push(y);
  }
  return years;
}

function formatModelCatalogYears(model) {
  const from = model?.production_year_from;
  const to = model?.production_year_to;
  if (from && to) return `${from}–${to}`;
  if (from) return `from ${from}`;
  if (to) return `until ${to}`;
  return null;
}

function modelPickerLabel(model) {
  const range = formatModelCatalogYears(model);
  return range ? `${model.name} (catalog ${range})` : model.name;
}

export default function RepairVehicleFilterBar({ value, onChange, statusTab = 'open' }) {
  const {
    makeId = ANY,
    modelId = ANY,
    vehicleYear = ANY,
    serviceYear = ANY,
    repairTypeId = ANY,
  } = value || {};

  const [makes, setMakes] = useState([]);
  const [models, setModels] = useState([]);
  const [repairTypes, setRepairTypes] = useState([]);
  const [modelsLoading, setModelsLoading] = useState(false);

  const registrationYearOptions = useMemo(
    () => buildDescendingYears(1980, new Date().getFullYear()),
    []
  );
  const serviceYearOptions = useMemo(
    () => buildDescendingYears(1990, new Date().getFullYear()),
    []
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [makeRows, token] = await Promise.all([
          getMakes(),
          AsyncStorage.getItem('@access_token'),
        ]);
        if (!cancelled) setMakes(Array.isArray(makeRows) ? makeRows : []);

        const typesRes = await fetch(`${API_BASE_URL}/api/repairs/types/`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (typesRes.ok && !cancelled) {
          const typeRows = await typesRes.json();
          setRepairTypes(Array.isArray(typeRows) ? typeRows : []);
        }
      } catch (e) {
        console.warn('Could not load filter catalogs', e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!makeId) {
      setModels([]);
      return undefined;
    }

    let cancelled = false;
    setModelsLoading(true);
    (async () => {
      try {
        const rows = await getModelsForMake(makeId);
        if (!cancelled) setModels(Array.isArray(rows) ? rows : []);
      } catch (e) {
        console.warn('Could not load models', e);
        if (!cancelled) setModels([]);
      } finally {
        if (!cancelled) setModelsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [makeId]);

  const selectedModel = useMemo(
    () => models.find((m) => String(m.id) === String(modelId)),
    [models, modelId]
  );

  const catalogYearsHint = formatModelCatalogYears(selectedModel);

  const hasActiveFilters = Boolean(
    makeId || modelId || vehicleYear || serviceYear || repairTypeId
  );

  const patch = (next) =>
    onChange?.({ makeId, modelId, vehicleYear, serviceYear, repairTypeId, ...next });

  const serviceYearLabel =
    statusTab === 'done' ? 'Service completed year' : 'Request / job year';

  return (
    <View style={styles.wrap}>
      <Text style={styles.heading}>Filters</Text>
      <Text style={styles.intro}>
        Make and model identify the car. Years are separate: registration on the vehicle profile vs when
        the service happened.
      </Text>

      <View style={styles.pickerRow}>
        <View style={styles.pickerBox}>
          <Text style={styles.pickerLabel}>Make</Text>
          <View style={styles.pickerShell}>
            <Picker
              selectedValue={makeId || ANY}
              onValueChange={(v) => patch({ makeId: v || ANY, modelId: ANY })}
              style={styles.picker}
              dropdownIconColor={COLORS.TEXT_MUTED}
            >
              <Picker.Item label="Any make" value={ANY} />
              {makes.map((make) => (
                <Picker.Item key={String(make.id)} label={make.name} value={String(make.id)} />
              ))}
            </Picker>
          </View>
        </View>

        <View style={styles.pickerBox}>
          <Text style={styles.pickerLabel}>Model</Text>
          <View style={[styles.pickerShell, !makeId && styles.pickerDisabled]}>
            <Picker
              enabled={Boolean(makeId) && !modelsLoading}
              selectedValue={modelId || ANY}
              onValueChange={(v) => patch({ modelId: v || ANY })}
              style={styles.picker}
              dropdownIconColor={COLORS.TEXT_MUTED}
            >
              <Picker.Item label={makeId ? 'Any model' : 'Select make first'} value={ANY} />
              {models.map((model) => (
                <Picker.Item
                  key={String(model.id)}
                  label={modelPickerLabel(model)}
                  value={String(model.id)}
                />
              ))}
            </Picker>
          </View>
          {catalogYearsHint ? (
            <Text style={styles.pickerHint}>
              Catalog production years: {catalogYearsHint}. This is not the car registration year.
            </Text>
          ) : null}
        </View>
      </View>

      <View style={styles.pickerRow}>
        <View style={styles.pickerBox}>
          <Text style={styles.pickerLabel}>Car registration year</Text>
          <Text style={styles.pickerSublabel}>Year on the vehicle profile</Text>
          <View style={styles.pickerShell}>
            <Picker
              selectedValue={vehicleYear || ANY}
              onValueChange={(v) => patch({ vehicleYear: v || ANY })}
              style={styles.picker}
              dropdownIconColor={COLORS.TEXT_MUTED}
            >
              <Picker.Item label="Any registration year" value={ANY} />
              {registrationYearOptions.map((year) => (
                <Picker.Item key={`reg-${year}`} label={String(year)} value={String(year)} />
              ))}
            </Picker>
          </View>
        </View>

        <View style={styles.pickerBox}>
          <Text style={styles.pickerLabel}>{serviceYearLabel}</Text>
          <Text style={styles.pickerSublabel}>
            {statusTab === 'done' ? 'When the job was completed' : 'When the request was created'}
          </Text>
          <View style={styles.pickerShell}>
            <Picker
              selectedValue={serviceYear || ANY}
              onValueChange={(v) => patch({ serviceYear: v || ANY })}
              style={styles.picker}
              dropdownIconColor={COLORS.TEXT_MUTED}
            >
              <Picker.Item label="Any service year" value={ANY} />
              {serviceYearOptions.map((year) => (
                <Picker.Item key={`svc-${year}`} label={String(year)} value={String(year)} />
              ))}
            </Picker>
          </View>
        </View>
      </View>

      <View style={styles.pickerBox}>
        <Text style={styles.pickerLabel}>Service type</Text>
        <View style={styles.pickerShell}>
          <Picker
            selectedValue={repairTypeId || ANY}
            onValueChange={(v) => patch({ repairTypeId: v || ANY })}
            style={styles.picker}
            dropdownIconColor={COLORS.TEXT_MUTED}
          >
            <Picker.Item label="Any service" value={ANY} />
            {repairTypes.map((type) => (
              <Picker.Item key={String(type.id)} label={type.name} value={String(type.id)} />
            ))}
          </Picker>
        </View>
      </View>

      {hasActiveFilters ? (
        <Button
          mode="text"
          compact
          onPress={() =>
            onChange?.({
              makeId: ANY,
              modelId: ANY,
              vehicleYear: ANY,
              serviceYear: ANY,
              repairTypeId: ANY,
            })
          }
          style={styles.clearBtn}
        >
          Clear all filters
        </Button>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 10,
    padding: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.95)',
  },
  heading: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.TEXT_MUTED,
    textTransform: 'uppercase',
    marginBottom: 4,
    letterSpacing: 0.4,
  },
  intro: {
    fontSize: 12,
    lineHeight: 17,
    color: COLORS.TEXT_MUTED,
    marginBottom: 10,
  },
  pickerRow: {
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    gap: 8,
    marginBottom: 8,
  },
  pickerBox: {
    flex: 1,
    marginBottom: 4,
  },
  pickerLabel: {
    fontSize: 11,
    color: COLORS.TEXT_DARK,
    marginBottom: 2,
    fontWeight: '700',
  },
  pickerSublabel: {
    fontSize: 10,
    color: COLORS.TEXT_MUTED,
    marginBottom: 4,
  },
  pickerHint: {
    fontSize: 11,
    color: COLORS.PRIMARY,
    marginTop: 4,
    lineHeight: 15,
  },
  pickerShell: {
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.12)',
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  pickerDisabled: {
    opacity: 0.55,
  },
  picker: {
    height: Platform.OS === 'ios' ? 140 : 44,
  },
  clearBtn: {
    alignSelf: 'flex-start',
    marginTop: 2,
  },
});
