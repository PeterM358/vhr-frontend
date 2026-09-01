import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityIndicator, Button, Text, TextInput } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';

import ScreenBackground from '../components/ScreenBackground';
import AppCard from '../components/ui/AppCard';
import OrgAppHeader from '../components/org/OrgAppHeader';
import {
  createMaterialScrap,
  createOrgMaterial,
  getOrgMaterial,
  listWarehouseLocations,
  updateOrgMaterial,
} from '../api/orgWarehouse';
import { fetchUnits } from '../api/partCatalog';
import { confirmMessage } from '../utils/crossPlatformAlert';
import { resolveActiveOrganizationId } from '../utils/orgWorkspace';
import { navigateToOrgWarehouse } from '../navigation/webNavigation';
import { useTranslation } from '../i18n';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { COLORS } from '../constants/colors';
import { useScrollContentBottomPadding } from '../utils/mobileWebInsets';

const ON_CARD = '#0F172A';
const ON_CARD_MUTED = '#475569';

const FALLBACK_UNITS = [
  { code: 'piece', labelKey: 'org.warehouse.intake.units.piece', fallback: 'pcs' },
  { code: 'kg', labelKey: 'org.warehouse.intake.units.kg', fallback: 'kg' },
  { code: 'L', labelKey: 'org.warehouse.intake.units.L', fallback: 'L' },
  { code: 'm2', labelKey: 'org.warehouse.intake.units.m2', fallback: 'm²' },
];

