import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.pixelquest.iskorka',
  appName: 'Pixel Quest: Искорка',
  webDir: 'dist',
  backgroundColor: '#12092b',
  android: {
    backgroundColor: '#12092b'
  },
  ios: {
    contentInset: 'never'
  }
};

export default config;
