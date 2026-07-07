import { useCallback, useState } from 'react';

/**
 * Tracks scroll offset for sticky nav bars — shows border/shadow after threshold.
 * @param {number} [threshold=4]
 */
export function useScrollShadow(threshold = 4) {
  const [scrolled, setScrolled] = useState(false);

  const onScroll = useCallback(
    (event) => {
      const y = event?.nativeEvent?.contentOffset?.y ?? 0;
      const next = y > threshold;
      setScrolled((prev) => (prev === next ? prev : next));
    },
    [threshold]
  );

  return {
    scrolled,
    onScroll,
    scrollEventThrottle: 16,
  };
}
