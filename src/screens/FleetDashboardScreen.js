import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Platform, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityIndicator, Button, FAB, Menu, Searchbar, Text, TouchableRipple, useTheme } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useFocusEffect } from '@react-navigation/native';

import ScreenBackground from '../components/ScreenBackground';
import OrgAppHeader from '../components/org/OrgAppHeader';
import FleetAreaSwitch, { FLEET_AREA } from '../components/org/FleetAreaSwitch';
import { listOrgFleet, listOrganizations } from '../api/fleet';
import { usePartnerDashboardBack } from '../navigation/appNavBarBack';
import {
  orgCanPlanFleet,
  organizationMembershipFor,
  readOrganizationMemberships,
  resolveIsOrgOnlySession,
} from '../utils/orgWorkspace';
import { resolveIsPartnerSession } from '../utils/partnerSession';
import { navigateToOrgFleetPlanning, navigateToOrgHome } from '../navigation/webNavigation';
import { useTranslation } from '../i18n';
import { fleetVehicleTitle, mapFleetReadiness } from '../utils/fleetReadinessStatus';
import { COLORS } from '../styles/colors';

const READINESS_FILTERS = ['', 'ready', 'not_ready', 'expiring_soon', 'unknown'];

const FLEET_TABS = [
  { id: 'all', labelKey: 'fleet.dashboard.tabs.all', fallback: 'All' },
  { id: 'ready', labelKey: 'fleet.dashboard.tabs.ready', fallback: 'Ready' },
  { id: 'issues', labelKey: 'fleet.dashboard.tabs.issues', fallback: 'Not ready' },
  { id: 'import', labelKey: 'fleet.dashboard.tabs.import', fallback: 'Import' },
];

function FilterChipAnchor({ label, active, icon, onPress, style }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.filterChip,
        active && styles.filterChipActive,
        pressed && styles.filterChipPressed,
        style,
      ]}
      accessibilityRole="button"
    >
      {icon ? (
        <MaterialCommunityIcons
          name={icon}
          size={15}
          color={active ? '#fff' : '#334155'}
          style={styles.filterChipIcon}
        />
      ) : null}
      <Text style={[styles.filterChipText, active && styles.filterChipTextActive]} numberOfLines={1}>
        {label}
      </Text>
      <MaterialCommunityIcons
        name="chevron-down"
        size={16}
        color={active ? 'rgba(255,255,255,0.9)' : '#64748b'}
      />
    </Pressable>
  );
}

