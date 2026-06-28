/**
 * Platform-generated public copy for shop discovery pages and SEO fields.
 * User-written `description` stays separate (their language; translation later).
 */

const DAY_ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const DAY_LABEL = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday',
};

function normalizeHoursMap(workingHours) {
  if (!workingHours || typeof workingHours !== 'object') return {};
  return workingHours;
}

function formatHoursLine(key, row) {
  if (!row || row.closed || (!row.start && !row.end)) {
    return `${DAY_LABEL[key]}: closed`;
  }
  const start = String(row.start || '').trim() || '?';
  const end = String(row.end || '').trim() || '?';
  return `${DAY_LABEL[key]}: ${start}–${end}`;
}

function summarizeWeekdayHours(hoursMap) {
  const weekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
  const open = weekdays
    .map((k) => hoursMap[k])
    .filter((r) => r && !r.closed && r.start && r.end);
  if (!open.length) return '';
  const first = open[0];
  const same = open.every((r) => r.start === first.start && r.end === first.end);
  if (same && open.length === weekdays.length) {
    return `weekdays ${first.start}–${first.end}`;
  }
  return weekdays
    .map((k) => formatHoursLine(k, hoursMap[k]))
    .filter(Boolean)
    .join('; ');
}

function listPhrase(items) {
  const list = (items || []).map((s) => String(s || '').trim()).filter(Boolean);
  if (!list.length) return '';
  if (list.length === 1) return list[0];
  if (list.length === 2) return `${list[0]} and ${list[1]}`;
  return `${list.slice(0, -1).join(', ')}, and ${list[list.length - 1]}`;
}

function formatPriceSuffix(item) {
  const from = item?.price_from;
  const to = item?.price_to;
  if (from != null && to != null && String(from) !== String(to)) {
    return ` (${from}–${to} EUR)`;
  }
  if (from != null) return ` (from ${from} EUR)`;
  if (to != null) return ` (from ${to} EUR)`;
  return '';
}

/** Map published menu rows by repair type name for price enrichment. */
function publishedMenuByName(publishedMenuItems) {
  const map = new Map();
  (publishedMenuItems || []).forEach((item) => {
    const name = String(item?.repair_type_name || item?.name || '').trim().toLowerCase();
    if (name) map.set(name, item);
  });
  return map;
}

/**
 * Classic "offering A, B, and C" phrase — published price list first (with prices),
 * then any profile services not already on the list.
 */
function buildRepairOfferPhrase(repairNames, publishedMenuItems) {
  const menuItems = (publishedMenuItems || [])
    .map((item) => ({
      name: String(item?.repair_type_name || item?.name || '').trim(),
      item,
    }))
    .filter((row) => row.name);

  const used = new Set();
  const fromMenu = menuItems.map(({ name, item }) => {
    used.add(name.toLowerCase());
    const suffix = formatPriceSuffix(item);
    return suffix ? `${name}${suffix}` : name;
  });

  const extras = (repairNames || [])
    .map((s) => String(s || '').trim())
    .filter(Boolean)
    .filter((name) => !used.has(name.toLowerCase()));

  const all = [...fromMenu, ...extras];
  if (!all.length) return '';
  return `, offering ${listPhrase(all)}`;
}

/** Legacy single `service_center_type` field — derived from selected vehicle types. */
export function deriveServiceCenterTypeFromVehicles(vehicleTypeNames) {
  const names = (vehicleTypeNames || []).map((s) => String(s || '').trim()).filter(Boolean);
  if (!names.length) return '';
  if (names.length === 1) {
    const n = names[0];
    return /service$/i.test(n) ? n : `${n} service center`;
  }
  return `${listPhrase(names)} service center`;
}

export function buildVehicleTypesSubtitle(vehicleTypeNames) {
  const names = (vehicleTypeNames || []).map((s) => String(s || '').trim()).filter(Boolean);
  if (!names.length) return 'Service center';
  return names.join(' · ');
}

/**
 * @param {object} input
 * @returns {{ summary: string, seoKeywords: string, seoCity: string, seoCountry: string }}
 */
export function buildShopGeneratedPublicProfile(input = {}) {
  const shopName = String(input.shopName || 'This service center').trim() || 'This service center';
  const vehicleTypes = input.vehicleTypeNames || [];
  const repairs = input.repairTypeNames || [];
  const cityName = String(input.cityName || '').trim();
  const countryName = String(input.countryName || '').trim();
  const address = String(input.address || '').trim();
  const hoursMap = normalizeHoursMap(input.workingHours);
  const offersGuarantee = input.offersGuarantee === true;
  const brands = input.brands || [];
  const allBrandsServiced = input.allBrandsServiced === true;

  const locationParts = [address, cityName, countryName].filter(Boolean);
  const locationPhrase = locationParts.length
    ? `located at ${locationParts.join(', ')}`
    : cityName || countryName
      ? `located in ${[cityName, countryName].filter(Boolean).join(', ')}`
      : '';

  const vehiclePhrase = vehicleTypes.length
    ? ` servicing ${listPhrase(vehicleTypes)}`
    : '';

  const repairPhrase = buildRepairOfferPhrase(repairs, input.publishedMenuItems);

  const hoursPhrase = summarizeWeekdayHours(hoursMap);
  const hoursText = hoursPhrase
    ? ` You can reach us ${hoursPhrase}.`
    : '';

  const weekendClosed =
    (hoursMap.saturday?.closed || !hoursMap.saturday?.start) &&
    (hoursMap.sunday?.closed || !hoursMap.sunday?.start);
  const weekendNote = weekendClosed ? ' Saturday and Sunday are closed.' : '';

  const guaranteeText = offersGuarantee
    ? ' Work can be provided with a service guarantee when agreed in the app.'
    : '';

  const brandPhrase = allBrandsServiced
    ? ' We service all vehicle brands.'
    : brands.length
      ? ` Brands we work with include ${listPhrase(brands)}.`
      : '';

  const summary = `${shopName} is a service center${vehiclePhrase}${repairPhrase}${
    locationPhrase ? `, ${locationPhrase}` : ''
  }.${hoursText}${weekendNote}${guaranteeText}${brandPhrase} Contact and booking are available through Vehicle Repair Hub.`;

  const menuKeywords = (input.publishedMenuItems || [])
    .map((item) => item?.repair_type_name)
    .filter(Boolean);

  const keywordParts = [
    shopName,
    ...vehicleTypes,
    ...repairs,
    ...menuKeywords,
    ...(allBrandsServiced ? ['all brands', 'any make'] : brands),
    cityName,
    countryName,
    'auto repair',
    'service center',
    (input.publishedMenuItems || []).length ? 'price list' : null,
    offersGuarantee ? 'warranty' : null,
  ]
    .map((s) => String(s || '').trim())
    .filter(Boolean);

  const seoKeywords = [...new Set(keywordParts.map((s) => s.toLowerCase()))]
    .slice(0, 24)
    .join(', ');

  return {
    summary: summary.replace(/\s+/g, ' ').trim(),
    seoKeywords,
    seoCity: cityName,
    seoCountry: countryName,
  };
}
