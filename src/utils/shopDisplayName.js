/** Display shop legal / trading name with quotes for Ltd, EOOD, etc. */
export function formatShopDisplayName(name) {
  const t = String(name || '').trim();
  if (!t) return 'Service center';
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith('“') && t.endsWith('”'))) {
    return t;
  }
  return `"${t}"`;
}
