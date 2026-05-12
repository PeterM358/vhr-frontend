import { Platform } from 'react-native';
import { useHeaderHeight } from '@react-navigation/elements';

/**
 * Top padding for lists/scroll bodies when the root native stack uses a
 * transparent header over full-bleed `ScreenBackground` (back + title float on the scene).
 *
 * Prefer {@link useStackBodyPaddingTop} on stack screens with a visible header — it uses the
 * real header height and avoids Android touch overlap under the transparent bar.
 *
 * @param {import('react-native-safe-area-context').EdgeInsets} insets
 * @param {number} [extra=8] — small gap under the header row
 */
export function stackContentPaddingTop(insets, extra = 8) {
  const headerBarEstimate = Platform.OS === 'ios' ? 52 : 62;
  return insets.top + headerBarEstimate + extra;
}

/**
 * Reliable padding below the native stack header (use on screens inside a stack with `headerShown: true`).
 * @param {number} [extra=8]
 */
export function useStackBodyPaddingTop(extra = 8) {
  const headerHeight = useHeaderHeight();
  return headerHeight + extra;
}
