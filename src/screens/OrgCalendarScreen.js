/**
 * Org calendar — fleet readiness deadlines and reminders (not shop bay schedule).
 */

import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityIndicator, Text } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';

import ScreenBackground from '../components/ScreenBackground';
import OrgAppHeader from '../components/org/OrgAppHeader';
import { listOrgFleet } from '../api/fleet';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { COLORS } from '../constants/colors';
import { useTranslation } from '../i18n';
import { navigateToOrgHome } from '../navigation/webNavigation';
import {
  organizationMembershipFor,
  readOrganizationMemberships,
  resolveActiveOrganizationId,
} from '../utils/orgWorkspace';
import { fleetVehicleTitle, mapFleetReadiness } from '../utils/fleetReadinessStatus';

const STATUS_RANK = {
  not_ready: 0,
  expiring_soon: 1,
  unknown: 2,
  ready: 3,
};

function deadlineSortKey(item) {
  const readiness = item?.readiness || {};
  const statusRank = STATUS_RANK[readiness.status] ?? 9;
  const deadline = readiness.nearest_deadline
    ? Date.parse(String(readiness.nearest_deadline).slice(0, 10))
    : Number.POSITIVE_INFINITY;
  return [statusRank, Number.isFinite(deadline) ? deadline : Number.POSITIVE_INFINITY];
}

function formatDeadline(iso, t) {
  if (!iso) return t('org.calendar.noDeadline', null, 'No deadline set');
  const raw = String(iso).slice(0, 10);
  const d = new Date(`${raw}T12:00:00`);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function OrgCalendarScreen() {
  const navigation = useNavigation();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [org, setOrg] = useState(null);
  const [fleet, setFleet] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const rows = await readOrganizationMemberships();
      const orgId = await AsyncStorage.getItem(STORAGE_KEYS.CURRENT_ORGANIZATION_ID);
      const active = organizationMembershipFor(rows, orgId) || rows[0] || null;
      setOrg(active);
      if (!active?.id) {
        setFleet([]);
        return;
      }
      const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      const resolved = await resolveActiveOrganizationId(active.id);
      const data = await listOrgFleet(token, resolved, {});
      const list = Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [];
      setFleet(list);
    } catch (e) {
      setFleet([]);
      setError(e?.message || t('org.calendar.loadError', null, 'Could not load calendar.'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const items = useMemo(() => {
    return [...fleet].sort((a, b) => {
      const [sa, da] = deadlineSortKey(a);
      const [sb, db] = deadlineSortKey(b);
      if (sa !== sb) return sa - sb;
      return da - db;
    });
  }, [fleet]);

  const onBack = useCallback(() => {
    navigateToOrgHome(navigation, { orgId: org?.id });
  }, [navigation, org?.id]);

  const renderItem = ({ item }) => {
    const readiness = mapFleetReadiness(item.readiness, t);
    const title = item.license_plate || fleetVehicleTitle(item);
    const subtitle =
      item.display_name && item.display_name !== item.license_plate ? item.display_name : null;
    const deadlineLabel = formatDeadline(readiness.nearestDeadline, t);
    const meta = [readiness.shortReason || readiness.label, deadlineLabel].filter(Boolean).join(' · ');

    return (
      <Pressable
        onPress={() =>
          navigation.navigate('OrgFleetVehicleDetail', {
            organizationId: org?.id,
            vehicleId: item.id,
          })
        }
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
        accessibilityRole="button"
      >
        <View style={[styles.iconWrap, { backgroundColor: readiness.bg }]}>
          <MaterialCommunityIcons name={readiness.icon} size={22} color={readiness.color} />
        </View>
        <View style={styles.body}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
          <Text style={styles.meta} numberOfLines={2}>
            {meta}
          </Text>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={22} color="rgba(255,255,255,0.45)" />
      </Pressable>
    );
  };

  return (
    <ScreenBackground safeArea={false}>
      <OrgAppHeader
        mode="nested"
        title={t('org.calendar.title', null, 'Org calendar')}
        onBack={onBack}
        showCalendar={false}
      />
      {loading ? <ActivityIndicator color="#fff" style={styles.loader} /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {!loading && !error ? (
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <Text style={styles.lead}>
              {t(
                'org.calendar.lead',
                null,
                'Fleet readiness deadlines and reminders for your organization.',
              )}
            </Text>
          }
          ListEmptyComponent={
            <Text style={styles.empty}>
              {t('org.calendar.empty', null, 'No fleet deadlines yet. Add vehicles to see reminders here.')}
            </Text>
          }
        />
      ) : null}
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  loader: {
    marginTop: 28,
  },
  error: {
    color: '#fecaca',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  list: {
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 28,
    gap: 10,
  },
  lead: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 10,
  },
  empty: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 24,
    paddingHorizontal: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: COLORS.BORDER_SOFT,
  },
  cardPressed: {
    opacity: 0.88,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    marginTop: 2,
  },
  meta: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 12,
    marginTop: 4,
  },
});
