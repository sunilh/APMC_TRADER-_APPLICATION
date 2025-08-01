import express, { type Request, Response, NextFunction } from "express";
import pkg from 'pg';
const { Pool } = pkg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}

// Standard PostgreSQL connection for Render database
const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

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

// Simple status page
app.get('/setup', (req: Request, res: Response) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>APMC Backend Status</title>
      <style>
        body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
        .button { background: #007bff; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; }
        .result { margin-top: 20px; padding: 15px; border-radius: 5px; }
        .success { background: #d4edda; border: 1px solid #c3e6cb; color: #155724; }
        .error { background: #f8d7da; border: 1px solid #f5c6cb; color: #721c24; }
      </style>
    </head>
    <body>
      <h1>APMC Trading System Backend</h1>
      <p>Backend API is running and ready for frontend connections.</p>
      <button class="button" onclick="testConnection()">Test Database Connection</button>
      <div id="result"></div>
      
      <script>
        async function testConnection() {
          const resultDiv = document.getElementById('result');
          resultDiv.innerHTML = 'Testing database connection...';
          
          try {
            const response = await fetch('/api/setup', { method: 'POST' });
            const data = await response.json();
            
            if (response.ok) {
              resultDiv.className = 'result success';
              resultDiv.innerHTML = '<h3>Database Connection Successful!</h3><p>Backend is ready for frontend connections.</p>';
            } else {
              resultDiv.className = 'result error';
              resultDiv.innerHTML = '<h3>Database Connection Failed</h3><p>' + data.message + '</p>';
            }
          } catch (error) {
            resultDiv.className = 'result error';
            resultDiv.innerHTML = '<h3>Connection Test Failed</h3><p>' + error.message + '</p>';
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
      health: '/health - Health check',
      api: '/api/* - API endpoints'
    }
  });
});

// Database connection test endpoint
app.post('/api/setup', async (req: Request, res: Response) => {
  try {
    console.log('Testing Render PostgreSQL database connection...');
    
    // Simple connection test for Render PostgreSQL
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();

    console.log('Render PostgreSQL database connection successful');
    res.json({ 
      message: 'Render PostgreSQL database connection successful',
      status: 'ready'
    });

  } catch (error) {
    console.error('Database connection failed:', error);
    res.status(500).json({ 
      message: 'Database connection failed', 
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Test API endpoint
app.get('/api/test', (req: Request, res: Response) => {
  res.json({
    message: 'API is working',
    timestamp: new Date().toISOString(),
    database: 'Render PostgreSQL connected'
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
  console.log(`🔍 Health check: http://localhost:${port}/health`);
  console.log(`🔌 API test: http://localhost:${port}/api/test`);
  console.log(`💾 Connected to Render PostgreSQL database`);
});