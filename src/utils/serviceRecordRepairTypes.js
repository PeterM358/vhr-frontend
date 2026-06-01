/**
 * Service record picker: exclude obligation/document-only repair types.
 * Obligations (insurance, vignette, road tax, inspection due-only) use AddObligationPayment.
 */

const OBLIGATION_CATEGORY_SLUGS = new Set(['insurance-documents']);

export function filterServiceRecordRepairTypes(types) {
  if (!Array.isArray(types)) return [];
  return types.filter((t) => {
    const slug = String(t.slug || '').toLowerCase();
    const cat = String(t.category_slug || '').toLowerCase();
    const name = String(t.name || '').toLowerCase();
    if (OBLIGATION_CATEGORY_SLUGS.has(cat)) return false;
    if (/(vignette|винетка)/i.test(name)) return false;
    if (/(road tax|annual fee|годишен данък)/i.test(name)) return false;
    if (cat === 'inspections-legal' && slug !== 'technical-inspection') return false;
    return true;
  });
}

/** Drives conditional fields on Add Service Record (completed work only). */
export function classifyServiceRecordFormVariant(type) {
  if (!type) return 'generic';
  const slug = String(type.slug || '').toLowerCase();
  const name = String(type.name || '').toLowerCase();
  if (slug === 'oil-change' || (/\boil\b/.test(name) && !/coil/i.test(name))) return 'oil';
  if (slug === 'technical-inspection') return 'technical_inspection';
  if (slug.includes('brake') || name.includes('brake') || name.includes('спирач')) return 'brake_service';
  return 'generic';
}

/**
 * Repair money for API (major units, same as existing repair create).
 * If only total is set: labor=0, parts=total (and total unchanged).
 */
export function resolveOwnerLoggedRepairMoney(labor, parts, total) {
  const l = labor;
  const p = parts;
  const t = total;
  if (t != null && l == null && p == null) {
    return { labor_price: 0, parts_price: t, total_price: t };
  }
  return { labor_price: l, parts_price: p, total_price: t };
}
