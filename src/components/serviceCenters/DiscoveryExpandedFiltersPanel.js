import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { DISCOVERY_QUICK_VEHICLE_CHIPS } from '../../api/serviceCenters';
import {
  RATING_FILTER_OPTIONS,
  DISTANCE_FILTER_OPTIONS,
} from '../../hooks/useServiceCenterDiscovery';
import { DiscoveryFilterChip } from './DiscoveryFilterChip';

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
  categoryOptions,
  repairTypeChipOptions,
  brands,
}) {
  return (
    <View style={styles.panel}>
      <FilterSection title="Vehicle Type">
        <DiscoveryFilterChip
          label="Any"
          selected={selectedVehicleType === null}
          onPress={() => setSelectedVehicleType(null)}
        />
        {DISCOVERY_QUICK_VEHICLE_CHIPS.map((vt) => (
          <DiscoveryFilterChip
            key={`all-${vt.code}`}
            label={vt.label}
            selected={selectedVehicleType === vt.code}
            onPress={() =>
              setSelectedVehicleType(selectedVehicleType === vt.code ? null : vt.code)
            }
          />
        ))}
      </FilterSection>

      <FilterSection title="Service Category">
        <DiscoveryFilterChip
          label="Any"
          selected={selectedCategory === null}
          onPress={() => setSelectedCategory(null)}
        />
        {categoryOptions.map((c) => (
          <DiscoveryFilterChip
            key={c.slug}
            label={c.name}
            selected={selectedCategory === c.slug}
            onPress={() =>
              setSelectedCategory(selectedCategory === c.slug ? null : c.slug)
            }
          />
        ))}
      </FilterSection>

      <FilterSection title="Service">
        <DiscoveryFilterChip
          label="Any"
          selected={!selectedRepairType}
          onPress={() => setSelectedRepairType('')}
        />
        {repairTypeChipOptions.map((rt) => (
          <DiscoveryFilterChip
            key={rt.id}
            label={rt.name}
            selected={selectedRepairType === rt.slug}
            onPress={() =>
              setSelectedRepairType(selectedRepairType === rt.slug ? '' : rt.slug)
            }
          />
        ))}
      </FilterSection>

      <FilterSection title="Brands">
        <DiscoveryFilterChip
          label="Any"
          selected={!selectedBrand}
          onPress={() => setSelectedBrand(null)}
        />
        {brands.slice(0, 40).map((brand) => (
          <DiscoveryFilterChip
            key={brand.id}
            label={brand.name}
            selected={selectedBrand === String(brand.id)}
            onPress={() =>
              setSelectedBrand(
                selectedBrand === String(brand.id) ? null : String(brand.id)
              )
            }
          />
        ))}
      </FilterSection>

      <FilterSection title="Rating">
        {RATING_FILTER_OPTIONS.map((opt) => (
          <DiscoveryFilterChip
            key={opt.label}
            label={opt.label}
            selected={minRating === opt.value}
            onPress={() => setMinRating(opt.value)}
          />
        ))}
      </FilterSection>

      <FilterSection title="Distance">
        {DISTANCE_FILTER_OPTIONS.map((opt) => (
          <DiscoveryFilterChip
            key={opt.label}
            label={opt.label}
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
    paddingTop: 4,
    paddingBottom: 8,
  },
  section: {
    marginBottom: 16,
  },
  sectionHeader: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  sectionRule: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#e2e8f0',
  },
  sectionChips: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
    gap: 0,
  },
});
