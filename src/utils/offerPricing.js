import { DEFAULT_CURRENCY, formatMoneyAmount } from '../constants/currency';

function parseAmount(raw) {
  const t = String(raw ?? '').trim().replace(',', '.');
  if (!t) return null;
  const n = parseFloat(t);
  return Number.isFinite(n) ? n : null;
}

export function computeFromSum(laborFrom, partsFrom) {
  return (parseAmount(laborFrom) ?? 0) + (parseAmount(partsFrom) ?? 0);
}

export function computeToSum(laborFrom, laborTo, partsFrom, partsTo) {
  const lf = parseAmount(laborFrom) ?? 0;
  const lt = parseAmount(laborTo) ?? lf;
  const pf = parseAmount(partsFrom) ?? 0;
  const pt = parseAmount(partsTo) ?? pf;
  return lt + pt;
}

export function offerHasPricingRange(offer) {
  if (!offer) return false;
  if (offer.estimate_to_total != null && offer.estimate_from_total != null) {
    return Number(offer.estimate_to_total) !== Number(offer.estimate_from_total);
  }
  const lf = offer.labor_from;
  const lt = offer.labor_to;
  const pf = offer.parts_from;
  const pt = offer.parts_to;
  return (
    (lt != null && Number(lt) !== Number(lf)) ||
    (pt != null && Number(pt) !== Number(pf))
  );
}

/** Client-facing estimate + quoted total lines. */
export function formatOfferPricingLines(offer, currency = DEFAULT_CURRENCY) {
  if (!offer) return { estimateLine: null, quotedLine: null };

  const fromTotal = offer.estimate_from_total;
  const toTotal = offer.estimate_to_total;
  const quoted = offer.price;

  let estimateLine = null;
  if (fromTotal != null && toTotal != null && Number(toTotal) !== Number(fromTotal)) {
    estimateLine = `Estimate ${formatMoneyAmount(fromTotal, currency)} – ${formatMoneyAmount(toTotal, currency)}`;
  } else if (fromTotal != null) {
    estimateLine = `Estimate ${formatMoneyAmount(fromTotal, currency)}`;
  } else if (quoted != null) {
    estimateLine = `Estimate ${formatMoneyAmount(quoted, currency)}`;
  }

  let quotedLine = null;
  if (quoted != null && fromTotal != null && Number(quoted) !== Number(fromTotal)) {
    quotedLine = `Quoted total ${formatMoneyAmount(quoted, currency)}`;
  } else if (quoted != null && fromTotal == null) {
    quotedLine = `Quoted total ${formatMoneyAmount(quoted, currency)}`;
  }

  return { estimateLine, quotedLine };
}

export function formatOfferPrimaryPrice(offer, currency = DEFAULT_CURRENCY) {
  const { estimateLine, quotedLine } = formatOfferPricingLines(offer, currency);
  if (quotedLine) return quotedLine.replace('Quoted total ', '');
  if (estimateLine) return estimateLine.replace('Estimate ', '');
  if (offer?.price != null) return formatMoneyAmount(offer.price, currency);
  return 'Quote pending';
}
