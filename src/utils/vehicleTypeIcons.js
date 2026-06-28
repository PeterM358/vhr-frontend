/** Emoji / label helpers for vehicle type chips. */

const EMOJI_BY_CODE = {
  car: '🚗',
  truck: '🚚',
  van: '🚐',
  motorcycle: '🏍️',
  bike: '🏍️',
  bicycle: '🚲',
  ebike: '⚡',
  scooter: '🛵',
  trailer: '🛞',
  agricultural: '🚜',
  agriculturalvehicle: '🚜',
  construction: '🏗️',
  constructionvehicle: '🏗️',
  other: '🔧',
};

function normalizeKey(code, name) {
  return String(code || name || '')
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, '');
}

export function vehicleTypeEmoji(code, name) {
  const key = normalizeKey(code, name);
  if (EMOJI_BY_CODE[key]) return EMOJI_BY_CODE[key];
  if (key.includes('trailer')) return '🛞';
  if (key.includes('agricult')) return '🚜';
  if (key.includes('construct')) return '🏗️';
  if (key.includes('ebike') || key.includes('e-bike')) return '⚡';
  if (key.includes('scooter')) return '🛵';
  if (key.includes('motor')) return '🏍️';
  if (key.includes('bicycle') || key.includes('bike')) return '🚲';
  return '🔧';
}
