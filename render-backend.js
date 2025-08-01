#!/usr/bin/env node

import fs from 'fs';
import { execSync } from 'child_process';

console.log('🎯 Building backend for Render...');

// Create directories
if (fs.existsSync('dist')) {
  fs.rmSync('dist', { recursive: true, force: true });
}
fs.mkdirSync('dist', { recursive: true });

// Create uploads directories  
fs.mkdirSync('uploads', { recursive: true });
fs.mkdirSync('uploads/invoices', { recursive: true });
fs.mkdirSync('uploads/farmers', { recursive: true });
fs.mkdirSync('uploads/processed', { recursive: true });

console.log('⚡ Building backend with esbuild...');

try {
  // Build the backend with CommonJS format for better compatibility
  execSync('npx esbuild server/minimal-backend.ts --platform=node --packages=external --bundle --format=cjs --outfile=dist/server.js --external:pg-native', { stdio: 'inherit' });
  
  // Create package.json for production dependencies
  const productionPackage = {
    "name": "apmc-backend",
    "version": "1.0.0", 
    "main": "server.js",
    "scripts": {
      "start": "node server.js"
    },
    "dependencies": {
      "pg": "^8.11.0"
    }
  };
  
  fs.writeFileSync('dist/package.json', JSON.stringify(productionPackage, null, 2));
  console.log('📦 Created production package.json');
  
  // Verify the build output
  if (fs.existsSync('dist/server.js')) {
    const stats = fs.statSync('dist/server.js');
    console.log(`✓ dist/server.js created (${Math.round(stats.size / 1024)}KB)`);
  } else {
    throw new Error('server.js was not created');
  }
  
  console.log('✅ Backend build completed');
} catch (error) {
  console.error('❌ Backend build failed:', error.message);
  process.exit(1);
}

console.log('🚀 Backend ready for Render deployment');