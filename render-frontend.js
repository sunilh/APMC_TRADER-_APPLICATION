#!/usr/bin/env node

import fs from 'fs';
import { execSync } from 'child_process';

console.log('🎯 Building frontend for Render...');

// Clean existing build
if (fs.existsSync('dist')) {
  fs.rmSync('dist', { recursive: true, force: true });
}
if (fs.existsSync('client/dist')) {
  fs.rmSync('client/dist', { recursive: true, force: true });
}

console.log('⚡ Building frontend with Vite...');

try {
  // Build the frontend using Vite
  execSync('npx vite build', { stdio: 'inherit' });
  
  // Vite builds to dist/public, but Render expects files in client/dist
  // Move files from dist/public to client/dist
  const publicDir = 'dist/public';
  const clientDistDir = 'client/dist';
  
  if (fs.existsSync(publicDir)) {
    // Create client/dist directory
    fs.mkdirSync(clientDistDir, { recursive: true });
    
    const files = fs.readdirSync(publicDir);
    
    // Move each file/folder from dist/public to client/dist
    files.forEach(file => {
      const sourcePath = `${publicDir}/${file}`;
      const destPath = `${clientDistDir}/${file}`;
      fs.renameSync(sourcePath, destPath);
    });
    
    console.log('📦 Moved frontend files to client/dist');
  }
  
  // Verify the build output
  if (fs.existsSync('client/dist/index.html')) {
    console.log('✓ client/dist/index.html found');
    
    // Check for assets
    const assetsDir = 'client/dist/assets';
    if (fs.existsSync(assetsDir)) {
      const assetFiles = fs.readdirSync(assetsDir);
      console.log(`✓ ${assetFiles.length} asset files found`);
    }
  } else {
    throw new Error('index.html was not created in client/dist');
  }
  
  console.log('✅ Frontend build completed');
} catch (error) {
  console.error('❌ Frontend build failed:', error.message);
  process.exit(1);
}

console.log('🚀 Frontend ready for Render deployment');