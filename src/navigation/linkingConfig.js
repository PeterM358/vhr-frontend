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
    },
  },
  ShopMap: 'service-centers',
  ShopDetail: {
    path: 'service-center/:shopId',
    parse: {
      shopId: (value) => {
        const id = parseInt(String(value), 10);
        return Number.isFinite(id) ? id : undefined;
      },
    },
  },
  PasswordConfirmReset: 'reset-password/:uid/:token',
  ClientVehicles: 'my-vehicles',
  CreateVehicle: 'my-vehicles/add',
  VehicleDetail: {
    path: 'my-vehicles/:vehicleId',
    parse: {
      vehicleId: (value) => {
        const id = parseInt(String(value), 10);
        return Number.isFinite(id) ? id : undefined;
      },
    },
  },
  VehicleSpecs: {
    path: 'my-vehicles/:vehicleId/specs',
    parse: {
      vehicleId: (value) => {
        const id = parseInt(String(value), 10);
        return Number.isFinite(id) ? id : undefined;
      },
    },
  },
  LogServiceRecord: {
    path: 'my-vehicles/:vehicleId/service-record/new',
    parse: {
      vehicleId: (value) => {
        const id = parseInt(String(value), 10);
        return Number.isFinite(id) ? id : undefined;
      },
    },
  },
};

export const linkingConfig = { screens: linkingScreens };
