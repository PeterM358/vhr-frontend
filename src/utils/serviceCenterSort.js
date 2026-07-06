/**
 * Client-side sort fallback when API sort param is unavailable.
 */

export function sortDiscoveryItems(items, sort = 'recommended') {
  const rows = Array.isArray(items) ? [...items] : [];
  if (sort === 'distance') {
    return rows.sort((a, b) => {
      const da = a.distance_km ?? 9999;
      const db = b.distance_km ?? 9999;
      if (da !== db) return da - db;
      return (b.rank_score || 0) - (a.rank_score || 0);
    });
  }
  if (sort === 'rating') {
    return rows.sort((a, b) => {
      const ra = Number(a.average_rating || 0);
      const rb = Number(b.average_rating || 0);
      if (rb !== ra) return rb - ra;
      return (a.distance_km ?? 9999) - (b.distance_km ?? 9999);
    });
  }
  return rows.sort((a, b) => {
    const scoreDiff = (b.rank_score || 0) - (a.rank_score || 0);
    if (scoreDiff !== 0) return scoreDiff;
    return (a.distance_km ?? 9999) - (b.distance_km ?? 9999);
  });
}
