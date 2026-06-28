/**
 * Sort cities for picker — prioritizes major BG cities when country is Bulgaria.
 */
export function sortCitiesForPicker(cities, countryName) {
  const base = Array.isArray(cities) ? [...cities] : [];
  if (!/bulgaria/i.test(String(countryName || ''))) {
    return base.sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
  }
  const priority = ['sofia', 'plovdiv', 'varna', 'burgas'];
  const rank = (name) => {
    const idx = priority.indexOf(String(name || '').trim().toLowerCase());
    return idx === -1 ? 999 : idx;
  };
  return base.sort((a, b) => {
    const r = rank(a.name) - rank(b.name);
    if (r !== 0) return r;
    return String(a.name || '').localeCompare(String(b.name || ''));
  });
}
