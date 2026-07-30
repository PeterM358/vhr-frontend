/**
 * Owner settings: opt-in B2B public profile (default OFF).
 * Safe page only — no ERP data. Works on web + mobile.
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
import { navigateToOrgHome } from '../navigation/webNavigation';
import { publicBusinessProfile } from '../navigation/webRoutes';
import { useTranslation } from '../i18n';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { useScrollContentBottomPadding } from '../utils/mobileWebInsets';
import { showMessage } from '../utils/crossPlatformAlert';

const ON_CARD = '#0F172A';
const ON_CARD_MUTED = '#475569';

export default function OrgPublicProfileScreen({ navigation, route }) {
  const { t } = useTranslation();
  const routeOrgId = route?.params?.organizationId || route?.params?.orgId;
  const scrollBottomPadding = useScrollContentBottomPadding(40);

  const [orgId, setOrgId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [enabled, setEnabled] = useState(false);
  const [slug, setSlug] = useState('');
  const [canonicalPath, setCanonicalPath] = useState(null);
  const [displayName, setDisplayName] = useState('');

  const onBack = useCallback(() => {
    navigateToOrgHome(navigation, { orgId: routeOrgId || orgId });
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
      await refreshOrganizationMemberships(token).catch(() => null);
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

  return (
    <ScreenBackground>
      <OrgAppHeader
        title={t('org.publicProfile.title', null, 'Public profile')}
        onBack={onBack}
      />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: scrollBottomPadding }]}
        keyboardShouldPersistTaps="handled"
      >
        {loading ? (
          <ActivityIndicator style={{ marginTop: 24 }} />
        ) : (
          <AppCard style={styles.card}>
            <Text style={styles.lead}>
              {t(
                'org.publicProfile.lead',
                null,
                'Optional B2B page for partners and Google — like service centers, but for your company. Off by default. Never shows tasks, salaries, or fleet ERP.',
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
                  {t('org.publicProfile.publishHint', null, 'Opt-in only. You can turn it off anytime.')}
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
