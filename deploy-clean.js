#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

console.log('🧹 Cleaning repository for backend-only deployment...');

// Files and directories to remove for clean backend deployment
const filesToRemove = [
  'client',
  'attached_assets', 
  'uploads',
  'typescript-fix-summary.md',
  'eng.traineddata',
  '.replit',
  'components.json',
  'postcss.config.js',
  'tailwind.config.ts',
  'vite.config.ts',
  'vite.config.production.js',
  'esbuild-frontend.js',
  'simple-build.js',
  'build-production.js',
  'start-production.js',
  'vercel.json.backup'
];

// Remove unnecessary files and directories
filesToRemove.forEach(item => {
  const fullPath = path.resolve(item);
  if (fs.existsSync(fullPath)) {
    try {
      if (fs.lstatSync(fullPath).isDirectory()) {
        fs.rmSync(fullPath, { recursive: true, force: true });
        console.log(`✅ Removed directory: ${item}`);
      } else {
        fs.unlinkSync(fullPath);
        console.log(`✅ Removed file: ${item}`);
      }
    } catch (error) {
      console.log(`⚠️  Could not remove ${item}: ${error.message}`);
    }
  }
});

console.log('🚀 Repository cleaned for backend deployment');
console.log('📦 Ready to deploy with: npm run build && npm start');