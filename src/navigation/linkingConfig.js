/**
 * User-facing web URL paths for React Navigation.
 * Screen/component names are unchanged — only URL segments differ on web.
 */

export const linkingScreens = {
  PublicHome: '',
  Login: 'sign-in',
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
    },
  },
  ShopMap: 'service-centers',
  ShopDetail: {
    path: 'service-center/:centerSlug',
  },
  ShopProfile: 'partner/profile',
  ShopInvoicing: 'partner/invoicing',
  ShopServiceMenu: 'partner/services',
  PartnerBookings: 'partner/bookings',
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
  ClientServiceHistory: 'dashboard/service-history',
  ClientBookings: 'dashboard/bookings',
  ClientDocuments: 'dashboard/documents',
  ClientProfile: 'dashboard/profile',
};

export const linkingConfig = { screens: linkingScreens };
