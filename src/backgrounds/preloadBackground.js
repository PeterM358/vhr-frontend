/**
 * Preload only the active dashboard background (never the full library).
 */

import { Image, Platform } from 'react-native';

import {
  getBackgroundNativeSource,
  getBackgroundWebUri,
} from './backgroundRegistry';

/**
 * @param {import('./backgroundRegistry').DashboardBackgroundDefinition} background
 */
export async function preloadDashboardBackground(background) {
  if (!background) return;

  if (Platform.OS === 'web') {
    if (typeof document === 'undefined') return;
    const uri = getBackgroundWebUri(background);
    await new Promise((resolve) => {
      const img = new window.Image();
      img.onload = () => resolve(undefined);
      img.onerror = () => resolve(undefined);
      img.src = uri;
    });
    return;
  }

  const source = getBackgroundNativeSource(background);
  if (typeof source === 'number') {
    try {
      const resolved = Image.resolveAssetSource(source);
      if (resolved?.uri) {
        await Image.prefetch(resolved.uri);
      }
    } catch {
      // Best-effort preload.
    }
    return;
  }

  if (source?.uri) {
    try {
      await Image.prefetch(source.uri);
    } catch {
      // Best-effort preload.
    }
  }
}
