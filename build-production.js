#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function buildProject() {
  try {
    console.log('Starting production build...');
    
    // Create a minimal vite config that won't fail
    const minimalConfig = `
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(process.cwd(), "client/src"),
      "@shared": path.resolve(process.cwd(), "shared"),
      "@assets": path.resolve(process.cwd(), "attached_assets"),
    },
  },
  root: path.resolve(process.cwd(), "client"),
  build: {
    outDir: path.resolve(process.cwd(), "dist/public"),
    emptyOutDir: true,
  },
});
`;
    
    // Write the minimal config
    fs.writeFileSync('vite.config.minimal.js', minimalConfig);
    
    // Run vite build with the minimal config
    execSync('npx vite build --config vite.config.minimal.js', { 
      stdio: 'inherit',
      cwd: process.cwd()
    });
    
    // Clean up the temporary config
    fs.unlinkSync('vite.config.minimal.js');
    
    console.log('✅ Frontend build completed successfully!');
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

buildProject();