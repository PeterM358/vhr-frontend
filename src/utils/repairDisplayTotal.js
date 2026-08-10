/**
 * Resolve customer-facing repair total for display.
 * Heals stale header totals that still equal labor-only or parts-only
 * after the other side was filled (e.g. Labor 70 + Parts 50, Total 50).
 */
export function resolveRepairDisplayTotal(repair) {
  if (!repair) return null;
  const labor =
    repair.labor_price != null && repair.labor_price !== ''
      ? Number(repair.labor_price)
      : null;
  const parts =
    repair.parts_price != null && repair.parts_price !== ''
      ? Number(repair.parts_price)
      : null;
  const total =
    repair.total_price != null && repair.total_price !== ''
      ? Number(repair.total_price)
      : null;
  const calculated =
    repair.calculated_total_price != null && repair.calculated_total_price !== ''
      ? Number(repair.calculated_total_price)
      : null;

  const laborOk = labor != null && Number.isFinite(labor);
  const partsOk = parts != null && Number.isFinite(parts);
  const totalOk = total != null && Number.isFinite(total);
  const calculatedOk = calculated != null && Number.isFinite(calculated);

  if (laborOk || partsOk) {
    const sum = Math.round(((laborOk ? labor : 0) + (partsOk ? parts : 0)) * 100) / 100;
    if (laborOk && partsOk) {
      if (
        !totalOk ||
        Math.abs(total - labor) < 0.005 ||
        Math.abs(total - parts) < 0.005 ||
        total + 0.005 < sum
      ) {
        return sum;
      }
      return total;
    }
    if (!totalOk) return sum;
    return total;
  }
  if (totalOk) return total;
  if (calculatedOk) return calculated;
  return null;
}
