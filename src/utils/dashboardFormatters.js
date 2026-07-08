import {
  applyActiveRepairHealthOverride,
  mapHealthFromApi,
  vehicleDisplayTitle,
} from './vehicleHealthStatus';
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
  active_repairs: {
    titleKey: 'dashboard.recommendedActions.titles.activeRepair',
    ctaKey: 'dashboard.recommendedActions.cta.viewRequest',
    actionKey: 'book_repair',
  },
  denied_repairs: {
    titleKey: 'dashboard.recommendedActions.titles.repairNeedsAttention',
    ctaKey: 'dashboard.recommendedActions.cta.requestService',
    actionKey: 'book_repair',
  },
};

const SEVERITY_RANK = { needs_attention: 0, maintenance_recommended: 1, healthy: 2, in_service: 3 };

export function buildRecommendedActions(vehicles = [], activeRepairs = [], translateFn = t) {
  const actions = [];

  for (const vehicle of vehicles) {
    const health = applyActiveRepairHealthOverride(
      mapHealthFromApi(vehicle, translateFn),
      vehicle.id,
      activeRepairs
    );
    if (health.status === 'healthy' || health.status === 'in_service') continue;

    const vehicleName = vehicleDisplayTitle(vehicle, translateFn);
    for (const reason of health.reasons || []) {
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
      const key = `${item.vehicleId}-${item.title}`;
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
