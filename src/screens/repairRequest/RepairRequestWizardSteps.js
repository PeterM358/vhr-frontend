/**
 * PATH: src/screens/repairRequest/RepairRequestWizardSteps.js
 *
 * Step UIs for Request Service. Shared form state lives on CreateRepairScreen
 * and is passed as wizard context (same pattern as LogServiceRecordScreen).
 */

import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { ActivityIndicator, Button, Text, TextInput } from 'react-native-paper';

import FloatingCard from '../../components/ui/FloatingCard';
import RepairRequestHeader from '../../components/repairRequest/RepairRequestHeader';
import RepairProblemInput from '../../components/repairRequest/RepairProblemInput';
import RepairPopularServices from '../../components/repairRequest/RepairPopularServices';
import RepairServicePicker from '../../components/repairRequest/RepairServicePicker';
import SelectedServicePill from '../../components/repairRequest/SelectedServicePill';
import RepairMediaSection from '../../components/repairRequest/RepairMediaSection';
import PreferredVisitPicker from '../../components/repairRequest/PreferredVisitPicker';
import { COLORS } from '../../constants/colors';
import { useTranslation } from '../../i18n';
import { useWizard } from '../../wizard';

function useForm() {
  return useWizard().context;
}

export function RepairRequestVehicleStep() {
  const { t } = useTranslation();
  const form = useForm();
  const {
    selectedVehicle,
    vehicles,
    vehicleId,
    setVehicleId,
    showVehiclePicker,
    setShowVehiclePicker,
    isEditMode,
    fleetOrganizationId,
    navigation,
    headerServiceCenter,
    preselectedShopId,
    handleChangeServiceCenter,
  } = form;

  return (
    <View style={styles.stepStack}>
      <FloatingCard>
        <Text variant="titleMedium" style={styles.sectionTitle}>
          {t('repairs.requestService')}
        </Text>
        <Text style={styles.subtitle}>
          {t(
            'requestService.subtitle',
            null,
            'Ask service centers for quotes or a booking — not a completed service record.',
          )}
        </Text>
        {selectedVehicle ? (
          <View style={styles.vehicleSummaryCard}>
            <Text style={styles.vehicleSummaryPlate}>
              {selectedVehicle.license_plate || '—'}
            </Text>
            <Text style={styles.vehicleSummaryName}>
              {fleetOrganizationId
                ? selectedVehicle.display_name || selectedVehicle.model_name || t('vehicles.vehicle')
                : [selectedVehicle.make_name, selectedVehicle.model_name].filter(Boolean).join(' ')
                  || t('vehicles.vehicle')}
            </Text>
            <Text style={styles.vehicleSummaryKm}>
              {selectedVehicle.kilometers != null && selectedVehicle.kilometers !== ''
                ? `${Number(selectedVehicle.kilometers).toLocaleString()} km`
                : t('requestService.kilometersCurrentOdometer')}
            </Text>
          </View>
        ) : null}
      </FloatingCard>

      <RepairRequestHeader
        serviceCenter={headerServiceCenter}
        selectedVehicle={selectedVehicle}
        onChangeVehicle={() => setShowVehiclePicker((prev) => !prev)}
        onChangeServiceCenter={preselectedShopId ? handleChangeServiceCenter : null}
        showVehiclePicker={showVehiclePicker}
        isEditMode={isEditMode}
      />

      {!isEditMode && (!selectedVehicle || showVehiclePicker) ? (
        <FloatingCard>
          <Text variant="labelLarge" style={styles.label}>
            {t('requestService.vehicleRequired')}
          </Text>
          {vehicles.length === 0 ? (
            <View style={{ gap: 10, marginTop: 8 }}>
              <Text style={styles.sectionHint}>
                {fleetOrganizationId
                  ? t(
                      'org.home.needVehicleBody',
                      null,
                      'Import your fleet register (or add vehicles), then request a repair the same way customers do.',
                    )
                  : t(
                      'requestService.noVehicles',
                      null,
                      'Add a vehicle to your garage first, then request a repair.',
                    )}
              </Text>
              {fleetOrganizationId ? (
                <Button
                  mode="contained"
                  onPress={() =>
                    navigation.navigate('FleetRegisterImport', {
                      organizationId: fleetOrganizationId,
                    })
                  }
                >
                  {t('fleetImport.openAction', null, 'Import fleet')}
                </Button>
              ) : (
                <Button mode="contained" onPress={() => navigation.navigate('CreateVehicle')}>
                  {t('vehicles.addVehicle', null, 'Add vehicle')}
                </Button>
              )}
            </View>
          ) : (
            <View style={styles.pickerContainer}>
              <Picker selectedValue={vehicleId} onValueChange={setVehicleId} style={styles.picker}>
                {vehicles.map((v) => (
                  <Picker.Item
                    key={v.id}
                    label={
                      fleetOrganizationId
                        ? `${v.license_plate || '—'} (${v.display_name || v.model_name || v.fleet_id || `#${v.id}`})`
                        : `${v.license_plate} (${v.make_name} ${v.model_name})`
                    }
                    value={v.id.toString()}
                  />
                ))}
              </Picker>
            </View>
          )}
        </FloatingCard>
      ) : null}
    </View>
  );
}

