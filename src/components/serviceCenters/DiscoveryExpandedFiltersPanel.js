import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { DISCOVERY_QUICK_VEHICLE_CHIPS } from '../../api/serviceCenters';
import {
  RATING_FILTER_OPTIONS,
  DISTANCE_FILTER_OPTIONS,
} from '../../hooks/useServiceCenterDiscovery';
import { DiscoveryFilterChip } from './DiscoveryFilterChip';
import { useTranslation } from '../../i18n';
import { chipIconGlyph } from '../../utils/discoveryFilterTaxonomy';

const RATING_FILTER_KEYS = {
  null: 'any',
  3: '3plus',
  4: '4plus',
  4.5: '4_5plus',
};

const DISTANCE_FILTER_KEYS = {
  null: 'any',
  10: '10km',
  25: '25km',
  50: '50km',
  100: '100km',
};

function FilterSection({ title, children }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <View style={styles.sectionRule} />
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.sectionChips}
      >
        {children}
      </ScrollView>
    </View>
  );
}

export default function DiscoveryExpandedFiltersPanel({
  selectedVehicleType,
  setSelectedVehicleType,
  selectedCategory,
  setSelectedCategory,
  selectedRepairType,
  setSelectedRepairType,
  selectedBrand,
  setSelectedBrand,
  minRating,
  setMinRating,
  radiusKm,
  setRadiusKm,
  openNowOnly,
  setOpenNowOnly,
  verifiedOnly,
  setVerifiedOnly,
  categoryOptions,
  repairTypeChipOptions,
  brands,
}) {
  const { t } = useTranslation();

  return (
    <View style={styles.panel}>
      {typeof setOpenNowOnly === 'function' || typeof setVerifiedOnly === 'function' ? (
        <FilterSection title={t('serviceCenters.filters')}>
          {typeof setOpenNowOnly === 'function' ? (
            <DiscoveryFilterChip
              label={t('serviceCenters.openNow')}
              selected={openNowOnly}
              onPress={() => setOpenNowOnly((v) => !v)}
            />
          ) : null}
          {typeof setVerifiedOnly === 'function' ? (
            <DiscoveryFilterChip
              label={t('serviceCenters.verified')}
              selected={verifiedOnly}
              onPress={() => setVerifiedOnly((v) => !v)}
            />
          ) : null}
        </FilterSection>
      ) : null}

      <FilterSection title={t('serviceCenters.vehicleType')}>
        <DiscoveryFilterChip
          label={t('serviceCenters.any')}
          selected={!selectedVehicleType}
          onPress={() => setSelectedVehicleType(null)}
        />
        {DISCOVERY_QUICK_VEHICLE_CHIPS.map((vt) => (
          <DiscoveryFilterChip
            key={vt.code}
            label={t(`vehicleTypes.${vt.code}`, null, vt.label)}
            selected={selectedVehicleType === vt.code}
            onPress={() => setSelectedVehicleType(selectedVehicleType === vt.code ? null : vt.code)}
          />
        ))}
      </FilterSection>

      {categoryOptions?.length ? (
        <FilterSection title={t('serviceCenters.serviceCategory')}>
          <DiscoveryFilterChip
            label={t('serviceCenters.any')}
            selected={!selectedCategory}
            onPress={() => setSelectedCategory(null)}
          />
          {categoryOptions.map((cat) => (
            <DiscoveryFilterChip
              key={cat.slug}
              label={cat.display_name || cat.label || cat.name}
              icon={chipIconGlyph(cat)}
              selected={selectedCategory === cat.slug}
              onPress={() => setSelectedCategory(selectedCategory === cat.slug ? null : cat.slug)}
            />
          ))}
        </FilterSection>
      ) : null}

      {repairTypeChipOptions?.length ? (
        <FilterSection title={t('serviceCenters.repairType')}>
          <DiscoveryFilterChip
            label={t('serviceCenters.any')}
            selected={!selectedRepairType}
            onPress={() => setSelectedRepairType('')}
          />
          {repairTypeChipOptions.map((rt) => (
            <DiscoveryFilterChip
              key={rt.slug || rt.id}
              label={rt.display_name || rt.label || rt.name}
              icon={chipIconGlyph(rt)}
              selected={selectedRepairType === rt.slug}
              onPress={() => setSelectedRepairType(selectedRepairType === rt.slug ? '' : rt.slug)}
            />
          ))}
        </FilterSection>
      ) : null}

      {brands?.length ? (
        <FilterSection title={t('serviceCenters.brand')}>
          <DiscoveryFilterChip
            label={t('serviceCenters.any')}
            selected={!selectedBrand}
            onPress={() => setSelectedBrand(null)}
          />
          {brands.map((brand) => (
            <DiscoveryFilterChip
              key={brand.id || brand.name}
              label={brand.name}
              selected={selectedBrand === brand.id}
              onPress={() => setSelectedBrand(selectedBrand === brand.id ? null : brand.id)}
            />
          ))}
        </FilterSection>
      ) : null}

      <FilterSection title={t('serviceCenters.rating')}>
        {RATING_FILTER_OPTIONS.map((opt) => (
          <DiscoveryFilterChip
            key={String(opt.value)}
            label={t(`serviceCenters.ratingFilter.${RATING_FILTER_KEYS[opt.value]}`)}
            selected={minRating === opt.value}
            onPress={() => setMinRating(opt.value)}
          />
        ))}
      </FilterSection>

      <FilterSection title={t('serviceCenters.distance')}>
        {DISTANCE_FILTER_OPTIONS.map((opt) => (
          <DiscoveryFilterChip
            key={String(opt.value)}
            label={t(`serviceCenters.distanceFilter.${DISTANCE_FILTER_KEYS[opt.value]}`)}
            selected={radiusKm === opt.value}
            onPress={() => setRadiusKm(opt.value)}
          />
        ))}
      </FilterSection>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    paddingBottom: 8,
  },
  section: {
    marginBottom: 14,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  sectionRule: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(15,23,42,0.12)',
  },
  sectionChips: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingRight: 8,
  },
});
