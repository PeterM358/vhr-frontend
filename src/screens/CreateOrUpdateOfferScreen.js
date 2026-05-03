import React, { useState, useEffect, useLayoutEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, ScrollView, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, TextInput, Button, Card, Divider, IconButton } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createOffer, updateOffer } from '../api/offers';
import ScreenBackground from '../components/ScreenBackground';
import { stackContentPaddingTop } from '../navigation/stackContentInset';

export default function CreateOrUpdateOfferScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { existingOffer, selectedOfferParts = [], offerId } = route.params || {};
  const [repairId, setRepairId] = useState(route.params?.repairId || existingOffer?.repair || null);

  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [parts, setParts] = useState([]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: existingOffer ? 'Update Offer' : 'Create Offer',
      headerBackTitleVisible: true,
    });
  }, [navigation, existingOffer]);

  useEffect(() => {
    console.log('🪵 DEBUG: existingOffer:', existingOffer);
    console.log('🪵 DEBUG: selectedOfferParts:', selectedOfferParts);

    if (route.params?.repairId && !repairId) {
      setRepairId(route.params.repairId);
    }

    // Handle parts priority: selectedOfferParts overrides existingOffer.parts
    if (selectedOfferParts.length > 0) {
      const normalized = selectedOfferParts.map((p) => ({
        partsMasterId: p.parts_master || p.partsMasterId || p.parts_master_id,
        quantity: p.quantity,
        price: p.price_per_item || p.price,
        labor: p.labor_cost || p.labor,
        note: p.note || '',
        partsMaster: p.parts_master_detail || p.partsMaster,
      }));
      setParts(normalized);
      console.log('🪵 DEBUG: initializing from selectedOfferParts');
    } else if (existingOffer?.parts?.length > 0) {
      const normalized = existingOffer.parts.map((p) => ({
        partsMasterId: p.parts_master || p.partsMasterId,
        quantity: p.quantity,
        price: p.price_per_item || p.price,
        labor: p.labor_cost || p.labor,
        note: p.note || '',
        partsMaster: p.parts_master_detail || p.partsMaster,
      }));
      setParts(normalized);
    }

    if (!description && existingOffer?.description) setDescription(existingOffer.description);
    if (!price && existingOffer?.price) setPrice(existingOffer.price?.toString());
  }, [route.params]);

  const handleSubmit = async () => {
    if (!description || !repairId) {
      Alert.alert('Missing Info', 'Please provide a description and make sure repair ID is present');
      return;
    }

    try {
      const token = await AsyncStorage.getItem('@access_token');
      const payload = {
        description,
        price: price ? parseFloat(price) : null,
        repair: repairId,
        parts: parts.map((p) => ({
          parts_master: p.partsMasterId,
          quantity: parseInt(p.quantity),
          price_per_item: parseFloat(p.price),
          labor_cost: parseFloat(p.labor),
          note: p.note,
        })),
      };

      if (existingOffer?.id) {
        await updateOffer(token, existingOffer.id, payload);
        Alert.alert('Success', 'Offer updated');
      } else {
        await createOffer(token, payload);
        Alert.alert('Success', 'Offer created');
      }

      navigation.reset({
        index: 2,
        routes: [
          { name: 'ShopHome' },
          { name: 'RepairsList' },
          { name: 'RepairDetail', params: { repairId } },
        ],
      });
    } catch (err) {
      console.error(err);
      Alert.alert('Error', err.message || 'Failed to send offer');
    }
  };

  const navigateToSelectParts = () => {
    navigation.navigate('SelectOfferParts', {
      offerId: existingOffer?.id || null,
      currentParts: parts,
      existingOffer,
    });
  };

  return (
    <ScreenBackground safeArea={false}>
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: 'transparent' }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={[
        styles.container,
        { paddingTop: stackContentPaddingTop(insets, 4), paddingBottom: Math.max(insets.bottom, 16) },
      ]}>
        <Card style={styles.formCard}>
          <Card.Title title={existingOffer ? 'Update Offer' : 'Create Offer'} />
          <Card.Content>
            <TextInput
              mode="outlined"
              label="Description"
              value={description}
              onChangeText={setDescription}
              multiline
              style={styles.input}
            />
            <TextInput
              mode="outlined"
              label="Total Price (optional)"
              value={price}
              onChangeText={setPrice}
              keyboardType="numeric"
              style={styles.input}
            />
          </Card.Content>
        </Card>

        <Button
          mode="outlined"
          icon="tools"
          onPress={navigateToSelectParts}
          style={{ marginTop: 20 }}
        >
          Manage Parts
        </Button>

        {parts.length > 0 && (
          <View>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Selected Parts
            </Text>
            {parts.map((part, index) => (
              <Card key={index} style={styles.partCard}>
                <Card.Title
                  title={part.partsMaster?.name || ''}
                  subtitle={part.partsMaster?.brand || ''}
                />
                <Card.Content>
                  <Text>Qty: {part.quantity}</Text>
                  <Text>Price: {part.price}</Text>
                  <Text>Labor: {part.labor}</Text>
                  {part.note && <Text>Note: {part.note}</Text>}
                </Card.Content>
              </Card>
            ))}
          </View>
        )}

        <Button
          mode="contained"
          onPress={handleSubmit}
          style={styles.submitButton}
        >
          {existingOffer ? 'Update Offer' : 'Send Offer'}
        </Button>
      </ScrollView>
    </KeyboardAvoidingView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  input: {
    marginBottom: 16,
  },
  formCard: {
    marginBottom: 20,
  },
  sectionTitle: {
    marginTop: 20,
    marginBottom: 10,
    paddingLeft: 10,
    fontWeight: 'bold',
  },
  partCard: {
    marginVertical: 6,
    marginHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.1)',
    backgroundColor: 'rgba(255,255,255,0.98)',
  },
  submitButton: {
    marginVertical: 20,
  },
});
