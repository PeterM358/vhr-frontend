/**
 * Display shop legal / trading name with quotes for Ltd, EOOD, etc.
 * Future backend: prefer `display_name` / `public_name_bg` / `public_name_en` when exposed;
 * see docs/profile-name-plate-handling.md.
 */
export function formatShopDisplayName(name) {
  const t = String(name || '').trim();
  if (!t) return 'Service center';
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith('“') && t.endsWith('”'))) {
    return t;
  }
  return `"${t}"`;
}
