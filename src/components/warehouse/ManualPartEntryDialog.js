import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Modal,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Text, TextInput, Button, Chip, Appbar, ActivityIndicator } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import CatalogSinglePicker from './CatalogSinglePicker';
import { PRIMARY, TEXT_DARK, TEXT_MUTED } from '../../constants/colors';
import { fetchPartBrands, fetchPartTypes, createPartBrand, createPartType } from '../../api/partCatalog';
import { formatAmount, parseAmount } from '../../utils/receivingAmount';
import { defaultPieceUnit } from '../../utils/warehouseReceivingSession';
import { showMessage } from '../../utils/crossPlatformAlert';

const DEFAULT_VAT_RATE = 20;

function syncTaxFromEx(exRaw, ratePercent = DEFAULT_VAT_RATE) {
  const ex = parseAmount(exRaw);
  if (ex == null || ex <= 0) {
    return { unit_price_ex_vat: exRaw, unit_vat: '', unit_price_inc_vat: '' };
  }
  const rate = Number(ratePercent) / 100;
  const vat = Math.round(ex * rate * 100) / 100;
  const inc = Math.round((ex + vat) * 100) / 100;
  return {
    unit_price_ex_vat: formatAmount(ex),
    unit_vat: formatAmount(vat),
    unit_price_inc_vat: formatAmount(inc),
  };
}

function syncTaxFromInc(incRaw, ratePercent = DEFAULT_VAT_RATE) {
  const inc = parseAmount(incRaw);
  if (inc == null || inc <= 0) {
    return { unit_price_ex_vat: '', unit_vat: '', unit_price_inc_vat: incRaw };
  }
  const rate = Number(ratePercent) / 100;
  const ex = Math.round((inc / (1 + rate)) * 100) / 100;
  const vat = Math.round((inc - ex) * 100) / 100;
  return {
    unit_price_ex_vat: formatAmount(ex),
    unit_vat: formatAmount(vat),
    unit_price_inc_vat: formatAmount(inc),
  };
}

function emptyForm(units) {
  const piece = defaultPieceUnit(units);
  return {
    part_type_id: null,
    part_type_name: '',
    part_brand_id: null,
    brand_raw: '',
    part_number: '',
    quantity: '1',
    unit_id: piece?.id || null,
    unit_symbol: piece?.symbol || 'pcs',
    unit_price_ex_vat: '',
    unit_vat: '',
    unit_price_inc_vat: '',
    vat_rate_percent: String(DEFAULT_VAT_RATE),
  };
}

function formFromLine(line, units) {
  const base = emptyForm(units);
  if (!line) return base;
  return {
    ...base,
    part_type_id: line.part_type,
    part_type_name: line.part_type_name || '',
    part_brand_id: line.part_brand,
    brand_raw: line.brand_raw || '',
    part_number: line.part_number || '',
    quantity: String(line.quantity ?? 1),
    unit_id: line.unit || base.unit_id,
    unit_symbol: line.unit_symbol || base.unit_symbol,
    unit_price_ex_vat: line.unit_price_ex_vat_minor
      ? String(Number(line.unit_price_ex_vat_minor) / 100)
      : line.unit_price_minor
        ? String(Number(line.unit_price_minor) / 100)
        : '',
    unit_vat: line.unit_vat_minor ? String(Number(line.unit_vat_minor) / 100) : '',
    unit_price_inc_vat: line.unit_price_inc_vat_minor
      ? String(Number(line.unit_price_inc_vat_minor) / 100)
      : '',
    vat_rate_percent: line.vat_rate_percent
      ? String(line.vat_rate_percent)
      : String(DEFAULT_VAT_RATE),
  };
}

