import React, { useEffect, useState, useRef, useContext } from 'react';
import {
  View,
  StyleSheet,
  Platform,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  FlatList,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Text,
  TextInput,
  Button,
  Card,
  useTheme,
  ActivityIndicator,
  Portal,
  Modal,
} from 'react-native-paper';

import { getOfferMessages, sendOfferMessage } from '../api/offers';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { WebSocketContext } from '../context/WebSocketManager';


export default function OfferChatScreen({ route, navigation }) {
  const { offerId } = route.params;
  const theme = useTheme();
  const { notifications } = useContext(WebSocketContext);

  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  const [isShop, setIsShop] = useState(false);

  const [newMessage, setNewMessage] = useState('');
  const [offerPrice, setOfferPrice] = useState('');

  const [inputVisible, setInputVisible] = useState(false);
  const scrollViewRef = useRef();

  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', () => {});
    const hideSub = Keyboard.addListener('keyboardDidHide', () => {});
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    (async () => {
      const id = await AsyncStorage.getItem('@user_id');
      setUserId(parseInt(id));
      setIsShop((await AsyncStorage.getItem('@is_shop')) === 'true');
      await loadMessages();
    })();
  }, [offerId]);

  useEffect(() => {
    const matching = notifications.find(n => n.offer === offerId);
    if (matching) {
      const incomingMessage = {
        id: Date.now(),
        sender: matching.sender_id || 0,
        sender_email: matching.sender_email || "Unknown",
        text: matching.text ?? (matching.price_offer ? "💰 Offer Price" : null),
        price_offer: matching.price_offer ?? null,
        created_at: new Date().toISOString(),
        is_read: false,
      };
      setMessages(prev => [...prev, incomingMessage]);
    }
  }, [notifications]);

  const loadMessages = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      const data = await getOfferMessages(token, offerId);
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

      await sendOfferMessage(token, offerId, payload);
    } catch (err) {
      Alert.alert('Error', 'Failed to send message.');
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
        {item.text && <Text style={styles.text}>{item.text}</Text>}
        {item.price_offer && (
          <Text style={styles.offer}>💰 Offer: {item.price_offer} BGN</Text>
        )}
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

  if (loading) {
    return <ActivityIndicator animating size="large" style={{ flex: 1 }} />;
  }

  return (
    <>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
      >
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
    </>
  );
}

const styles = StyleSheet.create({
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
});