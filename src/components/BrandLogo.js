import React from 'react';
import { Image } from 'react-native';

/**
 * Veversal brand mark (PNG). Same width/height API as the former SVG logo.
 * Uses contain so aspect ratio is preserved without crop/distort.
 */
export default function BrandLogo({ width = 112, height = 112, style, ...rest }) {
  return (
    <Image
      source={require('../assets/images/logo.png')}
      style={[{ width, height }, style]}
      resizeMode="contain"
      accessibilityIgnoresInvertColors
      {...rest}
    />
  );
}
