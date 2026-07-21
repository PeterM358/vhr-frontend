// PATH: src/screens/vehicle/VehicleWizardSteps.js
//
// Step UIs for the vehicle-creation wizard. Each step reads shared state from
// the wizard context (the useVehicleCreateForm() return value). The steps are
// thin wrappers over the existing vehicle sub-components so behaviour matches
// the pre-wizard screen; only the layout is re-partitioned into steps.

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, TextInput, Switch } from 'react-native-paper';

import FloatingCard from '../../components/ui/FloatingCard';
import { COLORS } from '../../constants/colors';
import { useTranslation } from '../../i18n';
import { useWizard } from '../../wizard';

import VehicleCreateCatalogStep from '../../components/vehicle/VehicleCreateCatalogStep';
import VehicleManualModelStep from '../../components/vehicle/VehicleManualModelStep';
import VehicleSpecSuggestionCard from '../../components/vehicle/VehicleSpecSuggestionCard';
import MonthYearPicker from '../../components/vehicle/MonthYearPicker';
import VehicleRegistrationIdentityBlock from '../../components/vehicle/VehicleRegistrationIdentityBlock';
import VehicleCatalogEbikeTrailerSection from '../../components/vehicle/VehicleCatalogEbikeTrailerSection';
import VehicleCollapsibleFormSections from '../../components/vehicle/VehicleCollapsibleFormSections';

/* ------------------------------- Step 1: identity ------------------------- */

export function VehicleIdentityStep() {
  const { t } = useTranslation();
  const form = useWizard().context;

  return (
    <View>
      <FloatingCard>
        <Text style={styles.cardTitle}>{t('vehicleWizard.identityTitle', null, 'Your vehicle')}</Text>
        {!form.manualMode ? (
          <VehicleCreateCatalogStep
            hasVehicleTypePicker={form.hasVehicleTypePicker}
            vehicleTypes={form.vehicleTypes}
            selectedVehicleType={form.selectedVehicleType}
            onVehicleTypeChange={form.setSelectedVehicleType}
            catalogBrands={form.catalogBrands}
            catalogModels={form.catalogModels}
            legacyModels={form.legacyModels}
            catalogGenerations={form.catalogGenerations}
            catalogEngines={form.catalogEngines}
            catalogBrand={form.catalogBrand}
            onCatalogBrandChange={form.onCatalogBrandChange}
            selectedModelKey={form.selectedModelKey}
            onMergedModelChange={form.onMergedModelChange}
            selectedYear={form.selectedYear}
            onSelectedYearChange={form.setSelectedYear}
            catalogGeneration={form.catalogGeneration}
            onCatalogGenerationChange={form.onCatalogGenerationChange}
            catalogEngine={form.catalogEngine}
            onCatalogEngineChange={form.setCatalogEngine}
            fuelType={form.optionalStrings.fuel_type}
            onFuelTypeChange={(v) => {
              form.changeOptionalString('fuel_type', v);
            }}
            licensePlate={form.licensePlate}
            onLicensePlateChange={form.setLicensePlate}
            vin={form.vin}
            onVinChange={form.setVin}
            vinHint={form.vinHint}
            onOpenManual={form.openManualFromCatalog}
          />
        ) : (
          <VehicleManualModelStep
            brandLocked={form.manualBrandLocked}
            brandName={form.selectedCatalogBrandName}
            makes={form.makes}
            selectedMake={form.selectedMake}
            onMakeChange={form.onLegacyMakeChange}
            manualModelText={form.manualModelText}
            onManualModelTextChange={form.setManualModelText}
            legacyModels={form.legacyModels}
            selectedYear={form.selectedYear}
            onSelectedYearChange={form.setSelectedYear}
            fuelType={form.optionalStrings.fuel_type}
            onFuelTypeChange={(v) => {
              form.changeOptionalString('fuel_type', v);
            }}
            licensePlate={form.licensePlate}
            onLicensePlateChange={form.setLicensePlate}
            vin={form.vin}
            onVinChange={form.setVin}
            vinHint={form.vinHint}
            onBackToCatalog={() => form.setManualMode(false)}
          />
        )}
      </FloatingCard>

      {!form.manualMode ? (
        <VehicleSpecSuggestionCard
          loading={form.specLoading}
          found={form.specFound}
          spec={form.spec}
          applied={form.specApplied}
          onApply={form.applySuggestedSpecs}
        />
      ) : null}
    </View>
  );
}

/* ------------------------------- Step 2: details -------------------------- */

