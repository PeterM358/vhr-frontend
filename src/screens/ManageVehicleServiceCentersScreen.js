/**
 * Owner: authorize / revoke service centers for one vehicle (shared_with_shops).
 * Separate from logging a service record.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Button, Switch, Text } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { API_BASE_URL } from '../api/config';
import { updateVehicle } from '../api/vehicles';
import ScreenBackground from '../components/ScreenBackground';
import FloatingCard from '../components/ui/FloatingCard';
import { openServiceCenters } from '../navigation/serviceCentersNavigation';
import { COLORS } from '../constants/colors';
import {
  ACCESS_AUTHORIZED_MECHANICAL,
  ACCESS_JOB_SCOPED,
  formatRevokeConfirmMessage,
  getAccessLevel,
} from '../utils/shopDataAccess';

async function fetchVehicle(vehicleId, token) {
  const res = await fetch(`${API_BASE_URL}/api/vehicles/${vehicleId}/`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error('Could not load vehicle.');
  }
  return res.json();
}

function normalizeCenters(vehicle) {
  const raw =
    (Array.isArray(vehicle?.shared_with_shops) && vehicle.shared_with_shops) ||
    (Array.isArray(vehicle?.shared_with) && vehicle.shared_with) ||
    [];
  return raw.map((center, idx) => ({
    id: center?.id ?? `center-${idx}`,
    name: center?.name || center?.title || 'Service center',
    location:
      center?.city_name || center?.city || center?.address || center?.location || '',
  }));
}

export default function ManageVehicleServiceCentersScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const vehicleId = route.params?.vehicleId != null ? String(route.params.vehicleId) : '';

  const [vehicle, setVehicle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyShopId, setBusyShopId] = useState(null);

  const centers = useMemo(() => normalizeCenters(vehicle), [vehicle]);

  const vehicleTitle = useMemo(() => {
    if (!vehicle) return 'Vehicle';
    const plate = vehicle.license_plate || '—';
    const name = [vehicle.make_name, vehicle.model_name].filter(Boolean).join(' ') || 'Vehicle';
    return `${plate} · ${name}`;
  }, [vehicle]);

  const load = useCallback(async (isRefresh = false) => {
    const vid = parseInt(vehicleId, 10);
    if (!Number.isFinite(vid)) {
      setLoading(false);
      return;
    }
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      const token = await AsyncStorage.getItem('@access_token');
      const data = await fetchVehicle(vid, token);
      setVehicle(data);
    } catch (e) {
      console.error(e);
      Alert.alert('Error', e.message || 'Could not load vehicle.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [vehicleId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const setShopAuthorized = async (shopId, shouldAuthorize) => {
    const vid = parseInt(vehicleId, 10);
    if (!Number.isFinite(vid) || !vehicle) return;

    const currentIds = centers.map((c) => Number(c.id)).filter(Number.isFinite);
    const sid = Number(shopId);
    const nextIds = shouldAuthorize
      ? currentIds.includes(sid)
        ? currentIds
        : [...currentIds, sid]
      : currentIds.filter((id) => id !== sid);

    setBusyShopId(sid);
    try {
      const token = await AsyncStorage.getItem('@access_token');
      const updated = await updateVehicle(vid, { shared_with_shops_ids: nextIds }, token);
      setVehicle(updated);
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Could not update authorization.');
    } finally {
      setBusyShopId(null);
    }
  };

  const confirmRevoke = (center) => {
    Alert.alert('Remove access?', formatRevokeConfirmMessage(center.name), [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove access',
          style: 'destructive',
          onPress: () => setShopAuthorized(center.id, false),
        },
      ]
    );
  };

  const openShopDetail = (center) => {
    navigation.navigate('ShopDetail', {
      shopId: center.id,
      vehicleId: parseInt(vehicleId, 10),
      returnTo: 'ManageVehicleServiceCenters',
    });
  };

  const openFindCenters = () => {
    openServiceCenters(navigation, {
      vehicleId: parseInt(vehicleId, 10),
      returnTo: 'ManageVehicleServiceCenters',
    });
  };

  if (loading && !vehicle) {
    return (
      <ScreenBackground>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.PRIMARY} />
        </View>
      </ScreenBackground>
    );
  }

  return (
    <ScreenBackground>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
      >
        <FloatingCard>
          <Text variant="titleMedium" style={styles.title}>
            Service center access
          </Text>
          <Text style={styles.subtitle}>{vehicleTitle}</Text>
          {vehicle ? (
            <View style={styles.contextBanner}>
              <MaterialCommunityIcons name="car-info" size={18} color={COLORS.PRIMARY} />
              <Text style={styles.contextBannerText}>
                Use Find & authorize to discover shops on the map. Your vehicle stays in context so you can
                authorize with one tap from a pin or shop profile.
              </Text>
            </View>
          ) : null}
          <Text style={styles.hint}>
            Choose who can see more than a single booked job. Booking a repair always grants job-only access for that
            repair; authorizing a center below shares full mechanical history.
          </Text>
          {[ACCESS_JOB_SCOPED, ACCESS_AUTHORIZED_MECHANICAL].map((scope) => {
            const level = getAccessLevel(scope);
            if (!level) return null;
            const isAuthorized = scope === ACCESS_AUTHORIZED_MECHANICAL;
            return (
              <View
                key={scope}
                style={[styles.tierCard, isAuthorized ? styles.tierCardAuthorized : styles.tierCardJob]}
              >
                <View style={styles.tierHeader}>
                  <MaterialCommunityIcons
                    name={isAuthorized ? 'shield-check' : 'briefcase-outline'}
                    size={18}
                    color={isAuthorized ? '#166534' : COLORS.PRIMARY}
                  />
                  <Text style={styles.tierTitle}>{level.title}</Text>
                </View>
                <Text style={styles.tierSummary}>{level.summary}</Text>
                <Text style={styles.tierListLabel}>Can see</Text>
                {level.canSee.slice(0, 3).map((line) => (
                  <Text key={line} style={styles.tierListItem}>
                    • {line}
                  </Text>
                ))}
              </View>
            );
          })}
          <View style={styles.infoBox}>
            <MaterialCommunityIcons name="information-outline" size={18} color={COLORS.PRIMARY} />
            <Text style={styles.infoText}>
              Removing authorization does not delete past shop records. Future bookings still use job-only access for
              that repair.
            </Text>
          </View>
        </FloatingCard>

        <FloatingCard>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Authorized ({centers.length})
          </Text>
          {centers.length ? (
            <View style={styles.list}>
              {centers.map((center) => {
                const sid = Number(center.id);
                const busy = busyShopId === sid;
                return (
                  <Pressable
                    key={String(center.id)}
                    style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                    onPress={() => openShopDetail(center)}
                    accessibilityRole="button"
                    accessibilityLabel={`${center.name}, view details`}
                  >
                    <View style={styles.rowMain}>
                      <Text style={styles.rowName}>{center.name}</Text>
                      <Text style={styles.rowMeta}>
                        {center.location || 'Location not specified'}
                      </Text>
                      <Text style={styles.rowTap}>Tap for shop profile</Text>
                      <Text style={styles.authorizedBadge}>Full mechanical history</Text>
                    </View>
                    <View style={styles.rowActions}>
                      <Text style={styles.accessLabel}>Authorized</Text>
                      <Switch
                        value
                        disabled={busy}
                        onValueChange={() => confirmRevoke(center)}
                      />
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <Text style={styles.emptyHint}>
              No service centers authorized yet. Find a shop on the map and authorize it for this vehicle.
            </Text>
          )}
        </FloatingCard>

        <Button
          mode="contained"
          icon="map-search"
          onPress={openFindCenters}
          style={styles.primaryBtn}
          contentStyle={styles.primaryBtnContent}
        >
          Find & authorize service centers
        </Button>
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: 12,
    gap: 10,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontWeight: '700',
    color: COLORS.TEXT_DARK,
    marginBottom: 4,
  },
  subtitle: {
    color: COLORS.TEXT_DARK,
    fontWeight: '600',
    marginBottom: 8,
  },
  hint: {
    color: COLORS.TEXT_MUTED,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 10,
  },
  contextBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(59,130,246,0.08)',
    marginBottom: 10,
  },
  contextBannerText: {
    flex: 1,
    color: COLORS.TEXT_DARK,
    fontSize: 13,
    lineHeight: 18,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(59,130,246,0.08)',
  },
  infoText: {
    flex: 1,
    color: COLORS.TEXT_MUTED,
    fontSize: 12,
    lineHeight: 17,
  },
  tierCard: {
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
  },
  tierCardJob: {
    borderColor: 'rgba(59,130,246,0.25)',
    backgroundColor: 'rgba(59,130,246,0.05)',
  },
  tierCardAuthorized: {
    borderColor: 'rgba(34,197,94,0.25)',
    backgroundColor: 'rgba(34,197,94,0.05)',
  },
  tierHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  tierTitle: {
    fontWeight: '700',
    color: COLORS.TEXT_DARK,
    fontSize: 14,
  },
  tierSummary: {
    color: COLORS.TEXT_MUTED,
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 6,
  },
  tierListLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.TEXT_MUTED,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  tierListItem: {
    fontSize: 12,
    color: COLORS.TEXT_DARK,
    lineHeight: 17,
  },
  authorizedBadge: {
    marginTop: 6,
    alignSelf: 'flex-start',
    fontSize: 11,
    fontWeight: '700',
    color: '#166534',
    backgroundColor: 'rgba(34,197,94,0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    overflow: 'hidden',
  },
  sectionTitle: {
    fontWeight: '700',
    color: COLORS.TEXT_DARK,
    marginBottom: 8,
  },
  list: {
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.1)',
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#fff',
  },
  rowPressed: {
    backgroundColor: 'rgba(59,130,246,0.06)',
  },
  rowMain: {
    flex: 1,
    paddingRight: 8,
  },
  rowName: {
    fontWeight: '700',
    color: COLORS.TEXT_DARK,
    fontSize: 16,
  },
  rowMeta: {
    color: COLORS.TEXT_MUTED,
    marginTop: 2,
    fontSize: 13,
  },
  rowTap: {
    color: COLORS.PRIMARY,
    fontSize: 12,
    marginTop: 6,
  },
  rowActions: {
    alignItems: 'center',
    gap: 4,
  },
  accessLabel: {
    fontSize: 11,
    color: COLORS.TEXT_MUTED,
    fontWeight: '600',
  },
  emptyHint: {
    color: COLORS.TEXT_MUTED,
    fontSize: 13,
    lineHeight: 18,
  },
  primaryBtn: {
    marginTop: 4,
    borderRadius: 12,
  },
  primaryBtnContent: {
    paddingVertical: 6,
  },
});
