/**
 * SSoT for public discovery Service category / Repair type filter chips.
 *
 * Normalizes `/api/repairs/types/` rows into a stable chip contract:
 * { id, slug, display_name, category_id, category_slug, icon_key }
 *
 * Labels: i18n (request locale) → locale API fields → English → humanized slug.
 * Icons: operationIconRegistry only (never screen-local maps, never "?").
 */

import {
  getOperationIcon,
  resolveOperationIconKey,
  CATEGORY_ICON_KEYS,
  GENERIC_SERVICE_ICON_KEY,
} from '../icons/operationIconRegistry.js';
import {
  translateRepairTypeLabel,
  translateServiceCategoryLabel,
} from './translateShopTypeLabels.js';

export function humanizeSlug(slug) {
  const raw = String(slug || '')
    .trim()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!raw) return '';
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

function pickLocalizedApiName(entity, locale) {
  if (!entity || typeof entity !== 'object') return '';
  const loc = String(locale || 'en').toLowerCase().slice(0, 2);
  if (loc === 'bg') {
    return String(entity.name_bg || '').trim();
  }
  if (loc === 'en') {
    return String(entity.name_en || entity.name || '').trim();
  }
  return String(entity[`name_${loc}`] || entity.name_en || entity.name || '').trim();
}

function pickEnglishName(entity) {
  if (!entity || typeof entity !== 'object') return '';
  return String(entity.name_en || entity.name || entity.category_name || '').trim();
}

/**
 * Never-empty display label for an operation / repair type.
 */
export function resolveOperationDisplayName(entity, { t, locale } = {}) {
  if (!entity) return '';
  const slug = String(entity.slug || entity.repair_type_slug || '').trim();

  if (typeof t === 'function') {
    const translated = String(translateRepairTypeLabel(entity, t) || '').trim();
    if (translated) return translated;
  }

  const localized = pickLocalizedApiName(entity, locale);
  if (localized) return localized;

  const english = pickEnglishName(entity);
  if (english) return english;

  return humanizeSlug(slug) || String(entity.id || '').trim() || 'Service';
}

/**
 * Never-empty display label for a service category.
 */
export function resolveCategoryDisplayName(entity, { t, locale } = {}) {
  if (!entity) return '';
  const slug = String(entity.slug || entity.category_slug || '').trim();

  if (typeof t === 'function') {
    const translated = String(translateServiceCategoryLabel(entity, t) || '').trim();
    if (translated) return translated;
  }

  const localized = pickLocalizedApiName(entity, locale);
  if (localized) return localized;

  const english = String(
    entity.name || entity.category_name || entity.name_en || ''
  ).trim();
  if (english) return english;

  return humanizeSlug(slug) || 'Category';
}

function categoryIconKeyFromRow(rt) {
  const fromApi = String(rt?.category_icon_key || rt?.category_icon || '').trim();
  if (fromApi) return resolveOperationIconKey({ icon_key: fromApi, category_slug: rt?.category_slug });
  const slug = String(rt?.category_slug || '').trim();
  if (slug && CATEGORY_ICON_KEYS[slug]) return CATEGORY_ICON_KEYS[slug];
  return GENERIC_SERVICE_ICON_KEY;
}

/**
 * Normalize one RepairType API row for discovery filter chips.
 */
export function normalizeRepairTypeForFilter(rt, { t, locale } = {}) {
  if (!rt || typeof rt !== 'object') return null;
  const slug = String(rt.slug || '').trim();
  if (!slug) return null;

  const icon_key = resolveOperationIconKey(rt);
  const display_name = resolveOperationDisplayName(rt, { t, locale });
  const category_id =
    rt.category_id != null
      ? rt.category_id
      : rt.category != null
        ? rt.category
        : null;

  return {
    id: rt.id,
    slug,
    display_name,
    category_id,
    category_slug: rt.category_slug || null,
    icon_key,
    // Compat aliases (panel historically used label/name)
    label: display_name,
    name: display_name,
  };
}

/**
 * Build unique Service category chip rows from RepairType list.
 */
export function buildCategoryFilterOptions(repairTypes, { t, locale } = {}) {
  const map = new Map();
  (repairTypes || []).forEach((rt) => {
    const slug = String(rt?.category_slug || '').trim();
    if (!slug || map.has(slug)) return;
    const id =
      rt.category_id != null
        ? rt.category_id
        : rt.category != null
          ? rt.category
          : null;
    const seed = {
      id,
      slug,
      category_slug: slug,
      name: rt.category_name,
      category_name: rt.category_name,
      icon_key: rt.category_icon_key,
      category_icon_key: rt.category_icon_key,
    };
    const display_name = resolveCategoryDisplayName(seed, { t, locale });
    const icon_key = categoryIconKeyFromRow(rt);
    map.set(slug, {
      id,
      slug,
      display_name,
      category_id: id,
      category_slug: slug,
      icon_key,
      label: display_name,
      name: display_name,
    });
  });
  return Array.from(map.values()).sort((a, b) =>
    a.display_name.localeCompare(b.display_name)
  );
}

/**
 * Glyph for a normalized chip row (operation or category).
 */
export function chipIconGlyph(row) {
  return getOperationIcon(row);
}
