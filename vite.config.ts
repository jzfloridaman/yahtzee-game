import { defineConfig } from 'vite';

export default defineConfig({
  base: '/yahtzee/', // Set the base URL for deployment
  root: '.', // Set the root directory
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
    port: 3000
  },
  css: {
    postcss: './postcss.config.js', // Ensure PostCSS is configured
  },
});