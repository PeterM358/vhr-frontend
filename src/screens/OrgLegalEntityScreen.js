/**
 * Organization company / legal entity settings (VAT, address).
 * Not the personal Profile nickname screen.
 */

import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityIndicator, Button, TextInput } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';

import ScreenBackground from '../components/ScreenBackground';
import AppCard from '../components/ui/AppCard';
import OrgAppHeader from '../components/org/OrgAppHeader';
import {
  getOrganizationLegalEntity,
  updateOrganizationLegalEntity,
} from '../api/orgWarehouse';
import {
  readOrganizationMemberships,
  resolveActiveOrganizationId,
} from '../utils/orgWorkspace';
import { navigateToOrgHome } from '../navigation/webNavigation';
import { useTranslation } from '../i18n';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { useScrollContentBottomPadding } from '../utils/mobileWebInsets';

const ON_CARD = '#0F172A';
const ON_CARD_MUTED = '#475569';

function emptyForm() {
  return {
    legal_name: '',
    vat_registered: true,
    vat_number: '',
    eik_number: '',
    registered_address_line1: '',
    registered_city: '',
    registered_postal_code: '',
    billing_email: '',
    billing_phone: '',
  };
}

function hydrate(entity) {
  if (!entity) return emptyForm();
  return {
    legal_name: entity.legal_name || '',
    vat_registered: entity.vat_registered !== false,
    vat_number: entity.vat_number || '',
    eik_number: entity.eik_number || '',
    registered_address_line1: entity.registered_address_line1 || '',
    registered_city: entity.registered_city || '',
    registered_postal_code: entity.registered_postal_code || '',
    billing_email: entity.billing_email || '',
    billing_phone: entity.billing_phone || '',
  };
}

