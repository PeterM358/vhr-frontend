/**
 * True while a text field (or similar) is focused — primary signal for "editing
 * mode" on mobile web, where visualViewport keyboard detection is unreliable.
 */

import { useEffect, useState } from 'react';
import { Platform, TextInput as RNTextInput } from 'react-native';

function isEditableTarget(target) {
  if (!target || typeof target !== 'object') return false;
  const tag = String(target.tagName || '').toUpperCase();
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (target.isContentEditable) return true;
  const role = target.getAttribute?.('role');
  if (role === 'textbox' || role === 'searchbox') return true;
  return false;
}

/**
 * @returns {boolean}
 */
export default function useTextInputFocused() {
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'web') {
      if (typeof document === 'undefined') {
        return undefined;
      }
      let blurTimer = null;
      const onFocusIn = (event) => {
        if (blurTimer) {
          clearTimeout(blurTimer);
          blurTimer = null;
        }
        if (isEditableTarget(event.target)) {
          setFocused(true);
          // Keep the caret in the remaining viewport once chrome collapses.
          try {
            event.target.scrollIntoView?.({ block: 'center', inline: 'nearest' });
          } catch {
            /* ignore */
          }
        }
      };
      const onFocusOut = () => {
        blurTimer = setTimeout(() => {
          const active = document.activeElement;
          setFocused(isEditableTarget(active));
        }, 80);
      };
      document.addEventListener('focusin', onFocusIn, true);
      document.addEventListener('focusout', onFocusOut, true);
      return () => {
        if (blurTimer) clearTimeout(blurTimer);
        document.removeEventListener('focusin', onFocusIn, true);
        document.removeEventListener('focusout', onFocusOut, true);
      };
    }

    const showSub = RNTextInput.State
      ? null
      : null;
    // Native: RN doesn't expose a global focus bus; Keyboard listeners cover most cases.
    // Track TextInput focus via optional global events if available later.
    void showSub;
    return undefined;
  }, []);

  return focused;
}
