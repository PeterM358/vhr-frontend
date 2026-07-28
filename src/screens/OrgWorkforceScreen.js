import React, { useCallback, useMemo, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityIndicator, Button, Text, TextInput } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useFocusEffect } from '@react-navigation/native';

import ScreenBackground from '../components/ScreenBackground';
import AppCard from '../components/ui/AppCard';
import OrgAppHeader from '../components/org/OrgAppHeader';
import { createOrganizationMembershipInvite } from '../api/network';
import { listOrgWorkforce } from '../api/orgWorkforce';
import {
  readOrganizationMemberships,
  resolveActiveOrganizationId,
} from '../utils/orgWorkspace';
import { navigateToOrgHome, navigateToOrgWorkforceMember } from '../navigation/webNavigation';
import { useTranslation } from '../i18n';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { COLORS } from '../constants/colors';
import { useScrollContentBottomPadding } from '../utils/mobileWebInsets';

// Phase B HR (not built): manager→worker groups, multi-employer split shifts,
// salaries / осигуровки, sick-leave uploads. Keep list + invite + role/vehicle
// stubs until a dedicated HR model exists — skip empty Teams UI for now.

const ROLE_OPTIONS = [
  { value: 'transport', labelKey: 'org.workforce.roles.transport' },
  { value: 'admin', labelKey: 'org.workforce.roles.admin' },
  { value: 'viewer', labelKey: 'org.workforce.roles.viewer' },
  { value: 'warehouse', labelKey: 'org.workforce.roles.warehouse' },
  { value: 'accounting', labelKey: 'org.workforce.roles.accounting' },
];

const FILTER_ROLES = [
  { value: 'all', labelKey: 'org.workforce.filterAll' },
  ...ROLE_OPTIONS,
];

const MODES = [
  { id: 'list', labelKey: 'org.workforce.allMembers' },
  { id: 'dismissed', labelKey: 'org.workforce.dismissedMembers' },
  { id: 'add', labelKey: 'org.workforce.addMember' },
];

async function copyInviteLink(text) {
  if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
    await navigator.clipboard.writeText(text);
    return;
  }
  await Share.share({ message: text });
}

