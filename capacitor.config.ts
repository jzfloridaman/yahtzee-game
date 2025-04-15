import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.yahtzeegame.app',
  appName: 'Color Yahtzee',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: true,
    allowNavigation: ['*']
  },
  android: {
    allowMixedContent: true
  },
  ios: {
    limitsNavigationsToAppBoundDomains: true
  }
};

export default config;
