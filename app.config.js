// app.config.js
import 'dotenv/config';

export default {
  expo: {
    name: "vhr-frontend",
    slug: "vhr-frontend",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
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
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.anonymous.vhr-frontend"
    },
    android: {
      package: "com.mihailovv.vhrfrontend",
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#ffffff"
      },
      googleServicesFile: "./android/app/google-services.json"
    },
    web: {
      favicon: "./assets/favicon.png",
      meta: {
        viewport: "width=device-width, initial-scale=1"
      },
      links: [
        "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
      ]
    },
    extra: {
      eas: {
        projectId: "cde03e84-e27d-4ec0-9712-519a847ceb2d"
      },
      googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY
    },
    owner: "mihailovv"
  }
};