export default function OrgMaterialFormScreen({ navigation, route }) {
  const { t, locale } = useTranslation();
  const routeOrgId = route?.params?.organizationId || route?.params?.orgId;
  const stockIdParam = route?.params?.stockId;
  const isCreate = stockIdParam == null || stockIdParam === '' || stockIdParam === 'new';
  const scrollBottomPadding = useScrollContentBottomPadding(40);

  const [orgId, setOrgId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [canManage, setCanManage] = useState(false);
  const [locations, setLocations] = useState([]);
  const [units, setUnits] = useState([]);

  const [name, setName] = useState('');
  const [partNumber, setPartNumber] = useState('');
  const [quantity, setQuantity] = useState('0');
  const [unitCode, setUnitCode] = useState('piece');
  const [unitPrice, setUnitPrice] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [isDurable, setIsDurable] = useState(false);
  const [isFinishedGood, setIsFinishedGood] = useState(false);
  const [locationId, setLocationId] = useState(null);
  const [materialId, setMaterialId] = useState(null);
  const [stockId, setStockId] = useState(null);
  const [numberedCount, setNumberedCount] = useState(null);

  const onBack = useCallback(() => {
    navigateToOrgWarehouse(navigation, {
      orgId: routeOrgId || orgId,
      tab: 'materials',
    });
  }, [navigation, orgId, routeOrgId]);

  const unitOptions = useMemo(() => {
    if (units.length) return units;
    return FALLBACK_UNITS.map((u) => ({
      code: u.code,
      name: t(u.labelKey, null, u.fallback),
    }));
  }, [t, units]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      const resolved = await resolveActiveOrganizationId(routeOrgId);
      setOrgId(resolved);
      if (!resolved) {
        setError(t('org.warehouse.loadError', null, 'Could not load warehouse.'));
        return;
      }
      const [locData, unitsData] = await Promise.all([
        listWarehouseLocations(token, resolved).catch(() => ({ results: [] })),
        fetchUnits(token).catch(() => []),
      ]);
      const locRows = Array.isArray(locData?.results) ? locData.results : [];
      const active = locRows.filter((r) => r && r.is_active !== false);
      const parentsWithChildren = new Set(
        active.filter((r) => r.parent_id).map((r) => Number(r.parent_id)),
      );
      setLocations(
        active
          .filter((r) => r.parent_id || !parentsWithChildren.has(Number(r.id)))
          .map((r) => ({
            ...r,
            display_name: r.parent_id
              ? `${r.parent_name || 'Site'} / ${r.name}`
              : r.name,
          })),
      );
      const unitRows = Array.isArray(unitsData)
        ? unitsData
        : Array.isArray(unitsData?.results)
          ? unitsData.results
          : [];
      setUnits(
        unitRows
          .filter((u) => u?.is_active !== false)
          .map((u) => ({
            code: u.code,
            name:
              (locale?.startsWith?.('bg') && u.name_bg) ||
              u.name_en ||
              u.name ||
              u.symbol ||
              u.code,
          })),
      );
      setCanManage(true);

      if (!isCreate) {
        const row = await getOrgMaterial(token, resolved, stockIdParam);
        setStockId(row.stock_id);
        setMaterialId(row.id);
        setName(row.name || row.label || '');
        setPartNumber(row.part_number || '');
        setQuantity(String(row.quantity_on_hand ?? '0'));
        setUnitCode(row.unit_code || 'piece');
        setIsDurable(Boolean(row.is_durable_tool));
        setIsFinishedGood(Boolean(row.is_finished_good));
        setLocationId(row.location_id || null);
        setNumberedCount(
          row.tool_assets_numbered != null ? Number(row.tool_assets_numbered) : null,
        );
      } else {
        setStockId(null);
        setMaterialId(null);
        setName('');
        setPartNumber('');
        setQuantity('1');
        setUnitCode('piece');
        setUnitPrice('');
        setInvoiceNumber('');
        setIsDurable(false);
        setIsFinishedGood(false);
        setLocationId(locRows.find((r) => r.is_active !== false)?.id || null);
        setNumberedCount(null);
      }
    } catch (e) {
      setError(e.message || t('org.warehouse.intake.loadError', null, 'Could not load.'));
    } finally {
      setLoading(false);
    }
  }, [isCreate, locale, routeOrgId, stockIdParam, t]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const stockKind = isDurable ? 'tool' : isFinishedGood ? 'finished' : 'raw';

  const setStockKind = (kind) => {
    if (kind === 'tool') {
      setIsDurable(true);
      setIsFinishedGood(false);
    } else if (kind === 'finished') {
      setIsDurable(false);
      setIsFinishedGood(true);
    } else {
      setIsDurable(false);
      setIsFinishedGood(false);
    }
  };

  const onSave = async () => {
    if (!orgId || !canManage) return;
    if (!name.trim() && !partNumber.trim()) {
      setError(t('org.warehouse.intake.lineRequired', null, 'Enter a material name or part number.'));
      return;
    }
    const qty = Number(quantity || 0);
    if (Number.isNaN(qty) || qty < 0) {
      setError(t('org.warehouse.intake.qtyInvalid', null, 'Enter a valid quantity.'));
      return;
    }
    if (isCreate && qty > 0 && !locationId) {
      setError(
        t(
          'org.warehouse.intake.locationRequired',
          null,
          'Select a warehouse location before storing quantity.',
        ),
      );
      return;
    }
    setBusy(true);
    setError('');
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      if (isCreate) {
        await createOrgMaterial(token, orgId, {
          description: name.trim(),
          part_number: partNumber.trim(),
          quantity: String(quantity || '0'),
          unit_code: unitCode || 'piece',
          unit_price: unitPrice || '0',
          invoice_number: invoiceNumber.trim() || undefined,
          is_durable_tool: Boolean(isDurable),
          is_finished_good: Boolean(isFinishedGood) && !isDurable,
          stock_kind: stockKind,
          location_id: locationId || undefined,
        });
      } else {
        await updateOrgMaterial(token, orgId, stockId || stockIdParam, {
          name: name.trim(),
          part_number: partNumber.trim(),
          description: name.trim(),
          is_durable_tool: Boolean(isDurable),
          is_finished_good: Boolean(isFinishedGood) && !isDurable,
          stock_kind: stockKind,
          quantity_on_hand: String(quantity || '0'),
          location_id: locationId || undefined,
        });
      }
      onBack();
    } catch (e) {
      setError(e.message || t('org.warehouse.intake.saveError', null, 'Could not save.'));
    } finally {
      setBusy(false);
    }
  };

  const onScrap = async () => {
    if (!orgId || !materialId || !canManage) return;
    const ok = await confirmMessage(
      t('org.warehouse.intake.scrapMaterialTitle', null, 'Write off from stock?'),
      t(
        'org.warehouse.intake.scrapMaterialBody',
        { qty: '1' },
        'This decreases on-hand quantity (real write-off / брак).',
      ),
    );
    if (!ok) return;
    setBusy(true);
    setError('');
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      await createMaterialScrap(token, orgId, {
        reason: 'broken',
        lines: [{ material_id: materialId, quantity: '1' }],
      });
      await load();
    } catch (e) {
      setError(e.message || t('org.warehouse.intake.scrapError', null, 'Could not write off.'));
    } finally {
      setBusy(false);
    }
  };

  const title = isCreate
    ? t('org.warehouse.intake.addMaterialTitle', null, 'Add material')
    : t('org.warehouse.intake.editMaterial', null, 'Edit material');

  return (
    <ScreenBackground>
      <OrgAppHeader mode="detail" title={title} onBack={onBack} />
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: scrollBottomPadding }]}>
        {loading ? (
          <ActivityIndicator style={{ marginTop: 40 }} color={COLORS.primary} />
        ) : (
          <AppCard style={styles.card}>
            <Text style={styles.hint}>
              {t(
                'org.warehouse.intake.manualQtyHint',
                null,
                'You can run warehouse without full ERP documents — set quantity here when needed.',
              )}
            </Text>
            {error ? <Text style={styles.error}>{error}</Text> : null}

            <TextInput
              label={t('org.warehouse.intake.lineName', null, 'Name / description')}
              value={name}
              onChangeText={setName}
              mode="outlined"
              style={styles.input}
              textColor={ON_CARD}
            />
            <TextInput
              label={t('org.warehouse.intake.partNumber', null, 'Part number / SKU')}
              value={partNumber}
              onChangeText={setPartNumber}
              mode="outlined"
              style={styles.input}
              textColor={ON_CARD}
            />
            <TextInput
              label={t('org.warehouse.intake.qty', null, 'Qty')}
              value={quantity}
              onChangeText={setQuantity}
              mode="outlined"
              style={styles.input}
              keyboardType="decimal-pad"
              textColor={ON_CARD}
            />
            {numberedCount != null && isDurable ? (
              <Text style={styles.meta}>
                {t(
                  'org.warehouse.intake.numberedFloorHint',
                  { count: numberedCount },
                  `Cannot go below ${numberedCount} numbered tool(s). Delete mistaken numbers first.`,
                )}
              </Text>
            ) : null}

            {isCreate ? (
              <>
                <TextInput
                  label={t('org.warehouse.intake.documentNumber', null, 'Document # (optional)')}
                  value={invoiceNumber}
                  onChangeText={setInvoiceNumber}
                  mode="outlined"
                  style={styles.input}
                  textColor={ON_CARD}
                />
                <TextInput
                  label={t('org.warehouse.intake.priceEur', null, 'Price (EUR)')}
                  value={unitPrice}
                  onChangeText={setUnitPrice}
                  mode="outlined"
                  style={styles.input}
                  keyboardType="decimal-pad"
                  textColor={ON_CARD}
                />
                <Text style={styles.label}>{t('org.warehouse.intake.unit', null, 'Unit')}</Text>
                <View style={styles.chipRow}>
                  {unitOptions.map((u) => {
                    const active = unitCode === u.code;
                    return (
                      <Pressable
                        key={u.code}
                        onPress={() => setUnitCode(u.code)}
                        style={[styles.chip, active && styles.chipActive]}
                      >
                        <Text style={[styles.chipText, active && styles.chipTextActive]}>
                          {u.name || u.code}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            ) : (
              <Text style={styles.meta}>
                {t('org.warehouse.intake.unit', null, 'Unit')}: {unitCode}
              </Text>
            )}

            <Text style={styles.label}>
              {t('org.warehouse.intake.storeLocation', null, 'Store into location')}
            </Text>
            <View style={styles.chipRow}>
              {locations.map((loc) => {
                const active = Number(locationId) === Number(loc.id);
                return (
                  <Pressable
                    key={loc.id}
                    onPress={() => setLocationId(loc.id)}
                    style={[styles.chip, active && styles.chipActive]}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>
                      {loc.display_name || loc.name || loc.code}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.label}>
              {t('org.warehouse.intake.stockKindLabel', null, 'Material type')}
            </Text>
            <Text style={styles.hint}>
              {t(
                'org.warehouse.intake.stockKindHint',
                null,
                'Raw = ingredients. Finished = ready goods (recipe output). Tool = durable machine — not consumed.',
              )}
            </Text>
            <View style={styles.chipRow}>
              {[
                {
                  id: 'raw',
                  label: t('org.warehouse.intake.stockKindRaw', null, 'Raw material'),
                },
                {
                  id: 'finished',
                  label: t('org.warehouse.intake.stockKindFinished', null, 'Finished product'),
                },
                {
                  id: 'tool',
                  label: t('org.warehouse.intake.stockKindTool', null, 'Tool'),
                },
              ].map((opt) => {
                const active = stockKind === opt.id;
                return (
                  <Pressable
                    key={opt.id}
                    onPress={() => setStockKind(opt.id)}
                    style={[styles.chip, active && styles.chipActive]}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.actions}>
              <Button mode="contained" onPress={onSave} loading={busy} disabled={busy || !canManage}>
                {t('common.save', null, 'Save')}
              </Button>
              {!isCreate && isDurable ? (
                <Button mode="outlined" onPress={onScrap} disabled={busy} textColor={ON_CARD}>
                  {t('org.warehouse.intake.scrapMaterial', null, 'Write off (scrap)')}
                </Button>
              ) : null}
              <Button mode="text" onPress={onBack} textColor={ON_CARD}>
                {t('common.cancel', null, 'Cancel')}
              </Button>
            </View>
          </AppCard>
        )}
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 16, gap: 12 },
  card: { gap: 10, paddingVertical: 8 },
  input: { backgroundColor: '#fff' },
  label: { color: ON_CARD, fontWeight: '600', fontSize: 14 },
  hint: { color: ON_CARD_MUTED, fontSize: 13, lineHeight: 18 },
  meta: { color: ON_CARD_MUTED, fontSize: 12 },
  error: { color: '#B91C1C', fontSize: 13 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#fff',
  },
  chipActive: { backgroundColor: '#1D4ED8', borderColor: '#1D4ED8' },
  chipText: { color: ON_CARD, fontSize: 13 },
  chipTextActive: { color: '#fff' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8, alignItems: 'center' },
});
