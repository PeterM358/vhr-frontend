import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityIndicator, Button, TextInput } from 'react-native-paper';

import AppCard from '../ui/AppCard';
import OrgKitToolPicker from './OrgKitToolPicker';
import {
  createToolKit,
  deleteToolAsset,
  issueToolAsset,
  issueToolKit,
  listToolAssets,
  listToolKits,
  listToolScrapBlame,
  openToolAssetBatchLabels,
  openToolAssetLabel,
  openToolKitLabel,
  returnToolAsset,
  returnToolKit,
  scanToolCode,
} from '../../api/orgWarehouse';
import { listOrgWorkforce } from '../../api/orgWorkforce';
import { STORAGE_KEYS } from '../../constants/storageKeys';
import { useTranslation } from '../../i18n';
import { confirmMessage } from '../../utils/crossPlatformAlert';
import {
  navigateToOrgToolAssetDetail,
  navigateToOrgToolNumber,
} from '../../navigation/webNavigation';

const ON_CARD = '#0F172A';
const ON_CARD_MUTED = '#475569';
const CARD_SURFACE = { color: ON_CARD };

function statusLabel(t, status) {
  const map = {
    in_stock: t('org.warehouse.tools.statusInStock', null, 'In stock'),
    issued: t('org.warehouse.tools.statusIssued', null, 'Issued'),
    scrapped: t('org.warehouse.tools.statusScrapped', null, 'Scrapped'),
    lost: t('org.warehouse.tools.statusLost', null, 'Lost'),
  };
  return map[status] || status;
}

