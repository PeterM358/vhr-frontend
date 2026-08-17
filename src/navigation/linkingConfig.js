/**
 * User-facing web URL paths for React Navigation.
 * Screen/component names are unchanged — only URL segments differ on web.
 *
 * Language prefixes (`/{lang}/...`) are stripped in webLinking before path parsing;
 * syncWebPath re-applies the active locale prefix for dashboard and partner routes.
 */

export const linkingScreens = {
  PublicHome: '',
  Login: 'login',
  Register: 'sign-up',
  OrgOnboarding: 'partner/organization/onboarding',
  PasswordRequestReset: 'forgot-password',
  Home: {
    path: 'dashboard',
    screens: {
      HomeMain: '',
    },
  },
  OrgHome: {
    path: 'partner/organization',
    screens: {
      OrgOverview: '',
      OrgFleet: 'fleet',
      OrgOperations: 'operations',
      OrgTasks: 'tasks',
      OrgCreateTask: 'tasks/new',
      OrgProjects: 'projects',
      OrgWarehouse: 'warehouse',
      OrgAccounting: 'accounting',
      OrgFleetPlanning: 'fleet-planning',
      OrgInvoicing: 'invoicing',
      OrgLegalEntity: 'company',
      OrgActivities: 'activities',
      OrgPublicProfile: 'public-profile',
      OrgCompanyAccount: 'account',
      OrgCalendar: 'calendar',
      OrgWorkforce: 'workforce',
      OrgNetwork: 'network',
      ChooseShop: 'switch-center',
    },
  },
  OrgWorkforceMemberDetail: {
    path: 'partner/organization/workforce/member/:membershipId',
    parse: {
      membershipId: (value) => {
        const id = parseInt(String(value), 10);
        return Number.isFinite(id) ? id : String(value || '').trim();
      },
    },
  },
  OrgMaterialForm: {
    path: 'partner/organization/warehouse/materials/:stockId',
    parse: {
      stockId: (value) => {
        if (value === 'new') return 'new';
        const id = parseInt(String(value), 10);
        return Number.isFinite(id) ? id : String(value || '').trim();
      },
    },
  },
  OrgToolNumber: {
    path: 'partner/organization/warehouse/tools/number',
  },
  OrgToolAssetDetail: {
    path: 'partner/organization/warehouse/tools/:assetId',
    parse: {
      assetId: (value) => {
        const id = parseInt(String(value), 10);
        return Number.isFinite(id) ? id : String(value || '').trim();
      },
    },
  },
  OrgWarehouseLocationDetail: {
    path: 'partner/organization/warehouse/locations/:locationId',
    parse: {
      locationId: (value) => {
        const id = parseInt(String(value), 10);
        return Number.isFinite(id) ? id : String(value || '').trim();
      },
    },
  },
  OrgWarehouseZoneDetail: {
    path: 'partner/organization/warehouse/locations/:locationId/zones/:zone',
    parse: {
      locationId: (value) => {
        const id = parseInt(String(value), 10);
        return Number.isFinite(id) ? id : String(value || '').trim();
      },
      zone: (value) => decodeURIComponent(String(value || '').trim()),
    },
  },
  OrgWarehouseAddressDetail: {
    path: 'partner/organization/warehouse/addresses/:locationId',
    parse: {
      locationId: (value) => {
        const id = parseInt(String(value), 10);
        return Number.isFinite(id) ? id : String(value || '').trim();
      },
    },
  },
  ShopHome: {
    path: 'partner',
    screens: {
      ShopDashboard: 'dashboard',
      ShopCalendar: 'calendar',
      RepairsList: 'repairs',
      AuthorizedClients: 'clients',
      ShopPromotions: 'promotions',
      NotificationsList: 'notifications',
      ChooseShop: 'switch-center',
      AddPartnerServiceCenter: 'switch-center/add',
    },
  },
  ShopWarehouse: 'partner/warehouse',
  ShopMap: 'service-centers',
  PublicBusinessProfile: {
    path: 'business/:orgSlug',
    parse: {
      orgSlug: (value) => String(value || '').trim().toLowerCase(),
    },
  },
  ShopDetail: {
    path: 'service-center/:centerSlug',
    parse: {
      centerSlug: (value) => String(value || '').trim().toLowerCase(),
    },
  },
  ShopProfile: 'partner/profile',
  ShopSubscriptionUpgrade: 'partner/upgrade',
  ShopSubscriptionSuccess: 'shop/subscription/success',
  ShopInvoicing: 'partner/invoicing',
  ShopServiceMenu: 'partner/services',
  PartnerBookings: 'partner/bookings',
  PartnerServiceCenters: 'partner/service-centers',
  ShopAnalytics: 'partner/analytics',
  ShopWorkforce: 'partner/workforce',
  ShopDocumentImports: 'partner/document-imports',
  ShopDocumentImportDetail: {
    path: 'partner/document-imports/:importId',
    parse: {
      importId: (value) => {
        const id = parseInt(String(value), 10);
        return Number.isFinite(id) ? id : undefined;
      },
    },
  },
  ShopComplaints: 'partner/complaints',
  ShopPurchaseOrders: 'partner/purchase-orders',
  ShopPurchaseOrderDetail: 'partner/purchase-orders/:poId',
  ShopGoodsReceipt: 'partner/goods-receipt',
  ShopStorageLocations: 'partner/storage-locations',
  NetworkOrganization: 'partner/business-network',
  FleetDashboard: 'partner/fleet',
  FleetRegisterImport: 'partner/organization/fleet/import',
  OrgFleetVehicleDetail: 'partner/organization/fleet/vehicle/:vehicleId',
  NetworkRoles: 'partner/business-network/roles',
  NetworkPartners: 'partner/business-network/partners',
  NetworkInvitePartner: 'partner/business-network/invite',
  NetworkIncomingOrders: 'partner/business-network/incoming-orders',
  NetworkIncomingOrderDetail: 'partner/business-network/incoming-orders/:documentId',
  NetworkProductMapping: 'partner/business-network/mapping',
  NetworkPackaging: 'partner/business-network/packaging',
  NetworkClaimsList: 'partner/business-network/claims',
  NetworkClaimCreate: 'partner/business-network/claims/new',
  NetworkClaimDetail: 'partner/business-network/claims/:claimId',
  NetworkIncomingClaims: 'partner/business-network/claims/incoming',
  PasswordConfirmReset: 'reset-password/:uid/:token',
  VerifyEmail: 'verify-email/:uid/:token',
  OrganizationMembershipInvite: {
    path: 'organization-invite/:token',
    parse: {
      token: (value) => decodeURIComponent(String(value || '').trim()),
    },
  },
  ClientVehicles: 'dashboard/vehicles',
  CreateVehicle: 'dashboard/vehicles/add',
  PartnerOnboarding: 'partner/onboarding',
  VehicleDetail: {
    path: 'dashboard/vehicles/:vehicleId',
    parse: {
      vehicleId: (value) => {
        const id = parseInt(String(value), 10);
        return Number.isFinite(id) ? id : undefined;
      },
    },
  },
  VehicleSpecs: {
    path: 'dashboard/vehicles/:vehicleId/specs',
    parse: {
      vehicleId: (value) => {
        const id = parseInt(String(value), 10);
        return Number.isFinite(id) ? id : undefined;
      },
    },
  },
  LogServiceRecord: {
    path: 'dashboard/vehicles/:vehicleId/service-record/new',
    parse: {
      vehicleId: (value) => {
        const id = parseInt(String(value), 10);
        return Number.isFinite(id) ? id : undefined;
      },
    },
  },
  AddObligationPayment: {
    path: 'dashboard/vehicles/:vehicleId/reminders/new',
    parse: {
      vehicleId: (value) => {
        const id = parseInt(String(value), 10);
        return Number.isFinite(id) ? id : undefined;
      },
    },
  },
  ManageVehicleServiceCenters: {
    path: 'dashboard/vehicles/:vehicleId/service-centers',
    parse: {
      vehicleId: (value) => {
        const id = parseInt(String(value), 10);
        return Number.isFinite(id) ? id : undefined;
      },
    },
  },
  VehicleHistoryAccess: {
    path: 'dashboard/vehicles/:vehicleId/access',
    parse: {
      vehicleId: (value) => {
        const id = parseInt(String(value), 10);
        return Number.isFinite(id) ? id : undefined;
      },
    },
  },
  ServiceRecordServiceCenter: {
    path: 'dashboard/vehicles/:vehicleId/service-record/service-center',
    parse: {
      vehicleId: (value) => {
        const id = parseInt(String(value), 10);
        return Number.isFinite(id) ? id : undefined;
      },
    },
  },
  AddManualServiceCenter: {
    path: 'dashboard/vehicles/:vehicleId/service-record/service-center/add',
    parse: {
      vehicleId: (value) => {
        const id = parseInt(String(value), 10);
        return Number.isFinite(id) ? id : undefined;
      },
    },
  },
  ClientActivity: 'dashboard/notifications',
  ClientRepairs: 'dashboard/repair-requests',
  CreateRepair: 'dashboard/repair-requests/new',
  RepairDetail: {
    path: 'dashboard/repair-requests/:repairId',
    parse: {
      repairId: (value) => {
        const id = parseInt(String(value), 10);
        return Number.isFinite(id) ? id : undefined;
      },
    },
  },
  ClientServiceHistory: 'dashboard/service-history',
  ClientBookings: 'dashboard/bookings',
  ClientDocuments: 'dashboard/documents',
  ClientProfile: 'dashboard/profile',
  CreateOrUpdateOffer: {
    path: 'partner/repairs/:repairId/offer',
    parse: {
      repairId: (value) => {
        const id = parseInt(String(value), 10);
        return Number.isFinite(id) ? id : undefined;
      },
    },
  },
};

export const linkingConfig = { screens: linkingScreens };
