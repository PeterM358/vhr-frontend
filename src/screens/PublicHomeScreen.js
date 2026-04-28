import React from 'react';
import { ScrollView, View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import BaseStyles from '../styles/base';
import Logo from '../../assets/logo.svg';

export default function PublicHomeScreen({ navigation }) {
  return (
    <ScrollView contentContainerStyle={BaseStyles.container}>
      <View style={BaseStyles.contentWrapper}>
        <Text style={BaseStyles.loginTitle}>Welcome</Text>
        <View style={BaseStyles.logoContainer}>
          <Logo width={180} height={180} />
        </View>
        <Text style={BaseStyles.loginSubText}>
          Browse repair shops before signing in.
        </Text>

        <Button
          mode="contained"
          onPress={() => navigation.navigate('ShopMap')}
          style={BaseStyles.loginButton}
          contentStyle={BaseStyles.loginButtonContent}
          labelStyle={BaseStyles.loginButtonLabel}
        >
          Browse Shops
        </Button>

        <Button
          mode="outlined"
          onPress={() => navigation.navigate('Login')}
          style={BaseStyles.loginButton}
        >
          Sign In
        </Button>

        <Button
          mode="text"
          onPress={() => navigation.navigate('Register')}
        >
          Create Account
        </Button>
      </View>
    </ScrollView>
  );
}
