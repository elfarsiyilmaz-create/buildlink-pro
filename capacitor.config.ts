import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'nl.alhangroep.app',
  appName: 'Alhan Groep',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  ios: {
    contentInset: 'always',
    scrollEnabled: true,
    backgroundColor: '#FFFFFF'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#B91C1C',
      showSpinner: false
    }
  }
};

export default config;
