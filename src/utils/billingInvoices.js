import { formatMoneyMinor } from '../constants/currency';

export function invoiceStatusLabel(status) {
  const map = {
    draft: 'Draft',
    issued: 'Issued',
    void: 'Void',
  };
  return map[String(status || '').toLowerCase()] || status || '—';
}

export function invoiceDisplayNumber(invoice) {
  if (!invoice) return '—';
  if (invoice.number) return invoice.number;
  return `Draft #${invoice.id}`;
}

export function invoiceListSubtitle(invoice) {
  const parts = [];
  const billTo = String(invoice?.bill_to_name || invoice?.bill_to_company_name || '').trim();
  if (billTo) parts.push(billTo);
  if (invoice?.issued_at) {
    try {
      parts.push(new Date(invoice.issued_at).toLocaleDateString());
    } catch {
      /* ignore */
    }
  } else if (invoice?.created_at) {
    try {
      parts.push(new Date(invoice.created_at).toLocaleDateString());
    } catch {
      /* ignore */
    }
  }
  return parts.join(' · ') || 'Sales invoice';
}

export function invoiceTotalLabel(invoice) {
  return formatMoneyMinor(invoice?.total_minor, invoice?.currency);
}

export function formatInvoiceLine(line, currency) {
  const qty = line?.quantity != null ? Number(line.quantity) : 1;
  const total = formatMoneyMinor(line?.line_total_minor, currency);
  if (qty > 1) {
    const unit = formatMoneyMinor(line?.unit_price_minor, currency);
    return `${line?.description || 'Line'} — ${qty} × ${unit} = ${total}`;
  }
  return `${line?.description || 'Line'} — ${total}`;
}
