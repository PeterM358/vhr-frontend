// app.config.js
import 'dotenv/config';

export default {
  expo: {
    name: "Veversal",
    slug: "veversal",
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
            minSdkVersion: 24
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
      googleServicesFile: "./GoogleService-Info.plist"
    },
    android: {
      package: "com.mihailovv.vhrfrontend",
      adaptiveIcon: {
        foregroundImage: "./src/assets/icons/adaptive-icon.png",
        backgroundColor: "#ffffff"
      },
      googleServicesFile: "./android/app/google-services.json",
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
      googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY,
      googleClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
      googleAndroidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
      googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
      apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL,
      wsBaseUrl: process.env.EXPO_PUBLIC_WS_BASE_URL
    },
    owner: "mihailovv"
  }
};