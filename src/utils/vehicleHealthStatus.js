/**
 * Maps backend vehicle health payloads to UI presentation.
 * Health rules live in the API — keep icons/colors here only.
 *
 * FE override: active repairs split into incoming (future appointment),
 * in-service / at shop, otherwise leave API status (usually needs_attention).
 */

import {
  formatAppointmentCountdown,
  isStaleMissedAppointment,
  isTerminalRepairStatus,
  isUpcomingAppointment,
  isVehicleAtShop,
} from './repairArrival';
import {
  t,
  translateHealthAction,
  translateHealthReason,
  translateHealthStatus,
} from '../i18n';

function statusConfig(translateFn = t) {
  return {
    healthy: {
      label: translateFn('health.status.healthy'),
      icon: 'check-circle-outline',
      color: '#059669',
      bg: 'rgba(5,150,105,0.1)',
      border: 'rgba(5,150,105,0.35)',
    },
    maintenance_recommended: {
      label: translateFn('health.status.maintenance_recommended'),
      icon: 'wrench-clock',
      color: '#d97706',
      bg: 'rgba(217,119,6,0.1)',
      border: 'rgba(217,119,6,0.35)',
    },
    needs_attention: {
      label: translateFn('health.status.needs_attention'),
      icon: 'alert-circle-outline',
      color: '#dc2626',
      bg: 'rgba(220,38,38,0.1)',
      border: 'rgba(220,38,38,0.35)',
    },
    incoming_service: {
      label: translateFn('health.status.incoming_service'),
      icon: 'calendar-clock',
      color: '#2563eb',
      bg: 'rgba(37,99,235,0.1)',
      border: 'rgba(37,99,235,0.35)',
    },
    missed_appointment: {
      label: translateFn('health.status.missed_appointment'),
      icon: 'calendar-remove',
      color: '#b45309',
      bg: 'rgba(180,83,9,0.12)',
      border: 'rgba(180,83,9,0.45)',
    },
    in_service: {
      label: translateFn('health.status.in_service'),
      icon: 'car-wrench',
      color: '#059669',
      bg: 'rgba(5,150,105,0.1)',
      border: 'rgba(5,150,105,0.35)',
    },
  };
}

function inServiceHealth(atShop, translateFn = t) {
  const label = atShop
    ? translateFn('health.status.at_service_center')
    : translateFn('health.status.in_service');
  return {
    label,
    icon: atShop ? 'store-check' : 'car-wrench',
    color: '#059669',
    bg: 'rgba(5,150,105,0.1)',
    border: 'rgba(5,150,105,0.35)',
  };
}

