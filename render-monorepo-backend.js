#!/usr/bin/env node

import fs from 'fs';
import { execSync } from 'child_process';
import path from 'path';

console.log('🎯 Building backend for Render from monorepo...');

// Handle Render's directory structure - find root with package.json
const currentDir = process.cwd();
console.log('🔍 Current directory:', currentDir);

let rootDir = currentDir;
while (!fs.existsSync(path.join(rootDir, 'package.json')) && rootDir !== '/') {
  rootDir = path.dirname(rootDir);
}

if (!fs.existsSync(path.join(rootDir, 'package.json'))) {
  console.error('❌ Could not find package.json in any parent directory');
  process.exit(1);
}

console.log('🔍 Root directory with package.json:', rootDir);
process.chdir(rootDir);
console.log('✓ Changed to root directory');

// Clean and create directories
const distDir = path.join(rootDir, 'dist');
if (fs.existsSync(distDir)) {
  fs.rmSync(distDir, { recursive: true, force: true });
}
fs.mkdirSync(distDir, { recursive: true });

// Create uploads directories  
const uploadDirs = ['uploads', 'uploads/invoices', 'uploads/farmers', 'uploads/processed'];
uploadDirs.forEach(dir => {
  const fullPath = path.join(rootDir, dir);
  fs.mkdirSync(fullPath, { recursive: true });
  console.log(`✓ Created ${dir}/`);
});

console.log('⚡ Building backend with esbuild...');

try {
  // Verify minimal-backend.ts exists
  const backendPath = path.join(rootDir, 'server', 'minimal-backend.ts');
  if (!fs.existsSync(backendPath)) {
    throw new Error('server/minimal-backend.ts not found');
  }

  // Build the backend with CommonJS format for better compatibility
  const buildCommand = 'npx esbuild server/minimal-backend.ts --platform=node --packages=external --bundle --format=cjs --outfile=dist/server.js --external:pg-native --external:sharp --external:bcrypt';
  
  execSync(buildCommand, { 
    stdio: 'inherit',
    cwd: rootDir,
    env: { ...process.env, NODE_ENV: 'production' }
  });
  
  // Create package.json for production dependencies
  const productionPackage = {
    "name": "apmc-backend",
    "version": "1.0.0", 
    "main": "server.js",
    "type": "commonjs",
    "scripts": {
      "start": "node server.js"
    },
    "dependencies": {
      "@neondatabase/serverless": "^0.9.0",
      "bcrypt": "^5.1.0",
      "connect-pg-simple": "^9.0.0",
      "drizzle-orm": "^0.30.0",
      "express": "^4.18.0",
      "express-session": "^1.17.0",
      "multer": "^1.4.0",
      "passport": "^0.7.0",
      "passport-local": "^1.0.0",
      "pg": "^8.11.0",
      "sharp": "^0.33.0",
      "tesseract.js": "^5.0.0",
      "ws": "^8.0.0"
    },
    "engines": {
      "node": ">=18.0.0"
    }
  };
  
  fs.writeFileSync(path.join(distDir, 'package.json'), JSON.stringify(productionPackage, null, 2));
  console.log('📦 Created production package.json');
  
  // Copy necessary files
  const filesToCopy = [
    'eng.traineddata' // For Tesseract OCR
  ];
  
  filesToCopy.forEach(file => {
    const srcPath = path.join(rootDir, file);
    const destPath = path.join(distDir, file);
    if (fs.existsSync(srcPath)) {
      fs.copyFileSync(srcPath, destPath);
      console.log(`✓ Copied ${file}`);
    }
  });
  
  // Verify the build output
  const serverPath = path.join(distDir, 'server.js');
  if (fs.existsSync(serverPath)) {
    const stats = fs.statSync(serverPath);
    console.log(`✓ dist/server.js created (${Math.round(stats.size / 1024)}KB)`);
    
    // Verify it's a valid JS file
    const content = fs.readFileSync(serverPath, 'utf8');
    if (content.includes('express') && content.includes('listen')) {
      console.log('✓ Backend bundle contains Express server');
    }
  } else {
    throw new Error('server.js was not created');
  }
  
  console.log('✅ Backend build completed successfully');
} catch (error) {
  console.error('❌ Backend build failed:', error.message);
  console.error('Full error:', error);
  process.exit(1);
}

console.log('🚀 Backend ready for Render deployment');