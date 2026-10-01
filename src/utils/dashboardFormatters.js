import {
  applyActiveRepairHealthOverride,
  mapHealthFromApi,
  vehicleDisplayTitle,
} from './vehicleHealthStatus';
import { isTerminalRepairStatus } from './repairArrival';
import { t } from '../i18n';

const REASON_ACTION_META = {
  oil_service_overdue: {
    titleKey: 'dashboard.recommendedActions.titles.oilServiceDue',
    ctaKey: 'dashboard.recommendedActions.cta.requestService',
    actionKey: 'schedule_maintenance',
  },
  oil_service_due_soon: {
    titleKey: 'dashboard.recommendedActions.titles.oilServiceDueSoon',
    ctaKey: 'dashboard.recommendedActions.cta.requestService',
    actionKey: 'schedule_maintenance',
  },
  no_oil_service_history: {
    titleKey: 'dashboard.recommendedActions.titles.addOilServiceHistory',
    ctaKey: 'dashboard.recommendedActions.cta.addRecord',
    actionKey: 'add_service_history',
  },
  brake_check_overdue: {
    titleKey: 'dashboard.recommendedActions.titles.brakeInspectionDue',
    ctaKey: 'dashboard.recommendedActions.cta.requestService',
    actionKey: 'schedule_maintenance',
  },
  brake_check_due_soon: {
    titleKey: 'dashboard.recommendedActions.titles.brakeInspectionDueSoon',
    ctaKey: 'dashboard.recommendedActions.cta.requestService',
    actionKey: 'schedule_maintenance',
  },
  no_brake_check_history: {
    titleKey: 'dashboard.recommendedActions.titles.addBrakeServiceHistory',
    ctaKey: 'dashboard.recommendedActions.cta.addRecord',
    actionKey: 'add_service_history',
  },
  mileage_missing: {
    titleKey: 'dashboard.recommendedActions.titles.updateMileage',
    ctaKey: 'dashboard.recommendedActions.cta.updateKm',
    actionKey: 'update_km',
  },
  mileage_stale: {
    titleKey: 'dashboard.recommendedActions.titles.mileageStale',
    ctaKey: 'dashboard.recommendedActions.cta.updateKm',
    actionKey: 'update_km',
  },
  no_reminders: {
    titleKey: 'dashboard.recommendedActions.titles.setupReminders',
    ctaKey: 'dashboard.recommendedActions.cta.configure',
    actionKey: 'configure_reminders',
  },
  denied_repairs: {
    titleKey: 'dashboard.recommendedActions.titles.repairNeedsAttention',
    ctaKey: 'dashboard.recommendedActions.cta.requestService',
    actionKey: 'book_repair',
  },
};

const SEVERITY_RANK = { needs_attention: 0, maintenance_recommended: 1, healthy: 2, in_service: 3 };

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

export function buildRecommendedActions(vehicles = [], activeRepairs = [], translateFn = t) {
  const actions = [];
  const vehiclesById = new Map(
    (vehicles || [])
      .filter((v) => v?.id != null)
      .map((v) => [Number(v.id), v])
  );

  // Active requests first — always deep-link to request detail (never CreateRepair).
  for (const repair of activeRepairs || []) {
    if (isTerminalRepairStatus(repair?.status)) continue;
    const vehicleId = repairVehicleId(repair);
    if (vehicleId == null) continue;
    const vehicle = vehiclesById.get(vehicleId);
    const vehicleName = vehicle
      ? vehicleDisplayTitle(vehicle, translateFn)
      : String(repair.vehicle_license_plate || '').trim() ||
        translateFn('dashboard.recommendedActions.vehicleFallback', null, 'Your vehicle');
    actions.push({
      id: `repair-${repair.id}`,
      vehicleId,
      repairId: repair.id,
      vehicleName,
      title: translateFn(
        'dashboard.recommendedActions.titles.activeRepair',
        null,
        'Active repair in progress'
      ),
      cta: translateFn('dashboard.recommendedActions.cta.viewRequest', null, 'View request'),
      actionKey: 'view_repair',
      severity: 'needs_attention',
      healthStatus: 'needs_attention',
    });
  }

  for (const vehicle of vehicles) {
    const health = applyActiveRepairHealthOverride(
      mapHealthFromApi(vehicle, translateFn),
      vehicle.id,
      activeRepairs
    );
    if (health.status === 'healthy' || health.status === 'in_service') continue;

    const vehicleName = vehicleDisplayTitle(vehicle, translateFn);
    for (const reason of health.reasons || []) {
      // Covered by explicit repair rows above.
      if (reason.key === 'active_repairs') continue;

      const meta = REASON_ACTION_META[reason.key];
      if (!meta) {
        if (String(reason.key || '').startsWith('obligation_overdue_')) {
          actions.push({
            id: `${vehicle.id}-obligation-${reason.key}`,
            vehicleId: vehicle.id,
            vehicleName,
            title:
              reason.label ||
              translateFn('dashboard.recommendedActions.titles.obligationDue', null, 'Obligation due'),
            cta: translateFn('dashboard.recommendedActions.cta.configure', null, 'Configure'),
            actionKey: 'configure_reminders',
            severity: reason.severity || 'maintenance',
            healthStatus: health.status,
          });
        }
        continue;
      }

      actions.push({
        id: `${vehicle.id}-${reason.key}`,
        vehicleId: vehicle.id,
        vehicleName,
        title: translateFn(meta.titleKey, null, reason.label || meta.titleKey),
        cta: translateFn(meta.ctaKey, null, meta.ctaKey),
        actionKey: meta.actionKey,
        severity: reason.severity || health.status,
        healthStatus: health.status,
      });
    }
  }

  const seen = new Set();
  return actions
    .filter((item) => {
      const key = `${item.actionKey}-${item.repairId || item.vehicleId}-${item.title}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => {
      const rankA = SEVERITY_RANK[a.healthStatus] ?? 9;
      const rankB = SEVERITY_RANK[b.healthStatus] ?? 9;
      return rankA - rankB;
    })
    .slice(0, 5);
}
