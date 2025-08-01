import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import path from 'path';

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

// Request logging for API calls
app.use((req, res, next) => {
  const start = Date.now();
  const requestPath = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (requestPath.startsWith("/api")) {
      let logLine = `${req.method} ${requestPath} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      console.log(logLine);
    }
  });

  next();
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0'
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
    endpoints: {
      setup: '/setup - Initialize database',
      health: '/health - Health check',
      api: '/api/* - API endpoints'
    }
  });
});

async function startServer() {
  try {
    const server = await registerRoutes(app);

    // Error handling middleware
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      console.error('Server error:', err);
      res.status(status).json({ message });
    });

    const port = parseInt(process.env.PORT || '10000', 10);
    
    server.listen(port, '0.0.0.0', () => {
      console.log(`🚀 APMC Trading System Backend running on port ${port}`);
      console.log(`📊 Setup page: http://localhost:${port}/setup`);
      console.log(`🔍 Health check: http://localhost:${port}/health`);
      console.log(`🔌 API endpoints: http://localhost:${port}/api/*`);
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();