import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from 'react-native-paper';
import { useTranslation } from '../i18n';

import AppNavigationBar from '../components/common/AppNavigationBar';
import FloatingCard from '../components/ui/FloatingCard';
import ScreenBackground from '../components/ScreenBackground';
import { useGoBackOr, useReturnToBack } from '../navigation/appNavBarBack';
import { navigateToVehicleDetail } from '../navigation/webNavigation';
import {
  getVehicleAccessSecurityCenter,
  respondToVehicleAccessRequest,
  revokeVehicleAccessGrant,
} from '../api/vehicleAccess';

const SCOPE_BASIC = 'BASIC_SERVICE_HISTORY';
const SCOPE_FULL = 'FULL_CUSTOMER_HISTORY';
const SCOPE_PARTS = 'PARTS_AND_LABOR';
const SCOPE_DOCS = 'CUSTOMER_DOCUMENTS';
const SCOPE_MEDIA = 'EVIDENCE_MEDIA';

function scopeLabel(t, scope) {
  const key = `vehicles.access.scopes.${scope}`;
  const translated = t(key);
  return translated === key ? scope : translated;
}

export default function VehicleHistoryAccessScreen({ navigation, route }) {
  const { t } = useTranslation();
  const vehicleId = route?.params?.vehicleId;
  const returnTo = route?.params?.returnTo;
  const returnParams = useMemo(() => {
    if (returnTo === 'VehicleDetail' && vehicleId) return { vehicleId };
    return undefined;
  }, [returnTo, vehicleId]);
  const returnToBack = useReturnToBack(navigation, returnTo, undefined, returnParams);
  const defaultBack = useGoBackOr(navigation, (nav) => {
    if (vehicleId) {
      navigateToVehicleDetail(nav, vehicleId);
      return;
    }
    nav?.goBack?.();
  });
  const goBack = returnTo ? returnToBack : defaultBack;
  const [loading, setLoading] = useState(true);
  const [payload, setPayload] = useState(null);
  const [actingId, setActingId] = useState(null);
  const [choiceByRequest, setChoiceByRequest] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Pending temporary history requests (not the legacy authorized-centers list).
      const data = await getVehicleAccessSecurityCenter(vehicleId);
      setPayload(data);
    } catch (err) {
      Alert.alert(t('common.error'), err.message || t('vehicles.access.loadError'));
    } finally {
      setLoading(false);
    }
  }, [vehicleId, t]);

  useEffect(() => {
    load();
  }, [load]);

  const getChoice = (requestId, requestedScope) => {
    const existing = choiceByRequest[requestId];
    if (existing) return existing;
    return {
      primary: requestedScope === SCOPE_FULL ? SCOPE_FULL : SCOPE_BASIC,
      parts: false,
      docs: false,
      media: false,
    };
  };

  const setChoice = (requestId, patch) => {
    setChoiceByRequest((prev) => {
      const base = prev[requestId] || { primary: SCOPE_BASIC, parts: false, docs: false, media: false };
      return { ...prev, [requestId]: { ...base, ...patch } };
    });
  };

  const buildScopes = (choice) => {
    if (choice.primary === SCOPE_FULL) {
      return [SCOPE_FULL];
    }
    const scopes = [SCOPE_BASIC];
    if (choice.parts) scopes.push(SCOPE_PARTS);
    if (choice.docs) scopes.push(SCOPE_DOCS);
    if (choice.media) scopes.push(SCOPE_MEDIA);
    return scopes;
  };

  const respond = async (requestId, action, scopes) => {
    setActingId(`${requestId}:${action}`);
    try {
      await respondToVehicleAccessRequest(requestId, { action, scopes });
      await load();
    } catch (err) {
      Alert.alert(t('common.error'), err.message || t('vehicles.access.actionError'));
    } finally {
      setActingId(null);
    }
  };

  const revoke = async (grantId) => {
    setActingId(`grant:${grantId}`);
    try {
      await revokeVehicleAccessGrant(grantId);
      await load();
    } catch (err) {
      Alert.alert(t('common.error'), err.message || t('vehicles.access.actionError'));
    } finally {
      setActingId(null);
    }
  };

  const pending = payload?.pending_requests || [];
  const grants = (payload?.active_grants || []).filter((g) => !g.revoked_at && g.is_active !== false);

  return (
    <ScreenBackground>
      <AppNavigationBar title={t('vehicles.access.title')} onBack={goBack} />
      <ScrollView contentContainerStyle={styles.content}>
        {loading ? <Text style={styles.muted}>{t('common.loading')}</Text> : null}

        <Text style={styles.sectionLabel}>{t('vehicles.access.pendingSection')}</Text>
        <Text style={styles.hint}>{t('vehicles.access.ownerChoiceHint')}</Text>
        {!loading && pending.length === 0 ? (
          <FloatingCard style={styles.card}>
            <Text style={styles.title}>{t('vehicles.access.noPending')}</Text>
            <Text style={styles.muted}>{t('vehicles.access.noPendingHint')}</Text>
          </FloatingCard>
        ) : null}
        {pending.map((item) => {
          const choice = getChoice(item.request_id, item.requested_scope);
          const extrasDisabled = choice.primary === SCOPE_FULL;
          return (
            <FloatingCard key={item.request_id} style={styles.card}>
              <Text style={styles.title}>{item.shop?.name || t('vehicles.access.shopFallback')}</Text>
              <Text style={styles.line}>
                {item.shop?.location || t('vehicles.access.locationUnknown')}
                {item.shop?.is_verified ? ` · ${t('vehicles.access.verified')}` : ''}
              </Text>
              <Text style={styles.line}>
                {t('vehicles.access.requestedScope')}: {scopeLabel(t, item.requested_scope)}
              </Text>
              <Text style={styles.line}>
                {t('vehicles.access.duration')}: {item.requested_duration}
              </Text>
              {item.reason ? <Text style={styles.line}>{item.reason}</Text> : null}

              <Text style={styles.choiceLabel}>{t('vehicles.access.chooseWhatToShare')}</Text>
              <View style={styles.choiceRow}>
                <Pressable
                  onPress={() => setChoice(item.request_id, { primary: SCOPE_BASIC })}
                  style={[styles.choiceChip, choice.primary === SCOPE_BASIC && styles.choiceChipOn]}
                >
                  <Text style={styles.choiceChipText}>{t('vehicles.access.shareBasic')}</Text>
                </Pressable>
                <Pressable
                  onPress={() =>
                    setChoice(item.request_id, {
                      primary: SCOPE_FULL,
                      parts: false,
                      docs: false,
                      media: false,
                    })
                  }
                  style={[styles.choiceChip, choice.primary === SCOPE_FULL && styles.choiceChipOn]}
                >
                  <Text style={styles.choiceChipText}>{t('vehicles.access.shareFull')}</Text>
                </Pressable>
              </View>
              <Text style={styles.muted}>{t('vehicles.access.shareBasicHint')}</Text>
              <Text style={[styles.muted, styles.extraHint]}>{t('vehicles.access.shareFullHint')}</Text>

              {!extrasDisabled ? (
                <View style={styles.extras}>
                  <Text style={styles.choiceLabel}>{t('vehicles.access.optionalExtras')}</Text>
                  {[
                    ['parts', SCOPE_PARTS, t('vehicles.access.sharePartsLabor')],
                    ['docs', SCOPE_DOCS, t('vehicles.access.shareDocuments')],
                    ['media', SCOPE_MEDIA, t('vehicles.access.shareEvidence')],
                  ].map(([key, _scope, label]) => (
                    <Pressable
                      key={key}
                      onPress={() => setChoice(item.request_id, { [key]: !choice[key] })}
                      style={styles.extraRow}
                    >
                      <Text style={styles.extraCheck}>{choice[key] ? '✓' : '○'}</Text>
                      <Text style={styles.extraLabel}>{label}</Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}

              <View style={styles.actions}>
                <Button
                  mode="contained"
                  loading={actingId === `${item.request_id}:approve`}
                  onPress={() => respond(item.request_id, 'approve', buildScopes(choice))}
                  style={styles.btn}
                >
                  {t('vehicles.access.approveSelected')}
                </Button>
                <Button
                  mode="outlined"
                  loading={actingId === `${item.request_id}:reject`}
                  onPress={() => respond(item.request_id, 'reject')}
                  style={styles.btn}
                >
                  {t('vehicles.access.reject')}
                </Button>
                <Button
                  mode="text"
                  loading={actingId === `${item.request_id}:block`}
                  onPress={() => respond(item.request_id, 'block')}
                  textColor="#8B1E1E"
                >
                  {t('vehicles.access.blockShop')}
                </Button>
              </View>
            </FloatingCard>
          );
        })}

        <Text style={[styles.sectionLabel, styles.sectionSpacer]}>
          {t('vehicles.access.temporaryGrantsSection')}
        </Text>
        <Text style={styles.hint}>{t('vehicles.access.temporaryGrantsHint')}</Text>
        {!loading && grants.length === 0 ? (
          <FloatingCard style={styles.card}>
            <Text style={styles.muted}>{t('vehicles.access.noTemporaryGrants')}</Text>
          </FloatingCard>
        ) : null}
        {grants.map((grant) => (
          <FloatingCard key={grant.id} style={styles.card}>
            <Text style={styles.title}>{grant.shop?.name || t('vehicles.access.shopFallback')}</Text>
            <Text style={styles.line}>
              {t('vehicles.access.scope')}:{' '}
              {(grant.scopes || []).map((s) => scopeLabel(t, s)).join(', ') || '—'}
            </Text>
            {grant.valid_until ? (
              <Text style={styles.line}>
                {t('vehicles.access.validUntil')}: {new Date(grant.valid_until).toLocaleString()}
              </Text>
            ) : null}
            <Button
              mode="outlined"
              loading={actingId === `grant:${grant.id}`}
              onPress={() => revoke(grant.id)}
              style={styles.btn}
            >
              {t('vehicles.access.revokeGrant')}
            </Button>
          </FloatingCard>
        ))}
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40 },
  card: { marginBottom: 12 },
  title: { fontSize: 17, fontWeight: '600', marginBottom: 6 },
  line: { fontSize: 14, marginBottom: 4, opacity: 0.85 },
  muted: { fontSize: 14, opacity: 0.65 },
  hint: { fontSize: 13, opacity: 0.65, marginBottom: 10 },
  extraHint: { marginBottom: 8 },
  sectionLabel: { fontSize: 15, fontWeight: '600', marginBottom: 8 },
  sectionSpacer: { marginTop: 16 },
  choiceLabel: { fontSize: 14, fontWeight: '600', marginTop: 10, marginBottom: 6 },
  choiceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 6 },
  choiceChip: {
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.2)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  choiceChipOn: {
    borderColor: '#1F4B3A',
    backgroundColor: 'rgba(31,75,58,0.12)',
  },
  choiceChipText: { fontSize: 13, fontWeight: '600' },
  extras: { marginTop: 4 },
  extraRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  extraCheck: { width: 22, fontSize: 16 },
  extraLabel: { fontSize: 14, flex: 1 },
  actions: { marginTop: 12, gap: 8 },
  btn: { marginTop: 4 },
});
