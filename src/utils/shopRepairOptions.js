/**
 * Repair type pickers for a shop detail / quick request flow.
 */

export function collectShopRepairOptions(shop) {
  const byId = new Map();

  const menu = Array.isArray(shop?.service_menu) ? shop.service_menu : [];
  menu.forEach((item) => {
    const id = Number(item?.repair_type_id ?? item?.repair_type);
    const name = String(item?.repair_type_name || item?.name || '').trim();
    if (id && name) byId.set(id, { id, name });
  });

  const ids = Array.isArray(shop?.available_repairs) ? shop.available_repairs : [];
  const names = Array.isArray(shop?.available_repair_names) ? shop.available_repair_names : [];
  ids.forEach((raw, index) => {
    const id = typeof raw === 'object' ? Number(raw?.id) : Number(raw);
    const name =
      String(names[index] || (typeof raw === 'object' ? raw?.name : '') || '').trim();
    if (id && name && !byId.has(id)) byId.set(id, { id, name });
  });

  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
}
