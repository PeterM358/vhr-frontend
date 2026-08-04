/**
 * Owner settings: org B2B public profile.
 * Service-center orgs: auto-enabled on activity select (toggle still available).
 * Other orgs: optional / off by default.
 */

import React, { useCallback, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Switch, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityIndicator, Button, Text, TextInput } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';

import ScreenBackground from '../components/ScreenBackground';
import AppCard from '../components/ui/AppCard';
import OrgAppHeader from '../components/org/OrgAppHeader';
import {
  getOrganizationPublicProfileSettings,
  updateOrganizationPublicProfileSettings,
} from '../api/organizationWorkspace';
import { resolveActiveOrganizationId, refreshOrganizationMemberships } from '../utils/orgWorkspace';
import { navigateToOrgCompanyAccount } from '../navigation/webNavigation';
import { publicBusinessProfile } from '../navigation/webRoutes';
import { useTranslation } from '../i18n';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { useScrollContentBottomPadding } from '../utils/mobileWebInsets';
import { showMessage } from '../utils/crossPlatformAlert';

const ON_CARD = '#0F172A';
const ON_CARD_MUTED = '#475569';

export default function OrgPublicProfileScreen({
  navigation,
  route,
  embedded = false,
  onSaved,
}) {
  const { t } = useTranslation();
  const routeOrgId = route?.params?.organizationId || route?.params?.orgId;
  const isEmbedded = embedded || Boolean(route?.params?.embedded);
  const scrollBottomPadding = useScrollContentBottomPadding(40);

  const [orgId, setOrgId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [enabled, setEnabled] = useState(false);
  const [slug, setSlug] = useState('');
  const [canonicalPath, setCanonicalPath] = useState(null);
  const [displayName, setDisplayName] = useState('');
  const [isServiceCenter, setIsServiceCenter] = useState(false);

  const onBack = useCallback(() => {
    navigateToOrgCompanyAccount(navigation, {
      orgId: routeOrgId || orgId,
      tab: 'public',
    });
  }, [navigation, orgId, routeOrgId]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      const resolved = await resolveActiveOrganizationId(routeOrgId);
      setOrgId(resolved);
      if (!resolved) {
        setError(t('org.publicProfile.loadError', null, 'Could not load public profile settings.'));
        return;
      }
      const data = await getOrganizationPublicProfileSettings(token, resolved);
      setEnabled(Boolean(data.public_profile_enabled));
      setSlug(data.public_slug || '');
      setCanonicalPath(data.canonical_path || null);
      setDisplayName(data.display_name || '');
      const activities = Array.isArray(data.activities) ? data.activities : [];
      setIsServiceCenter(
        Boolean(data.is_service_center) || activities.includes('service_center'),
      );
    } catch (e) {
      setError(
        e.message || t('org.publicProfile.loadError', null, 'Could not load public profile settings.'),
      );
    } finally {
      setLoading(false);
    }
  }, [routeOrgId, t]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const save = async (nextEnabled = enabled) => {
    if (!orgId) return;
    setBusy(true);
    setError('');
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      const data = await updateOrganizationPublicProfileSettings(token, orgId, {
        public_profile_enabled: nextEnabled,
        public_slug: slug.trim() || undefined,
      });
      setEnabled(Boolean(data.public_profile_enabled));
      setSlug(data.public_slug || '');
      setCanonicalPath(data.canonical_path || null);
      const activities = Array.isArray(data.activities) ? data.activities : [];
      setIsServiceCenter(
        Boolean(data.is_service_center) || activities.includes('service_center'),
      );
      await refreshOrganizationMemberships(token).catch(() => null);
      if (typeof onSaved === 'function') onSaved();
      showMessage(
        t('org.publicProfile.savedTitle', null, 'Public profile'),
        nextEnabled
          ? t('org.publicProfile.published', null, 'Your B2B page is public. ERP data stays private.')
          : t('org.publicProfile.unpublished', null, 'Public page is hidden.'),
      );
    } catch (e) {
      setError(e.message || t('org.publicProfile.saveError', null, 'Could not save.'));
    } finally {
      setBusy(false);
    }
  };

  const openPublic = () => {
    if (!slug) return;
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.open(publicBusinessProfile(slug), '_blank');
      return;
    }
    navigation.navigate('PublicBusinessProfile', { orgSlug: slug });
  };

  const body = (
    <>
      {loading ? (
        <ActivityIndicator style={{ marginTop: 24 }} />
      ) : (
        <AppCard style={styles.card}>
          <Text style={styles.lead}>
            {isServiceCenter
              ? t(
                  'org.publicProfile.leadServiceCenter',
                  null,
                  'Public listing is enabled for service centers so customers can find you. You can turn it off anytime. Never shows tasks, salaries, or fleet ERP.',
                )
              : t(
                  'org.publicProfile.lead',
                  null,
                  'Optional B2B page for partners and Google. Off by default for non–service-center companies. Never shows tasks, salaries, or fleet ERP.',
                )}
          </Text>
          {displayName ? (
            <Text style={styles.name}>{displayName}</Text>
          ) : null}
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>
                {t('org.publicProfile.publish', null, 'Publish public page')}
              </Text>
              <Text style={styles.hint}>
                {isServiceCenter
                  ? t(
                      'org.publicProfile.publishHintServiceCenter',
                      null,
                      'Enabled for service centers. You can turn it off if you insist.',
                    )
                  : t(
                      'org.publicProfile.publishHint',
                      null,
                      'Optional for your company. You can turn it off anytime.',
                    )}
              </Text>
            </View>
            <Switch
              value={enabled}
              onValueChange={(v) => {
                setEnabled(v);
                save(v);
              }}
              disabled={busy}
            />
          </View>
          <Text style={styles.label}>{t('org.publicProfile.slug', null, 'Public URL slug')}</Text>
          <TextInput
            mode="outlined"
            value={slug}
            onChangeText={setSlug}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="my-transport-company"
            style={styles.input}
          />
          {canonicalPath ? (
            <Text style={styles.path}>{canonicalPath}</Text>
          ) : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <View style={styles.actions}>
            <Button mode="contained" loading={busy} disabled={busy} onPress={() => save(enabled)}>
              {t('common.save', null, 'Save')}
            </Button>
            {enabled && slug ? (
              <Button mode="outlined" onPress={openPublic} labelStyle={styles.outlinedLabel}>
                {t('org.publicProfile.preview', null, 'Open public page')}
              </Button>
            ) : null}
          </View>
        </AppCard>
      )}
    </>
  );

  if (isEmbedded) {
    return body;
  }

  return (
    <ScreenBackground>
      <OrgAppHeader
        mode="detail"
        title={t('org.publicProfile.title', null, 'Public profile')}
        onBack={onBack}
        backLabel={t('org.companyAccount.backHub', null, 'Company account')}
        iconOnlyBack={false}
      />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: scrollBottomPadding }]}
        keyboardShouldPersistTaps="handled"
      >
        {body}
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16 },
  card: { padding: 16, gap: 12 },
  lead: { color: ON_CARD_MUTED, fontSize: 13, lineHeight: 18 },
  name: { color: ON_CARD, fontSize: 18, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  label: { color: ON_CARD, fontWeight: '600', fontSize: 14 },
  hint: { color: ON_CARD_MUTED, fontSize: 12, marginTop: 2 },
  input: { backgroundColor: '#fff' },
  path: { color: ON_CARD_MUTED, fontSize: 12 },
  error: { color: '#b91c1c' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  outlinedLabel: { color: ON_CARD },
});
