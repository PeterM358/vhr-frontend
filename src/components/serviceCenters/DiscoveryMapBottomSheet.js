/**
 * Draggable results bottom sheet for native map-first service center discovery.
 * Snap points: ~14% collapsed, ~34% preview, ~86% expanded.
 */
import React, { useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  FlatList,
  PanResponder,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { COLORS } from '../../styles/colors';
import DISCOVERY_MOBILE, { discoveryMinFont } from './discoveryMobileTokens';
import { DiscoverySortTrigger } from './DiscoverySortSheet';
import ServiceCenterListCard from './ServiceCenterListCard';
import DiscoveryCompactFooter from './DiscoveryCompactFooter';

const SCREEN_H = Dimensions.get('window').height;
const SNAP_HEIGHTS = [
  Math.round(SCREEN_H * 0.14),
  Math.round(SCREEN_H * 0.34),
  Math.round(SCREEN_H * 0.86),
];

function nearestSnapIndex(height) {
  let best = 0;
  let bestDist = Infinity;
  SNAP_HEIGHTS.forEach((snapH, index) => {
    const dist = Math.abs(height - snapH);
    if (dist < bestDist) {
      bestDist = dist;
      best = index;
    }
  });
  return best;
}

const DiscoveryMapBottomSheet = React.forwardRef(function DiscoveryMapBottomSheet(
  {
    shops = [],
    loading = false,
    selectedId = null,
    userLocation = null,
    userLocatedExplicitly = false,
    resultsLabel = '',
    sortLabel = '',
    onOpenSort,
    onSelectShop,
    onDeselectShop,
    onViewProfile,
    onDirections,
    onRequestService,
    ownShopId = null,
    emptyComponent = null,
    bottomInset = 0,
    listRef: externalListRef,
    onSnapChange,
    initialSnapIndex = 0,
  },
  ref
) {
  const internalListRef = useRef(null);
  const listRef = externalListRef || internalListRef;
  const sheetHeight = useRef(new Animated.Value(SNAP_HEIGHTS[initialSnapIndex])).current;
  const dragStartHeight = useRef(SNAP_HEIGHTS[initialSnapIndex]);
  const onSnapChangeRef = useRef(onSnapChange);
  const [sheetSnap, setSheetSnap] = useState(initialSnapIndex);

  useEffect(() => {
    onSnapChangeRef.current = onSnapChange;
  }, [onSnapChange]);

  const snapTo = useCallback(
    (index, { animated = true } = {}) => {
      const clamped = Math.max(0, Math.min(SNAP_HEIGHTS.length - 1, index));
      setSheetSnap(clamped);
      onSnapChangeRef.current?.(clamped);
      const toValue = SNAP_HEIGHTS[clamped];
      dragStartHeight.current = toValue;
      if (animated) {
        Animated.spring(sheetHeight, {
          toValue,
          useNativeDriver: false,
          damping: 22,
          stiffness: 220,
          mass: 0.9,
        }).start();
      } else {
        sheetHeight.setValue(toValue);
      }
    },
    [sheetHeight]
  );

  useImperativeHandle(
    ref,
    () => ({
      snapTo,
      getSnapIndex: () => sheetSnap,
    }),
    [sheetSnap, snapTo]
  );

  const didMountRef = useRef(false);
  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      snapTo(initialSnapIndex, { animated: false });
    }
  }, [initialSnapIndex, snapTo]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 4,
        onPanResponderGrant: () => {
          sheetHeight.stopAnimation((value) => {
            dragStartHeight.current = value;
          });
        },
        onPanResponderMove: (_, gesture) => {
          const next = Math.max(
            SNAP_HEIGHTS[0],
            Math.min(SNAP_HEIGHTS[2], dragStartHeight.current - gesture.dy)
          );
          sheetHeight.setValue(next);
        },
        onPanResponderRelease: (_, gesture) => {
          sheetHeight.stopAnimation((value) => {
            const projected = value - gesture.vy * 80;
            snapTo(nearestSnapIndex(projected));
          });
        },
      }),
    [sheetHeight, snapTo]
  );

  const isCollapsed = sheetSnap === 0;
  const isExpanded = sheetSnap === 2;

  const handleCloseSelected = useCallback(() => {
    onDeselectShop?.();
    snapTo(0);
  }, [onDeselectShop, snapTo]);

  const renderShopCard = useCallback(
    ({ item: shop }) => {
      const listId = shop.list_id || `shop-${shop.id}`;
      const isSelected = selectedId === listId;
      const isOwnShop = ownShopId != null && String(shop.id) === String(ownShopId);
      return (
        <ServiceCenterListCard
          shop={shop}
          selected={isSelected}
          userLocation={userLocation}
          showDistance={userLocatedExplicitly}
          onPress={() => onSelectShop?.(shop)}
          onClose={isSelected ? handleCloseSelected : undefined}
          onViewProfile={() => onViewProfile?.(shop)}
          onDirections={() => onDirections?.(shop)}
          onRequestService={isOwnShop ? undefined : () => onRequestService?.(shop)}
          compact={!isSelected}
          mobile
        />
      );
    },
    [
      handleCloseSelected,
      onDirections,
      onRequestService,
      onSelectShop,
      onViewProfile,
      ownShopId,
      selectedId,
      userLocatedExplicitly,
      userLocation,
    ]
  );

  const listEmpty = !loading ? emptyComponent : null;

  return (
    <Animated.View
      style={[
        styles.sheet,
        {
          height: sheetHeight,
          paddingBottom: bottomInset,
        },
      ]}
      pointerEvents="box-none"
    >
      <View style={styles.sheetInner} pointerEvents="auto">
        <View style={styles.handleZone} {...panResponder.panHandlers}>
          <View style={styles.handle} />
          <View style={styles.collapsedRow}>
            <Text style={styles.resultsCount} numberOfLines={1}>
              {resultsLabel}
            </Text>
            {!isCollapsed ? (
              <DiscoverySortTrigger label={sortLabel} onPress={onOpenSort} style={styles.sortTrigger} />
            ) : null}
          </View>
        </View>

        {sheetSnap > 0 ? (
          <View style={styles.listWrap}>
            {loading && shops.length === 0 ? (
              <ActivityIndicator color={COLORS.primary} style={styles.loader} />
            ) : (
              <FlatList
                ref={listRef}
                data={shops}
                keyExtractor={(shop) => shop.list_id || `shop-${shop.id}`}
                renderItem={renderShopCard}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={listEmpty}
                ListFooterComponent={isExpanded ? <DiscoveryCompactFooter /> : null}
                showsVerticalScrollIndicator
                onScrollToIndexFailed={() => {}}
              />
            )}
          </View>
        ) : null}
      </View>
    </Animated.View>
  );
});

