import React, { useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { Text } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { API_BASE_URL } from '../../api/config';
import { getMakes, getModelsForMake } from '../../api/vehicles';
import { COLORS } from '../../constants/colors';
import { useTranslation } from '../../i18n';
import { translateRepairTypeLabel } from '../../utils/translateShopTypeLabels';

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

function formatModelCatalogYears(model, t) {
  const from = model?.production_year_from;
  const to = model?.production_year_to;
  if (from && to) return `${from}–${to}`;
  if (from) return t('repairs.filters.catalogFrom', { year: from });
  if (to) return t('repairs.filters.catalogUntil', { year: to });
  return null;
}

function modelOptionLabel(model, t) {
  const range = formatModelCatalogYears(model, t);
  return range
    ? `${model.name} (${t('repairs.filters.catalogRangeLabel', { range })})`
    : model.name;
}

function FilterField({ label, valueLabel, placeholder, disabled, onPress, active }) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.field,
        active && styles.fieldActive,
        disabled && styles.fieldDisabled,
        pressed && !disabled && styles.fieldPressed,
      ]}
    >
      <View style={styles.fieldTextCol}>
        <Text style={styles.fieldLabel}>{label}</Text>
        <Text
          style={[styles.fieldValue, !active && styles.fieldValueMuted]}
          numberOfLines={1}
        >
          {active ? valueLabel : placeholder}
        </Text>
      </View>
      <MaterialCommunityIcons
        name="chevron-down"
        size={20}
        color={disabled ? COLORS.TEXT_MUTED : COLORS.PRIMARY}
      />
    </Pressable>
  );
}

