/**
 * Company account hub for organizations: completion summary + tabs
 * (Company details | Activities | Public profile | My account).
 */

import React, { useCallback, useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityIndicator, Button, ProgressBar, Text } from 'react-native-paper';
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
  isOrgLocationComplete,
  normalizeOrgAccountTab,
} from '../utils/orgCompanySetup';
import { navigateToOrgHome, navigateToProfile } from '../navigation/webNavigation';
import { useTranslation } from '../i18n';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { useScrollContentBottomPadding } from '../utils/mobileWebInsets';
import { COLORS } from '../constants/colors';

const ON_CARD = '#0F172A';
const ON_CARD_MUTED = '#475569';
const TAB_ACTIVE_BG = COLORS.PRIMARY;
const TAB_INACTIVE_BG = '#F1F5F9';
const TAB_INACTIVE_TEXT = '#0F172A';
const TAB_ACTIVE_TEXT = '#FFFFFF';

function checklistLabel(id, t) {
  switch (id) {
    case 'activities':
      return t('org.companyAccount.check.activities', null, 'Choose company activities');
    case 'public_listing':
      return t(
        'org.companyAccount.check.publicListing',
        null,
        'Public listing on (URL slug set)',
      );
    case 'location':
      return t(
        'org.companyAccount.check.location',
        null,
        'Location: address or map pin',
      );
    case 'legal':
      return t('org.companyAccount.check.legal', null, 'Company legal details filled');
    default:
      return id;
  }
}

function networkErrorMessage(err, fallback) {
  const msg = String(err?.message || '').trim();
  if (!msg || /failed to fetch|network request failed|load failed/i.test(msg)) {
    return fallback;
  }
  return msg;
}

