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
  PasswordConfirmReset: 'reset-password/:uid/:token',
};

export const linkingConfig = { screens: linkingScreens };
