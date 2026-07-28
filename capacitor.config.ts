import type { CapacitorConfig } from '@capacitor/cli'

/**
 * Phase 1 Play Internal Testing:
 * - Loads the live Render site inside the Android WebView.
 * - Web fixes on Render appear without a new Play upload.
 * - For a fully offline-bundled APK later, remove `server.url` and set
 *   VITE_API_BASE_URL=https://nappol-project.onrender.com when building.
 */
const LIVE_URL = process.env.CAP_SERVER_URL || 'https://nappol-project.onrender.com'

const config: CapacitorConfig = {
  appId: 'com.deeja.app',
  appName: 'DeeJa',
  webDir: 'dist',
  server: {
    url: LIVE_URL,
    cleartext: false,
    androidScheme: 'https',
    allowNavigation: [
      'nappol-project.onrender.com',
      '*.supabase.co',
      'accounts.google.com',
      '*.google.com',
      'access.line.me',
      'api.line.me',
    ],
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      backgroundColor: '#e91e8c',
      showSpinner: false,
      androidSplashResourceName: 'splash',
    },
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#e91e8c',
      overlaysWebView: false,
    },
  },
  android: {
    allowMixedContent: false,
    backgroundColor: '#e91e8c',
  },
}

export default config
