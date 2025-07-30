#!/usr/bin/env node

import { build } from 'vite';
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function buildProject() {
  try {
    console.log('Starting production build...');
    
    await build({
      configFile: false, // Don't load any config file
      root: path.resolve(__dirname, 'client'),
      plugins: [
        (await import('@vitejs/plugin-react')).default()
      ],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, 'client/src'),
          '@shared': path.resolve(__dirname, 'shared'),
          '@assets': path.resolve(__dirname, 'attached_assets'),
        },
      },
      build: {
        outDir: path.resolve(__dirname, 'dist/public'),
        emptyOutDir: true,
      },
      css: {
        postcss: {
          plugins: {
            tailwindcss: {},
            autoprefixer: {},
          },
        },
      },
    });
    
    console.log('✅ Frontend build completed successfully!');
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

buildProject();