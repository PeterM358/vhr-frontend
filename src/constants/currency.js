export const DEFAULT_CURRENCY = 'EUR';

export function formatMoneyAmount(amount, currency = DEFAULT_CURRENCY) {
  if (amount == null || amount === '' || Number.isNaN(Number(amount))) {
    return '—';
  }
  const code = (currency || DEFAULT_CURRENCY).trim() || DEFAULT_CURRENCY;
  return `${Number(amount).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })} ${code}`;
}

/** Integer minor units (cents) from backend billing models. */
export function formatMoneyMinor(minor, currency = DEFAULT_CURRENCY) {
  if (minor == null || minor === '' || Number.isNaN(Number(minor))) {
    return '—';
  }
  return formatMoneyAmount(Number(minor) / 100, currency);
}
