/**
 * Maps backend ``vehicle.health`` payloads to UI presentation.
 * Health rules live in the API — keep icons/colors here only.
 */

const STATUS_CONFIG = {
  healthy: {
    label: 'Healthy',
    icon: 'check-circle-outline',
    color: '#059669',
    bg: 'rgba(5,150,105,0.1)',
    border: 'rgba(5,150,105,0.35)',
  },
  maintenance_recommended: {
    label: 'Maintenance recommended',
    icon: 'wrench-clock',
    color: '#d97706',
    bg: 'rgba(217,119,6,0.1)',
    border: 'rgba(217,119,6,0.35)',
  },
  needs_attention: {
    label: 'Needs attention',
    icon: 'alert-circle-outline',
    color: '#dc2626',
    bg: 'rgba(220,38,38,0.1)',
    border: 'rgba(220,38,38,0.35)',
  },
};

const ACTION_LABELS = {
  update_km: { label: 'Update kilometers', icon: 'speedometer' },
  log_service: { label: 'Add service history', icon: 'book-plus-outline' },
  schedule: { label: 'Schedule maintenance', icon: 'calendar-clock' },
  book_repair: { label: 'Book repair', icon: 'wrench' },
  reminders: { label: 'Configure reminders', icon: 'bell-outline' },
};

export function vehicleDisplayTitle(vehicle) {
  const catalog = [vehicle?.catalog_brand_name, vehicle?.catalog_model_name].filter(Boolean).join(' ');
  if (catalog) return catalog;
  const legacy = [vehicle?.make_name || vehicle?.make, vehicle?.model_name || vehicle?.model]
    .filter(Boolean)
    .join(' ');
  return legacy || 'Your vehicle';
}

export function mapHealthFromApi(vehicle) {
  const raw = vehicle?.health;
  if (!raw || typeof raw !== 'object') {
    return fallbackHealth();
  }

  const status = raw.status || 'healthy';
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.healthy;
  const issues = Array.isArray(raw.issues) ? raw.issues : [];

  return {
    status,
    ...cfg,
    status_label: raw.status_label || cfg.label,
    subtitle: raw.subtitle || cfg.label,
    shortReason: raw.dashboard_summary || raw.subtitle || cfg.label,
    reasons: issues.map((row) => ({
      key: row.key,
      label: row.label,
      severity: row.severity,
      icon: row.icon || 'alert-circle-outline',
    })),
    actions: healthActionButtonsFromApi(raw),
  };
}

function fallbackHealth() {
  const cfg = STATUS_CONFIG.healthy;
  return {
    status: 'healthy',
    ...cfg,
    status_label: cfg.label,
    subtitle: 'No urgent issues found.',
    shortReason: 'No urgent issues found.',
    reasons: [],
    actions: healthActionButtonsFromApi({ status: 'healthy', actions: ['log_service'] }),
  };
}

export function healthActionButtonsFromApi(health) {
  const keys = Array.isArray(health?.actions) ? health.actions : [];
  return keys
    .map((key) => {
      const meta = ACTION_LABELS[key];
      if (!meta) return null;
      return { key, ...meta };
    })
    .filter(Boolean);
}

/** @deprecated Use mapHealthFromApi(vehicle) — health is computed on the backend. */
export function computeVehicleHealth() {
  return fallbackHealth();
}

/** @deprecated Use healthActionButtonsFromApi */
export function healthActionButtons(health) {
  return healthActionButtonsFromApi(health);
}
