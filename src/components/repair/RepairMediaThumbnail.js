import React from 'react';
import { ActivityIndicator, Image, Pressable, View } from 'react-native';

import usePrivateMediaUrl from '../../utils/usePrivateMediaUrl';

export default function RepairMediaThumbnail({ sourcePath, onPress, style }) {
  const { displayUrl, loading } = usePrivateMediaUrl(sourcePath);

  if (loading) {
    return (
      <View style={[style, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator size="small" />
      </View>
    );
  }

  if (!displayUrl) {
    return null;
  }

  return (
    <Pressable onPress={() => onPress?.(displayUrl)}>
      <Image source={{ uri: displayUrl }} style={style} />
    </Pressable>
  );
}
