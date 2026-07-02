import React from 'react';
import { ActivityIndicator, Button, StyleSheet, Text, View } from 'react-native';
import ScreenBackground from '../ScreenBackground';

export default class LoginErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    console.error('LoginScreen render error:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <ScreenBackground>
          <View style={styles.center}>
            <Text style={styles.title}>Sign in unavailable</Text>
            <Text style={styles.body}>
              The login form could not load. You can try again or create a new account.
            </Text>
            <Button
              mode="contained"
              onPress={() => {
                this.setState({ hasError: false });
                this.props.onRetry?.();
              }}
            >
              Try again
            </Button>
            <Button mode="text" onPress={() => this.props.onGoHome?.()}>
              Back to home
            </Button>
          </View>
        </ScreenBackground>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 12,
  },
  title: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  body: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 8,
  },
});
