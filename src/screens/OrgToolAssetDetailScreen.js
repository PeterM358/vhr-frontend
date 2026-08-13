import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityIndicator, Button, Text, TextInput } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';

import ScreenBackground from '../components/ScreenBackground';
import AppCard from '../components/ui/AppCard';
import OrgAppHeader from '../components/org/OrgAppHeader';
import {
  createMaterialScrap,
  deleteToolAsset,
  getToolAsset,
  issueToolAsset,
  openToolAssetLabel,
  returnToolAsset,
  updateToolAsset,
} from '../api/orgWarehouse';
import { listOrgWorkforce } from '../api/orgWorkforce';
import { confirmMessage } from '../utils/crossPlatformAlert';
import { resolveActiveOrganizationId } from '../utils/orgWorkspace';
import { navigateToOrgWarehouse } from '../navigation/webNavigation';
import { useTranslation } from '../i18n';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { COLORS } from '../constants/colors';
import { useScrollContentBottomPadding } from '../utils/mobileWebInsets';

const ON_CARD = '#0F172A';
const ON_CARD_MUTED = '#475569';

function statusLabel(t, status) {
  const map = {
    in_stock: t('org.warehouse.tools.statusInStock', null, 'In stock'),
    issued: t('org.warehouse.tools.statusIssued', null, 'Issued'),
    scrapped: t('org.warehouse.tools.statusScrapped', null, 'Scrapped'),
    lost: t('org.warehouse.tools.statusLost', null, 'Lost'),
  };
  return map[status] || status;
}

