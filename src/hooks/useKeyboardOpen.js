/**
 * Cross-platform keyboard visibility for chrome decisions (sticky CTAs, etc.).
 *
 * - Native: Keyboard will/did show|hide
 * - Web: visualViewport shrink vs layout viewport (mobile Safari/Chrome)
 */

import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

/** Layout viewport px obscured before we treat the software keyboard as open. */
export const KEYBOARD_OPEN_THRESHOLD_PX = 120;

function measureWebKeyboardOpen() {
  if (typeof window === 'undefined' || !window.visualViewport) {
    return false;
  }
  const vv = window.visualViewport;
  const obscured = window.innerHeight - vv.height - vv.offsetTop;
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
      const update = () => setOpen(measureWebKeyboardOpen());
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
