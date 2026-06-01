/** Vehicle document types and grouping (matches backend VehicleDocument). */

export const DOCUMENT_TYPE_INSURANCE_POLICY = 'insurance_policy';
export const DOCUMENT_TYPE_TECHNICAL_INSPECTION = 'technical_inspection';
export const DOCUMENT_TYPE_VIGNETTE = 'vignette';
export const DOCUMENT_TYPE_ROAD_TAX = 'road_tax';
export const DOCUMENT_TYPE_REPAIR_INVOICE = 'repair_invoice';
export const DOCUMENT_TYPE_RECEIPT = 'receipt';
export const DOCUMENT_TYPE_VEHICLE_PHOTO = 'vehicle_photo';
export const DOCUMENT_TYPE_OTHER = 'other';

export const OBLIGATION_REMINDER_TO_DOCUMENT_TYPE = {
  insurance: DOCUMENT_TYPE_INSURANCE_POLICY,
  technical_inspection: DOCUMENT_TYPE_TECHNICAL_INSPECTION,
  vignette: DOCUMENT_TYPE_VIGNETTE,
  road_tax: DOCUMENT_TYPE_ROAD_TAX,
};

const LABELS = {
  [DOCUMENT_TYPE_INSURANCE_POLICY]: 'Insurance policy',
  [DOCUMENT_TYPE_TECHNICAL_INSPECTION]: 'Technical inspection',
  [DOCUMENT_TYPE_VIGNETTE]: 'Vignette',
  [DOCUMENT_TYPE_ROAD_TAX]: 'Road tax',
  [DOCUMENT_TYPE_REPAIR_INVOICE]: 'Repair invoice',
  [DOCUMENT_TYPE_RECEIPT]: 'Receipt',
  [DOCUMENT_TYPE_VEHICLE_PHOTO]: 'Vehicle photo',
  [DOCUMENT_TYPE_OTHER]: 'Document',
};

export function documentTypeLabel(documentType) {
  return LABELS[documentType] || documentType || 'Document';
}

export function inferReceiptDocumentType(mimeType, fileName) {
  const mime = String(mimeType || '').toLowerCase();
  const name = String(fileName || '').toLowerCase();
  if (mime === 'application/pdf' || name.endsWith('.pdf')) {
    return DOCUMENT_TYPE_REPAIR_INVOICE;
  }
  return DOCUMENT_TYPE_RECEIPT;
}

export function groupVehicleDocuments(documents) {
  const list = Array.isArray(documents) ? documents : [];
  const invoices = [];
  const obligations = [];
  const photos = [];
  const other = [];

  for (const doc of list) {
    const t = doc.document_type;
    if (t === DOCUMENT_TYPE_REPAIR_INVOICE || t === DOCUMENT_TYPE_RECEIPT) {
      invoices.push(doc);
    } else if (
      t === DOCUMENT_TYPE_INSURANCE_POLICY ||
      t === DOCUMENT_TYPE_TECHNICAL_INSPECTION ||
      t === DOCUMENT_TYPE_VIGNETTE ||
      t === DOCUMENT_TYPE_ROAD_TAX
    ) {
      obligations.push(doc);
    } else if (t === DOCUMENT_TYPE_VEHICLE_PHOTO) {
      photos.push(doc);
    } else {
      other.push(doc);
    }
  }

  return { invoices, obligations, photos, other };
}

export function formatDocumentRowSubtitle(doc) {
  const parts = [];
  if (doc.valid_until) parts.push(`Valid until ${doc.valid_until}`);
  if (doc.paid_date) parts.push(`Paid ${doc.paid_date}`);
  if (doc.total_amount_minor != null && doc.total_amount_minor !== '') {
    const major = Number(doc.total_amount_minor) / 100;
    if (Number.isFinite(major)) {
      parts.push(`${major.toFixed(2)} ${doc.currency || 'BGN'}`);
    }
  }
  if (doc.created_at) {
    const d = String(doc.created_at).slice(0, 10);
    if (d) parts.push(d);
  }
  return parts.join(' · ') || documentTypeLabel(doc.document_type);
}
