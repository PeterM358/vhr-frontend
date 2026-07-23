/** Maps backend `mileage_confidence` payload to display helpers. */

const CATEGORY_HINT_KEYS = {
  low: 'mileageConfidence.hints.low',
  medium: 'mileageConfidence.hints.medium',
  high: 'mileageConfidence.hints.high',
  verified_history: 'mileageConfidence.hints.verified_history',
};

const CATEGORY_PILL = {
  low: { bg: 'rgba(100,116,139,0.35)', fg: '#E2E8F0', border: 'rgba(148,163,184,0.5)' },
  medium: { bg: 'rgba(245,158,11,0.28)', fg: '#FEF3C7', border: 'rgba(251,191,36,0.45)' },
  high: { bg: 'rgba(22,163,74,0.32)', fg: '#DCFCE7', border: 'rgba(74,222,128,0.4)' },
  verified_history: { bg: 'rgba(15,76,129,0.38)', fg: '#DBEAFE', border: 'rgba(63,169,245,0.5)' },
};

export function mileageConfidenceCategoryHint(category, translateFn) {
  if (!translateFn) {
    const legacy = {
      low: 'Add service records, receipts, or optional odometer photos over time.',
      medium: 'History is building — shop confirmations and documents raise confidence.',
      high: 'Solid history — keep attaching proof when you have it.',
      verified_history: 'Strong corroborated history for this vehicle.',
    };
    return legacy[category] || '';
  }
  const key = CATEGORY_HINT_KEYS[category];
  return key ? translateFn(key, null, '') : '';
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

export function heroConfidenceSubtitle(conf, translateFn) {
  if (!conf || typeof conf !== 'object') return null;
  const done = conf.done_service_records ?? 0;
  const workshop = conf.workshop_attributed_records ?? 0;
  const parts = [];
  if (done) {
    const recordLabel =
      done === 1
        ? translateFn?.('mileageConfidence.serviceRecords', { count: done }, `${done} service record`)
        : translateFn?.(
            'mileageConfidence.serviceRecords_plural',
            { count: done },
            `${done} service records`
          ) || `${done} service record${done === 1 ? '' : 's'}`;
    parts.push(recordLabel);
  }
  if (workshop) {
    parts.push(
      translateFn?.('mileageConfidence.withWorkshop', { count: workshop }, `${workshop} with workshop`) ||
        `${workshop} with workshop`
    );
  }
  if (!parts.length) {
    return translateFn?.('mileageConfidence.tapToImprove', null, 'Tap to improve mileage confidence') || null;
  }
  const tapHint =
    translateFn?.('mileageConfidence.tapForDetails', null, 'tap for details') || 'tap for details';
  return `${parts.join(' · ')} · ${tapHint}`;
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
