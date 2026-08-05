/**
 * PATH: src/screens/serviceRecord/ServiceRecordWizardSteps.js
 *
 * Step UIs for the Log Service Record wizard. Shared form state lives on
 * LogServiceRecordScreen and is passed as wizard context (same pattern as
 * CreateVehicleScreen + VehicleWizardSteps).
 */

import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Text, TextInput, Button } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import FloatingCard from '../../components/ui/FloatingCard';
import ServiceRecordDatePicker from '../../components/vehicle/ServiceRecordDatePicker';
import DocumentAttachmentList, {
  DocumentAttachmentActions,
} from '../../components/documents/DocumentAttachmentList';
import { COLORS } from '../../constants/colors';
import { OIL_INTERVAL_KM_OPTIONS } from '../../utils/oilServiceDefaults';
import { translateRepairTypeLabel } from '../../utils/translateShopTypeLabels';
import { useTranslation } from '../../i18n';
import { useWizard } from '../../wizard';

function useForm() {
  return useWizard().context;
}

export function ServiceRecordIntroStep() {
  const { t } = useTranslation();
  const form = useForm();
  const { vehicleSummary } = form;

  return (
    <FloatingCard>
      <Text variant="titleMedium" style={styles.sectionTitle}>
        {t('vehicles.nav.serviceRecord')}
      </Text>
      <Text style={styles.subtitle}>{t('logServiceRecord.subtitle')}</Text>
      {vehicleSummary ? (
        <View style={styles.vehicleSummaryCard}>
          <Text style={styles.vehicleSummaryPlate}>{vehicleSummary.plate}</Text>
          <Text style={styles.vehicleSummaryName}>{vehicleSummary.name}</Text>
          <Text style={styles.vehicleSummaryKm}>{vehicleSummary.km}</Text>
        </View>
      ) : (
        <Text style={styles.sectionHint}>{t('logServiceRecord.vehicleNotLoaded')}</Text>
      )}
    </FloatingCard>
  );
}

export function ServiceRecordTypeStep() {
  const { t } = useTranslation();
  const form = useForm();

  return (
    <View style={styles.stepStack}>
      <ServiceRecordIntroStep />
      <FloatingCard>
        <Text variant="titleMedium" style={styles.sectionTitle}>
          {t('logServiceRecord.sections.service')}
        </Text>
        <Text variant="labelLarge" style={styles.label}>
          {t('logServiceRecord.serviceTypeLabel')}
        </Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={form.repairTypeId}
            onValueChange={form.setRepairTypeId}
            style={styles.picker}
          >
            <Picker.Item label={t('logServiceRecord.selectType')} value="" />
            {form.filteredTypes.map((repairType) => (
              <Picker.Item
                key={repairType.id}
                label={
                  translateRepairTypeLabel(repairType, t) ||
                  repairType.name ||
                  `Type ${repairType.id}`
                }
                value={String(repairType.id)}
              />
            ))}
          </Picker>
        </View>
      </FloatingCard>
    </View>
  );
}

