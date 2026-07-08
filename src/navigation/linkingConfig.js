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
  PasswordRequestReset: 'forgot-password',
  Home: {
    path: 'dashboard',
    screens: {
      HomeMain: '',
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
      ShopWarehouse: 'warehouse',
      NotificationsList: 'notifications',
      ChooseShop: 'switch-center',
      AddPartnerServiceCenter: 'switch-center/add',
    },
  },
  ShopMap: 'service-centers',
  ShopDetail: {
    path: 'service-center/:centerSlug',
    parse: {
      centerSlug: (value) => String(value || '').trim().toLowerCase(),
    },
  },
  ShopProfile: 'partner/profile',
  ShopInvoicing: 'partner/invoicing',
  ShopServiceMenu: 'partner/services',
  PartnerBookings: 'partner/bookings',
  PartnerServiceCenters: 'partner/service-centers',
  PasswordConfirmReset: 'reset-password/:uid/:token',
  ClientVehicles: 'dashboard/vehicles',
  CreateVehicle: 'dashboard/vehicles/add',
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
