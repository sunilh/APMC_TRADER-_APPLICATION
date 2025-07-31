#!/usr/bin/env node

import { spawn } from 'child_process';

console.log('🚀 Starting APMC Trading System in production mode...');
console.log('Environment:', process.env.NODE_ENV);
console.log('Port:', process.env.PORT || 5000);

const child = spawn('npx', ['tsx', 'server/index.ts'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_ENV: 'production'
  }
});

child.on('error', (error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

child.on('exit', (code) => {
  console.log(`Server exited with code ${code}`);
  process.exit(code);
});