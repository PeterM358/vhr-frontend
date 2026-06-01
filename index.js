import { registerRootComponent } from 'expo';

import { registerBackgroundMessageHandler } from './src/notifications/firebaseMessaging';

// Must run before React mounts (native FCM background delivery).
registerBackgroundMessageHandler();

import App from './src/App.js';

registerRootComponent(App);
