/**
 * Card formatting helpers for repair list screens.
 * Filtering and sorting are server-side — see GET /api/repairs/repair/ query params.
 */

import { formatMoneyAmount } from '../constants/currency';

export function repairServiceTypeLabel(item) {
  const name =
    item?.final_repair_type_name ||
    item?.effective_repair_type_name ||
    item?.repair_type_name ||
    null;
  if (name) return name;
  const desc = String(item?.description || '').trim();
  if (desc) return desc.length > 56 ? `${desc.slice(0, 53)}…` : desc;
  return 'Needs classification';
}

export function repairVehicleLabel(item) {
  const makeModel = `${item?.vehicle_make ?? ''} ${item?.vehicle_model ?? ''}`.trim();
  const plate = String(item?.vehicle_license_plate || '').trim();
  if (makeModel && plate) return `${makeModel} · ${plate}`;
  return makeModel || plate || 'Vehicle';
}

export function repairHistoryKmLabel(item) {
  const km = repairListKmValue(item, 'done');
  if (km == null || km === '') return null;
  return `${Number(km).toLocaleString()} km`;
}

export function repairHistoryTotalLabel(item) {
  const total = item?.total_price ?? item?.calculated_total_price;
  if (total == null || total === '') return null;
  return formatMoneyAmount(total, item?.currency);
}

export function getRepairSortTimestamp(item, statusTab) {
  if (statusTab === 'done') {
    return item?.completed_at || item?.created_at || null;
  }
  return item?.created_at || item?.completed_at || null;
}

export function sortRepairsByRecency(repairs, statusTab) {
  return [...(repairs || [])].sort((a, b) => {
    const ta = new Date(getRepairSortTimestamp(a, statusTab) || 0).getTime();
    const tb = new Date(getRepairSortTimestamp(b, statusTab) || 0).getTime();
    if (tb !== ta) return tb - ta;
    return Number(b?.id || 0) - Number(a?.id || 0);
  });
}

export function filterRepairsByQuery(repairs, query) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return repairs || [];

  return (repairs || []).filter((item) => {
    const plate = String(item.vehicle_license_plate || '').toLowerCase();
    const client = String(item.client_display_name || '').toLowerCase();
    const make = String(item.vehicle_make || '').toLowerCase();
    const model = String(item.vehicle_model || '').toLowerCase();
    const vehicle = `${make} ${model}`.trim();
    const serviceType = String(
      item.final_repair_type_name || item.effective_repair_type_name || ''
    ).toLowerCase();

    return (
      plate.includes(q) ||
      client.includes(q) ||
      vehicle.includes(q) ||
      serviceType.includes(q)
    );
  });
}

export function formatRepairListDate(raw) {
  if (raw == null || raw === '') return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function repairListDateLabel(statusTab) {
  if (statusTab === 'done') return 'Completed';
  if (statusTab === 'ongoing') return 'Started';
  return 'Requested';
}

export function repairListKmValue(item, statusTab) {
  if (statusTab === 'done' && item?.final_kilometers != null) {
    return item.final_kilometers;
  }
  if (item?.kilometers != null && item.kilometers !== '') {
    return item.kilometers;
  }
  return null;
}

const PAYMENT_STATUS_LABELS = {
  unpaid: 'Unpaid',
  partially_paid: 'Partially paid',
  paid: 'Paid',
  included_in_invoice: 'Included in invoice',
};

export function formatRepairPaymentStatus(status) {
  if (!status) return null;
  return PAYMENT_STATUS_LABELS[String(status)] || String(status).replace(/_/g, ' ');
}

export function isRepairPaymentSettled(status) {
  return status === 'paid' || status === 'included_in_invoice';
}

export function filterRepairsByPaymentStatus(repairs, paymentStatus) {
  const key = String(paymentStatus || '').trim().toLowerCase();
  if (!key) return repairs || [];

  return (repairs || []).filter((item) => {
    const settled = isRepairPaymentSettled(item?.payment_status);
    if (key === 'unpaid') return !settled;
    if (key === 'paid') return settled;
    if (key === 'partially_paid' || key === 'partial') {
      return item?.payment_status === 'partially_paid';
    }
    return true;
  });
}

export function filterRepairsByClientId(repairs, clientId) {
  if (clientId == null || clientId === '') return repairs || [];
  const target = String(clientId);
  return (repairs || []).filter((item) => String(item?.client ?? '') === target);
}

export function applyDoneTabClientFilters(repairs, { paymentStatus, clientId } = {}) {
  let rows = repairs || [];
  if (clientId) rows = filterRepairsByClientId(rows, clientId);
  if (paymentStatus) rows = filterRepairsByPaymentStatus(rows, paymentStatus);
  return rows;
}
