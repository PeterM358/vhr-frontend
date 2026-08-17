import React, { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityIndicator, Button, Text } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';

import ScreenBackground from '../components/ScreenBackground';
import AppCard from '../components/ui/AppCard';
import OrgAppHeader from '../components/org/OrgAppHeader';
import { getWarehouseZoneDetail } from '../api/orgWarehouse';
import { resolveActiveOrganizationId } from '../utils/orgWorkspace';
import {
  navigateToOrgWarehouseAddress,
  navigateToOrgWarehouseLocation,
} from '../navigation/webNavigation';
import { useTranslation } from '../i18n';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { COLORS } from '../constants/colors';
import { useScrollContentBottomPadding } from '../utils/mobileWebInsets';

const ON_CARD = '#0F172A';
const ON_CARD_MUTED = '#475569';

export default function OrgWarehouseZoneDetailScreen({ navigation, route }) {
  const { t } = useTranslation();
  const routeOrgId = route?.params?.organizationId || route?.params?.orgId;
  const siteId = route?.params?.locationId || route?.params?.siteId;
  const zoneName = route?.params?.zone || '';
  const scrollBottomPadding = useScrollContentBottomPadding(40);

  const [orgId, setOrgId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);

  const onBack = useCallback(() => {
    navigateToOrgWarehouseLocation(navigation, {
      orgId: routeOrgId || orgId,
      locationId: siteId,
    });
  }, [navigation, orgId, routeOrgId, siteId]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      const resolved = await resolveActiveOrganizationId(routeOrgId);
      setOrgId(resolved);
      if (!resolved || !siteId || !zoneName) {
        setError(t('org.warehouse.zoneNotFound', null, 'Zone not found.'));
        return;
      }
      const payload = await getWarehouseZoneDetail(token, resolved, siteId, zoneName);
      setData(payload);
    } catch (e) {
      setError(e.message || t('org.warehouse.loadError', null, 'Could not load warehouse.'));
    } finally {
      setLoading(false);
    }
  }, [routeOrgId, siteId, t, zoneName]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const totals = data?.totals || {};
  const addresses = Array.isArray(data?.addresses) ? data.addresses : [];
  const siteName = data?.site?.name || '';

  return (
    <ScreenBackground>
      <OrgAppHeader
        mode="detail"
        title={zoneName || t('org.warehouse.zone', null, 'Zone')}
        onBack={onBack}
      />
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: scrollBottomPadding }]}>
        {loading ? (
          <ActivityIndicator style={{ marginTop: 40 }} color={COLORS.primary} />
        ) : (
          <>
            <AppCard style={styles.card}>
              <Text style={styles.title}>{zoneName}</Text>
              <Text style={styles.meta}>
                {siteName
                  ? t(
                      'org.warehouse.zoneInSite',
                      { site: siteName },
                      `Zone in ${siteName}`,
                    )
                  : ''}
              </Text>
              <Text style={styles.hint}>
                {t(
                  'org.warehouse.zoneDetailLead',
                  null,
                  'Warehouse addresses in this zone. Open an address to see machines and materials inside.',
                )}
              </Text>
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <View style={styles.totalsRow}>
                <View style={styles.totalChip}>
                  <Text style={styles.totalValue}>{totals.address_count ?? 0}</Text>
                  <Text style={styles.totalLabel}>
                    {t('org.warehouse.addressesTitle', null, 'Addresses')}
                  </Text>
                </View>
                <View style={styles.totalChip}>
                  <Text style={styles.totalValue}>{totals.article_total ?? 0}</Text>
                  <Text style={styles.totalLabel}>
                    {t('org.warehouse.articlesTotal', null, 'Articles')}
                  </Text>
                </View>
                <View style={styles.totalChip}>
                  <Text style={styles.totalValue}>{totals.tool_count ?? 0}</Text>
                  <Text style={styles.totalLabel}>
                    {t('org.warehouse.toolsShort', null, 'Tools')}
                  </Text>
                </View>
                <View style={styles.totalChip}>
                  <Text style={styles.totalValue}>{totals.material_line_count ?? 0}</Text>
                  <Text style={styles.totalLabel}>
                    {t('org.warehouse.materialsShort', null, 'Materials')}
                  </Text>
                </View>
              </View>
            </AppCard>

            <AppCard style={styles.card}>
              <Text style={styles.section}>
                {t('org.warehouse.addressesTitle', null, 'Warehouse addresses')}
                {` (${addresses.length})`}
              </Text>
              {!addresses.length ? (
                <Text style={styles.hint}>
                  {t('org.warehouse.addressesEmptyInZone', null, 'No addresses in this zone yet.')}
                </Text>
              ) : (
                <View style={styles.table}>
                  <View style={[styles.tableRow, styles.tableHead]}>
                    <Text style={[styles.th, styles.colName]}>
                      {t('org.warehouse.name', null, 'Name')}
                    </Text>
                    <Text style={[styles.th, styles.colNum]}>
                      {t('org.warehouse.articlesTotal', null, 'Articles')}
                    </Text>
                    <Text style={[styles.th, styles.colNum]}>
                      {t('org.warehouse.toolsShort', null, 'Tools')}
                    </Text>
                    <Text style={[styles.th, styles.colNum]}>
                      {t('org.warehouse.materialsShort', null, 'Materials')}
                    </Text>
                  </View>
                  {addresses.map((row) => (
                    <Pressable
                      key={row.id}
                      onPress={() =>
                        navigateToOrgWarehouseAddress(navigation, {
                          orgId,
                          locationId: row.id,
                          siteId,
                          zone: zoneName,
                        })
                      }
                      style={styles.tableRow}
                    >
                      <View style={styles.colName}>
                        <Text style={styles.td}>{row.name}</Text>
                        <Text style={styles.meta}>
                          {row.code}
                          {` · ${t('org.warehouse.tapToOpen', null, 'Tap to open')}`}
                        </Text>
                      </View>
                      <Text style={[styles.td, styles.colNum]}>{row.article_total ?? 0}</Text>
                      <Text style={[styles.td, styles.colNum]}>{row.tool_count ?? 0}</Text>
                      <Text style={[styles.td, styles.colNum]}>{row.material_line_count ?? 0}</Text>
                    </Pressable>
                  ))}
                </View>
              )}
              <Button mode="text" onPress={onBack} textColor={ON_CARD} style={{ marginTop: 8 }}>
                {t('org.warehouse.backToSite', null, 'Back to site')}
              </Button>
            </AppCard>
          </>
        )}
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 16, gap: 12 },
  card: { gap: 8, paddingVertical: 8 },
  title: { color: ON_CARD, fontSize: 20, fontWeight: '700' },
  section: { color: ON_CARD, fontSize: 15, fontWeight: '700' },
  meta: { color: ON_CARD_MUTED, fontSize: 12 },
  hint: { color: ON_CARD_MUTED, fontSize: 13, lineHeight: 18 },
  error: { color: '#B91C1C', fontSize: 13 },
  totalsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  totalChip: {
    minWidth: 72,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  totalValue: { color: ON_CARD, fontSize: 18, fontWeight: '700' },
  totalLabel: { color: ON_CARD_MUTED, fontSize: 11 },
  table: { marginTop: 4, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, overflow: 'hidden' },
  tableHead: { backgroundColor: '#F1F5F9' },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
  },
  th: { color: ON_CARD_MUTED, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  td: { color: ON_CARD, fontSize: 13 },
  colName: { flex: 1.4, minWidth: 80 },
  colNum: { width: 56, textAlign: 'center' },
});