export default function OrgLegalEntityScreen({ navigation, route }) {
  const { t } = useTranslation();
  const routeOrgId = route?.params?.organizationId || route?.params?.orgId;
  const scrollBottomPadding = useScrollContentBottomPadding(40);

  const onBack = useCallback(async () => {
    const orgs = await readOrganizationMemberships();
    if (orgs.length > 0) {
      navigateToOrgHome(navigation, { orgId: routeOrgId || orgs[0]?.id });
      return;
    }
    if (navigation?.canGoBack?.()) navigation.goBack();
  }, [navigation, routeOrgId]);

  const [orgId, setOrgId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [canManage, setCanManage] = useState(false);
  const [complete, setComplete] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const setField = useCallback((key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      const resolved = await resolveActiveOrganizationId(routeOrgId);
      setOrgId(resolved);
      if (!resolved) {
        setError(t('org.legal.loadError', null, 'Could not load company details.'));
        return;
      }
      const data = await getOrganizationLegalEntity(token, resolved);
      setCanManage(Boolean(data?.can_manage));
      setComplete(Boolean(data?.legal_entity_complete));
      setForm(hydrate(data?.legal_entity));
    } catch (e) {
      setError(e.message || t('org.legal.loadError', null, 'Could not load company details.'));
    } finally {
      setLoading(false);
    }
  }, [routeOrgId, t]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const save = async () => {
    if (!orgId || !canManage) return;
    if (!form.legal_name.trim()) {
      setMessage(t('org.legal.nameRequired', null, 'Legal company name is required.'));
      return;
    }
    setBusy(true);
    setMessage('');
    setError('');
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      const data = await updateOrganizationLegalEntity(token, orgId, {
        legal_name: form.legal_name.trim(),
        vat_registered: form.vat_registered !== false,
        vat_number: form.vat_number.trim(),
        eik_number: form.eik_number.trim(),
        registered_address_line1: form.registered_address_line1.trim(),
        registered_city: form.registered_city.trim(),
        registered_postal_code: form.registered_postal_code.trim(),
        billing_email: form.billing_email.trim(),
        billing_phone: form.billing_phone.trim(),
      });
      setComplete(Boolean(data?.legal_entity_complete));
      setForm(hydrate(data?.legal_entity));
      setMessage(
        data?.legal_entity_complete
          ? t('org.legal.savedComplete', null, 'Company details saved — ready for invoicing and warehouse confirm.')
          : t('org.legal.savedIncomplete', null, 'Saved. Still missing required legal fields.'),
      );
    } catch (e) {
      setError(e.message || t('org.legal.saveError', null, 'Could not save company details.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScreenBackground>
      <OrgAppHeader
        title={t('org.legal.title', null, 'Company details')}
        onBack={onBack}
      />
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: scrollBottomPadding }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.lead}>
          {t(
            'org.legal.lead',
            null,
            'Legal entity for invoices and warehouse buyer-VAT checks. Separate from your personal Profile nickname.',
          )}
        </Text>

        {loading ? (
          <ActivityIndicator color="#fff" style={styles.loader} />
        ) : (
          <AppCard style={styles.card}>
            {error ? <Text style={styles.error}>{error}</Text> : null}
            {message ? <Text style={styles.message}>{message}</Text> : null}
            <Text style={[styles.status, complete ? styles.statusOk : styles.statusWarn]}>
              {complete
                ? t('org.legal.complete', null, 'Legal entity complete')
                : t('org.legal.incomplete', null, 'Legal entity incomplete — required for Confirm')}
            </Text>

            <TextInput
              label={t('org.legal.legalName', null, 'Legal company name')}
              value={form.legal_name}
              onChangeText={(v) => setField('legal_name', v)}
              mode="outlined"
              style={styles.input}
              textColor={ON_CARD}
              editable={canManage}
            />

            <View style={styles.switchRow}>
              <View style={styles.switchCopy}>
                <Text style={styles.switchLabel}>
                  {t('org.legal.vatRegistered', null, 'VAT registered')}
                </Text>
                <Text style={styles.helper}>
                  {t(
                    'org.legal.vatRegisteredHint',
                    null,
                    'When off, company ID (EIK) is used instead of VAT.',
                  )}
                </Text>
              </View>
              <Switch
                value={form.vat_registered !== false}
                onValueChange={(v) => setField('vat_registered', v)}
                disabled={!canManage}
              />
            </View>

            {form.vat_registered !== false ? (
              <TextInput
                label={t('org.legal.vatNumber', null, 'VAT / ДДС number')}
                value={form.vat_number}
                onChangeText={(v) => setField('vat_number', v)}
                mode="outlined"
                style={styles.input}
                textColor={ON_CARD}
                editable={canManage}
                autoCapitalize="characters"
              />
            ) : (
              <TextInput
                label={t('org.legal.eikNumber', null, 'EIK / company ID')}
                value={form.eik_number}
                onChangeText={(v) => setField('eik_number', v)}
                mode="outlined"
                style={styles.input}
                textColor={ON_CARD}
                editable={canManage}
              />
            )}

            <TextInput
              label={t('org.legal.address', null, 'Registered address')}
              value={form.registered_address_line1}
              onChangeText={(v) => setField('registered_address_line1', v)}
              mode="outlined"
              style={styles.input}
              textColor={ON_CARD}
              editable={canManage}
            />
            <View style={styles.row2}>
              <TextInput
                label={t('org.legal.city', null, 'City')}
                value={form.registered_city}
                onChangeText={(v) => setField('registered_city', v)}
                mode="outlined"
                style={[styles.input, styles.flex1]}
                textColor={ON_CARD}
                editable={canManage}
              />
              <TextInput
                label={t('org.legal.postal', null, 'Postal code')}
                value={form.registered_postal_code}
                onChangeText={(v) => setField('registered_postal_code', v)}
                mode="outlined"
                style={[styles.input, styles.flex1]}
                textColor={ON_CARD}
                editable={canManage}
              />
            </View>
            <TextInput
              label={t('org.legal.billingEmail', null, 'Billing email (optional)')}
              value={form.billing_email}
              onChangeText={(v) => setField('billing_email', v)}
              mode="outlined"
              style={styles.input}
              textColor={ON_CARD}
              editable={canManage}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <TextInput
              label={t('org.legal.billingPhone', null, 'Billing phone (optional)')}
              value={form.billing_phone}
              onChangeText={(v) => setField('billing_phone', v)}
              mode="outlined"
              style={styles.input}
              textColor={ON_CARD}
              editable={canManage}
              keyboardType="phone-pad"
            />

            {canManage ? (
              <Button mode="contained" onPress={save} loading={busy} disabled={busy}>
                {t('common.save', null, 'Save')}
              </Button>
            ) : (
              <Text style={styles.helper}>
                {t('org.legal.readOnly', null, 'Only organization owners/admins can edit.')}
              </Text>
            )}
          </AppCard>
        )}
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 16, gap: 12 },
  lead: { color: 'rgba(255,255,255,0.78)', fontSize: 14, lineHeight: 20 },
  loader: { marginTop: 40 },
  card: { padding: 16, gap: 8 },
  input: { backgroundColor: '#fff', marginBottom: 6 },
  row2: { flexDirection: 'row', gap: 8 },
  flex1: { flex: 1 },
  error: { color: '#B91C1C', fontSize: 13 },
  message: { color: '#15803d', fontSize: 13 },
  status: { fontSize: 13, fontWeight: '600', marginBottom: 4 },
  statusOk: { color: '#15803d' },
  statusWarn: { color: '#B45309' },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 8,
  },
  switchCopy: { flex: 1 },
  switchLabel: { color: ON_CARD, fontWeight: '600', fontSize: 14 },
  helper: { color: ON_CARD_MUTED, fontSize: 12, marginTop: 2 },
});
