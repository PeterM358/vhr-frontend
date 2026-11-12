/**
 * After long-idle session restore / forced invalidation, fix the shell:
 * - unauthenticated → sign-in
 * - partner stuck on client /dashboard → partner home
 */
import { useContext, useEffect, useRef } from 'react';
import { Platform } from 'react-native';

import { AuthContext } from '../context/AuthManager';
import { resetToSignIn } from './authNavigation';
import { toCanonicalAppPath } from './localizedRoutes';
import { resolveIsPartnerSession } from '../utils/partnerSession';
import { resolveIsOrgOnlySession } from '../utils/orgWorkspace';
import { buildShopAuthReset, resolveShopEntryRoute } from '../utils/shopAuthNavigation';

function isClientDashboardPath(path) {
  const pathOnly = String(path || '').split('?')[0];
  const canonical = toCanonicalAppPath(pathOnly) || pathOnly;
  return String(canonical).replace(/\/$/, '') === '/dashboard';
}

export default function SessionResumeBridge({ navigationRef }) {
  const { isAuthenticated, isLoading, sessionRevision } = useContext(AuthContext);
  const lastHandledRevision = useRef(0);

  useEffect(() => {
    if (isLoading) return;
    if (!sessionRevision || sessionRevision === lastHandledRevision.current) return;
    // Skip the first revision from cold start — AuthLoading owns that route.
    if (lastHandledRevision.current === 0) {
      lastHandledRevision.current = sessionRevision;
      return;
    }
    lastHandledRevision.current = sessionRevision;

    let cancelled = false;
    (async () => {
      const nav = navigationRef?.current;
      if (!nav?.isReady?.()) return;

      if (!isAuthenticated) {
        resetToSignIn(nav);
        return;
      }

      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        const currentPath = `${window.location.pathname}${window.location.search}`;
        if (!isClientDashboardPath(currentPath)) return;
        const isPartner = await resolveIsPartnerSession();
        if (cancelled) return;
        if (isPartner) {
          const route = await resolveShopEntryRoute();
          if (!cancelled) nav.reset(buildShopAuthReset(route));
          return;
        }
        const isOrgOnly = await resolveIsOrgOnlySession();
        if (cancelled) return;
        if (isOrgOnly) {
          const route = await resolveShopEntryRoute();
          if (route?.name === 'Home') return;
          if (!cancelled) nav.reset(buildShopAuthReset(route));
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, isLoading, sessionRevision, navigationRef]);

  return null;
}
