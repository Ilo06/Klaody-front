import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ilo.klaody',
  appName: 'klaody',
  webDir: 'dist',
  backgroundColor: '#f7f4ee',
  plugins: {
    SystemBars: { insetsHandling: 'css', initialViewportFitValueHint: 'cover' },
  },
};

export default config;
