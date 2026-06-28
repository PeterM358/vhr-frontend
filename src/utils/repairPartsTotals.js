/** Sum line-item parts and labor from repair part rows (draft or saved). */
export function computePartsTotals(parts) {
  let partsSum = 0;
  let laborSum = 0;

  for (const part of parts || []) {
    const qty = parseInt(part.quantity, 10) || 1;
    const price =
      parseFloat(part.price ?? part.price_per_item_at_use ?? part.price_per_item) || 0;
    const labor = parseFloat(part.labor ?? part.labor_cost) || 0;
    partsSum += price * qty;
    laborSum += labor * qty;
  }

  return {
    partsSum: Math.round(partsSum * 100) / 100,
    laborSum: Math.round(laborSum * 100) / 100,
    total: Math.round((partsSum + laborSum) * 100) / 100,
  };
}

export function partCatalogSubtitle(item) {
  const name = String(item?.name || '').trim();
  const brand = String(item?.brand || '').trim();
  if (brand && brand.toLowerCase() !== name.toLowerCase()) {
    return brand;
  }
  const pn = String(item?.part_number || '').trim();
  if (pn) return `P/N ${pn}`;
  const category = String(item?.category || '').trim();
  if (category) return category;
  return undefined;
}
