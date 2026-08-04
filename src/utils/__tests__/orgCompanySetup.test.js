/**
 * @jest-environment node
 */
import {
  buildOrgCompanySetupChecklist,
  isOrgLocationComplete,
} from '../orgCompanySetup';

describe('buildOrgCompanySetupChecklist', () => {
  it('does not inflate % from activities alone for SC orgs', () => {
    const result = buildOrgCompanySetupChecklist({
      activities: ['service_center'],
      isServiceCenter: true,
      publicEnabled: false,
      publicSlug: '',
      legalComplete: false,
      locationComplete: false,
    });
    expect(result.doneCount).toBe(1);
    expect(result.total).toBe(4);
    expect(result.percent).toBe(25);
    expect(result.listingReady).toBe(false);
  });

  it('treats public enabled+slug as one listing item', () => {
    const result = buildOrgCompanySetupChecklist({
      activities: ['service_center'],
      isServiceCenter: true,
      publicEnabled: true,
      publicSlug: 'brunos-garaje',
      legalComplete: true,
      locationComplete: true,
    });
    expect(result.percent).toBe(100);
    expect(result.listingReady).toBe(true);
  });

  it('location complete from address+city or shop', () => {
    expect(
      isOrgLocationComplete({ addressLine: '1 Main', city: 'Sofia' }),
    ).toBe(true);
    expect(isOrgLocationComplete({ hasShopLocations: true })).toBe(true);
    expect(isOrgLocationComplete({ addressLine: '1 Main', city: '' })).toBe(false);
  });
});
