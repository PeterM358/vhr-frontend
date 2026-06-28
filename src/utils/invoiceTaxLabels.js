/** Country VAT % — keep in sync with vhr/vat.py STANDARD_VAT_RATE_BY_COUNTRY. */
export const STANDARD_VAT_BY_COUNTRY = {
  BG: 20,
  RO: 19,
  GR: 24,
  DE: 19,
  FR: 20,
  IT: 22,
  ES: 21,
  AT: 20,
  NL: 21,
  BE: 21,
  PL: 23,
  CZ: 21,
  SK: 20,
  HU: 27,
  HR: 25,
  SI: 22,
  RS: 20,
  MK: 18,
  TR: 20,
};

export function shopCountryIso(countries, profile) {
  const row = (countries || []).find((c) => Number(c.id) === Number(profile?.country));
  return String(row?.iso2 || profile?.country_iso || '').trim().toUpperCase();
}

export function taxLabelsForShop(countryIso) {
  const bg = countryIso === 'BG';
  return {
    vatShort: bg ? 'ДДС' : 'VAT',
    vatNumberLabel: bg ? 'ДДС номер' : 'VAT number',
    eikLabel: 'ЕИК',
    eikNumberLabel: bg ? 'ЕИК номер' : 'Company registration (EIK)',
    vatRegisteredLabel: bg ? 'Регистриран по ДДС' : 'Registered for VAT',
    notVatRegisteredHint: bg
      ? 'Ако не сте регистрирани по ДДС, въведете ЕИК вместо ДДС номер.'
      : 'If not VAT registered, enter your company registration number (EIK).',
    pricesIncludeLabel: bg ? 'Цените включват ДДС' : 'Prices include VAT',
    pricesIncludeHint: bg
      ? 'Включено, когато цените са крайни за клиента (типично в България).'
      : 'On when labor/parts are what the customer pays (typical retail).',
    vatRateLabel: bg ? 'Ставка ДДС' : 'VAT rate',
  };
}

export function resolvedShopVatRatePercent(countryIso, legalEntity) {
  if (
    legalEntity?.default_vat_rate_percent != null &&
    String(legalEntity.default_vat_rate_percent).trim() !== ''
  ) {
    return Number(legalEntity.default_vat_rate_percent);
  }
  const iso = String(legalEntity?.country_iso || countryIso || '').trim().toUpperCase();
  if (iso && STANDARD_VAT_BY_COUNTRY[iso] != null) {
    return STANDARD_VAT_BY_COUNTRY[iso];
  }
  return null;
}

export function legalEntityCountryIso(countries, legalEntity, shopProfile) {
  if (legalEntity?.country_iso) {
    return String(legalEntity.country_iso).trim().toUpperCase();
  }
  const row = (countries || []).find((c) => Number(c.id) === Number(legalEntity?.country));
  if (row?.iso2) return String(row.iso2).trim().toUpperCase();
  return shopCountryIso(countries, shopProfile);
}

export function emptyLegalEntityDraft(shopProfile) {
  return {
    id: null,
    legal_name: shopProfile?.name || '',
    vat_registered: true,
    vat_number: '',
    eik_number: '',
    country: shopProfile?.country || null,
    country_iso: '',
    prices_include_vat: true,
    logo_url: '',
    linked_shop_count: 0,
    linked_shop_names: [],
  };
}

export function normalizeInvoiceVatNumber(value) {
  return String(value || '')
    .trim()
    .replace(/[\s\-./]/g, '')
    .toUpperCase();
}

export function normalizeInvoiceEikNumber(value) {
  return String(value || '')
    .trim()
    .replace(/\D/g, '');
}

/** Line shown on invoice party block for supplier tax id. */
export function issuerTaxIdDisplay({ vatRegistered, countryIso, vatNumber, eikNumber }) {
  const labels = taxLabelsForShop(countryIso);
  const vat = String(vatNumber || '').trim();
  const eik = String(eikNumber || '').trim();
  const registered = vatRegistered !== false;

  if (registered && vat) {
    return { prefix: `${labels.vatShort} №`, value: vat };
  }
  if (!registered && eik) {
    return { prefix: `${labels.eikLabel} №`, value: eik };
  }
  if (vat) {
    return { prefix: `${labels.vatShort} №`, value: vat };
  }
  if (eik) {
    return { prefix: `${labels.eikLabel} №`, value: eik };
  }
  return null;
}
