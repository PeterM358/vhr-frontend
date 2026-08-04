/**
 * Lightweight assertions for SC org workspace helpers (no Jest harness).
 */
function assert(cond, msg) {
  if (!cond) throw new Error(msg || 'assertion failed');
}

const FLEET_ACTIVITY_KEYS = new Set(['transport', 'construction']);

function orgHasServiceCenterActivity(org) {
  if (!org) return false;
  const activities = Array.isArray(org.activities) ? org.activities : [];
  return activities.includes('service_center');
}

function isServiceCenterOnlyOrg(org) {
  if (!org) return false;
  if (!orgHasServiceCenterActivity(org)) return false;
  const activities = Array.isArray(org.activities) ? org.activities : [];
  return !activities.some((key) => FLEET_ACTIVITY_KEYS.has(key));
}

function orgShowsFleetSurfaces(org) {
  if (!org || isServiceCenterOnlyOrg(org)) return false;
  const activities = Array.isArray(org.activities) ? org.activities : [];
  if (activities.some((key) => FLEET_ACTIVITY_KEYS.has(key))) return true;
  if (activities.includes('other') && !activities.includes('service_center')) return true;
  const modules = Array.isArray(org.enabled_modules) ? org.enabled_modules : [];
  return modules.includes('fleet');
}

function orgShowsConstructionOpsSurfaces(org) {
  if (!org || isServiceCenterOnlyOrg(org)) return false;
  const activities = Array.isArray(org.activities) ? org.activities : [];
  if (activities.some((key) => FLEET_ACTIVITY_KEYS.has(key) || key === 'other')) return true;
  const modules = Array.isArray(org.enabled_modules) ? org.enabled_modules : [];
  return modules.includes('operations') && modules.includes('fleet');
}

assert(orgHasServiceCenterActivity({ activities: ['service_center'] }));
assert(orgHasServiceCenterActivity({ activities: ['transport', 'service_center'] }));
assert(!orgHasServiceCenterActivity({ activities: ['transport'] }));
assert(isServiceCenterOnlyOrg({ activities: ['service_center'] }));
assert(!isServiceCenterOnlyOrg({ activities: ['transport', 'service_center'] }));
assert(!orgShowsFleetSurfaces({ activities: ['service_center'], enabled_modules: ['fleet'] }));
assert(orgShowsFleetSurfaces({ activities: ['transport', 'service_center'] }));
assert(orgShowsConstructionOpsSurfaces({ activities: ['transport', 'service_center'] }));

console.log('org workspace SC helpers: OK');
