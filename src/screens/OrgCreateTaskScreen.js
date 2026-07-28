import React, { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityIndicator, Button, Text, TextInput } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';

import ScreenBackground from '../components/ScreenBackground';
import AppCard from '../components/ui/AppCard';
import OrgAppHeader from '../components/org/OrgAppHeader';
import {
  createWorkOrder,
  listActivityDefinitions,
  listProjects,
} from '../api/orgOperations';
import { listOrgFleet } from '../api/fleet';
import { listOrgWorkforce } from '../api/orgWorkforce';
import { resolveActiveOrganizationId } from '../utils/orgWorkspace';
import { navigateToOrgTasks } from '../navigation/webNavigation';
import { mapFleetReadiness } from '../utils/fleetReadinessStatus';
import { useTranslation } from '../i18n';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { COLORS } from '../constants/colors';
import { useScrollContentBottomPadding } from '../utils/mobileWebInsets';

const MAX_PEOPLE = 10;
const MAX_SEARCH_RESULTS = 18;
const MAX_VEHICLES = 20;
const MACHINE_TYPE_CODES = new Set(['construction', 'agricultural', 'other']);
const TIME_OPTIONS = [
  '06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00',
  '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00',
];

const ON_CARD = '#0F172A';
const ON_CARD_MUTED = '#475569';

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

function vehicleTypeCode(vehicle) {
  return (
    vehicle?.vehicle_type_code ||
    vehicle?.vehicle_type?.code ||
    vehicle?.type_code ||
    ''
  );
}

function vehicleReadinessStatus(vehicle) {
  return mapFleetReadiness(vehicle?.readiness || vehicle?.fleet_readiness).status;
}

function filterByQuery(items, query, getLabel) {
  const q = String(query || '').trim().toLowerCase();
  const filtered = !q
    ? items
    : items.filter((item) => getLabel(item).toLowerCase().includes(q));
  return filtered.slice(0, MAX_SEARCH_RESULTS);
}

function detectTaskFlavor(activities) {
  const kinds = new Set((activities || []).map((a) => a.activity_kind).filter(Boolean));
  const transport = kinds.has('transport');
  const construction = kinds.has('construction') || kinds.has('road_marking');
  if (transport && !construction) return 'transport';
  if (construction && !transport) return 'construction';
  return 'generic';
}