export function RepairRequestProblemStep() {
  const { t } = useTranslation();
  const form = useForm();

  return (
    <View style={styles.stepStack}>
      <FloatingCard>
        <RepairProblemInput
          value={form.symptoms}
          onChangeText={form.setSymptoms}
          repairTypes={form.repairTypes}
          selectedTypeId={form.repairTypeId}
          onSelectType={form.selectRepairType}
        />
      </FloatingCard>
      <FloatingCard>
        <RepairPopularServices
          repairTypes={form.repairTypes}
          selectedTypeId={form.repairTypeId}
          onSelectType={form.selectRepairType}
        />
        <SelectedServicePill repairType={form.selectedRepairType} onChange={form.clearRepairType} />
        <RepairServicePicker
          repairTypes={form.repairTypes}
          selectedTypeId={form.repairTypeId}
          onSelectType={form.selectRepairType}
          expanded={form.browseServicesExpanded}
          onToggleExpanded={() => form.setBrowseServicesExpanded((prev) => !prev)}
        />
        {form.inferredTypePreview && !form.selectedRepairType ? (
          <Text style={styles.inferredTypeNotice}>
            {form.inferredTypePreview.source === 'matched'
              ? t('requestService.inferredMatched', { name: form.inferredTypePreview.type.name })
              : t('requestService.inferredDefault', { name: form.inferredTypePreview.type.name })}
          </Text>
        ) : null}
      </FloatingCard>
    </View>
  );
}

export function RepairRequestPhotosStep() {
  const form = useForm();
  return (
    <FloatingCard>
      <RepairMediaSection
        selectedMedia={form.selectedMedia}
        onPickPhoto={form.handlePickPhoto}
        onPickVideo={form.handlePickVideo}
        onRemoveMedia={form.removeSelectedMedia}
        existingMedia={form.existingMedia}
        isEditMode={form.isEditMode}
      />
    </FloatingCard>
  );
}

export function RepairRequestWhenStep() {
  const { t } = useTranslation();
  const form = useForm();

  return (
    <FloatingCard>
      <PreferredVisitPicker
        visitDays={form.visitDays}
        visitDayOffset={form.visitDayOffset}
        onDayChange={form.setVisitDayOffset}
        visitTimeSlots={form.visitTimeSlots}
        visitTimeSlot={form.visitTimeSlot}
        onTimeChange={form.setVisitTimeSlot}
        selectedVisitDay={form.selectedVisitDay}
      />
      <TextInput
        mode="outlined"
        value={form.visitExtraNotes}
        onChangeText={form.setVisitExtraNotes}
        placeholder={t('requestService.extraTimingNotes')}
        style={styles.input}
        multiline
      />
      <Text variant="labelLarge" style={styles.label}>
        {t('requestService.kilometersOptional')}
      </Text>
      <TextInput
        mode="outlined"
        value={form.kilometers}
        onChangeText={form.setKilometers}
        placeholder={
          form.selectedVehicle?.kilometers != null && form.selectedVehicle.kilometers !== ''
            ? t('requestService.kilometersShownOnVehicle', {
                km: Number(form.selectedVehicle.kilometers).toLocaleString(),
              })
            : t('requestService.kilometersPlaceholder')
        }
        keyboardType="numeric"
        style={styles.input}
      />
      <Text style={styles.sectionHint}>{t('requestService.kilometersHint')}</Text>
    </FloatingCard>
  );
}