export default function OrgToolAssetsPanel({ organizationId, canManage, navigation = null }) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [assets, setAssets] = useState([]);
  const [kits, setKits] = useState([]);
  const [workforce, setWorkforce] = useState([]);
  const [blame, setBlame] = useState([]);

  const [employeeId, setEmployeeId] = useState(null);
  const [scanPayload, setScanPayload] = useState('');
  const [scanResult, setScanResult] = useState(null);
  const [kitName, setKitName] = useState('');
  const [kitCode, setKitCode] = useState('');
  const [kitAssetIds, setKitAssetIds] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);

  const [showScrapped, setShowScrapped] = useState(false);

  const visibleAssets = useMemo(() => {
    if (showScrapped) return assets;
    return (assets || []).filter((a) => a.status !== 'scrapped');
  }, [assets, showScrapped]);

  const employeeOptions = useMemo(
    () =>
      (workforce || [])
        .filter((m) => m.employee_id)
        .map((m) => ({
          id: m.employee_id,
          label: m.display_name || m.employee_display_name || `#${m.employee_id}`,
        })),
    [workforce],
  );

  const load = useCallback(async () => {
    if (!organizationId) return;
    setLoading(true);
    setError('');
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      const [assetsRes, kitsRes, wfRes] = await Promise.all([
        listToolAssets(token, organizationId, { limit: 200 }),
        listToolKits(token, organizationId, { active: '1' }),
        listOrgWorkforce(token, organizationId, { active: '1' }),
      ]);
      setAssets(assetsRes.results || []);
      setKits(kitsRes.results || []);
      setWorkforce(wfRes.results || wfRes.members || []);
      if (canManage) {
        try {
          const blameRes = await listToolScrapBlame(token, organizationId);
          setBlame(blameRes.results || []);
        } catch {
          setBlame([]);
        }
      }
    } catch (e) {
      setError(e.message || t('org.warehouse.tools.loadError', null, 'Could not load tools.'));
    } finally {
      setLoading(false);
    }
  }, [organizationId, canManage, t]);

  useEffect(() => {
    load();
  }, [load]);

  const withToken = async (fn) => {
    const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    return fn(token);
  };


  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id].slice(0, 100),
    );
  };

  const onPrintSelected = async () => {
    if (!selectedIds.length) return;
    setBusy(true);
    try {
      await withToken((token) => openToolAssetBatchLabels(token, organizationId, selectedIds));
    } catch (e) {
      Alert.alert(
        t('org.warehouse.tools.labelError', null, 'Could not open labels.'),
        e.message || '',
      );
    } finally {
      setBusy(false);
    }
  };




  const onScan = async () => {
    if (!scanPayload.trim()) return;
    setBusy(true);
    setScanResult(null);
    try {
      const resolved = await withToken((token) =>
        scanToolCode(token, organizationId, scanPayload.trim()),
      );
      setScanResult(resolved);
    } catch (e) {
      setMessage(e.message || t('org.warehouse.tools.scanError', null, 'Code not recognized.'));
    } finally {
      setBusy(false);
    }
  };

  const onIssueScan = async () => {
    if (!scanResult || !employeeId) {
      setMessage(t('org.warehouse.tools.pickEmployee', null, 'Pick who receives the tool.'));
      return;
    }
    setBusy(true);
    try {
      await withToken(async (token) => {
        if (scanResult.kind === 'tool_kit') {
          await issueToolKit(token, organizationId, scanResult.tool_kit.id, {
            employee_id: employeeId,
          });
        } else if (scanResult.kind === 'tool_asset') {
          await issueToolAsset(token, organizationId, scanResult.tool_asset.id, {
            employee_id: employeeId,
          });
        }
      });
      setMessage(t('org.warehouse.tools.issuedOk', null, 'Issued to employee.'));
      setScanResult(null);
      setScanPayload('');
      await load();
    } catch (e) {
      setMessage(e.message || t('org.warehouse.tools.issueError', null, 'Could not issue tool.'));
    } finally {
      setBusy(false);
    }
  };

  const onReturnScan = async () => {
    if (!scanResult) return;
    setBusy(true);
    try {
      await withToken(async (token) => {
        if (scanResult.kind === 'tool_kit') {
          await returnToolKit(token, organizationId, scanResult.tool_kit.id);
        } else if (scanResult.kind === 'tool_asset') {
          await returnToolAsset(token, organizationId, scanResult.tool_asset.id);
        }
      });
      setMessage(t('org.warehouse.tools.returnedOk', null, 'Returned to stock.'));
      setScanResult(null);
      setScanPayload('');
      await load();
    } catch (e) {
      setMessage(e.message || t('org.warehouse.tools.returnError', null, 'Could not return tool.'));
    } finally {
      setBusy(false);
    }
  };

  const toggleKitAssetIds = (ids) => {
    const unique = [];
    const seen = new Set();
    (ids || []).forEach((raw) => {
      const id = Number(raw);
      if (!Number.isFinite(id) || seen.has(id)) return;
      seen.add(id);
      unique.push(id);
    });
    setKitAssetIds(unique.slice(0, 40));
  };

  const onCreateKit = async () => {
    if (!kitName.trim() || !kitAssetIds.length) {
      setMessage(
        t('org.warehouse.tools.kitNeedNameItems', null, 'Kit needs a name and at least one tool.'),
      );
      return;
    }
    setBusy(true);
    try {
      await withToken((token) =>
        createToolKit(token, organizationId, {
          name: kitName.trim(),
          code: kitCode.trim(),
          asset_ids: kitAssetIds,
        }),
      );
      setKitName('');
      setKitCode('');
      setKitAssetIds([]);
      setMessage(t('org.warehouse.tools.kitCreated', null, 'Kit created — print the kit QR sticker.'));
      await load();
    } catch (e) {
      setMessage(e.message || t('org.warehouse.tools.kitError', null, 'Could not create kit.'));
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <AppCard style={styles.card} contentStyle={CARD_SURFACE}>
        <ActivityIndicator />
      </AppCard>
    );
  }

  return (
    <View>
      <AppCard style={styles.card} contentStyle={CARD_SURFACE}>
        <Text style={styles.title}>
          {t('org.warehouse.tools.title', null, 'Numbered tools & kits')}
        </Text>
        <Text style={styles.hint}>
          {t(
            'org.warehouse.tools.lead',
            null,
            'Give each drill a number + QR sticker. Bundle 5–6 machines into a kit QR — scan once to issue the whole bag.',
          )}
        </Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {message ? <Text style={styles.message}>{message}</Text> : null}
      </AppCard>

      {canManage ? (
        <AppCard style={styles.card} contentStyle={CARD_SURFACE}>
          <Text style={styles.section}>
            {t('org.warehouse.tools.scanSection', null, 'Scan / issue')}
          </Text>
          <Text style={styles.hint}>
            {t(
              'org.warehouse.tools.scanHint',
              null,
              'Paste QR text (ORGTOOL:… / ORGKIT:…) or type asset tag / kit code. Phone camera QR → paste here for now.',
            )}
          </Text>
          <TextInput
            label={t('org.warehouse.tools.scanCode', null, 'QR / tag / kit code')}
            value={scanPayload}
            onChangeText={setScanPayload}
            mode="outlined"
            style={styles.input}
            textColor={ON_CARD}
            autoCapitalize="characters"
          />
          <View style={styles.row}>
            <Button mode="outlined" onPress={onScan} disabled={busy} textColor={ON_CARD}>
              {t('org.warehouse.tools.resolve', null, 'Resolve')}
            </Button>
          </View>
          {scanResult ? (
            <View style={styles.scanBox}>
              <Text style={styles.meta}>
                {scanResult.kind === 'tool_kit'
                  ? `${t('org.warehouse.tools.kit', null, 'Kit')}: ${scanResult.tool_kit?.name} (${scanResult.tool_kit?.item_count || 0})`
                  : `${t('org.warehouse.tools.tool', null, 'Tool')}: ${scanResult.tool_asset?.asset_tag} — ${statusLabel(t, scanResult.tool_asset?.status)}`}
              </Text>
              <View style={styles.row}>
                <Button mode="contained" onPress={onIssueScan} disabled={busy || !employeeId}>
                  {t('org.warehouse.tools.issue', null, 'Issue')}
                </Button>
                <Button mode="outlined" onPress={onReturnScan} disabled={busy} textColor={ON_CARD}>
                  {t('org.warehouse.tools.return', null, 'Return')}
                </Button>
              </View>
            </View>
          ) : null}

          <Text style={[styles.section, { marginTop: 12 }]}>
            {t('org.warehouse.tools.receiver', null, 'Receiver')}
          </Text>
          <View style={styles.chipWrap}>
            {employeeOptions.map((emp) => {
              const active = employeeId === emp.id;
              return (
                <Pressable
                  key={emp.id}
                  onPress={() => setEmployeeId(emp.id)}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{emp.label}</Text>
                </Pressable>
              );
            })}
            {!employeeOptions.length ? (
              <Text style={styles.hint}>
                {t('org.warehouse.tools.noEmployees', null, 'No workforce employees yet.')}
              </Text>
            ) : null}
          </View>
        </AppCard>
      ) : null}

      {canManage ? (
        <Button
          mode="contained"
          onPress={() =>
            navigateToOrgToolNumber(navigation, { orgId: organizationId })
          }
          disabled={!navigation}
          style={{ marginBottom: 4 }}
        >
          {t('org.warehouse.tools.numberSection', null, 'Number new tools')}
        </Button>
      ) : null}

      <AppCard style={styles.card} contentStyle={CARD_SURFACE}>
        <View style={styles.rowBetween}>
          <Text style={styles.section}>
            {t('org.warehouse.tools.assets', null, 'Assets')} ({visibleAssets.length})
          </Text>
          {canManage && selectedIds.length ? (
            <Button compact mode="outlined" onPress={onPrintSelected} disabled={busy} textColor={ON_CARD}>
              {t('org.warehouse.tools.printSelected', { n: selectedIds.length }, `Print ${selectedIds.length}`)}
            </Button>
          ) : null}
        </View>
        <Pressable onPress={() => setShowScrapped((v) => !v)} style={{ marginBottom: 8 }}>
          <Text style={styles.hint}>
            {showScrapped
              ? t('org.warehouse.tools.hideScrapped', null, 'Hide scrapped')
              : t('org.warehouse.tools.showScrapped', null, 'Show scrapped')}
          </Text>
        </Pressable>
        {!visibleAssets.length ? (
          <Text style={styles.hint}>
            {t('org.warehouse.tools.noAssets', null, 'No numbered tools yet.')}
          </Text>
        ) : (
          visibleAssets.map((asset) => {
            const selected = selectedIds.includes(asset.id);
            return (
              <View key={asset.id} style={styles.assetRow}>
                <View style={styles.assetTitleRow}>
                  <Pressable
                    onPress={() => {
                      if (navigation) {
                        navigateToOrgToolAssetDetail(navigation, {
                          orgId: organizationId,
                          assetId: asset.id,
                        });
                        return;
                      }
                      if (canManage) toggleSelect(asset.id);
                    }}
                    onLongPress={() => canManage && toggleSelect(asset.id)}
                    style={styles.assetMain}
                  >
                    <Text style={styles.assetTag}>{asset.asset_tag}</Text>
                  </Pressable>
                  {canManage ? (
                    <View style={styles.assetActions}>
                      <Pressable onPress={() => toggleSelect(asset.id)} hitSlop={6}>
                        <Text style={[styles.link, selected && styles.linkSelected]}>
                          {selected
                            ? t('org.warehouse.tools.selectedShort', null, 'Selected')
                            : t('org.warehouse.tools.select', null, 'Select')}
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={() =>
                          withToken((token) => openToolAssetLabel(token, organizationId, asset.id))
                        }
                        hitSlop={6}
                      >
                        <Text style={styles.link}>
                          {t('org.warehouse.tools.printShort', null, 'Print')}
                        </Text>
                      </Pressable>
                      {asset.status !== 'issued' ? (
                        <Pressable
                          disabled={busy}
                          hitSlop={6}
                          onPress={async () => {
                            const ok = await confirmMessage(
                              t('org.warehouse.tools.deleteTitle', null, 'Delete this number?'),
                              t(
                                'org.warehouse.tools.deleteBody',
                                null,
                                'Removes a mistaken numbered tool. Does NOT change stock quantity (unlike scrap).',
                              ),
                            );
                            if (!ok) return;
                            setBusy(true);
                            try {
                              await withToken((token) =>
                                deleteToolAsset(token, organizationId, asset.id),
                              );
                              setMessage(
                                t('org.warehouse.tools.deletedOk', null, 'Number deleted (stock unchanged).'),
                              );
                              await load();
                            } catch (e) {
                              setMessage(
                                e.message
                                  || t('org.warehouse.tools.deleteError', null, 'Could not delete.'),
                              );
                            } finally {
                              setBusy(false);
                            }
                          }}
                        >
                          <Text style={styles.linkDanger}>
                            {t('org.warehouse.tools.deleteShort', null, 'Delete')}
                          </Text>
                        </Pressable>
                      ) : null}
                    </View>
                  ) : null}
                </View>
                <Pressable
                  onPress={() => {
                    if (navigation) {
                      navigateToOrgToolAssetDetail(navigation, {
                        orgId: organizationId,
                        assetId: asset.id,
                      });
                    }
                  }}
                >
                  <Text style={styles.meta} numberOfLines={1}>
                    {asset.material?.name || ''}
                    {asset.material?.name ? ' · ' : ''}
                    {statusLabel(t, asset.status)}
                    {asset.kit?.name ? ` · ${asset.kit.name}` : ''}
                    {asset.current_employee?.display_name
                      ? ` · ${asset.current_employee.display_name}`
                      : ''}
                  </Text>
                </Pressable>
              </View>
            );
          })
        )}
      </AppCard>

      {canManage ? (
        <AppCard style={styles.card} contentStyle={CARD_SURFACE}>
          <Text style={styles.section}>
            {t('org.warehouse.tools.kitsSection', null, 'Kits (bundles)')}
          </Text>
          <Text style={styles.hint}>
            {t(
              'org.warehouse.tools.kitsHint',
              null,
              'One QR on the bag issues every machine inside. A numbered tool can belong to only one kit, and cannot be added twice.',
            )}
          </Text>
          <TextInput
            label={t('org.warehouse.tools.kitName', null, 'Kit name')}
            value={kitName}
            onChangeText={setKitName}
            mode="outlined"
            style={styles.input}
            textColor={ON_CARD}
          />
          <TextInput
            label={t('org.warehouse.tools.kitCode', null, 'Kit code (optional)')}
            value={kitCode}
            onChangeText={setKitCode}
            mode="outlined"
            autoCapitalize="characters"
            style={styles.input}
            textColor={ON_CARD}
          />
          <Text style={styles.meta}>
            {t('org.warehouse.tools.pickToolsForKit', null, 'Pick in-stock tools for this kit:')}
          </Text>
          <OrgKitToolPicker
            assets={assets}
            selectedIds={kitAssetIds}
            onChangeSelectedIds={toggleKitAssetIds}
          />
          <Button mode="contained" loading={busy} disabled={busy} onPress={onCreateKit} style={{ marginTop: 8 }}>
            {t('org.warehouse.tools.createKit', null, 'Create kit')}
          </Button>

          {kits.map((kit) => (
            <View key={kit.id} style={styles.kitRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.assetTag}>{kit.name}</Text>
                <Text style={styles.meta} numberOfLines={2}>
                  {kit.code}
                  {` · ${kit.item_count || kit.items?.length || 0} `}
                  {t('org.warehouse.tools.toolsCount', null, 'tools')}
                  {Array.isArray(kit.items) && kit.items.length
                    ? ` · ${kit.items
                        .map((item) => item.asset?.asset_tag || item.asset_tag)
                        .filter(Boolean)
                        .join(', ')}`
                    : ''}
                </Text>
              </View>
              <Pressable
                onPress={() => withToken((token) => openToolKitLabel(token, organizationId, kit.id))}
                hitSlop={6}
              >
                <Text style={styles.link}>{t('org.warehouse.tools.printShort', null, 'Print')}</Text>
              </Pressable>
            </View>
          ))}
        </AppCard>
      ) : null}

      {canManage && blame.length ? (
        <AppCard style={styles.card} contentStyle={CARD_SURFACE}>
          <Text style={styles.section}>
            {t('org.warehouse.tools.blameTitle', null, 'Scrap by last holder')}
          </Text>
          <Text style={styles.hint}>
            {t(
              'org.warehouse.tools.blameHint',
              null,
              'Who held the numbered tool when it was written off — for negligence follow-up.',
            )}
          </Text>
          {blame.map((row) => (
            <Text key={row.employee_id} style={styles.meta}>
              {row.display_name}: {row.scrap_count}
            </Text>
          ))}
        </AppCard>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 12 },
  title: { color: ON_CARD, fontSize: 17, fontWeight: '700', marginBottom: 6 },
  section: { color: ON_CARD, fontSize: 15, fontWeight: '700', marginBottom: 6 },
  hint: { color: ON_CARD_MUTED, fontSize: 12, lineHeight: 17, marginBottom: 8 },
  error: { color: '#B91C1C', marginBottom: 8 },
  message: { color: '#166534', marginBottom: 8 },
  input: { marginBottom: 8, backgroundColor: '#fff' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginTop: 4 },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  chip: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#F8FAFC',
  },
  chipActive: { borderColor: '#0F172A', backgroundColor: '#0F172A' },
  chipText: { color: ON_CARD, fontSize: 12 },
  chipTextActive: { color: '#fff' },
  chipMeta: { color: ON_CARD_MUTED, fontSize: 10, marginTop: 2 },
  assetRow: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E2E8F0',
    paddingVertical: 8,
  },
  assetMain: { flex: 1 },
  assetTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  assetTag: { color: ON_CARD, fontWeight: '700', fontSize: 14, flexShrink: 1 },
  meta: { color: ON_CARD_MUTED, fontSize: 12, marginTop: 2 },
  selectedMark: { color: '#166534', fontSize: 11, marginTop: 2 },
  assetActions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10, flexShrink: 0 },
  kitRow: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E2E8F0',
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  link: { color: '#1D4ED8', fontSize: 12, fontWeight: '700' },
  linkSelected: { color: '#166534' },
  linkDanger: { color: '#B91C1C', fontSize: 12, fontWeight: '700' },
  scanBox: {
    marginTop: 8,
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
});
