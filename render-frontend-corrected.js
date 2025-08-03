#!/usr/bin/env node

import fs from 'fs';
import { execSync } from 'child_process';
import path from 'path';

console.log('🎯 Building frontend for Render with proper path resolution...');

// Render appears to set working directory incorrectly, let's fix this
const currentDir = process.cwd();
console.log('🔍 Current directory:', currentDir);

// Find the actual root directory containing package.json
let rootDir = currentDir;

// If we're in a subdirectory, navigate up to find package.json
while (!fs.existsSync(path.join(rootDir, 'package.json')) && rootDir !== '/') {
  rootDir = path.dirname(rootDir);
}

if (!fs.existsSync(path.join(rootDir, 'package.json'))) {
  console.error('❌ Could not find package.json in any parent directory');
  process.exit(1);
}

console.log('🔍 Root directory with package.json:', rootDir);

// Change to root directory
process.chdir(rootDir);
console.log('✓ Changed to root directory');

// Clean existing build directories
const distDir = path.join(rootDir, 'dist');
const clientDistDir = path.join(rootDir, 'client', 'dist');

console.log('🧹 Cleaning build directories...');
if (fs.existsSync(distDir)) {
  fs.rmSync(distDir, { recursive: true, force: true });
}
if (fs.existsSync(clientDistDir)) {
  fs.rmSync(clientDistDir, { recursive: true, force: true });
}

try {
  console.log('⚡ Building frontend with Vite from root...');
  
  // Build frontend using the root vite config (which has proper path aliases)
  execSync('npx vite build', { 
    stdio: 'inherit',
    cwd: rootDir,
    env: { ...process.env, NODE_ENV: 'production' }
  });
  
  // Check where Vite created the files
  const publicDir = path.join(rootDir, 'dist', 'public');
  
  if (fs.existsSync(publicDir)) {
    // Create client/dist and copy files there for Render
    fs.mkdirSync(clientDistDir, { recursive: true });
    
    const files = fs.readdirSync(publicDir);
    console.log(`📁 Copying ${files.length} files to client/dist...`);
    
    files.forEach(file => {
      const sourcePath = path.join(publicDir, file);
      const destPath = path.join(clientDistDir, file);
      
      if (fs.statSync(sourcePath).isDirectory()) {
        fs.cpSync(sourcePath, destPath, { recursive: true });
      } else {
        fs.copyFileSync(sourcePath, destPath);
      }
    });
    
    console.log('📦 Files copied to client/dist');
  } else {
    throw new Error('Vite build output not found in dist/public');
  }
  
  // Verify build success
  const indexPath = path.join(clientDistDir, 'index.html');
  if (fs.existsSync(indexPath)) {
    const indexContent = fs.readFileSync(indexPath, 'utf8');
    if (indexContent.includes('<!doctype html') || indexContent.includes('<!DOCTYPE html')) {
      console.log('✓ Valid index.html created');
    }
    
    const assetsDir = path.join(clientDistDir, 'assets');
    if (fs.existsSync(assetsDir)) {
      const assetFiles = fs.readdirSync(assetsDir);
      console.log(`✓ ${assetFiles.length} asset files built`);
    }
    
    console.log('✅ Frontend build completed successfully');
  } else {
    throw new Error('index.html not found in client/dist');
  }
  
} catch (error) {
  console.error('❌ Frontend build failed:', error.message);
  console.error('Full error:', error);
  process.exit(1);
}

console.log('🚀 Frontend ready for Render deployment');