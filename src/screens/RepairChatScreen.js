import React, { useEffect, useState, useRef, useContext } from 'react';
import { useLayoutEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Text,
  TextInput,
  Button,
  Card,
  useTheme,
  ActivityIndicator,
  IconButton,
  Divider,
  Portal,
  Modal,
} from 'react-native-paper';

import { Picker } from '@react-native-picker/picker';
import { Menu } from 'react-native-paper';

import { FlatList } from 'react-native';

import { getRepairById, getRepairMessages, sendRepairMessage, confirmRepair, updateRepair } from '../api/repairs';
import { prepareRepairPartsData, getShopParts, updateShopPart, createShopPart } from '../api/parts';
import { bookPromotion, unbookPromotion } from '../api/offers';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { WebSocketContext } from '../context/WebSocketManager';

import { API_BASE_URL } from '../api/config';

export default function RepairChatScreen({ route, navigation }) {
  const { repairId } = route.params;
  const theme = useTheme();
  const { notifications } = useContext(WebSocketContext);

  const [repair, setRepair] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  const [userId, setUserId] = useState(null);
  const [isShop, setIsShop] = useState(false);

  const [newMessage, setNewMessage] = useState('');
  const [offerPrice, setOfferPrice] = useState('');

  const [showDetails, setShowDetails] = useState(true);

  const [keyboardVisible, setKeyboardVisible] = useState(false);

  const [inputVisible, setInputVisible] = useState(false);

  const [shopOwnOffer, setShopOwnOffer] = useState(null);

  const [selectedParts, setSelectedParts] = useState([]);

  // Remove modal, use in-place section
  const [showPartsSection, setShowPartsSection] = useState(false);

  const scrollViewRef = useRef();

  // --- REPAIR TYPES STATE ---
  const [repairTypes, setRepairTypes] = useState([]);
  // --- REPAIR TYPE MENU STATE ---
  const [repairTypeMenuVisible, setRepairTypeMenuVisible] = useState(false);

  const loadRepairTypes = async () => {
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      const response = await fetch(`${API_BASE_URL}/api/repairs/types/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch repair types');
      const data = await response.json();
      setRepairTypes(data);
    } catch (err) {
      console.error('❌ Error loading repair types:', err);
      Alert.alert('Error', 'Failed to load repair types');
    }
  };

  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      const init = async () => {
        const id = await AsyncStorage.getItem('@user_id');
        setUserId(parseInt(id));
        setIsShop((await AsyncStorage.getItem('@is_shop')) === 'true');
        await loadRepair();
        await loadMessages();
        await loadRepairTypes();

        if (route.params && route.params.addedParts) {
          setSelectedParts(route.params.addedParts);
        }
      };
      init();
    }, [repairId, route.params])
  );

  useEffect(() => {
    const matching = notifications.find(n => n.repair === repairId);
    if (matching) {
      const incomingMessage = {
        id: Date.now(),
        sender: matching.sender_id || 0,
        sender_email: matching.sender_email || "Unknown",
        text: matching.body,
        price_offer: typeof matching.price_offer !== "undefined" ? matching.price_offer : null,
        offerId: typeof matching.offer !== "undefined" ? matching.offer : null,
        created_at: new Date().toISOString(),
        is_read: false,
      };
      setMessages(prev => [...prev, incomingMessage]);
    }
  }, [notifications]);

  useEffect(() => {
    if (isShop) {
      const myOffer = messages
        .filter((msg) => msg.price_offer != null && msg.sender === userId)
        .slice(-1)[0];
      setShopOwnOffer(myOffer || null);
    }
  }, [messages, isShop, userId]);

  const loadRepair = async () => {
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      const data = await getRepairById(token, repairId);
      setRepair(data);
      // Set selectedParts state from loaded repair_parts
      setSelectedParts((data.repair_parts || []).map(rp => ({
        partsMasterId: rp.part_master_detail?.id ?? rp.shop_part_detail?.part?.id,
        quantity: rp.quantity,
        price: rp.price_per_item_at_use,
        labor: rp.labor_cost,
        note: rp.note,
        partsMaster: rp.part_master_detail ?? rp.shop_part_detail?.part,
      })));
    } catch (err) {
      Alert.alert('Error', 'Failed to load repair.');
    }
  };

  const loadMessages = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      const data = await getRepairMessages(token, repairId);
      setMessages(data);
    } catch (err) {
      Alert.alert('Error', 'Failed to load messages.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() && !offerPrice.trim()) {
      Alert.alert('Validation', 'Please enter a message or offer price.');
      return;
    }

    const optimisticMessage = {
      id: Date.now(),
      sender: userId,
      sender_email: "You",
      text: newMessage.trim() || null,
      price_offer: offerPrice ? parseFloat(offerPrice) : null,
      created_at: new Date().toISOString(),
      is_read: false,
    };

    setMessages(prev => [...prev, optimisticMessage]);
    setNewMessage('');
    setOfferPrice('');

    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      const payload = {};
      if (optimisticMessage.text) payload.text = optimisticMessage.text;
      if (optimisticMessage.price_offer) payload.price_offer = optimisticMessage.price_offer;

      await sendRepairMessage(token, repairId, payload);
    } catch (err) {
      Alert.alert('Error', 'Failed to send message.');
    }
  };

  // Returns the latest offer message (with offerId and price_offer) for booking
  const getLatestOffer = () => {
    return messages
      .filter((msg) => msg.price_offer != null)
      .slice(-1)[0];
  };

  const handleBookOffer = async () => {
    const latestOffer = getLatestOffer();

    console.log("💥 handleBookOffer called!");
    console.log("🟢 User isShop:", isShop);
    console.log("🟢 Latest offer:", latestOffer);
    console.log("🟢 Repair object:", JSON.stringify(repair, null, 2));

    if (!latestOffer) {
      Alert.alert('Error', 'No latest offer found.');
      return;
    }

    console.log("📌 offerId:", latestoffer.id);
    console.log("📌 price_offer:", latestOffer.price_offer);

    if (!latestoffer.id && latestoffer.id !== 0) {
      Alert.alert('Error', 'This offer cannot be booked (missing offer ID).');
      return;
    }

    if (!repair?.vehicle) {
      Alert.alert('Error', 'This repair has no vehicle ID.');
      return;
    }

    console.log("✅ Booking with offerId:", latestoffer.id, "vehicleId:", repair.vehicle);

    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      await bookPromotion(token, latestoffer.id, repair.vehicle);
      console.log("✅ Booking API call completed!");
      Alert.alert('Success', 'Offer booked!');
      navigation.goBack();
    } catch (err) {
      console.error("❌ Booking failed error object:", err);
      Alert.alert('Error', err.message || 'Failed to book offer');
    }
  };

  const handleUnbookOffer = async () => {
    const latestOffer = getLatestOffer();

    if (!latestOffer) {
      Alert.alert('Error', 'No latest offer found.');
      return;
    }

    if (!latestoffer.id && latestoffer.id !== 0) {
      Alert.alert('Error', 'This offer cannot be unbooked (missing offer ID).');
      return;
    }

    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      await unbookPromotion(token, latestoffer.id);
      Alert.alert('Success', 'Booking cancelled!');
      navigation.goBack();
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to cancel booking');
    }
  };

  const renderMessage = ({ item }) => {
    const isMine = item.sender === userId;
    return (
      <View
        key={item.id.toString()}
        style={[
          styles.messageBubble,
          isMine ? styles.myMessage : styles.theirMessage,
        ]}
      >
        <Text style={styles.sender}>{isMine ? 'You' : item.sender_email}</Text>
        {item.text ? (
          <Text style={styles.text}>{item.text}</Text>
        ) : null}
        {item.price_offer ? (
          <Text style={styles.offer}>💰 Offer: {item.price_offer} BGN</Text>
        ) : null}
        <Text style={styles.timestamp}>
          {new Date(item.created_at).toLocaleString()}
        </Text>
      </View>
    );
  };

  useEffect(() => {
    if (scrollViewRef.current && messages.length > 0) {
      scrollViewRef.current.scrollToEnd({ animated: true });
    }
  }, [messages]);

  // Handler for shops to confirm repair as done
  const handleConfirmRepair = async () => {
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      await confirmRepair(token, repairId, {
        description: repair.description
      });
      Alert.alert('Success', 'Repair confirmed as done!');
      await loadRepair();
    } catch (err) {
      console.error("❌ Confirm repair failed:", err);
      Alert.alert('Error', err.message || 'Failed to confirm repair');
    }
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: 'Details',
      headerBackTitleVisible: true,
      headerBackTitle: 'Back',
      headerTintColor: theme.colors.onPrimary,
      headerStyle: {
        backgroundColor: theme.colors.primary,
      },
      headerBackImage: undefined, // Use default system arrow
      headerRight: () =>
        isShop && repair && repair.status !== 'done' ? (
          <Button
            mode="text"
            compact
            onPress={handleSaveParts}
            labelStyle={{ color: theme.colors.onPrimary, fontSize: 16 }}
          >
            Save
          </Button>
        ) : null,
    });
  }, [navigation, selectedParts, isShop, repair, theme.colors.primary, theme.colors.onPrimary]);

  const handleSaveParts = async () => {
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      const shopProfileId = await AsyncStorage.getItem(STORAGE_KEYS.CURRENT_SHOP_ID);
      console.log('🧭 Starting handleSaveParts...');
      console.log('🧭 Current selectedParts:', selectedParts);

      let freshShopParts = await getShopParts(token);
      console.log('🧭 Fresh ShopParts:', freshShopParts);

      const repairPartsData = [];

      for (const part of selectedParts) {
        if (!part.partsMasterId) continue;

        let shopPartId = null;

        if (isShop) {
          let shopPart = freshShopParts.find(sp => sp.part?.id === parseInt(part.partsMasterId));

          if (shopPart) {
            console.log(`🧭 Found existing ShopPart for partId=${part.partsMasterId}: shopPartId=${shopPart.id}`);
            await updateShopPart(token, shopPart.id, {
              price: part.price,
              default_labor_cost: part.labor,
            });
          } else {
            console.log(`🟢 No ShopPart found for partId=${part.partsMasterId}, creating...`);
            shopPart = await createShopPart(token, {
              shop_profile: parseInt(shopProfileId),
              part_id: parseInt(part.partsMasterId),
              price: part.price || '0',
              labor: part.labor || '0',
              shop_sku: '',
            });
            freshShopParts.push(shopPart);
          }
          shopPartId = shopPart.id;
        }

        const partData = {
          quantity: parseInt(part.quantity),
          price_per_item_at_use: part.price,
          labor_cost: part.labor,
          note: part.note,
          part_master_id: parseInt(part.partsMasterId),
        };

        if (shopPartId) partData.shop_part_id = shopPartId;
              }

      console.log('🧭 Final repairPartsData to PATCH:', repairPartsData);

      await updateRepair(token, repairId, {
        description: repair.description,
        kilometers: repair.kilometers ? parseInt(repair.kilometers) : null,
        repair_type: repair.repair_type || null,
        repair_parts_data: repairPartsData,
      });

      Alert.alert('Success', 'Parts saved!');
      await loadRepair();
      navigation.reset({
        index: 1,
        routes: [
          { name: 'RepairsList' },
          { name: 'RepairChat', params: { repairId } },
        ],
      });
    } catch (err) {
      console.error("❌ Save Parts Error:", err);
      Alert.alert('Error', err.message || 'Failed to save parts');
    }
  };

  if (loading || !repair) {
    return <ActivityIndicator animating size="large" style={{ flex: 1 }} />;
  }

  const latestOffer = getLatestOffer();

  return (
    <>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
      >
        {/* Always-visible Repair Header at top */}
        <View style={{ position: 'relative', backgroundColor: theme.colors.background }}>
          <Card mode="outlined" style={styles.headerCard}>
            <TouchableOpacity onPress={() => setShowDetails(!showDetails)}>
              <Card.Title
                title={`Repair #${repairId}`}
                subtitle={`${repair.vehicle_make} ${repair.vehicle_model}`}
                right={(props) => (
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    {/* Hide Book and Cancel buttons entirely if repair.status is 'done' */}
                    {repair.status !== 'done' && (
                      <>
                        {!isShop && repair.status === 'open' && latestOffer && latestOffer.price_offer && (
                          <Button
                            mode="contained"
                            compact
                            contentStyle={{ paddingHorizontal: 8 }}
                            labelStyle={{ color: '#fff', fontSize: 12 }}
                            style={{ backgroundColor: theme.colors.primary, marginRight: 4 }}
                            onPress={handleBookOffer}
                          >
                            Book {latestOffer.price_offer} BGN
                          </Button>
                        )}
                        {!isShop && repair.status === 'ongoing' && latestOffer && latestOffer.price_offer && (
                          <Button
                            mode="outlined"
                            compact
                            contentStyle={{ paddingHorizontal: 8 }}
                            style={{ marginRight: 4, borderColor: theme.colors.error }}
                            textColor={theme.colors.error}
                            onPress={handleUnbookOffer}
                          >
                            Cancel Booking
                          </Button>
                        )}
                      </>
                    )}
                    {/* Keep Parts button always visible */}
                    <Button
                      mode={showPartsSection ? "contained" : "outlined"}
                      compact
                      style={{ marginRight: 4 }}
                      onPress={() => setShowPartsSection(prev => !prev)}
                    >
                      {showPartsSection ? 'Hide Parts' : 'Parts'}
                    </Button>
                    <IconButton {...props} icon={showDetails ? 'chevron-up' : 'chevron-down'} />
                  </View>
                )}
              />
            </TouchableOpacity>
            {showDetails && (
              <Card.Content>
                <Divider style={{ marginVertical: 6 }} />
                {isShop && repair.status !== 'done' ? (
                  <>
                    <TextInput
                      mode="outlined"
                      label="Description"
                      value={repair.description || ''}
                      onChangeText={(text) => setRepair((prev) => ({ ...prev, description: text }))}
                      style={{ marginVertical: 6 }}
                    />
                    <TextInput
                      mode="outlined"
                      label="Kilometers"
                      value={repair.kilometers?.toString() || ''}
                      keyboardType="numeric"
                      onChangeText={(text) => setRepair((prev) => ({ ...prev, kilometers: text }))}
                      style={{ marginVertical: 6 }}
                    />
                    {'repair_type' in repair ? (
                      <>
                        {isShop && repair.status !== 'done' && (
                          <>
                            <Text variant="labelLarge" style={{ marginBottom: 4 }}>Repair Type *</Text>
                            <Menu
                              visible={repairTypeMenuVisible}
                              onDismiss={() => setRepairTypeMenuVisible(false)}
                              anchor={
                                <Button
                                  mode="outlined"
                                  onPress={() => setRepairTypeMenuVisible(true)}
                                  style={{ marginVertical: 6 }}
                                >
                                  {repairTypes.find(t => t.id === repair.repair_type)?.name || "Select Repair Type"}
                                </Button>
                              }
                            >
                              {repairTypes.map((t) => (
                                <Menu.Item
                                  key={t.id}
                                  onPress={() => {
                                    setRepair((prev) => ({ ...prev, repair_type: t.id }));
                                    setRepairTypeMenuVisible(false);
                                  }}
                                  title={t.name}
                                />
                              ))}
                            </Menu>
                          </>
                        )}
                      </>
                    ) : null}
                    <Text>Status: {repair.status}</Text>
                  </>
                ) : (
                  <>
                    <Text>Description: {repair.description}</Text>
                    <Text>Status: {repair.status}</Text>
                    <Text>Kilometers: {repair.kilometers}</Text>
                    {'repair_type' in repair && repair.repair_type ? (
                      <Text>Repair Type: {repair.repair_type}</Text>
                    ) : null}
                  </>
                )}
                {/* Confirm as Done button for shops when repair is ongoing */}
                {isShop && repair.status === 'ongoing' && (
                  <>
                    <Divider style={{ marginVertical: 6 }} />
                    <Button
                      mode="contained"
                      buttonColor="green"
                      onPress={handleConfirmRepair}
                    >
                      Confirm as Done
                    </Button>
                  </>
                )}
                {showPartsSection && (
                  <>
                    <Divider style={{ marginVertical: 6 }} />
                    <Text style={{ fontWeight: 'bold', marginBottom: 4 }}>Parts Used</Text>

                    {isShop && repair.status !== 'done' && (
                      <Button
                        mode="contained"
                        compact
                        style={{ marginBottom: 8, backgroundColor: theme.colors.primary }}
                        labelStyle={{ color: theme.colors.onPrimary }}
                        onPress={() => {
                          navigation.push('SelectRepairParts', {
                            repairId,  // ensure repairId is passed
                            currentParts: selectedParts,
                            vehicleId: repair?.vehicle,
                            repairTypeId: repair?.repair_type,
                            description: repair?.description,
                            kilometers: repair?.kilometers,
                            status: repair?.status,
                            returnTo: 'RepairChat',
                          });
                        }}
                      >
                        Manage Parts
                      </Button>
                    )}

                    {selectedParts.length > 0 ? (
                      selectedParts.map((part, index) => (
                        <Card key={index} style={{ marginVertical: 6, backgroundColor: '#f9f9f9' }}>
                          <Card.Content>
                            <Text style={{ fontWeight: 'bold' }}>
                              {part.partsMaster?.name} ({part.partsMaster?.brand})
                            </Text>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', marginBottom: 4 }}>
                              <Text>Qty: {part.quantity}</Text>
                              <Text>Price: {part.price}</Text>
                              <Text>Labor: {part.labor}</Text>
                            </View>
                            {part.note ? <Text style={{ fontStyle: 'italic' }}>Note: {part.note}</Text> : null}
                          </Card.Content>
                        </Card>
                      ))
                    ) : (
                      <Text>No parts selected yet.</Text>
                    )}
                  </>
                )}
              </Card.Content>
            )}
          </Card>
        </View>

        {/* Chat Scroll Area */}
        <FlatList
          ref={scrollViewRef}
          data={messages}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderMessage}
          contentContainerStyle={{ padding: 10, paddingBottom: 20 }}
          keyboardShouldPersistTaps='handled'
          style={{ flex: 1 }}
          onContentSizeChange={() => {
            scrollViewRef.current?.scrollToEnd({ animated: true });
          }}
        />

        <View style={{ padding: 12, borderTopWidth: 1, borderColor: '#ddd', backgroundColor: theme.colors.background }}>
          <Button
            mode="contained"
            icon="message"
            onPress={() => setInputVisible(true)}
            style={{
              backgroundColor: theme.colors.primary,
            }}
            labelStyle={{ color: theme.colors.onPrimary }}
          >
            Write Message
          </Button>
        </View>
      </KeyboardAvoidingView>

      <Portal>
        <Modal
          visible={inputVisible}
          onDismiss={() => setInputVisible(false)}
          contentContainerStyle={{
            margin: 20,
            backgroundColor: 'white',
            padding: 30,
            borderRadius: 12,
          }}
        >
          <Card mode="outlined">
            <Card.Title title="Send Message" />
            <Card.Content>
              <TextInput
                placeholder="Your message..."
                value={newMessage}
                onChangeText={setNewMessage}
                style={{ marginBottom: 16, paddingVertical: 8 }}
                multiline
              />
              {isShop && (
                <TextInput
                  placeholder="Price (optional)"
                  value={offerPrice}
                  onChangeText={setOfferPrice}
                  keyboardType="numeric"
                  style={{ marginBottom: 16, paddingVertical: 8 }}
                />
              )}
              <Button
                mode="contained"
                onPress={() => {
                  handleSendMessage();
                  setInputVisible(false);
                }}
              >
                Send
              </Button>
            </Card.Content>
          </Card>
        </Modal>
      </Portal>

      {/* Parts modal removed */}
    </>
  );
}

