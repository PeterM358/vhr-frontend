/**
 * Owner/admin settings: multi-select organization industry activities.
 * Saving syncs BusinessRole + OrganizationModule on the backend.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityIndicator, Button, Text } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';

import ScreenBackground from '../components/ScreenBackground';
import AppCard from '../components/ui/AppCard';
import OrgAppHeader from '../components/org/OrgAppHeader';
import {
  getOrganizationActivities,
  updateOrganizationActivities,
} from '../api/organizationWorkspace';
import {
  readOrganizationMemberships,
  refreshOrganizationMemberships,
  resolveActiveOrganizationId,
} from '../utils/orgWorkspace';
import { navigateToOrgHome, navigateToOrgPublicProfile } from '../navigation/webNavigation';
import { useTranslation } from '../i18n';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { useScrollContentBottomPadding } from '../utils/mobileWebInsets';
import { COLORS } from '../constants/colors';

const ON_CARD = '#0F172A';
const ON_CARD_MUTED = '#475569';

const ACTIVITY_OPTIONS = ['transport', 'construction', 'service_center', 'other'];

export default function OrgActivitiesScreen({ navigation, route }) {
  const { t } = useTranslation();
  const routeOrgId = route?.params?.organizationId || route?.params?.orgId;
  const scrollBottomPadding = useScrollContentBottomPadding(40);

  const [orgId, setOrgId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [canManage, setCanManage] = useState(false);
  const [selected, setSelected] = useState([]);
  const [showPublicListingCta, setShowPublicListingCta] = useState(false);

  const labels = useMemo(
    () => ({
      transport: t('org.activities.types.transport', null, 'Transport'),
      construction: t('org.activities.types.construction', null, 'Construction'),
      service_center: t('org.activities.types.serviceCenter', null, 'Service center'),
      other: t('org.activities.types.other', null, 'Other'),
    }),
    [t],
  );

  const hints = useMemo(
    () => ({
      transport: t(
        'org.activities.typeHints.transport',
        null,
        'Fleet & jobs; request repairs from service centers',
      ),
      construction: t(
        'org.activities.typeHints.construction',
        null,
        'Sites & fleet; request repairs from service centers',
      ),
      service_center: t(
        'org.activities.typeHints.serviceCenter',
        null,
        'Provide service; appear on the map and public listing',
      ),
      other: t(
        'org.activities.typeHints.other',
        null,
        'Company that needs service from shops',
      ),
    }),
    [t],
  );

  const onBack = useCallback(() => {
    const orgIdForNav = routeOrgId || orgId;
    if (navigation?.canGoBack?.()) {
      navigation.goBack();
      return;
    }
    if (orgIdForNav) {
      navigateToOrgHome(navigation, { orgId: orgIdForNav });
      return;
    }
    readOrganizationMemberships().then((orgs) => {
      if (orgs.length > 0) {
        navigateToOrgHome(navigation, { orgId: orgs[0]?.id });
      }
    });
  }, [navigation, orgId, routeOrgId]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    setShowPublicListingCta(false);
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      const resolved = await resolveActiveOrganizationId(routeOrgId);
      setOrgId(resolved);
      if (!resolved) {
        setError(t('org.activities.loadError', null, 'Could not load activities.'));
        return;
      }
      const data = await getOrganizationActivities(token, resolved);
      setCanManage(Boolean(data?.can_manage));
      const activities = Array.isArray(data?.activities) ? data.activities : [];
      setSelected(activities.filter((key) => ACTIVITY_OPTIONS.includes(key)));
    } catch (e) {
      setError(e.message || t('org.activities.loadError', null, 'Could not load activities.'));
    } finally {
      setLoading(false);
    }
  }, [routeOrgId, t]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const toggle = (key) => {
    if (!canManage || busy) return;
    setSelected((prev) => {
      if (prev.includes(key)) {
        if (prev.length <= 1) return prev;
        return prev.filter((item) => item !== key);
      }
      return [...prev, key];
    });
    setMessage('');
    setError('');
    setShowPublicListingCta(false);
  };

  const save = async () => {
    if (!orgId || !canManage) return;
    if (!selected.length) {
      setError(t('org.activities.selectOne', null, 'Select at least one activity.'));
      return;
    }
    setBusy(true);
    setError('');
    setMessage('');
    setShowPublicListingCta(false);
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      const data = await updateOrganizationActivities(token, orgId, { activities: selected });
      const next = Array.isArray(data?.activities) ? data.activities : selected;
      setSelected(next);
      const memberships = await refreshOrganizationMemberships(token);
      const org = memberships.find((row) => Number(row?.id) === Number(orgId));
      const needsListing =
        next.includes('service_center') && !org?.has_shop_locations;
      setMessage(t('org.activities.saved', null, 'Activities saved. Modules updated.'));
      setShowPublicListingCta(needsListing);
    } catch (e) {
      setError(e.message || t('org.activities.saveError', null, 'Could not save activities.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScreenBackground>
      <OrgAppHeader
        title={t('org.activities.title', null, 'Activities')}
        onBack={onBack}
      />
      <ScrollView contentContainerStyle={[styles.container, { paddingBottom: scrollBottomPadding }]}>
        <AppCard style={styles.card}>
          <Text style={styles.lead}>
            {t(
              'org.activities.lead',
              null,
              'Tell us what you do so we show the right tools and who can find you.',
            )}
          </Text>

          {loading ? (
            <ActivityIndicator animating style={styles.spinner} />
          ) : (
            <View style={styles.grid}>
              {ACTIVITY_OPTIONS.map((key) => {
                const isOn = selected.includes(key);
                return (
                  <Pressable
                    key={key}
                    onPress={() => toggle(key)}
                    disabled={!canManage}
                    style={({ pressed }) => [
                      styles.option,
                      isOn && styles.optionSelected,
                      pressed && canManage && styles.optionPressed,
                      !canManage && styles.optionDisabled,
                    ]}
                  >
                    <Text style={[styles.checkbox, isOn && styles.checkboxOn]}>
                      {isOn ? '☑' : '☐'}
                    </Text>
                    <View style={styles.optionTextCol}>
                      <Text style={[styles.optionLabel, isOn && styles.optionLabelOn]}>
                        {labels[key]}
                      </Text>
                      <Text style={styles.optionHint}>{hints[key]}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}

          {!canManage ? (
            <Text style={styles.muted}>
              {t(
                'org.activities.ownerOnly',
                null,
                'Only organization owners/admins can edit activities.',
              )}
            </Text>
          ) : null}

          {error ? <Text style={styles.error}>{error}</Text> : null}
          {message ? <Text style={styles.success}>{message}</Text> : null}
          {showPublicListingCta ? (
            <View style={styles.ctaBox}>
              <Text style={styles.ctaText}>
                {t(
                  'org.activities.publicListingCta',
                  null,
                  'Set up your public listing so customers can find your service center.',
                )}
              </Text>
              <Button
                mode="outlined"
                onPress={() => navigateToOrgPublicProfile(navigation, { orgId })}
                style={styles.ctaBtn}
                textColor={COLORS.PRIMARY}
              >
                {t('org.activities.publicListingButton', null, 'Complete public listing')}
              </Button>
            </View>
          ) : null}

          {canManage ? (
            <Button
              mode="contained"
              onPress={save}
              loading={busy}
              disabled={busy || loading || selected.length === 0}
              style={styles.save}
              buttonColor={COLORS.PRIMARY}
              textColor={COLORS.ON_PRIMARY}
            >
              {t('org.activities.save', null, 'Save activities')}
            </Button>
          ) : null}
        </AppCard>
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  card: {
    padding: 16,
  },
  lead: {
    color: ON_CARD,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 16,
  },
  grid: {
    gap: 8,
    marginBottom: 12,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: '#F8FAFC',
  },
  optionSelected: {
    borderColor: COLORS.PRIMARY,
    backgroundColor: 'rgba(15,76,129,0.08)',
  },
  optionPressed: {
    opacity: 0.88,
  },
  optionDisabled: {
    opacity: 0.65,
  },
  checkbox: {
    color: ON_CARD_MUTED,
    fontSize: 18,
    width: 22,
    marginTop: 1,
  },
  checkboxOn: {
    color: COLORS.PRIMARY,
  },
  optionTextCol: {
    flex: 1,
    gap: 2,
  },
  optionLabel: {
    color: ON_CARD,
    fontWeight: '600',
    fontSize: 16,
  },
  optionLabelOn: {
    color: ON_CARD,
    fontWeight: '700',
  },
  optionHint: {
    color: ON_CARD_MUTED,
    fontSize: 12,
    lineHeight: 16,
  },
  muted: {
    color: ON_CARD_MUTED,
    marginBottom: 8,
    lineHeight: 20,
  },
  error: {
    color: '#B91C1C',
    marginBottom: 8,
  },
  success: {
    color: '#15803D',
    marginBottom: 8,
  },
  ctaBox: {
    marginBottom: 12,
    padding: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(15,76,129,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(15,76,129,0.18)',
    gap: 8,
  },
  ctaText: {
    color: ON_CARD,
    fontSize: 14,
    lineHeight: 20,
  },
  ctaBtn: {
    alignSelf: 'flex-start',
  },
  spinner: {
    marginVertical: 16,
  },
  save: {
    marginTop: 8,
  },
});