export default function OrgCompanyAccountScreen({ navigation, route }) {
  const { t } = useTranslation();
  const routeOrgId = route?.params?.organizationId || route?.params?.orgId;
  const initialTab = normalizeOrgAccountTab(route?.params?.tab);
  const scrollBottomPadding = useScrollContentBottomPadding(40);

  const [orgId, setOrgId] = useState(null);
  const [orgName, setOrgName] = useState('');
  const [hasShopLocations, setHasShopLocations] = useState(false);
  const [tab, setTab] = useState(initialTab);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [setupInput, setSetupInput] = useState({
    activities: [],
    publicEnabled: false,
    publicSlug: '',
    legalComplete: false,
    locationComplete: false,
    isServiceCenter: false,
    loadFailed: false,
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
        setSetupInput((prev) => ({ ...prev, loadFailed: true }));
        return;
      }
      if (!token) {
        setError(
          t(
            'org.companyAccount.sessionError',
            null,
            'Session expired — sign in again to load company details.',
          ),
        );
        setSetupInput((prev) => ({ ...prev, loadFailed: true }));
        return;
      }
      const memberships = await readOrganizationMemberships();
      const membership = memberships.find((row) => Number(row?.id) === Number(resolved));
      setOrgName(membership?.display_name || '');
      const shopLocations = Boolean(membership?.has_shop_locations);
      setHasShopLocations(shopLocations);

      const results = await Promise.allSettled([
        getOrganizationActivities(token, resolved),
        getOrganizationPublicProfileSettings(token, resolved),
        getOrganizationLegalEntity(token, resolved),
      ]);

      const activitiesData = results[0].status === 'fulfilled' ? results[0].value : null;
      const publicData = results[1].status === 'fulfilled' ? results[1].value : null;
      const legalData = results[2].status === 'fulfilled' ? results[2].value : null;
      const failures = results.filter((row) => row.status === 'rejected');
      const anyFailed = failures.length > 0;

      if (anyFailed) {
        const firstMsg = networkErrorMessage(
          failures[0].reason,
          t(
            'org.companyAccount.partialLoadError',
            null,
            'Some company settings could not load. Check your connection and try again.',
          ),
        );
        setError(firstMsg);
      }

      const activities = Array.isArray(activitiesData?.activities)
        ? activitiesData.activities
        : Array.isArray(membership?.activities)
          ? membership.activities
          : [];
      const publicActivities = Array.isArray(publicData?.activities) ? publicData.activities : [];
      const mergedActivities = activities.length ? activities : publicActivities;
      const legalEntity = legalData?.legal_entity || null;
      const locationComplete = isOrgLocationComplete({
        hasShopLocations: shopLocations,
        addressLine: legalEntity?.registered_address_line1,
        city: legalEntity?.registered_city,
      });

      // Prefer live API for public/legal; membership fallback only when API succeeded with empty
      // or when API failed use membership public flags so we don't invent "done".
      const publicEnabled = publicData
        ? Boolean(publicData.public_profile_enabled)
        : Boolean(membership?.public_profile_enabled);
      const publicSlug = publicData
        ? publicData.public_slug || ''
        : membership?.public_slug || '';

      setSetupInput({
        activities: mergedActivities,
        publicEnabled,
        publicSlug,
        legalComplete: Boolean(legalData?.legal_entity_complete),
        locationComplete,
        isServiceCenter:
          Boolean(publicData?.is_service_center) || mergedActivities.includes('service_center'),
        // Only mark loadFailed when public/legal APIs failed (activities can fall back to membership).
        loadFailed: results[1].status === 'rejected' || results[2].status === 'rejected',
      });
    } catch (e) {
      setError(
        networkErrorMessage(
          e,
          t('org.companyAccount.loadError', null, 'Could not load company account.'),
        ),
      );
      setSetupInput((prev) => ({ ...prev, loadFailed: true }));
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
                          { done: checklist.doneCount, total: checklist.total },
                          `Finish the checklist (${checklist.doneCount}/${checklist.total})`,
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
                      size={18}
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
                  compact
                  style={styles.continueBtn}
                >
                  {t('org.companyAccount.continueSetup', null, 'Continue setup')}
                </Button>
              ) : null}
            </AppCard>

            <View style={styles.tabsRow}>
              {tabButtons.map((btn) => {
                const active = tab === btn.value;
                return (
                  <Pressable
                    key={btn.value}
                    onPress={() => openTab(btn.value)}
                    style={[styles.tabChip, active ? styles.tabChipActive : styles.tabChipInactive]}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: active }}
                  >
                    <Text
                      style={[styles.tabChipLabel, active ? styles.tabChipLabelActive : null]}
                      numberOfLines={1}
                    >
                      {btn.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.tabBody} key={`${tab}-${refreshKey}`}>
              {tab === 'company' ? (
                <>
                  {checklist.isServiceCenter && !hasShopLocations ? (
                    <Text style={styles.locationHint}>
                      {t(
                        'org.companyAccount.locationHint',
                        null,
                        'Add your registered address below so customers can find you. A map pin comes when you link a service-center location.',
                      )}
                    </Text>
                  ) : null}
                  <OrgLegalEntityScreen
                    navigation={navigation}
                    route={embeddedRoute}
                    embedded
                    onSaved={onEmbeddedSaved}
                  />
                </>
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
                  onOpenCompanyTab={() => openTab('company')}
                  hasShopLocations={hasShopLocations}
                  locationComplete={setupInput.locationComplete}
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
  scroll: { padding: 16, gap: 10 },
  loader: { marginTop: 40 },
  summaryCard: { paddingVertical: 12, paddingHorizontal: 14, gap: 6 },
  summaryHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  percent: {
    color: COLORS.PRIMARY,
    fontSize: 22,
    fontWeight: '800',
    minWidth: 48,
  },
  summaryCopy: { flex: 1, gap: 1 },
  summaryTitle: { color: ON_CARD, fontSize: 15, fontWeight: '700' },
  summaryStatus: { color: ON_CARD_MUTED, fontSize: 12, lineHeight: 16 },
  progress: { height: 6, borderRadius: 999, backgroundColor: '#E2E8F0' },
  checkList: { gap: 2, marginTop: 2 },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  checkPressed: { opacity: 0.85 },
  checkLabel: { flex: 1, color: ON_CARD, fontSize: 13 },
  checkDone: { color: ON_CARD_MUTED },
  checkFix: { color: COLORS.PRIMARY, fontWeight: '700', fontSize: 12 },
  continueBtn: { marginTop: 2, alignSelf: 'flex-start' },
  tabsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 12,
    padding: 8,
  },
  tabChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    minWidth: 72,
    alignItems: 'center',
  },
  tabChipActive: { backgroundColor: TAB_ACTIVE_BG },
  tabChipInactive: { backgroundColor: TAB_INACTIVE_BG },
  tabChipLabel: {
    color: TAB_INACTIVE_TEXT,
    fontSize: 13,
    fontWeight: '700',
  },
  tabChipLabelActive: { color: TAB_ACTIVE_TEXT },
  tabBody: { minHeight: 120, gap: 8 },
  locationHint: {
    color: '#E2E8F0',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 4,
  },
  accountCard: { padding: 16, gap: 12 },
  accountLead: { color: ON_CARD_MUTED, fontSize: 14, lineHeight: 20 },
  error: { color: '#B91C1C', fontSize: 12, lineHeight: 16 },
});
