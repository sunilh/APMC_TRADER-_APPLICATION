#!/usr/bin/env node

import fs from 'fs';
import { execSync } from 'child_process';

console.log('🎯 Building frontend for Render...');

// Clean existing build
if (fs.existsSync('dist')) {
  fs.rmSync('dist', { recursive: true, force: true });
}

console.log('⚡ Building frontend with Vite...');

try {
  // Build the frontend using Vite
  execSync('npx vite build', { stdio: 'inherit' });
  
  // Vite builds to dist/public, but Render expects files in dist root
  // Move files from dist/public to dist
  const publicDir = 'dist/public';
  if (fs.existsSync(publicDir)) {
    const files = fs.readdirSync(publicDir);
    
    // Move each file/folder from dist/public to dist
    files.forEach(file => {
      const sourcePath = `${publicDir}/${file}`;
      const destPath = `dist/${file}`;
      fs.renameSync(sourcePath, destPath);
    });
    
    // Remove empty public directory
    fs.rmdirSync(publicDir);
    
    console.log('📦 Moved frontend files to dist root');
  }
  
  // Verify the build output
  if (fs.existsSync('dist/index.html')) {
    console.log('✓ dist/index.html found');
    
    // Check for assets
    const assetsDir = 'dist/assets';
    if (fs.existsSync(assetsDir)) {
      const assetFiles = fs.readdirSync(assetsDir);
      console.log(`✓ ${assetFiles.length} asset files found`);
    }
  } else {
    throw new Error('index.html was not created');
  }
  
  console.log('✅ Frontend build completed');
} catch (error) {
  console.error('❌ Frontend build failed:', error.message);
  process.exit(1);
}

console.log('🚀 Frontend ready for Render deployment');