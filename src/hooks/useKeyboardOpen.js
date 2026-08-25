/**
 * Cross-platform keyboard / soft-input visibility for chrome decisions.
 *
 * Web note: iOS Safari often resizes *both* `innerHeight` and `visualViewport`,
 * so `innerHeight - vv.height` stays ~0. We keep a rising baseline of the
 * largest recent visualViewport height and treat shrinks from that as keyboard.
 */

import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

/** Layout viewport px obscured before we treat the software keyboard as open. */
export const KEYBOARD_OPEN_THRESHOLD_PX = 80;

function measureWebKeyboardOpen(baselineRef) {
  if (typeof window === 'undefined') {
    return false;
  }
  const vv = window.visualViewport;
  if (!vv) {
    return false;
  }
  const h = vv.height;
  if (!baselineRef.current || h > baselineRef.current) {
    baselineRef.current = h;
  }
  const fromBaseline = baselineRef.current - h - (vv.offsetTop || 0);
  if (fromBaseline > KEYBOARD_OPEN_THRESHOLD_PX) {
    return true;
  }
  // Fallback when layout viewport does not shrink with the keyboard.
  const obscured = window.innerHeight - h - (vv.offsetTop || 0);
  return obscured > KEYBOARD_OPEN_THRESHOLD_PX;
}

/**
 * @returns {boolean} True while the software keyboard (or equivalent viewport shrink) is open.
 */
export default function useKeyboardOpen() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'web') {
      if (typeof window === 'undefined') {
        return undefined;
      }
      const baselineRef = { current: window.visualViewport?.height || window.innerHeight };
      const update = () => setOpen(measureWebKeyboardOpen(baselineRef));
      update();
      const vv = window.visualViewport;
      if (vv) {
        vv.addEventListener('resize', update);
        vv.addEventListener('scroll', update);
      }
      window.addEventListener('resize', update);
      return () => {
        if (vv) {
          vv.removeEventListener('resize', update);
          vv.removeEventListener('scroll', update);
        }
        window.removeEventListener('resize', update);
      };
    }

    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, () => setOpen(true));
    const hideSub = Keyboard.addListener(hideEvent, () => setOpen(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  return open;
}