export function ServiceRecordWhenMileageStep() {
  const { t } = useTranslation();
  const form = useForm();
  const { variant, todayIso } = form;

  return (
    <FloatingCard>
      <Text variant="titleMedium" style={styles.sectionTitle}>
        {t('logServiceRecord.sections.serviceDateMileage')}
      </Text>
      <ServiceRecordDatePicker
        label={t('logServiceRecord.completedDate')}
        valueIso={form.completedAtIso}
        onChangeIso={form.setCompletedAtIso}
        optional={false}
        maxIso={todayIso}
        minIso="1950-01-01"
      />
      <Text style={styles.sectionHint}>{t('logServiceRecord.completedDateHint')}</Text>

      {(variant === 'oil' || variant === 'brake_service' || variant === 'generic') && (
        <>
          <Text variant="labelLarge" style={styles.label}>
            {variant === 'generic'
              ? t('logServiceRecord.kilometersAtService')
              : t('logServiceRecord.kilometersAtServiceRequired')}
          </Text>
          <TextInput
            mode="outlined"
            value={form.finalKilometers}
            onChangeText={form.setFinalKilometers}
            placeholder={t('logServiceRecord.kilometersPlaceholder')}
            keyboardType="numeric"
            style={styles.input}
          />
          <Text style={styles.kmHelper}>{t('logServiceRecord.kilometersHelper')}</Text>
        </>
      )}

      {variant === 'technical_inspection' ? (
        <>
          <ServiceRecordDatePicker
            label={t('logServiceRecord.validUntilInspection')}
            valueIso={form.technicalValidIso}
            onChangeIso={form.setTechnicalValidIso}
            optional={false}
          />
          <Text style={styles.sectionHint}>{t('logServiceRecord.inspectionReminderHint')}</Text>
        </>
      ) : null}

      {variant === 'oil' ? (
        <>
          <Text variant="labelLarge" style={styles.label}>
            {t('logServiceRecord.oilChangeInterval')}
          </Text>
          <View style={styles.oilIntervalRow}>
            {OIL_INTERVAL_KM_OPTIONS.map((opt) => {
              const on = form.oilIntervalKm === opt.km;
              return (
                <Pressable
                  key={opt.km}
                  onPress={() => {
                    form.setOilIntervalKm(opt.km);
                    form.setOilNextDueKmEdited(false);
                  }}
                  style={[styles.oilIntervalChip, on && styles.oilIntervalChipOn]}
                >
                  <Text style={[styles.oilIntervalChipText, on && styles.oilIntervalChipTextOn]}>
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Text variant="labelLarge" style={styles.label}>
            {t('logServiceRecord.nextDueKm')}
          </Text>
          <TextInput
            mode="outlined"
            value={form.nextDueKm}
            onChangeText={(text) => {
              form.setOilNextDueKmEdited(true);
              form.setNextDueKm(text);
            }}
            placeholder={t('logServiceRecord.nextDueKmPlaceholder')}
            keyboardType="numeric"
            style={styles.input}
          />
          <ServiceRecordDatePicker
            label={t('logServiceRecord.nextDueDate')}
            valueIso={form.nextOilDueIso}
            onChangeIso={(iso) => {
              form.setOilNextDueDateEdited(true);
              form.setNextOilDueIso(iso);
            }}
            optional
            minIso={form.completedAtIso || todayIso}
          />
          <Text style={styles.sectionHint}>
            {t('logServiceRecord.oilDefaultsHint', {
              interval: form.oilIntervalKm.toLocaleString(),
            })}
          </Text>
        </>
      ) : null}

      {variant === 'brake_service' ? (
        <>
          <Text variant="labelLarge" style={styles.label}>
            {t('logServiceRecord.brakeNextCheckKm')}
          </Text>
          <TextInput
            mode="outlined"
            value={form.brakeNextCheckKm}
            onChangeText={form.setBrakeNextCheckKm}
            placeholder={t('logServiceRecord.brakeNextCheckPlaceholder')}
            keyboardType="numeric"
            style={styles.input}
          />
        </>
      ) : null}
    </FloatingCard>
  );
}

export function ServiceRecordCostsStep() {
  const { t } = useTranslation();
  const form = useForm();
  const showLaborParts = form.variant !== 'technical_inspection';

  return (
    <FloatingCard>
      <Text variant="titleMedium" style={styles.sectionTitle}>
        {t('logServiceRecord.sections.costs')}
      </Text>
      {showLaborParts ? (
        <>
          <Text variant="labelLarge" style={styles.label}>
            {t('logServiceRecord.labor')}
          </Text>
          <TextInput
            mode="outlined"
            value={form.laborPrice}
            onChangeText={form.handleLaborChange}
            keyboardType="decimal-pad"
            style={styles.input}
          />
          <Text variant="labelLarge" style={styles.label}>
            {t('logServiceRecord.parts')}
          </Text>
          <TextInput
            mode="outlined"
            value={form.partsPrice}
            onChangeText={form.handlePartsChange}
            keyboardType="decimal-pad"
            style={styles.input}
          />
        </>
      ) : null}
      <Text variant="labelLarge" style={styles.label}>
        {showLaborParts ? t('logServiceRecord.total') : t('logServiceRecord.totalPaid')}
      </Text>
      <TextInput
        mode="outlined"
        value={form.totalPrice}
        onChangeText={form.handleTotalChange}
        keyboardType="decimal-pad"
        style={styles.input}
      />
      <Text style={styles.sectionHint}>{t('logServiceRecord.costsHint')}</Text>
    </FloatingCard>
  );
}

export function ServiceRecordProviderStep() {
  const { t } = useTranslation();
  const form = useForm();

  return (
    <FloatingCard>
      <Text variant="titleMedium" style={styles.sectionTitle}>
        {t('logServiceRecord.sections.serviceProvider')}
      </Text>
      <Text style={styles.sectionHint}>{t('logServiceRecord.providerHint')}</Text>

      {form.selectedProviderLabel ? (
        <View style={styles.manualSummaryCard}>
          <Text variant="titleSmall" style={styles.unlistedTitle}>
            {form.providerMode === 'self'
              ? t('logServiceRecord.selfPerformed')
              : t('logServiceRecord.serviceCenter')}
          </Text>
          <Text style={styles.manualSummaryName}>{form.selectedProviderLabel}</Text>
          {form.providerMode === 'manual'
            ? form.workshopSummary.lines.map((line) => (
                <Text key={line} style={styles.manualSummaryMeta}>
                  {line}
                </Text>
              ))
            : null}
          {form.providerMode === 'manual' && String(form.manualPhone || '').trim() ? (
            <Text style={styles.manualSummaryMeta}>{form.manualPhone}</Text>
          ) : null}
          {form.providerMode === 'manual' && String(form.manualEmail || '').trim() ? (
            <Text style={styles.manualSummaryMeta}>{form.manualEmail}</Text>
          ) : null}
          {form.providerMode === 'manual' ? (
            <Text style={styles.manualSummaryHint}>{t('logServiceRecord.manualCenterHint')}</Text>
          ) : null}
          <View style={styles.manualSummaryActions}>
            {form.providerMode === 'manual' ? (
              <Button mode="outlined" compact onPress={form.openEditManualCenter}>
                {t('logServiceRecord.edit')}
              </Button>
            ) : null}
            <Button mode="outlined" compact onPress={form.openServiceCenterHub}>
              {t('logServiceRecord.change')}
            </Button>
            <Button
              mode="text"
              compact
              onPress={() => {
                form.setProviderMode(null);
                form.setSelectedShopProfileId('');
                form.clearManualProviderFields();
              }}
            >
              {t('logServiceRecord.remove')}
            </Button>
          </View>
        </View>
      ) : (
        <Button
          mode="outlined"
          icon={() => (
            <MaterialCommunityIcons name="account-hard-hat" size={20} color={COLORS.PRIMARY} />
          )}
          onPress={form.openServiceCenterHub}
          style={styles.unlistedToggleBtn}
        >
          {t('logServiceRecord.whoPerformed')}
        </Button>
      )}
    </FloatingCard>
  );
}

export function ServiceRecordNotesStep() {
  const { t } = useTranslation();
  const form = useForm();

  return (
    <FloatingCard>
      <Text variant="titleMedium" style={styles.sectionTitle}>
        {t('logServiceRecord.sections.notesEvidence')}
      </Text>
      <Text variant="labelLarge" style={styles.label}>
        {t('logServiceRecord.notes')}
      </Text>
      <TextInput
        mode="outlined"
        value={form.notes}
        onChangeText={form.setNotes}
        placeholder={
          form.variant === 'technical_inspection'
            ? t('logServiceRecord.notesPlaceholderInspection')
            : t('logServiceRecord.notesPlaceholderDefault')
        }
        style={styles.input}
        multiline
      />
      <Text variant="labelLarge" style={[styles.label, styles.attachmentsLabel]}>
        {t('logServiceRecord.attachmentsOptional')}
      </Text>
      <Text style={styles.sectionHint}>{t('logServiceRecord.odometerPhotoHint')}</Text>
      <DocumentAttachmentActions
        onAddReceipt={form.handlePickReceipt}
        onAddOdometerPhoto={form.handlePickOdometerPhoto}
        onAddPhoto={form.handlePickPhoto}
        disabled={form.saving}
      />
      <DocumentAttachmentList
        attachments={form.pendingAttachments}
        onRemove={form.removeAttachment}
        emptyHint={t('logServiceRecord.attachmentsEmptyHint')}
      />
      <Text style={styles.sectionHint}>{t('logServiceRecord.attachmentsAfterSaveHint')}</Text>
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
  },
  kmHelper: {
    color: COLORS.TEXT_MUTED,
    fontSize: 13,
    marginBottom: 8,
    lineHeight: 18,
  },
  label: {
    marginTop: 10,
    marginBottom: 4,
    fontWeight: '600',
  },
  input: {
    marginBottom: 8,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    marginBottom: 10,
    backgroundColor: '#fff',
  },
  picker: {
    width: '100%',
  },
  vehicleSummaryCard: {
    marginTop: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  vehicleSummaryPlate: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.TEXT_DARK,
    letterSpacing: 0.4,
  },
  vehicleSummaryName: {
    marginTop: 2,
    color: COLORS.TEXT_MUTED,
    fontSize: 14,
  },
  vehicleSummaryKm: {
    marginTop: 4,
    color: COLORS.TEXT_DARK,
    fontWeight: '600',
    fontSize: 13,
  },
  oilIntervalRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  oilIntervalChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#fff',
  },
  oilIntervalChipOn: {
    borderColor: COLORS.PRIMARY,
    backgroundColor: 'rgba(37,99,235,0.1)',
  },
  oilIntervalChipText: {
    color: COLORS.TEXT_MUTED,
    fontWeight: '600',
    fontSize: 13,
  },
  oilIntervalChipTextOn: {
    color: COLORS.PRIMARY,
  },
  manualSummaryCard: {
    marginTop: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  unlistedTitle: {
    fontWeight: '700',
    color: COLORS.TEXT_DARK,
    marginBottom: 4,
  },
  manualSummaryName: {
    fontWeight: '700',
    color: COLORS.TEXT_DARK,
    fontSize: 15,
  },
  manualSummaryMeta: {
    color: COLORS.TEXT_MUTED,
    fontSize: 13,
    marginTop: 2,
  },
  manualSummaryHint: {
    color: COLORS.TEXT_MUTED,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 8,
  },
  manualSummaryActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    flexWrap: 'wrap',
  },
  unlistedToggleBtn: {
    marginTop: 4,
  },
  attachmentsLabel: {
    marginTop: 12,
  },
});
