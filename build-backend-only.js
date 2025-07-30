#!/usr/bin/env node

import { build } from 'esbuild';
import fs from 'fs';
import path from 'path';

async function buildBackend() {
  try {
    console.log('Building backend with ESBuild...');
    
    // Build the backend without any Vite dependencies
    await build({
      entryPoints: ['server/index.ts'],
      bundle: true,
      outdir: 'dist',
      platform: 'node',
      format: 'esm',
      packages: 'external',
      external: ['vite', '@vitejs/*'],
      define: {
        'process.env.NODE_ENV': '"production"',
      },
      minify: false, // Keep readable for debugging
    });
    
    console.log('✅ Backend build completed successfully');
  } catch (error) {
    console.error('❌ Backend build failed:', error);
    process.exit(1);
  }
}

buildBackend();