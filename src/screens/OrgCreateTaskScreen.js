import React, { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityIndicator, Button, Text, TextInput } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';

import ScreenBackground from '../components/ScreenBackground';
import AppCard from '../components/ui/AppCard';
import OrgAppHeader from '../components/org/OrgAppHeader';
import { createWorkOrder, listActivityDefinitions } from '../api/orgOperations';
import { listOrgFleet } from '../api/fleet';
import { listOrgWorkforce } from '../api/orgWorkforce';
import {
  readOrganizationMemberships,
  resolveActiveOrganizationId,
} from '../utils/orgWorkspace';
import { navigateToOrgHome, navigateToOrgTasks } from '../navigation/webNavigation';
import { useTranslation } from '../i18n';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { COLORS } from '../constants/colors';
import { useScrollContentBottomPadding } from '../utils/mobileWebInsets';

const MAX_PEOPLE = 10;

function localTodayIso() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function memberLabel(member) {
  return member?.display_name || member?.email || member?.phone || `#${member?.user_id}`;
}

function vehicleLabel(vehicle) {
  return vehicle?.license_plate || vehicle?.fleet_id || vehicle?.display_name || `#${vehicle?.id}`;
}

export default function OrgCreateTaskScreen({ navigation, route }) {
  const { t } = useTranslation();
  const routeOrgId = route?.params?.organizationId || route?.params?.orgId;
  const scrollBottomPadding = useScrollContentBottomPadding(40);

  const [orgId, setOrgId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [activities, setActivities] = useState([]);
  const [members, setMembers] = useState([]);
  const [vehicles, setVehicles] = useState([]);

  const [title, setTitle] = useState('');
  const [instructions, setInstructions] = useState('');
  const [scheduledDate, setScheduledDate] = useState(localTodayIso());
  const [plannedStart, setPlannedStart] = useState('');
  const [plannedEnd, setPlannedEnd] = useState('');
  const [plannedHours, setPlannedHours] = useState('');
  const [photoNote, setPhotoNote] = useState('');
  const [vehicleId, setVehicleId] = useState(null);
  const [overallAssignees, setOverallAssignees] = useState([]);
  const [selectedOps, setSelectedOps] = useState([]); // [{ activityId, notes, assigneeIds }]
  const [formMessage, setFormMessage] = useState('');

  const onBack = useCallback(() => {
    navigateToOrgTasks(navigation, { orgId: routeOrgId || orgId });
  }, [navigation, orgId, routeOrgId]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      const resolved = await resolveActiveOrganizationId(routeOrgId);
      setOrgId(resolved);
      if (!resolved) {
        setError(t('org.tasks.loadError', null, 'Could not load task form.'));
        return;
      }
      const [opsData, workforce, fleet] = await Promise.all([
        listActivityDefinitions(token, resolved, { active: 1 }),
        listOrgWorkforce(token, resolved),
        listOrgFleet(token, resolved, {}).catch(() => ({ results: [] })),
      ]);
      setActivities((opsData?.results || []).filter((row) => row.is_active !== false));
      setMembers(Array.isArray(workforce?.results) ? workforce.results : []);
      const fleetRows = Array.isArray(fleet?.results) ? fleet.results : Array.isArray(fleet) ? fleet : [];
      setVehicles(fleetRows);
    } catch (e) {
      setError(e.message || t('org.tasks.loadError', null, 'Could not load task form.'));
    } finally {
      setLoading(false);
    }
  }, [routeOrgId, t]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const toggleOverallAssignee = (userId) => {
    setOverallAssignees((prev) => {
      if (prev.includes(userId)) return prev.filter((id) => id !== userId);
      if (prev.length >= MAX_PEOPLE) return prev;
      return [...prev, userId];
    });
  };

  const toggleOperation = (activityId) => {
    setSelectedOps((prev) => {
      const exists = prev.find((row) => row.activityId === activityId);
      if (exists) return prev.filter((row) => row.activityId !== activityId);
      return [...prev, { activityId, notes: '', assigneeIds: [] }];
    });
  };

  const updateOpNotes = (activityId, notes) => {
    setSelectedOps((prev) =>
      prev.map((row) => (row.activityId === activityId ? { ...row, notes } : row)),
    );
  };

  const toggleOpAssignee = (activityId, userId) => {
    setSelectedOps((prev) =>
      prev.map((row) => {
        if (row.activityId !== activityId) return row;
        const has = row.assigneeIds.includes(userId);
        let next = has
          ? row.assigneeIds.filter((id) => id !== userId)
          : [...row.assigneeIds, userId];
        if (next.length > MAX_PEOPLE) next = next.slice(0, MAX_PEOPLE);
        return { ...row, assigneeIds: next };
      }),
    );
  };

  const selectedActivityIds = useMemo(
    () => new Set(selectedOps.map((row) => row.activityId)),
    [selectedOps],
  );

  const save = async () => {
    if (!orgId) return;
    const trimmed = title.trim();
    if (!trimmed) {
      setFormMessage(t('org.tasks.titleRequired', null, 'Title is required.'));
      return;
    }
    if (selectedOps.length === 0) {
      setFormMessage(t('org.tasks.operationsRequired', null, 'Pick at least one operation.'));
      return;
    }
    setBusy(true);
    setFormMessage('');
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      const payload = {
        title: trimmed,
        instructions: instructions.trim(),
        scheduled_date: scheduledDate.trim() || null,
        planned_start: plannedStart.trim() || null,
        planned_end: plannedEnd.trim() || null,
        planned_hours: plannedHours.trim() || null,
        photo_refs: photoNote.trim() ? [photoNote.trim()] : [],
        vehicle_id: vehicleId || null,
        assignee_user_ids: overallAssignees,
        operations: selectedOps.map((row, idx) => ({
          activity_definition_id: row.activityId,
          sort_order: idx,
          notes: row.notes.trim(),
          assignee_user_ids: row.assigneeIds,
        })),
      };
      await createWorkOrder(token, orgId, payload);
      Alert.alert(
        t('org.tasks.createdTitle', null, 'Task created'),
        t('org.tasks.createdBody', null, 'The multi-operation task was saved.'),
        [{ text: t('common.ok', null, 'OK'), onPress: onBack }],
      );
    } catch (e) {
      setFormMessage(e.message || t('org.tasks.saveError', null, 'Could not create task.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScreenBackground safeArea={false}>
      <OrgAppHeader
        mode="detail"
        title={t('org.tasks.createTitle', null, 'Create task')}
        onBack={onBack}
      />
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: scrollBottomPadding }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.lead}>
          {t(
            'org.tasks.createLead',
            null,
            'Combine several operations into one task and assign people overall or per operation.',
          )}
        </Text>

        {loading ? (
          <ActivityIndicator color="#fff" style={styles.loader} />
        ) : error ? (
          <AppCard style={styles.card}>
            <Text style={styles.error}>{error}</Text>
            <Button mode="contained" onPress={load}>
              {t('common.retry', null, 'Retry')}
            </Button>
          </AppCard>
        ) : (
          <>
            <AppCard style={styles.card}>
              <Text style={styles.sectionTitle}>
                {t('org.tasks.detailsTitle', null, 'Task details')}
              </Text>
              <TextInput
                label={t('org.tasks.title', null, 'Title')}
                value={title}
                onChangeText={setTitle}
                mode="outlined"
                style={styles.input}
                textColor={COLORS.TEXT_DARK}
              />
              <TextInput
                label={t('org.tasks.instructions', null, 'Instructions')}
                value={instructions}
                onChangeText={setInstructions}
                mode="outlined"
                multiline
                style={styles.input}
                textColor={COLORS.TEXT_DARK}
              />
              <TextInput
                label={t('org.tasks.scheduledDate', null, 'Date (YYYY-MM-DD)')}
                value={scheduledDate}
                onChangeText={setScheduledDate}
                mode="outlined"
                autoCapitalize="none"
                style={styles.input}
                textColor={COLORS.TEXT_DARK}
              />
              <TextInput
                label={t('org.tasks.plannedStart', null, 'Start time (HH:MM)')}
                value={plannedStart}
                onChangeText={setPlannedStart}
                mode="outlined"
                autoCapitalize="none"
                placeholder="08:00"
                style={styles.input}
                textColor={COLORS.TEXT_DARK}
              />
              <TextInput
                label={t('org.tasks.plannedEnd', null, 'End time (HH:MM, optional)')}
                value={plannedEnd}
                onChangeText={setPlannedEnd}
                mode="outlined"
                autoCapitalize="none"
                style={styles.input}
                textColor={COLORS.TEXT_DARK}
              />
              <TextInput
                label={t('org.tasks.plannedHours', null, 'Preset hours (optional)')}
                value={plannedHours}
                onChangeText={setPlannedHours}
                mode="outlined"
                keyboardType="decimal-pad"
                style={styles.input}
                textColor={COLORS.TEXT_DARK}
              />
              <TextInput
                label={t('org.tasks.photosStub', null, 'Photo note / link (optional)')}
                value={photoNote}
                onChangeText={setPhotoNote}
                mode="outlined"
                style={styles.input}
                textColor={COLORS.TEXT_DARK}
              />
              <Text style={styles.fieldLabel}>{t('org.tasks.vehicle', null, 'Vehicle (optional)')}</Text>
              <View style={styles.chipWrap}>
                <Pressable
                  onPress={() => setVehicleId(null)}
                  style={[styles.chip, vehicleId == null && styles.chipActive]}
                >
                  <Text style={[styles.chipText, vehicleId == null && styles.chipTextActive]}>
                    {t('org.tasks.noVehicle', null, 'None')}
                  </Text>
                </Pressable>
                {vehicles.map((vehicle) => {
                  const active = vehicleId === vehicle.id;
                  return (
                    <Pressable
                      key={vehicle.id}
                      onPress={() => setVehicleId(vehicle.id)}
                      style={[styles.chip, active && styles.chipActive]}
                    >
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>
                        {vehicleLabel(vehicle)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </AppCard>

            <AppCard style={styles.card}>
              <Text style={styles.sectionTitle}>
                {t('org.tasks.overallPeople', null, 'People on this task')}
              </Text>
              <Text style={styles.helper}>
                {t(
                  'org.tasks.overallPeopleHelper',
                  { max: MAX_PEOPLE },
                  `Select up to ${MAX_PEOPLE} people for the whole task.`,
                )}
              </Text>
              <View style={styles.chipWrap}>
                {members.map((member) => {
                  const uid = member.user_id;
                  const active = overallAssignees.includes(uid);
                  return (
                    <Pressable
                      key={member.id || uid}
                      onPress={() => toggleOverallAssignee(uid)}
                      style={[styles.chip, active && styles.chipActive]}
                    >
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>
                        {memberLabel(member)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </AppCard>

            <AppCard style={styles.card}>
              <Text style={styles.sectionTitle}>
                {t('org.tasks.operationsTitle', null, 'Operations in this task')}
              </Text>
              <Text style={styles.helper}>
                {t(
                  'org.tasks.operationsHelper',
                  null,
                  'Pick one or more company operations. Optionally assign people to each step.',
                )}
              </Text>
              {activities.length === 0 ? (
                <Text style={styles.empty}>
                  {t(
                    'org.tasks.noOperations',
                    null,
                    'No active operations yet. Create them under Operations first.',
                  )}
                </Text>
              ) : (
                activities.map((activity) => {
                  const selected = selectedActivityIds.has(activity.id);
                  const line = selectedOps.find((row) => row.activityId === activity.id);
                  return (
                    <View key={activity.id} style={styles.opBlock}>
                      <Pressable
                        onPress={() => toggleOperation(activity.id)}
                        style={[styles.opToggle, selected && styles.opToggleActive]}
                      >
                        <Text style={styles.opToggleText}>
                          {selected ? '✓ ' : ''}
                          {activity.name}
                        </Text>
                      </Pressable>
                      {selected && line ? (
                        <View style={styles.opDetails}>
                          <TextInput
                            label={t('org.tasks.operationNotes', null, 'Notes for this step')}
                            value={line.notes}
                            onChangeText={(value) => updateOpNotes(activity.id, value)}
                            mode="outlined"
                            style={styles.input}
                            textColor={COLORS.TEXT_DARK}
                          />
                          <Text style={styles.fieldLabel}>
                            {t('org.tasks.operationPeople', null, 'People for this step')}
                          </Text>
                          <View style={styles.chipWrap}>
                            {members.map((member) => {
                              const uid = member.user_id;
                              const active = line.assigneeIds.includes(uid);
                              return (
                                <Pressable
                                  key={`${activity.id}-${uid}`}
                                  onPress={() => toggleOpAssignee(activity.id, uid)}
                                  style={[styles.chip, active && styles.chipActive]}
                                >
                                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                                    {memberLabel(member)}
                                  </Text>
                                </Pressable>
                              );
                            })}
                          </View>
                        </View>
                      ) : null}
                    </View>
                  );
                })
              )}
            </AppCard>

            {formMessage ? (
              <AppCard style={styles.card}>
                <Text style={styles.formMessage}>{formMessage}</Text>
              </AppCard>
            ) : null}

            <Button mode="contained" loading={busy} disabled={busy} onPress={save} style={styles.saveBtn}>
              {t('org.tasks.save', null, 'Create task')}
            </Button>
          </>
        )}
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: 14,
    paddingTop: 12,
  },
  lead: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 14,
  },
  loader: {
    marginVertical: 24,
  },
  card: {
    padding: 14,
    marginBottom: 12,
  },
  sectionTitle: {
    color: COLORS.TEXT_DARK,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  helper: {
    color: COLORS.TEXT_MUTED,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 10,
  },
  empty: {
    color: COLORS.TEXT_MUTED,
    fontSize: 14,
  },
  error: {
    color: '#b91c1c',
    marginBottom: 10,
  },
  formMessage: {
    color: '#b91c1c',
  },
  input: {
    marginBottom: 10,
    backgroundColor: '#fff',
  },
  fieldLabel: {
    color: COLORS.TEXT_MUTED,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  chip: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: '#eef2f7',
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.12)',
  },
  chipActive: {
    backgroundColor: COLORS.PRIMARY_SOFT,
    borderColor: COLORS.PRIMARY,
  },
  chipText: {
    color: COLORS.TEXT_DARK,
    fontSize: 12,
    fontWeight: '600',
  },
  chipTextActive: {
    color: COLORS.TEXT_DARK,
  },
  opBlock: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(15,23,42,0.12)',
    paddingTop: 10,
    marginBottom: 8,
  },
  opToggle: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#eef2f7',
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.12)',
  },
  opToggleActive: {
    backgroundColor: COLORS.PRIMARY_SOFT,
    borderColor: COLORS.PRIMARY,
  },
  opToggleText: {
    color: COLORS.TEXT_DARK,
    fontSize: 14,
    fontWeight: '700',
  },
  opDetails: {
    marginTop: 10,
  },
  saveBtn: {
    marginBottom: 24,
  },
});
