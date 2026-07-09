import React from 'react';
import { useNavigationState } from '@react-navigation/native';

export function shouldShowAppFooter(isAuthenticated, routeName) {
  const isPublicRoute =
    !routeName ||
    routeName === 'AuthLoading' ||
    routeName === 'PublicHome' ||
    routeName === 'PublicSeoPage' ||
    routeName === 'Login' ||
    routeName === 'Register' ||
    routeName === 'PasswordRequestReset' ||
    routeName === 'PasswordConfirmReset' ||
    String(routeName).startsWith('Public');

  return isAuthenticated && !isPublicRoute;
}

function RouteFooterFromNav({ isAuthenticated, children }) {
  const routeName = useNavigationState((state) => state?.routes?.[state.index]?.name);
  return children(shouldShowAppFooter(isAuthenticated, routeName));
}

/**
 * Resolves whether AppFooter should render. Uses navigation state only when
 * `enableRouteDetection` is true (inside a mounted navigator). Callers outside
 * NavigationContainer must pass `enableRouteDetection={false}`.
 */
export function RouteFooterBridge({
  isAuthenticated,
  routeName = null,
  enableRouteDetection = true,
  children,
}) {
  if (!enableRouteDetection) {
    return children(shouldShowAppFooter(isAuthenticated, routeName));
  }

  return (
    <RouteFooterFromNav isAuthenticated={isAuthenticated}>
      {children}
    </RouteFooterFromNav>
  );
}
