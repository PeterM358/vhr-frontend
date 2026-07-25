import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityIndicator, Button, Divider, Text } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useFocusEffect } from '@react-navigation/native';

import ScreenBackground from '../components/ScreenBackground';
import AppCard from '../components/ui/AppCard';
import AppNavigationBar from '../components/common/AppNavigationBar';
import { getOrgFleetVehicle } from '../api/fleet';
import { useTranslation } from '../i18n';
import {
  fleetVehicleTitle,
  maintenanceStatusLabel,
  mapFleetReadiness,
  provenanceLabel,
} from '../utils/fleetReadinessStatus';

export default function OrgFleetVehicleDetailScreen({ navigation, route }) {
  const { t } = useTranslation();
  const { organizationId, vehicleId } = route.params || {};
  const [vehicle, setVehicle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!organizationId || !vehicleId) return;
    setLoading(true);
    setError('');
    try {
      const token = await AsyncStorage.getItem('@access_token');
      const data = await getOrgFleetVehicle(token, organizationId, vehicleId);
      setVehicle(data);
    } catch (e) {
      setVehicle(null);
      setError(e.message || t('fleet.detail.error'));
    } finally {
      setLoading(false);
    }
  }, [organizationId, t, vehicleId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const readiness = mapFleetReadiness(vehicle?.readiness, t);

  return (
    <ScreenBackground>
      <AppNavigationBar title={fleetVehicleTitle(vehicle)} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content}>
        {loading ? <ActivityIndicator /> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {vehicle ? (
          <>
            <AppCard>
              <View style={[styles.badge, { backgroundColor: readiness.bg }]}>
                <MaterialCommunityIcons name={readiness.icon} size={18} color={readiness.color} />
                <Text style={[styles.badgeText, { color: readiness.color }]}>{readiness.label}</Text>
              </View>
              <Text variant="titleMedium">{t('fleet.detail.readinessTitle')}</Text>
              <Text>{readiness.shortReason}</Text>
              {vehicle.readiness?.nearest_deadline ? (
                <Text style={styles.meta}>
                  {t('fleet.detail.nextDeadline')}: {vehicle.readiness.nearest_deadline}
                </Text>
              ) : null}
              <Text style={styles.meta}>
                {vehicle.license_plate || '—'} · {vehicle.department || t('fleet.dashboard.noDepartment')}
              </Text>
              <Text style={styles.meta}>
                {vehicle.vin_masked || vehicle.chassis_masked || vehicle.serial_masked || '—'}
              </Text>
              {vehicle.fleet_id ? <Text style={styles.meta}>{t('fleet.detail.internalNumber')}: {vehicle.fleet_id}</Text> : null}
            </AppCard>

            <AppCard>
              <Text variant="titleMedium">{t('fleet.detail.mandatoryItems')}</Text>
              {(vehicle.readiness?.mandatory_items || []).map((item) => (
                <View key={item.key} style={styles.itemRow}>
                  <Text style={styles.itemTitle}>{item.label}</Text>
                  <Text style={styles.meta}>
                    {t(`fleet.detail.state.${item.state}`)} · {item.due_date || t('fleet.detail.noDate')}
                  </Text>
                  {item.provenance ? (
                    <Text style={styles.meta}>{provenanceLabel(item.provenance, t)}</Text>
                  ) : null}
                  <Divider style={styles.divider} />
                </View>
              ))}
            </AppCard>

            <AppCard>
              <Text variant="titleMedium">{t('fleet.detail.maintenanceTitle')}</Text>
              {(vehicle.maintenance_preview || []).map((item) => (
                <View key={item.key} style={styles.itemRow}>
                  <Text style={styles.itemTitle}>{item.label}</Text>
                  <Text style={styles.meta}>
                    {maintenanceStatusLabel(item.status, t)}
                    {item.due_date ? ` · ${item.due_date}` : ''}
                  </Text>
                  <Divider style={styles.divider} />
                </View>
              ))}
            </AppCard>

            {vehicle.out_of_service ? (
              <AppCard>
                <Text style={styles.warning}>{t('fleet.detail.outOfServiceWarning')}</Text>
              </AppCard>
            ) : null}

            <Button
              mode="outlined"
              onPress={() => navigation.navigate('FleetDashboard', { organizationId })}
              style={styles.button}
            >
              {t('fleet.detail.backToFleet')}
            </Button>
          </>
        ) : null}
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12 },
  error: { color: '#b00020' },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  badgeText: { fontSize: 13, fontWeight: '600' },
  meta: { color: '#475569', marginTop: 4 },
  itemRow: { marginTop: 8 },
  itemTitle: { fontWeight: '600' },
  divider: { marginTop: 8 },
  warning: { color: '#dc2626' },
  button: { marginTop: 4 },
});