function repairVehicleId(repair) {
  const raw = repair?.vehicle ?? repair?.vehicle_id ?? null;
  if (raw == null) return null;
  if (typeof raw === 'object') {
    const nested = raw.id ?? raw.pk ?? null;
    return nested == null ? null : Number(nested);
  }
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

/** Prefer at-shop, then soonest upcoming appointment, then any open repair. */
export function pickPrimaryActiveRepair(vehicleId, activeRepairs = []) {
  const vid = vehicleId != null ? Number(vehicleId) : null;
  if (vid == null || Number.isNaN(vid)) return null;

  const forVehicle = (activeRepairs || []).filter((repair) => {
    if (repairVehicleId(repair) !== vid) return false;
    return !isTerminalRepairStatus(repair?.status);
  });
  if (!forVehicle.length) return null;

  const atShop = forVehicle.find((r) => isVehicleAtShop(r));
  if (atShop) return atShop;

  const upcoming = forVehicle
    .filter((r) => isUpcomingAppointment(r))
    .sort((a, b) => new Date(a.scheduled_start) - new Date(b.scheduled_start));
  if (upcoming[0]) return upcoming[0];

  const stale = forVehicle
    .filter((r) => isStaleMissedAppointment(r))
    .sort((a, b) => new Date(b.scheduled_start) - new Date(a.scheduled_start));
  if (stale[0]) return stale[0];

  return forVehicle[0];
}

/** When a vehicle has a non-terminal repair, refine health for home/detail cards. */
export function applyActiveRepairHealthOverride(health, vehicleId, activeRepairs = []) {
  const activeRepair = pickPrimaryActiveRepair(vehicleId, activeRepairs);
  if (!activeRepair) return health;

  const atShop = isVehicleAtShop(activeRepair);
  if (atShop) {
    const cfg = inServiceHealth(true);
    return {
      ...health,
      status: 'in_service',
      ...cfg,
      status_label: cfg.label,
      subtitle: t('health.subtitle.at_service_center'),
      shortReason: t('health.subtitle.at_service_center'),
      reasons: [],
      actions: [],
      primaryRepairId: activeRepair.id,
    };
  }

  if (isUpcomingAppointment(activeRepair)) {
    const cfg = statusConfig().incoming_service;
    const countdown = formatAppointmentCountdown(activeRepair.scheduled_start, t);
    const subtitle =
      countdown ||
      t('health.subtitle.incoming_service', null, 'Scheduled service appointment coming up.');
    return {
      ...health,
      status: 'incoming_service',
      ...cfg,
      status_label: cfg.label,
      subtitle,
      shortReason: subtitle,
      reasons: [],
      actions: [],
      primaryRepairId: activeRepair.id,
    };
  }

  if (isStaleMissedAppointment(activeRepair)) {
    const cfg = statusConfig().missed_appointment;
    const subtitle = t(
      'health.subtitle.missed_appointment',
      null,
      'Scheduled visit passed — close it or confirm the car arrived.'
    );
    return {
      ...health,
      status: 'missed_appointment',
      ...cfg,
      status_label: cfg.label,
      subtitle,
      shortReason: subtitle,
      reasons: [],
      actions: [],
      primaryRepairId: activeRepair.id,
    };
  }

  // Open request without a confirmed slot — keep API health (usually needs_attention).
  return {
    ...health,
    primaryRepairId: activeRepair.id,
  };
}

/** Accent tokens for white health cards — left border + icon tint. */
export function getHealthStatusAccent(status) {
  const cfg = statusConfig()[status] || statusConfig().healthy;
  return {
    color: cfg.color,
    borderColor: cfg.border,
    bgTint: cfg.bg,
  };
}

const ACTION_ICONS = {
  update_km: 'speedometer',
  add_service_history: 'book-plus-outline',
  log_service: 'book-plus-outline',
  configure_reminders: 'bell-outline',
  reminders: 'bell-outline',
  schedule_maintenance: 'calendar-clock',
  schedule: 'calendar-clock',
  book_repair: 'wrench',
};

export function vehicleDisplayTitle(vehicle, translateFn = t) {
  const catalog = [
    vehicle?.catalog_brand_name,
    vehicle?.catalog_model_name,
    vehicle?.catalog_generation_name,
  ]
    .filter(Boolean)
    .join(' ');
  if (catalog) return catalog;
  const legacy = [vehicle?.make_name || vehicle?.make, vehicle?.model_name || vehicle?.model]
    .filter(Boolean)
    .join(' ');
  return legacy || translateFn('vehicles.yourVehicle');
}

function normalizeHealthRaw(vehicle) {
  if (vehicle?.health && typeof vehicle.health === 'object') {
    return vehicle.health;
  }
  if (vehicle?.health_status) {
    return {
      status: vehicle.health_status,
      status_label: translateHealthStatus(vehicle.health_status),
      short_reason: vehicle.short_reason,
      short_reason_key: vehicle.short_reason_key,
      reasons: vehicle.short_reason_key
        ? [{ key: vehicle.short_reason_key, label: vehicle.short_reason }]
        : [],
      suggested_actions: [],
    };
  }
  return null;
}

export function mapHealthFromApi(vehicle, translateFn = t) {
  const raw = normalizeHealthRaw(vehicle);
  if (!raw) {
    return fallbackHealth(translateFn);
  }

  const status = raw.status || 'healthy';
  const cfg = statusConfig(translateFn)[status] || statusConfig(translateFn).healthy;
  const reasons = Array.isArray(raw.reasons) ? raw.reasons : Array.isArray(raw.issues) ? raw.issues : [];
  const subtitleKey = `health.subtitle.${status}`;
  const defaultSubtitle = translateFn(subtitleKey, null, raw.subtitle || cfg.label);
  const mappedReasons = reasons.map((row) => ({
    key: row.key,
    label: translateHealthReason(row, translateFn),
    severity: row.level || row.severity || 'maintenance',
    icon: row.icon || 'alert-circle-outline',
  }));
  const translatedSubtitle = raw.short_reason
    ? translateHealthReason(
        {
          key: reasons[0]?.key || raw.short_reason_key,
          label: raw.short_reason,
        },
        translateFn
      )
    : defaultSubtitle;

  return {
    status,
    ...cfg,
    status_label: raw.status_label
      ? translateHealthStatus(status, translateFn)
      : cfg.label,
    subtitle: translatedSubtitle,
    shortReason: translatedSubtitle,
    reasons: mappedReasons,
    actions: healthActionButtonsFromApi(raw, translateFn),
  };
}

function fallbackHealth(translateFn = t) {
  const cfg = statusConfig(translateFn).healthy;
  return {
    status: 'healthy',
    ...cfg,
    status_label: cfg.label,
    subtitle: translateFn('health.subtitle.healthy'),
    shortReason: translateFn('health.subtitle.healthy'),
    reasons: [],
    actions: healthActionButtonsFromApi(
      { status: 'healthy', suggested_actions: ['add_service_history'] },
      translateFn
    ),
  };
}

export function healthActionButtonsFromApi(health, translateFn = t) {
  const keys = Array.isArray(health?.suggested_actions)
    ? health.suggested_actions
    : Array.isArray(health?.actions)
      ? health.actions
      : [];
  return keys
    .map((key) => {
      const label = translateHealthAction(key, translateFn);
      const icon = ACTION_ICONS[key];
      if (!icon) return null;
      return { key, label, icon };
    })
    .filter(Boolean);
}
