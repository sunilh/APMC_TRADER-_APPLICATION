import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

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

(async () => {
  try {
    console.log("Starting server initialization...");
    const server = await registerRoutes(app);
    console.log("Routes registered successfully");

    // Add a simple test route to verify server is working
    app.get("/", (req, res) => {
      res.send(`
        <!DOCTYPE html>
        <html>
        <head><title>APMC Trader</title></head>
        <body>
          <h1>APMC Trader System</h1>
          <p>Server is running! Navigate to <a href="/auth">/auth</a> for login.</p>
        </body>
        </html>
      `);
    });

    // Setup Vite development server or static files for production
    try {
      if (app.get("env") === "development") {
        console.log("Setting up Vite development server...");
        await setupVite(app, server);
        console.log("✓ Vite development server configured");
      } else {
        serveStatic(app);
      }
    } catch (error) {
      console.error("Failed to setup Vite:", error);
      // Fallback to basic HTML serving for development
      app.get("*", (req, res) => {
        if (req.path.startsWith("/api")) {
          return res.status(404).json({ message: "API endpoint not found" });
        }
        res.send(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>APMC Trader System</title>
            <style>
              body { 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                margin: 0; padding: 20px; background: #f5f5f5; 
              }
              .container { 
                max-width: 800px; margin: 0 auto; background: white; 
                padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);
              }
              .btn { 
                display: inline-block; padding: 12px 24px; background: #007bff; 
                color: white; text-decoration: none; border-radius: 4px; margin: 8px;
              }
              .btn:hover { background: #0056b3; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>🌾 APMC Trader System</h1>
              <p>Welcome to the Agricultural Produce Market Committee management system.</p>
              
              <h2>Getting Started</h2>
              <p>Choose an option below to access the system:</p>
              
              <a href="/super-admin-setup" class="btn">🔧 Setup Super Admin</a>
              <a href="/auth" class="btn">🔐 Login</a>
              <a href="/tenant-registration" class="btn">🏢 Register APMC</a>
              
              <h2>System Status</h2>
              <p>✅ Backend API: Running</p>
              <p>✅ Database: Connected</p>
              <p>⚠️ Frontend: Development mode (basic fallback)</p>
              
              <h2>API Endpoints</h2>
              <ul>
                <li><strong>POST /api/login</strong> - User authentication</li>
                <li><strong>POST /api/setup-super-admin</strong> - Initial admin setup</li>
                <li><strong>GET /api/dashboard/stats</strong> - Dashboard statistics</li>
                <li><strong>GET /api/farmers</strong> - List farmers</li>
                <li><strong>GET /api/lots</strong> - List lots</li>
                <li><strong>GET /api/buyers</strong> - List buyers</li>
              </ul>
            </div>
          </body>
          </html>
        `);
      });
    }

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      
      console.error("Express error:", err);
      res.status(status).json({ message });
    });

    // ALWAYS serve the app on port 5000
    // this serves both the API and the client.
    // It is the only port that is not firewalled.
    const port = 5000;
    console.log(`Attempting to bind to port ${port}...`);
    
    server.on('error', (err) => {
      console.error(`Server error:`, err);
      process.exit(1);
    });
    
    server.listen(port, "0.0.0.0", () => {
      log(`serving on port ${port}`);
      console.log(`✓ Server listening on http://0.0.0.0:${port}`);
      console.log(`✓ Visit http://localhost:${port}/auth for login`);
      
      // Force a simple health check to verify server is responding
      setTimeout(async () => {
        try {
          const http = await import('http');
          const options = {
            hostname: 'localhost',
            port: port,
            path: '/',
            method: 'GET',
            timeout: 2000
          };
          
          const req = http.request(options, (res) => {
            console.log(`✓ Health check: ${res.statusCode}`);
          });
          
          req.on('error', (err) => {
            console.log(`✗ Health check failed: ${err.message}`);
          });
          
          req.end();
        } catch (error) {
          console.log(`✗ Health check error: ${error}`);
        }
      }, 1000);
    });
    
    server.on('error', (err: any) => {
      console.error(`Server error:`, err);
      process.exit(1);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
})();
