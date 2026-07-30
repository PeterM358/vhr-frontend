/**
 * Public B2B organization landing — web SEO path + mobile deep link.
 * No auth required. Never shows ERP private data.
 */

import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, Chip, Text } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';

import ScreenBackground from '../components/ScreenBackground';
import AppCard from '../components/ui/AppCard';
import AppNavigationBar from '../components/common/AppNavigationBar';
import { getPublicOrganizationProfile } from '../api/organizationWorkspace';
import { useTranslation } from '../i18n';
import { useScrollContentBottomPadding } from '../utils/mobileWebInsets';
import { navigateToServiceCenterProfile } from '../navigation/serviceCentersNavigation';

const ON_CARD = '#0F172A';
const ON_CARD_MUTED = '#475569';

function roleLabel(role, t) {
  const key = String(role || '').toLowerCase();
  const map = {
    transport_company: t('org.publicProfile.roles.transport', null, 'Transport'),
    fleet_operator: t('org.publicProfile.roles.fleet', null, 'Fleet'),
    service_center: t('org.publicProfile.roles.serviceCenter', null, 'Service center'),
    construction: t('org.publicProfile.roles.construction', null, 'Construction'),
  };
  return map[key] || role;
}

export default function PublicBusinessProfileScreen({ navigation, route }) {
  const { t } = useTranslation();
  const orgSlug = route?.params?.orgSlug || route?.params?.slug;
  const scrollBottomPadding = useScrollContentBottomPadding(40);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [profile, setProfile] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      if (!orgSlug) {
        setError(t('org.publicProfile.notFound', null, 'Organization not found.'));
        setProfile(null);
        return;
      }
      const data = await getPublicOrganizationProfile(orgSlug);
      setProfile(data);
    } catch (e) {
      setProfile(null);
      setError(e.message || t('org.publicProfile.notFound', null, 'Organization not found.'));
    } finally {
      setLoading(false);
    }
  }, [orgSlug, t]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <ScreenBackground>
      <AppNavigationBar
        title={profile?.display_name || t('org.publicProfile.publicTitle', null, 'Company')}
        onBack={() => navigation.goBack()}
      />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: scrollBottomPadding }]}>
        {loading ? (
          <ActivityIndicator style={{ marginTop: 32 }} />
        ) : error ? (
          <AppCard style={styles.card}>
            <Text style={styles.error}>{error}</Text>
            <Button onPress={load}>{t('common.retry', null, 'Retry')}</Button>
          </AppCard>
        ) : (
          <AppCard style={styles.card}>
            <Text style={styles.title}>{profile.display_name}</Text>
            {profile.country_iso2 ? (
              <Text style={styles.meta}>{profile.country_iso2}</Text>
            ) : null}
            <Text style={styles.section}>
              {t('org.publicProfile.whatWeDo', null, 'Business roles')}
            </Text>
            <View style={styles.chips}>
              {(profile.roles || []).map((role) => (
                <Chip key={role} style={styles.chip} textStyle={styles.chipText}>
                  {roleLabel(role, t)}
                </Chip>
              ))}
            </View>
            {(profile.locations || []).length ? (
              <>
                <Text style={styles.section}>
                  {t('org.publicProfile.locations', null, 'Linked locations')}
                </Text>
                {profile.locations.map((loc) => (
                  <View key={loc.id} style={styles.locRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.locName}>{loc.shop_name || loc.label}</Text>
                      {loc.city ? <Text style={styles.meta}>{loc.city}</Text> : null}
                    </View>
                    {loc.public_slug ? (
                      <Button
                        compact
                        onPress={() =>
                          navigateToServiceCenterProfile(navigation, loc.public_slug, {
                            shopId: loc.shop_profile_id,
                          })
                        }
                      >
                        {t('org.publicProfile.openShop', null, 'Open')}
                      </Button>
                    ) : null}
                  </View>
                ))}
              </>
            ) : (
              <Text style={styles.meta}>
                {t(
                  'org.publicProfile.noLocations',
                  null,
                  'No public service locations linked.',
                )}
              </Text>
            )}
            <Text style={styles.footer}>
              {t(
                'org.publicProfile.privacyNote',
                null,
                'Public company page — operational ERP data is not shown here.',
              )}
            </Text>
          </AppCard>
        )}
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16 },
  card: { padding: 16, gap: 10 },
  title: { color: ON_CARD, fontSize: 22, fontWeight: '700' },
  meta: { color: ON_CARD_MUTED, fontSize: 13 },
  section: { color: ON_CARD, fontWeight: '700', marginTop: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { backgroundColor: '#E2E8F0' },
  chipText: { color: ON_CARD, fontSize: 12 },
  locRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
  },
  locName: { color: ON_CARD, fontWeight: '600' },
  footer: { color: ON_CARD_MUTED, fontSize: 12, marginTop: 12, lineHeight: 16 },
  error: { color: '#b91c1c', marginBottom: 8 },
});
