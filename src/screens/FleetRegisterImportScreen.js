import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Linking, Platform, ScrollView, StyleSheet, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ActivityIndicator,
  Button,
  Chip,
  Divider,
  Menu,
  Text,
  TextInput,
} from 'react-native-paper';

import ScreenBackground from '../components/ScreenBackground';
import AppNavigationBar from '../components/common/AppNavigationBar';
import AppCard from '../components/ui/AppCard';
import { useTranslation } from '../i18n';
import {
  bulkDecideFleetImportRows,
  confirmFleetImport,
  fleetImportErrorReportUrl,
  getFleetImportRows,
  listOrganizations,
  organizationsWithFleetImportAccess,
  patchFleetImportRow,
  uploadFleetRegister,
} from '../api/fleetImport';
import { showMessage } from '../utils/crossPlatformAlert';

const STEPS = ['organization', 'upload', 'preview', 'result'];

const STATUSES_NEEDING_REASON = new Set([
  'ambiguous',
  'plate_vin_conflict',
  'invalid_vin',
  'needs_review',
  'foreign_conflict',
  'personal_match',
]);

function rowStatusLabel(t, status) {
  const key = `fleetImport.status.${status}`;
  const translated = t(key);
  return translated === key ? status : translated;
}

export default function FleetRegisterImportScreen({ navigation }) {
  const { t, locale } = useTranslation();
  const [step, setStep] = useState('organization');
  const [loading, setLoading] = useState(true);
  const [organizations, setOrganizations] = useState([]);
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [batch, setBatch] = useState(null);
  const [rows, setRows] = useState([]);
  const [confirming, setConfirming] = useState(false);
  const [bulkWorking, setBulkWorking] = useState(false);
  const [result, setResult] = useState(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');

  const manageableOrgs = useMemo(
    () => organizationsWithFleetImportAccess(organizations),
    [organizations],
  );

  const unresolvedCount = useMemo(
    () => rows.filter((row) => row.resolution === 'unresolved').length,
    [rows],
  );

  const loadOrganizations = useCallback(async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('@access_token');
      const data = await listOrganizations(token);
      setOrganizations(Array.isArray(data) ? data : []);
    } catch (error) {
      showMessage(t('fleetImport.errors.loadOrganizations'), error.message);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadOrganizations();
  }, [loadOrganizations]);

  const refreshRows = useCallback(async (orgId, batchId) => {
    const token = await AsyncStorage.getItem('@access_token');
    const data = await getFleetImportRows(token, orgId, batchId);
    setRows(data.rows || []);
    setBatch(data.batch || null);
  }, []);

  const pickSpreadsheet = () =>
    new Promise((resolve) => {
      if (Platform.OS === 'web' && typeof document !== 'undefined') {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        input.onchange = () => {
          const picked = input.files?.[0];
          resolve(
            picked
              ? { file: picked, fileName: picked.name, mimeType: picked.type }
              : null,
          );
        };
        input.click();
        return;
      }
      showMessage(t('fleetImport.errors.uploadWebOnlyTitle'), t('fleetImport.errors.uploadWebOnlyBody'));
      resolve(null);
    });

  const handleUpload = async () => {
    if (!selectedOrg) return;
    const picked = await pickSpreadsheet();
    if (!picked) return;
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('@access_token');
      const uploaded = await uploadFleetRegister(token, selectedOrg.id, picked);
      setBatch(uploaded);
      await refreshRows(selectedOrg.id, uploaded.batch_id);
      setStep('preview');
      if (uploaded.idempotent_replay) {
        showMessage(t('fleetImport.uploadReplayTitle'), t('fleetImport.uploadReplayBody'));
      }
    } catch (error) {
      showMessage(t('fleetImport.errors.uploadFailed'), error.message);
    } finally {
      setLoading(false);
    }
  };

  const applyRowDecision = async (row, resolution) => {
    if (!selectedOrg || !batch) return;
    const payload = { resolution };
    if (STATUSES_NEEDING_REASON.has(row.duplicate_status) && resolution !== 'skip') {
      payload.reason = overrideReason.trim() || t('fleetImport.defaultOverrideReason');
    }
    if (resolution === 'link_existing' && row.duplicate_candidates?.[0]?.vehicle_id) {
      payload.link_vehicle_id = row.duplicate_candidates[0].vehicle_id;
    }
    try {
      const token = await AsyncStorage.getItem('@access_token');
      await patchFleetImportRow(token, selectedOrg.id, batch.batch_id, row.id, payload);
      await refreshRows(selectedOrg.id, batch.batch_id);
    } catch (error) {
      showMessage(t('fleetImport.errors.rowDecisionFailed'), error.message);
    }
  };

  const applyBulkDecision = async (resolution, { onlyStatuses } = {}) => {
    if (!selectedOrg || !batch || unresolvedCount === 0) return;
    const needsReason =
      resolution !== 'skip' &&
      rows.some(
        (row) =>
          row.resolution === 'unresolved' &&
          (!onlyStatuses || onlyStatuses.includes(row.duplicate_status)) &&
          STATUSES_NEEDING_REASON.has(row.duplicate_status),
      );
    const reason = overrideReason.trim() || t('fleetImport.defaultOverrideReason');
    if (needsReason && !overrideReason.trim() && resolution === 'create') {
      // Still send default reason so bulk create covers identity-review rows.
    }
    setBulkWorking(true);
    try {
      const token = await AsyncStorage.getItem('@access_token');
      const payload = {
        resolution,
        unresolved_only: true,
      };
      if (resolution !== 'skip') {
        payload.reason = reason;
      }
      if (onlyStatuses?.length) {
        payload.only_statuses = onlyStatuses;
      }
      const data = await bulkDecideFleetImportRows(
        token,
        selectedOrg.id,
        batch.batch_id,
        payload,
      );
      setBatch(data.batch || null);
      await refreshRows(selectedOrg.id, batch.batch_id);
      if (data.skipped_need_reason_count > 0) {
        showMessage(
          t('fleetImport.bulkPartialTitle'),
          t('fleetImport.bulkPartialBody', {
            updated: data.updated_count,
            skipped: data.skipped_need_reason_count,
          }),
        );
      }
    } catch (error) {
      showMessage(t('fleetImport.errors.bulkDecisionFailed'), error.message);
    } finally {
      setBulkWorking(false);
    }
  };

  const handleConfirm = async () => {
    if (!selectedOrg || !batch || unresolvedCount > 0) return;
    setConfirming(true);
    try {
      const token = await AsyncStorage.getItem('@access_token');
      const data = await confirmFleetImport(token, selectedOrg.id, batch.batch_id);
      setResult(data);
      setBatch(data.batch);
      setStep('result');
    } catch (error) {
      showMessage(t('fleetImport.errors.confirmFailed'), error.message);
    } finally {
      setConfirming(false);
    }
  };

  const downloadErrors = async () => {
    if (!selectedOrg || !batch) return;
    const token = await AsyncStorage.getItem('@access_token');
    const url = fleetImportErrorReportUrl(selectedOrg.id, batch.batch_id, locale);
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) {
        showMessage(t('fleetImport.errors.downloadFailed'), t('fleetImport.errors.downloadFailed'));
        return;
      }
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = `fleet-import-${batch.batch_id}-errors.csv`;
      anchor.click();
      URL.revokeObjectURL(objectUrl);
      return;
    }
    Linking.openURL(url);
  };

  if (loading && step === 'organization' && organizations.length === 0) {
    return (
      <ScreenBackground>
        <AppNavigationBar title={t('fleetImport.title')} onBack={() => navigation.goBack()} />
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      </ScreenBackground>
    );
  }

  if (!loading && manageableOrgs.length === 0) {
    return (
      <ScreenBackground>
        <AppNavigationBar title={t('fleetImport.title')} onBack={() => navigation.goBack()} />
        <View style={styles.center}>
          <Text>{t('fleetImport.noOrganizations')}</Text>
        </View>
      </ScreenBackground>
    );
  }

  return (
    <ScreenBackground>
      <AppNavigationBar title={t('fleetImport.title')} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.stepLabel}>
          {t('fleetImport.stepLabel', { step: STEPS.indexOf(step) + 1, total: STEPS.length })}
        </Text>

        {step === 'organization' ? (
          <AppCard>
            <Text variant="titleMedium">{t('fleetImport.selectOrganization')}</Text>
            <Menu
              visible={menuVisible}
              onDismiss={() => setMenuVisible(false)}
              anchor={
                <Button mode="outlined" onPress={() => setMenuVisible(true)} style={styles.menuButton}>
                  {selectedOrg?.display_name || t('fleetImport.chooseOrganization')}
                </Button>
              }
            >
              {manageableOrgs.map((org) => (
                <Menu.Item
                  key={org.id}
                  title={org.display_name}
                  onPress={() => {
                    setSelectedOrg(org);
                    setMenuVisible(false);
                  }}
                />
              ))}
            </Menu>
            <Button
              mode="contained"
              disabled={!selectedOrg}
              onPress={() => setStep('upload')}
              style={styles.primaryButton}
            >
              {t('fleetImport.continue')}
            </Button>
          </AppCard>
        ) : null}

        {step === 'upload' ? (
          <AppCard>
            <Text variant="titleMedium">{t('fleetImport.uploadTitle')}</Text>
            <Text style={styles.helper}>{t('fleetImport.uploadHelper')}</Text>
            <Text style={styles.warning}>{t('fleetImport.fileRetainedWarning')}</Text>
            <Button mode="contained" loading={loading} onPress={handleUpload} style={styles.primaryButton}>
              {t('fleetImport.uploadAction')}
            </Button>
          </AppCard>
        ) : null}

        {step === 'preview' ? (
          <AppCard>
            <Text variant="titleMedium">{t('fleetImport.previewTitle')}</Text>
            <Text>
              {t('fleetImport.previewSummary', {
                count: batch?.row_count || 0,
                unresolved: unresolvedCount,
              })}
            </Text>
            <Text style={styles.helper}>{t('fleetImport.identityReviewHint')}</Text>
            <TextInput
              label={t('fleetImport.overrideReason')}
              value={overrideReason}
              onChangeText={setOverrideReason}
              style={styles.input}
            />
            {unresolvedCount > 0 ? (
              <View style={styles.bulkRow}>
                <Button
                  mode="contained-tonal"
                  disabled={bulkWorking}
                  loading={bulkWorking}
                  onPress={() => applyBulkDecision('create')}
                  style={styles.bulkButton}
                >
                  {t('fleetImport.bulkCreateAll')}
                </Button>
                <Button
                  mode="outlined"
                  disabled={bulkWorking}
                  onPress={() => applyBulkDecision('skip')}
                  style={styles.bulkButton}
                >
                  {t('fleetImport.bulkSkipAll')}
                </Button>
                <Button
                  mode="text"
                  disabled={bulkWorking}
                  onPress={() => applyBulkDecision('create', { onlyStatuses: ['needs_review'] })}
                  style={styles.bulkButton}
                >
                  {t('fleetImport.bulkCreateIdentityReview')}
                </Button>
              </View>
            ) : null}
            {rows.map((row) => (
              <View key={row.id} style={styles.rowCard}>
                <Text style={styles.rowTitle}>
                  #{row.row_number} {row.normalized?.license_plate || row.normalized?.display_name || '—'}
                </Text>
                <Text style={styles.rowMeta}>
                  {t('fleetImport.rowStatus')}: {rowStatusLabel(t, row.duplicate_status)} ·{' '}
                  {t('fleetImport.resolution')}: {row.resolution}
                </Text>
                {row.result_error_message ? (
                  <Text style={styles.rowError}>{row.result_error_message}</Text>
                ) : null}
                <View style={styles.chipRow}>
                  <Chip onPress={() => applyRowDecision(row, 'create')}>{t('fleetImport.decisionCreate')}</Chip>
                  <Chip onPress={() => applyRowDecision(row, 'link_existing')}>{t('fleetImport.decisionLink')}</Chip>
                  <Chip onPress={() => applyRowDecision(row, 'skip')}>{t('fleetImport.decisionSkip')}</Chip>
                </View>
                <Divider style={styles.divider} />
              </View>
            ))}
            <Button
              mode="contained"
              disabled={unresolvedCount > 0 || confirming}
              loading={confirming}
              onPress={handleConfirm}
              style={styles.primaryButton}
            >
              {t('fleetImport.confirmAction')}
            </Button>
            {unresolvedCount > 0 ? (
              <Text style={styles.warning}>{t('fleetImport.unresolvedBlocked')}</Text>
            ) : null}
          </AppCard>
        ) : null}

        {step === 'result' ? (
          <AppCard>
            <Text variant="titleMedium">{t('fleetImport.resultTitle')}</Text>
            <Text>
              {t('fleetImport.resultSummary', {
                created: result?.batch?.created_count ?? batch?.created_count ?? 0,
                updated: result?.batch?.updated_count ?? batch?.updated_count ?? 0,
                skipped: result?.batch?.skipped_count ?? batch?.skipped_count ?? 0,
                rejected: result?.batch?.rejected_count ?? batch?.rejected_count ?? 0,
              })}
            </Text>
            <Button mode="outlined" onPress={downloadErrors} style={styles.primaryButton}>
              {t('fleetImport.downloadErrors')}
            </Button>
            <Button
              mode="contained-tonal"
              onPress={() =>
                navigation.navigate('FleetDashboard', { organizationId: selectedOrg?.id })
              }
              style={styles.primaryButton}
            >
              {t('fleet.openFleet')}
            </Button>
            <Button mode="contained" onPress={() => navigation.goBack()} style={styles.primaryButton}>
              {t('fleetImport.done')}
            </Button>
          </AppCard>
        ) : null}
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  stepLabel: { marginBottom: 12, opacity: 0.8 },
  menuButton: { marginVertical: 12 },
  primaryButton: { marginTop: 12 },
  helper: { marginTop: 8, opacity: 0.85 },
  warning: { marginTop: 8, color: '#b45309' },
  input: { marginTop: 12, backgroundColor: 'transparent' },
  bulkRow: { marginTop: 12, gap: 8 },
  bulkButton: { alignSelf: 'stretch' },
  rowCard: { marginTop: 12 },
  rowTitle: { fontWeight: '600' },
  rowMeta: { opacity: 0.8, marginTop: 4 },
  rowError: { color: '#b91c1c', marginTop: 4 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  divider: { marginTop: 12 },
});
