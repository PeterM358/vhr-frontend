/**
 * FE-only company setup completion for organization service centers.
 * Uses existing activities / public-profile / legal-entity payloads.
 */

export const ORG_ACCOUNT_TABS = ['company', 'activities', 'public', 'account'];

export function normalizeOrgAccountTab(raw) {
  const value = String(raw || '').trim().toLowerCase();
  if (value === 'legal' || value === 'details' || value === 'company') return 'company';
  if (value === 'activity' || value === 'activities') return 'activities';
  if (value === 'public-profile' || value === 'public_profile' || value === 'listing') {
    return 'public';
  }
  if (value === 'profile' || value === 'my-account' || value === 'account') return 'account';
  if (value === 'location' || value === 'address' || value === 'map') return 'company';
  return ORG_ACCOUNT_TABS.includes(value) ? value : 'company';
}

/**
 * Honest setup checklist. Does not double-count activities + service_center.
 * Public enabled+slug is one listing item. Location uses shop pin or legal address.
 *
 * @param {object} input
 * @param {string[]} [input.activities]
 * @param {boolean} [input.publicEnabled]
 * @param {string} [input.publicSlug]
 * @param {boolean} [input.legalComplete]
 * @param {boolean} [input.locationComplete]
 * @param {boolean} [input.isServiceCenter]
 * @param {boolean} [input.loadFailed] — when APIs failed, never inflate % from guesses
 */
export function buildOrgCompanySetupChecklist(input = {}) {
  const activities = Array.isArray(input.activities) ? input.activities : [];
  const isServiceCenter =
    Boolean(input.isServiceCenter) || activities.includes('service_center');
  const hasActivity = activities.length > 0;
  const hasServiceCenter = activities.includes('service_center');
  const publicEnabled = Boolean(input.publicEnabled);
  const slug = String(input.publicSlug || '').trim();
  const hasSlug = Boolean(slug);
  const publicReady = publicEnabled && hasSlug;
  const legalComplete = Boolean(input.legalComplete);
  const locationComplete = Boolean(input.locationComplete);
  const loadFailed = Boolean(input.loadFailed);

  const items = [
    {
      id: 'activities',
      tab: 'activities',
      done: hasActivity,
      required: true,
    },
    {
      id: 'legal',
      tab: 'company',
      done: legalComplete,
      required: true,
    },
  ];

  if (isServiceCenter || hasServiceCenter || !hasActivity) {
    items.push({
      id: 'location',
      tab: 'company',
      done: locationComplete,
      required: isServiceCenter || hasServiceCenter || !hasActivity,
      soft: !(isServiceCenter || hasServiceCenter) && hasActivity,
    });
    items.push({
      id: 'public_listing',
      tab: 'public',
      // One item: both enabled + slug — avoids 40% from activity alone looking “half done”.
      done: publicReady,
      required: isServiceCenter || hasServiceCenter,
      soft: !(isServiceCenter || hasServiceCenter),
    });
  }

  const scored = items.filter((row) => row.required && !row.soft);
  const doneCount = scored.filter((row) => row.done).length;
  const total = scored.length || 1;
  // If hub APIs failed, cap displayed progress at completed known items but never
  // claim listing-ready; percent still reflects only items we can verify as done.
  const percent = loadFailed && doneCount === 0
    ? 0
    : Math.round((doneCount / total) * 100);
  const next = scored.find((row) => !row.done) || null;
  const listingReady =
    !loadFailed &&
    hasServiceCenter &&
    publicReady &&
    legalComplete &&
    locationComplete;

  return {
    isServiceCenter,
    items,
    scored,
    doneCount,
    total,
    percent,
    next,
    listingReady,
    missing: scored.filter((row) => !row.done),
    loadFailed,
  };
}

/** Location done when a shop pin exists or registered address+city is filled. */
export function isOrgLocationComplete({
  hasShopLocations = false,
  addressLine = '',
  city = '',
} = {}) {
  if (hasShopLocations) return true;
  return Boolean(String(addressLine || '').trim() && String(city || '').trim());
}
