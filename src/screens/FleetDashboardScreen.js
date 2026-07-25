import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, Platform, StyleSheet, useWindowDimensions, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityIndicator, Button, Menu, Searchbar, Text, TouchableRipple } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useFocusEffect } from '@react-navigation/native';

import ScreenBackground from '../components/ScreenBackground';
import OrgAppHeader from '../components/org/OrgAppHeader';
import { listOrgFleet, listOrganizations } from '../api/fleet';
import { usePartnerDashboardBack } from '../navigation/appNavBarBack';
import { readOrganizationMemberships, resolveIsOrgOnlySession } from '../utils/orgWorkspace';
import { resolveIsPartnerSession } from '../utils/partnerSession';
import { navigateToOrgHome } from '../navigation/webNavigation';
import { useTranslation } from '../i18n';
import { fleetVehicleTitle, mapFleetReadiness } from '../utils/fleetReadinessStatus';

const READINESS_FILTERS = ['', 'not_ready', 'expiring_soon', 'unknown', 'ready'];

export default function FleetDashboardScreen({ navigation, route }) {
  const { t } = useTranslation();
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

  const [organizations, setOrganizations] = useState([]);
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [fleet, setFleet] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('');
  const [readinessStatus, setReadinessStatus] = useState('');
  const [orgMenuVisible, setOrgMenuVisible] = useState(false);
  const [deptMenuVisible, setDeptMenuVisible] = useState(false);
  const [statusMenuVisible, setStatusMenuVisible] = useState(false);

  const visibleOrgs = useMemo(
    () => organizations.filter((org) => org.can_view_fleet !== false),
    [organizations],
  );

  const loadOrganizations = useCallback(async () => {
    const token = await AsyncStorage.getItem('@access_token');
    const rows = await listOrganizations(token);
    setOrganizations(rows);
    const preferred = rows.find((org) => org.id === initialOrgId) || rows.find((org) => org.can_view_fleet);
    setSelectedOrg((current) => current || preferred || null);
  }, [initialOrgId]);

  const loadFleet = useCallback(async () => {
    if (!selectedOrg?.id) {
      setFleet([]);
      setDepartments([]);
      setLoading(false);
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
  }, [department, readinessStatus, search, selectedOrg, t]);

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
    return (
      <TouchableRipple
        onPress={() =>
          navigation.navigate('OrgFleetVehicleDetail', {
            organizationId: selectedOrg.id,
            vehicleId: item.id,
          })
        }
        style={[styles.row, isWide ? styles.rowWide : null]}
      >
        <View style={styles.rowInner}>
          <View style={styles.rowMain}>
            <Text style={styles.title}>{fleetVehicleTitle(item)}</Text>
            <Text style={styles.meta}>
              {item.license_plate || '—'} · {item.department || t('fleet.dashboard.noDepartment')}
            </Text>
            <Text style={styles.meta}>{item.identity_masked || item.vin_masked || '—'}</Text>
            <Text style={styles.reason}>{readiness.shortReason}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: readiness.bg }]}>
            <MaterialCommunityIcons name={readiness.icon} size={16} color={readiness.color} />
            <Text style={[styles.badgeText, { color: readiness.color }]}>{readiness.label}</Text>
          </View>
        </View>
      </TouchableRipple>
    );
  };

  const statusLabel = readinessStatus
    ? mapFleetReadiness({ status: readinessStatus }, t).label
    : t('fleet.dashboard.allStatuses');

  const goRequestRepair = async () => {
    const orgId = selectedOrg?.id || initialOrgId;
    const isOrgOnly = await resolveIsOrgOnlySession();
    navigation.navigate('CreateRepair', {
      mode: 'request',
      ...(orgId ? { organizationId: orgId } : {}),
      returnTo: isOrgOnly ? 'OrgFleet' : 'FleetDashboard',
      origin: 'FleetDashboard',
    });
  };

  return (
    <ScreenBackground>
      <OrgAppHeader mode="nested" title={t('fleet.dashboard.title')} onBack={onBack} />
      <View style={styles.toolbar}>
        <Menu
          visible={orgMenuVisible}
          onDismiss={() => setOrgMenuVisible(false)}
          anchor={
            <Button mode="outlined" onPress={() => setOrgMenuVisible(true)} style={styles.filterButton}>
              {selectedOrg?.display_name || t('fleetImport.chooseOrganization')}
            </Button>
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
        <Searchbar
          placeholder={t('fleet.dashboard.searchPlaceholder')}
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={loadFleet}
          onIconPress={loadFleet}
          style={styles.search}
        />
        <Menu
          visible={deptMenuVisible}
          onDismiss={() => setDeptMenuVisible(false)}
          anchor={
            <Button mode="outlined" onPress={() => setDeptMenuVisible(true)} style={styles.filterButton}>
              {department || t('fleet.dashboard.allDepartments')}
            </Button>
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
        <Menu
          visible={statusMenuVisible}
          onDismiss={() => setStatusMenuVisible(false)}
          anchor={
            <Button mode="outlined" onPress={() => setStatusMenuVisible(true)} style={styles.filterButton}>
              {statusLabel}
            </Button>
          }
        >
          {READINESS_FILTERS.map((value) => (
            <Menu.Item
              key={value || 'all'}
              title={value ? mapFleetReadiness({ status: value }, t).label : t('fleet.dashboard.allStatuses')}
              onPress={() => {
                setReadinessStatus(value);
                setStatusMenuVisible(false);
              }}
            />
          ))}
        </Menu>
        <Button mode="contained-tonal" onPress={() => navigation.navigate('FleetRegisterImport')}>
          {t('fleetImport.openAction')}
        </Button>
        <Button mode="outlined" onPress={goRequestRepair}>
          {t('org.home.requestRepair', null, 'Request repair')}
        </Button>
      </View>

      {loading ? <ActivityIndicator style={styles.loader} /> : null}
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
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  toolbar: {
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 8,
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    flexWrap: 'wrap',
    alignItems: Platform.OS === 'web' ? 'center' : 'stretch',
  },
  search: { flexGrow: 1, minWidth: 220 },
  filterButton: { alignSelf: 'flex-start' },
  loader: { marginTop: 24 },
  error: { color: '#b00020', padding: 16 },
  empty: { padding: 24, textAlign: 'center', color: '#64748b' },
  list: { padding: 16, gap: 10 },
  row: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 10,
  },
  rowWide: { width: '100%' },
  rowInner: {
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  rowMain: { flex: 1, gap: 4 },
  title: { fontSize: 16, fontWeight: '600', color: '#0f172a' },
  meta: { color: '#475569', fontSize: 13 },
  reason: { color: '#64748b', fontSize: 13, marginTop: 4 },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  badgeText: { fontSize: 12, fontWeight: '600' },
});