export default function RepairVehicleFilterBar({ value, onChange, statusTab = 'open' }) {
  const { t, locale } = useTranslation();
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
  const [pickerKey, setPickerKey] = useState(null);
  const [search, setSearch] = useState('');

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

  const selectedMake = useMemo(
    () => makes.find((m) => String(m.id) === String(makeId)),
    [makes, makeId]
  );
  const selectedModel = useMemo(
    () => models.find((m) => String(m.id) === String(modelId)),
    [models, modelId]
  );
  const selectedRepairType = useMemo(
    () => repairTypes.find((rt) => String(rt.id) === String(repairTypeId)),
    [repairTypes, repairTypeId]
  );

  const hasActiveFilters = Boolean(
    makeId || modelId || vehicleYear || serviceYear || repairTypeId
  );

  const patch = (next) =>
    onChange?.({ makeId, modelId, vehicleYear, serviceYear, repairTypeId, ...next });

  const serviceYearLabel =
    statusTab === 'done'
      ? t('repairs.filters.serviceCompletedYear')
      : t('repairs.filters.requestJobYear');

  const closePicker = () => {
    setPickerKey(null);
    setSearch('');
  };

  const pickerConfig = (() => {
    if (!pickerKey) return null;
    const configs = {
      make: {
        title: t('repairs.filters.make'),
        anyLabel: t('repairs.filters.anyMake'),
        options: makes.map((make) => ({
          id: String(make.id),
          label: make.name,
        })),
        selected: makeId || ANY,
        onSelect: (id) => patch({ makeId: id || ANY, modelId: ANY }),
      },
      model: {
        title: t('repairs.filters.model'),
        anyLabel: makeId ? t('repairs.filters.anyModel') : t('repairs.filters.selectMakeFirst'),
        options: models.map((model) => ({
          id: String(model.id),
          label: modelOptionLabel(model, t),
        })),
        selected: modelId || ANY,
        onSelect: (id) => patch({ modelId: id || ANY }),
        disabled: !makeId || modelsLoading,
      },
      vehicleYear: {
        title: t('repairs.filters.registrationYear'),
        anyLabel: t('repairs.filters.anyRegistrationYear'),
        options: registrationYearOptions.map((year) => ({
          id: String(year),
          label: String(year),
        })),
        selected: vehicleYear || ANY,
        onSelect: (id) => patch({ vehicleYear: id || ANY }),
      },
      serviceYear: {
        title: serviceYearLabel,
        anyLabel: t('repairs.filters.anyServiceYear'),
        options: serviceYearOptions.map((year) => ({
          id: String(year),
          label: String(year),
        })),
        selected: serviceYear || ANY,
        onSelect: (id) => patch({ serviceYear: id || ANY }),
      },
      repairType: {
        title: t('repairs.detail.serviceType', null, 'Service type'),
        anyLabel: t('repairs.filters.anyService', null, 'Any service'),
        options: repairTypes.map((type) => ({
          id: String(type.id),
          label: translateRepairTypeLabel(type, t, { locale }) || type.name,
        })),
        selected: repairTypeId || ANY,
        onSelect: (id) => patch({ repairTypeId: id || ANY }),
      },
    };
    return configs[pickerKey] || null;
  })();

  const filteredOptions = useMemo(() => {
    if (!pickerConfig) return [];
    const q = search.trim().toLowerCase();
    if (!q) return pickerConfig.options;
    return pickerConfig.options.filter((opt) =>
      String(opt.label || '')
        .toLowerCase()
        .includes(q)
    );
  }, [pickerConfig, search]);

  const activeChips = useMemo(() => {
    const chips = [];
    if (selectedMake) {
      chips.push({
        key: 'make',
        label: selectedMake.name,
        onClear: () => patch({ makeId: ANY, modelId: ANY }),
      });
    }
    if (selectedModel) {
      chips.push({
        key: 'model',
        label: selectedModel.name,
        onClear: () => patch({ modelId: ANY }),
      });
    }
    if (vehicleYear) {
      chips.push({
        key: 'vehicleYear',
        label: vehicleYear,
        onClear: () => patch({ vehicleYear: ANY }),
      });
    }
    if (serviceYear) {
      chips.push({
        key: 'serviceYear',
        label: serviceYear,
        onClear: () => patch({ serviceYear: ANY }),
      });
    }
    if (selectedRepairType) {
      chips.push({
        key: 'repairType',
        label:
          translateRepairTypeLabel(selectedRepairType, t, { locale }) ||
          selectedRepairType.name,
        onClear: () => patch({ repairTypeId: ANY }),
      });
    }
    return chips;
  }, [
    selectedMake,
    selectedModel,
    vehicleYear,
    serviceYear,
    selectedRepairType,
    t,
    locale,
  ]);

  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        <Text style={styles.heading}>{t('repairs.filters.heading')}</Text>
        {hasActiveFilters ? (
          <Pressable
            onPress={() =>
              onChange?.({
                makeId: ANY,
                modelId: ANY,
                vehicleYear: ANY,
                serviceYear: ANY,
                repairTypeId: ANY,
              })
            }
            hitSlop={8}
          >
            <Text style={styles.clearLink}>{t('repairs.filters.clearAll')}</Text>
          </Pressable>
        ) : null}
      </View>

      {activeChips.length ? (
        <View style={styles.activeChipRow}>
          {activeChips.map((chip) => (
            <Pressable
              key={chip.key}
              onPress={chip.onClear}
              style={({ pressed }) => [styles.activeChip, pressed && { opacity: 0.85 }]}
            >
              <Text style={styles.activeChipText} numberOfLines={1}>
                {chip.label}
              </Text>
              <MaterialCommunityIcons name="close" size={14} color={COLORS.PRIMARY} />
            </Pressable>
          ))}
        </View>
      ) : (
        <Text style={styles.intro}>{t('repairs.filters.introShort')}</Text>
      )}

      <View style={styles.fieldGrid}>
        <FilterField
          label={t('repairs.filters.make')}
          valueLabel={selectedMake?.name}
          placeholder={t('repairs.filters.anyMake')}
          active={Boolean(makeId)}
          onPress={() => setPickerKey('make')}
        />
        <FilterField
          label={t('repairs.filters.model')}
          valueLabel={selectedModel ? modelOptionLabel(selectedModel, t) : null}
          placeholder={
            makeId ? t('repairs.filters.anyModel') : t('repairs.filters.selectMakeFirst')
          }
          active={Boolean(modelId)}
          disabled={!makeId || modelsLoading}
          onPress={() => setPickerKey('model')}
        />
        <FilterField
          label={t('repairs.filters.registrationYear')}
          valueLabel={vehicleYear}
          placeholder={t('repairs.filters.anyRegistrationYear')}
          active={Boolean(vehicleYear)}
          onPress={() => setPickerKey('vehicleYear')}
        />
        <FilterField
          label={serviceYearLabel}
          valueLabel={serviceYear}
          placeholder={t('repairs.filters.anyServiceYear')}
          active={Boolean(serviceYear)}
          onPress={() => setPickerKey('serviceYear')}
        />
        <FilterField
          label={t('repairs.detail.serviceType', null, 'Service type')}
          valueLabel={
            selectedRepairType
              ? translateRepairTypeLabel(selectedRepairType, t, { locale }) ||
                selectedRepairType.name
              : null
          }
          placeholder={t('repairs.filters.anyService', null, 'Any service')}
          active={Boolean(repairTypeId)}
          onPress={() => setPickerKey('repairType')}
        />
      </View>

      <Modal
        visible={Boolean(pickerConfig)}
        transparent
        animationType="fade"
        onRequestClose={closePicker}
      >
        <Pressable style={styles.modalBackdrop} onPress={closePicker}>
          <Pressable style={styles.modalCard} onPress={(e) => e?.stopPropagation?.()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{pickerConfig?.title}</Text>
              <Pressable onPress={closePicker} hitSlop={10}>
                <MaterialCommunityIcons name="close" size={22} color={COLORS.TEXT_DARK} />
              </Pressable>
            </View>
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder={t('repairs.filters.searchOptions')}
              placeholderTextColor={COLORS.TEXT_MUTED}
              style={styles.modalSearch}
              autoCorrect={false}
              autoCapitalize="none"
            />
            <Pressable
              onPress={() => {
                pickerConfig?.onSelect(ANY);
                closePicker();
              }}
              style={({ pressed }) => [
                styles.optionRow,
                !(pickerConfig?.selected) && styles.optionRowSelected,
                pressed && { opacity: 0.9 },
              ]}
            >
              <Text
                style={[
                  styles.optionText,
                  !(pickerConfig?.selected) && styles.optionTextSelected,
                ]}
              >
                {pickerConfig?.anyLabel}
              </Text>
              {!(pickerConfig?.selected) ? (
                <MaterialCommunityIcons name="check" size={18} color={COLORS.PRIMARY} />
              ) : null}
            </Pressable>
            <FlatList
              data={filteredOptions}
              keyExtractor={(item) => item.id}
              keyboardShouldPersistTaps="handled"
              style={styles.optionList}
              ListEmptyComponent={
                <Text style={styles.emptyOptions}>{t('repairs.filters.noOptions')}</Text>
              }
              renderItem={({ item }) => {
                const selected = String(pickerConfig?.selected) === String(item.id);
                return (
                  <Pressable
                    onPress={() => {
                      pickerConfig?.onSelect(item.id);
                      closePicker();
                    }}
                    style={({ pressed }) => [
                      styles.optionRow,
                      selected && styles.optionRowSelected,
                      pressed && { opacity: 0.9 },
                    ]}
                  >
                    <Text
                      style={[styles.optionText, selected && styles.optionTextSelected]}
                      numberOfLines={2}
                    >
                      {item.label}
                    </Text>
                    {selected ? (
                      <MaterialCommunityIcons name="check" size={18} color={COLORS.PRIMARY} />
                    ) : null}
                  </Pressable>
                );
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 12,
    padding: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(15,23,42,0.08)',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  heading: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.TEXT_DARK,
    letterSpacing: 0.2,
  },
  clearLink: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.PRIMARY,
  },
  intro: {
    fontSize: 12,
    lineHeight: 17,
    color: COLORS.TEXT_MUTED,
    marginBottom: 10,
  },
  activeChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  activeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    maxWidth: '100%',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(15,76,129,0.1)',
  },
  activeChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.PRIMARY,
    maxWidth: 160,
  },
  fieldGrid: {
    gap: 8,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 52,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.08)',
  },
  fieldActive: {
    borderColor: 'rgba(15,76,129,0.35)',
    backgroundColor: 'rgba(15,76,129,0.04)',
  },
  fieldDisabled: {
    opacity: 0.5,
  },
  fieldPressed: {
    opacity: 0.92,
  },
  fieldTextCol: {
    flex: 1,
    minWidth: 0,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.TEXT_MUTED,
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  fieldValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.TEXT_DARK,
  },
  fieldValueMuted: {
    fontWeight: '500',
    color: COLORS.TEXT_MUTED,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
    justifyContent: Platform.OS === 'web' ? 'center' : 'flex-end',
    padding: Platform.OS === 'web' ? 24 : 0,
  },
  modalCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderBottomLeftRadius: Platform.OS === 'web' ? 18 : 0,
    borderBottomRightRadius: Platform.OS === 'web' ? 18 : 0,
    maxHeight: Platform.OS === 'web' ? 520 : '78%',
    width: Platform.OS === 'web' ? '100%' : undefined,
    maxWidth: Platform.OS === 'web' ? 440 : undefined,
    alignSelf: Platform.OS === 'web' ? 'center' : undefined,
    paddingBottom: Platform.OS === 'ios' ? 28 : 16,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.TEXT_DARK,
  },
  modalSearch: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.12)',
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    fontSize: 15,
    color: COLORS.TEXT_DARK,
    backgroundColor: '#F8FAFC',
  },
  optionList: {
    paddingHorizontal: 8,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderRadius: 10,
    marginHorizontal: 8,
  },
  optionRowSelected: {
    backgroundColor: 'rgba(15,76,129,0.08)',
  },
  optionText: {
    flex: 1,
    fontSize: 15,
    color: COLORS.TEXT_DARK,
    fontWeight: '500',
  },
  optionTextSelected: {
    fontWeight: '700',
    color: COLORS.PRIMARY,
  },
  emptyOptions: {
    textAlign: 'center',
    color: COLORS.TEXT_MUTED,
    paddingVertical: 24,
    fontSize: 14,
  },
});
