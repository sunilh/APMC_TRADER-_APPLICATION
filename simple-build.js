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

// Create a simple HTML file for the root if frontend build failed
if (!fs.existsSync('server/public/index.html')) {
  console.log('📄 Creating simple HTML page...');
  const simpleHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>APMC Trading System</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 50px auto;
            padding: 20px;
            background: #f5f5f5;
        }
        .container {
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 {
            color: #2c3e50;
            text-align: center;
        }
        .status {
            background: #d4edda;
            border: 1px solid #c3e6cb;
            color: #155724;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
        }
        .button {
            background: #007bff;
            color: white;
            padding: 12px 24px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            text-decoration: none;
            display: inline-block;
            margin: 10px 10px 10px 0;
        }
        .button:hover {
            background: #0056b3;
        }
        .api-list {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🌾 APMC Trading System</h1>
        
        <div class="status">
            <strong>✅ Server Status:</strong> Online and Running
        </div>
        
        <p>Welcome to the Agricultural Produce Market Committee (APMC) Trading System. This comprehensive platform manages farmer registrations, lot tracking, buyer management, and financial reporting with GST compliance.</p>
        
        <h3>Quick Actions</h3>
        <a href="/setup" class="button">🔧 Database Setup</a>
        <a href="/health" class="button">💚 Health Check</a>
        
        <h3>Available API Endpoints</h3>
        <div class="api-list">
            <strong>Setup & Health:</strong><br>
            • GET /health - System health status<br>
            • GET /setup - Database initialization page<br>
            • POST /api/setup - Initialize database<br><br>
            
            <strong>Authentication:</strong><br>
            • POST /api/auth/login - User login<br>
            • POST /api/auth/logout - User logout<br>
            • GET /api/user - Get current user<br><br>
            
            <strong>Core Operations:</strong><br>
            • GET /api/farmers - List farmers<br>
            • GET /api/lots - List lots<br>
            • GET /api/buyers - List buyers<br>
            • GET /api/tax-invoices - List invoices<br>
            • GET /api/reports/* - Various reports<br>
        </div>
        
        <p><em>Frontend application will be available once the React build is deployed.</em></p>
    </div>
</body>
</html>`;
  
  fs.writeFileSync('server/public/index.html', simpleHtml);
}
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