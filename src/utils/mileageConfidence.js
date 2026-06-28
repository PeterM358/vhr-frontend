/** Maps backend `mileage_confidence` payload to display helpers. */

const CATEGORY_HINT = {
  low: 'Add service records, receipts, or optional odometer photos over time.',
  medium: 'History is building — shop confirmations and documents raise confidence.',
  high: 'Solid history — keep attaching proof when you have it.',
  verified_history: 'Strong corroborated history for this vehicle.',
};

const CATEGORY_PILL = {
  low: { bg: 'rgba(100,116,139,0.35)', fg: '#E2E8F0', border: 'rgba(148,163,184,0.5)' },
  medium: { bg: 'rgba(245,158,11,0.28)', fg: '#FEF3C7', border: 'rgba(251,191,36,0.45)' },
  high: { bg: 'rgba(22,163,74,0.32)', fg: '#DCFCE7', border: 'rgba(74,222,128,0.4)' },
  verified_history: { bg: 'rgba(37,99,235,0.38)', fg: '#DBEAFE', border: 'rgba(96,165,250,0.5)' },
};

export function mileageConfidenceCategoryHint(category) {
  return CATEGORY_HINT[category] || '';
}

export function mileageConfidenceCategoryPill(category) {
  return CATEGORY_PILL[category] || CATEGORY_PILL.low;
}

export function factorIconName(status) {
  if (status === 'positive') return 'check-circle-outline';
  if (status === 'negative') return 'alert-circle-outline';
  if (status === 'neutral') return 'information-outline';
  return 'circle-outline';
}

export function factorIconColor(status) {
  if (status === 'positive') return '#15803d';
  if (status === 'negative') return '#b45309';
  if (status === 'neutral') return '#475569';
  return '#64748b';
}

export function warningIconColor() {
  return '#b45309';
}

export function factorIsActionable(factor) {
  return Boolean(factor?.action);
}

export function heroConfidenceSubtitle(conf) {
  if (!conf || typeof conf !== 'object') return null;
  const done = conf.done_service_records ?? 0;
  const workshop = conf.workshop_attributed_records ?? 0;
  const parts = [];
  if (done) {
    parts.push(`${done} service record${done === 1 ? '' : 's'}`);
  }
  if (workshop) {
    parts.push(`${workshop} with workshop`);
  }
  if (!parts.length) return 'Tap to improve mileage confidence';
  return `${parts.join(' · ')} · tap for details`;
}

/**
 * @returns {object|null} navigation intent for VehicleDetail handlers
 */
export function resolveMileageFactorAction(factor) {
  if (!factor?.action) return null;
  return {
    action: factor.action,
    repairId: factor.repair_id ?? null,
    actionLabel: factor.action_label || null,
  };
}
