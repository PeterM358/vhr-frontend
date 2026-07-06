export function resolveLegacyModelId(models, text) {
  const q = String(text ?? '').trim().toLowerCase();
  if (!q || !Array.isArray(models)) return '';
  const hit = models.find((m) => String(m.name ?? '').trim().toLowerCase() === q);
  return hit ? String(hit.id) : '';
}

export function filterLegacyModelSuggestions(models, text, limit = 6) {
  const q = String(text ?? '').trim().toLowerCase();
  if (!q) return (models || []).slice(0, limit);
  return (models || [])
    .filter((m) => String(m.name ?? '').toLowerCase().includes(q))
    .slice(0, limit);
}
