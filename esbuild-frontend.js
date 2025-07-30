#!/usr/bin/env node

import { build } from 'esbuild';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function buildFrontend() {
  try {
    console.log('Building frontend with ESBuild...');

    // Create dist/public directory
    const distDir = path.join(__dirname, 'dist', 'public');
    if (!fs.existsSync(distDir)) {
      fs.mkdirSync(distDir, { recursive: true });
    }

    // Copy index.html
    const indexPath = path.join(__dirname, 'client', 'index.html');
    const distIndexPath = path.join(distDir, 'index.html');
    
    if (fs.existsSync(indexPath)) {
      let html = fs.readFileSync(indexPath, 'utf8');
      // Update script src to point to bundled file
      html = html.replace('/src/main.tsx', '/main.js');
      fs.writeFileSync(distIndexPath, html);
    }

    // Build with ESBuild
    await build({
      entryPoints: [path.join(__dirname, 'client', 'src', 'main.tsx')],
      bundle: true,
      outdir: distDir,
      platform: 'browser',
      format: 'esm',
      target: 'es2020',
      loader: {
        '.tsx': 'tsx',
        '.ts': 'ts',
        '.jsx': 'jsx',
        '.js': 'js',
        '.css': 'css',
        '.png': 'file',
        '.jpg': 'file',
        '.jpeg': 'file',
        '.svg': 'file',
      },
      alias: {
        '@': path.join(__dirname, 'client', 'src'),
        '@shared': path.join(__dirname, 'shared'),
        '@assets': path.join(__dirname, 'attached_assets'),
      },
      external: [],
      define: {
        'process.env.NODE_ENV': '"production"',
      },
      minify: true,
      sourcemap: false,
      splitting: false,
      chunkNames: '[name]-[hash]',
    });

    console.log('✅ Frontend build completed with ESBuild');
  } catch (error) {
    console.error('❌ ESBuild frontend build failed:', error);
    process.exit(1);
  }
}

buildFrontend();