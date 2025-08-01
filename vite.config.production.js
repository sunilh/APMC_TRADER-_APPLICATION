import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": "./src",
      "@shared": "../shared",
      "@assets": "../attached_assets",
    },
  },
  define: {
    'import.meta.env.VITE_API_URL': JSON.stringify('https://traderapp-8lkr.onrender.com'),
  },
  build: {
    outDir: "../dist/public",
    emptyOutDir: true,
  },
  css: {
    postcss: {
      plugins: {
        tailwindcss: {},
        autoprefixer: {},
      },
    },
  },
});