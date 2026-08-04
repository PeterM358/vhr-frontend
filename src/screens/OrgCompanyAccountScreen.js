/**
 * Company account hub for organizations: completion summary + tabs
 * (Company details | Activities | Public profile | My account).
 */

import React, { useCallback, useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityIndicator, Button, ProgressBar, SegmentedButtons, Text } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import ScreenBackground from '../components/ScreenBackground';
import AppCard from '../components/ui/AppCard';
import OrgAppHeader from '../components/org/OrgAppHeader';
import OrgLegalEntityScreen from './OrgLegalEntityScreen';
import OrgActivitiesScreen from './OrgActivitiesScreen';
import OrgPublicProfileScreen from './OrgPublicProfileScreen';
import {
  getOrganizationActivities,
  getOrganizationPublicProfileSettings,
} from '../api/organizationWorkspace';
import { getOrganizationLegalEntity } from '../api/orgWarehouse';
import {
  readOrganizationMemberships,
  resolveActiveOrganizationId,
} from '../utils/orgWorkspace';
import {
  buildOrgCompanySetupChecklist,
  normalizeOrgAccountTab,
} from '../utils/orgCompanySetup';
import { navigateToOrgHome, navigateToProfile } from '../navigation/webNavigation';
import { useTranslation } from '../i18n';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { useScrollContentBottomPadding } from '../utils/mobileWebInsets';
import { COLORS } from '../constants/colors';

const ON_CARD = '#0F172A';
const ON_CARD_MUTED = '#475569';

function checklistLabel(id, t) {
  switch (id) {
    case 'activities':
      return t('org.companyAccount.check.activities', null, 'Choose company activities');
    case 'service_center':
      return t(
        'org.companyAccount.check.serviceCenter',
        null,
        'Include service center activity',
      );
    case 'public_enabled':
      return t('org.companyAccount.check.publicEnabled', null, 'Public listing enabled');
    case 'public_slug':
      return t('org.companyAccount.check.publicSlug', null, 'Public URL slug set');
    case 'legal':
      return t('org.companyAccount.check.legal', null, 'Company legal details filled');
    default:
      return id;
  }
}

