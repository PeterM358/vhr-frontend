import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityIndicator, Button, Divider, Text } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useFocusEffect } from '@react-navigation/native';

import ScreenBackground from '../components/ScreenBackground';
import AppCard from '../components/ui/AppCard';
import OrgAppHeader from '../components/org/OrgAppHeader';
import { getOrgFleetVehicle } from '../api/fleet';
import { translateRepairStatus, useTranslation } from '../i18n';
import {
  fleetVehicleTitle,
  maintenanceStatusLabel,
  mapFleetReadiness,
  provenanceLabel,
} from '../utils/fleetReadinessStatus';

function formatRepairDate(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso).slice(0, 10);
  return d.toISOString().slice(0, 10);
}

function formatRepairPrice(price, currency) {
  if (price == null || price === '') return null;
  const cur = currency || 'EUR';
  return `${price} ${cur}`;
}

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

  const goRequestRepair = () => {
    if (!organizationId || !vehicleId) return;
    navigation.navigate('CreateRepair', {
      mode: 'request',
      organizationId,
      vehicleId,
      returnTo: 'OrgFleetVehicleDetail',
      origin: 'OrgFleetVehicleDetail',
    });
  };

  return (
    <ScreenBackground>
      <OrgAppHeader
        mode="nested"
        title={fleetVehicleTitle(vehicle)}
        onBack={() => navigation.goBack()}
      />
      <ScrollView contentContainerStyle={styles.content}>
        {loading ? <ActivityIndicator /> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {vehicle ? (
          <>
            <Button mode="contained" onPress={goRequestRepair} style={styles.button}>
              {t('org.home.requestRepair', null, 'Request repair')}
            </Button>
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

            <AppCard>
              <Text variant="titleMedium">{t('fleet.detail.serviceHistoryTitle')}</Text>
              {(vehicle.repairs || []).length ? (
                (vehicle.repairs || []).map((repair) => {
                  const dateLabel =
                    formatRepairDate(repair.completed_at) || formatRepairDate(repair.created_at);
                  const priceLabel = formatRepairPrice(repair.total_price, repair.currency);
                  return (
                    <View key={repair.id} style={styles.itemRow}>
                      <Text style={styles.itemTitle}>
                        {repair.repair_type_name || t('fleet.detail.serviceHistoryUntitled')}
                      </Text>
                      <Text style={styles.meta}>
                        {[
                          dateLabel,
                          repair.shop_profile_name,
                          translateRepairStatus(repair.status, t),
                          priceLabel,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </Text>
                      <Divider style={styles.divider} />
                    </View>
                  );
                })
              ) : (
                <Text style={styles.meta}>{t('fleet.detail.serviceHistoryEmpty')}</Text>
              )}
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
