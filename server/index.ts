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

    // Temporarily serve static content for debugging
    if (app.get("env") === "development") {
      // Serve a basic auth page for now
      app.get("/auth", (req, res) => {
        res.send(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>APMC Trader - Login</title>
            <style>
              body { font-family: Arial, sans-serif; max-width: 400px; margin: 50px auto; padding: 20px; }
              .form-group { margin: 15px 0; }
              input { width: 100%; padding: 8px; margin: 5px 0; }
              button { width: 100%; padding: 10px; background: #007bff; color: white; border: none; cursor: pointer; }
            </style>
          </head>
          <body>
            <h1>APMC Trader Login</h1>
            <form action="/api/login" method="post">
              <div class="form-group">
                <label>Username:</label>
                <input type="text" name="username" required>
              </div>
              <div class="form-group">
                <label>Password:</label>
                <input type="password" name="password" required>
              </div>
              <button type="submit">Login</button>
            </form>
            <p><a href="/super-admin-setup">First time? Create super admin account</a></p>
          </body>
          </html>
        `);
      });
      
      app.get("/super-admin-setup", (req, res) => {
        res.send(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Super Admin Setup</title>
            <style>
              body { font-family: Arial, sans-serif; max-width: 400px; margin: 50px auto; padding: 20px; }
              .form-group { margin: 15px 0; }
              input { width: 100%; padding: 8px; margin: 5px 0; }
              button { width: 100%; padding: 10px; background: #28a745; color: white; border: none; cursor: pointer; }
            </style>
          </head>
          <body>
            <h1>Create Super Admin</h1>
            <form action="/api/setup-super-admin" method="post">
              <div class="form-group">
                <label>Name:</label>
                <input type="text" name="name" required>
              </div>
              <div class="form-group">
                <label>Email:</label>
                <input type="email" name="email" required>
              </div>
              <div class="form-group">
                <label>Username:</label>
                <input type="text" name="username" required>
              </div>
              <div class="form-group">
                <label>Password:</label>
                <input type="password" name="password" required>
              </div>
              <button type="submit">Create Super Admin</button>
            </form>
          </body>
          </html>
        `);
      });
    } else {
      serveStatic(app);
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
