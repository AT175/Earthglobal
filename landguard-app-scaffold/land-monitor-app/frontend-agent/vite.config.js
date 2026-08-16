import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('socket.io-client') || id.includes('engine.io-client') || id.includes('socket.io-parser')) {
              return 'realtime';
            }
            if (id.includes('@react-google-maps/api')) {
              return 'maps';
            }
            if (id.includes('framer-motion')) {
              return 'motion';
            }
            if (id.includes('react-router') || id.includes('react-dom') || id.includes('/react/') || id.includes('styled-components') || id.includes('i18next') || id.includes('react-i18next')) {
              return 'vendor';
            }
          }
        },
      },
    },
  },
});
