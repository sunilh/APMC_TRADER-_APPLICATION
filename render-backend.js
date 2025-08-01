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
  execSync('npx esbuild server/minimal-backend.ts --platform=node --packages=external --bundle --format=esm --outfile=dist/server.js', { stdio: 'inherit' });
  console.log('✅ Minimal backend build completed');
} catch (error) {
  console.error('❌ Backend build failed:', error.message);
  process.exit(1);
}

console.log('🚀 Backend ready for Render deployment');