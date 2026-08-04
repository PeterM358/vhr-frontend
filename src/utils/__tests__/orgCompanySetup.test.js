/**
 * @jest-environment node
 */
import {
  buildOrgCompanySetupChecklist,
  isOrgLegalEntityComplete,
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
    expect(result.missing.map((row) => row.id)).toEqual([
      'legal',
      'location',
      'public_listing',
    ]);
    expect(result.scored).toHaveLength(4);
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
    expect(result.missing).toHaveLength(0);
  });

  it('exposes incomplete scored rows when half done', () => {
    const result = buildOrgCompanySetupChecklist({
      activities: ['service_center'],
      isServiceCenter: true,
      publicEnabled: false,
      publicSlug: '',
      legalComplete: true,
      locationComplete: true,
    });
    expect(result.doneCount).toBe(3);
    expect(result.total).toBe(4);
    expect(result.percent).toBe(75);
    expect(result.missing.map((row) => row.id)).toEqual(['public_listing']);
  });

  it('location complete from address+city or shop', () => {
    expect(
      isOrgLocationComplete({ addressLine: '1 Main', city: 'Sofia' }),
    ).toBe(true);
    expect(isOrgLocationComplete({ hasShopLocations: true })).toBe(true);
    expect(isOrgLocationComplete({ addressLine: '1 Main', city: '' })).toBe(false);
  });
});

describe('isOrgLegalEntityComplete', () => {
  it('requires name, tax id, address, and city', () => {
    expect(
      isOrgLegalEntityComplete({
        legal_name: "Bruno's garaje",
        vat_registered: true,
        vat_number: '',
        registered_address_line1: '',
        registered_city: '',
      }),
    ).toBe(false);
    expect(
      isOrgLegalEntityComplete({
        legal_name: "Bruno's garaje",
        vat_registered: true,
        vat_number: 'BG123',
        registered_address_line1: '1 Main',
        registered_city: 'Sofia',
      }),
    ).toBe(true);
  });

  it('uses EIK when not VAT registered', () => {
    expect(
      isOrgLegalEntityComplete({
        legal_name: 'Acme',
        vat_registered: false,
        eik_number: '',
        registered_address_line1: '1 Main',
        registered_city: 'Sofia',
      }),
    ).toBe(false);
    expect(
      isOrgLegalEntityComplete({
        legal_name: 'Acme',
        vat_registered: false,
        eik_number: '123456789',
        registered_address_line1: '1 Main',
        registered_city: 'Sofia',
      }),
    ).toBe(true);
  });

  it('falls back to apiComplete when entity is missing', () => {
    expect(isOrgLegalEntityComplete(null, { apiComplete: true })).toBe(true);
    expect(isOrgLegalEntityComplete(undefined, { apiComplete: false })).toBe(false);
  });

  it('prefers field derivation over a stale apiComplete=true', () => {
    expect(
      isOrgLegalEntityComplete(
        {
          legal_name: "Bruno's garaje",
          vat_registered: true,
          vat_number: '',
          registered_address_line1: '',
          registered_city: '',
        },
        { apiComplete: true },
      ),
    ).toBe(false);
  });
});
