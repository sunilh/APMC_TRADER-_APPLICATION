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
    
    console.log('🖥️ Creating production server...');
    // Since Render ignores our startCommand and uses npm start,
    // create a simple launcher that uses tsx instead of bundling
    const serverLauncher = `#!/usr/bin/env node
import { spawn } from 'child_process';

console.log('🚀 Starting APMC Trading System...');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('PORT:', process.env.PORT || 5000);

const child = spawn('npx', ['tsx', 'server/index.ts'], {
  stdio: 'inherit',
  env: { ...process.env, NODE_ENV: 'production' }
});

child.on('error', (error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

child.on('exit', (code) => {
  process.exit(code);
});
`;
    
    fs.writeFileSync('dist/index.js', serverLauncher);
    
    // Verify files were created
    if (!fs.existsSync('dist/index.js')) {
      throw new Error('Backend build failed - dist/index.js not created');
    }
    if (!fs.existsSync('server/public/main.js')) {
      throw new Error('Frontend build failed - server/public/main.js not created');
    }
    
    console.log('✅ Build completed successfully');
    console.log('📁 Files created:');
    console.log('  - server/public/ (frontend)');
    console.log('  - dist/index.js (backend)');
    console.log('📍 Dist file size:', fs.statSync('dist/index.js').size, 'bytes');
    
  } catch (error) {
    console.error('❌ Build failed:', error);
    console.error('📂 Current directory contents:');
    try {
      console.log(fs.readdirSync('.'));
      if (fs.existsSync('dist')) {
        console.log('📂 Dist directory contents:');
        console.log(fs.readdirSync('dist'));
      }
    } catch (e) {
      console.error('Could not list directory contents');
    }
    process.exit(1);
  }
}

buildForRender();