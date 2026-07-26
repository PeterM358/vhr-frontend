import React, { useCallback, useMemo, useState } from 'react';
import { Alert, Platform, ScrollView, Share, StyleSheet, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityIndicator, Button, Menu, Text, TextInput } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';

import ScreenBackground from '../components/ScreenBackground';
import AppCard from '../components/ui/AppCard';
import OrgAppHeader from '../components/org/OrgAppHeader';
import { createOrganizationMembershipInvite } from '../api/network';
import { listOrgFleet } from '../api/fleet';
import {
  createVehicleAssignment,
  endVehicleAssignment,
  listOrgWorkforce,
  updateOrgWorkforceMember,
} from '../api/orgWorkforce';
import {
  readOrganizationMemberships,
  resolveActiveOrganizationId,
} from '../utils/orgWorkspace';
import { navigateToOrgHome } from '../navigation/webNavigation';
import { useTranslation } from '../i18n';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { useScrollContentBottomPadding } from '../utils/mobileWebInsets';

const ROLE_OPTIONS = [
  { value: 'transport', labelKey: 'org.workforce.roles.transport' },
  { value: 'admin', labelKey: 'org.workforce.roles.admin' },
  { value: 'viewer', labelKey: 'org.workforce.roles.viewer' },
  { value: 'warehouse', labelKey: 'org.workforce.roles.warehouse' },
  { value: 'accounting', labelKey: 'org.workforce.roles.accounting' },
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
  const [fleet, setFleet] = useState([]);

  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePhone, setInvitePhone] = useState('');
  const [inviteRole, setInviteRole] = useState('transport');
  const [inviteBusy, setInviteBusy] = useState(false);
  const [inviteLink, setInviteLink] = useState('');
  const [inviteMessage, setInviteMessage] = useState('');

  const [assignUserId, setAssignUserId] = useState(null);
  const [assignVehicleId, setAssignVehicleId] = useState(null);
  const [vehicleMenuOpen, setVehicleMenuOpen] = useState(false);
  const [assignBusy, setAssignBusy] = useState(false);

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
      const [workforce, fleetData] = await Promise.all([
        listOrgWorkforce(token, resolved),
        listOrgFleet(token, resolved, {}).catch(() => ({ results: [] })),
      ]);
      setCanManage(Boolean(workforce?.can_manage || workforce?.can_assign_vehicles));
      setMembers(Array.isArray(workforce?.results) ? workforce.results : []);
      setFleet(Array.isArray(fleetData?.results) ? fleetData.results : []);
    } catch (e) {
      setError(e.message || t('org.workforce.loadError', null, 'Could not load workforce.'));
      setMembers([]);
    } finally {
      setLoading(false);
    }
  }, [routeOrgId, t]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const roleLabel = useCallback(
    (role) => t(`org.workforce.roles.${role}`, null, role),
    [t],
  );

  const assignmentRoleLabel = useCallback(
    (role) => t(`org.workforce.assignmentRoles.${role}`, null, role),
    [t],
  );

  const selectedVehicleLabel = useMemo(() => {
    if (!assignVehicleId) return t('org.workforce.pickVehicle', null, 'Choose vehicle');
    const row = fleet.find((v) => String(v.id) === String(assignVehicleId));
    if (!row) return t('org.workforce.pickVehicle', null, 'Choose vehicle');
    return row.license_plate || row.fleet_id || row.display_name || `#${row.id}`;
  }, [assignVehicleId, fleet, t]);

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

  const changeRole = async (member, role) => {
    if (!canManage || !orgId || member.role === 'owner' || member.role === role) return;
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      await updateOrgWorkforceMember(token, orgId, member.membership_id, { role });
      await load();
    } catch (e) {
      Alert.alert(t('common.error'), e.message || t('org.workforce.roleError', null, 'Could not update role.'));
    }
  };

  const assignVehicle = async () => {
    if (!orgId || !assignUserId || !assignVehicleId) return;
    setAssignBusy(true);
    setError('');
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      await createVehicleAssignment(token, orgId, {
        vehicle_id: Number(assignVehicleId),
        user_id: Number(assignUserId),
        role: 'driver',
      });
      setAssignUserId(null);
      setAssignVehicleId(null);
      await load();
    } catch (e) {
      setError(e.message || t('org.workforce.assignError', null, 'Could not assign vehicle.'));
    } finally {
      setAssignBusy(false);
    }
  };

  const endAssignment = async (assignmentId) => {
    if (!orgId || !canManage) return;
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      await endVehicleAssignment(token, orgId, assignmentId);
      await load();
    } catch (e) {
      Alert.alert(
        t('common.error'),
        e.message || t('org.workforce.endAssignError', null, 'Could not end assignment.'),
      );
    }
  };

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
        {loading ? <ActivityIndicator color="#fff" style={styles.loader} /> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {canManage ? (
          <AppCard style={styles.card}>
            <Text variant="titleMedium">{t('org.workforce.inviteTitle', null, 'Invite member')}</Text>
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
            />
            <TextInput
              label={t('org.workforce.phone', null, 'Phone (optional)')}
              value={invitePhone}
              onChangeText={setInvitePhone}
              mode="outlined"
              keyboardType="phone-pad"
              style={styles.input}
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
                <Button mode="outlined" onPress={() => copyInviteLink(inviteLink)}>
                  {t('network.membershipInvite.copyLink')}
                </Button>
              </View>
            ) : null}
            {inviteMessage ? <Text style={styles.success}>{inviteMessage}</Text> : null}
          </AppCard>
        ) : null}

        <AppCard style={styles.card}>
          <Text variant="titleMedium">{t('org.workforce.membersTitle', null, 'Team members')}</Text>
          {!loading && members.length === 0 ? (
            <Text style={styles.helper}>{t('org.workforce.empty', null, 'No members yet.')}</Text>
          ) : null}
          {members.map((member) => {
            const assignments = Array.isArray(member.vehicle_assignments)
              ? member.vehicle_assignments
              : [];
            const contact = [member.email, member.phone].filter(Boolean).join(' · ');
            return (
              <View key={member.membership_id} style={styles.memberRow}>
                <Text style={styles.memberName}>{member.display_name}</Text>
                {contact ? <Text style={styles.memberMeta}>{contact}</Text> : null}
                <Text style={styles.memberMeta}>
                  {t('org.workforce.roleLabel', null, 'Role')}: {roleLabel(member.role)}
                  {member.manage_fleet
                    ? ` · ${t('org.workforce.manageFleet', null, 'Fleet manager')}`
                    : ''}
                </Text>
                {assignments.length ? (
                  <View style={styles.assignList}>
                    {assignments.map((row) => (
                      <View key={row.id} style={styles.assignRow}>
                        <Text style={styles.assignText}>
                          {row.vehicle_label || row.license_plate || `#${row.vehicle_id}`}
                          {row.role ? ` · ${assignmentRoleLabel(row.role)}` : ''}
                        </Text>
                        {canManage ? (
                          <Button compact onPress={() => endAssignment(row.id)}>
                            {t('org.workforce.endAssignment', null, 'End')}
                          </Button>
                        ) : null}
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.memberMeta}>
                    {t('org.workforce.noVehicles', null, 'No vehicle assigned')}
                  </Text>
                )}
                {canManage && member.role !== 'owner' ? (
                  <View style={styles.memberActions}>
                    <Text style={styles.fieldLabel}>
                      {t('org.workforce.changeRole', null, 'Change role')}
                    </Text>
                    <View style={styles.roleChips}>
                      {ROLE_OPTIONS.map((opt) => (
                        <Button
                          key={opt.value}
                          compact
                          mode={member.role === opt.value ? 'contained' : 'outlined'}
                          onPress={() => changeRole(member, opt.value)}
                        >
                          {t(opt.labelKey, null, opt.value)}
                        </Button>
                      ))}
                    </View>
                    <Button
                      mode="contained-tonal"
                      compact
                      onPress={() => {
                        setAssignUserId(member.user_id);
                        setAssignVehicleId(null);
                      }}
                    >
                      {t('org.workforce.assignVehicle', null, 'Assign vehicle')}
                    </Button>
                  </View>
                ) : null}
              </View>
            );
          })}
        </AppCard>

        {canManage && assignUserId ? (
          <AppCard style={styles.card}>
            <Text variant="titleMedium">
              {t('org.workforce.assignTitle', null, 'Assign vehicle')}
            </Text>
            <Text style={styles.helper}>
              {members.find((m) => String(m.user_id) === String(assignUserId))?.display_name || ''}
            </Text>
            <Menu
              visible={vehicleMenuOpen}
              onDismiss={() => setVehicleMenuOpen(false)}
              anchor={
                <Button mode="outlined" onPress={() => setVehicleMenuOpen(true)}>
                  {selectedVehicleLabel}
                </Button>
              }
            >
              {fleet.map((v) => (
                <Menu.Item
                  key={v.id}
                  title={v.license_plate || v.fleet_id || v.display_name || `#${v.id}`}
                  onPress={() => {
                    setAssignVehicleId(v.id);
                    setVehicleMenuOpen(false);
                  }}
                />
              ))}
            </Menu>
            <View style={styles.assignActions}>
              <Button mode="outlined" onPress={() => setAssignUserId(null)}>
                {t('common.cancel', null, 'Cancel')}
              </Button>
              <Button
                mode="contained"
                loading={assignBusy}
                disabled={assignBusy || !assignVehicleId}
                onPress={assignVehicle}
              >
                {t('org.workforce.confirmAssign', null, 'Assign')}
              </Button>
            </View>
          </AppCard>
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
  loader: {
    marginVertical: 16,
  },
  card: {
    padding: 14,
    gap: 10,
  },
  helper: {
    opacity: 0.75,
    marginBottom: 4,
  },
  fieldLabel: {
    color: '#cbd5e1',
    fontSize: 13,
    marginBottom: 4,
  },
  input: {
    marginBottom: 4,
  },
  error: {
    color: '#fecaca',
    marginBottom: 8,
  },
  success: {
    color: '#bbf7d0',
    marginTop: 6,
  },
  link: {
    color: '#e2e8f0',
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
  memberRow: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.12)',
    paddingTop: 12,
    marginTop: 8,
    gap: 4,
  },
  memberName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  memberMeta: {
    color: '#cbd5e1',
    fontSize: 13,
  },
  memberActions: {
    gap: 6,
    marginTop: 8,
  },
  assignList: {
    marginTop: 6,
    gap: 4,
  },
  assignRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  assignText: {
    color: '#e2e8f0',
    flex: 1,
  },
  assignActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 10,
  },
});
