/** Display helper for VAT-inclusive consumer prices (offers, repairs, menus). */

export function formatVatRateLabel(ratePercent) {
  const rate = Number(ratePercent);
  if (!Number.isFinite(rate) || rate <= 0) return '';
  const rounded = Number.isInteger(rate) ? String(rate) : rate.toFixed(1);
  return `incl. ${rounded}% VAT`;
}

export function formatMoneyWithVatHint(amount, currency, ratePercent, { inclusive = true } = {}) {
  const base = amount != null && amount !== '' ? `${amount} ${currency || 'EUR'}` : '—';
  const hint = formatVatRateLabel(ratePercent);
  if (!hint) return base;
  return inclusive ? `${base} (${hint})` : `${base} + ${hint.replace('incl. ', '')}`;
}
