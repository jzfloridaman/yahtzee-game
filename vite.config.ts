import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  base: './', // Changed from '/yahtzee/' to './' for Capacitor
  root: '.', // Set the root directory
  plugins: [vue()],
  build: {
    outDir: 'dist', // Output directory for the build
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith('.css')) {
            return 'assets/[name][extname]';
          }
          return 'assets/[name]-[hash][extname]';
        }
      }
    }
  },
  server: {
    open: true, // Automatically open the browser
    port: 3000,
    // Allow access from inside the docker network (the playwright sidecar
    // hits http://web:5173). 'localhost' + '127.0.0.1' are allowed by
    // default; add the dev-network service hostnames here.
    allowedHosts: ['web', 'yahtzee-game-web', 'yahtzee.localhost'],
  },
  css: {
    postcss: './postcss.config.js', // Ensure PostCSS is configured
  },
});