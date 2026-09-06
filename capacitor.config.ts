import type { CapacitorConfig } from "@capacitor/cli";

// Native shells for the App Store / Play Store. The app is a server-rendered
// Next.js site, so the shell loads the live URL in a native WebView rather
// than bundling static files — every deploy reaches the apps instantly with
// no store review. native/www is only the offline fallback.
//
// CAP_SERVER_URL lets a build point at a preview or the new domain:
//   CAP_SERVER_URL=https://rigvise.com npx cap sync
const serverUrl = process.env.CAP_SERVER_URL ?? "https://rigwise.ca";

const config: CapacitorConfig = {
  appId: "com.rigvise.app",
  appName: "RigVise",
  webDir: "native/www",
  server: {
    url: serverUrl,
    // Keep the auth/session cookies first-party in the WebView.
    androidScheme: "https",
    // The app may follow links only to our own hosts and Supabase (storage
    // signed URLs, auth). Anything else opens in the system browser.
    allowNavigation: ["rigwise.ca", "*.rigwise.ca", "rigvise.com", "*.rigvise.com", "*.supabase.co"],
  },
  android: {
    allowMixedContent: false,
    backgroundColor: "#0d0f12",
  },
  ios: {
    contentInset: "automatic",
    backgroundColor: "#0d0f12",
    // Camera (QR scan, card photos) uses getUserMedia/file capture inside the
    // WebView — needs the Info.plist usage strings set in ios/App.
    limitsNavigationsToAppBoundDomains: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 900,
      launchAutoHide: true,
      backgroundColor: "#0d0f12",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#0d0f12",
      overlaysWebView: false,
    },
  },
};

export default config;
