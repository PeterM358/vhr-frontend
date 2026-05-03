import React from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Text } from 'react-native-paper';
import BaseStyles from '../styles/base';
import Logo from '../assets/images/logo.svg';
import ScreenBackground from '../components/ScreenBackground';

export default function PublicHomeScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const topPad = insets.top + 16;

  return (
    <ScreenBackground safeArea={false}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          {
            paddingTop: topPad,
            paddingBottom: Math.max(insets.bottom, 16) + 24,
          },
        ]}
      >
        <View style={styles.card}>
          <Text style={styles.title}>Welcome</Text>
          <View style={BaseStyles.logoContainer}>
            <Logo width={160} height={160} />
          </View>
          <Text style={styles.subtitle}>
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
            style={[BaseStyles.loginButton, styles.outlinedBtn]}
            textColor="#fff"
          >
            Sign In
          </Button>

          <Button
            mode="text"
            onPress={() => navigation.navigate('Register')}
            textColor="#fff"
          >
            Create Account
          </Button>
        </View>
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    backgroundColor: 'rgba(5,15,30,0.72)',
    borderColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderRadius: 22,
    padding: 22,
    alignItems: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.78)',
    textAlign: 'center',
    marginBottom: 18,
  },
  outlinedBtn: {
    borderColor: 'rgba(255,255,255,0.5)',
  },
});
