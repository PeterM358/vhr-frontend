import React, { useMemo } from 'react';
import { Image, Platform, View } from 'react-native';
import { Button, Switch, Text, TextInput } from 'react-native-paper';
import { Picker } from '@react-native-picker/picker';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import { COLORS } from '../../constants/colors';
import {
  emptyLegalEntityDraft,
  legalEntityCountryIso,
  normalizeInvoiceEikNumber,
  normalizeInvoiceVatNumber,
  resolvedShopVatRatePercent,
  taxLabelsForShop,
} from '../../utils/invoiceTaxLabels';

export default function ShopInvoiceSettingsSection({
  styles,
  profile,
  setProfile,
  countries,
  cityLabel,
  legalEntity,
  setLegalEntity,
  legalEntityOptions,
  onFillBranchFromPublic,
  onUploadLogo,
  onRemoveLogo,
  uploadingLogo,
  /** When true, only legal-entity fields (no logo / branch address). */
  companyOnly = false,
}) {
  const entity = legalEntity || emptyLegalEntityDraft(profile);
  const companyCountryIso = useMemo(
    () => legalEntityCountryIso(countries, entity, profile),
    [countries, entity, profile]
  );
  const invoiceTaxLabels = useMemo(
    () => taxLabelsForShop(companyCountryIso),
    [companyCountryIso]
  );
  const resolvedInvoiceVatRate = useMemo(
    () => resolvedShopVatRatePercent(companyCountryIso, entity),
    [companyCountryIso, entity?.default_vat_rate_percent]
  );
  const countryRow = countries.find((c) => Number(c.id) === Number(entity.country || profile?.country));
  const vatRateHint = resolvedInvoiceVatRate != null
    ? `Automatically applied from ${countryRow?.name || companyCountryIso || 'company country'}.`
    : 'Set company country or center country to apply the standard rate.';

  const linkedHint =
    entity.linked_shop_count > 1
      ? `Shared with ${entity.linked_shop_count} centers: ${(entity.linked_shop_names || []).join(', ')}. Changes apply to all linked invoices.`
      : entity.id
        ? 'Company details are shared if you link another center to the same company.'
        : null;

  const pickerOptions = (legalEntityOptions || []).filter(
    (row) => row.id !== entity.id
  );

  return (
    <>
      <Text style={styles.helperText}>
        {companyOnly
          ? 'Legal entity details for invoices — separate from your public service center profile.'
          : 'Company (legal entity) details are shared across centers. Branch address and invoice series stay per center.'}
      </Text>

      {pickerOptions.length > 0 ? (
        <>
          <Text style={styles.label}>Use existing company</Text>
          <View style={styles.pickerWrap}>
            <Picker
              selectedValue={entity.id || ''}
              onValueChange={(value) => {
                if (!value) return;
                const picked = (legalEntityOptions || []).find((row) => Number(row.id) === Number(value));
                if (picked) setLegalEntity({ ...picked });
              }}
              style={styles.picker}
            >
              <Picker.Item label="Select company…" value="" />
              {(legalEntityOptions || []).map((row) => (
                <Picker.Item
                  key={row.id}
                  label={`${row.legal_name || 'Company'}${row.linked_shop_count > 1 ? ` (${row.linked_shop_count} centers)` : ''}`}
                  value={row.id}
                />
              ))}
            </Picker>
          </View>
        </>
      ) : null}

      {linkedHint ? <Text style={styles.helperMuted}>{linkedHint}</Text> : null}

      <Text style={styles.invoiceLogoTitle}>Company</Text>
      <TextInput
        label="Legal company name"
        mode="outlined"
        value={entity.legal_name || ''}
        onChangeText={(text) => setLegalEntity((prev) => ({ ...prev, legal_name: text }))}
        style={styles.input}
      />
      <View style={styles.switchRow}>
        <View style={styles.switchCopy}>
          <Text style={styles.switchLabel}>{invoiceTaxLabels.vatRegisteredLabel}</Text>
          <Text style={styles.helperMuted}>{invoiceTaxLabels.notVatRegisteredHint}</Text>
        </View>
        <Switch
          value={entity.vat_registered !== false}
          onValueChange={(value) => setLegalEntity((prev) => ({ ...prev, vat_registered: value }))}
        />
      </View>
      {entity.vat_registered !== false ? (
        <TextInput
          label={invoiceTaxLabels.vatNumberLabel}
          mode="outlined"
          value={entity.vat_number || ''}
          onChangeText={(text) =>
            setLegalEntity((prev) => ({ ...prev, vat_number: normalizeInvoiceVatNumber(text) }))
          }
          style={styles.input}
          autoCapitalize="characters"
        />
      ) : (
        <TextInput
          label={invoiceTaxLabels.eikNumberLabel}
          mode="outlined"
          value={entity.eik_number || ''}
          onChangeText={(text) =>
            setLegalEntity((prev) => ({ ...prev, eik_number: normalizeInvoiceEikNumber(text) }))
          }
          style={styles.input}
          keyboardType="number-pad"
        />
      )}

      <Text style={styles.label}>Company country</Text>
      <View style={styles.pickerWrap}>
        <Picker
          selectedValue={entity.country || null}
          onValueChange={(value) => setLegalEntity((prev) => ({ ...prev, country: value || null }))}
          style={styles.picker}
        >
          <Picker.Item label="Select country…" value={null} />
          {countries.map((c) => (
            <Picker.Item key={c.id} label={c.name} value={c.id} />
          ))}
        </Picker>
      </View>

      <View style={styles.vatRateReadonlyBox}>
        <Text style={styles.vatRateReadonlyLabel}>{invoiceTaxLabels.vatRateLabel}</Text>
        <Text style={styles.vatRateReadonlyValue}>
          {resolvedInvoiceVatRate != null ? `${resolvedInvoiceVatRate}%` : '—'}
        </Text>
        <Text style={styles.helperMuted}>{vatRateHint}</Text>
      </View>

      <View style={styles.switchRow}>
        <View style={styles.switchCopy}>
          <Text style={styles.switchLabel}>{invoiceTaxLabels.pricesIncludeLabel}</Text>
          <Text style={styles.helperMuted}>{invoiceTaxLabels.pricesIncludeHint}</Text>
        </View>
        <Switch
          value={entity.prices_include_vat !== false}
          onValueChange={(value) => setLegalEntity((prev) => ({ ...prev, prices_include_vat: value }))}
        />
      </View>

      {!companyOnly ? (
        <>
          <Text style={styles.invoiceLogoTitle}>Company logo</Text>
          <Text style={styles.helperMuted}>PNG, JPG, or SVG — shared on invoices for all linked centers.</Text>
          {entity.logo_url ? (
            <View style={styles.invoiceLogoPreviewWrap}>
              {Platform.OS === 'web' ? (
                <img
                  src={entity.logo_url}
                  alt="Company logo"
                  style={{ maxHeight: 64, maxWidth: 220, objectFit: 'contain' }}
                />
              ) : (
                <Image source={{ uri: entity.logo_url }} style={styles.invoiceLogoPreview} resizeMode="contain" />
              )}
            </View>
          ) : (
            <View style={styles.invoiceLogoPlaceholder}>
              <MaterialCommunityIcons name="file-image-outline" size={28} color={COLORS.TEXT_MUTED} />
              <Text style={styles.helperMuted}>No logo yet — initials used on invoices</Text>
            </View>
          )}
          <View style={styles.invoiceLogoActions}>
            <Button
              mode="contained-tonal"
              icon="upload"
              onPress={onUploadLogo}
              loading={uploadingLogo}
              disabled={uploadingLogo}
            >
              Upload logo
            </Button>
            {entity.logo_url ? (
              <Button mode="outlined" onPress={onRemoveLogo} disabled={uploadingLogo}>
                Remove
              </Button>
            ) : null}
          </View>

          <Text style={[styles.invoiceLogoTitle, { marginTop: 16 }]}>This center (branch)</Text>
          <Button mode="outlined" onPress={onFillBranchFromPublic} style={styles.invoiceCopyBtn}>
            Copy branch address from public profile
          </Button>
          <TextInput
            label="Branch name on invoice"
            mode="outlined"
            value={profile.invoice_branch_name || profile.name || ''}
            onChangeText={(text) => setProfile((prev) => ({ ...prev, invoice_branch_name: text }))}
            style={styles.input}
          />
          <TextInput
            label="Branch address"
            mode="outlined"
            value={profile.invoice_address_line1 || ''}
            onChangeText={(text) => setProfile((prev) => ({ ...prev, invoice_address_line1: text }))}
            style={styles.input}
          />
          <TextInput
            label="Branch city"
            mode="outlined"
            value={profile.invoice_city || ''}
            onChangeText={(text) => setProfile((prev) => ({ ...prev, invoice_city: text }))}
            style={styles.input}
          />
          <TextInput
            label="Postal code"
            mode="outlined"
            value={profile.invoice_postal_code || ''}
            onChangeText={(text) => setProfile((prev) => ({ ...prev, invoice_postal_code: text }))}
            style={styles.input}
          />
          <Text style={styles.helperMuted}>
            {profile.invoice_postal_code
              ? 'Branch address for this center — copied from map pin or public profile.'
              : `Use copy from public profile or map pin (${cityLabel || 'city'}).`}
          </Text>
        </>
      ) : null}
    </>
  );
}
