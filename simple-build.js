#!/usr/bin/env node

import fs from 'fs';

console.log('🏗️ Simple build for Render deployment...');

// Create dist directory
if (fs.existsSync('dist')) {
  fs.rmSync('dist', { recursive: true, force: true });
}
fs.mkdirSync('dist', { recursive: true });

console.log('🖥️ Creating production server launcher...');
// Create a simple launcher that uses tsx to run TypeScript directly
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

console.log('✅ Simple build completed successfully');
console.log('📁 Created dist/index.js launcher');