export function RepairRequestRoutingStep() {
  const { t } = useTranslation();
  const form = useForm();

  return (
    <FloatingCard>
      <Text variant="titleMedium" style={styles.sectionTitle}>
        {t('requestService.routingPreferences')}
      </Text>
      <Text style={styles.sectionHint}>{t('requestService.routingHint')}</Text>
      <Text variant="labelLarge" style={styles.label}>
        {t('requestService.whoReceives')}
      </Text>
      <View style={styles.targetingList}>
        {[
          { value: 'all_qualified', label: t('requestService.targetingAllQualified') },
          { value: 'selected_centers', label: t('requestService.targetingSelected') },
          { value: 'verified_only', label: t('requestService.targetingVerified') },
          { value: 'operator_assisted', label: t('requestService.targetingOperator') },
        ].map((opt) => {
          const selected = form.targetingMode === opt.value;
          return (
            <Pressable
              key={opt.value}
              onPress={() => form.setTargetingMode(opt.value)}
              style={[styles.targetingOption, selected && styles.targetingOptionSelected]}
            >
              <Text style={[styles.targetingOptionText, selected && styles.targetingOptionTextSelected]}>
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {form.targetingMode === 'selected_centers' ? (
        <View style={styles.centerBlock}>
          <Text style={styles.centerLabel}>{t('requestService.preferredCenters')}</Text>
          {form.loadingCenters ? (
            <ActivityIndicator size="small" />
          ) : form.serviceCenters.length ? (
            <View style={styles.centerChipsWrap}>
              {form.serviceCenters.map((c) => {
                const selected = form.selectedCenterIds.includes(Number(c.id));
                return (
                  <Pressable
                    key={c.id}
                    onPress={() => form.toggleServiceCenterSelection(c.id)}
                    style={[styles.centerChip, selected && styles.centerChipSelected]}
                  >
                    <Text style={[styles.centerChipText, selected && styles.centerChipTextSelected]}>
                      {c.name || t('requestService.serviceCenterFallback', { id: c.id })}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <Text style={styles.emptySmall}>{t('requestService.noMatchingCenters')}</Text>
          )}
        </View>
      ) : null}

      <Pressable
        onPress={() => form.setRequiresGuarantee((prev) => !prev)}
        style={[styles.guaranteeCard, form.requiresGuarantee && styles.guaranteeCardSelected]}
      >
        <Text style={[styles.guaranteeTitle, form.requiresGuarantee && styles.guaranteeTitleSelected]}>
          {t('requestService.guaranteeTitle')}
        </Text>
        <Text style={[styles.guaranteeHelper, form.requiresGuarantee && styles.guaranteeHelperSelected]}>
          {t('requestService.guaranteeHelper')}
        </Text>
        <View style={styles.guaranteeStateRow}>
          <Text style={[styles.guaranteeStateText, form.requiresGuarantee && styles.guaranteeStateTextSelected]}>
            {form.requiresGuarantee ? t('requestService.enabled') : t('requestService.disabled')}
          </Text>
          <Button
            mode={form.requiresGuarantee ? 'contained-tonal' : 'outlined'}
            compact
            onPress={() => form.setRequiresGuarantee((prev) => !prev)}
          >
            {form.requiresGuarantee ? t('requestService.turnOff') : t('requestService.turnOn')}
          </Button>
        </View>
      </Pressable>
      <Text variant="labelLarge" style={styles.label}>
        {t('requestService.preferredRadius')}
      </Text>
      <TextInput
        mode="outlined"
        value={form.preferredRadiusKm}
        onChangeText={form.setPreferredRadiusKm}
        keyboardType="numeric"
        placeholder={t('requestService.radiusPlaceholder')}
        style={styles.input}
      />
      {form.submitTypeNotice ? (
        <Text style={styles.submitTypeNotice}>{form.submitTypeNotice}</Text>
      ) : null}
    </FloatingCard>
  );
}

const styles = StyleSheet.create({
  stepStack: { gap: 8 },
  sectionTitle: {
    color: COLORS.TEXT_DARK,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    color: COLORS.TEXT_MUTED,
    fontSize: 14,
    marginBottom: 10,
    lineHeight: 20,
  },
  sectionHint: {
    color: COLORS.TEXT_MUTED,
    marginBottom: 10,
    fontSize: 13,
    lineHeight: 20,
  },
  label: {
    marginTop: 10,
    marginBottom: 4,
    fontWeight: '600',
  },
  input: { marginBottom: 8 },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    marginBottom: 10,
    backgroundColor: '#fff',
  },
  picker: { width: '100%' },
  vehicleSummaryCard: {
    marginTop: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  vehicleSummaryPlate: {
    color: COLORS.TEXT_DARK,
    fontWeight: '800',
    fontSize: 18,
  },
  vehicleSummaryName: {
    color: COLORS.TEXT_MUTED,
    marginTop: 2,
    fontSize: 14,
  },
  vehicleSummaryKm: {
    color: COLORS.TEXT_MUTED,
    marginTop: 2,
    fontSize: 13,
  },
  inferredTypeNotice: {
    marginTop: 10,
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    color: '#1e40af',
    fontSize: 13,
    lineHeight: 19,
  },
  submitTypeNotice: {
    marginTop: 8,
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    color: '#166534',
    fontSize: 13,
    lineHeight: 19,
  },
  targetingList: {
    marginTop: 6,
    gap: 8,
    marginBottom: 8,
  },
  targetingOption: {
    borderWidth: 1,
    borderColor: 'rgba(15,76,129,0.25)',
    backgroundColor: 'rgba(15,76,129,0.06)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  targetingOptionSelected: {
    borderColor: COLORS.PRIMARY,
    backgroundColor: COLORS.PRIMARY,
  },
  targetingOptionText: {
    color: '#1e3a8a',
    fontWeight: '600',
  },
  targetingOptionTextSelected: { color: '#fff' },
  centerBlock: { marginTop: 6 },
  centerLabel: {
    fontWeight: '600',
    color: COLORS.TEXT_DARK,
    marginBottom: 8,
  },
  centerChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  centerChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(15,76,129,0.25)',
    backgroundColor: 'rgba(15,76,129,0.07)',
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginBottom: 6,
  },
  centerChipSelected: {
    backgroundColor: COLORS.PRIMARY,
    borderColor: COLORS.PRIMARY,
  },
  centerChipText: {
    color: '#1e3a8a',
    fontSize: 12,
    fontWeight: '600',
  },
  centerChipTextSelected: { color: '#fff' },
  guaranteeCard: {
    marginTop: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(15,76,129,0.2)',
    borderRadius: 12,
    padding: 12,
    backgroundColor: 'rgba(15,76,129,0.06)',
  },
  guaranteeCardSelected: {
    borderColor: COLORS.PRIMARY,
    backgroundColor: 'rgba(15,76,129,0.14)',
  },
  guaranteeTitle: {
    color: COLORS.TEXT_DARK,
    fontWeight: '700',
    marginBottom: 4,
  },
  guaranteeTitleSelected: { color: '#1e3a8a' },
  guaranteeHelper: {
    color: COLORS.TEXT_MUTED,
    fontSize: 12,
    marginBottom: 8,
  },
  guaranteeHelperSelected: { color: '#1e40af' },
  guaranteeStateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  guaranteeStateText: {
    color: COLORS.TEXT_MUTED,
    fontWeight: '700',
    fontSize: 12,
  },
  guaranteeStateTextSelected: { color: '#1e3a8a' },
  emptySmall: {
    color: COLORS.TEXT_MUTED,
    marginTop: 6,
  },
});
