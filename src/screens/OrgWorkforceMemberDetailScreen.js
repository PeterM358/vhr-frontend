import React, { useCallback, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityIndicator, Button, Menu, Text } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';

import ScreenBackground from '../components/ScreenBackground';
import AppCard from '../components/ui/AppCard';
import OrgAppHeader from '../components/org/OrgAppHeader';
import { listOrgFleet } from '../api/fleet';
import {
  createVehicleAssignment,
  endVehicleAssignment,
  listOrgWorkforce,
  updateOrgWorkforceMember,
} from '../api/orgWorkforce';
import { resolveActiveOrganizationId } from '../utils/orgWorkspace';
import { navigateToOrgWorkforce } from '../navigation/webNavigation';
import { useTranslation } from '../i18n';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { COLORS } from '../constants/colors';
import { useScrollContentBottomPadding } from '../utils/mobileWebInsets';

// Phase B HR stubs only: role + vehicle assignment. No payroll, groups, or sick leave yet.

const ROLE_OPTIONS = [
  { value: 'transport', labelKey: 'org.workforce.roles.transport' },
  { value: 'admin', labelKey: 'org.workforce.roles.admin' },
  { value: 'viewer', labelKey: 'org.workforce.roles.viewer' },
  { value: 'warehouse', labelKey: 'org.workforce.roles.warehouse' },
  { value: 'accounting', labelKey: 'org.workforce.roles.accounting' },
];

