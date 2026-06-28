/**
 * International phone helpers — prefix + national digits → E.164 for API storage.
 */

const COUNTRY_PHONE_PREFIX_FALLBACK = {
  bulgaria: '+359',
};

export function formatPhoneCodeFromApi(phoneCode) {
  if (phoneCode == null) return '';
  const d = String(phoneCode).replace(/\D/g, '');
  if (!d) return '';
  return `+${d}`;
}

export function dialPrefixForCountry(country) {
  if (!country) return '';
  const fromApi = formatPhoneCodeFromApi(country.phone_code);
  if (fromApi) return fromApi;
  const name = String(country.name || '').trim().toLowerCase();
  return COUNTRY_PHONE_PREFIX_FALLBACK[name] || '';
}

export function parseStoredPhone(stored) {
  const raw = String(stored || '').trim();
  if (!raw) return { prefix: '', national: '' };
  if (raw.startsWith('+')) {
    const m = raw.match(/^\+(\d{1,3})(.*)$/);
    if (m) {
      const national = String(m[2] || '').replace(/\D/g, '');
      return { prefix: `+${m[1]}`, national };
    }
  }
  if (raw.startsWith('00')) {
    const digits = raw.replace(/\D/g, '');
    if (digits.length > 4) {
      return { prefix: `+${digits.slice(0, 3)}`, national: digits.slice(3) };
    }
  }
  return { prefix: '', national: raw.replace(/\D/g, '') };
}

export function nationalDigitsOnly(national) {
  return String(national || '').replace(/\D/g, '').replace(/^0+/, '');
}

export function buildE164Phone(prefix, national) {
  const n = nationalDigitsOnly(national);
  if (!n) return '';
  let p = String(prefix || '').trim().replace(/\s/g, '');
  if (!p) return '';
  if (!p.startsWith('+')) p = `+${p.replace(/\D/g, '')}`;
  else p = `+${p.slice(1).replace(/\D/g, '')}`;
  const full = `${p}${n}`;
  if (n.length < 4 || full.replace(/\D/g, '').length > 15) return '';
  return full;
}
