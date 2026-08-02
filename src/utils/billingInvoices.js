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

/** Linked org jobs for list/detail cards. */
export function invoiceWorkOrderSummary(invoice, { maxTitles = 3 } = {}) {
  const rows = Array.isArray(invoice?.invoice_work_orders) ? invoice.invoice_work_orders : [];
  if (!rows.length) return '';
  const titles = rows
    .map((row) => String(row?.title || '').trim())
    .filter(Boolean);
  const count = rows.length;
  const shown = titles.slice(0, maxTitles);
  const extra = titles.length > maxTitles ? ` +${titles.length - maxTitles}` : '';
  const titlePart = shown.length ? shown.join(', ') + extra : '';
  const opTitles = [];
  rows.forEach((row) => {
    (row.operation_titles || []).forEach((name) => {
      const n = String(name || '').trim();
      if (n && !opTitles.includes(n)) opTitles.push(n);
    });
  });
  const jobsLabel = count === 1 ? '1 job' : `${count} jobs`;
  const opsLabel = opTitles.length
    ? ` · ${opTitles.slice(0, 4).join(', ')}${opTitles.length > 4 ? '…' : ''}`
    : '';
  return titlePart ? `${jobsLabel}: ${titlePart}${opsLabel}` : `${jobsLabel}${opsLabel}`;
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