export default DiscoveryMapBottomSheet;

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 20,
  },
  sheetInner: {
    flex: 1,
    backgroundColor: DISCOVERY_MOBILE.color.panelBg,
    borderTopLeftRadius: DISCOVERY_MOBILE.radius.sheet,
    borderTopRightRadius: DISCOVERY_MOBILE.radius.sheet,
    borderTopWidth: 1,
    borderTopColor: DISCOVERY_MOBILE.color.panelBorder,
    shadowColor: '#0f172a',
    shadowOpacity: 0.14,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: -4 },
    elevation: 10,
    overflow: 'hidden',
  },
  handleZone: {
    paddingTop: 8,
    paddingBottom: 6,
    paddingHorizontal: DISCOVERY_MOBILE.space.screenX,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#cbd5e1',
    marginBottom: 8,
  },
  collapsedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  resultsCount: {
    flex: 1,
    fontSize: discoveryMinFont(DISCOVERY_MOBILE.type.meta),
    fontWeight: '600',
    color: DISCOVERY_MOBILE.color.textMuted,
  },
  sortTrigger: {
    maxWidth: 160,
  },
  listWrap: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: DISCOVERY_MOBILE.space.screenX,
    paddingTop: 4,
    paddingBottom: 12,
    flexGrow: 1,
  },
  loader: {
    marginVertical: 20,
  },
});