export default function OrgCompanyAccountScreen({ navigation, route }) {
  const { t } = useTranslation();
  const routeOrgId = route?.params?.organizationId || route?.params?.orgId;
  const initialTab = normalizeOrgAccountTab(route?.params?.tab);
  const scrollBottomPadding = useScrollContentBottomPadding(40);

  const [orgId, setOrgId] = useState(null);
  const [orgName, setOrgName] = useState('');
  const [tab, setTab] = useState(initialTab);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [setupInput, setSetupInput] = useState({
    activities: [],
    publicEnabled: false,
    publicSlug: '',
    legalComplete: false,
    isServiceCenter: false,
  });
  const [refreshKey, setRefreshKey] = useState(0);

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
        setError(t('org.companyAccount.loadError', null, 'Could not load company account.'));
        return;
      }
      const memberships = await readOrganizationMemberships();
      const membership = memberships.find((row) => Number(row?.id) === Number(resolved));
      setOrgName(membership?.display_name || '');

      const [activitiesData, publicData, legalData] = await Promise.all([
        getOrganizationActivities(token, resolved).catch(() => null),
        getOrganizationPublicProfileSettings(token, resolved).catch(() => null),
        getOrganizationLegalEntity(token, resolved).catch(() => null),
      ]);

      const activities = Array.isArray(activitiesData?.activities)
        ? activitiesData.activities
        : Array.isArray(membership?.activities)
          ? membership.activities
          : [];
      const publicActivities = Array.isArray(publicData?.activities) ? publicData.activities : [];
      const mergedActivities = activities.length ? activities : publicActivities;

      setSetupInput({
        activities: mergedActivities,
        publicEnabled: Boolean(publicData?.public_profile_enabled),
        publicSlug: publicData?.public_slug || '',
        legalComplete: Boolean(legalData?.legal_entity_complete),
        isServiceCenter:
          Boolean(publicData?.is_service_center) || mergedActivities.includes('service_center'),
      });
    } catch (e) {
      setError(
        e.message || t('org.companyAccount.loadError', null, 'Could not load company account.'),
      );
    } finally {
      setLoading(false);
    }
  }, [routeOrgId, t]);

  useFocusEffect(
    useCallback(() => {
      const nextTab = normalizeOrgAccountTab(route?.params?.tab);
      setTab(nextTab);
      load();
    }, [load, route?.params?.tab]),
  );

  const checklist = useMemo(
    () => buildOrgCompanySetupChecklist(setupInput),
    [setupInput],
  );

  const tabButtons = useMemo(
    () => [
      {
        value: 'company',
        label: t('org.companyAccount.tabs.company', null, 'Company'),
      },
      {
        value: 'activities',
        label: t('org.companyAccount.tabs.activities', null, 'Activities'),
      },
      {
        value: 'public',
        label: t('org.companyAccount.tabs.public', null, 'Public'),
      },
      {
        value: 'account',
        label: t('org.companyAccount.tabs.account', null, 'Account'),
      },
    ],
    [t],
  );

  const embeddedRoute = useMemo(
    () => ({
      params: {
        organizationId: orgId || routeOrgId,
        orgId: orgId || routeOrgId,
        embedded: true,
        returnTo: 'OrgCompanyAccount',
      },
    }),
    [orgId, routeOrgId],
  );

  const openTab = (next) => {
    const value = normalizeOrgAccountTab(next);
    setTab(value);
    if (Platform.OS === 'web' && navigation?.setParams) {
      navigation.setParams({ tab: value });
    }
  };

  const onEmbeddedSaved = useCallback(() => {
    setRefreshKey((n) => n + 1);
    load();
  }, [load]);

  const openPersonalAccount = () => {
    if (Platform.OS === 'web') {
      navigateToProfile(navigation);
      return;
    }
    const root = navigation.getParent?.() || navigation;
    navigateToProfile(root);
  };

  return (
    <ScreenBackground>
      <OrgAppHeader
        mode="detail"
        title={t('org.companyAccount.title', null, 'Company account')}
        onBack={onBack}
        backLabel={t('org.companyAccount.backHome', null, 'Dashboard')}
        iconOnlyBack={false}
      />
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: scrollBottomPadding }]}
        keyboardShouldPersistTaps="handled"
      >
        {loading && !orgId ? (
          <ActivityIndicator color="#fff" style={styles.loader} />
        ) : (
          <>
            <AppCard style={styles.summaryCard}>
              <View style={styles.summaryHeader}>
                <Text style={styles.percent}>{checklist.percent}%</Text>
                <View style={styles.summaryCopy}>
                  <Text style={styles.summaryTitle} numberOfLines={1}>
                    {orgName || t('org.companyAccount.title', null, 'Company account')}
                  </Text>
                  <Text style={styles.summaryStatus}>
                    {checklist.listingReady
                      ? t(
                          'org.companyAccount.statusReady',
                          null,
                          'Setup complete — public listing can go live',
                        )
                      : t(
                          'org.companyAccount.statusProgress',
                          null,
                          'Finish the checklist to complete your company setup',
                        )}
                  </Text>
                </View>
              </View>
              <ProgressBar
                progress={Math.max(0, Math.min(1, checklist.percent / 100))}
                color={checklist.listingReady ? '#15803d' : COLORS.PRIMARY}
                style={styles.progress}
              />
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <View style={styles.checkList}>
                {checklist.scored.map((row) => (
                  <Pressable
                    key={row.id}
                    onPress={() => openTab(row.tab)}
                    style={({ pressed }) => [styles.checkRow, pressed && styles.checkPressed]}
                    accessibilityRole="button"
                  >
                    <MaterialCommunityIcons
                      name={row.done ? 'check-circle' : 'circle-outline'}
                      size={20}
                      color={row.done ? '#15803d' : ON_CARD_MUTED}
                    />
                    <Text style={[styles.checkLabel, row.done && styles.checkDone]}>
                      {checklistLabel(row.id, t)}
                    </Text>
                    {!row.done ? (
                      <Text style={styles.checkFix}>
                        {t('org.companyAccount.fix', null, 'Fix')}
                      </Text>
                    ) : null}
                  </Pressable>
                ))}
              </View>
              {checklist.next ? (
                <Button
                  mode="contained"
                  onPress={() => openTab(checklist.next.tab)}
                  buttonColor={COLORS.PRIMARY}
                  textColor={COLORS.ON_PRIMARY}
                  style={styles.continueBtn}
                >
                  {t('org.companyAccount.continueSetup', null, 'Continue setup')}
                </Button>
              ) : null}
            </AppCard>

            <SegmentedButtons
              value={tab}
              onValueChange={openTab}
              buttons={tabButtons}
              style={styles.tabs}
            />

            <View style={styles.tabBody} key={`${tab}-${refreshKey}`}>
              {tab === 'company' ? (
                <OrgLegalEntityScreen
                  navigation={navigation}
                  route={embeddedRoute}
                  embedded
                  onSaved={onEmbeddedSaved}
                />
              ) : null}
              {tab === 'activities' ? (
                <OrgActivitiesScreen
                  navigation={navigation}
                  route={embeddedRoute}
                  embedded
                  onSaved={onEmbeddedSaved}
                  onOpenPublicTab={() => openTab('public')}
                />
              ) : null}
              {tab === 'public' ? (
                <OrgPublicProfileScreen
                  navigation={navigation}
                  route={embeddedRoute}
                  embedded
                  onSaved={onEmbeddedSaved}
                />
              ) : null}
              {tab === 'account' ? (
                <AppCard style={styles.accountCard}>
                  <Text style={styles.accountLead}>
                    {t(
                      'org.companyAccount.accountLead',
                      null,
                      'Personal login, nickname, and notification preferences for your user — separate from company details.',
                    )}
                  </Text>
                  <Button mode="contained" onPress={openPersonalAccount}>
                    {t('org.companyAccount.openMyAccount', null, 'Open my account')}
                  </Button>
                </AppCard>
              ) : null}
            </View>
          </>
        )}
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 16, gap: 12 },
  loader: { marginTop: 40 },
  summaryCard: { padding: 16, gap: 10 },
  summaryHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  percent: {
    color: COLORS.PRIMARY,
    fontSize: 28,
    fontWeight: '800',
    minWidth: 64,
  },
  summaryCopy: { flex: 1, gap: 2 },
  summaryTitle: { color: ON_CARD, fontSize: 16, fontWeight: '700' },
  summaryStatus: { color: ON_CARD_MUTED, fontSize: 13, lineHeight: 18 },
  progress: { height: 8, borderRadius: 999, backgroundColor: '#E2E8F0' },
  checkList: { gap: 6, marginTop: 4 },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
  },
  checkPressed: { opacity: 0.85 },
  checkLabel: { flex: 1, color: ON_CARD, fontSize: 14 },
  checkDone: { color: ON_CARD_MUTED },
  checkFix: { color: COLORS.PRIMARY, fontWeight: '700', fontSize: 12 },
  continueBtn: { marginTop: 4 },
  tabs: { backgroundColor: 'transparent' },
  tabBody: { minHeight: 120 },
  accountCard: { padding: 16, gap: 12 },
  accountLead: { color: ON_CARD_MUTED, fontSize: 14, lineHeight: 20 },
  error: { color: '#B91C1C', fontSize: 13 },
});