export default function OrgCreateTaskScreen({ navigation, route }) {
  const { t } = useTranslation();
  const routeOrgId = route?.params?.organizationId || route?.params?.orgId;
  const scrollBottomPadding = useScrollContentBottomPadding(40);

  const [orgId, setOrgId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(0);
  const [formMessage, setFormMessage] = useState('');

  const [activities, setActivities] = useState([]);
  const [members, setMembers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [projects, setProjects] = useState([]);

  const [projectId, setProjectId] = useState(null);
  const [title, setTitle] = useState('');
  const [instructions, setInstructions] = useState('');
  const [scheduledDate, setScheduledDate] = useState(localTodayIso());
  const [scheduledEndDate, setScheduledEndDate] = useState('');
  const [plannedStart, setPlannedStart] = useState('08:00');
  const [plannedEnd, setPlannedEnd] = useState('');
  const [vehicleIds, setVehicleIds] = useState([]);
  const [vehicleQuery, setVehicleQuery] = useState('');
  const [vehicleReadinessFilter, setVehicleReadinessFilter] = useState('ready');
  const [vehicleTypeFilter, setVehicleTypeFilter] = useState('all');
  const [overallAssignees, setOverallAssignees] = useState([]);
  const [peopleQuery, setPeopleQuery] = useState('');
  const [projectQuery, setProjectQuery] = useState('');
  const [selectedOps, setSelectedOps] = useState([]);
  const [photoRef, setPhotoRef] = useState('');
  const [documentRef, setDocumentRef] = useState('');

  const flavor = useMemo(() => detectTaskFlavor(activities), [activities]);

  const stepDefs = useMemo(() => {
    const taskNoun =
      flavor === 'transport'
        ? t('org.tasks.wizard.nounTransport', null, 'waybill / work card')
        : flavor === 'construction'
          ? t('org.tasks.wizard.nounConstruction', null, 'site / work card')
          : t('org.tasks.wizard.nounGeneric', null, 'work card');
    return [
      {
        id: 'project',
        title: t('org.tasks.wizard.stepProject', null, 'Project'),
        hint: t(
          'org.tasks.wizard.stepProjectHint',
          { noun: taskNoun },
          `Link a project or create this ${taskNoun} without one.`,
        ),
      },
      {
        id: 'when',
        title: t('org.tasks.wizard.stepWhen', null, 'When'),
        hint: t(
          'org.tasks.wizard.stepWhenHint',
          null,
          'Schedule date and planned start for reminders. Workers tap Start/End themselves.',
        ),
      },
      {
        id: 'vehicle',
        title: t('org.tasks.wizard.stepVehicle', null, 'Vehicles'),
        hint: t(
          'org.tasks.wizard.stepVehicleHint',
          null,
          'Select one or more fleet vehicles. Filter by readiness and type. Warnings show when not ready.',
        ),
      },
      {
        id: 'people',
        title: t('org.tasks.wizard.stepPeople', null, 'People'),
        hint: t(
          'org.tasks.wizard.stepPeopleHint',
          null,
          'Search and assign people for the whole task.',
        ),
      },
      {
        id: 'operations',
        title: t('org.tasks.wizard.stepOperations', null, 'Operations'),
        hint: t(
          'org.tasks.wizard.stepOperationsHint',
          null,
          'Pick distinct operations. Add people and notes per step.',
        ),
      },
      {
        id: 'review',
        title: t('org.tasks.wizard.stepReview', null, 'Review'),
        hint: t(
          'org.tasks.wizard.stepReviewHint',
          null,
          'Confirm and create. You will go to the tasks list.',
        ),
      },
    ];
  }, [flavor, t]);

  const onBack = useCallback(() => {
    if (step > 0) {
      setStep((s) => s - 1);
      setFormMessage('');
      return;
    }
    navigateToOrgTasks(navigation, { orgId: routeOrgId || orgId });
  }, [navigation, orgId, routeOrgId, step]);

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
      const [opsData, workforce, fleet, projectData] = await Promise.all([
        listActivityDefinitions(token, resolved, { active: 1 }),
        listOrgWorkforce(token, resolved),
        listOrgFleet(token, resolved, {}).catch(() => ({ results: [] })),
        listProjects(token, resolved, { active: 1 }).catch(() => ({ results: [] })),
      ]);
      setActivities((opsData?.results || []).filter((row) => row.is_active !== false));
      setMembers(Array.isArray(workforce?.results) ? workforce.results : []);
      const fleetRows = Array.isArray(fleet?.results)
        ? fleet.results
        : Array.isArray(fleet)
          ? fleet
          : [];
      setVehicles(fleetRows);
      setProjects((projectData?.results || []).filter((row) => row.is_active !== false));
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

  const filteredProjects = useMemo(
    () => filterByQuery(projects, projectQuery, (p) => p.name || ''),
    [projects, projectQuery],
  );

  const filteredVehicles = useMemo(() => {
    let rows = vehicles;
    if (vehicleReadinessFilter === 'ready') {
      rows = rows.filter((v) => vehicleReadinessStatus(v) === 'ready');
    } else if (vehicleReadinessFilter === 'not_ready') {
      rows = rows.filter((v) => {
        const status = vehicleReadinessStatus(v);
        return status === 'not_ready' || status === 'expiring_soon';
      });
    }
    if (vehicleTypeFilter === 'truck') {
      rows = rows.filter((v) => vehicleTypeCode(v) === 'truck');
    } else if (vehicleTypeFilter === 'van') {
      rows = rows.filter((v) => vehicleTypeCode(v) === 'van');
    } else if (vehicleTypeFilter === 'machine') {
      rows = rows.filter((v) => MACHINE_TYPE_CODES.has(vehicleTypeCode(v)));
    }
    return filterByQuery(rows, vehicleQuery, vehicleLabel);
  }, [vehicles, vehicleQuery, vehicleReadinessFilter, vehicleTypeFilter]);

  const filteredMembers = useMemo(
    () => filterByQuery(members, peopleQuery, memberLabel),
    [members, peopleQuery],
  );

  const selectedProject = useMemo(
    () => projects.find((p) => p.id === projectId) || null,
    [projects, projectId],
  );

  const selectProject = (id) => {
    setProjectId(id);
    if (id == null) return;
    const project = projects.find((p) => p.id === id);
    if (project?.name && !title.trim()) {
      setTitle(project.name);
    }
  };

  const toggleVehicle = (id) => {
    setVehicleIds((prev) => {
      if (prev.includes(id)) return prev.filter((vid) => vid !== id);
      if (prev.length >= MAX_VEHICLES) return prev;
      return [...prev, id];
    });
  };

  const requestToggleVehicle = (vehicle) => {
    const id = vehicle?.id;
    if (id == null) return;
    if (vehicleIds.includes(id)) {
      toggleVehicle(id);
      return;
    }
    if (vehicleIds.length >= MAX_VEHICLES) return;
    const status = vehicleReadinessStatus(vehicle);
    const notReady = status === 'not_ready' || status === 'expiring_soon';
    if (!notReady) {
      toggleVehicle(id);
      return;
    }
    Alert.alert(
      t('org.tasks.vehicleNotReadyTitle', null, 'Vehicle not ready'),
      t(
        'org.tasks.vehicleNotReadyConfirm',
        { vehicle: vehicleLabel(vehicle) },
        'Vehicle not ready — assign anyway?',
      ),
      [
        { text: t('common.cancel', null, 'Cancel'), style: 'cancel' },
        {
          text: t('org.tasks.vehicleNotReadyAssign', null, 'Assign anyway'),
          onPress: () => toggleVehicle(id),
        },
      ],
    );
  };

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

  const validateStep = () => {
    if (step === 0) {
      if (!title.trim()) {
        setFormMessage(t('org.tasks.titleRequired', null, 'Title is required.'));
        return false;
      }
    }
    if (step === 1) {
      if (scheduledDate.trim() && scheduledEndDate.trim() && scheduledEndDate.trim() < scheduledDate.trim()) {
        setFormMessage(
          t(
            'org.tasks.endDateBeforeStart',
            null,
            'End date must be on or after the start date.',
          ),
        );
        return false;
      }
    }
    if (step === 4 && selectedOps.length === 0) {
      setFormMessage(t('org.tasks.operationsRequired', null, 'Pick at least one operation.'));
      return false;
    }
    setFormMessage('');
    return true;
  };

  const goNext = () => {
    if (!validateStep()) return;
    if (step < stepDefs.length - 1) setStep((s) => s + 1);
  };

  const save = async () => {
    if (!orgId) return;
    if (!validateStep()) return;
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
        project_id: projectId,
        scheduled_date: scheduledDate.trim() || null,
        scheduled_end_date: scheduledEndDate.trim() || null,
        planned_start: plannedStart.trim() || null,
        planned_end: plannedEnd.trim() || null,
        photo_refs: photoRef.trim() ? [photoRef.trim()] : [],
        document_refs: documentRef.trim() ? [documentRef.trim()] : [],
        vehicle_ids: vehicleIds,
        vehicle_id: vehicleIds[0] || null,
        assignee_user_ids: overallAssignees,
        operations: selectedOps.map((row, idx) => ({
          activity_definition_id: row.activityId,
          sort_order: idx,
          notes: row.notes.trim(),
          assignee_user_ids: row.assigneeIds,
        })),
      };
      await createWorkOrder(token, orgId, payload);
      navigateToOrgTasks(navigation, { orgId });
    } catch (e) {
      setFormMessage(e.message || t('org.tasks.saveError', null, 'Could not create task.'));
    } finally {
      setBusy(false);
    }
  };

  const renderTimeChips = (value, onSelect, includeNone = false) => (
    <View style={styles.chipWrap}>
      {includeNone ? (
        <Pressable
          onPress={() => onSelect('')}
          style={[styles.chip, !value && styles.chipActive]}
        >
          <Text style={[styles.chipText, !value && styles.chipTextActive]}>
            {t('org.tasks.noEndTime', null, 'None')}
          </Text>
        </Pressable>
      ) : null}
      {TIME_OPTIONS.map((opt) => {
        const active = value === opt;
        return (
          <Pressable
            key={opt}
            onPress={() => onSelect(opt)}
            style={[styles.chip, active && styles.chipActive]}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>{opt}</Text>
          </Pressable>
        );
      })}
    </View>
  );

  const renderStepBody = () => {
    if (step === 0) {
      return (
        <>
          <Text style={styles.fieldLabel}>
            {t('org.tasks.project', null, 'Project')}
          </Text>
          <TextInput
            label={t('org.tasks.searchProjects', null, 'Search projects')}
            value={projectQuery}
            onChangeText={setProjectQuery}
            mode="outlined"
            style={styles.input}
            textColor={ON_CARD}
          />
          <View style={styles.chipWrap}>
            <Pressable
              onPress={() => selectProject(null)}
              style={[styles.chip, projectId == null && styles.chipActive]}
            >
              <Text style={[styles.chipText, projectId == null && styles.chipTextActive]}>
                {t('org.tasks.noProject', null, 'No project')}
              </Text>
            </Pressable>
            {filteredProjects.map((project) => {
              const active = projectId === project.id;
              return (
                <Pressable
                  key={project.id}
                  onPress={() => selectProject(project.id)}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {project.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <TextInput
            label={t('org.tasks.title', null, 'Title')}
            value={title}
            onChangeText={setTitle}
            mode="outlined"
            style={styles.input}
            textColor={ON_CARD}
          />
          <TextInput
            label={t('org.tasks.instructions', null, 'Instructions')}
            value={instructions}
            onChangeText={setInstructions}
            mode="outlined"
            multiline
            style={styles.input}
            textColor={ON_CARD}
          />
        </>
      );
    }

    if (step === 1) {
      return (
        <>
          <TextInput
            label={t('org.tasks.scheduledDate', null, 'Start date (YYYY-MM-DD)')}
            value={scheduledDate}
            onChangeText={setScheduledDate}
            mode="outlined"
            autoCapitalize="none"
            style={styles.input}
            textColor={ON_CARD}
          />
          <TextInput
            label={t('org.tasks.scheduledEndDate', null, 'End date (optional)')}
            value={scheduledEndDate}
            onChangeText={setScheduledEndDate}
            mode="outlined"
            autoCapitalize="none"
            style={styles.input}
            textColor={ON_CARD}
            placeholder={t('org.tasks.scheduledEndDateHint', null, 'Leave blank for a single day')}
          />
          <Text style={styles.helper}>
            {t(
              'org.tasks.scheduledEndDateHelper',
              null,
              'Optional. Use when one work card spans multiple days (e.g. 1–20 Aug) instead of creating many tasks.',
            )}
          </Text>
          <Text style={styles.fieldLabel}>
            {t('org.tasks.plannedStart', null, 'Start time')}
          </Text>
          {renderTimeChips(plannedStart, setPlannedStart)}
          <Text style={styles.fieldLabel}>
            {t('org.tasks.plannedEnd', null, 'End time (optional)')}
          </Text>
          {renderTimeChips(plannedEnd, setPlannedEnd, true)}
        </>
      );
    }

    if (step === 2) {
      const readinessOptions = [
        { value: 'all', label: t('org.tasks.vehicleFilterReadinessAll', null, 'All') },
        { value: 'ready', label: t('org.tasks.vehicleFilterReady', null, 'Ready') },
        {
          value: 'not_ready',
          label: t('org.tasks.vehicleFilterNotReady', null, 'Not ready'),
        },
      ];
      const typeOptions = [
        { value: 'all', label: t('org.tasks.vehicleFilterTypeAll', null, 'All types') },
        { value: 'truck', label: t('org.tasks.vehicleFilterTruck', null, 'Truck') },
        { value: 'van', label: t('org.tasks.vehicleFilterVan', null, 'Van') },
        { value: 'machine', label: t('org.tasks.vehicleFilterMachine', null, 'Machine') },
      ];
      return (
        <>
          <Text style={styles.helper}>
            {t(
              'org.tasks.vehiclesHelper',
              { max: MAX_VEHICLES },
              `Select up to ${MAX_VEHICLES} vehicles (e.g. trucks + machines).`,
            )}
          </Text>
          <Text style={styles.fieldLabel}>
            {t('org.tasks.vehicleFilterReadiness', null, 'Readiness')}
          </Text>
          <View style={styles.chipWrap}>
            {readinessOptions.map((opt) => {
              const active = vehicleReadinessFilter === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => setVehicleReadinessFilter(opt.value)}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.fieldLabel}>
            {t('org.tasks.vehicleFilterType', null, 'Vehicle type')}
          </Text>
          <View style={styles.chipWrap}>
            {typeOptions.map((opt) => {
              const active = vehicleTypeFilter === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => setVehicleTypeFilter(opt.value)}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <TextInput
            label={t('org.tasks.searchVehicles', null, 'Search vehicles')}
            value={vehicleQuery}
            onChangeText={setVehicleQuery}
            mode="outlined"
            style={styles.input}
            textColor={ON_CARD}
          />
          {vehicleIds.length > 0 ? (
            <Text style={styles.helper}>
              {t(
                'org.tasks.vehiclesSelected',
                { count: vehicleIds.length },
                `${vehicleIds.length} selected`,
              )}
            </Text>
          ) : null}
          <View style={styles.chipWrap}>
            <Pressable
              onPress={() => setVehicleIds([])}
              style={[styles.chip, vehicleIds.length === 0 && styles.chipActive]}
            >
              <Text
                style={[
                  styles.chipText,
                  vehicleIds.length === 0 && styles.chipTextActive,
                ]}
              >
                {t('org.tasks.noVehicle', null, 'None')}
              </Text>
            </Pressable>
            {filteredVehicles.map((vehicle) => {
              const active = vehicleIds.includes(vehicle.id);
              const readiness = mapFleetReadiness(vehicle.readiness || vehicle.fleet_readiness);
              const warn = readiness.status === 'not_ready' || readiness.status === 'expiring_soon';
              return (
                <Pressable
                  key={vehicle.id}
                  onPress={() => requestToggleVehicle(vehicle)}
                  style={[
                    styles.chip,
                    active && styles.chipActive,
                    warn && styles.chipWarn,
                    warn && active && styles.chipWarnActive,
                  ]}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {active ? '✓ ' : ''}
                    {vehicleLabel(vehicle)}
                    {warn ? ` · ${readiness.label}` : ''}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {vehicles.length > MAX_SEARCH_RESULTS && !vehicleQuery.trim() ? (
            <Text style={styles.helper}>
              {t(
                'org.tasks.searchToNarrow',
                { max: MAX_SEARCH_RESULTS },
                `Showing ${MAX_SEARCH_RESULTS}. Type to narrow the list.`,
              )}
            </Text>
          ) : null}
        </>
      );
    }

    if (step === 3) {
      return (
        <>
          <Text style={styles.helper}>
            {t(
              'org.tasks.overallPeopleHelper',
              { max: MAX_PEOPLE },
              `Select up to ${MAX_PEOPLE} people for the whole task.`,
            )}
          </Text>
          <TextInput
            label={t('org.tasks.searchPeople', null, 'Search people')}
            value={peopleQuery}
            onChangeText={setPeopleQuery}
            mode="outlined"
            style={styles.input}
            textColor={ON_CARD}
          />
          <View style={styles.chipWrap}>
            {filteredMembers.map((member) => {
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
        </>
      );
    }

    if (step === 4) {
      if (activities.length === 0) {
        return (
          <Text style={styles.empty}>
            {t(
              'org.tasks.noOperations',
              null,
              'No active operations yet. Create them under Operations first.',
            )}
          </Text>
        );
      }
      return activities.map((activity) => {
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
              {activity.activity_kind ? (
                <Text style={styles.opKind}>{activity.activity_kind}</Text>
              ) : null}
            </Pressable>
            {selected && line ? (
              <View style={styles.opDetails}>
                <TextInput
                  label={t('org.tasks.operationNotes', null, 'Notes for this step')}
                  value={line.notes}
                  onChangeText={(value) => updateOpNotes(activity.id, value)}
                  mode="outlined"
                  style={styles.input}
                  textColor={ON_CARD}
                />
                <Text style={styles.fieldLabel}>
                  {t('org.tasks.operationPeople', null, 'People for this step')}
                </Text>
                <View style={styles.chipWrap}>
                  {members.slice(0, MAX_SEARCH_RESULTS).map((member) => {
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
      });
    }

    // Review
    const selectedVehicles = vehicleIds
      .map((id) => vehicles.find((v) => v.id === id))
      .filter(Boolean);
    return (
      <>
        <Text style={styles.reviewLine}>
          <Text style={styles.reviewKey}>{t('org.tasks.project', null, 'Project')}: </Text>
          {selectedProject?.name || t('org.tasks.noProject', null, 'No project')}
        </Text>
        <Text style={styles.reviewLine}>
          <Text style={styles.reviewKey}>{t('org.tasks.title', null, 'Title')}: </Text>
          {title || '—'}
        </Text>
        <Text style={styles.reviewLine}>
          <Text style={styles.reviewKey}>{t('org.tasks.wizard.whenLabel', null, 'When')}: </Text>
          {[
            scheduledDate,
            scheduledEndDate && scheduledEndDate !== scheduledDate ? `→ ${scheduledEndDate}` : null,
            plannedStart,
            plannedEnd && `→ ${plannedEnd}`,
          ]
            .filter(Boolean)
            .join(' ')}
        </Text>
        <Text style={styles.reviewLine}>
          <Text style={styles.reviewKey}>{t('org.tasks.vehicles', null, 'Vehicles')}: </Text>
          {selectedVehicles.length
            ? selectedVehicles.map(vehicleLabel).join(', ')
            : t('org.tasks.noVehicle', null, 'None')}
        </Text>
        <Text style={styles.reviewLine}>
          <Text style={styles.reviewKey}>{t('org.tasks.overallPeople', null, 'People')}: </Text>
          {overallAssignees.length
            ? overallAssignees
                .map((id) => memberLabel(members.find((m) => m.user_id === id)))
                .join(', ')
            : t('org.tasks.noPeople', null, 'No people assigned')}
        </Text>
        <Text style={styles.reviewLine}>
          <Text style={styles.reviewKey}>{t('org.tasks.operationsTitle', null, 'Operations')}: </Text>
          {selectedOps
            .map((row) => activities.find((a) => a.id === row.activityId)?.name)
            .filter(Boolean)
            .join(', ') || '—'}
        </Text>
        <Text style={styles.reviewLine}>
          <Text style={styles.reviewKey}>{t('org.tasks.materialsTitle', null, 'Materials')}: </Text>
          {(() => {
            const seen = new Map();
            selectedOps.forEach((row) => {
              const act = activities.find((a) => a.id === row.activityId);
              (act?.default_materials || []).forEach((mat) => {
                if (mat?.id != null && !seen.has(mat.id)) {
                  const unit =
                    act?.norms?.materials?.default_material_unit_symbol ||
                    act?.norms?.materials?.default_material_unit_code ||
                    '';
                  seen.set(
                    mat.id,
                    `${mat.name || `#${mat.id}`}${unit ? ` (${unit})` : ''}`,
                  );
                }
              });
            });
            const names = [...seen.values()];
            return names.length
              ? names.join(', ')
              : t('org.tasks.materialsNoneYet', null, 'None from selected operations');
          })()}
        </Text>
        <TextInput
          label={t('org.tasks.photoUpload', null, 'Photo URL or label (optional)')}
          value={photoRef}
          onChangeText={setPhotoRef}
          mode="outlined"
          style={styles.input}
          textColor={ON_CARD}
        />
        <TextInput
          label={t('org.tasks.documentUpload', null, 'Document URL or label (optional)')}
          value={documentRef}
          onChangeText={setDocumentRef}
          mode="outlined"
          style={styles.input}
          textColor={ON_CARD}
        />
        {instructions.trim() ? (
          <Text style={styles.reviewLine}>
            <Text style={styles.reviewKey}>{t('org.tasks.instructions', null, 'Instructions')}: </Text>
            {instructions.trim()}
          </Text>
        ) : null}
      </>
    );
  };

  const current = stepDefs[step];

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
        {flavor !== 'generic' ? (
          <Text style={styles.lead}>
            {flavor === 'transport'
              ? t(
                  'org.tasks.wizard.leadTransport',
                  null,
                  'Transport-style task (наряд / пътен лист). Workers start and end themselves.',
                )
              : t(
                  'org.tasks.wizard.leadConstruction',
                  null,
                  'Site-style task (обект). Workers start and end themselves.',
                )}
          </Text>
        ) : (
          <Text style={styles.lead}>
            {t(
              'org.tasks.createLead',
              null,
              'Create a multi-step work card. Workers tap Start and End themselves.',
            )}
          </Text>
        )}

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
            <View style={styles.stepBar}>
              {stepDefs.map((s, idx) => (
                <Pressable
                  key={s.id}
                  onPress={() => {
                    if (idx <= step) setStep(idx);
                  }}
                  style={[
                    styles.stepDot,
                    idx === step && styles.stepDotCurrent,
                    idx < step && styles.stepDotDone,
                  ]}
                >
                  <Text
                    style={[
                      styles.stepDotText,
                      (idx === step || idx < step) && styles.stepDotTextActive,
                    ]}
                  >
                    {idx + 1}
                  </Text>
                </Pressable>
              ))}
            </View>

            <AppCard style={styles.card}>
              <Text style={styles.sectionTitle}>{current.title}</Text>
              <Text style={styles.helper}>{current.hint}</Text>
              {renderStepBody()}
            </AppCard>

            {formMessage ? (
              <AppCard style={styles.card}>
                <Text style={styles.formMessage}>{formMessage}</Text>
              </AppCard>
            ) : null}

            <View style={styles.navRow}>
              {step > 0 ? (
                <Button mode="outlined" onPress={() => setStep((s) => s - 1)} style={styles.navBtn}>
                  {t('common.back', null, 'Back')}
                </Button>
              ) : (
                <View style={styles.navBtn} />
              )}
              {step < stepDefs.length - 1 ? (
                <Button mode="contained" onPress={goNext} style={styles.navBtn}>
                  {t('common.continue', null, 'Continue')}
                </Button>
              ) : (
                <Button
                  mode="contained"
                  loading={busy}
                  disabled={busy}
                  onPress={save}
                  style={styles.navBtn}
                >
                  {t('org.tasks.save', null, 'Create task')}
                </Button>
              )}
            </View>
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
  stepBar: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  stepDotCurrent: {
    backgroundColor: '#fff',
  },
  stepDotDone: {
    backgroundColor: COLORS.ACCENT || '#22c55e',
  },
  stepDotText: {
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '700',
    fontSize: 12,
  },
  stepDotTextActive: {
    color: ON_CARD,
  },
  card: {
    padding: 14,
    marginBottom: 12,
  },
  sectionTitle: {
    color: ON_CARD,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  helper: {
    color: ON_CARD_MUTED,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 10,
  },
  empty: {
    color: ON_CARD_MUTED,
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
    color: ON_CARD_MUTED,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
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
  chipWarn: {
    borderColor: '#dc2626',
    shadowColor: '#dc2626',
    shadowOpacity: 0.35,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
  chipWarnActive: {
    backgroundColor: 'rgba(220,38,38,0.12)',
  },
  chipText: {
    color: ON_CARD,
    fontSize: 12,
    fontWeight: '600',
  },
  chipTextActive: {
    color: ON_CARD,
  },
  opBlock: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(15,23,42,0.12)',
    paddingTop: 12,
    marginBottom: 12,
  },
  opToggle: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#eef2f7',
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.12)',
  },
  opToggleActive: {
    backgroundColor: COLORS.PRIMARY_SOFT,
    borderColor: COLORS.PRIMARY,
  },
  opToggleText: {
    color: ON_CARD,
    fontSize: 15,
    fontWeight: '700',
  },
  opKind: {
    color: ON_CARD_MUTED,
    fontSize: 11,
    marginTop: 4,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  opDetails: {
    marginTop: 10,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.PRIMARY,
    paddingLeft: 10,
  },
  reviewLine: {
    color: ON_CARD,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  reviewKey: {
    fontWeight: '700',
  },
  navRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 28,
  },
  navBtn: {
    flex: 1,
  },
});
