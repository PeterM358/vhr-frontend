import { sortRepairsByRecency } from './repairListUtils';
import { isTerminalRepairStatus, normalizeRepairStatus } from './repairArrival';
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

function formatRelativeServiceDate(raw) {
  if (!raw) return null;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return null;

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const startOfDate = new Date(date);
  startOfDate.setHours(0, 0, 0, 0);
  const diffDays = Math.round((startOfToday - startOfDate) / 86400000);

  if (diffDays <= 0) return 'Latest service today';
  if (diffDays === 1) return 'Latest service yesterday';
  if (diffDays < 7) return `Latest service ${diffDays} days ago`;
  return `Latest service ${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
}

export function buildServiceHistorySubtitle(completedRepairs = []) {
  const doneRows = (completedRepairs || []).filter(
    (repair) => normalizeRepairStatus(repair?.status) === 'done'
  );
  if (!doneRows.length) return 'No completed services yet';
  const latest = sortRepairsByRecency(doneRows, 'done')[0];
  return formatRelativeServiceDate(latest?.completed_at || latest?.created_at) || 'View completed services';
}

export function buildVehiclesTileSubtitle(vehicles = [], activeRepairs = []) {
  const count = vehicles.length;
  if (!count) return 'Add your first vehicle';

  const vehicleLabel = count === 1 ? '1 vehicle' : `${count} vehicles`;
  const maintenanceCount = vehicles.filter((vehicle) => {
    const health = applyActiveRepairHealthOverride(
      mapHealthFromApi(vehicle),
      vehicle.id,
      activeRepairs
    );
    return (
      health.status === 'maintenance_recommended' ||
      health.status === 'needs_attention'
    );
  }).length;

  if (!maintenanceCount) return vehicleLabel;
  const maintenanceLabel =
    maintenanceCount === 1 ? 'Maintenance: 1' : `Maintenance: ${maintenanceCount}`;
  return `${vehicleLabel} · ${maintenanceLabel}`;
}

export function buildRepairRequestsSubtitle({
  openCount = 0,
  offersCount = 0,
  completedCount = 0,
} = {}) {
  return `Open: ${openCount} · Offers: ${offersCount} · Completed: ${completedCount}`;
}

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
