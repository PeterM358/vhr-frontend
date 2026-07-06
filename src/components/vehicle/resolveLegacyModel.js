export function resolveLegacyModelId(models, text) {
  const q = String(text ?? '').trim().toLowerCase();
  if (!q || !Array.isArray(models)) return '';
  const hit = models.find((m) => String(m.name ?? '').trim().toLowerCase() === q);
  return hit ? String(hit.id) : '';
}

/** Deduplicate legacy models by normalized display name (first occurrence wins). */
export function uniqueLegacyModels(models) {
  const seen = new Set();
  return (models || []).filter((m) => {
    const key = String(m.name ?? '').trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Merge catalog and legacy models into one sorted list; catalog wins on name collision. */
export function mergeCatalogAndLegacyModels(catalogModels, legacyModels) {
  const catalog = catalogModels || [];
  const legacy = uniqueLegacyModels(legacyModels);
  const catalogNames = new Set(
    catalog.map((m) => String(m.name ?? '').trim().toLowerCase()).filter(Boolean)
  );
  const merged = catalog.map((m) => ({
    ...m,
    source: 'catalog',
    key: `catalog:${m.id}`,
  }));
  for (const m of legacy) {
    const nameKey = String(m.name ?? '').trim().toLowerCase();
    if (nameKey && !catalogNames.has(nameKey)) {
      merged.push({ ...m, source: 'legacy', key: `legacy:${m.id}` });
    }
  }
  return merged.sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
}

export function filterLegacyModelSuggestions(models, text, limit = 6) {
  const unique = uniqueLegacyModels(models);
  const q = String(text ?? '').trim().toLowerCase();
  if (!q) return unique.slice(0, limit);
  return unique
    .filter((m) => String(m.name ?? '').toLowerCase().includes(q))
    .slice(0, limit);
}
