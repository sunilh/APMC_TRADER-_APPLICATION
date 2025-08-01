#!/usr/bin/env node

import fs from 'fs';
import { execSync } from 'child_process';

console.log('🏗️ Simple build for Render deployment...');

// Create directories
if (fs.existsSync('dist')) {
  fs.rmSync('dist', { recursive: true, force: true });
}
fs.mkdirSync('dist', { recursive: true });

// Create uploads directories to prevent ENOENT errors
fs.mkdirSync('uploads', { recursive: true });
fs.mkdirSync('uploads/invoices', { recursive: true });
fs.mkdirSync('uploads/farmers', { recursive: true });
fs.mkdirSync('uploads/processed', { recursive: true });

console.log('🎨 Building React frontend with Vite...');

try {
  execSync('npm run build', { stdio: 'inherit' });
  console.log('✅ Frontend build completed successfully');
} catch (error) {
  console.error('❌ Frontend build failed:', error.message);
  process.exit(1);
}

console.log('🖥️ Creating production server launcher...');

// Create a simple launcher that uses tsx to run TypeScript directly
const serverLauncher = `#!/usr/bin/env node

import { spawn } from 'child_process';

console.log('🚀 Starting APMC Trading System...');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('PORT:', process.env.PORT || 10000);

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
console.log('🎨 React frontend build included - proper SPA application');