export default function FleetDashboardScreen({ navigation, route }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const shopBack = usePartnerDashboardBack(navigation);
  const onBack = useCallback(async () => {
    const isShop = await resolveIsPartnerSession();
    if (isShop) {
      shopBack();
      return;
    }
    const orgs = await readOrganizationMemberships();
    if (orgs.length > 0) {
      navigateToOrgHome(navigation, { orgId: route.params?.organizationId || orgs[0]?.id });
      return;
    }
    shopBack();
  }, [navigation, route.params?.organizationId, shopBack]);
  const { width } = useWindowDimensions();
  const isWide = width >= 900;
  const initialOrgId = route.params?.organizationId;
  const routeTab = String(route.params?.tab || '').toLowerCase();

  const [organizations, setOrganizations] = useState([]);
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [fleet, setFleet] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('');
  const [readinessStatus, setReadinessStatus] = useState(
    routeTab === 'issues' ? 'not_ready' : routeTab === 'ready' ? 'ready' : '',
  );
  const [activeTab, setActiveTab] = useState(
    routeTab === 'issues' || routeTab === 'import' || routeTab === 'ready'
      ? routeTab
      : 'all',
  );
  const [orgMenuVisible, setOrgMenuVisible] = useState(false);
  const [deptMenuVisible, setDeptMenuVisible] = useState(false);
  const [statusMenuVisible, setStatusMenuVisible] = useState(false);
  const [canPlanFleet, setCanPlanFleet] = useState(false);

  const visibleOrgs = useMemo(
    () => organizations.filter((org) => org.can_view_fleet !== false),
    [organizations],
  );
  const showOrgChip = visibleOrgs.length > 1;

  useEffect(() => {
    if (
      routeTab === 'issues' ||
      routeTab === 'import' ||
      routeTab === 'all' ||
      routeTab === 'ready'
    ) {
      setActiveTab(routeTab);
      if (routeTab === 'issues') setReadinessStatus('not_ready');
      else if (routeTab === 'ready') setReadinessStatus('ready');
      else if (routeTab === 'all') setReadinessStatus('');
    }
  }, [routeTab]);

  const selectTab = useCallback((tabId) => {
    setActiveTab(tabId);
    if (tabId === 'all') {
      setReadinessStatus('');
      return;
    }
    if (tabId === 'ready') {
      setReadinessStatus('ready');
      return;
    }
    if (tabId === 'issues') {
      setReadinessStatus('not_ready');
    }
  }, []);

  const loadOrganizations = useCallback(async () => {
    const token = await AsyncStorage.getItem('@access_token');
    const rows = await listOrganizations(token);
    setOrganizations(rows);
    const preferred = rows.find((org) => org.id === initialOrgId) || rows.find((org) => org.can_view_fleet);
    setSelectedOrg((current) => current || preferred || null);
  }, [initialOrgId]);

  const loadFleet = useCallback(async () => {
    if (!selectedOrg?.id || activeTab === 'import') {
      if (activeTab === 'import') {
        setFleet([]);
        setLoading(false);
      }
      if (!selectedOrg?.id) {
        setFleet([]);
        setDepartments([]);
        setLoading(false);
      }
      return;
    }
    setLoading(true);
    setError('');
    try {
      const token = await AsyncStorage.getItem('@access_token');
      const data = await listOrgFleet(token, selectedOrg.id, {
        search: search.trim(),
        department,
        readiness_status: readinessStatus,
      });
      setFleet(data.results || []);
      setDepartments(data.departments || []);
    } catch (e) {
      setFleet([]);
      setError(e.message || t('fleet.dashboard.error'));
    } finally {
      setLoading(false);
    }
  }, [activeTab, department, readinessStatus, search, selectedOrg, t]);

  useFocusEffect(
    useCallback(() => {
      loadOrganizations().catch((e) => setError(e.message || t('fleet.dashboard.error')));
    }, [loadOrganizations, t]),
  );

  useFocusEffect(
    useCallback(() => {
      loadFleet();
    }, [loadFleet]),
  );

  const renderRow = ({ item }) => {
    const readiness = mapFleetReadiness(item.readiness, t);
    const plate = item.license_plate || fleetVehicleTitle(item);
    const makeModel =
      item.display_name && item.display_name !== item.license_plate ? item.display_name : null;
    const deptLabel = item.department || t('fleet.dashboard.noDepartment');
    const driverLabel =
      item.assigned_driver?.display_name
      || item.driver_name
      || null;
    const subtitle = [makeModel, deptLabel, driverLabel].filter(Boolean).join(' · ');
    const showReason =
      readiness.shortReason &&
      readiness.shortReason !== readiness.label &&
      readiness.status !== 'ready';

    return (
      <TouchableRipple
        onPress={() =>
          navigation.navigate('OrgFleetVehicleDetail', {
            organizationId: selectedOrg.id,
            vehicleId: item.id,
          })
        }
        style={[styles.card, isWide ? styles.cardWide : null]}
        borderless
      >
        <View style={styles.cardInner}>
          <View style={styles.thumb}>
            <MaterialCommunityIcons name="car" size={32} color="#475569" />
          </View>

          <View style={styles.cardBody}>
            <View style={styles.rowTop}>
              <Text style={styles.plate} numberOfLines={1}>
                {plate}
              </Text>
              <View style={[styles.badge, { backgroundColor: readiness.bg }]}>
                <MaterialCommunityIcons name={readiness.icon} size={14} color={readiness.color} />
                <Text style={[styles.badgeText, { color: readiness.color }]} numberOfLines={1}>
                  {readiness.label}
                </Text>
              </View>
            </View>

            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>

            {showReason ? (
              <Text style={styles.reason} numberOfLines={2}>
                {readiness.shortReason}
              </Text>
            ) : null}
          </View>

          <MaterialCommunityIcons name="chevron-right" size={24} color="#94a3b8" />
        </View>
      </TouchableRipple>
    );
  };

  const statusLabel = readinessStatus
    ? mapFleetReadiness({ status: readinessStatus }, t).label
    : t('fleet.dashboard.allStatuses');

  useEffect(() => {
    if (!selectedOrg?.id) return;
    let cancelled = false;
    (async () => {
      const memberships = await readOrganizationMemberships();
      if (cancelled) return;
      const membership = organizationMembershipFor(memberships, selectedOrg.id);
      setCanPlanFleet(orgCanPlanFleet(membership));
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedOrg?.id]);

  const goServiceRequest = async () => {
    const orgId = selectedOrg?.id || initialOrgId;
    const isOrgOnly = await resolveIsOrgOnlySession();
    navigation.navigate('CreateRepair', {
      mode: 'request',
      ...(orgId ? { organizationId: orgId } : {}),
      returnTo: isOrgOnly ? 'OrgFleet' : 'FleetDashboard',
      origin: 'FleetDashboard',
    });
  };

  const goImportFleet = () => {
    navigation.navigate('FleetRegisterImport', {
      organizationId: selectedOrg?.id || initialOrgId,
    });
  };

  return (
    <ScreenBackground>
      <OrgAppHeader mode="nested" title={t('fleet.dashboard.title')} onBack={onBack} />
      <FleetAreaSwitch
        activeArea={FLEET_AREA.VEHICLES}
        showPlanning={canPlanFleet}
        onSelectVehicles={() => {}}
        onSelectPlanning={() =>
          navigateToOrgFleetPlanning(navigation, {
            orgId: selectedOrg?.id || initialOrgId,
          })
        }
      />
      <View style={styles.container}>
        <View style={styles.toolbar}>
          <View style={styles.modeRow}>
            {FLEET_TABS.map((item) => {
              const active = activeTab === item.id;
              return (
                <Pressable
                  key={item.id}
                  onPress={() => selectTab(item.id)}
                  style={[styles.modeChip, active && styles.modeChipActive]}
                >
                  <Text style={[styles.modeChipText, active && styles.modeChipTextActive]}>
                    {t(item.labelKey, null, item.fallback)}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {activeTab === 'import' ? (
            <View style={styles.importPanel}>
              <Text style={styles.importLead}>
                {t(
                  'fleet.dashboard.importLead',
                  null,
                  'Upload your fleet register spreadsheet, or request service for a vehicle.',
                )}
              </Text>
              <Button
                mode="contained"
                icon="file-upload-outline"
                onPress={goImportFleet}
                style={styles.importPrimary}
              >
                {t('fleetImport.openAction', null, 'Import fleet register')}
              </Button>
              <Button
                mode="outlined"
                icon="wrench"
                onPress={goServiceRequest}
                style={styles.importSecondary}
                textColor="#fff"
              >
                {t('fleet.dashboard.serviceRequest', null, 'Service request')}
              </Button>
            </View>
          ) : (
            <>
              <Searchbar
                placeholder={t('fleet.dashboard.searchPlaceholder')}
                value={search}
                onChangeText={setSearch}
                onSubmitEditing={loadFleet}
                onIconPress={loadFleet}
                style={styles.search}
                inputStyle={styles.searchInput}
                iconColor="#64748b"
                placeholderTextColor="#94a3b8"
              />

              <View style={styles.filterRow}>
                {showOrgChip ? (
                  <Menu
                    visible={orgMenuVisible}
                    onDismiss={() => setOrgMenuVisible(false)}
                    anchor={
                      <FilterChipAnchor
                        label={selectedOrg?.display_name || t('fleetImport.chooseOrganization')}
                        active={Boolean(selectedOrg)}
                        icon="office-building-outline"
                        onPress={() => setOrgMenuVisible(true)}
                        style={styles.filterChipGrow}
                      />
                    }
                  >
                    {visibleOrgs.map((org) => (
                      <Menu.Item
                        key={org.id}
                        title={org.display_name}
                        onPress={() => {
                          setSelectedOrg(org);
                          setOrgMenuVisible(false);
                        }}
                      />
                    ))}
                  </Menu>
                ) : null}

                <Menu
                  visible={deptMenuVisible}
                  onDismiss={() => setDeptMenuVisible(false)}
                  anchor={
                    <FilterChipAnchor
                      label={department || t('fleet.dashboard.allDepartments')}
                      active={Boolean(department)}
                      icon="sitemap"
                      onPress={() => setDeptMenuVisible(true)}
                    />
                  }
                >
                  <Menu.Item
                    title={t('fleet.dashboard.allDepartments')}
                    onPress={() => {
                      setDepartment('');
                      setDeptMenuVisible(false);
                    }}
                  />
                  {departments.map((value) => (
                    <Menu.Item
                      key={value}
                      title={value}
                      onPress={() => {
                        setDepartment(value);
                        setDeptMenuVisible(false);
                      }}
                    />
                  ))}
                </Menu>

                {activeTab === 'all' ? (
                  <Menu
                    visible={statusMenuVisible}
                    onDismiss={() => setStatusMenuVisible(false)}
                    anchor={
                      <FilterChipAnchor
                        label={statusLabel}
                        active={Boolean(readinessStatus)}
                        icon="shield-check-outline"
                        onPress={() => setStatusMenuVisible(true)}
                      />
                    }
                  >
                    {READINESS_FILTERS.map((value) => (
                      <Menu.Item
                        key={value || 'all'}
                        title={
                          value
                            ? mapFleetReadiness({ status: value }, t).label
                            : t('fleet.dashboard.allStatuses')
                        }
                        onPress={() => {
                          setReadinessStatus(value);
                          setStatusMenuVisible(false);
                        }}
                      />
                    ))}
                  </Menu>
                ) : null}
              </View>
            </>
          )}
        </View>

        {activeTab !== 'import' ? (
          <>
            {loading ? <ActivityIndicator style={styles.loader} color="#fff" /> : null}
            {error ? <Text style={styles.error}>{error}</Text> : null}

            {!loading && !error ? (
              <FlatList
                data={fleet}
                keyExtractor={(item) => String(item.id)}
                renderItem={renderRow}
                contentContainerStyle={styles.list}
                ListEmptyComponent={<Text style={styles.empty}>{t('fleet.dashboard.empty')}</Text>}
              />
            ) : null}

            <FAB
              icon="plus"
              style={[styles.fab, { backgroundColor: theme.colors.primary }]}
              onPress={goServiceRequest}
              label={t('fleet.dashboard.serviceRequest', null, 'Service request')}
              color={theme.colors.onPrimary}
            />
          </>
        ) : null}
      </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  toolbar: {
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 10,
  },
  modeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  modeChip: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  modeChipActive: {
    backgroundColor: '#fff',
    borderColor: '#fff',
  },
  modeChipText: {
    color: 'rgba(255,255,255,0.88)',
    fontSize: 13,
    fontWeight: '700',
  },
  modeChipTextActive: {
    color: '#0F172A',
  },
  importPanel: {
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    padding: 14,
    gap: 10,
  },
  importLead: {
    color: 'rgba(255,255,255,0.88)',
    fontSize: 14,
    lineHeight: 20,
  },
  importPrimary: {
    borderRadius: 12,
  },
  importSecondary: {
    borderRadius: 12,
    borderColor: 'rgba(255,255,255,0.45)',
  },
  search: {
    borderRadius: 12,
    backgroundColor: '#fff',
    elevation: 0,
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.08)',
  },
  searchInput: {
    fontSize: 14,
    minHeight: 0,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    minHeight: 38,
    borderRadius: 999,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.12)',
    maxWidth: '100%',
  },
  filterChipGrow: {
    maxWidth: Platform.OS === 'web' ? 280 : '100%',
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primaryDark,
  },
  filterChipPressed: {
    opacity: 0.9,
  },
  filterChipIcon: {
    marginRight: 5,
  },
  filterChipText: {
    flexShrink: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginRight: 2,
  },
  filterChipTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  loader: { marginTop: 24 },
  error: {
    color: '#fecaca',
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  empty: {
    padding: 24,
    textAlign: 'center',
    color: 'rgba(255,255,255,0.85)',
    fontSize: 15,
  },
  list: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.08)',
  },
  cardWide: { width: '100%' },
  cardInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  cardBody: {
    flex: 1,
    minWidth: 0,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  plate: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: '#0f172a',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 14,
    color: '#1e293b',
    marginBottom: 2,
  },
  reason: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  badge: {
    flexShrink: 0,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    maxWidth: 140,
  },
  badgeText: { fontSize: 11, fontWeight: '700' },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
  },
});
