import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  // Forward only Vercel's public collection endpoints to the React SDK.
  define: {
    'import.meta.env.VITE_VERCEL_OBSERVABILITY_CLIENT_CONFIG': JSON.stringify(
      process.env.VITE_VERCEL_OBSERVABILITY_CLIENT_CONFIG
        ?? process.env.VERCEL_OBSERVABILITY_CLIENT_CONFIG
        ?? '',
    ),
  },
  plugins: [
    react(),
    tailwindcss(),
  ],
});