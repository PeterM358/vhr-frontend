/**
 * Bulgarian Cyrillic → Latin (aligned with backend profiles.services.seo_slugs).
 */
const CYRILLIC_MAP = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ж: 'zh',
  з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n',
  о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f',
  х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sht', ъ: 'a', ь: '',
  ю: 'yu', я: 'ya',
  А: 'A', Б: 'B', В: 'V', Г: 'G', Д: 'D', Е: 'E', Ж: 'Zh',
  З: 'Z', И: 'I', Й: 'Y', К: 'K', Л: 'L', М: 'M', Н: 'N',
  О: 'O', П: 'P', Р: 'R', С: 'S', Т: 'T', У: 'U', Ф: 'F',
  Х: 'H', Ц: 'Ts', Ч: 'Ch', Ш: 'Sh', Щ: 'Sht', Ъ: 'A', Ь: '',
  Ю: 'Yu', Я: 'Ya',
};

export function cyrillicToLatin(text) {
  return String(text || '')
    .split('')
    .map((ch) => (Object.prototype.hasOwnProperty.call(CYRILLIC_MAP, ch) ? CYRILLIC_MAP[ch] : ch))
    .join('');
}

/** Lowercase + trim + Cyrillic→Latin so "Пловдив" and "plovdiv" compare equal. */
export function normalizeSearchTerm(text) {
  return cyrillicToLatin(String(text || '').trim()).toLowerCase();
}
