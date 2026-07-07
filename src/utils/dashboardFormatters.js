import {
  applyActiveRepairHealthOverride,
  mapHealthFromApi,
  vehicleDisplayTitle,
} from './vehicleHealthStatus';

const REASON_ACTION_META = {
  oil_service_overdue: { title: 'Oil service due', cta: 'Request Service', actionKey: 'schedule_maintenance' },
  oil_service_due_soon: { title: 'Oil service due soon', cta: 'Request Service', actionKey: 'schedule_maintenance' },
  no_oil_service_history: { title: 'Add oil service history', cta: 'Add record', actionKey: 'add_service_history' },
  brake_check_overdue: { title: 'Brake inspection due', cta: 'Request Service', actionKey: 'schedule_maintenance' },
  brake_check_due_soon: { title: 'Brake inspection due soon', cta: 'Request Service', actionKey: 'schedule_maintenance' },
  no_brake_check_history: { title: 'Add brake service history', cta: 'Add record', actionKey: 'add_service_history' },
  mileage_missing: { title: 'Update mileage', cta: 'Update km', actionKey: 'update_km' },
  mileage_stale: { title: 'Mileage may be outdated', cta: 'Update km', actionKey: 'update_km' },
  no_reminders: { title: 'Set up reminders', cta: 'Configure', actionKey: 'configure_reminders' },
  active_repairs: { title: 'Active repair in progress', cta: 'View request', actionKey: 'book_repair' },
  denied_repairs: { title: 'Repair request needs attention', cta: 'Request Service', actionKey: 'book_repair' },
};

const SEVERITY_RANK = { needs_attention: 0, maintenance_recommended: 1, healthy: 2, in_service: 3 };

export function buildRecommendedActions(vehicles = [], activeRepairs = []) {
  const actions = [];

  for (const vehicle of vehicles) {
    const health = applyActiveRepairHealthOverride(
      mapHealthFromApi(vehicle),
      vehicle.id,
      activeRepairs
    );
    if (health.status === 'healthy' || health.status === 'in_service') continue;

    const vehicleName = vehicleDisplayTitle(vehicle);
    for (const reason of health.reasons || []) {
      const meta = REASON_ACTION_META[reason.key];
      if (!meta) {
        if (String(reason.key || '').startsWith('obligation_overdue_')) {
          actions.push({
            id: `${vehicle.id}-obligation-${reason.key}`,
            vehicleId: vehicle.id,
            vehicleName,
            title: reason.label || 'Obligation due',
            cta: 'Configure',
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
        title: meta.title,
        cta: meta.cta,
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
