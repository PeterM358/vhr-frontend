// app.config.js
import { loadProjectEnv } from '@expo/env';
import fs from 'fs';
import path from 'path';

// Load .env.local / .env.development.local / .env (same order as Expo CLI)
loadProjectEnv(process.cwd());

const IOS_GOOGLE_SERVICES = './GoogleService-Info.plist';
const ANDROID_GOOGLE_SERVICES = './android/app/google-services.json';

function googleServicesFileIfExists(relativePath) {
  const absolutePath = path.resolve(process.cwd(), relativePath);
  return fs.existsSync(absolutePath) ? relativePath : undefined;
}

const iosGoogleServicesFile = googleServicesFileIfExists(IOS_GOOGLE_SERVICES);
const androidGoogleServicesFile = googleServicesFileIfExists(ANDROID_GOOGLE_SERVICES);

export default {
  expo: {
    name: "Veversal",
    slug: "vhr-frontend",
    scheme: "service1001",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./src/assets/icons/icon.png",
    userInterfaceStyle: "light",
    newArchEnabled: true,
    platforms: ["ios", "android", "web"],
    plugins: [
      "expo-notifications",
      [
        "expo-build-properties",
        {
          android: {
            compileSdkVersion: 35,
            targetSdkVersion: 34,
            minSdkVersion: 24,
            usesCleartextTraffic: true
          },
          ios: {
            useFrameworks: "static"
          }
        }
      ]
    ],
    splash: {
      image: "./src/assets/icons/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.mihailovv.vhrfrontend",
      ...(iosGoogleServicesFile ? { googleServicesFile: iosGoogleServicesFile } : {}),
    },
    android: {
      package: "com.mihailovv.vhrfrontend",
      adaptiveIcon: {
        foregroundImage: "./src/assets/icons/adaptive-icon.png",
        backgroundColor: "#ffffff"
      },
      ...(androidGoogleServicesFile ? { googleServicesFile: androidGoogleServicesFile } : {}),
      config: {
        googleMaps: {
          apiKey: process.env.GOOGLE_MAPS_API_KEY
        }
      }
    },
    web: {
      name: "Veversal",
      shortName: "Veversal",
      description: "Your vehicle service universe.",
      favicon: "./src/assets/icons/icon.png",
      bundler: "metro",
      output: "single",
      meta: {
        viewport: "width=device-width, initial-scale=1",
        "application-name": "Veversal",
        "apple-mobile-web-app-title": "Veversal",
      },
    },
    extra: {
      eas: {
        projectId: "cde03e84-e27d-4ec0-9712-519a847ceb2d"
      },
      firebaseMessagingEnabled: {
        ios: Boolean(iosGoogleServicesFile),
        android: Boolean(androidGoogleServicesFile),
      },
      googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY,
      googleClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
      googleAndroidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
      apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL,
      wsBaseUrl: process.env.EXPO_PUBLIC_WS_BASE_URL,
      wsEnabled: process.env.EXPO_PUBLIC_WS_ENABLED,
    },
    owner: "mihailovv"
  }
};
