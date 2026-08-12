import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityIndicator, Button, TextInput } from 'react-native-paper';

import AppCard from '../ui/AppCard';
import {
  createMaterialScrap,
  createToolKit,
  generateToolAssets,
  issueToolAsset,
  issueToolKit,
  listOrgMaterials,
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

export default function OrgToolAssetsPanel({ organizationId, canManage }) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [assets, setAssets] = useState([]);
  const [kits, setKits] = useState([]);
  const [durableMaterials, setDurableMaterials] = useState([]);
  const [workforce, setWorkforce] = useState([]);
  const [blame, setBlame] = useState([]);

  const [genMaterialId, setGenMaterialId] = useState(null);
  const [genCount, setGenCount] = useState('1');
  const [genPrefix, setGenPrefix] = useState('');

  const selectedDurable = useMemo(
    () => durableMaterials.find((row) => Number(row.id || row.material_id) === Number(genMaterialId)),
    [durableMaterials, genMaterialId],
  );
  const availableToNumber = selectedDurable
    ? Number(selectedDurable.tool_assets_available_to_number ?? 0)
    : 0;

  const pickDurableMaterial = (row) => {
    const mid = row.id || row.material_id || row.material?.id;
    setGenMaterialId(mid);
    const avail = Number(row.tool_assets_available_to_number ?? 0);
    setGenCount(String(Math.max(0, avail)));
    setGenPrefix(row.suggested_tag_prefix || '');
  };
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
      const [assetsRes, kitsRes, matsRes, wfRes] = await Promise.all([
        listToolAssets(token, organizationId, { limit: 200 }),
        listToolKits(token, organizationId, { active: '1' }),
        listOrgMaterials(token, organizationId, { durable_tool: '1', limit: 80 }),
        listOrgWorkforce(token, organizationId, { active: '1' }),
      ]);
      setAssets(assetsRes.results || []);
      setKits(kitsRes.results || []);
      setDurableMaterials(matsRes.results || matsRes.materials || []);
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

  const onGenerate = async () => {
    if (!genMaterialId) {
      setMessage(t('org.warehouse.tools.pickMaterial', null, 'Pick a durable tool material.'));
      return;
    }
    const n = Number(genCount) || 0;
    if (n < 1) {
      setMessage(
        t(
          'org.warehouse.tools.noneAvailable',
          null,
          'No stock left to number. Add quantity on Materials first, or you already numbered all on-hand units.',
        ),
      );
      return;
    }
    if (availableToNumber > 0 && n > availableToNumber) {
      setMessage(
        t(
          'org.warehouse.tools.tooMany',
          { available: availableToNumber },
          `Only ${availableToNumber} available to number from current stock.`,
        ),
      );
      return;
    }
    setBusy(true);
    setMessage('');
    try {
      await withToken((token) =>
        generateToolAssets(token, organizationId, {
          material_id: genMaterialId,
          count: n,
          tag_prefix: genPrefix.trim(),
        }),
      );
      setMessage(
        t(
          'org.warehouse.tools.generated',
          null,
          'Numbered tools created. Print labels and stick them on.',
        ),
      );
      setSelectedIds([]);
      await load();
    } catch (e) {
      setMessage(e.message || t('org.warehouse.tools.generateError', null, 'Could not number tools.'));
    } finally {
      setBusy(false);
    }
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

  const onIssueAsset = async (assetId) => {
    if (!employeeId) {
      setMessage(t('org.warehouse.tools.pickEmployee', null, 'Pick who receives the tool.'));
      return;
    }
    setBusy(true);
    try {
      await withToken((token) =>
        issueToolAsset(token, organizationId, assetId, { employee_id: employeeId }),
      );
      await load();
    } catch (e) {
      setMessage(e.message || t('org.warehouse.tools.issueError', null, 'Could not issue tool.'));
    } finally {
      setBusy(false);
    }
  };

  const onReturnAsset = async (assetId) => {
    setBusy(true);
    try {
      await withToken((token) => returnToolAsset(token, organizationId, assetId));
      await load();
    } catch (e) {
      setMessage(e.message || t('org.warehouse.tools.returnError', null, 'Could not return tool.'));
    } finally {
      setBusy(false);
    }
  };

  const onScrapAsset = (asset) => {
    Alert.alert(
      t('org.warehouse.tools.scrapTitle', null, 'Write off this numbered tool?'),
      t(
        'org.warehouse.tools.scrapBodyReuse',
        { tag: asset.asset_tag },
        `Scrap ${asset.asset_tag}: −1 from stock. The number is freed — after you buy a replacement and add stock, number again to reuse ${asset.asset_tag} and reprint/stick the label.`,
      ),
      [
        { text: t('common.cancel', null, 'Cancel'), style: 'cancel' },
        {
          text: t('org.warehouse.intake.scrapMaterial', null, 'Write off (scrap)'),
          style: 'destructive',
          onPress: async () => {
            setBusy(true);
            try {
              await withToken((token) =>
                createMaterialScrap(token, organizationId, {
                  reason: 'broken',
                  lines: [{ tool_asset_id: asset.id }],
                }),
              );
              setMessage(
                t(
                  'org.warehouse.tools.scrapDoneReuse',
                  { tag: asset.asset_tag },
                  `Scrapped. Add the new unit to stock, then number 1× with the same prefix to get ${asset.asset_tag} again.`,
                ),
              );
              await load();
            } catch (e) {
              setMessage(e.message || t('org.warehouse.intake.scrapMaterialError', null, 'Could not write off material.'));
            } finally {
              setBusy(false);
            }
          },
        },
      ],
    );
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

  const toggleKitAsset = (id) => {
    setKitAssetIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id].slice(0, 40),
    );
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
        <AppCard style={styles.card} contentStyle={CARD_SURFACE}>
          <Text style={styles.section}>
            {t('org.warehouse.tools.numberSection', null, 'Number new tools')}
          </Text>
          <Text style={styles.hint}>
            {t(
              'org.warehouse.tools.prefixHint',
              null,
              'Each SKU gets its own prefix: drills → BO-001…, grinders → FLE-001…. You can only number units that are on stock and not numbered yet.',
            )}
          </Text>
          <View style={styles.chipWrap}>
            {durableMaterials.map((row) => {
              const mid = row.id || row.material_id || row.material?.id;
              const name = row.label || row.name || row.material?.name || `#${mid}`;
              const avail = Number(row.tool_assets_available_to_number ?? 0);
              const numbered = Number(row.tool_assets_numbered ?? 0);
              const stock = row.quantity_on_hand != null ? String(row.quantity_on_hand) : '?';
              const active = genMaterialId === mid;
              return (
                <Pressable
                  key={mid}
                  onPress={() => pickDurableMaterial(row)}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {name}
                    {row.suggested_tag_prefix ? ` · ${row.suggested_tag_prefix}` : ''}
                  </Text>
                  <Text style={[styles.chipMeta, active && styles.chipTextActive]}>
                    {t(
                      'org.warehouse.tools.stockNumberedMeta',
                      { stock, numbered, avail },
                      `stock ${stock} · numbered ${numbered} · left ${avail}`,
                    )}
                  </Text>
                </Pressable>
              );
            })}
            {!durableMaterials.length ? (
              <Text style={styles.hint}>
                {t(
                  'org.warehouse.tools.noDurable',
                  null,
                  'Mark materials as durable tools first (Materials tab).',
                )}
              </Text>
            ) : null}
          </View>
          <TextInput
            label={t('org.warehouse.tools.count', null, 'How many')}
            value={genCount}
            onChangeText={setGenCount}
            mode="outlined"
            keyboardType="number-pad"
            style={styles.input}
            textColor={ON_CARD}
          />
          {selectedDurable ? (
            <Text style={styles.hint}>
              {t(
                'org.warehouse.tools.availableHint',
                { n: availableToNumber },
                `${availableToNumber} can still be numbered from current stock.`,
              )}
            </Text>
          ) : null}
          <TextInput
            label={t('org.warehouse.tools.prefix', null, 'Tag prefix (optional)')}
            value={genPrefix}
            onChangeText={setGenPrefix}
            mode="outlined"
            autoCapitalize="characters"
            style={styles.input}
            textColor={ON_CARD}
            placeholder="BO"
          />
          <Button
            mode="contained"
            loading={busy}
            disabled={busy || availableToNumber < 1}
            onPress={onGenerate}
          >
            {t('org.warehouse.tools.generate', null, 'Create numbered instances')}
          </Button>
        </AppCard>
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
                <Pressable onPress={() => canManage && toggleSelect(asset.id)} style={{ flex: 1 }}>
                  <Text style={styles.assetTag}>{asset.asset_tag}</Text>
                  <Text style={styles.meta}>
                    {asset.material?.name || ''} · {statusLabel(t, asset.status)}
                    {asset.current_employee?.display_name
                      ? ` · ${asset.current_employee.display_name}`
                      : ''}
                  </Text>
                  {selected ? (
                    <Text style={styles.selectedMark}>
                      {t('org.warehouse.tools.selected', null, 'Selected for print')}
                    </Text>
                  ) : null}
                </Pressable>
                {canManage ? (
                  <View style={styles.assetActions}>
                    <Button
                      compact
                      onPress={() =>
                        withToken((token) => openToolAssetLabel(token, organizationId, asset.id))
                      }
                      textColor={ON_CARD}
                    >
                      {t('org.warehouse.printLabel', null, 'Print stamp')}
                    </Button>
                    {asset.status === 'in_stock' ? (
                      <Button compact onPress={() => onIssueAsset(asset.id)} disabled={busy}>
                        {t('org.warehouse.tools.issue', null, 'Issue')}
                      </Button>
                    ) : null}
                    {asset.status === 'issued' ? (
                      <Button compact onPress={() => onReturnAsset(asset.id)} disabled={busy}>
                        {t('org.warehouse.tools.return', null, 'Return')}
                      </Button>
                    ) : null}
                    {asset.status !== 'scrapped' ? (
                      <Button compact textColor="#B91C1C" onPress={() => onScrapAsset(asset)} disabled={busy}>
                        {t('org.warehouse.intake.scrapMaterial', null, 'Write off (scrap)')}
                      </Button>
                    ) : null}
                  </View>
                ) : null}
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
              'One QR on the bag issues every machine inside. A tool can belong to only one kit.',
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
          <View style={styles.chipWrap}>
            {assets
              .filter((a) => a.status === 'in_stock')
              .map((a) => {
                const active = kitAssetIds.includes(a.id);
                return (
                  <Pressable
                    key={a.id}
                    onPress={() => toggleKitAsset(a.id)}
                    style={[styles.chip, active && styles.chipActive]}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>
                      {a.asset_tag}
                    </Text>
                  </Pressable>
                );
              })}
          </View>
          <Button mode="contained" loading={busy} disabled={busy} onPress={onCreateKit} style={{ marginTop: 8 }}>
            {t('org.warehouse.tools.createKit', null, 'Create kit')}
          </Button>

          {kits.map((kit) => (
            <View key={kit.id} style={styles.assetRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.assetTag}>{kit.name}</Text>
                <Text style={styles.meta}>
                  {kit.code} · {kit.item_count || kit.items?.length || 0}{' '}
                  {t('org.warehouse.tools.toolsCount', null, 'tools')}
                </Text>
              </View>
              <Button
                compact
                onPress={() => withToken((token) => openToolKitLabel(token, organizationId, kit.id))}
                textColor={ON_CARD}
              >
                {t('org.warehouse.printLabel', null, 'Print stamp')}
              </Button>
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
    paddingVertical: 10,
    flexDirection: 'row',
    gap: 8,
  },
  assetTag: { color: ON_CARD, fontWeight: '700', fontSize: 14 },
  meta: { color: ON_CARD_MUTED, fontSize: 12, marginTop: 2 },
  selectedMark: { color: '#166534', fontSize: 11, marginTop: 2 },
  assetActions: { alignItems: 'flex-end' },
  scanBox: {
    marginTop: 8,
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
});
