import { t } from '../i18n';

const READINESS_CONFIG = {
  ready: {
    labelKey: 'fleet.readiness.ready',
    color: '#059669',
    bg: 'rgba(5,150,105,0.12)',
    icon: 'check-circle-outline',
  },
  expiring_soon: {
    labelKey: 'fleet.readiness.expiringSoon',
    color: '#d97706',
    bg: 'rgba(217,119,6,0.12)',
    icon: 'alert-outline',
  },
  not_ready: {
    labelKey: 'fleet.readiness.notReady',
    color: '#dc2626',
    bg: 'rgba(220,38,38,0.12)',
    icon: 'close-circle-outline',
  },
  unknown: {
    labelKey: 'fleet.readiness.unknown',
    color: '#64748b',
    bg: 'rgba(100,116,139,0.12)',
    icon: 'help-circle-outline',
  },
};

export function mapFleetReadiness(readiness, translateFn = t) {
  const status = readiness?.status || 'unknown';
  const config = READINESS_CONFIG[status] || READINESS_CONFIG.unknown;
  return {
    status,
    label: translateFn(config.labelKey),
    shortReason: readiness?.short_reason || translateFn(config.labelKey),
    color: config.color,
    bg: config.bg,
    icon: config.icon,
    nearestDeadline: readiness?.nearest_deadline || null,
    daysRemaining: readiness?.days_remaining,
    daysOverdue: readiness?.days_overdue,
  };
}

export function fleetVehicleTitle(item) {
  return item?.display_name || item?.license_plate || item?.fleet_id || `#${item?.id || ''}`;
}

export function maintenanceStatusLabel(status, translateFn = t) {
  const map = {
    overdue: 'fleet.maintenance.overdue',
    due_soon: 'fleet.maintenance.dueSoon',
    completed: 'fleet.maintenance.completed',
    no_data: 'fleet.maintenance.noData',
    pending_setup: 'fleet.maintenance.noData',
  };
  return translateFn(map[status] || 'fleet.maintenance.noData');
}

export function provenanceLabel(provenance, translateFn = t) {
  const map = {
    imported_from_fleet_register: 'fleet.provenance.imported',
    entered_manually: 'fleet.provenance.manual',
    confirmed_document: 'fleet.provenance.document',
    service_record: 'fleet.provenance.service',
  };
  return translateFn(map[provenance] || 'fleet.provenance.manual');
}