export default function ManualPartEntryDialog({
  visible,
  editingLine = null,
  units = [],
  onDismiss,
  onSave,
  saving = false,
}) {
  const insets = useSafeAreaInsets();
  const [partTypes, setPartTypes] = useState([]);
  const [brands, setBrands] = useState([]);
  const [typeSearch, setTypeSearch] = useState('');
  const [brandSearch, setBrandSearch] = useState('');
  const [showBrand, setShowBrand] = useState(false);
  const [form, setForm] = useState(() => emptyForm(units));
  const [creatingType, setCreatingType] = useState(false);
  const [creatingBrand, setCreatingBrand] = useState(false);

  useEffect(() => {
    if (!visible) return;
    const next = formFromLine(editingLine, units);
    setForm(next);
    setTypeSearch(editingLine?.part_type_name || '');
    setBrandSearch(editingLine?.brand_raw || '');
    setShowBrand(Boolean(editingLine?.part_brand || editingLine?.brand_raw));
  }, [visible, editingLine, units]);

  useEffect(() => {
    if (!visible) return undefined;
    const handle = setTimeout(async () => {
      try {
        const token = await AsyncStorage.getItem('@access_token');
        const [types, brandList] = await Promise.all([
          fetchPartTypes(token, typeSearch.trim()),
          fetchPartBrands(token, brandSearch.trim()),
        ]);
        setPartTypes(types);
        setBrands(brandList);
      } catch (err) {
        console.error(err);
      }
    }, 280);
    return () => clearTimeout(handle);
  }, [visible, typeSearch, brandSearch]);

  const selectedType = useMemo(
    () => partTypes.find((t) => t.id === form.part_type_id),
    [partTypes, form.part_type_id]
  );

  const quickTypes = useMemo(() => {
    if (typeSearch.trim() || form.part_type_id) return [];
    return partTypes.slice(0, 8);
  }, [partTypes, typeSearch, form.part_type_id]);

  const filteredTypes = useMemo(() => {
    const q = typeSearch.trim().toLowerCase();
    if (!q) return partTypes.slice(0, 12);
    return partTypes.filter((t) => t.name.toLowerCase().includes(q)).slice(0, 12);
  }, [partTypes, typeSearch]);

  const filteredBrands = useMemo(() => {
    const q = brandSearch.trim().toLowerCase();
    if (!q) return brands.slice(0, 8);
    return brands.filter((b) => b.canonical_name.toLowerCase().includes(q)).slice(0, 8);
  }, [brands, brandSearch]);

  const canCreateType = useMemo(() => {
    const q = typeSearch.trim();
    if (q.length < 2) return false;
    return !partTypes.some((t) => t.name.toLowerCase() === q.toLowerCase());
  }, [partTypes, typeSearch]);

  const canCreateBrand = useMemo(() => {
    const q = brandSearch.trim();
    if (q.length < 2) return false;
    return !brands.some((b) => b.canonical_name.toLowerCase() === q.toLowerCase());
  }, [brands, brandSearch]);

  const unitsForType = useMemo(() => {
    if (!selectedType?.default_unit?.dimension) return units;
    return units.filter((u) => u.dimension === selectedType.default_unit.dimension);
  }, [units, selectedType]);

  const pickType = (item) => {
    setForm((prev) => ({
      ...prev,
      part_type_id: item.id,
      part_type_name: item.name || item.label,
      unit_id: item.default_unit?.id || prev.unit_id,
      unit_symbol: item.default_unit?.symbol || prev.unit_symbol,
    }));
    setTypeSearch(item.name || item.label || '');
  };

  const pickBrand = (item) => {
    setForm((prev) => ({
      ...prev,
      part_brand_id: item.id,
      brand_raw: item.canonical_name || item.label,
    }));
    setBrandSearch(item.canonical_name || item.label || '');
  };

  const handleCreateType = async () => {
    const label = typeSearch.trim();
    if (!label) return;
    setCreatingType(true);
    try {
      const token = await AsyncStorage.getItem('@access_token');
      const created = await createPartType(token, label);
      setPartTypes((prev) => [...prev.filter((t) => t.id !== created.id), created]);
      pickType(created);
    } catch (err) {
      showMessage('Part type', err.message || 'Could not create type');
    } finally {
      setCreatingType(false);
    }
  };

  const handleCreateBrand = async () => {
    const label = brandSearch.trim();
    if (!label) return;
    setCreatingBrand(true);
    try {
      const token = await AsyncStorage.getItem('@access_token');
      const created = await createPartBrand(token, label);
      setBrands((prev) => [...prev.filter((b) => b.id !== created.id), created]);
      pickBrand(created);
    } catch (err) {
      showMessage('Brand', err.message || 'Could not create brand');
    } finally {
      setCreatingBrand(false);
    }
  };

  const updateExVat = (value) => {
    setForm((prev) => ({
      ...prev,
      ...syncTaxFromEx(value, prev.vat_rate_percent),
    }));
  };

  const updateIncVat = (value) => {
    setForm((prev) => ({
      ...prev,
      ...syncTaxFromInc(value, prev.vat_rate_percent),
    }));
  };

  const handleSubmit = () => {
    if (!form.part_type_id) {
      showMessage('Required', 'Choose a part type (e.g. Brake Pads Front, Engine Oil).');
      return;
    }
    if (!form.part_number.trim()) {
      showMessage('Required', 'Enter supplier / OEM part number.');
      return;
    }
    if (!form.unit_id) {
      showMessage('Required', 'Choose a unit (pcs, L, …).');
      return;
    }
    const ex = parseAmount(form.unit_price_ex_vat);
    const inc = parseAmount(form.unit_price_inc_vat);
    if ((!ex || ex <= 0) && (!inc || inc <= 0)) {
      showMessage('Required', 'Enter unit buy price (ex-VAT or inc-VAT).');
      return;
    }
    onSave?.(form);
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onDismiss}>
      <KeyboardAvoidingView
        style={[styles.root, { paddingTop: insets.top }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Appbar.Header style={styles.appbar}>
          <Appbar.BackAction onPress={onDismiss} />
          <Appbar.Content title={editingLine ? 'Edit part line' : 'Add part'} />
          <Appbar.Action
            icon="check"
            onPress={handleSubmit}
            disabled={saving}
            accessibilityLabel="Save part line"
          />
        </Appbar.Header>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.lead}>
            Type, part number, quantity, and buy price are required. Brand is optional.
          </Text>

          {quickTypes.length > 0 ? (
            <View style={styles.quickSection}>
              <Text style={styles.sectionLabel}>Common types</Text>
              <View style={styles.quickRow}>
                {quickTypes.map((t) => (
                  <Chip
                    key={t.id}
                    selected={form.part_type_id === t.id}
                    onPress={() => pickType(t)}
                    style={styles.quickChip}
                  >
                    {t.name}
                  </Chip>
                ))}
              </View>
            </View>
          ) : null}

          <CatalogSinglePicker
            label="Part type"
            required
            placeholder="Search brake, oil, filter…"
            items={filteredTypes.map((t) => ({
              id: t.id,
              label: t.name,
              meta: t.category_name,
            }))}
            selectedId={form.part_type_id}
            selectedLabel={form.part_type_name}
            searchValue={typeSearch}
            onSearchChange={(v) => {
              setTypeSearch(v);
              setForm((p) => ({ ...p, part_type_id: null, part_type_name: v }));
            }}
            onSelect={(item) => {
              if (!item) {
                setForm((p) => ({ ...p, part_type_id: null, part_type_name: '' }));
                return;
              }
              const full = partTypes.find((t) => t.id === item.id);
              if (full) pickType(full);
            }}
            onCreateNew={canCreateType ? handleCreateType : undefined}
            creating={creatingType}
            createLabel={`Add "${typeSearch.trim()}" as new type`}
            emptyHint="Start typing to search part types."
          />

          <TextInput
            label="Part / OEM number *"
            value={form.part_number}
            onChangeText={(v) => setForm((p) => ({ ...p, part_number: v }))}
            mode="outlined"
            autoCapitalize="characters"
            style={styles.field}
          />

          <View style={styles.row2}>
            <TextInput
              label="Quantity *"
              value={form.quantity}
              onChangeText={(v) => setForm((p) => ({ ...p, quantity: v }))}
              keyboardType="decimal-pad"
              mode="outlined"
              style={[styles.field, styles.half]}
            />
            <View style={styles.half}>
              <Text style={styles.unitLabel}>Unit *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {(unitsForType.length ? unitsForType : units).map((u) => (
                  <Chip
                    key={u.id}
                    selected={form.unit_id === u.id}
                    onPress={() =>
                      setForm((p) => ({
                        ...p,
                        unit_id: u.id,
                        unit_symbol: u.symbol,
                      }))
                    }
                    style={styles.unitChip}
                  >
                    {u.symbol}
                  </Chip>
                ))}
              </ScrollView>
            </View>
          </View>

          <Text style={styles.sectionLabel}>Buy price (EUR) *</Text>
          <View style={styles.row2}>
            <TextInput
              label="Ex-VAT"
              value={form.unit_price_ex_vat}
              onChangeText={updateExVat}
              keyboardType="decimal-pad"
              mode="outlined"
              style={[styles.field, styles.half]}
            />
            <TextInput
              label="Inc-VAT"
              value={form.unit_price_inc_vat}
              onChangeText={updateIncVat}
              keyboardType="decimal-pad"
              mode="outlined"
              style={[styles.field, styles.half]}
            />
          </View>
          {form.unit_price_inc_vat ? (
            <Text style={styles.priceHint}>
              VAT {form.vat_rate_percent}%: €{form.unit_vat || '—'} per unit
            </Text>
          ) : null}

          <Pressable onPress={() => setShowBrand((v) => !v)} style={styles.optionalToggle}>
            <Text style={styles.optionalToggleText}>
              {showBrand ? 'Hide brand' : 'Add brand (optional)'}
            </Text>
          </Pressable>

          {showBrand ? (
            <CatalogSinglePicker
              label="Brand"
              placeholder="Search Bosch, Mann, Brembo…"
              items={filteredBrands.map((b) => ({
                id: b.id,
                label: b.canonical_name,
              }))}
              selectedId={form.part_brand_id}
              selectedLabel={form.brand_raw}
              searchValue={brandSearch}
              onSearchChange={(v) => {
                setBrandSearch(v);
                setForm((p) => ({ ...p, brand_raw: v, part_brand_id: null }));
              }}
              onSelect={(item) => {
                if (!item) {
                  setForm((p) => ({ ...p, part_brand_id: null, brand_raw: '' }));
                  return;
                }
                const full = brands.find((b) => b.id === item.id);
                if (full) pickBrand(full);
              }}
              onCreateNew={canCreateBrand ? handleCreateBrand : undefined}
              creating={creatingBrand}
              createLabel={`Add "${brandSearch.trim()}" as new brand`}
              emptyHint="Optional — search or add a brand."
            />
          ) : null}
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <Button mode="outlined" onPress={onDismiss} style={styles.footerBtn}>
            Cancel
          </Button>
          <Button
            mode="contained"
            onPress={handleSubmit}
            loading={saving}
            disabled={saving}
            buttonColor={PRIMARY}
            style={styles.footerBtn}
          >
            Save line
          </Button>
        </View>
        {saving ? (
          <View style={styles.savingOverlay}>
            <ActivityIndicator color={PRIMARY} />
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f8fafc' },
  appbar: { backgroundColor: '#0b1220' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 24 },
  lead: { fontSize: 13, color: TEXT_MUTED, lineHeight: 18, marginBottom: 14 },
  sectionLabel: { fontSize: 12, fontWeight: '600', color: TEXT_MUTED, marginBottom: 8 },
  quickSection: { marginBottom: 12 },
  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  quickChip: { backgroundColor: '#fff' },
  field: { marginBottom: 10, backgroundColor: '#fff' },
  row2: { flexDirection: 'row', gap: 8 },
  half: { flex: 1, minWidth: 0 },
  unitLabel: { fontSize: 12, color: TEXT_MUTED, marginBottom: 4 },
  unitChip: { marginRight: 6, marginBottom: 8 },
  priceHint: { fontSize: 12, color: TEXT_MUTED, marginBottom: 10 },
  optionalToggle: { paddingVertical: 8, marginBottom: 4 },
  optionalToggleText: { fontSize: 13, fontWeight: '600', color: PRIMARY },
  footer: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e2e8f0',
    backgroundColor: '#fff',
  },
  footerBtn: { flex: 1 },
  savingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
