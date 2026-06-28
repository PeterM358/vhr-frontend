import React from 'react';
import { Image, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

import { COLORS } from '../../constants/colors';
import { formatMoneyMinor } from '../../constants/currency';
import { invoiceDisplayNumber } from '../../utils/billingInvoices';
import { issuerTaxIdDisplay, taxLabelsForShop } from '../../utils/invoiceTaxLabels';

function IssuerLogo({ uri, name }) {
  if (!uri) {
    return (
      <View style={styles.logoPlaceholder}>
        <Text style={styles.logoPlaceholderText}>{(name || 'SC').slice(0, 2).toUpperCase()}</Text>
      </View>
    );
  }
  if (Platform.OS === 'web') {
    return <img src={uri} alt="" style={{ maxHeight: 56, maxWidth: 160, objectFit: 'contain' }} />;
  }
  return <Image source={{ uri }} style={styles.logoImage} resizeMode="contain" />;
}

function PartyBlock({ title, titleBg, name, branchName, company, taxIdLine, email, phone, addressLines }) {
  return (
    <View style={styles.partyBlock}>
      <View style={[styles.partyTitleBar, { backgroundColor: titleBg }]}>
        <Text style={styles.partyTitle}>{title}</Text>
      </View>
      <View style={styles.partyBody}>
        {name ? <Text style={styles.partyName}>{name}</Text> : null}
        {branchName && branchName !== name ? (
          <Text style={styles.partyLine}>{branchName}</Text>
        ) : null}
        {company ? <Text style={styles.partyLine}>{company}</Text> : null}
        {taxIdLine ? (
          <Text style={styles.partyLine}>
            {taxIdLine.prefix} {taxIdLine.value}
          </Text>
        ) : null}
        {addressLines.map((line) => (
          <Text key={line} style={styles.partyLine}>
            {line}
          </Text>
        ))}
        {email ? <Text style={styles.partyLine}>{email}</Text> : null}
        {phone ? <Text style={styles.partyLine}>{phone}</Text> : null}
      </View>
    </View>
  );
}

function LineTableHeader({ currency, vatShort }) {
  return (
    <View style={styles.tableHeader}>
      <Text style={[styles.cellDesc, styles.headerText]}>Description</Text>
      <Text style={[styles.cellQty, styles.headerText]}>Qty</Text>
      <Text style={[styles.cellMoney, styles.headerText]}>Net</Text>
      <Text style={[styles.cellMoney, styles.headerText]}>{vatShort}</Text>
      <Text style={[styles.cellMoney, styles.headerText]}>Total</Text>
    </View>
  );
}

function LineRow({ line, currency }) {
  const qty = Number(line.quantity || 1);
  const net = line.line_net_minor ?? 0;
  const tax = line.line_tax_minor ?? 0;
  const gross = line.line_total_minor ?? 0;
  return (
    <View style={styles.tableRow}>
      <Text style={styles.cellDesc}>{line.description}</Text>
      <Text style={styles.cellQty}>{qty}</Text>
      <Text style={styles.cellMoney}>{formatMoneyMinor(net, currency)}</Text>
      <Text style={styles.cellMoney}>{formatMoneyMinor(tax, currency)}</Text>
      <Text style={styles.cellMoneyStrong}>{formatMoneyMinor(gross, currency)}</Text>
    </View>
  );
}

export default function InvoiceDocumentPreview({ invoice }) {
  if (!invoice) return null;

  const currency = invoice.currency;
  const title = invoice.document_title || (invoice.status === 'draft' ? 'Proforma invoice' : 'Tax invoice');
  const numberLabel = invoiceDisplayNumber(invoice);
  const dateLabel = invoice.issued_at
    ? new Date(invoice.issued_at).toLocaleDateString()
    : new Date(invoice.created_at || Date.now()).toLocaleDateString();

  const issuerAddress = [
    invoice.issuer_address_line1,
    [invoice.issuer_postal_code, invoice.issuer_city].filter(Boolean).join(' '),
    invoice.issuer_country_code,
  ].filter(Boolean);

  const buyerAddress = [
    invoice.bill_to_address_line1,
    [invoice.bill_to_postal_code, invoice.bill_to_city].filter(Boolean).join(' '),
    invoice.bill_to_country_code,
  ].filter(Boolean);

  const paymentLabel =
    invoice.payment_status === 'paid'
      ? 'Paid'
      : invoice.payment_status === 'partial'
        ? 'Partially paid'
        : 'Unpaid';

  const issuerCountryIso = String(invoice.issuer_country_code || '').trim().toUpperCase();
  const taxLabels = taxLabelsForShop(issuerCountryIso);
  const issuerTaxIdLine = issuerTaxIdDisplay({
    vatRegistered: invoice.issuer_vat_registered,
    countryIso: issuerCountryIso,
    vatNumber: invoice.issuer_vat_number,
    eikNumber: invoice.issuer_eik_number,
  });
  const buyerTaxIdLine = invoice.bill_to_vat_number
    ? { prefix: `${taxLabels.vatShort} №`, value: invoice.bill_to_vat_number }
    : null;

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={styles.page}>
        <View style={styles.topRow}>
          <IssuerLogo uri={invoice.issuer_logo_url || invoice.issuer_logo} name={invoice.issuer_name} />
          <View style={styles.docMeta}>
            <Text style={styles.docTitle}>{title.toUpperCase()}</Text>
            <Text style={styles.docSubTitle}>Проформа / Фактура</Text>
            <Text style={styles.docNumber}>№ {numberLabel}</Text>
            <Text style={styles.docDate}>Date / Дата: {dateLabel}</Text>
            <Text style={styles.paymentChip}>{paymentLabel}</Text>
          </View>
        </View>

        <View style={styles.partiesRow}>
          <PartyBlock
            title="Supplier / Доставчик"
            titleBg="#1e3a5f"
            name={invoice.issuer_name}
            branchName={invoice.issuer_branch_name}
            taxIdLine={issuerTaxIdLine}
            email={invoice.issuer_email}
            phone={invoice.issuer_phone}
            addressLines={issuerAddress}
          />
          <PartyBlock
            title="Buyer / Получател"
            titleBg="#334155"
            name={invoice.bill_to_name}
            company={invoice.bill_to_company_name}
            taxIdLine={buyerTaxIdLine}
            email={invoice.bill_to_email}
            phone={invoice.bill_to_phone}
            addressLines={buyerAddress}
          />
        </View>

        <LineTableHeader currency={currency} vatShort={taxLabels.vatShort} />
        {(invoice.lines || []).map((line) => (
          <LineRow key={line.id} line={line} currency={currency} />
        ))}

        <View style={styles.totalsBox}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Tax base / Данъчна основа</Text>
            <Text style={styles.totalValue}>{formatMoneyMinor(invoice.subtotal_minor, currency)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>
              {issuerCountryIso === 'BG' ? 'ДДС' : 'VAT'}{' '}
              {invoice.tax_rate_percent > 0 ? `${Number(invoice.tax_rate_percent)}%` : ''}
            </Text>
            <Text style={styles.totalValue}>{formatMoneyMinor(invoice.tax_minor, currency)}</Text>
          </View>
          <View style={[styles.totalRow, styles.grandTotalRow]}>
            <Text style={styles.grandTotalLabel}>Total / Общо</Text>
            <Text style={styles.grandTotalValue}>{formatMoneyMinor(invoice.total_minor, currency)}</Text>
          </View>
        </View>

        {invoice.notes ? (
          <View style={styles.notesBox}>
            <Text style={styles.notesTitle}>Notes</Text>
            <Text style={styles.notesBody}>{invoice.notes}</Text>
          </View>
        ) : null}

        <Text style={styles.footerHint}>
          Draft = proforma (no fiscal number until issued). PDF export and accountant export coming next.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    minWidth: 680,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 24,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#cbd5e1',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
    gap: 16,
  },
  logoImage: {
    width: 160,
    height: 56,
  },
  logoPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoPlaceholderText: {
    fontWeight: '800',
    color: '#475569',
    fontSize: 18,
  },
  docMeta: {
    alignItems: 'flex-end',
    flex: 1,
  },
  docTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: 0.5,
  },
  docSubTitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  docNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e3a5f',
    marginTop: 8,
  },
  docDate: {
    fontSize: 13,
    color: '#475569',
    marginTop: 4,
  },
  paymentChip: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '700',
    color: '#15803d',
    textTransform: 'uppercase',
  },
  partiesRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  partyBlock: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#cbd5e1',
    borderRadius: 6,
    overflow: 'hidden',
  },
  partyTitleBar: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  partyTitle: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  partyBody: {
    padding: 10,
    gap: 2,
  },
  partyName: {
    fontWeight: '700',
    color: '#0f172a',
    fontSize: 14,
  },
  partyLine: {
    color: '#475569',
    fontSize: 12,
    lineHeight: 17,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#cbd5e1',
    paddingVertical: 8,
    paddingHorizontal: 4,
    marginBottom: 2,
  },
  headerText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e2e8f0',
    alignItems: 'flex-start',
  },
  cellDesc: {
    flex: 4,
    fontSize: 12,
    color: '#0f172a',
    paddingRight: 8,
  },
  cellQty: {
    width: 36,
    fontSize: 12,
    color: '#475569',
    textAlign: 'center',
  },
  cellMoney: {
    width: 72,
    fontSize: 12,
    color: '#475569',
    textAlign: 'right',
  },
  cellMoneyStrong: {
    width: 72,
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
    textAlign: 'right',
  },
  totalsBox: {
    marginTop: 12,
    alignSelf: 'flex-end',
    minWidth: 280,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#cbd5e1',
    borderRadius: 6,
    overflow: 'hidden',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e2e8f0',
  },
  totalLabel: {
    fontSize: 12,
    color: '#475569',
  },
  totalValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0f172a',
  },
  grandTotalRow: {
    backgroundColor: '#f8fafc',
    borderBottomWidth: 0,
  },
  grandTotalLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  grandTotalValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1e3a5f',
  },
  notesBox: {
    marginTop: 16,
    padding: 10,
    backgroundColor: '#f8fafc',
    borderRadius: 6,
  },
  notesTitle: {
    fontWeight: '700',
    fontSize: 12,
    color: '#334155',
    marginBottom: 4,
  },
  notesBody: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 17,
  },
  footerHint: {
    marginTop: 16,
    fontSize: 11,
    color: '#94a3b8',
    fontStyle: 'italic',
  },
});