export function VehicleDetailsStep() {
  const { t } = useTranslation();
  const form = useWizard().context;

  return (
    <View>
      <FloatingCard>
        <Text style={styles.cardTitle}>{t('createVehicle.registrationMileage')}</Text>

        <MonthYearPicker
          valueIso={form.firstRegIso}
          onChangeIso={form.setFirstRegIso}
          label={t('createVehicle.firstRegistrationOptional')}
        />

        <VehicleRegistrationIdentityBlock
          firstRegistrationIso={form.firstRegIso}
          onChangeFirstRegistrationIso={form.setFirstRegIso}
          registrationCountryIso={form.regCountryIso}
          onChangeRegistrationCountryIso={form.setRegCountryIso}
          countriesState={form.countriesState}
          onRetryCountries={form.reloadCountries}
          hideTitle
          hideHint
          countryOnly
        />

        <Text style={styles.label}>{t('createVehicle.kilometers')}</Text>
        <TextInput
          mode="outlined"
          value={form.kilometers}
          onChangeText={form.setKilometers}
          placeholder="e.g. 95000"
          keyboardType="number-pad"
          style={styles.input}
        />
      </FloatingCard>

      {form.showEbikeCatalogSection || form.showTrailerCatalogSection ? (
        <VehicleCatalogEbikeTrailerSection
          expanded={form.expandedEbikeTrailer}
          onToggle={() => form.setExpandedEbikeTrailer(!form.expandedEbikeTrailer)}
          ebikeSystems={form.showEbikeCatalogSection ? form.catalogEbikeSystems : []}
          trailerTypes={form.showTrailerCatalogSection ? form.catalogTrailerTypes : []}
          selectedEbikeSystem={form.selectedCatalogEbike}
          onEbikeSystemChange={form.setSelectedCatalogEbike}
          selectedTrailerType={form.selectedCatalogTrailer}
          onTrailerTypeChange={form.setSelectedCatalogTrailer}
        />
      ) : null}

      <Text style={styles.optionalIntro}>Advanced details (optional)</Text>
      {form.showTrailerPoweredEquipmentToggle ? (
        <FloatingCard style={{ marginBottom: 10 }}>
          <Text style={styles.cardTitle}>Powered equipment</Text>
          <Text style={styles.hintMuted}>
            Use technical fields only if this trailer has a refrigeration unit, generator, hydraulic system, or other powered equipment.
          </Text>
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Powered equipment</Text>
            <Switch
              value={form.poweredEquipmentEnabled}
              onValueChange={form.setPoweredEquipmentEnabled}
            />
          </View>
        </FloatingCard>
      ) : null}

      <VehicleCollapsibleFormSections
        expanded={form.expandedOptional}
        onToggle={form.toggleOptional}
        strings={form.optionalStrings}
        onChangeString={form.changeOptionalString}
        bools={form.optionalBools}
        onChangeBool={form.changeOptionalBool}
        choicesMap={form.vehicleChoices}
        groups={form.relevantOptionalGroups}
      />
    </View>
  );
}

/* ------------------------------- Step 3: review --------------------------- */

function summarizeVehicle(form, t) {
  const brand =
    form.selectedCatalogBrandName ||
    (form.makes.find((m) => String(m.id) === String(form.selectedMake))?.name) ||
    '';
  let model = '';
  if (form.manualMode) {
    model = String(form.manualModelText || '').trim();
  } else if (form.catalogModel) {
    model = form.catalogModels.find((m) => String(m.id) === String(form.catalogModel))?.name || '';
  } else if (form.selectedModelLegacy) {
    model =
      form.legacyModels.find((m) => String(m.id) === String(form.selectedModelLegacy))?.name || '';
  }
  const vehicleLabel = [brand, model].filter(Boolean).join(' ').trim();
  return {
    vehicle: vehicleLabel || t('vehicleWizard.reviewNotSet', null, 'Not set'),
    year: form.selectedYear || t('vehicleWizard.reviewNotSet', null, 'Not set'),
    fuel: form.optionalStrings.fuel_type || t('vehicleWizard.reviewNotSet', null, 'Not set'),
    plate: String(form.licensePlate || '').trim() || t('vehicleWizard.reviewNotSet', null, 'Not set'),
    vin: String(form.vin || '').trim() || t('vehicleWizard.reviewNotSet', null, 'Not set'),
    mileage: String(form.kilometers || '').trim()
      ? `${form.kilometers} km`
      : t('vehicleWizard.reviewNotSet', null, 'Not set'),
  };
}

function ReviewRow({ label, value }) {
  return (
    <View style={styles.reviewRow}>
      <Text style={styles.reviewLabel}>{label}</Text>
      <Text style={styles.reviewValue}>{value}</Text>
    </View>
  );
}

export function VehicleReviewStep() {
  const { t } = useTranslation();
  const form = useWizard().context;
  const summary = summarizeVehicle(form, t);

  return (
    <View>
      <FloatingCard>
        <Text style={styles.cardTitle}>{t('vehicleWizard.reviewTitle', null, 'Review & create')}</Text>
        <Text style={styles.hintMuted}>
          {t('vehicleWizard.reviewLead', null, 'Check the details below, then create your vehicle.')}
        </Text>
        <ReviewRow label={t('vehicleWizard.reviewVehicle', null, 'Vehicle')} value={summary.vehicle} />
        <ReviewRow label={t('vehicleWizard.reviewYear', null, 'Year')} value={summary.year} />
        <ReviewRow label={t('vehicleWizard.reviewFuel', null, 'Fuel')} value={summary.fuel} />
        <ReviewRow label={t('vehicleWizard.reviewPlate', null, 'License plate')} value={summary.plate} />
        <ReviewRow label={t('vehicleWizard.reviewVin', null, 'VIN')} value={summary.vin} />
        <ReviewRow label={t('vehicleWizard.reviewMileage', null, 'Mileage')} value={summary.mileage} />
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
  label: {
    marginTop: 12,
    marginBottom: 4,
    fontWeight: '600',
    color: COLORS.TEXT_DARK,
  },
  input: {
    marginBottom: 4,
    backgroundColor: '#fff',
  },
  hintMuted: {
    fontSize: 13,
    color: COLORS.TEXT_MUTED,
    fontStyle: 'italic',
    marginBottom: 12,
  },
  optionalIntro: {
    marginTop: 8,
    marginBottom: 8,
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  toggleRow: {
    marginTop: 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleLabel: {
    color: COLORS.TEXT_DARK,
    fontWeight: '600',
    fontSize: 14,
  },
  reviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(15,23,42,0.08)',
  },
  reviewLabel: {
    fontSize: 14,
    color: COLORS.TEXT_MUTED,
    fontWeight: '600',
  },
  reviewValue: {
    fontSize: 14,
    color: COLORS.TEXT_DARK,
    fontWeight: '700',
    flexShrink: 1,
    textAlign: 'right',
    marginLeft: 12,
  },
});
