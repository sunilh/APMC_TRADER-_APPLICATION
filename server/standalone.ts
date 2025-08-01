import express, { type Request, Response, NextFunction } from "express";
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import bcrypt from "bcrypt";

// Configure Neon
neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle({ client: pool });

const app = express();

// Basic middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb', parameterLimit: 50000 }));

// Request timeout handling
app.use((req, res, next) => {
  req.setTimeout(300000); // 5 minutes
  res.setTimeout(300000); // 5 minutes
  next();
});

// Serve uploaded files statically
app.use('/uploads', express.static('uploads'));

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  const requestPath = req.path;

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (requestPath.startsWith("/api")) {
      console.log(`${req.method} ${requestPath} ${res.statusCode} in ${duration}ms`);
    }
  });

  next();
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Setup page for database initialization
app.get('/setup', (req: Request, res: Response) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>APMC Setup</title>
      <style>
        body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
        .button { background: #007bff; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; }
        .result { margin-top: 20px; padding: 15px; border-radius: 5px; }
        .success { background: #d4edda; border: 1px solid #c3e6cb; color: #155724; }
        .error { background: #f8d7da; border: 1px solid #f5c6cb; color: #721c24; }
      </style>
    </head>
    <body>
      <h1>APMC Trading System Setup</h1>
      <p>Click the button below to initialize your database and create the admin user.</p>
      <button class="button" onclick="runSetup()">Initialize Database</button>
      <div id="result"></div>
      
      <script>
        async function runSetup() {
          const resultDiv = document.getElementById('result');
          resultDiv.innerHTML = 'Setting up database...';
          
          try {
            const response = await fetch('/api/setup', { method: 'POST' });
            const data = await response.json();
            
            if (response.ok) {
              resultDiv.className = 'result success';
              resultDiv.innerHTML = 
                '<h3>Setup Completed Successfully!</h3>' +
                '<p><strong>Username:</strong> admin</p>' +
                '<p><strong>Password:</strong> admin123</p>' +
                '<p>Your backend API is ready!</p>';
            } else {
              resultDiv.className = 'result error';
              resultDiv.innerHTML = '<h3>Setup Failed</h3><p>' + data.message + '</p>';
            }
          } catch (error) {
            resultDiv.className = 'result error';
            resultDiv.innerHTML = '<h3>Setup Failed</h3><p>' + error.message + '</p>';
          }
        }
      </script>
    </body>
    </html>
  `);
});

// Root endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({
    message: 'APMC Trading System Backend API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      setup: '/setup - Initialize database',
      health: '/health - Health check',
      api: '/api/* - API endpoints'
    }
  });
});

// Basic API setup endpoint
app.post('/api/setup', async (req: Request, res: Response) => {
  try {
    console.log('Setting up database...');
    
    // Create basic tables (simplified for standalone deployment)
    await db.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'admin',
        tenant_id INTEGER,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS tenants (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        location VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create admin user
    const hashedPassword = await bcrypt.hash('admin123', 10);
    await db.execute(`
      INSERT INTO users (username, password_hash, role) 
      VALUES ('admin', '${hashedPassword}', 'admin') 
      ON CONFLICT (username) DO NOTHING
    `);

    console.log('Database setup completed successfully');
    res.json({ 
      message: 'Database setup completed successfully',
      username: 'admin',
      password: 'admin123'
    });

  } catch (error) {
    console.error('Setup failed:', error);
    res.status(500).json({ 
      message: 'Setup failed', 
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Test API endpoint
app.get('/api/test', (req: Request, res: Response) => {
  res.json({
    message: 'API is working',
    timestamp: new Date().toISOString(),
    database: 'connected'
  });
});

// Error handling middleware
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  console.error('Server error:', err);
  res.status(status).json({ message });
});

// Start server
const port = parseInt(process.env.PORT || '10000', 10);

app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 APMC Trading System Backend running on port ${port}`);
  console.log(`📊 Setup page: http://localhost:${port}/setup`);
  console.log(`🔍 Health check: http://localhost:${port}/health`);
  console.log(`🔌 API test: http://localhost:${port}/api/test`);
});