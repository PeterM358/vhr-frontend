/**
 * MVP vehicle health heuristics for dashboard + detail cards.
 * Uses repairs, reminders, mileage freshness, and service-history presence.
 * Replace or extend when backend exposes authoritative health scores,
 * richer service history, recalls, and inspection outcomes.
 */

const INACTIVE_REPAIR = new Set(['done', 'canceled', 'cancelled', 'denied']);

const STATUS_CONFIG = {
  healthy: {
    label: 'Healthy',
    icon: 'check-circle-outline',
    color: '#059669',
    bg: 'rgba(5,150,105,0.1)',
    border: 'rgba(5,150,105,0.35)',
    subtitle: 'No urgent issues found.',
    dashboardHint: 'No urgent issues found.',
  },
  maintenance_recommended: {
    label: 'Maintenance recommended',
    icon: 'wrench-clock',
    color: '#d97706',
    bg: 'rgba(217,119,6,0.1)',
    border: 'rgba(217,119,6,0.35)',
    subtitle: 'Add service history or reminders to improve insights.',
    dashboardHint: 'Add service history or reminders to improve insights.',
  },
  needs_attention: {
    label: 'Needs attention',
    icon: 'alert-circle-outline',
    color: '#dc2626',
    bg: 'rgba(220,38,38,0.1)',
    border: 'rgba(220,38,38,0.35)',
    subtitle: 'There are active items that may need review.',
    dashboardHint: 'There are active items that may need review.',
  },
};

function repairsForVehicle(repairs, vehicleId) {
  if (vehicleId == null) return [];
  return (repairs || []).filter(
    (row) => String(row.vehicle_id ?? row.vehicle ?? '') === String(vehicleId)
  );
}

function reminderRows(vehicle) {
  return Array.isArray(vehicle?.reminders) ? vehicle.reminders : [];
}

function isStaleMileage(vehicle) {
  const km = vehicle?.kilometers;
  if (km == null || km === '') return true;
  const updated = vehicle?.updated_at || vehicle?.kilometers_updated_at;
  if (!updated) return true;
  const ageDays = (Date.now() - new Date(updated).getTime()) / (1000 * 60 * 60 * 24);
  return ageDays > 180;
}

function hasServiceHistory(vehicle, repairs) {
  const completedFromSummary = Number(vehicle?.lifetime_summary?.completed_repairs);
  if (Number.isFinite(completedFromSummary) && completedFromSummary > 0) return true;
  return repairsForVehicle(repairs, vehicle?.id).some(
    (row) => String(row.status || '').toLowerCase() === 'done'
  );
}

function remindersPendingSetup(reminders) {
  if (!reminders.length) return true;
  return reminders.every((row) => {
    const status = String(row.ui_status || '').toLowerCase();
    if (status && status !== 'pending_setup') return false;
    return !row.due_date && (row.due_kilometers == null || row.due_kilometers === '');
  });
}