export default function OrgWorkforceMemberDetailScreen({ navigation, route }) {
  const { t } = useTranslation();
  const routeOrgId = route?.params?.organizationId || route?.params?.orgId;
  const membershipId = route?.params?.membershipId;
  const scrollBottomPadding = useScrollContentBottomPadding(40);

  const [orgId, setOrgId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [canManage, setCanManage] = useState(false);
  const [member, setMember] = useState(null);
  const [fleet, setFleet] = useState([]);

  const [assignVehicleId, setAssignVehicleId] = useState(null);
  const [vehicleMenuOpen, setVehicleMenuOpen] = useState(false);
  const [assignBusy, setAssignBusy] = useState(false);
  const [showAssign, setShowAssign] = useState(false);

  const onBack = useCallback(() => {
    navigateToOrgWorkforce(navigation, { orgId: routeOrgId || orgId });
  }, [navigation, orgId, routeOrgId]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      const resolved = await resolveActiveOrganizationId(routeOrgId);
      setOrgId(resolved);
      if (!resolved || !membershipId) {
        setMember(null);
        setError(t('org.workforce.notFound', null, 'Member not found.'));
        return;
      }
      const [workforce, fleetData] = await Promise.all([
        listOrgWorkforce(token, resolved),
        listOrgFleet(token, resolved, {}).catch(() => ({ results: [] })),
      ]);
      setCanManage(Boolean(workforce?.can_manage || workforce?.can_assign_vehicles));
      const rows = Array.isArray(workforce?.results) ? workforce.results : [];
      const found = rows.find((row) => String(row.membership_id) === String(membershipId)) || null;
      setMember(found);
      setFleet(Array.isArray(fleetData?.results) ? fleetData.results : []);
      if (!found) {
        setError(t('org.workforce.notFound', null, 'Member not found.'));
      }
    } catch (e) {
      setError(e.message || t('org.workforce.loadError', null, 'Could not load workforce.'));
      setMember(null);
    } finally {
      setLoading(false);
    }
  }, [membershipId, routeOrgId, t]);

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

  const changeRole = async (role) => {
    if (!canManage || !orgId || !member || member.role === 'owner' || member.role === role) return;
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      await updateOrgWorkforceMember(token, orgId, member.membership_id, { role });
      await load();
    } catch (e) {
      Alert.alert(t('common.error'), e.message || t('org.workforce.roleError', null, 'Could not update role.'));
    }
  };

  const assignVehicle = async () => {
    if (!orgId || !member?.user_id || !assignVehicleId) return;
    setAssignBusy(true);
    setError('');
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      await createVehicleAssignment(token, orgId, {
        vehicle_id: Number(assignVehicleId),
        user_id: Number(member.user_id),
        role: 'driver',
      });
      setAssignVehicleId(null);
      setShowAssign(false);
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

  const assignments = Array.isArray(member?.vehicle_assignments) ? member.vehicle_assignments : [];
  const contact = [member?.email, member?.phone].filter(Boolean).join(' · ') || '—';

  return (
    <ScreenBackground safeArea={false}>
      <OrgAppHeader
        mode="nested"
        title={t('org.workforce.memberDetail', null, 'Team member')}
        onBack={onBack}
      />
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: scrollBottomPadding }]}
        keyboardShouldPersistTaps="handled"
      >
        {loading ? <ActivityIndicator color="#fff" style={styles.loader} /> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {member ? (
          <>
            <AppCard style={styles.card}>
              <Text style={styles.sectionTitle}>
                {t('org.workforce.personalSection', null, 'Personal')}
              </Text>
              <Text style={styles.label}>{t('org.workforce.displayName', null, 'Name')}</Text>
              <Text style={styles.value}>{member.display_name || '—'}</Text>
              <Text style={styles.label}>{t('org.workforce.contact', null, 'Contact')}</Text>
              <Text style={styles.value}>{contact}</Text>
              {member.email ? (
                <>
                  <Text style={styles.label}>{t('org.workforce.email', null, 'Email')}</Text>
                  <Text style={styles.value}>{member.email}</Text>
                </>
              ) : null}
              {member.phone ? (
                <>
                  <Text style={styles.label}>{t('org.workforce.phoneLabel', null, 'Phone')}</Text>
                  <Text style={styles.value}>{member.phone}</Text>
                </>
              ) : null}
            </AppCard>

            <AppCard style={styles.card}>
              <Text style={styles.sectionTitle}>
                {t('org.workforce.organizationSection', null, 'Organization')}
              </Text>
              <Text style={styles.label}>{t('org.workforce.roleLabel', null, 'Role')}</Text>
              <Text style={styles.value}>
                {roleLabel(member.role)}
                {member.manage_fleet
                  ? ` · ${t('org.workforce.manageFleet', null, 'Fleet manager')}`
                  : ''}
              </Text>

              {canManage && member.role !== 'owner' ? (
                <View style={styles.memberActions}>
                  <Text style={styles.label}>
                    {t('org.workforce.changeRole', null, 'Change role')}
                  </Text>
                  <View style={styles.roleChips}>
                    {ROLE_OPTIONS.map((opt) => (
                      <Button
                        key={opt.value}
                        compact
                        mode={member.role === opt.value ? 'contained' : 'outlined'}
                        onPress={() => changeRole(opt.value)}
                        labelStyle={member.role === opt.value ? undefined : styles.outlinedLabel}
                      >
                        {t(opt.labelKey, null, opt.value)}
                      </Button>
                    ))}
                  </View>
                </View>
              ) : null}
            </AppCard>

            <AppCard style={styles.card}>
              <Text style={styles.sectionTitle}>
                {t('org.workforce.assignedVehicles', null, 'Assigned vehicles')}
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
                        <Button compact onPress={() => endAssignment(row.id)} labelStyle={styles.outlinedLabel}>
                          {t('org.workforce.endAssignment', null, 'End')}
                        </Button>
                      ) : null}
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.helper}>
                  {t('org.workforce.noVehicles', null, 'No vehicle assigned')}
                </Text>
              )}

              {canManage && member.role !== 'owner' ? (
                <View style={styles.memberActions}>
                  {!showAssign ? (
                    <Button mode="contained-tonal" onPress={() => setShowAssign(true)}>
                      {t('org.workforce.assignVehicle', null, 'Assign vehicle')}
                    </Button>
                  ) : (
                    <>
                      <Text style={styles.label}>
                        {t('org.workforce.assignTitle', null, 'Assign vehicle')}
                      </Text>
                      <Menu
                        visible={vehicleMenuOpen}
                        onDismiss={() => setVehicleMenuOpen(false)}
                        anchor={
                          <Button
                            mode="outlined"
                            onPress={() => setVehicleMenuOpen(true)}
                            labelStyle={styles.outlinedLabel}
                          >
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
                        <Button mode="outlined" onPress={() => setShowAssign(false)} labelStyle={styles.outlinedLabel}>
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
                    </>
                  )}
                </View>
              ) : null}
            </AppCard>
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
  loader: {
    marginVertical: 16,
  },
  card: {
    padding: 14,
    gap: 6,
  },
  sectionTitle: {
    color: COLORS.TEXT_DARK,
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 6,
  },
  label: {
    color: COLORS.TEXT_MUTED,
    fontSize: 13,
    marginTop: 6,
    fontWeight: '600',
  },
  value: {
    color: COLORS.TEXT_DARK,
    fontSize: 16,
    fontWeight: '600',
  },
  helper: {
    color: COLORS.TEXT_MUTED,
    marginTop: 4,
  },
  error: {
    color: '#fecaca',
    marginBottom: 8,
  },
  memberActions: {
    gap: 8,
    marginTop: 10,
  },
  roleChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  outlinedLabel: {
    color: COLORS.TEXT_DARK,
  },
  assignList: {
    marginTop: 6,
    gap: 6,
  },
  assignRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  assignText: {
    color: COLORS.TEXT_DARK,
    flex: 1,
    fontSize: 15,
  },
  assignActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 10,
  },
});