const styles = StyleSheet.create({
  headerCard: {
    margin: 8,
  },
  messageBubble: {
    padding: 12,
    marginVertical: 4,
    borderRadius: 20,
    maxWidth: '80%',
    alignSelf: 'flex-start',
    backgroundColor: '#ECECEC',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  myMessage: {
    backgroundColor: '#DCF8C6',
    alignSelf: 'flex-end',
  },
  theirMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#ECECEC',
  },
  sender: {
    fontWeight: '600',
    marginBottom: 4,
  },
  text: {
    fontSize: 16,
    lineHeight: 22,
  },
  offer: {
    marginTop: 4,
    fontWeight: 'bold',
    color: '#007700',
    fontSize: 16,
  },
  timestamp: {
    marginTop: 4,
    fontSize: 10,
    color: '#777',
    alignSelf: 'flex-end',
  },
  inputCard: {
    margin: 8,
  },
  input: {
    marginBottom: 8,
  },
  inputContainer: {
    borderTopWidth: 1,
    borderColor: '#ddd',
    paddingHorizontal: 8,
    paddingVertical: Platform.OS === 'ios' ? 12 : 6,
    backgroundColor: '#fff',
  },
  collapsedBubble: {
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expandedInput: {
    marginHorizontal: 8,
  },
});