function dedupeReasons(rows) {
  const seen = new Set();
  return rows.filter((row) => {
    const key = row.key || row.label;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function buildResult(status, reasons) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.healthy;
  const uniqueReasons = dedupeReasons(reasons);
  const shortReason =
    uniqueReasons.length > 0
      ? uniqueReasons[0].label
      : status === 'maintenance_recommended'
        ? 'No recent service history or reminders configured yet.'
        : cfg.dashboardHint;

  return {
    status,
    ...cfg,
    reasons: uniqueReasons,
    shortReason,
  };
}

export function computeVehicleHealth(vehicle, { repairs = [] } = {}) {
  if (!vehicle) {
    return buildResult('healthy', []);
  }

  const vehicleRepairs = repairsForVehicle(repairs, vehicle.id);
  const activeRepairs = vehicleRepairs.filter(
    (row) => !INACTIVE_REPAIR.has(String(row.status || '').toLowerCase())
  );
  const reminders = reminderRows(vehicle);
  const overdueReminders = reminders.filter(
    (row) => String(row.ui_status || '').toLowerCase() === 'overdue'
  );
  const dueSoonReminders = reminders.filter(
    (row) => String(row.ui_status || '').toLowerCase() === 'due_soon'
  );
  const failedInspection = reminders.some((row) => {
    if (String(row.reminder_type) !== 'technical_inspection') return false;
    const status = String(row.ui_status || '').toLowerCase();
    const outcome = String(row.last_outcome || row.inspection_outcome || '').toLowerCase();
    return status === 'overdue' || outcome.includes('fail');
  });

  const attentionReasons = [];
  if (activeRepairs.length) {
    attentionReasons.push({
      key: 'active_repair',
      label: 'Active repair request',
      level: 'attention',
      icon: 'wrench',
    });
  }
  if (vehicleRepairs.some((row) => String(row.status || '').toLowerCase() === 'denied')) {
    attentionReasons.push({
      key: 'rejected_repair',
      label: 'Rejected repair request',
      level: 'attention',
      icon: 'close-circle-outline',
    });
  }
  if (failedInspection) {
    attentionReasons.push({
      key: 'failed_inspection',
      label: 'Failed inspection',
      level: 'attention',
      icon: 'clipboard-alert-outline',
    });
  }
  overdueReminders.forEach((row) => {
    if (['insurance', 'technical_inspection', 'road_tax', 'vignette'].includes(String(row.reminder_type))) {
      attentionReasons.push({
        key: `critical_overdue_${row.reminder_type}`,
        label: 'Critical reminder overdue',
        level: 'attention',
        icon: 'alert-circle-outline',
      });
    }
  });

  if (attentionReasons.length) {
    return buildResult('needs_attention', attentionReasons);
  }

  const maintenanceReasons = [];
  if (!hasServiceHistory(vehicle, repairs)) {
    maintenanceReasons.push({
      key: 'missing_history',
      label: 'Missing maintenance history',
      level: 'maintenance',
      icon: 'book-open-page-variant-outline',
    });
  }
  overdueReminders.forEach((row) => {
    maintenanceReasons.push({
      key: `overdue_${row.reminder_type || row.id}`,
      label: 'Service interval overdue',
      level: 'maintenance',
      icon: 'calendar-alert',
    });
  });
  if (dueSoonReminders.some((row) => String(row.reminder_type) === 'oil_service')) {
    maintenanceReasons.push({
      key: 'oil_approaching',
      label: 'Oil change approaching',
      level: 'maintenance',
      icon: 'engine-oil',
    });
  }
  if (remindersPendingSetup(reminders)) {
    maintenanceReasons.push({
      key: 'no_reminders',
      label: 'No reminders configured',
      level: 'maintenance',
      icon: 'bell-off-outline',
    });
  }
  if (isStaleMileage(vehicle)) {
    maintenanceReasons.push({
      key: 'stale_mileage',
      label: 'Mileage not updated recently',
      level: 'maintenance',
      icon: 'speedometer-slow',
    });
  }

  if (maintenanceReasons.length) {
    return buildResult('maintenance_recommended', maintenanceReasons);
  }

  return buildResult('healthy', []);
}

export function vehicleDisplayTitle(vehicle) {
  const catalog = [vehicle?.catalog_brand_name, vehicle?.catalog_model_name].filter(Boolean).join(' ');
  if (catalog) return catalog;
  const legacy = [vehicle?.make_name || vehicle?.make, vehicle?.model_name || vehicle?.model]
    .filter(Boolean)
    .join(' ');
  return legacy || 'Your vehicle';
}

export function healthActionButtons(health) {
  const reasons = health?.reasons || [];
  const keys = new Set(reasons.map((row) => row.key));
  const actions = [];

  const push = (action) => {
    if (!actions.some((row) => row.key === action.key)) actions.push(action);
  };

  if (health?.status !== 'healthy' || keys.has('stale_mileage')) {
    push({ key: 'update_km', label: 'Update kilometers', icon: 'speedometer' });
  }
  if (keys.has('missing_history')) {
    push({ key: 'log_service', label: 'Add service history', icon: 'book-plus-outline' });
  }
  if (
    keys.has('oil_approaching') ||
    [...keys].some((key) => String(key).startsWith('overdue_'))
  ) {
    push({ key: 'schedule', label: 'Schedule maintenance', icon: 'calendar-clock' });
  }
  if (keys.has('active_repair') || keys.has('rejected_repair')) {
    push({ key: 'book_repair', label: 'Book repair', icon: 'wrench' });
  }
  if (keys.has('no_reminders')) {
    push({ key: 'reminders', label: 'Configure reminders', icon: 'bell-outline' });
  }

  if (health?.status === 'healthy') {
    return actions.length ? actions : [{ key: 'log_service', label: 'Add service history', icon: 'book-plus-outline' }];
  }

  if (!actions.length) {
    push({ key: 'reminders', label: 'Configure reminders', icon: 'bell-outline' });
  }

  return actions;
}
