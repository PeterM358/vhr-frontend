/**
 * List/chip labels for materials: name + current SKU only.
 * Old material numbers stay on detail views via part_number_alias (or extracted suffix).
 */

const OLD_MATERIAL_SUFFIX_RE = /\s*[·•]\s*(?:old|стар)(?:\s+\S+)?\s*$/i;

export function stripOldMaterialSuffix(text) {
  const raw = String(text || '').trim();
  if (!raw) return '';
  const cleaned = raw
    .replace(OLD_MATERIAL_SUFFIX_RE, '')
    .trim()
    .replace(/[·•]\s*$/, '')
    .trim();
  return cleaned || raw;
}

export function extractOldMaterialNumber(text) {
  const raw = String(text || '').trim();
  if (!raw) return '';
  const match = raw.match(/\s*[·•]\s*(?:old|стар)\s+(\S+)\s*$/i);
  return match ? match[1] : '';
}

/**
 * @param {object|null|undefined} row - material / stock / brief
 * @param {{ fallbackId?: number|string, includeSku?: boolean }} [opts]
 */
export function formatMaterialListLabel(row, opts = {}) {
  const { fallbackId, includeSku = true } = opts;
  if (!row) {
    return fallbackId != null ? `#${fallbackId}` : '';
  }
  const rawName =
    row.label ||
    row.name ||
    row.material?.name ||
    row.material?.label ||
    '';
  const cleaned = stripOldMaterialSuffix(rawName);
  const id = fallbackId ?? row.id ?? row.material_id ?? row.material?.id;
  const name = cleaned || (id != null ? `Material #${id}` : '');
  if (!includeSku) return name;
  const sku =
    row.part_number ||
    row.material?.part_number ||
    row.shop_sku ||
    row.org_sku ||
    '';
  return sku ? `${name} (${sku})` : name;
}
