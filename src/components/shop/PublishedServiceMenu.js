import React, { useMemo, useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Text } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import { COLORS } from '../../constants/colors';
import { useTranslation } from '../../i18n';
import { getOperationIcon } from '../../icons/operationIconRegistry';
import { describeServicePricing } from '../../utils/servicePricingSummary';
import {
  translateRepairTypeLabel,
  translateVehicleTypePublicLabel,
} from '../../utils/translateShopTypeLabels';

const FILTER_ALL = 'all';

function normalizeVehicleCode(item) {
  const raw =
    item?.vehicle_type_code ||
    item?.vehicle_type?.code ||
    item?.vehicleTypeCode ||
    '';
  return String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/_/g, '-');
}

function vehicleTypeId(item) {
  const id = item?.vehicle_type_id ?? item?.vehicle_type ?? item?.vehicle_type?.id;
  if (id == null || id === '') return null;
  const n = Number(id);
  return Number.isFinite(n) ? n : null;
}

function isDefaultVehicleScope(item) {
  return vehicleTypeId(item) == null && !normalizeVehicleCode(item);
}

/**
 * Public / preview published price list with repair icons, vehicle badges,
 * and All | Cars | Trucks filter chips (from menu vehicle_type).
 */
export default function PublishedServiceMenu({ items = [], dark = false }) {
  const { t } = useTranslation();
  const [filter, setFilter] = useState(FILTER_ALL);

  const menuItems = Array.isArray(items) ? items : [];

  const availableFilters = useMemo(() => {
    const codes = new Set();
    menuItems.forEach((item) => {
      const code = normalizeVehicleCode(item);
      if (code) codes.add(code);
    });
    const chips = [{ key: FILTER_ALL, label: t('serviceCenters.profile.priceFilterAll', null, 'All') }];
    if (codes.has('car')) {
      chips.push({
        key: 'car',
        label: t('serviceCenters.profile.priceFilterCars', null, 'Cars'),
      });
    }
    if (codes.has('truck')) {
      chips.push({
        key: 'truck',
        label: t('serviceCenters.profile.priceFilterTrucks', null, 'Trucks'),
      });
    }
    // Other typed rows (moto, van, …) get their own chip when present.
    codes.forEach((code) => {
      if (code === 'car' || code === 'truck') return;
      chips.push({
        key: code,
        label: translateVehicleTypePublicLabel({ vehicle_type_code: code }, t) || code,
      });
    });
    return chips;
  }, [menuItems, t]);

  const activeFilter = availableFilters.some((c) => c.key === filter) ? filter : FILTER_ALL;

  const filteredItems = useMemo(() => {
    if (activeFilter === FILTER_ALL) return menuItems;
    return menuItems.filter((item) => {
      if (isDefaultVehicleScope(item)) return true;
      return normalizeVehicleCode(item) === activeFilter;
    });
  }, [menuItems, activeFilter]);

  const vehicleBadgeLabel = (item) => {
    if (isDefaultVehicleScope(item)) {
      return t('serviceCenters.profile.priceVehicleAll', null, 'All vehicles');
    }
    return (
      translateVehicleTypePublicLabel(
        {
          vehicle_type_code: item.vehicle_type_code || item.vehicle_type?.code,
          vehicle_type_name: item.vehicle_type_name || item.vehicle_type?.name,
          name: item.vehicle_type_name || item.vehicle_type?.name,
        },
        t
      ) || t('serviceCenters.profile.priceVehicleAll', null, 'All vehicles')
    );
  };

  const hasPartsNote = menuItems.some(
    (item) => item?.parts_from != null || item?.parts_to != null
  );

  const textMuted = dark ? 'rgba(255,255,255,0.7)' : COLORS.TEXT_MUTED;
  const textMain = dark ? '#fff' : COLORS.TEXT_DARK;
  const chipBorder = dark ? 'rgba(255,255,255,0.28)' : 'rgba(15,23,42,0.16)';
  const chipActiveBg = dark ? 'rgba(37,99,235,0.35)' : 'rgba(37,99,235,0.12)';
  const badgeBg = dark ? 'rgba(255,255,255,0.12)' : 'rgba(15,23,42,0.06)';
  const iconBg = dark ? 'rgba(96,165,250,0.18)' : 'rgba(37,99,235,0.1)';
  const rowBorder = dark ? 'rgba(255,255,255,0.12)' : 'rgba(15,23,42,0.12)';

  return (
    <View style={styles.wrap}>
      <Text style={[styles.disclaimer, { color: textMuted }]}>
        {hasPartsNote
          ? t('serviceCenters.profile.partsIncludedNote')
          : t('serviceCenters.profile.partsQuotedSeparately')}
      </Text>

      {availableFilters.length > 1 ? (
        <View style={styles.filterRow}>
          {availableFilters.map((chip) => {
            const active = chip.key === activeFilter;
            return (
              <Pressable
                key={chip.key}
                onPress={() => setFilter(chip.key)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                style={[
                  styles.filterChip,
                  { borderColor: chipBorder },
                  active && { backgroundColor: chipActiveBg, borderColor: COLORS.PRIMARY },
                ]}
              >
                <Text
                  style={[
                    styles.filterChipLabel,
                    { color: active ? (dark ? '#fff' : COLORS.PRIMARY) : textMain },
                  ]}
                >
                  {chip.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {filteredItems.length === 0 ? (
        <Text style={[styles.disclaimer, { color: textMuted }]}>
          {t('serviceCenters.profile.priceFilterEmpty', null, 'No published prices for this filter.')}
        </Text>
      ) : (
        filteredItems.map((item, index) => {
          const label = translateRepairTypeLabel(item, t) || t('common.service');
          const { parts, labor, total, time, hasParts } = describeServicePricing(item, t);
          const priceLine =
            (hasParts && total) || labor || t('serviceCenters.profile.priceOnRequest');
          const breakdown = hasParts ? [parts, labor].filter(Boolean).join(' · ') : null;
          const rowKey = [
            item.repair_type_id || item.id || label,
            vehicleTypeId(item) ?? 'default',
            index,
          ].join('-');

          return (
            <View key={rowKey} style={[styles.menuRow, { borderBottomColor: rowBorder }]}>
              <View style={[styles.menuIconCircle, { backgroundColor: iconBg }]}>
                <MaterialCommunityIcons
                  name={getOperationIcon(item)}
                  size={20}
                  color={COLORS.PRIMARY}
                />
              </View>
              <View style={styles.menuTextCol}>
                <View style={styles.titleRow}>
                  <Text style={[styles.menuServiceName, { color: textMain }]} numberOfLines={2}>
                    {label}
                  </Text>
                  <View style={[styles.vehicleBadge, { backgroundColor: badgeBg }]}>
                    <Text style={[styles.vehicleBadgeText, { color: textMuted }]} numberOfLines={1}>
                      {vehicleBadgeLabel(item)}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.menuPriceLine, { color: textMain }]}>{priceLine}</Text>
                {breakdown ? (
                  <Text style={[styles.menuDisclaimer, { color: textMuted }]}>{breakdown}</Text>
                ) : null}
                {time ? (
                  <Text style={[styles.menuDisclaimer, { color: textMuted }]}>{time}</Text>
                ) : null}
                {item.disclaimer ? (
                  <Text style={[styles.menuDisclaimer, { color: textMuted }]}>
                    {item.disclaimer}
                  </Text>
                ) : null}
              </View>
            </View>
          );
        })
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 4,
  },
  disclaimer: {
    marginBottom: 8,
    fontSize: 12,
    lineHeight: 16,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  filterChipLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  menuIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuTextCol: {
    flex: 1,
    minWidth: 0,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  menuServiceName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
  },
  vehicleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    maxWidth: 120,
  },
  vehicleBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  menuPriceLine: {
    marginTop: 4,
    fontSize: 14,
  },
  menuDisclaimer: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 16,
  },
});
