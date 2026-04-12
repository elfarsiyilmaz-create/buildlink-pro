import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'nl.alhangroep.app',
  appName: 'Alhan Groep',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  // Custom URL scheme for OAuth deep links (App.addListener('appUrlOpen', …))
  plugins: {
    App: {
      urlScheme: 'buildlinkpro'
    },
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#B91C1C',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      iosSpinnerStyle: 'small',
      spinnerColor: '#FFFFFF'
    }
  },
  ios: {
    contentInset: 'always',
    scrollEnabled: true,
    backgroundColor: '#FFFFFF'
  },
};

export default config;
