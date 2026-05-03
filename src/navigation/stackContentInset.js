import { Platform } from 'react-native';

/**
 * Top padding for lists/scroll bodies when the root native stack uses a
 * transparent header over full-bleed `ScreenBackground` (back + title float on the scene).
 *
 * @param {import('react-native-safe-area-context').EdgeInsets} insets
 * @param {number} [extra=8] — small gap under the header row
 */
export function stackContentPaddingTop(insets, extra = 8) {
  const headerBarEstimate = Platform.OS === 'ios' ? 52 : 56;
  return insets.top + headerBarEstimate + extra;
}
