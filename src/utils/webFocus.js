/**
 * Blur focused elements when a screen is covered by aria-hidden (web drawer/stack).
 */
import { Platform } from 'react-native';

export function blurActiveElementOnWeb() {
  if (Platform.OS !== 'web' || typeof document === 'undefined') {
    return;
  }
  const active = document.activeElement;
  if (active && typeof active.blur === 'function') {
    active.blur();
  }
}

export function blurIfInsideAriaHiddenOnWeb() {
  if (Platform.OS !== 'web' || typeof document === 'undefined') {
    return;
  }
  const active = document.activeElement;
  if (!active || typeof active.closest !== 'function') {
    return;
  }
  if (active.closest('[aria-hidden="true"]')) {
    active.blur();
  }
}
