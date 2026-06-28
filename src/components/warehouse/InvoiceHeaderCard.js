import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, TextInput, Chip } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import FloatingCard from '../ui/FloatingCard';
import SupplierPicker from './SupplierPicker';
import ServiceRecordDatePicker from '../vehicle/ServiceRecordDatePicker';
import { TEXT_DARK, TEXT_MUTED } from '../../constants/colors';
import { HEADER_ISSUE_LABELS } from '../../api/warehouse';
import { localDateToIso } from '../vehicle/dateFieldUtils';

const AUTOSAVE_MS = 700;

export default function InvoiceHeaderCard({ batch, onChange, onDraft, showValidation = true }) {
  const [supplierId, setSupplierId] = useState(batch?.shop_supplier?.id || null);
  const [supplierName, setSupplierName] = useState(
    batch?.shop_supplier?.display_name || batch?.supplier_name || ''
  );
  const [invoiceNumber, setInvoiceNumber] = useState(batch?.invoice_number || '');
  const [invoiceDate, setInvoiceDate] = useState(batch?.invoice_date || '');
  const skipNextAutosave = useRef(true);

  useEffect(() => {
    setSupplierId(batch?.shop_supplier?.id || null);
    setSupplierName(batch?.shop_supplier?.display_name || batch?.supplier_name || '');
    setInvoiceNumber(batch?.invoice_number || '');
    setInvoiceDate(batch?.invoice_date || '');
    skipNextAutosave.current = true;
  }, [batch?.id, batch?.shop_supplier, batch?.supplier_name, batch?.invoice_number, batch?.invoice_date]);

  const buildPayload = () => ({
    shop_supplier_id: supplierId,
    supplier_name: supplierName.trim(),
    invoice_number: invoiceNumber.trim(),
    invoice_date: invoiceDate.trim(),
  });

  useEffect(() => {
    if (!batch?.id) return;
    onDraft?.(buildPayload());
    if (skipNextAutosave.current) {
      skipNextAutosave.current = false;
      return;
    }
    if (!onChange) return;
    const timer = setTimeout(() => {
      onChange(buildPayload());
    }, AUTOSAVE_MS);
    return () => clearTimeout(timer);
  }, [batch?.id, supplierId, supplierName, invoiceNumber, invoiceDate, onChange, onDraft]);

  const issues = showValidation ? batch?.header_issues || [] : [];
  const complete = showValidation ? batch?.header_complete : null;
  const todayIso = localDateToIso(new Date());

  const fieldError = (code) => (issues.includes(code) ? styles.fieldError : null);

  return (
    <FloatingCard
      style={[
        styles.card,
        showValidation && complete ? styles.cardOk : null,
        showValidation && !complete ? styles.cardWarn : null,
      ]}
    >
      <View style={styles.titleRow}>
        <MaterialCommunityIcons
          name={
            !showValidation
              ? 'file-document-outline'
              : complete
                ? 'file-document-check-outline'
                : 'file-document-alert-outline'
          }
          size={24}
          color={!showValidation ? TEXT_MUTED : complete ? '#15803d' : '#dc2626'}
        />
        <View style={styles.titleBody}>
          <Text style={styles.title}>Supplier document</Text>
          <Text style={[styles.subtitle, showValidation && !complete && styles.subtitleWarn]}>
            {!showValidation
              ? 'Filled from upload or enter below — saves as you type.'
              : complete
                ? 'Header complete — add part lines below.'
                : 'Fill supplier, doc #, and date before completing.'}
          </Text>
        </View>
      </View>

      {issues.length > 0 ? (
        <View style={styles.issueRow}>
          {issues.map((code) => (
            <Chip key={code} compact style={styles.issueChip} textStyle={styles.issueChipText}>
              Missing {HEADER_ISSUE_LABELS[code] || code}
            </Chip>
          ))}
        </View>
      ) : null}

      {batch?.source_type === 'invoice_upload' && batch?.supplier_name && !complete ? (
        <Text style={styles.autoFillHint}>
          Values from invoice import — confirm supplier, doc #, and date if needed.
        </Text>
      ) : null}

      <SupplierPicker
        selectedId={supplierId}
        selectedLabel={supplierName}
        onChange={({ id, display_name }) => {
          setSupplierId(id);
          setSupplierName(display_name);
        }}
        hasError={showValidation && issues.includes('supplier_name')}
      />

      <View style={styles.row2}>
        <TextInput
          label="Invoice / doc # *"
          mode="outlined"
          value={invoiceNumber}
          onChangeText={setInvoiceNumber}
          placeholder="APB-INV-2026-001245"
          style={[styles.field, styles.half, showValidation ? fieldError('invoice_number') : null]}
          error={showValidation && issues.includes('invoice_number')}
        />
        <View style={[styles.half, showValidation ? fieldError('invoice_date') : null]}>
          <ServiceRecordDatePicker
            label="Invoice date *"
            valueIso={invoiceDate}
            onChangeIso={setInvoiceDate}
            maxIso={todayIso}
          />
          {showValidation && issues.includes('invoice_date') ? (
            <Text style={styles.dateError}>Date required</Text>
          ) : null}
        </View>
      </View>
    </FloatingCard>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 10, padding: 14 },
  cardOk: { borderLeftWidth: 4, borderLeftColor: '#15803d' },
  cardWarn: { borderLeftWidth: 4, borderLeftColor: '#dc2626', backgroundColor: '#fef2f2' },
  titleRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  titleBody: { flex: 1 },
  title: { fontSize: 16, fontWeight: '700', color: TEXT_DARK },
  subtitle: { fontSize: 12, color: TEXT_MUTED, marginTop: 2 },
  subtitleWarn: { color: '#b91c1c', fontWeight: '600' },
  issueRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  issueChip: { backgroundColor: '#fee2e2' },
  issueChipText: { fontSize: 11, color: '#b91c1c', fontWeight: '600' },
  autoFillHint: { fontSize: 12, color: '#1d4ed8', marginBottom: 10, lineHeight: 17 },
  field: { marginBottom: 8, backgroundColor: '#fff' },
  fieldError: { backgroundColor: '#fff1f2' },
  row2: { flexDirection: 'row', gap: 8 },
  half: { flex: 1, minWidth: 0 },
  dateError: { fontSize: 11, color: '#dc2626', marginTop: -4, marginBottom: 8 },
});
