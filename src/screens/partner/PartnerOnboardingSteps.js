// PATH: src/screens/partner/PartnerOnboardingSteps.js
//
// Partner onboarding wizard steps. These reuse the shared shop-profile fields
// (name, business category, vehicle types, operations) and persist through the
// existing PATCH /api/profiles/shop-profiles/{id}/ endpoint via the wizard
// adapter — no duplicate profile API. State lives in the engine's shared
// `values`; taxonomy + completion come from the wizard `context`.
//
// Shipped in this pass: Business type, Vehicles, Services (smart taxonomy
// filtering), Readiness. Remaining partner steps (Legal identity, Working hours,
// Photos, Guided price list, Publish) are handled today in ShopProfileScreen and
// are surfaced from the Readiness step until migrated — see docs/wizard-engine.md.

import React, { useMemo } from 'react';
import { View, StyleSheet, Pressable, ScrollView } from 'react-native';
import { Text, TextInput, ProgressBar } from 'react-native-paper';

import FloatingCard from '../../components/ui/FloatingCard';
import SearchableChipSelector from '../../components/ui/SearchableChipSelector';
import { COLORS } from '../../constants/colors';
import { useTranslation } from '../../i18n';
import { useWizard } from '../../wizard';

function categoryLabel(cat) {
  return cat.localized_name || cat.name_en || cat.name || cat.key || `#${cat.id}`;
}

/* --------------------------- Step 1: business type ------------------------ */

