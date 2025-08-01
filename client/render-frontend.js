#!/usr/bin/env node

import fs from 'fs';
import { execSync } from 'child_process';
import path from 'path';

console.log('🎯 Building frontend for Render...');

// Working directory is client/, so we need to go up one level for root operations
const rootDir = path.resolve('..');
const clientDir = process.cwd();

// Clean existing build
const distDir = path.join(rootDir, 'dist');
const clientDistDir = path.join(clientDir, 'dist');

if (fs.existsSync(distDir)) {
  fs.rmSync(distDir, { recursive: true, force: true });
}
if (fs.existsSync(clientDistDir)) {
  fs.rmSync(clientDistDir, { recursive: true, force: true });
}

console.log('⚡ Building frontend with Vite...');

try {
  // Change to root directory to run vite build
  process.chdir(rootDir);
  
  // Build the frontend using Vite
  execSync('npx vite build', { stdio: 'inherit' });
  
  // Vite builds to dist/public, but Render expects files in client/dist
  // Move files from dist/public to client/dist
  const publicDir = path.join(rootDir, 'dist', 'public');
  
  if (fs.existsSync(publicDir)) {
    // Create client/dist directory
    fs.mkdirSync(clientDistDir, { recursive: true });
    
    const files = fs.readdirSync(publicDir);
    
    // Move each file/folder from dist/public to client/dist
    files.forEach(file => {
      const sourcePath = path.join(publicDir, file);
      const destPath = path.join(clientDistDir, file);
      fs.renameSync(sourcePath, destPath);
    });
    
    console.log('📦 Moved frontend files to client/dist');
  }
  
  // Verify the build output
  if (fs.existsSync(path.join(clientDistDir, 'index.html'))) {
    console.log('✓ client/dist/index.html found');
    
    // Check for assets
    const assetsDir = path.join(clientDistDir, 'assets');
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