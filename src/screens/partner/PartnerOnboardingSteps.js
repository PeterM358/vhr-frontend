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
import { useNavigation } from '@react-navigation/native';
import { Text, TextInput, ProgressBar, Button, Switch } from 'react-native-paper';

import FloatingCard from '../../components/ui/FloatingCard';
import SearchableChipSelector from '../../components/ui/SearchableChipSelector';
import { COLORS } from '../../constants/colors';
import { useTranslation } from '../../i18n';
import { useWizard } from '../../wizard';
import {
  WEEKDAYS_MON_FIRST,
  DAY_KEY,
  normalizeWorkingHoursObject,
} from '../../utils/shopWorkingHours';

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

/* ----------------------------- Step 4: working hours ---------------------- */

function hoursRowsFromValue(value) {
  const src = normalizeWorkingHoursObject(value);
  return WEEKDAYS_MON_FIRST.map((day) => {
    const row = src[DAY_KEY[day]] || src[day.toLowerCase()] || null;
    if (!row || typeof row !== 'object') {
      const weekend = day === 'Saturday' || day === 'Sunday';
      return { day, start: weekend ? '' : '09:00', end: weekend ? '' : '18:00', closed: weekend };
    }
    const start = row.start != null ? String(row.start) : '';
    const end = row.end != null ? String(row.end) : '';
    const closed = !!row.closed || (!start && !end);
    return { day, start, end, closed };
  });
}

function hoursValueFromRows(rows) {
  const out = {};
  rows.forEach((r) => {
    const key = DAY_KEY[r.day] || r.day.toLowerCase();
    const start = (r.start || '').trim();
    const end = (r.end || '').trim();
    out[key] = r.closed || (!start && !end) ? { closed: true } : { start, end };
  });
  return out;
}

export function hasAnyOpenDay(value) {
  const rows = hoursRowsFromValue(value);
  return rows.some((r) => !r.closed && r.start && r.end);
}

export function PartnerHoursStep() {
  const { t } = useTranslation();
  const { values, setValues } = useWizard();
  const rows = useMemo(() => hoursRowsFromValue(values.working_hours), [values.working_hours]);

  const commit = (nextRows) => setValues({ working_hours: hoursValueFromRows(nextRows) });

  const setWeekdayDefaults = () => {
    commit(
      rows.map((r) => {
        const weekend = r.day === 'Saturday' || r.day === 'Sunday';
        return weekend
          ? { ...r, closed: true, start: '', end: '' }
          : { ...r, closed: false, start: '09:00', end: '18:00' };
      })
    );
  };

  const updateRow = (idx, patch) =>
    commit(rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)));

  return (
    <View>
      <FloatingCard>
        <Text style={styles.cardTitle}>{t('partnerOnboarding.hoursTitle', null, 'Working hours')}</Text>
        <Text style={styles.hint}>
          {t('partnerOnboarding.hoursHint', null, 'Set the days and times you are open. Customers see these on your public page.')}
        </Text>
        <Button
          mode="outlined"
          compact
          onPress={setWeekdayDefaults}
          style={styles.hoursQuickBtn}
        >
          {t('partnerOnboarding.hoursWeekdayQuickFill', null, 'Weekdays 09:00–18:00 (Sat–Sun closed)')}
        </Button>
        {rows.map((row, idx) => (
          <View key={row.day} style={styles.hoursRow}>
            <Text style={styles.dayLabel}>
              {t(`partnerOnboarding.day.${row.day.toLowerCase()}`, null, row.day)}
            </Text>
            <View style={styles.hoursInputsWrap}>
              <TextInput
                mode="outlined"
                dense
                placeholder="09:00"
                value={row.start}
                onChangeText={(text) => updateRow(idx, { start: text, closed: false })}
                style={styles.hourInput}
              />
              <Text style={styles.hoursSeparator}>-</Text>
              <TextInput
                mode="outlined"
                dense
                placeholder="18:00"
                value={row.end}
                onChangeText={(text) => updateRow(idx, { end: text, closed: false })}
                style={styles.hourInput}
              />
              <Pressable
                onPress={() =>
                  updateRow(
                    idx,
                    row.closed
                      ? { closed: false, start: row.start || '09:00', end: row.end || '18:00' }
                      : { closed: true, start: '', end: '' }
                  )
                }
                style={[styles.closedToggle, row.closed && styles.closedToggleActive]}
              >
                <Text style={[styles.closedToggleText, row.closed && styles.closedToggleTextActive]}>
                  {row.closed
                    ? t('partnerOnboarding.closed', null, 'Closed')
                    : t('partnerOnboarding.open', null, 'Open')}
                </Text>
              </Pressable>
            </View>
          </View>
        ))}
      </FloatingCard>
    </View>
  );
}

/* ----------------------------- Step 5: legal ------------------------------ */