export function PartnerBusinessTypeStep() {
  const { t } = useTranslation();
  const { values, setValues, context } = useWizard();
  const categories = context.businessCategories || [];

  const selectedPrimary = values.primary_business_category_id;
  const selectedKeys = useMemo(() => {
    const ids = new Set(
      [selectedPrimary, ...(values.secondary_business_category_ids || [])]
        .filter((v) => v != null)
        .map(Number)
    );
    return new Set(categories.filter((c) => ids.has(Number(c.id))).map((c) => c.key));
  }, [categories, selectedPrimary, values.secondary_business_category_ids]);

  const serviceItems = useMemo(() => {
    const services = context.businessServices || [];
    const hasCats = selectedKeys.size > 0;
    return services
      .filter((svc) => {
        if (!hasCats) return true;
        const compat = Array.isArray(svc.category_keys) ? svc.category_keys : [];
        if (!compat.length) return true;
        return compat.some((k) => selectedKeys.has(k));
      })
      .map((svc) => ({
        id: svc.id,
        label: svc.localized_name || svc.name_en || svc.name || svc.key,
      }));
  }, [context.businessServices, selectedKeys]);

  return (
    <View>
      <FloatingCard>
        <Text style={styles.cardTitle}>{t('partnerOnboarding.businessName', null, 'Business name')}</Text>
        <TextInput
          mode="outlined"
          value={values.name || ''}
          onChangeText={(v) => setValues({ name: v })}
          placeholder={t('partnerOnboarding.businessNamePlaceholder', null, 'e.g. Veversal Auto Service')}
          style={styles.input}
        />
      </FloatingCard>

      <FloatingCard>
        <Text style={styles.cardTitle}>{t('partnerOnboarding.businessType', null, 'Business type')}</Text>
        <Text style={styles.hint}>
          {t('partnerOnboarding.businessTypeHint', null, 'Choose your primary business type.')}
        </Text>
        <View style={styles.chipWrap}>
          {categories.map((cat) => {
            const active = Number(selectedPrimary) === Number(cat.id);
            return (
              <Pressable
                key={cat.id}
                onPress={() => setValues({ primary_business_category_id: cat.id })}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {categoryLabel(cat)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </FloatingCard>

      {selectedPrimary != null ? (
        <FloatingCard>
          <Text style={styles.cardTitle}>{t('partnerOnboarding.services', null, 'Services offered')}</Text>
          <Text style={styles.hint}>
            {t('partnerOnboarding.servicesHint', null, 'Filtered to your selected business type.')}
          </Text>
          <SearchableChipSelector
            items={serviceItems}
            selectedIds={values.business_service_ids || []}
            onChangeSelectedIds={(ids) => setValues({ business_service_ids: ids })}
            searchPlaceholder={t('partnerOnboarding.searchServices', null, 'Search services…')}
            emptyHint={t('partnerOnboarding.noServices', null, 'No services for this business type.')}
          />
        </FloatingCard>
      ) : null}
    </View>
  );
}

/* ----------------------------- Step 2: vehicles --------------------------- */

export function PartnerVehiclesStep() {
  const { t } = useTranslation();
  const { values, setValues, context } = useWizard();
  const items = (context.vehicleTypes || []).map((vt) => ({ id: vt.id, label: vt.name }));

  return (
    <View>
      <FloatingCard>
        <Text style={styles.cardTitle}>{t('partnerOnboarding.vehicleTypes', null, 'Vehicle types you service')}</Text>
        <Text style={styles.hint}>
          {t('partnerOnboarding.vehicleTypesHint', null, 'These drive which operations you can price.')}
        </Text>
        <SearchableChipSelector
          items={items}
          selectedIds={values.supported_vehicle_types || []}
          onChangeSelectedIds={(ids) => setValues({ supported_vehicle_types: ids })}
          searchPlaceholder={t('partnerOnboarding.searchVehicleTypes', null, 'Search vehicle types…')}
          emptyHint={t('partnerOnboarding.noVehicleTypes', null, 'No vehicle types found.')}
        />
      </FloatingCard>
    </View>
  );
}

/* ----------------------------- Step 3: services --------------------------- */

export function PartnerServicesStep() {
  const { t } = useTranslation();
  const { values, setValues, context } = useWizard();

  // Smart taxonomy filtering: only show RepairTypes compatible with the
  // vehicle types the shop selected (empty rt.vehicle_types = applies to all).
  const items = useMemo(() => {
    const selectedVt = new Set((values.supported_vehicle_types || []).map(Number));
    const repairTypes = context.repairTypes || [];
    return repairTypes
      .filter((rt) => {
        const vts = Array.isArray(rt.vehicle_types) ? rt.vehicle_types.map(Number) : [];
        if (!vts.length) return true;
        if (!selectedVt.size) return true;
        return vts.some((id) => selectedVt.has(id));
      })
      .map((rt) => ({ id: rt.id, label: rt.name || rt.slug || `#${rt.id}` }));
  }, [context.repairTypes, values.supported_vehicle_types]);

  return (
    <View>
      <FloatingCard>
        <Text style={styles.cardTitle}>{t('partnerOnboarding.operations', null, 'Operations you offer')}</Text>
        <Text style={styles.hint}>
          {t('partnerOnboarding.operationsHint', null, 'Filtered to the vehicle types you service. Add prices in the full price list.')}
        </Text>
        <SearchableChipSelector
          items={items}
          selectedIds={values.available_repairs || []}
          onChangeSelectedIds={(ids) => setValues({ available_repairs: ids })}
          searchPlaceholder={t('partnerOnboarding.searchOperations', null, 'Search operations…')}
          emptyHint={t('partnerOnboarding.noOperations', null, 'Select vehicle types first to see operations.')}
        />
      </FloatingCard>
    </View>
  );
}

/* ----------------------------- Step 4: readiness -------------------------- */

const SECTION_LABEL_KEYS = {
  business: 'partnerOnboarding.section.business',
  location: 'partnerOnboarding.section.location',
  vehicles: 'partnerOnboarding.section.vehicles',
  services: 'partnerOnboarding.section.services',
  hours: 'partnerOnboarding.section.hours',
  media: 'partnerOnboarding.section.media',
  legal: 'partnerOnboarding.section.legal',
};

export function PartnerReadinessStep() {
  const { t } = useTranslation();
  const { context, progress, progressPercent } = useWizard();
  const completion = context.getCompletion ? context.getCompletion() : null;
  const sections = completion?.sections || [];
  const readyToPublish = completion?.ready_to_publish;

  return (
    <View>
      <FloatingCard>
        <Text style={styles.cardTitle}>{t('partnerOnboarding.readinessTitle', null, 'Profile readiness')}</Text>
        <View style={styles.readinessHeader}>
          <Text style={styles.percentBig}>{completion?.percent ?? progressPercent}%</Text>
          <Text style={styles.readinessLead}>
            {readyToPublish
              ? t('partnerOnboarding.readyToPublish', null, 'Your profile is ready to publish.')
              : t('partnerOnboarding.notReady', null, 'A few things are left before you can publish.')}
          </Text>
        </View>
        <ProgressBar
          progress={completion ? completion.score : progress}
          color={COLORS.PRIMARY}
          style={styles.progressBar}
        />
      </FloatingCard>

      <FloatingCard>
        <Text style={styles.cardTitle}>{t('partnerOnboarding.checklist', null, 'Setup checklist')}</Text>
        <ScrollView>
          {sections.map((section) => (
            <View key={section.key} style={styles.sectionRow}>
              <Text style={[styles.sectionDot, section.complete ? styles.dotDone : styles.dotTodo]}>
                {section.complete ? '✓' : '•'}
              </Text>
              <Text style={styles.sectionLabel}>
                {t(SECTION_LABEL_KEYS[section.key] || '', null, section.key)}
              </Text>
              <Text style={[styles.sectionStatus, section.complete ? styles.statusDone : styles.statusTodo]}>
                {section.complete
                  ? t('partnerOnboarding.done', null, 'Done')
                  : t('partnerOnboarding.todo', null, 'To do')}
              </Text>
            </View>
          ))}
        </ScrollView>
        <Text style={styles.hint}>
          {t(
            'partnerOnboarding.remainingHint',
            null,
            'Legal details, working hours, photos and the full price list can be completed in your shop profile.'
          )}
        </Text>
      </FloatingCard>
    </View>
  );
}

const styles = StyleSheet.create({
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.TEXT_DARK,
    marginBottom: 6,
  },
  hint: {
    fontSize: 13,
    color: COLORS.TEXT_MUTED,
    marginBottom: 10,
  },
  input: {
    marginBottom: 4,
    backgroundColor: '#fff',
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.16)',
    backgroundColor: '#fff',
    marginRight: 8,
    marginBottom: 8,
  },
  chipActive: {
    backgroundColor: COLORS.PRIMARY,
    borderColor: COLORS.PRIMARY,
  },
  chipText: {
    color: COLORS.TEXT_DARK,
    fontWeight: '600',
    fontSize: 13,
  },
  chipTextActive: {
    color: '#fff',
  },
  readinessHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  percentBig: {
    fontSize: 34,
    fontWeight: '800',
    color: COLORS.PRIMARY,
    marginRight: 12,
  },
  readinessLead: {
    flex: 1,
    fontSize: 14,
    color: COLORS.TEXT_DARK,
    fontWeight: '600',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(15,23,42,0.08)',
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(15,23,42,0.08)',
  },
  sectionDot: {
    width: 22,
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  dotDone: { color: '#16A34A' },
  dotTodo: { color: COLORS.TEXT_MUTED },
  sectionLabel: {
    flex: 1,
    fontSize: 14,
    color: COLORS.TEXT_DARK,
    fontWeight: '600',
    marginLeft: 6,
  },
  sectionStatus: {
    fontSize: 12,
    fontWeight: '700',
  },
  statusDone: { color: '#16A34A' },
  statusTodo: { color: COLORS.TEXT_MUTED },
});
