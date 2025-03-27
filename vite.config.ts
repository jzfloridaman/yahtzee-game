import { defineConfig } from 'vite';

export default defineConfig({
  root: '.', // Set the root directory
  build: {
    outDir: 'dist', // Output directory for the build
  },
  server: {
    open: true, // Automatically open the browser
  },
});