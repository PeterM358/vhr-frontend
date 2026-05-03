/**
 * PATH: src/components/shop/ShopPromotions.js
 */

import React, { useEffect, useState } from 'react';
import { View, FlatList, Alert, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import {
  Text,
  Button,
  ActivityIndicator,
  useTheme,
} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import { deletePromotion, getPromotions } from '../../api/promotions';
import ScreenBackground from '../ScreenBackground';
import FloatingCard from '../ui/FloatingCard';
import EmptyStateCard from '../ui/EmptyStateCard';
import {
  PRIMARY,
  PRIMARY_DARK,
  TEXT_DARK,
  TEXT_MUTED,
} from '../../constants/colors';
import { stackContentPaddingTop } from '../../navigation/stackContentInset';

export default function ShopPromotions() {
  const insets = useSafeAreaInsets();
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const theme = useTheme();

  useEffect(() => {
    if (isFocused) {
      fetchPromotions();
    }
  }, [isFocused]);

  const fetchPromotions = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('@access_token');
      const data = await getPromotions(token);
      setOffers(data);
    } catch (err) {
      console.error('Failed to fetch promotions', err);
      Alert.alert('Error', 'Failed to load promotions');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (offerId) => {
    Alert.alert(
      'Delete promotion',
      'Are you sure you want to delete this promotion?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('@access_token');
              await deletePromotion(token, offerId);
              setOffers((prev) => prev.filter((o) => o.id !== offerId));
            } catch (err) {
              console.error('Failed to delete promotion', err);
              Alert.alert('Error', err.message || 'Failed to delete promotion');
            }
          },
        },
      ]
    );
  };

  const renderOffer = ({ item }) => (
    <FloatingCard>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <View style={styles.priceTag}>
          <Text style={styles.priceTagText}>{item.price} BGN</Text>
        </View>
      </View>

      {!!item.description && (
        <Text style={styles.cardDescription} numberOfLines={3}>
          {item.description}
        </Text>
      )}

      <View style={styles.metaRow}>
        {!!item.repair_type_name && (
          <View style={styles.metaItem}>
            <MaterialCommunityIcons
              name="wrench-outline"
              size={14}
              color={TEXT_MUTED}
            />
            <Text style={styles.metaText}>{item.repair_type_name}</Text>
          </View>
        )}
        {(!!item.valid_from || !!item.valid_until) && (
          <View style={styles.metaItem}>
            <MaterialCommunityIcons
              name="calendar-range"
              size={14}
              color={TEXT_MUTED}
            />
            <Text style={styles.metaText}>
              {item.valid_from} → {item.valid_until}
            </Text>
          </View>
        )}
        <View style={styles.metaItem}>
          <MaterialCommunityIcons
            name="account-multiple-outline"
            size={14}
            color={TEXT_MUTED}
          />
          <Text style={styles.metaText}>
            Max: {item.max_bookings || 'Unlimited'}
          </Text>
        </View>
      </View>

      <View style={styles.actionsRow}>
        <Button
          onPress={() => handleDelete(item.id)}
          icon="delete-outline"
          textColor={theme.colors.error}
          compact
          style={styles.deleteButton}
        >
          Delete
        </Button>
      </View>
    </FloatingCard>
  );

  return (
    <ScreenBackground safeArea={false}>
      <View style={[styles.container, { paddingTop: stackContentPaddingTop(insets, 12) }]}>
        <Button
          mode="contained"
          icon="plus"
          onPress={() => navigation.navigate('CreatePromotion')}
          style={styles.createButton}
          contentStyle={styles.createButtonContent}
          buttonColor={PRIMARY}
          textColor="#fff"
        >
          Create Promotion
        </Button>

        {loading ? (
          <ActivityIndicator
            animating={true}
            size="large"
            color="#fff"
            style={styles.loading}
          />
        ) : (
          <FlatList
            data={offers}
            keyExtractor={(item) =>
              item.id?.toString() ?? Math.random().toString()
            }
            renderItem={renderOffer}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <EmptyStateCard
                icon="tag-multiple-outline"
                title="No promotions yet"
                subtitle="Create your first promotion to attract clients."
              />
            }
          />
        )}
      </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 12,
    backgroundColor: 'transparent',
  },
  createButton: {
    borderRadius: 12,
    marginBottom: 14,
    alignSelf: 'stretch',
  },
  createButtonContent: {
    height: 46,
  },
  loading: {
    marginTop: 24,
  },
  listContent: {
    paddingBottom: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  cardTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: PRIMARY_DARK,
    marginRight: 10,
  },
  priceTag: {
    backgroundColor: 'rgba(37,99,235,0.14)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  priceTagText: {
    color: PRIMARY,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  cardDescription: {
    fontSize: 13,
    color: TEXT_DARK,
    lineHeight: 18,
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 4,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 14,
    marginTop: 2,
  },
  metaText: {
    fontSize: 12,
    color: TEXT_MUTED,
    marginLeft: 4,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  deleteButton: {
    borderRadius: 10,
  },
});
