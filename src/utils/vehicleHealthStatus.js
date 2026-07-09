/**
 * Maps backend vehicle health payloads to UI presentation.
 * Health rules live in the API — keep icons/colors here only.
 */

import { isTerminalRepairStatus, isVehicleAtShop } from './repairArrival';
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
  return repair?.vehicle ?? repair?.vehicle_id ?? null;
}

/** When a vehicle has a non-terminal repair, show in-service instead of needs-attention. */
export function applyActiveRepairHealthOverride(health, vehicleId, activeRepairs = []) {
  const vid = vehicleId != null ? Number(vehicleId) : null;
  if (vid == null || Number.isNaN(vid)) return health;

  const activeRepair = (activeRepairs || []).find((repair) => {
    if (Number(repairVehicleId(repair)) !== vid) return false;
    return !isTerminalRepairStatus(repair?.status);
  });
  if (!activeRepair) return health;

  const atShop = isVehicleAtShop(activeRepair);
  const cfg = inServiceHealth(atShop);
  const shortReason = atShop
    ? t('health.subtitle.at_service_center')
    : activeRepair.scheduled_start
      ? t('health.subtitle.in_service_scheduled')
      : t('health.subtitle.in_service');

  return {
    ...health,
    status: 'in_service',
    ...cfg,
    status_label: cfg.label,
    subtitle: shortReason,
    shortReason,
    reasons: [],
    actions: [],
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
  const catalog = [vehicle?.catalog_brand_name, vehicle?.catalog_model_name].filter(Boolean).join(' ');
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
