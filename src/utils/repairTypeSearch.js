/**
 * Client-side repair type search, popular picks, and synonym matching.
 * API has no dedicated keywords field — we search name, category, slug, description, and local synonyms.
 */

export const POPULAR_REPAIR_PICKS = [
  { slug: 'oil-change', label: 'Oil Change' },
  { slug: 'brake-repair', label: 'Brake Repair' },
  { slug: 'diagnostics', label: 'Diagnostics' },
  { slug: 'ac-repair', label: 'AC Service' },
  { slug: 'battery-replacement', label: 'Battery' },
  { slug: 'tire-change', label: 'Tires' },
  { slug: 'annual-service-check', label: 'Annual Service' },
  { slug: 'general-inspection', label: 'Other' },
];

/** Common phrases users type that map to repair type slugs. */
const SLUG_SYNONYMS = {
  'oil-change': ['oil', 'lube', 'oil service', 'change oil'],
  'filter-replacement': ['filter', 'air filter', 'cabin filter'],
  'annual-service-check': ['annual', 'annual service', 'yearly service', 'service check'],
  'brake-repair': ['brake', 'brakes', 'brake noise', 'squeaking', 'grinding'],
  'brake-fluid-change': ['brake fluid'],
  diagnostics: ['check engine', 'warning light', 'scan', 'obd', 'diagnostic', 'noise', 'strange noise'],
  'ac-repair': ['ac', 'a/c', 'air conditioning', 'not cooling', 'ac not working'],
  'ac-refill': ['ac recharge', 'freon'],
  'ac-diagnostics': ['ac problem'],
  'tire-change': ['tire', 'tyre', 'tires', 'tyres', 'wheel'],
  'tire-repair': ['flat tire', 'puncture'],
  'battery-replacement': ['battery', 'dead battery', "won't start", 'jump start'],
  'battery-check': ['battery test'],
  'suspension-repair': ['noise', 'rattle', 'clunk', 'squeak', 'suspension'],
  'general-inspection': ['other', 'not sure', 'general', 'unsure'],
};

function normalizeSlug(type) {
  return type?.slug || type?.repair_type_slug || type?.slug_en || '';
}

function collectSearchTokens(type) {
  const slug = normalizeSlug(type);
  const parts = [
    type?.name,
    type?.name_en,
    type?.name_bg,
    slug,
    type?.slug_bg,
    type?.slug_en,
    type?.category_name,
    type?.category_slug,
    type?.description,
    type?.seo_title_en,
    type?.seo_title_bg,
    type?.seo_description_en,
    type?.seo_description_bg,
  ];
  const synonyms = SLUG_SYNONYMS[slug] || [];
  return [...parts, ...synonyms]
    .filter(Boolean)
    .map((s) => String(s).toLowerCase());
}

function scoreMatch(tokens, query) {
  const q = query.trim().toLowerCase();
  if (!q) return 0;
  let best = 0;
  for (const token of tokens) {
    if (token === q) best = Math.max(best, 100);
    else if (token.startsWith(q)) best = Math.max(best, 80);
    else if (token.includes(q)) best = Math.max(best, 50);
    else {
      const words = q.split(/\s+/).filter(Boolean);
      if (words.length > 1 && words.every((w) => token.includes(w))) {
        best = Math.max(best, 40);
      }
    }
  }
  return best;
}

/**
 * @param {Array} repairTypes
 * @param {string} query
 * @param {{ limit?: number }} options
 */
export function searchRepairTypes(repairTypes, query, { limit = 8 } = {}) {
  const q = String(query || '').trim();
  if (!q) return [];

  return repairTypes
    .map((type) => ({
      type,
      score: scoreMatch(collectSearchTokens(type), q),
    }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score || String(a.type.name).localeCompare(String(b.type.name)))
    .slice(0, limit)
    .map((row) => row.type);
}

export function resolvePopularRepairTypes(repairTypes) {
  const bySlug = new Map();
  repairTypes.forEach((t) => {
    const slug = normalizeSlug(t);
    if (slug) bySlug.set(slug, t);
  });

  return POPULAR_REPAIR_PICKS.map((pick) => {
    const match = bySlug.get(pick.slug);
    if (match) return match;
    const fuzzy = repairTypes.find(
      (t) => String(t.name || '').toLowerCase() === pick.label.toLowerCase()
    );
    return fuzzy || null;
  }).filter(Boolean);
}

export function groupRepairTypesByCategory(repairTypes) {
  const map = new Map();
  repairTypes.forEach((type) => {
    const slug = type.category_slug || 'other';
    const name = type.category_name || 'Other services';
    if (!map.has(slug)) {
      map.set(slug, { slug, name, types: [] });
    }
    map.get(slug).types.push(type);
  });

  return Array.from(map.values())
    .map((group) => ({
      ...group,
      types: [...group.types].sort((a, b) =>
        String(a.name || '').localeCompare(String(b.name || ''))
      ),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function findTypeBySlug(repairTypes, slug) {
  return repairTypes.find((t) => normalizeSlug(t) === slug) || null;
}

/**
 * Resolve repair type for submit when user did not pick one explicitly.
 * @returns {{ type: object|null, source: 'selected'|'matched'|'default'|null }}
 */
export function resolveRepairTypeForSubmit(repairTypes, selectedTypeId, problemText) {
  if (selectedTypeId) {
    const selected = repairTypes.find((t) => String(t.id) === String(selectedTypeId));
    return { type: selected || null, source: 'selected' };
  }

  const text = String(problemText || '').trim();
  if (text) {
    const matches = searchRepairTypes(repairTypes, text, { limit: 1 });
    if (matches[0]) {
      return { type: matches[0], source: 'matched' };
    }
  }

  const fallback =
    findTypeBySlug(repairTypes, 'general-inspection') ||
    findTypeBySlug(repairTypes, 'diagnostics') ||
    repairTypes.find((t) => t.category_slug === 'other') ||
    null;

  return { type: fallback, source: fallback ? 'default' : null };
}
