/**
 * @jest-environment node
 */
import {
  isServiceCenterOnlyOrg,
  orgHasServiceCenterActivity,
  orgShowsConstructionOpsSurfaces,
  orgShowsFleetSurfaces,
} from '../orgWorkspace';

describe('org service center workspace helpers', () => {
  it('detects service_center activity including mixed orgs', () => {
    expect(orgHasServiceCenterActivity({ activities: ['service_center'] })).toBe(true);
    expect(
      orgHasServiceCenterActivity({ activities: ['transport', 'service_center'] }),
    ).toBe(true);
    expect(orgHasServiceCenterActivity({ activities: ['transport'] })).toBe(false);
    expect(orgHasServiceCenterActivity(null)).toBe(false);
  });

  it('treats SC-only as no fleet / construction ops surfaces', () => {
    const scOnly = { activities: ['service_center'], enabled_modules: ['fleet', 'operations'] };
    expect(isServiceCenterOnlyOrg(scOnly)).toBe(true);
    expect(orgShowsFleetSurfaces(scOnly)).toBe(false);
    expect(orgShowsConstructionOpsSurfaces(scOnly)).toBe(false);
  });

  it('keeps fleet + ops for transport+SC mixed orgs', () => {
    const mixed = {
      activities: ['transport', 'service_center'],
      enabled_modules: ['fleet', 'operations'],
    };
    expect(isServiceCenterOnlyOrg(mixed)).toBe(false);
    expect(orgHasServiceCenterActivity(mixed)).toBe(true);
    expect(orgShowsFleetSurfaces(mixed)).toBe(true);
    expect(orgShowsConstructionOpsSurfaces(mixed)).toBe(true);
  });
});
