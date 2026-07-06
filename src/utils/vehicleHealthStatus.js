/**
 * Maps backend vehicle health payloads to UI presentation.
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
  add_service_history: { label: 'Add service history', icon: 'book-plus-outline' },
  log_service: { label: 'Add service history', icon: 'book-plus-outline' },
  configure_reminders: { label: 'Configure reminders', icon: 'bell-outline' },
  reminders: { label: 'Configure reminders', icon: 'bell-outline' },
  schedule_maintenance: { label: 'Schedule maintenance', icon: 'calendar-clock' },
  schedule: { label: 'Schedule maintenance', icon: 'calendar-clock' },
  book_repair: { label: 'Book repair', icon: 'wrench' },
};

export function vehicleDisplayTitle(vehicle) {
  const catalog = [vehicle?.catalog_brand_name, vehicle?.catalog_model_name].filter(Boolean).join(' ');
  if (catalog) return catalog;
  const legacy = [vehicle?.make_name || vehicle?.make, vehicle?.model_name || vehicle?.model]
    .filter(Boolean)
    .join(' ');
  return legacy || 'Your vehicle';
}

function normalizeHealthRaw(vehicle) {
  if (vehicle?.health && typeof vehicle.health === 'object') {
    return vehicle.health;
  }
  if (vehicle?.health_status) {
    return {
      status: vehicle.health_status,
      status_label: STATUS_CONFIG[vehicle.health_status]?.label,
      short_reason: vehicle.short_reason,
      reasons: [],
      suggested_actions: [],
    };
  }
  return null;
}

export function mapHealthFromApi(vehicle) {
  const raw = normalizeHealthRaw(vehicle);
  if (!raw) {
    return fallbackHealth();
  }

  const status = raw.status || 'healthy';
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.healthy;
  const reasons = Array.isArray(raw.reasons) ? raw.reasons : Array.isArray(raw.issues) ? raw.issues : [];

  return {
    status,
    ...cfg,
    status_label: raw.status_label || cfg.label,
    subtitle: raw.subtitle || raw.short_reason || cfg.label,
    shortReason: raw.short_reason || raw.dashboard_summary || raw.subtitle || cfg.label,
    reasons: reasons.map((row) => ({
      key: row.key,
      label: row.label,
      severity: row.level || row.severity || 'maintenance',
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
    actions: healthActionButtonsFromApi({ status: 'healthy', suggested_actions: ['add_service_history'] }),
  };
}

export function healthActionButtonsFromApi(health) {
  const keys = Array.isArray(health?.suggested_actions)
    ? health.suggested_actions
    : Array.isArray(health?.actions)
      ? health.actions
      : [];
  return keys
    .map((key) => {
      const meta = ACTION_LABELS[key];
      if (!meta) return null;
      return { key, ...meta };
    })
    .filter(Boolean);
}
