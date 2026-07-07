/**
 * @file Hook signature for future context-based automatic scene switching.
 * @see docs/garage-scenes-architecture.md
 *
 * Example (future):
 *   useGarageSceneOverride({
 *     sceneId: 'performance-garage',
 *     reason: 'repair-in-progress',
 *     priority: 'soft',
 *     enabled: hasActiveRepair,
 *   });
 */

import { useEffect, useRef } from 'react';

import { useGarageScene } from './GarageSceneContext';

/**
 * @typedef {Object} UseGarageSceneOverrideOptions
 * @property {import('./types').GarageSceneId} sceneId
 * @property {string} reason
 * @property {import('./types').GarageSceneOverridePriority} [priority]
 * @property {number} [ttlMs]
 * @property {boolean} [enabled]
 */

/**
 * Registers a contextual scene override while `enabled` is true.
 * Stub: no-op until provider is mounted with `hydrate` and background layer exists.
 *
 * @param {UseGarageSceneOverrideOptions} options
 */
export function useGarageSceneOverride({
  sceneId,
  reason,
  priority = 'soft',
  ttlMs,
  enabled = true,
}) {
  const { setContextOverride } = useGarageScene();
  const registeredRef = useRef(false);

  useEffect(() => {
    if (!enabled) {
      if (registeredRef.current) {
        setContextOverride(null);
        registeredRef.current = false;
      }
      return undefined;
    }

    setContextOverride({
      sceneId,
      reason,
      priority,
      registeredAt: Date.now(),
      ttlMs,
    });
    registeredRef.current = true;

    let timer;
    if (ttlMs != null && ttlMs > 0) {
      timer = setTimeout(() => {
        setContextOverride(null);
        registeredRef.current = false;
      }, ttlMs);
    }

    return () => {
      if (timer) clearTimeout(timer);
      if (registeredRef.current) {
        setContextOverride(null);
        registeredRef.current = false;
      }
    };
  }, [enabled, sceneId, reason, priority, ttlMs, setContextOverride]);
}
