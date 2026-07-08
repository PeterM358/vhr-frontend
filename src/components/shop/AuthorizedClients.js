// PATH: src/components/shop/AuthorizedClients.js

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  LayoutAnimation,
  UIManager,
  Platform,
  StyleSheet,
  FlatList,
  Pressable,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import {
  Text,
  ActivityIndicator,
  Button,
} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import { API_BASE_URL } from '../../api/config';
import ScreenBackground from '../ScreenBackground';
import AppNavigationBar from '../common/AppNavigationBar';
import { usePartnerDashboardBack } from '../../navigation/appNavBarBack';
import { useTranslation } from '../../i18n';
import FloatingCard from '../ui/FloatingCard';
import AppCard from '../ui/AppCard';
import EmptyStateCard from '../ui/EmptyStateCard';
import {
  PRIMARY,
  PRIMARY_LIGHT,
  TEXT_DARK,
  TEXT_MUTED,
} from '../../constants/colors';

const API_URL = `${API_BASE_URL}/api/profiles/shops/authorized-clients/`;

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function AuthorizedClients({ navigation }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const handleBack = usePartnerDashboardBack(navigation);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedClientIds, setExpandedClientIds] = useState([]);

  const fetchAuthorized = useCallback(async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('@access_token');
      const response = await fetch(API_URL, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setClients(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching authorized clients', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchAuthorized();
    }, [fetchAuthorized])
  );

  const toggleExpand = (clientId) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedClientIds((prev) =>
      prev.includes(clientId)
        ? prev.filter((id) => id !== clientId)
        : [...prev, clientId]
    );
  };

  const formatMoney = (amount, currency = 'EUR') => {
    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0) return null;
    try {
      return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: currency || 'EUR',
        maximumFractionDigits: 0,
      }).format(n);
    } catch {
      return `${n.toFixed(0)} ${currency || 'EUR'}`;
    }
  };

  const renderClient = ({ item }) => {
    const expanded = expandedClientIds.includes(item.client.id);
    const clientLabel =
      item.client.email ||
      item.client.phone ||
      'Unnamed Client';
    const vehicleCount = item.vehicles?.length ?? 0;
    const stats = item.shop_stats || {};
    const paidLabel = formatMoney(stats.paid_total, stats.currency);
    const unpaidLabel = formatMoney(stats.unpaid_total, stats.currency);
    const unpaidJobs = Number(stats.unpaid_jobs) || 0;
    const completedJobs = Number(stats.completed_jobs) || 0;
    const openJobs = Number(stats.open_jobs) || 0;
    const invoiceableIds = Array.isArray(stats.unpaid_invoiceable_repair_ids)
      ? stats.unpaid_invoiceable_repair_ids
      : [];

    const openUnpaidForInvoice = () => {
      if (!invoiceableIds.length && unpaidJobs === 0) return;
      navigation.navigate('RepairsList', {
        openInvoiceSelection: true,
        paymentStatus: 'unpaid',
        clientId: item.client.id,
        clientLabel,
        preselectRepairIds: invoiceableIds,
        returnTo: 'AuthorizedClients',
      });
    };

    return (
      <FloatingCard>
        <Pressable onPress={() => toggleExpand(item.client.id)}>
          <View style={styles.clientRow}>
            <View style={styles.avatar}>
              <MaterialCommunityIcons name="account" size={22} color={PRIMARY} />
            </View>
            <View style={styles.clientInfo}>
              <Text style={styles.clientLabel} numberOfLines={2}>
                {clientLabel}
              </Text>
              <Text style={styles.clientMeta}>
                {vehicleCount} {vehicleCount === 1 ? 'vehicle' : 'vehicles'}
                {completedJobs ? ` · ${completedJobs} jobs` : ''}
              </Text>
              {paidLabel ? (
                <Text style={styles.clientRevenue}>Paid: {paidLabel}</Text>
              ) : null}
            </View>
            <MaterialCommunityIcons
              name={expanded ? 'chevron-up' : 'chevron-down'}
              size={22}
              color={TEXT_MUTED}
            />
          </View>
        </Pressable>

        {unpaidJobs > 0 && unpaidLabel ? (
          <Pressable onPress={openUnpaidForInvoice} hitSlop={6} style={styles.clientUnpaidRow}>
            <Text style={styles.clientUnpaid}>
              Unpaid: {unpaidLabel} ({unpaidJobs}) · Select to invoice
            </Text>
          </Pressable>
        ) : null}

        {expanded && (
          <View style={styles.expandedContent}>
            <View style={styles.statsCard}>
              <Text style={styles.statsTitle}>At your shop</Text>
              <View style={styles.statsRow}>
                <Text style={styles.statsLabel}>Completed jobs</Text>
                <Text style={styles.statsValue}>{completedJobs}</Text>
              </View>
              <View style={styles.statsRow}>
                <Text style={styles.statsLabel}>Open / in progress</Text>
                <Text style={styles.statsValue}>{openJobs}</Text>
              </View>
              <View style={styles.statsRow}>
                <Text style={styles.statsLabel}>Total paid</Text>
                <Text style={styles.statsValue}>{paidLabel || '—'}</Text>
              </View>
              <View style={styles.statsRow}>
                <Text style={styles.statsLabel}>Unpaid (done jobs)</Text>
                {unpaidJobs > 0 ? (
                  <Pressable onPress={openUnpaidForInvoice} hitSlop={6}>
                    <Text style={[styles.statsValue, styles.statsUnpaid, styles.statsUnpaidLink]}>
                      {unpaidLabel || '—'}
                      {` · ${unpaidJobs} job${unpaidJobs === 1 ? '' : 's'}`}
                      {' · Invoice'}
                    </Text>
                  </Pressable>
                ) : (
                  <Text style={styles.statsValue}>—</Text>
                )}
              </View>
              {stats.last_completed_at ? (
                <Text style={styles.statsFoot}>
                  Last completed:{' '}
                  {new Date(stats.last_completed_at).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </Text>
              ) : null}
            </View>

            {item.vehicles?.map((vehicle) => (
              <FloatingCard
                key={vehicle.id}
                accent={false}
                onPress={() =>
                  navigation.navigate('VehicleDetail', {
                    vehicleId: vehicle.id,
                    backLabel: 'Clients',
                  })
                }
                style={styles.subCard}
              >
                <Text style={styles.vehicleTitle}>{vehicle.license_plate}</Text>
                <Text style={styles.vehicleLine}>
                  {vehicle.make_name} {vehicle.model_name}
                </Text>
                <View style={styles.vehicleMetaRow}>
                  {(vehicle.registration_year != null && vehicle.registration_year !== '') || vehicle.year ? (
                    <Text style={styles.vehicleMeta}>
                      Year: {vehicle.registration_year ?? vehicle.year}
                    </Text>
                  ) : null}
                  {vehicle.kilometers != null && (
                    <Text style={styles.vehicleMeta}>
                      {Number(vehicle.kilometers).toLocaleString()} km
                    </Text>
                  )}
                </View>
              </FloatingCard>
            ))}

            <Button
              mode="contained"
              icon="plus"
              onPress={() =>
                navigation.navigate('CreateVehicle', {
                  clientId: item.client.id,
                  clientEmail: item.client.email,
                  clientPhone: item.client.phone,
                })
              }
              style={styles.addVehicleButton}
              buttonColor={PRIMARY}
              textColor="#fff"
            >
              Add Vehicle
            </Button>
          </View>
        )}
      </FloatingCard>
    );
  };

  if (loading) {
    return (
      <ScreenBackground>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#fff" />
        </View>
      </ScreenBackground>
    );
  }

  return (
    <ScreenBackground safeArea={false}>
      <AppNavigationBar
        title={t('drawer.partner.clients')}
        backLabel={t('navigation.backToDashboard')}
        onBack={handleBack}
      />
      <View style={styles.container}>
        <AppCard variant="dark" accent={false} style={styles.heroCard}>
          <View style={styles.heroRow}>
            <View style={styles.heroIconWrap}>
              <MaterialCommunityIcons
                name="shield-account-outline"
                size={28}
                color={PRIMARY_LIGHT}
              />
            </View>
            <View style={styles.heroTextWrap}>
              <Text style={styles.heroTitle}>{t('partnerDashboard.clients.authorizedTitle')}</Text>
              <Text style={styles.heroSubtitle}>
                {clients.length === 1
                  ? t('partnerDashboard.clients.clientCountOne')
                  : t('partnerDashboard.clients.clientCountMany', { count: clients.length })}
              </Text>
            </View>
          </View>
          <Button
            mode="contained"
            icon="plus"
            onPress={() => navigation.navigate('ShopRegisterClient')}
            style={styles.addButton}
            buttonColor={PRIMARY}
            textColor="#fff"
          >
            {t('partnerDashboard.clients.addClient')}
          </Button>
        </AppCard>

        <FlatList
          data={clients}
          keyExtractor={(item) =>
            item.client.id?.toString() ?? Math.random().toString()
          }
          renderItem={renderClient}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <EmptyStateCard
              icon="account-multiple-outline"
                title={t('partnerDashboard.clients.emptyTitle')}
                subtitle={t('partnerDashboard.clients.emptySubtitle')}
            />
          }
        />
      </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    flex: 1,
    paddingHorizontal: 12,
    backgroundColor: 'transparent',
  },
  heroCard: {
    marginBottom: 14,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  heroIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: 'rgba(96,165,250,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  heroTextWrap: {
    flex: 1,
  },
  heroTitle: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 13,
    marginTop: 2,
  },
  addButton: {
    borderRadius: 12,
  },
  listContent: {
    paddingBottom: 20,
  },
  clientRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(37,99,235,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  clientInfo: {
    flex: 1,
  },
  clientLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: TEXT_DARK,
  },
  clientMeta: {
    fontSize: 12,
    color: TEXT_MUTED,
    marginTop: 2,
  },
  clientRevenue: {
    fontSize: 12,
    color: '#15803d',
    fontWeight: '600',
    marginTop: 4,
  },
  clientUnpaid: {
    fontSize: 12,
    color: '#b45309',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  clientUnpaidRow: {
    marginTop: 8,
    marginLeft: 56,
  },
  statsCard: {
    backgroundColor: 'rgba(15,23,42,0.04)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(15,23,42,0.08)',
  },
  statsTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: TEXT_DARK,
    marginBottom: 8,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  statsLabel: {
    fontSize: 13,
    color: TEXT_MUTED,
  },
  statsValue: {
    fontSize: 13,
    fontWeight: '600',
    color: TEXT_DARK,
  },
  statsUnpaid: {
    color: '#b45309',
  },
  statsUnpaidLink: {
    textDecorationLine: 'underline',
  },
  statsFoot: {
    marginTop: 8,
    fontSize: 12,
    color: TEXT_MUTED,
  },
  expandedContent: {
    paddingTop: 12,
  },
  subCard: {
    marginTop: 8,
    marginBottom: 4,
    padding: 12,
  },
  vehicleTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: TEXT_DARK,
    letterSpacing: 0.4,
  },
  vehicleLine: {
    fontSize: 13,
    color: TEXT_DARK,
    marginTop: 2,
  },
  vehicleMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  vehicleMeta: {
    fontSize: 12,
    color: TEXT_MUTED,
    marginRight: 12,
  },
  addVehicleButton: {
    marginTop: 14,
    alignSelf: 'flex-start',
    borderRadius: 12,
  },
});
