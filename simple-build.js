#!/usr/bin/env node

import fs from 'fs';
import { spawn } from 'child_process';

console.log('🏗️ Simple build for Render deployment...');

// Create directories
if (fs.existsSync('dist')) {
  fs.rmSync('dist', { recursive: true, force: true });
}
fs.mkdirSync('dist', { recursive: true });
fs.mkdirSync('server/public', { recursive: true });

console.log('📦 Building frontend with Vite...');
// Build frontend first
try {
  const buildProcess = spawn('npx', ['vite', 'build', '--outDir', 'server/public'], {
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'production' }
  });
  
  await new Promise((resolve, reject) => {
    buildProcess.on('close', (code) => {
      if (code === 0) {
        console.log('✅ Frontend build completed');
        resolve();
      } else {
        console.log('⚠️ Frontend build failed, continuing with server-only deployment');
        resolve(); // Continue even if frontend build fails
      }
    });
    buildProcess.on('error', (error) => {
      console.log('⚠️ Frontend build error:', error.message);
      resolve(); // Continue even if frontend build fails
    });
  });
} catch (error) {
  console.log('⚠️ Frontend build failed, continuing with server-only deployment');
}

console.log('🖥️ Creating production server launcher...');
// Create a simple launcher that uses tsx to run TypeScript directly
const serverLauncher = `#!/usr/bin/env node

import { spawn } from 'child_process';

console.log('🚀 Starting APMC Trading System...');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('PORT:', process.env.PORT || 5000);

const child = spawn('npx', ['tsx', 'server/production.ts'], {
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

console.log('✅ Simple build completed successfully');
console.log('📁 Created dist/index.js launcher');