export default function OrgToolAssetDetailScreen({ navigation, route }) {
  const { t } = useTranslation();
  const routeOrgId = route?.params?.organizationId || route?.params?.orgId;
  const assetId = route?.params?.assetId;
  const scrollBottomPadding = useScrollContentBottomPadding(40);

  const [orgId, setOrgId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [asset, setAsset] = useState(null);
  const [notes, setNotes] = useState('');
  const [serial, setSerial] = useState('');
  const [employees, setEmployees] = useState([]);
  const [employeeId, setEmployeeId] = useState(null);

  const onBack = useCallback(() => {
    navigateToOrgWarehouse(navigation, {
      orgId: routeOrgId || orgId,
      tab: 'tools',
    });
  }, [navigation, orgId, routeOrgId]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      const resolved = await resolveActiveOrganizationId(routeOrgId);
      setOrgId(resolved);
      if (!resolved || !assetId) {
        setError(t('org.warehouse.tools.notFound', null, 'Tool not found.'));
        return;
      }
      const [row, workforce] = await Promise.all([
        getToolAsset(token, resolved, assetId),
        listOrgWorkforce(token, resolved, { status: 'active' }).catch(() => ({ results: [] })),
      ]);
      setAsset(row);
      setNotes(row.notes || '');
      setSerial(row.serial_number || '');
      const members = Array.isArray(workforce?.results)
        ? workforce.results
        : Array.isArray(workforce)
          ? workforce
          : [];
      setEmployees(
        members
          .filter((m) => m.employee_id)
          .map((m) => ({
            id: m.employee_id,
            label: m.display_name || m.employee_display_name || `#${m.employee_id}`,
          })),
      );
    } catch (e) {
      setError(e.message || t('org.warehouse.tools.loadError', null, 'Could not load tools.'));
    } finally {
      setLoading(false);
    }
  }, [assetId, routeOrgId, t]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const materialName = useMemo(
    () => asset?.material?.name || asset?.material?.label || '',
    [asset],
  );

  const onSave = async () => {
    if (!orgId || !assetId) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      const row = await updateToolAsset(token, orgId, assetId, {
        notes,
        serial_number: serial,
      });
      setAsset(row);
      setMessage(t('org.warehouse.tools.saved', null, 'Tool saved.'));
    } catch (e) {
      setError(e.message || t('org.warehouse.intake.saveError', null, 'Could not save.'));
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async () => {
    if (!orgId || !assetId) return;
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
    setError('');
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      await deleteToolAsset(token, orgId, assetId);
      onBack();
    } catch (e) {
      setError(e.message || t('org.warehouse.tools.deleteError', null, 'Could not delete.'));
    } finally {
      setBusy(false);
    }
  };

  const onScrap = async () => {
    if (!orgId || !asset) return;
    const ok = await confirmMessage(
      t('org.warehouse.intake.scrapMaterialTitle', null, 'Write off from stock?'),
      t(
        'org.warehouse.tools.scrapWriteOffBody',
        null,
        'Real write-off / брак: decreases stock by 1 and frees the tag for a replacement.',
      ),
    );
    if (!ok) return;
    setBusy(true);
    setError('');
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      await createMaterialScrap(token, orgId, {
        reason: 'broken',
        lines: [
          {
            material_id: asset.material_id,
            quantity: '1',
            tool_asset_id: asset.id,
          },
        ],
      });
      await load();
    } catch (e) {
      setError(e.message || t('org.warehouse.intake.scrapError', null, 'Could not write off.'));
    } finally {
      setBusy(false);
    }
  };

  const onIssue = async () => {
    if (!orgId || !assetId || !employeeId) {
      setError(t('org.warehouse.tools.pickEmployee', null, 'Pick who receives the tool.'));
      return;
    }
    setBusy(true);
    setError('');
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      await issueToolAsset(token, orgId, assetId, { employee_id: employeeId });
      await load();
      setMessage(t('org.warehouse.tools.issuedOk', null, 'Issued to employee.'));
    } catch (e) {
      setError(e.message || t('org.warehouse.tools.issueError', null, 'Could not issue.'));
    } finally {
      setBusy(false);
    }
  };

  const onReturn = async () => {
    if (!orgId || !assetId) return;
    setBusy(true);
    setError('');
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      await returnToolAsset(token, orgId, assetId);
      await load();
      setMessage(t('org.warehouse.tools.returnedOk', null, 'Returned to stock.'));
    } catch (e) {
      setError(e.message || t('org.warehouse.tools.returnError', null, 'Could not return.'));
    } finally {
      setBusy(false);
    }
  };

  const onPrint = async () => {
    if (!orgId || !assetId) return;
    setBusy(true);
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      await openToolAssetLabel(token, orgId, assetId);
    } catch (e) {
      setError(e.message || t('org.warehouse.tools.printError', null, 'Could not open label.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScreenBackground>
      <OrgAppHeader
        title={asset?.asset_tag || t('org.warehouse.tools.tool', null, 'Tool')}
        onBack={onBack}
      />
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: scrollBottomPadding }]}>
        {loading ? (
          <ActivityIndicator style={{ marginTop: 40 }} color={COLORS.primary} />
        ) : (
          <AppCard style={styles.card}>
            {error ? <Text style={styles.error}>{error}</Text> : null}
            {message ? <Text style={styles.message}>{message}</Text> : null}
            <Text style={styles.tag}>{asset?.asset_tag}</Text>
            <Text style={styles.meta}>
              {materialName}
              {asset?.status ? ` · ${statusLabel(t, asset.status)}` : ''}
            </Text>
            <Text style={styles.hint}>
              {t(
                'org.warehouse.tools.deleteVsScrapHint',
                null,
                'Delete = mistaken number (stock unchanged). Scrap = broken machine (stock −1).',
              )}
            </Text>

            <TextInput
              label={t('org.warehouse.tools.serial', null, 'Serial number')}
              value={serial}
              onChangeText={setSerial}
              mode="outlined"
              style={styles.input}
              textColor={ON_CARD}
            />
            <TextInput
              label={t('org.warehouse.tools.notes', null, 'Notes')}
              value={notes}
              onChangeText={setNotes}
              mode="outlined"
              style={styles.input}
              multiline
              textColor={ON_CARD}
            />

            {asset?.status === 'in_stock' ? (
              <View style={styles.block}>
                <Text style={styles.label}>
                  {t('org.warehouse.tools.receiver', null, 'Receiver')}
                </Text>
                <View style={styles.chipRow}>
                  {employees.map((emp) => {
                    const active = employeeId === emp.id;
                    return (
                      <Button
                        key={emp.id}
                        mode={active ? 'contained' : 'outlined'}
                        compact
                        onPress={() => setEmployeeId(emp.id)}
                        textColor={active ? undefined : ON_CARD}
                      >
                        {emp.label}
                      </Button>
                    );
                  })}
                </View>
              </View>
            ) : null}

            <View style={styles.actions}>
              <Button mode="contained" onPress={onSave} loading={busy} disabled={busy}>
                {t('common.save', null, 'Save')}
              </Button>
              <Button mode="outlined" onPress={onPrint} disabled={busy} textColor={ON_CARD}>
                {t('org.warehouse.tools.printStamp', null, 'Print stamp')}
              </Button>
              {asset?.status === 'in_stock' ? (
                <Button mode="outlined" onPress={onIssue} disabled={busy} textColor={ON_CARD}>
                  {t('org.warehouse.tools.issue', null, 'Issue')}
                </Button>
              ) : null}
              {asset?.status === 'issued' ? (
                <Button mode="outlined" onPress={onReturn} disabled={busy} textColor={ON_CARD}>
                  {t('org.warehouse.tools.return', null, 'Return')}
                </Button>
              ) : null}
              {asset?.status !== 'scrapped' ? (
                <Button mode="outlined" onPress={onScrap} disabled={busy} textColor="#B91C1C">
                  {t('org.warehouse.intake.scrapMaterial', null, 'Write off (scrap)')}
                </Button>
              ) : null}
              {asset?.status !== 'issued' ? (
                <Button mode="text" onPress={onDelete} disabled={busy} textColor="#B91C1C">
                  {t('org.warehouse.tools.deleteNumber', null, 'Delete number')}
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
  tag: { color: ON_CARD, fontSize: 22, fontWeight: '700' },
  label: { color: ON_CARD, fontWeight: '600', fontSize: 14 },
  meta: { color: ON_CARD_MUTED, fontSize: 14 },
  hint: { color: ON_CARD_MUTED, fontSize: 13, lineHeight: 18 },
  error: { color: '#B91C1C', fontSize: 13 },
  message: { color: '#047857', fontSize: 13 },
  input: { backgroundColor: '#fff' },
  block: { gap: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8, alignItems: 'center' },
});
