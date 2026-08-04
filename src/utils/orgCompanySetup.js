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
  return ORG_ACCOUNT_TABS.includes(value) ? value : 'company';
}

/**
 * @param {object} input
 * @param {string[]} [input.activities]
 * @param {boolean} [input.publicEnabled]
 * @param {string} [input.publicSlug]
 * @param {boolean} [input.legalComplete]
 * @param {boolean} [input.isServiceCenter]
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
  const legalComplete = Boolean(input.legalComplete);

  const items = [
    {
      id: 'activities',
      tab: 'activities',
      done: hasActivity,
      required: true,
    },
    {
      id: 'service_center',
      tab: 'activities',
      done: hasServiceCenter,
      required: isServiceCenter || !hasActivity,
      // Only treat as required when user is aiming for SC listing, or none selected yet.
      soft: !isServiceCenter && hasActivity,
    },
    {
      id: 'public_enabled',
      tab: 'public',
      done: publicEnabled,
      required: isServiceCenter,
      soft: !isServiceCenter,
    },
    {
      id: 'public_slug',
      tab: 'public',
      done: hasSlug,
      required: isServiceCenter,
      soft: !isServiceCenter,
    },
    {
      id: 'legal',
      tab: 'company',
      done: legalComplete,
      required: true,
    },
  ];

  const scored = items.filter((row) => row.required && !row.soft);
  const doneCount = scored.filter((row) => row.done).length;
  const total = scored.length || 1;
  const percent = Math.round((doneCount / total) * 100);
  const next = scored.find((row) => !row.done) || null;
  const listingReady =
    hasServiceCenter && publicEnabled && hasSlug && legalComplete;

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
  };
}
