/**
 * Shared shop service pricing display logic.
 *
 * One source of truth for how a ShopServiceMenuItem's parts + labor + typical
 * labor time are summarised, used by the Price List, the Profile operations
 * chips, and the public / preview pages so all surfaces stay consistent.
 */

import { formatMoneyAmount } from '../constants/currency';
import { formatTypicalLaborTime } from './laborDuration';

function toNumber(value) {
  if (value == null || value === '') return null;
  const n = Number(String(value).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

function componentLine(from, to, keys, t) {
  const f = toNumber(from);
  const tt = toNumber(to);
  if (f == null && tt == null) return null;
  if (f != null && tt != null && String(f) !== String(tt)) {
    return t(keys.range, { from: formatMoneyAmount(f), to: formatMoneyAmount(tt) });
  }
  const value = f != null ? f : tt;
  return t(keys.from, { price: formatMoneyAmount(value) });
}

/**
 * Structured pricing description for a menu item.
 * `labor` intentionally does NOT fall back to `price_*` (which now bundles
 * parts) so a total can be shown separately from labor when parts exist.
 */
export function describeServicePricing(item, t) {
  const hasParts =
    toNumber(item?.parts_from) != null || toNumber(item?.parts_to) != null;
  const hasLabor =
    toNumber(item?.labor_from) != null || toNumber(item?.labor_to) != null;

  const parts = componentLine(
    item?.parts_from,
    item?.parts_to,
    { range: 'servicePricing.partsRange', from: 'servicePricing.partsFrom' },
    t
  );
  // Legacy rows may only carry price_* (total) with no explicit labor split.
  const labor = componentLine(
    item?.labor_from ?? (hasParts ? null : item?.price_from),
    item?.labor_to ?? (hasParts ? null : item?.price_to),
    { range: 'servicePricing.laborRange', from: 'servicePricing.laborFrom' },
    t
  );
  const total = componentLine(
    item?.price_from,
    item?.price_to,
    { range: 'servicePricing.totalRange', from: 'servicePricing.totalFrom' },
    t
  );
  const timeLabel = formatTypicalLaborTime(
    item?.typical_labor_minutes,
    item?.typical_labor_minutes_to
  );
  const time = timeLabel ? t('servicePricing.time', { time: timeLabel }) : null;

  return { parts, labor, total, time, hasParts, hasLabor };
}

/**
 * Compact one-line summary chips (Parts · Labor · time) for list rows / chips.
 * Falls back to a "set price" hint when nothing is priced.
 */
export function serviceMenuSummaryLine(item, t) {
  const { parts, labor, time } = describeServicePricing(item, t);
  const bits = [parts, labor, time].filter(Boolean);
  if (bits.length) return bits.join(' · ');
  return t('servicePricing.setPrice');
}

/** Parse a money-ish string/number to a finite number or null. */
export function parsePricingMoney(value) {
  return toNumber(value);
}

/** Compute the "Clients see: Total X–Y" label from a draft (parts + labor). */
export function computeClientTotalLabel(value, t) {
  const pf = toNumber(value?.parts_from);
  const pt = toNumber(value?.parts_to);
  const lf = toNumber(value?.labor_from);
  const lt = toNumber(value?.labor_to);
  const from = pf != null || lf != null ? (pf ?? 0) + (lf ?? 0) : null;
  const to = pt != null || lt != null ? (pt ?? pf ?? 0) + (lt ?? lf ?? 0) : null;
  const line = componentLine(
    from,
    to,
    { range: 'servicePricing.totalRange', from: 'servicePricing.totalFrom' },
    t
  );
  if (!line) return null;
  return t('servicePricing.clientsSee', { total: line });
}
