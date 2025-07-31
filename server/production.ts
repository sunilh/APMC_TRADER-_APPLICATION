import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic, log } from "./vite";

async function startProductionServer() {
  console.log('🚀 Initializing APMC Trading System...');
  
  const app = express();
  
  // Basic middleware
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb', parameterLimit: 50000 }));
  
  // Increase server timeout for large uploads
  app.use((req, res, next) => {
    req.setTimeout(300000); // 5 minutes
    res.setTimeout(300000); // 5 minutes
    next();
  });
  
  // Serve uploaded files statically
  app.use('/uploads', express.static('uploads'));
  
  // Request logging middleware
  app.use((req, res, next) => {
    const start = Date.now();
    const path = req.path;
    let capturedJsonResponse: Record<string, any> | undefined = undefined;

    const originalResJson = res.json;
    res.json = function (bodyJson, ...args) {
      capturedJsonResponse = bodyJson;
      return originalResJson.apply(res, [bodyJson, ...args]);
    };

    res.on("finish", () => {
      const duration = Date.now() - start;
      if (path.startsWith("/api")) {
        let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
        if (capturedJsonResponse) {
          logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
        }

        if (logLine.length > 80) {
          logLine = logLine.slice(0, 79) + "…";
        }

        log(logLine);
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

  // Simple setup page for production initialization
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
                  '<p><a href="/">Go to Application</a></p>';
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

  try {
    console.log('🔧 Registering routes...');
    const server = await registerRoutes(app);

    // Error handling middleware
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      console.error('Server error:', err);
      res.status(status).json({ message });
    });

    // Serve static files in production
    console.log('📁 Setting up static file serving...');
    serveStatic(app);

    // Start server
    const port = process.env.PORT || 5000;
    console.log(`🌐 Starting server on port ${port}...`);
    
    server.listen({
      port: Number(port),
      host: "0.0.0.0",
      reusePort: true,
    }, () => {
      console.log(`✅ APMC Trading System running on port ${port}`);
      console.log(`🔗 Health check: http://localhost:${port}/health`);
      console.log(`🔧 Setup page: http://localhost:${port}/setup`);
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startProductionServer().catch(error => {
  console.error('❌ Server startup failed:', error);
  process.exit(1);
});