export default function OrgWorkforceScreen({ navigation, route }) {
  const { t } = useTranslation();
  const routeOrgId = route?.params?.organizationId || route?.params?.orgId;
  const initialMode = route?.params?.mode === 'add' ? 'add' : 'list';
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
  const [error, setError] = useState('');
  const [canManage, setCanManage] = useState(false);
  const [members, setMembers] = useState([]);
  const [mode, setMode] = useState(initialMode);
  const [roleFilter, setRoleFilter] = useState('all');

  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePhone, setInvitePhone] = useState('');
  const [inviteRole, setInviteRole] = useState('transport');
  const [inviteBusy, setInviteBusy] = useState(false);
  const [inviteLink, setInviteLink] = useState('');
  const [inviteMessage, setInviteMessage] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      const resolved = await resolveActiveOrganizationId(routeOrgId);
      setOrgId(resolved);
      if (!resolved) {
        setMembers([]);
        setCanManage(false);
        setError(t('org.workforce.loadError', null, 'Could not load workforce.'));
        return;
      }
      const status = mode === 'dismissed' ? 'dismissed' : 'active';
      const workforce = await listOrgWorkforce(token, resolved, { status });
      setCanManage(Boolean(workforce?.can_manage || workforce?.can_assign_vehicles));
      setMembers(Array.isArray(workforce?.results) ? workforce.results : []);
    } catch (e) {
      setError(e.message || t('org.workforce.loadError', null, 'Could not load workforce.'));
      setMembers([]);
    } finally {
      setLoading(false);
    }
  }, [mode, routeOrgId, t]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const roleLabel = useCallback(
    (role) => t(`org.workforce.roles.${role}`, null, role),
    [t],
  );

  const filteredMembers = useMemo(() => {
    if (mode === 'dismissed' || roleFilter === 'all') return members;
    return members.filter((m) => m.role === roleFilter);
  }, [members, mode, roleFilter]);

  const createInvite = async () => {
    if (!orgId || (!inviteEmail.trim() && !invitePhone.trim())) return;
    setInviteBusy(true);
    setInviteMessage('');
    setInviteLink('');
    setError('');
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      const payload = { role: inviteRole };
      if (inviteEmail.trim()) payload.email = inviteEmail.trim().toLowerCase();
      if (invitePhone.trim()) payload.phone = invitePhone.trim();
      const result = await createOrganizationMembershipInvite(token, orgId, payload);
      setInviteLink(result.invite_url || '');
      setInviteMessage(t('network.membershipInvite.created'));
      setInviteEmail('');
      setInvitePhone('');
      await load();
    } catch (e) {
      setError(e.message || t('org.workforce.inviteError', null, 'Could not create invite.'));
    } finally {
      setInviteBusy(false);
    }
  };

  const openMember = (member) => {
    navigateToOrgWorkforceMember(navigation, {
      orgId,
      membershipId: member.membership_id,
    });
  };

  const visibleModes = canManage
    ? MODES
    : MODES.filter((m) => m.id === 'list' || m.id === 'dismissed');

  return (
    <ScreenBackground safeArea={false}>
      <OrgAppHeader
        mode="nested"
        title={t('org.workforce.title', null, 'Workforce')}
        onBack={onBack}
      />
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: scrollBottomPadding }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.segmentOuter}>
          <View style={styles.segmentTrack}>
            {visibleModes.map((tab) => {
              const selected = mode === tab.id;
              return (
                <Pressable
                  key={tab.id}
                  onPress={() => setMode(tab.id)}
                  style={[styles.segmentCell, selected && styles.segmentCellActive]}
                >
                  <Text style={[styles.segmentLabel, selected && styles.segmentLabelActive]}>
                    {t(tab.labelKey, null, tab.id)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {loading ? <ActivityIndicator color="#fff" style={styles.loader} /> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {mode === 'add' && canManage ? (
          <AppCard style={styles.card}>
            <Text style={styles.cardTitle}>
              {t('org.workforce.inviteTitle', null, 'Invite member')}
            </Text>
            <Text style={styles.helper}>
              {t(
                'org.workforce.inviteHelper',
                null,
                'Invite by email or phone. Share the one-time link so they can join.',
              )}
            </Text>
            <TextInput
              label={t('network.membershipInvite.email', null, 'Member email')}
              value={inviteEmail}
              onChangeText={setInviteEmail}
              mode="outlined"
              autoCapitalize="none"
              keyboardType="email-address"
              style={styles.input}
              textColor={COLORS.TEXT_DARK}
            />
            <TextInput
              label={t('org.workforce.phone', null, 'Phone (optional)')}
              value={invitePhone}
              onChangeText={setInvitePhone}
              mode="outlined"
              keyboardType="phone-pad"
              style={styles.input}
              textColor={COLORS.TEXT_DARK}
            />
            <Text style={styles.fieldLabel}>
              {t('network.membershipInvite.role', null, 'Organization role')}
            </Text>
            <View style={styles.roleChips}>
              {ROLE_OPTIONS.map((opt) => (
                <Button
                  key={opt.value}
                  mode={inviteRole === opt.value ? 'contained' : 'outlined'}
                  compact
                  onPress={() => setInviteRole(opt.value)}
                  style={styles.roleChip}
                  labelStyle={inviteRole === opt.value ? undefined : styles.outlinedChipLabel}
                >
                  {t(opt.labelKey, null, opt.value)}
                </Button>
              ))}
            </View>
            <Button mode="contained" loading={inviteBusy} disabled={inviteBusy} onPress={createInvite}>
              {t('network.membershipInvite.send', null, 'Create invite link')}
            </Button>
            {inviteLink ? (
              <View style={styles.inviteLinkBox}>
                <Text style={styles.helper}>{t('network.membershipInvite.linkReady')}</Text>
                <Text selectable style={styles.link}>
                  {inviteLink}
                </Text>
                <Button mode="outlined" onPress={() => copyInviteLink(inviteLink)} labelStyle={styles.outlinedChipLabel}>
                  {t('network.membershipInvite.copyLink')}
                </Button>
              </View>
            ) : null}
            {inviteMessage ? <Text style={styles.success}>{inviteMessage}</Text> : null}
          </AppCard>
        ) : null}

        {mode === 'list' || mode === 'dismissed' ? (
          <>
            {mode === 'list' ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterRow}
              >
                {FILTER_ROLES.map((opt) => {
                  const selected = roleFilter === opt.value;
                  return (
                    <Pressable
                      key={opt.value}
                      onPress={() => setRoleFilter(opt.value)}
                      style={[styles.filterChip, selected && styles.filterChipActive]}
                    >
                      <Text style={[styles.filterChipLabel, selected && styles.filterChipLabelActive]}>
                        {t(opt.labelKey, null, opt.value)}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            ) : null}

            {!loading && filteredMembers.length === 0 ? (
              <AppCard style={styles.card}>
                <Text style={styles.helper}>
                  {members.length === 0
                    ? mode === 'dismissed'
                      ? t('org.workforce.emptyDismissed', null, 'No dismissed members.')
                      : t('org.workforce.empty', null, 'No members yet.')
                    : t('org.workforce.emptyFiltered', null, 'No members match this role.')}
                </Text>
              </AppCard>
            ) : null}

            {filteredMembers.map((member) => {
              const assignments = Array.isArray(member.vehicle_assignments)
                ? member.vehicle_assignments
                : [];
              const contact = [member.email, member.phone].filter(Boolean).join(' · ');
              const vehicleSummary = assignments.length
                ? assignments
                    .map((row) => row.vehicle_label || row.license_plate || `#${row.vehicle_id}`)
                    .join(', ')
                : t('org.workforce.noVehicles', null, 'No vehicle assigned');
              return (
                <Pressable
                  key={member.membership_id}
                  onPress={() => openMember(member)}
                  style={({ pressed }) => [pressed && styles.pressed]}
                >
                  <AppCard style={styles.memberCard}>
                    <View style={styles.memberRowInner}>
                      <View style={styles.memberBody}>
                        <Text style={styles.memberName}>{member.display_name}</Text>
                        {contact ? <Text style={styles.memberMeta}>{contact}</Text> : null}
                        <Text style={styles.memberMeta}>
                          {t('org.workforce.roleLabel', null, 'Role')}: {roleLabel(member.role)}
                          {member.manage_fleet
                            ? ` · ${t('org.workforce.manageFleet', null, 'Fleet manager')}`
                            : ''}
                          {mode === 'dismissed'
                            ? ` · ${t('org.workforce.dismissed', null, 'Dismissed')}`
                            : ''}
                        </Text>
                        {mode === 'list' ? (
                          <Text style={styles.memberMeta}>{vehicleSummary}</Text>
                        ) : null}
                      </View>
                      <MaterialCommunityIcons name="chevron-right" size={24} color="#94a3b8" />
                    </View>
                  </AppCard>
                </Pressable>
              );
            })}
          </>
        ) : null}
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: 14,
    paddingTop: 12,
    gap: 12,
  },
  segmentOuter: {
    marginBottom: 4,
  },
  segmentTrack: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 14,
    padding: 4,
    gap: 4,
  },
  segmentCell: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 11,
    alignItems: 'center',
  },
  segmentCellActive: {
    backgroundColor: '#fff',
  },
  segmentLabel: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  segmentLabelActive: {
    color: COLORS.TEXT_DARK,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  filterChipActive: {
    backgroundColor: '#fff',
    borderColor: '#fff',
  },
  filterChipLabel: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
    fontWeight: '600',
  },
  filterChipLabelActive: {
    color: COLORS.TEXT_DARK,
  },
  loader: {
    marginVertical: 16,
  },
  card: {
    padding: 14,
    gap: 10,
  },
  memberCard: {
    padding: 14,
  },
  memberRowInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  memberBody: {
    flex: 1,
    gap: 4,
  },
  cardTitle: {
    color: COLORS.TEXT_DARK,
    fontSize: 17,
    fontWeight: '700',
  },
  helper: {
    color: COLORS.TEXT_MUTED,
    marginBottom: 4,
    lineHeight: 20,
  },
  fieldLabel: {
    color: COLORS.TEXT_MUTED,
    fontSize: 13,
    marginBottom: 4,
    fontWeight: '600',
  },
  input: {
    marginBottom: 4,
    backgroundColor: '#fff',
  },
  error: {
    color: '#fecaca',
    marginBottom: 8,
  },
  success: {
    color: '#166534',
    marginTop: 6,
    fontWeight: '600',
  },
  link: {
    color: COLORS.TEXT_DARK,
    marginVertical: 6,
  },
  inviteLinkBox: {
    marginTop: 8,
    gap: 6,
  },
  roleChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  roleChip: {
    marginRight: 0,
  },
  outlinedChipLabel: {
    color: COLORS.TEXT_DARK,
  },
  memberName: {
    color: COLORS.TEXT_DARK,
    fontSize: 16,
    fontWeight: '700',
  },
  memberMeta: {
    color: COLORS.TEXT_MUTED,
    fontSize: 13,
    lineHeight: 18,
  },
  pressed: {
    opacity: 0.88,
  },
});
