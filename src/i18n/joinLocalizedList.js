const DEFAULT_LANG = 'en';

// Fallback conjunctions (only used when i18n join templates are missing).
const CONJ_2 = {
  en: 'and',
  bg: 'и',
  de: 'und',
  it: 'e',
  fr: 'et',
  es: 'y',
};

// For 3+ items we render: A, B{conj3} C where conj3 already includes:
// - leading comma for EN (`, and`)
// - no leading comma for others (` und`, ` и`, ...)
const CONJ_3 = {
  en: ', and',
  bg: ' и',
  de: ' und',
  it: ' e',
  fr: ' et',
  es: ' y',
};

function joinFallback(items, lang = DEFAULT_LANG) {
  const list = (items || [])
    .map((s) => (s == null ? '' : String(s)).trim())
    .filter(Boolean);

  if (list.length === 0) return '';
  if (list.length === 1) return list[0];

  const normalizedLang = String(lang || DEFAULT_LANG).toLowerCase();
  const conj2 = CONJ_2[normalizedLang] ?? CONJ_2[DEFAULT_LANG];
  const conj3 = CONJ_3[normalizedLang] ?? CONJ_3[DEFAULT_LANG];

  if (list.length === 2) return `${list[0]} ${conj2} ${list[1]}`;
  return `${list.slice(0, -1).join(', ')}${conj3} ${list[list.length - 1]}`;
}

/**
 * Localized list joiner.
 * Required signature: `joinList(items, {t})`.
 *
 * Uses `listJoin.*` translation keys when available:
 * - `listJoin.two`: {a} + conjunction + {b}
 * - `listJoin.three`: {a}, {b} + conjunction + {c}
 * - `listJoin.conjunction` + `listJoin.serialComma` for 4+ items.
 */
export function joinList(items, { t, lang = DEFAULT_LANG } = {}) {
  const list = (items || [])
    .map((s) => (s == null ? '' : String(s)).trim())
    .filter(Boolean);

  if (list.length === 0) return '';
  if (list.length === 1) return list[0];

  // Prefer i18n templates (guarantees exact punctuation/conjunction).
  if (typeof t === 'function') {
    if (list.length === 2) {
      return t('listJoin.two', { a: list[0], b: list[1] }, `${list[0]} and ${list[1]}`);
    }
    if (list.length === 3) {
      return t(
        'listJoin.three',
        { a: list[0], b: list[1], c: list[2] },
        `${list[0]}, ${list[1]}, and ${list[2]}`
      );
    }

    const conjunction = t('listJoin.conjunction', null, 'and');
    const serialComma = t('listJoin.serialComma', null, ','); // '' for non-English variants
    const prefix = list.slice(0, -1).join(', ');
    return `${prefix}${serialComma ? `${serialComma} ` : ' '}${conjunction} ${list[list.length - 1]}`;
  }

  // Fallback if i18n join templates are not wired.
  return joinFallback(list, lang);
}

// Backwards-compatible name (older code used `lang` directly).
export function joinLocalizedList(items, lang = DEFAULT_LANG) {
  return joinFallback(items, lang);
}

