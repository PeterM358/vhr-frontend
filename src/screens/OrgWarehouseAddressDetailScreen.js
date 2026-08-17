import React, { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityIndicator, Button, Text } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';

import ScreenBackground from '../components/ScreenBackground';
import AppCard from '../components/ui/AppCard';
import OrgAppHeader from '../components/org/OrgAppHeader';
import { getWarehouseLocationContents } from '../api/orgWarehouse';
import { resolveActiveOrganizationId } from '../utils/orgWorkspace';
import {
  navigateToOrgToolAssetDetail,
  navigateToOrgWarehouseLocation,
  navigateToOrgWarehouseZone,
} from '../navigation/webNavigation';
import { useTranslation } from '../i18n';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { COLORS } from '../constants/colors';
import { useScrollContentBottomPadding } from '../utils/mobileWebInsets';

const ON_CARD = '#0F172A';
const ON_CARD_MUTED = '#475569';

function statusLabel(t, status) {
  const map = {
    in_stock: t('org.warehouse.tools.statusInStock', null, 'In stock'),
    issued: t('org.warehouse.tools.statusIssued', null, 'Issued'),
    scrapped: t('org.warehouse.tools.statusScrapped', null, 'Scrapped'),
    lost: t('org.warehouse.tools.statusLost', null, 'Lost'),
  };
  return map[status] || status;
}

export default function OrgWarehouseAddressDetailScreen({ navigation, route }) {
  const { t } = useTranslation();
  const routeOrgId = route?.params?.organizationId || route?.params?.orgId;
  const locationId = route?.params?.locationId;
  const siteId = route?.params?.siteId;
  const zoneName = route?.params?.zone || '';
  const scrollBottomPadding = useScrollContentBottomPadding(40);

  const [orgId, setOrgId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);

  const onBack = useCallback(() => {
    if (siteId && zoneName) {
      navigateToOrgWarehouseZone(navigation, {
        orgId: routeOrgId || orgId,
        locationId: siteId,
        zone: zoneName,
      });
      return;
    }
    if (siteId) {
      navigateToOrgWarehouseLocation(navigation, {
        orgId: routeOrgId || orgId,
        locationId: siteId,
      });
      return;
    }
    navigateToOrgWarehouseLocation(navigation, {
      orgId: routeOrgId || orgId,
      locationId: data?.location?.parent_id || locationId,
    });
  }, [data?.location?.parent_id, locationId, navigation, orgId, routeOrgId, siteId, zoneName]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      const resolved = await resolveActiveOrganizationId(routeOrgId);
      setOrgId(resolved);
      if (!resolved || !locationId) {
        setError(t('org.warehouse.locationNotFound', null, 'Location not found.'));
        return;
      }
      const payload = await getWarehouseLocationContents(token, resolved, locationId);
      setData(payload);
    } catch (e) {
      setError(e.message || t('org.warehouse.loadError', null, 'Could not load warehouse.'));
    } finally {
      setLoading(false);
    }
  }, [locationId, routeOrgId, t]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const loc = data?.location || {};
  const totals = data?.totals || {};
  const tools = Array.isArray(data?.tools) ? data.tools : [];
  const materials = Array.isArray(data?.materials) ? data.materials : [];
  const zone = loc.address || zoneName || '—';

  return (
    <ScreenBackground>
      <OrgAppHeader
        mode="detail"
        title={loc.name || t('org.warehouse.addressDetail', null, 'Warehouse address')}
        onBack={onBack}
      />
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: scrollBottomPadding }]}>
        {loading ? (
          <ActivityIndicator style={{ marginTop: 40 }} color={COLORS.primary} />
        ) : (
          <>
            <AppCard style={styles.card}>
              <Text style={styles.title}>{loc.name}</Text>
              <Text style={styles.meta}>
                {loc.code || ''}
                {zone ? ` · ${t('org.warehouse.zone', null, 'Zone')}: ${zone}` : ''}
                {loc.parent_name ? ` · ${loc.parent_name}` : ''}
              </Text>
              <Text style={styles.hint}>
                {t(
                  'org.warehouse.addressDetailLead',
                  null,
                  'Everything currently stored in this cupboard/rack: numbered tools and materials.',
                )}
              </Text>
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <View style={styles.totalsRow}>
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
                <View style={styles.totalChip}>
                  <Text style={styles.totalValue}>{totals.material_qty_total ?? '0'}</Text>
                  <Text style={styles.totalLabel}>
                    {t('org.warehouse.qtyTotal', null, 'Qty total')}
                  </Text>
                </View>
              </View>
            </AppCard>

            <AppCard style={styles.card}>
              <Text style={styles.section}>
                {t('org.warehouse.toolsInAddress', null, 'Machines / tools')}
                {` (${tools.length})`}
              </Text>
              {!tools.length ? (
                <Text style={styles.hint}>
                  {t(
                    'org.warehouse.toolsInAddressEmpty',
                    null,
                    'No numbered tools placed here yet. Open a tool and set Warehouse address.',
                  )}
                </Text>
              ) : (
                tools.map((tool) => (
                  <Pressable
                    key={tool.id}
                    onPress={() =>
                      navigateToOrgToolAssetDetail(navigation, {
                        orgId,
                        assetId: tool.id,
                      })
                    }
                    style={styles.itemRow}
                  >
                    <Text style={styles.itemTitle}>{tool.asset_tag}</Text>
                    <Text style={styles.meta}>
                      {tool.material?.name || ''}
                      {tool.status ? ` · ${statusLabel(t, tool.status)}` : ''}
                    </Text>
                  </Pressable>
                ))
              )}
            </AppCard>

            <AppCard style={styles.card}>
              <Text style={styles.section}>
                {t('org.warehouse.materialsInAddress', null, 'Materials')}
                {` (${materials.length})`}
              </Text>
              {!materials.length ? (
                <Text style={styles.hint}>
                  {t(
                    'org.warehouse.materialsInAddressEmpty',
                    null,
                    'No materials stocked at this address yet.',
                  )}
                </Text>
              ) : (
                materials.map((row) => (
                  <View key={row.stock_id || row.id} style={styles.itemRow}>
                    <Text style={styles.itemTitle}>{row.name || row.label}</Text>
                    <Text style={styles.meta}>
                      {row.part_number ? `${row.part_number} · ` : ''}
                      {t('org.warehouse.intake.onStock', null, 'On stock')}: {row.quantity_on_hand}
                      {row.unit_code ? ` ${row.unit_code}` : ''}
                    </Text>
                  </View>
                ))
              )}
              <Button mode="text" onPress={onBack} textColor={ON_CARD} style={{ marginTop: 8 }}>
                {t('common.back', null, 'Back')}
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
  totalValue: { color: ON_CARD, fontSize: 16, fontWeight: '700' },
  totalLabel: { color: ON_CARD_MUTED, fontSize: 11 },
  itemRow: {
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
  },
  itemTitle: { color: ON_CARD, fontWeight: '600', fontSize: 15 },
});
