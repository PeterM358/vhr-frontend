export const LOCALE_ORDER = ['bg', 'en', 'de', 'it', 'fr', 'es'];

export const LOCALE_ABBR = {
  bg: 'BG',
  en: 'EN',
  de: 'DE',
  it: 'IT',
  fr: 'FR',
  es: 'ES',
};

export const LOCALE_FLAGS = {
  bg: '🇧🇬',
  en: '🇬🇧',
  de: '🇩🇪',
  it: '🇮🇹',
  fr: '🇫🇷',
  es: '🇪🇸',
};

export const LOCALE_LABELS = {
  bg: 'Български',
  en: 'English',
  de: 'Deutsch',
  it: 'Italiano',
  fr: 'Français',
  es: 'Español',
};

export function getLangAbbr(locale) {
  const key = String(locale || '').trim().toLowerCase();
  return LOCALE_ABBR[key] || key.toUpperCase();
}