export function PartnerLegalStep() {
  const { t } = useTranslation();
  const { values, setValues } = useWizard();
  const vatRegistered = values.vat_registered !== false;

  return (
    <View>
      <FloatingCard>
        <Text style={styles.cardTitle}>{t('partnerOnboarding.legalTitle', null, 'Company & invoicing')}</Text>
        <Text style={styles.hint}>
          {t('partnerOnboarding.legalHint', null, 'Used on invoices. Kept separate from your public profile.')}
        </Text>
        <TextInput
          mode="outlined"
          label={t('partnerOnboarding.legalName', null, 'Registered company name')}
          value={values.legal_name || ''}
          onChangeText={(v) => setValues({ legal_name: v })}
          style={styles.input}
        />
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>{t('partnerOnboarding.vatRegistered', null, 'VAT registered')}</Text>
          <Switch value={vatRegistered} onValueChange={(v) => setValues({ vat_registered: v })} />
        </View>
        {vatRegistered ? (
          <TextInput
            mode="outlined"
            label={t('partnerOnboarding.vatNumber', null, 'VAT number')}
            value={values.vat_number || ''}
            onChangeText={(v) => setValues({ vat_number: v })}
            style={styles.input}
          />
        ) : (
          <TextInput
            mode="outlined"
            label={t('partnerOnboarding.eikNumber', null, 'Company ID (EIK)')}
            value={values.eik_number || ''}
            onChangeText={(v) => setValues({ eik_number: v })}
            style={styles.input}
          />
        )}
        <TextInput
          mode="outlined"
          label={t('partnerOnboarding.invoiceAddress', null, 'Invoice address')}
          value={values.invoice_address_line1 || ''}
          onChangeText={(v) => setValues({ invoice_address_line1: v })}
          style={styles.input}
        />
        <TextInput
          mode="outlined"
          label={t('partnerOnboarding.invoiceCity', null, 'Invoice city')}
          value={values.invoice_city || ''}
          onChangeText={(v) => setValues({ invoice_city: v })}
          style={styles.input}
        />
      </FloatingCard>
    </View>
  );
}

/* ----------------------------- Step 6: readiness -------------------------- */

const SECTION_LABEL_KEYS = {
  business: 'partnerOnboarding.section.business',
  location: 'partnerOnboarding.section.location',
  vehicles: 'partnerOnboarding.section.vehicles',
  services: 'partnerOnboarding.section.services',
  hours: 'partnerOnboarding.section.hours',
  media: 'partnerOnboarding.section.media',
  legal: 'partnerOnboarding.section.legal',
};

// Backend section -> in-wizard step id (or deep-link into ShopProfile section).
const SECTION_TO_STEP_ID = {
  business: 'business',
  vehicles: 'vehicles',
  services: 'services',
  hours: 'hours',
  legal: 'legal',
};
const SECTION_TO_PROFILE_EXPAND = {
  location: 'contact_location',
  media: 'photos',
  legal: 'company',
};

export function PartnerReadinessStep() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const { context, progress, progressPercent, goTo, findStepIndexById } = useWizard();
  const completion = context.getCompletion ? context.getCompletion() : null;
  const sections = completion?.sections || [];
  const readyToPublish = completion?.ready_to_publish;

  const handleSectionPress = (section) => {
    if (section.complete) return;
    const stepId = SECTION_TO_STEP_ID[section.key];
    if (stepId) {
      const idx = findStepIndexById(stepId);
      if (idx >= 0) {
        goTo(idx);
        return;
      }
    }
    const expand = SECTION_TO_PROFILE_EXPAND[section.key];
    if (expand) {
      navigation.navigate('ShopProfile', { requireSetup: true, expandSection: expand });
    }
  };

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
          {sections.map((section) => {
            const actionable = !section.complete;
            return (
              <Pressable
                key={section.key}
                onPress={() => handleSectionPress(section)}
                disabled={!actionable}
                style={styles.sectionRow}
              >
                <Text style={[styles.sectionDot, section.complete ? styles.dotDone : styles.dotTodo]}>
                  {section.complete ? '✓' : '•'}
                </Text>
                <Text style={styles.sectionLabel}>
                  {t(SECTION_LABEL_KEYS[section.key] || '', null, section.key)}
                </Text>
                <Text
                  style={[
                    styles.sectionStatus,
                    section.complete ? styles.statusDone : styles.statusTodo,
                  ]}
                >
                  {section.complete
                    ? t('partnerOnboarding.done', null, 'Done')
                    : t('partnerOnboarding.fix', null, 'Fix')}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
        <Text style={styles.hint}>
          {t(
            'partnerOnboarding.remainingHint',
            null,
            'Tap a to-do above. Location, photos and the full price list open in your shop profile.'
          )}
        </Text>
        <Button
          mode={readyToPublish ? 'contained' : 'outlined'}
          icon="store-cog-outline"
          onPress={() => navigation.navigate('ShopProfile', { requireSetup: !readyToPublish })}
          style={styles.readinessCta}
        >
          {readyToPublish
            ? t('partnerOnboarding.openProfile', null, 'Open shop profile')
            : t('partnerOnboarding.finishInProfile', null, 'Finish remaining in profile')}
        </Button>
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
  statusTodo: { color: COLORS.PRIMARY, fontWeight: '800' },
  readinessCta: {
    marginTop: 12,
    borderRadius: 12,
  },
  hoursQuickBtn: {
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  hoursRow: {
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(15,23,42,0.12)',
  },
  dayLabel: {
    color: COLORS.TEXT_DARK,
    fontWeight: '700',
    marginBottom: 8,
  },
  hoursInputsWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  hourInput: {
    width: 100,
    backgroundColor: '#fff',
  },
  hoursSeparator: {
    color: COLORS.TEXT_DARK,
    fontWeight: '700',
  },
  closedToggle: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(100,116,139,0.35)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(241,245,249,0.8)',
  },
  closedToggleActive: {
    backgroundColor: 'rgba(100,116,139,0.18)',
    borderColor: 'rgba(100,116,139,0.6)',
  },
  closedToggleText: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '700',
  },
  closedToggleTextActive: {
    color: '#475569',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginVertical: 8,
  },
  switchLabel: {
    color: COLORS.TEXT_DARK,
    fontWeight: '600',
    fontSize: 14,
  },
});
