import React from 'react';
import CompactLanguageSelector from '../common/CompactLanguageSelector';

export default function AuthLanguageSelector({ style }) {
  return (
    <CompactLanguageSelector
      variant="dark"
      compact
      showFullLabel
      style={[{ alignSelf: 'center' }, style]}
    />
  );
}

