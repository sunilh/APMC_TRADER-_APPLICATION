#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// Ultra-simple build without any complex config
const buildScript = `
import { build } from 'vite';

build({
  configFile: false,
  root: './client',
  plugins: [
    {
      name: 'react',
      config() {
        return {
          esbuild: {
            loader: 'tsx',
            include: /\\.[jt]sx?$/,
          },
        };
      },
    },
  ],
  resolve: {
    alias: {
      '@': './client/src',
      '@shared': './shared',
      '@assets': './attached_assets',
    },
  },
  build: {
    outDir: './dist/public',
    emptyOutDir: true,
    rollupOptions: {
      input: './client/index.html',
    },
  },
}).then(() => {
  console.log('Build complete');
}).catch(err => {
  console.error('Build failed:', err);
  process.exit(1);
});
`;

console.log('Creating simple build script...');
fs.writeFileSync('temp-build.mjs', buildScript);

try {
  execSync('node temp-build.mjs', { stdio: 'inherit' });
  fs.unlinkSync('temp-build.mjs');
  console.log('✅ Build completed successfully');
} catch (error) {
  fs.unlinkSync('temp-build.mjs');
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}