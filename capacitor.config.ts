import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'ma.shm.rapports.offline',
  appName: 'SHM Rapports',
  webDir: 'dist/spa',
  server: {
    androidScheme: 'https',
    cleartext: true, // Pour dev uniquement
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 3000,
    },
    Filesystem: {
      // Configuration du stockage fichiers
    },
  },
};

export default config;
