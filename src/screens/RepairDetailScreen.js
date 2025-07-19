import React, { useEffect, useState, useMemo, useLayoutEffect } from 'react';
import {
  View,
  Alert,
  ActivityIndicator,
  StyleSheet,
  FlatList
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Card,
  Text,
  TextInput,
  Button,
  Divider,
  useTheme,
} from 'react-native-paper';
import { Picker } from '@react-native-picker/picker';

import {
  getRepairById,
  getRepairParts,
  addRepairPart,
  deleteRepairPart,
  updateRepairPart,
  updateRepair,
  confirmRepair,
  getOrCreateRepairChat,
  getRepairChatMessages,
  sendRepairChatMessage,
  getRepairChatsByRepairId,
  // getRepairChatById, // <-- No longer used
} from '../api/repairs';
import { getShopParts, prepareRepairPartsData } from '../api/parts';
import { getOffersForRepair, bookOffer, unbookOffer } from '../api/offers';
import { RepairsList } from '../components/shop/RepairsList';

export default function RepairDetailScreen({ route, navigation }) {
  useLayoutEffect(() => {
    navigation.setOptions({
      headerBackTitleVisible: false,
    });
  }, [navigation]);
  const { repairId } = route.params;
  const theme = useTheme();

  const [repair, setRepair] = useState(null);
  const [repairParts, setRepairParts] = useState([]);
  const [selectedParts, setSelectedParts] = useState([]);
  const [availableShopParts, setAvailableShopParts] = useState([]);
  const [newPart, setNewPart] = useState({
    shopPartId: '',
    quantity: '1',
    price: '',
    note: '',
  });

  const [loading, setLoading] = useState(true);
  const [isShop, setIsShop] = useState(false);
  const [shopUserId, setShopUserId] = useState(null);
  const [shopProfileId, setShopProfileId] = useState(null);
  const [editDescription, setEditDescription] = useState('');
  const [finalKilometers, setFinalKilometers] = useState('');
  const [offers, setOffers] = useState([]);
  const [chatId, setChatId] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [newChatMessage, setNewChatMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  // New state for client chat list and selected chat
  const [repairChats, setRepairChats] = useState([]);
  const [selectedChatId, setSelectedChatId] = useState(null);
  // New state to track the full active chat object
  const [activeChat, setActiveChat] = useState(null);
  // New state for expanded/collapsed chat cards (client)
  const [expandedChats, setExpandedChats] = useState({});

  const handleUpdateRepair = async () => {
    console.log("💾 Save button clicked");
    const partsToSend = selectedParts.length > 0 ? selectedParts : repairParts;
    try {
      const token = await AsyncStorage.getItem('@access_token');
      const shopProfileId = await AsyncStorage.getItem('@current_shop_id');
      const { repairPartsData, newShopParts } = await prepareRepairPartsData(
        token,
        shopProfileId,
        partsToSend,
        availableShopParts
      );
      setAvailableShopParts(newShopParts);

      const body = {
        description: editDescription,
        repair_parts_data: repairPartsData,
      };
      console.log('📦 Body to send:', JSON.stringify(body, null, 2));

      await updateRepair(token, repairId, body);
      await refreshRepair();
      await refreshParts();
      Alert.alert('Saved', 'Repair updated successfully.');
    } catch (err) {
      console.error('❌ Update Error:', err);
      Alert.alert('Error', err.message || 'Failed to update repair');
    }
  };

  // Section expand/collapse state
  const [sectionExpanded, setSectionExpanded] = useState({
    repair: true,
    parts: true,
    offers: true,
    chats: true,
  });

  // Utility function to toggle section
  const toggleSection = (section) => {
    setSectionExpanded(prev => ({ ...prev, [section]: !prev[section] }));
  };

  useEffect(() => {
    const loadData = async () => {
      const token = await AsyncStorage.getItem('@access_token');
      const shopFlag = await AsyncStorage.getItem('@is_shop');
      const userIdStored = await AsyncStorage.getItem('@user_id');
      setIsShop(shopFlag === 'true');
      setShopUserId(parseInt(userIdStored));

      // Fetch shop profile id if isShop
      let shopProfileIdStored = null;
      if (shopFlag === 'true') {
        shopProfileIdStored = await AsyncStorage.getItem('@current_shop_id');
        setShopProfileId(parseInt(shopProfileIdStored));
      } else {
        setShopProfileId(null);
      }

      try {
        let repairData;
        if (shopFlag === 'true') {
          const [r, partsData, shopPartsData] = await Promise.all([
            getRepairById(token, repairId),
            getRepairParts(token, repairId),
            getShopParts(token),
          ]);
          repairData = r;
          setRepairParts(partsData);
          setAvailableShopParts(shopPartsData);
        } else {
          repairData = await getRepairById(token, repairId);
          setRepairParts(repairData.repair_parts || []);
        }

        setRepair(repairData);
        setEditDescription(repairData.description || '');
        const offersData = await getOffersForRepair(token, repairId);
        setOffers(offersData);

        // Check if a chat already exists for this shop
        if (shopFlag === 'true' && shopProfileIdStored) {
          const chatList = await getRepairChatsByRepairId(token, repairId);
          const existingChat = chatList.find(chat => parseInt(chat.shop) === parseInt(shopProfileIdStored));
          if (existingChat) {
            setChatId(existingChat.id);
            const fullChat = await getRepairChatById(token, existingChat.id);
            setActiveChat(fullChat);
            setChatMessages(fullChat.messages || []);
          }
        } else {
          const chatList = await getRepairChatsByRepairId(token, repairId);
          setRepairChats(chatList);
          if (chatList.length > 0) {
            const firstChat = chatList[0];
            const messages = await getRepairChatMessages(token, firstChat.id);
            setSelectedChatId(firstChat.id);
            setChatMessages(messages);
          }
        }
      } catch (error) {
        console.error(error);
        Alert.alert('Error', 'Failed to load repair data.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [repairId]);

  // Handle route.params updates (e.g., after selecting parts)
  useEffect(() => {
    if (route.params?.addedParts) {
      setSelectedParts(route.params.addedParts);
    }
  }, [route.params]);

  // If using useLayoutEffect to set navigation options, ensure selectedParts is in the dependency array.
  // (Not present in this file, but if you add one, include selectedParts as a dependency.)

  // Handler to start chat for shop user (prevents duplicate chat creation)
  const handleStartChat = async () => {
    try {
      const token = await AsyncStorage.getItem('@access_token');

      // 1. Always check for existing chat using repairId (and implicitly the shop via backend filtering)
      const chatList = await getRepairChatsByRepairId(token, repairId);
      const existingChat = chatList.find(chat => parseInt(chat.shop_id) === parseInt(shopProfileId));
      if (existingChat) {
        setChatId(existingChat.id);
        setActiveChat(existingChat);
        const messages = await getRepairChatMessages(token, existingChat.id);
        setChatMessages(messages);
        return;
      }

      // 2. If no existing chat, create one
      const newChat = await getOrCreateRepairChat(token, repairId, shopProfileId);
      setChatId(newChat.id);
      setActiveChat(newChat);
      const messages = await getRepairChatMessages(token, newChat.id);
      setChatMessages(messages);
    } catch (error) {
      console.error("❌ Failed to start chat:", error);
      Alert.alert('Error', 'Failed to start chat.');
    }
  };
  const handleSendChatMessage = async () => {
    const targetChatId = isShop ? chatId : selectedChatId;
    if (!targetChatId || !newChatMessage.trim()) return;
    setSendingMessage(true);
    try {
      const token = await AsyncStorage.getItem('@access_token');
      const message = await sendRepairChatMessage(token, targetChatId, { text: newChatMessage.trim() });
      setChatMessages(prev => [...prev, message]);
      setNewChatMessage('');
    } catch (err) {
      Alert.alert('Error', 'Failed to send message.');
    } finally {
      setSendingMessage(false);
    }
  };

  // Refresh offers and repair when coming back to this screen
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      refreshRepair();
      refreshOffers();
    });
    return unsubscribe;
  }, [navigation, repairId]);

  const refreshOffers = async () => {
    const token = await AsyncStorage.getItem('@access_token');
    const offersData = await getOffersForRepair(token, repairId);
    setOffers(offersData);
  };

  const refreshRepair = async () => {
    const token = await AsyncStorage.getItem('@access_token');
    const repairData = await getRepairById(token, repairId);
    setRepair(repairData);
    setEditDescription(repairData.description || '');
  };

  const refreshParts = async () => {
    const token = await AsyncStorage.getItem('@access_token');
    const parts = await getRepairParts(token, repairId);
    setRepairParts(parts);
  };

  const isMyShopRepair = useMemo(() => {
    return isShop && repair && repair.shop === shopUserId;
  }, [isShop, repair, shopUserId]);

  const handleAddPart = async () => {
    if (!newPart.shopPartId) {
      Alert.alert('Validation', 'Select a part.');
      return;
    }
    try {
      const token = await AsyncStorage.getItem('@access_token');
      await addRepairPart(token, repairId, {
        shop_part_id: parseInt(newPart.shopPartId),
        quantity: parseInt(newPart.quantity),
        price_per_item_at_use: newPart.price,
        note: newPart.note,
      });
      setNewPart({ shopPartId: '', quantity: '1', price: '', note: '' });
      await refreshParts();
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to add part.');
    }
  };

  const handleDeletePart = async (partId) => {
    try {
      const token = await AsyncStorage.getItem('@access_token');
      await deleteRepairPart(token, repairId, partId);
      await refreshParts();
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to delete part.');
    }
  };

  const handleUpdatePart = async (partId, field, value) => {
    try {
      const token = await AsyncStorage.getItem('@access_token');
      await updateRepairPart(token, repairId, partId, { [field]: value });
      await refreshParts();
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to update part.');
    }
  };

  const handleBookOffer = async (selectedOfferId) => {
    console.log("💥 handleBookOffer called");
    console.log("📌 FULL repair object:", JSON.stringify(repair, null, 2));
    console.log("📌 repair.offer:", repair?.offer);
    console.log("📌 repair.vehicle:", repair?.vehicle);

    if (!selectedOfferId || !repair?.vehicle) {
      Alert.alert('Error', 'Missing offer or vehicle information.');
      return;
    }

    try {
      const token = await AsyncStorage.getItem('@access_token');
      await bookOffer(token, selectedOfferId, repair.vehicle);
      console.log("✅ Booking request sent:", selectedOfferId, repair.vehicle);
      Alert.alert('Success', 'Offer booked!');
      await refreshRepair();
      await refreshOffers();
    } catch (err) {
      console.error("❌ Booking failed:", err);
      Alert.alert('Error', err.message || 'Failed to book offer');
    }
  };

  const handleUnbookOffer = async (selectedOfferId) => {
    console.log("💥 handleUnbookOffer called");
    console.log("📌 selectedOfferId:", selectedOfferId);
    console.log("📌 repair.vehicle:", repair?.vehicle);

    if (!selectedOfferId || !repair?.vehicle) {
      Alert.alert('Error', 'Missing offer or vehicle information.');
      return;
    }

    try {
      const token = await AsyncStorage.getItem('@access_token');
      await unbookOffer(token, selectedOfferId, repair.vehicle);
      Alert.alert('Booking Cancelled', 'You have cancelled your booking.');
      await refreshRepair();
      await refreshOffers();
    } catch (err) {
      console.error("❌ Cancel failed:", err);
      Alert.alert('Error', err.message || 'Failed to cancel booking');
    }
  };

  const renderRepairPartItem = ({ item }) => (
    <View style={{ borderBottomWidth: 1, borderBottomColor: '#ddd', paddingVertical: 6 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ flex: 2 }}>
          {item.partsMaster?.name || item.part_master_detail?.name || item.shop_part_detail?.part?.name || 'Unnamed Part'}
        </Text>
        <Text style={{ flex: 1, textAlign: 'center' }}>{item.quantity}</Text>
        <Text style={{ flex: 1, textAlign: 'center' }}>
          {item.price_per_item_at_use ?? item.price ?? '—'}
        </Text>
        <Text style={{ flex: 1, textAlign: 'center' }}>
          {item.labor_cost ?? item.labor ?? '—'}
        </Text>
      </View>
      {item.note ? <Text style={{ fontStyle: 'italic', fontSize: 12, marginTop: 2 }}>Note: {item.note}</Text> : null}
    </View>
  );

  if (loading || !repair) {
    return <ActivityIndicator size="large" style={{ flex: 1 }} />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <FlatList
        ListHeaderComponent={
          <View>
            <Card mode="outlined" style={styles.headerCard}>
              <Card.Title
                title={`Repair #${repairId}`}
                subtitle={`${repair.vehicle_make} ${repair.vehicle_model} (${repair.vehicle_license_plate})`}
                right={(props) => (
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    {isShop && repair.status !== 'done' && (
                      <Button
                        compact
                        mode="contained"
                        onPress={() => {
                          console.log("💾 Save button clicked");
                          handleUpdateRepair(); // Ensure this is the correct call
                        }}
                        style={{ marginRight: 8 }}
                      >
                        Save
                      </Button>
                    )}
                    <Button onPress={() => toggleSection('repair')}>
                      {sectionExpanded.repair ? 'Hide' : 'Show'}
                    </Button>
                  </View>
                )}
              />
              {sectionExpanded.repair && (
                <Card.Content>
                  <Divider style={{ marginVertical: 8 }} />
                  <Text variant="bodyMedium">Status: {repair.status}</Text>
                  <Text variant="bodyMedium">Description: {repair.description}</Text>
                  <Text variant="bodyMedium">Kilometers: {repair.kilometers}</Text>
                  {repair.final_kilometers !== null && (
                    <Text variant="bodyMedium">Final Kilometers: {repair.final_kilometers}</Text>
                  )}

                  {/* Parts Used section inside the Repair Card */}
                  <Divider style={{ marginVertical: 12 }} />
                  <Text variant="titleSmall" style={{ marginBottom: 6 }}>Parts Used</Text>
                  <View style={{ alignItems: 'flex-start', marginBottom: 8 }}>
                    <Button
                      mode="outlined"
                      onPress={() => {
                        navigation.navigate('SelectRepairParts', {
                          currentParts: (selectedParts.length > 0 ? selectedParts : repairParts).map(p => ({
                            partsMasterId: p.partsMasterId || p.part_master || p.part_master_detail?.id || p.partsMaster?.id || p.shop_part?.part?.id,
                            shopPartId: p.shopPartId || p.shop_part_id || p.shop_part?.id,
                            quantity: p.quantity || 1,
                            price: p.price || p.price_per_item_at_use || '',
                            labor: p.labor || p.labor_cost || '',
                            note: p.note || '',
                            partsMaster: p.partsMaster || p.part_master_detail || p.parts_master_detail || p.shop_part_detail?.part || {},
                          })),
                          vehicleId: repair.vehicle?.toString() || '',
                          repairTypeId: repair.repair_type?.toString() || '',
                          description: editDescription || '',
                          kilometers: repair.kilometers?.toString() || '',
                          status: repair.status || 'open',
                          returnTo: 'RepairDetail',
                          repairId: repairId,
                        });
                      }}
                    >
                      Manage Parts
                    </Button>
                  </View>
                  {(selectedParts.length > 0 ? selectedParts : repairParts).length === 0 ? (
                    <Text style={{ fontStyle: 'italic', color: 'gray' }}>No parts recorded yet.</Text>
                  ) : (
                    <>
                      {/* Table header row */}
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                        <Text style={{ flex: 2, fontWeight: 'bold' }}>Part</Text>
                        <Text style={{ flex: 1, fontWeight: 'bold', textAlign: 'center' }}>Qty</Text>
                        <Text style={{ flex: 1, fontWeight: 'bold', textAlign: 'center' }}>Price</Text>
                        <Text style={{ flex: 1, fontWeight: 'bold', textAlign: 'center' }}>Labor</Text>
                      </View>
                      {(selectedParts.length > 0 ? selectedParts : repairParts).map((item, index) => (
                        <View key={item.id || index}>
                          {renderRepairPartItem({ item })}
                        </View>
                      ))}
                      {/* Total row */}
                      {(selectedParts.length > 0 ? selectedParts : repairParts).length > 0 && (
                        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10 }}>
                          <Text style={{ fontWeight: 'bold', marginRight: 10 }}>Total:</Text>
                          <Text>
                            {(
                              (selectedParts.length > 0 ? selectedParts : repairParts).reduce((acc, part) => {
                                const price = parseFloat(part.price) || parseFloat(part.price_per_item_at_use) || 0;
                                const labor = parseFloat(part.labor) || parseFloat(part.labor_cost) || 0;
                                const qty = parseInt(part.quantity) || 1;
                                return acc + (price + labor) * qty;
                              }, 0)
                            ).toFixed(2)} BGN
                          </Text>
                        </View>
                      )}
                    </>
                  )}

                  {isMyShopRepair && (
                    <>
                      <Divider style={{ marginVertical: 12 }} />
                      <Text variant="titleSmall">Edit Description</Text>
                      <TextInput
                        mode="outlined"
                        placeholder="New description"
                        value={editDescription}
                        onChangeText={setEditDescription}
                        style={styles.input}
                      />
                      <Button mode="contained" onPress={async () => {
                        await updateRepair(await AsyncStorage.getItem('@access_token'), repairId, { description: editDescription });
                        Alert.alert('Updated', 'Description saved.');
                        await refreshRepair();
                      }} style={styles.button}>
                        Save Changes
                      </Button>

                      {repair.status === 'ongoing' && (
                        <>
                          <TextInput
                            mode="outlined"
                            placeholder="Final kilometers"
                            keyboardType="numeric"
                            value={finalKilometers}
                            onChangeText={setFinalKilometers}
                            style={styles.input}
                          />
                          <Button
                            mode="contained"
                            buttonColor="green"
                            onPress={handleConfirmRepair}
                          >
                            Confirm as Done
                          </Button>
                        </>
                      )}
                    </>
                  )}

                </Card.Content>
              )}
            </Card>


            <Card mode="outlined" style={styles.headerCard}>
              <Card.Title
                title="Offers"
                right={(props) => (
                  <Button onPress={() => toggleSection('offers')}>
                    {sectionExpanded.offers ? 'Hide' : 'Show'}
                  </Button>
                )}
              />
              {sectionExpanded.offers && (
                <Card.Content>
                  {offers.length === 0 ? (
                    <Text style={{ textAlign: 'center', marginVertical: 10 }}>No offers yet.</Text>
                  ) : (
                    (() => {
                      const hasBooked = offers.some((o) => o.is_booked);
                      const sortedOffers = [...offers].sort((a, b) => (b.is_booked ? 1 : 0) - (a.is_booked ? 1 : 0));
                      return sortedOffers.map((offer) => (
                        <Card key={offer.id} style={styles.offerCard} mode="outlined">
                          <Card.Title
                            title={offer.description || 'Offer'}
                            subtitle={`Price: ${offer.price ?? 'N/A'} BGN`}
                          />
                          <Text style={{ color: 'gray' }}>
                            🧠 is_booked: {offer.is_booked ? '✅' : '❌'}
                          </Text>
                          <Card.Content>
                            {offer.parts && offer.parts.length > 0 && (
                              <>
                                <Text>Included Parts:</Text>
                                {offer.parts.map((part, idx) => (
                                  <Text key={idx} style={{ marginLeft: 8 }}>
                                    - {part.parts_master_detail?.name || 'Unnamed'} x{part.quantity}
                                  </Text>
                                ))}
                              </>
                            )}
                            {isShop && shopProfileId !== null && parseInt(offer.shop) === shopProfileId && (
                              <Button
                                mode="outlined"
                                onPress={() =>
                                  navigation.navigate('CreateOrUpdateOffer', {
                                    repairId,
                                    offerId: offer.id,
                                    existingOffer: offer,
                                    selectedOfferParts: offer.parts || [],
                                  })
                                }
                                style={{ marginTop: 8 }}
                              >
                                Update Offer
                              </Button>
                            )}
                            {!isShop && (
                              <>
                                {offer.is_booked && (
                                  <Button
                                    mode="outlined"
                                    onPress={() => handleUnbookOffer(offer.id)}
                                    style={{ marginTop: 8 }}
                                  >
                                    Cancel Booking
                                  </Button>
                                )}
                                {!hasBooked && !offer.is_booked && (
                                  <Button
                                    mode="contained"
                                    onPress={() => handleBookOffer(offer.id)}
                                    style={{ marginTop: 8 }}
                                  >
                                    {offer.is_promotion ? 'Book Promotion' : 'Book Offer'}
                                  </Button>
                                )}
                              </>
                            )}
                          </Card.Content>
                        </Card>
                      ));
                    })()
                  )}
                </Card.Content>
              )}
            </Card>

            {/* Shop: Start Chat with Client button (only if no chatId and no chat messages) */}
            {isShop && !chatId && chatMessages.length === 0 && (
              <Button
                mode="contained"
                style={{ marginHorizontal: 10, marginVertical: 10 }}
                onPress={handleStartChat}
              >
                Chat
              </Button>
            )}

            {/* Shop: Show chat directly after button if chat started */}
            {isShop && chatId && chatMessages.length > 0 && (
              <Card style={{ marginHorizontal: 10, marginBottom: 10 }} mode="outlined">
                <Card.Title title="Chat with Client" />
                <Card.Content>
                  {chatMessages.map((msg) => (
                    <View key={msg.id} style={{ marginBottom: 8 }}>
                      <Text style={{ fontWeight: 'bold' }}>{msg.sender_email || 'Unknown'}</Text>
                      <Text>{msg.text}</Text>
                      <Text style={{ fontSize: 10, color: '#666' }}>{new Date(msg.created_at).toLocaleString()}</Text>
                    </View>
                  ))}
                  <TextInput
                    mode="outlined"
                    label="Write a message"
                    value={newChatMessage}
                    onChangeText={setNewChatMessage}
                    style={{ marginTop: 10 }}
                  />
                  <Button
                    mode="contained"
                    onPress={handleSendChatMessage}
                    loading={sendingMessage}
                    disabled={sendingMessage || !newChatMessage.trim()}
                    style={{ marginTop: 10 }}
                  >
                    Send
                  </Button>
                </Card.Content>
              </Card>
            )}

            {/* Client: Collapsible Chat card for all repair chats */}
            {!isShop && (
              <Card mode="outlined" style={styles.headerCard}>
                <Card.Title
                  title="Chat"
                  right={(props) => (
                    <Button onPress={() => toggleSection('chats')}>
                      {sectionExpanded.chats ? 'Hide' : 'Show'}
                    </Button>
                  )}
                />
                {sectionExpanded.chats && (
                  <Card.Content>
                    {/* Client: List repair chats from shops, collapsible per chat */}
                    {repairChats.length > 0 && (
                      <>
                        <Text style={styles.sectionTitle}>Chats from Shops</Text>
                        {repairChats.map((chat) => {
                          const isExpanded = expandedChats[chat.id];
                          return (
                            <Card
                              key={chat.id}
                              style={{ marginHorizontal: 10, marginBottom: 10 }}
                              onPress={async () => {
                                if (!isExpanded) {
                                  const token = await AsyncStorage.getItem('@access_token');
                                  const messages = await getRepairChatMessages(token, chat.id);
                                  setSelectedChatId(chat.id);
                                  setChatMessages(messages);
                                }
                                setExpandedChats(prev => ({ ...prev, [chat.id]: !isExpanded }));
                              }}
                            >
                              <Card.Title
                                title={chat.shop_name || `Shop #${chat.shop_id}`}
                                subtitle={isExpanded ? 'Tap to collapse' : 'Tap to view chat'}
                              />
                              {isExpanded && (
                                <Card.Content>
                                  {chatMessages.length === 0 ? (
                                    <Text>No messages yet.</Text>
                                  ) : (
                                    chatMessages.map((msg) => (
                                      <View key={msg.id} style={{ marginBottom: 8 }}>
                                        <Text style={{ fontWeight: 'bold' }}>{msg.sender_email || 'Unknown'}</Text>
                                        <Text>{msg.text}</Text>
                                        <Text style={{ fontSize: 10, color: '#666' }}>{new Date(msg.created_at).toLocaleString()}</Text>
                                      </View>
                                    ))
                                  )}
                                  <TextInput
                                    mode="outlined"
                                    label="Your message"
                                    value={newChatMessage}
                                    onChangeText={setNewChatMessage}
                                    style={{ marginTop: 10 }}
                                  />
                                  <Button
                                    mode="contained"
                                    onPress={handleSendChatMessage}
                                    loading={sendingMessage}
                                    disabled={sendingMessage || !newChatMessage.trim()}
                                    style={{ marginTop: 10 }}
                                  >
                                    Send
                                  </Button>
                                </Card.Content>
                              )}
                            </Card>
                          );
                        })}
                        <Text style={{ marginLeft: 12, marginBottom: 8 }}>
                          {repairChats.length} shop(s) have messaged you.
                        </Text>
                      </>
                    )}
                  </Card.Content>
                )}
              </Card>
            )}
          </View>
        }
        contentContainerStyle={styles.listContent}
      />
      {/* Floating button for shops to send offer */}
      {isShop && (
        <Button
          icon="plus"
          mode="contained"
          onPress={() =>
            navigation.navigate('CreateOrUpdateOffer', {
              repairId,
              returnTo: 'RepairsList',
            })
          }
          style={{
            position: 'absolute',
            bottom: 20,
            right: 20,
            borderRadius: 30,
            padding: 6,
          }}
        >
          Send Offer
        </Button>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  headerCard: {
    margin: 10,
  },
  addPartCard: {
    marginHorizontal: 10,
    marginVertical: 10,
  },
  partCard: {
    marginHorizontal: 10,
    marginVertical: 6,
  },
  input: {
    marginVertical: 8,
  },
  sectionTitle: {
    margin: 12,
    fontWeight: '600',
    fontSize: 18,
    cursor: 'pointer',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  listContent: {
    paddingBottom: 20,
  },
  offerCard: {
    marginHorizontal: 10,
    marginVertical: 10,
  },
});