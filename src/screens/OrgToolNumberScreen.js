import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityIndicator, Button, Text, TextInput } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';

import ScreenBackground from '../components/ScreenBackground';
import AppCard from '../components/ui/AppCard';
import OrgAppHeader from '../components/org/OrgAppHeader';
import { generateToolAssets, listOrgMaterials } from '../api/orgWarehouse';
import { resolveActiveOrganizationId } from '../utils/orgWorkspace';
import { navigateToOrgWarehouse } from '../navigation/webNavigation';
import { useTranslation } from '../i18n';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { COLORS } from '../constants/colors';
import { useScrollContentBottomPadding } from '../utils/mobileWebInsets';

const ON_CARD = '#0F172A';
const ON_CARD_MUTED = '#475569';

export default function OrgToolNumberScreen({ navigation, route }) {
  const { t } = useTranslation();
  const routeOrgId = route?.params?.organizationId || route?.params?.orgId;
  const presetMaterialId = route?.params?.materialId;
  const scrollBottomPadding = useScrollContentBottomPadding(40);

  const [orgId, setOrgId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [durableMaterials, setDurableMaterials] = useState([]);
  const [genMaterialId, setGenMaterialId] = useState(presetMaterialId || null);
  const [genCount, setGenCount] = useState('1');
  const [genPrefix, setGenPrefix] = useState('');

  const onBack = useCallback(() => {
    navigateToOrgWarehouse(navigation, {
      orgId: routeOrgId || orgId,
      tab: 'tools',
    });
  }, [navigation, orgId, routeOrgId]);

  const selected = useMemo(
    () =>
      durableMaterials.find((row) => Number(row.id || row.material_id) === Number(genMaterialId)),
    [durableMaterials, genMaterialId],
  );
  const availableToNumber = selected
    ? Number(selected.tool_assets_available_to_number ?? 0)
    : 0;

  const pickMaterial = (row) => {
    const mid = row.id || row.material_id;
    setGenMaterialId(mid);
    const avail = Number(row.tool_assets_available_to_number ?? 0);
    setGenCount(String(Math.max(0, avail)));
    setGenPrefix(row.suggested_tag_prefix || '');
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      const resolved = await resolveActiveOrganizationId(routeOrgId);
      setOrgId(resolved);
      if (!resolved) return;
      const matData = await listOrgMaterials(token, resolved, {
        durable_tool: 1,
        limit: 200,
      });
      const rows = (Array.isArray(matData?.results) ? matData.results : []).filter(
        (r) => r.is_durable_tool,
      );
      setDurableMaterials(rows);
      if (presetMaterialId) {
        const found = rows.find((r) => Number(r.id || r.material_id) === Number(presetMaterialId));
        if (found) pickMaterial(found);
      }
    } catch (e) {
      setError(e.message || t('org.warehouse.tools.loadError', null, 'Could not load tools.'));
    } finally {
      setLoading(false);
    }
  }, [presetMaterialId, routeOrgId, t]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const onGenerate = async () => {
    if (!orgId || !genMaterialId) {
      setError(t('org.warehouse.tools.pickMaterial', null, 'Pick a durable tool material.'));
      return;
    }
    const count = Number(genCount || 0);
    if (!count || count < 1) {
      setError(t('org.warehouse.tools.countRequired', null, 'Enter how many to number.'));
      return;
    }
    if (count > availableToNumber) {
      setError(
        t(
          'org.warehouse.tools.tooMany',
          { available: availableToNumber },
          `Only ${availableToNumber} available to number from current stock.`,
        ),
      );
      return;
    }
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      const res = await generateToolAssets(token, orgId, {
        material_id: genMaterialId,
        count,
        tag_prefix: genPrefix.trim() || undefined,
      });
      const n = Array.isArray(res?.results) ? res.results.length : count;
      setMessage(
        t('org.warehouse.tools.numberedOk', { count: n }, `Numbered ${n} tool(s).`),
      );
      onBack();
    } catch (e) {
      setError(e.message || t('org.warehouse.tools.numberError', null, 'Could not number tools.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScreenBackground>
      <OrgAppHeader
        mode="detail"
        title={t('org.warehouse.tools.numberSection', null, 'Number new tools')}
        onBack={onBack}
      />
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: scrollBottomPadding }]}>
        {loading ? (
          <ActivityIndicator style={{ marginTop: 40 }} color={COLORS.primary} />
        ) : (
          <AppCard style={styles.card}>
            <Text style={styles.hint}>
              {t(
                'org.warehouse.tools.prefixHint',
                null,
                'Each SKU gets its own prefix: drills → BO-001…, grinders → FLE-001…. You can only number units that are on stock and not numbered yet.',
              )}
            </Text>
            {error ? <Text style={styles.error}>{error}</Text> : null}
            {message ? <Text style={styles.message}>{message}</Text> : null}

            {!durableMaterials.length ? (
              <Text style={styles.meta}>
                {t(
                  'org.warehouse.tools.noDurable',
                  null,
                  'Mark materials as durable tools first (Materials tab).',
                )}
              </Text>
            ) : (
              <View style={styles.chipRow}>
                {durableMaterials.map((row) => {
                  const mid = row.id || row.material_id;
                  const active = Number(genMaterialId) === Number(mid);
                  return (
                    <Pressable
                      key={mid}
                      onPress={() => pickMaterial(row)}
                      style={[styles.chip, active && styles.chipActive]}
                    >
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>
                        {row.name || row.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}

            {selected ? (
              <Text style={styles.meta}>
                {t(
                  'org.warehouse.tools.stockNumberedMeta',
                  {
                    stock: selected.quantity_on_hand,
                    numbered: selected.tool_assets_numbered,
                    avail: availableToNumber,
                  },
                  `stock ${selected.quantity_on_hand} · numbered ${selected.tool_assets_numbered} · left ${availableToNumber}`,
                )}
              </Text>
            ) : null}

            <TextInput
              label={t('org.warehouse.tools.count', null, 'How many')}
              value={genCount}
              onChangeText={setGenCount}
              mode="outlined"
              keyboardType="number-pad"
              style={styles.input}
              textColor={ON_CARD}
            />
            <TextInput
              label={t('org.warehouse.tools.prefix', null, 'Tag prefix (optional)')}
              value={genPrefix}
              onChangeText={setGenPrefix}
              mode="outlined"
              autoCapitalize="characters"
              style={styles.input}
              textColor={ON_CARD}
            />

            <View style={styles.actions}>
              <Button
                mode="contained"
                onPress={onGenerate}
                loading={busy}
                disabled={busy || availableToNumber < 1}
              >
                {t('org.warehouse.tools.numberAction', null, 'Number tools')}
              </Button>
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
  hint: { color: ON_CARD_MUTED, fontSize: 13, lineHeight: 18 },
  meta: { color: ON_CARD_MUTED, fontSize: 12 },
  error: { color: '#B91C1C', fontSize: 13 },
  message: { color: '#047857', fontSize: 13 },
  input: { backgroundColor: '#fff' },
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
