#!/usr/bin/env node

import { build } from 'esbuild';
import fs from 'fs';
import path from 'path';

async function buildForRender() {
  try {
    console.log('🏗️ Building for Render deployment...');
    
    // Clean and create directories
    if (fs.existsSync('dist')) {
      fs.rmSync('dist', { recursive: true, force: true });
    }
    fs.mkdirSync('dist', { recursive: true });
    fs.mkdirSync('server/public', { recursive: true });
    
    console.log('📦 Building frontend...');
    // Build frontend
    await build({
      entryPoints: ['client/src/main.tsx'],
      bundle: true,
      outdir: 'server/public',
      platform: 'browser',
      format: 'esm',
      loader: {
        '.tsx': 'tsx',
        '.ts': 'ts',
        '.css': 'css'
      },
      minify: true,
      alias: {
        '@': './client/src',
        '@shared': './shared',
        '@assets': './attached_assets'
      }
    });
    
    // Copy and update HTML
    const htmlContent = fs.readFileSync('client/index.html', 'utf-8');
    const updatedHtml = htmlContent.replace('/src/main.tsx', '/main.js');
    fs.writeFileSync('server/public/index.html', updatedHtml);
    
    console.log('🖥️ Building backend...');
    // Build backend with proper module resolution
    await build({
      entryPoints: ['server/index.ts'],
      bundle: true,
      outdir: 'dist',
      platform: 'node',
      format: 'esm',
      packages: 'external',
      external: [
        // Keep these external to avoid bundling issues
        '@neondatabase/serverless',
        'bcrypt',
        'connect-pg-simple',
        'drizzle-orm',
        'express',
        'express-session',
        'multer',
        'passport',
        'passport-local',
        'sharp',
        'tesseract.js'
      ],
      define: {
        'process.env.NODE_ENV': '"production"'
      },
      minify: false,
      sourcemap: false
    });
    
    console.log('✅ Build completed successfully');
    console.log('📁 Files created:');
    console.log('  - server/public/ (frontend)');
    console.log('  - dist/index.js (backend)');
    
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

buildForRender();