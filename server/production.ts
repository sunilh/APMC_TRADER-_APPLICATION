import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { storage } from "./storage";
import bcrypt from "bcrypt";
import path from "path";
import fs from "fs";

// Simple logging function for production
const log = (message: string) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
};

// Simple static file serving for production
const serveStatic = (app: express.Express) => {
  // Serve static files from server/public
  app.use(express.static(path.join(process.cwd(), "server/public")));



  // Dashboard route for authenticated users
  app.get("/dashboard", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.redirect('/');
    }
    
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>APMC Trader - Dashboard</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
          body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; }
        </style>
      </head>
      <body class="bg-gray-50 min-h-screen">
        <nav class="bg-white shadow-sm border-b">
          <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex justify-between h-16">
              <div class="flex items-center">
                <h1 class="text-xl font-bold text-gray-900">🌾 APMC Trader</h1>
              </div>
              <div class="flex items-center space-x-4">
                <span class="text-sm text-gray-600">Welcome, ${req.user?.firstName || req.user?.username || 'User'}</span>
                <button onclick="logout()" class="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700">
                  Logout
                </button>
              </div>
            </div>
          </div>
        </nav>
        
        <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div class="bg-white rounded-lg shadow p-6">
            <h2 class="text-2xl font-bold mb-6">Dashboard</h2>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div class="bg-blue-50 p-4 rounded-lg">
                <h3 class="font-semibold text-blue-800">Farmers</h3>
                <p class="text-2xl font-bold text-blue-600" id="farmerCount">-</p>
              </div>
              <div class="bg-green-50 p-4 rounded-lg">
                <h3 class="font-semibold text-green-800">Active Lots</h3>
                <p class="text-2xl font-bold text-green-600" id="lotCount">-</p>
              </div>
              <div class="bg-purple-50 p-4 rounded-lg">
                <h3 class="font-semibold text-purple-800">Buyers</h3>
                <p class="text-2xl font-bold text-purple-600" id="buyerCount">-</p>
              </div>
              <div class="bg-orange-50 p-4 rounded-lg">
                <h3 class="font-semibold text-orange-800">Today's Sales</h3>
                <p class="text-2xl font-bold text-orange-600" id="salesCount">-</p>
              </div>
            </div>
            
            <div class="mt-8">
              <h3 class="text-lg font-semibold mb-4">Quick Actions</h3>
              <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                <button class="bg-blue-600 text-white p-4 rounded-lg hover:bg-blue-700">
                  Add Farmer
                </button>
                <button class="bg-green-600 text-white p-4 rounded-lg hover:bg-green-700">
                  Create Lot
                </button>
                <button class="bg-purple-600 text-white p-4 rounded-lg hover:bg-purple-700">
                  Add Buyer
                </button>
                <button class="bg-orange-600 text-white p-4 rounded-lg hover:bg-orange-700">
                  Generate Report
                </button>
              </div>
            </div>
          </div>
        </main>
        
        <script>
          async function logout() {
            try {
              const response = await fetch('/api/logout', { method: 'POST' });
              if (response.ok) {
                window.location.href = '/';
              }
            } catch (error) {
              console.error('Logout error:', error);
              window.location.href = '/';
            }
          }
          
          // Load dashboard stats
          async function loadStats() {
            try {
              const response = await fetch('/api/dashboard/stats');
              if (response.ok) {
                const stats = await response.json();
                document.getElementById('farmerCount').textContent = stats.farmerCount || 0;
                document.getElementById('lotCount').textContent = stats.activeLotCount || 0;
                document.getElementById('buyerCount').textContent = stats.buyerCount || 0;
                document.getElementById('salesCount').textContent = stats.todaySales || 0;
              }
            } catch (error) {
              console.error('Error loading stats:', error);
            }
          }
          
          loadStats();
        </script>
      </body>
      </html>
    `);
  });

  // Catch-all handler: serve React app HTML for client-side routing
  app.get("*", (req, res) => {
    // Skip API routes
    if (req.path.startsWith("/api")) {
      return res.status(404).json({ message: "API endpoint not found" });
    }
    
    // Skip static file requests (but serve the login page for everything else)
    if (req.path.includes(".") && !req.path.endsWith("/")) {
      return res.status(404).send("File not found");
    }

    const indexPath = path.join(process.cwd(), "server/public/index.html");

    // Always serve the login page since frontend build fails
    // if (!fs.existsSync(indexPath)) {
      return res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>APMC Trading System - Login</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; }
          </style>
        </head>
        <body class="bg-gradient-to-br from-blue-50 to-green-50 min-h-screen">
          <div class="flex items-center justify-center min-h-screen p-4">
            <div class="w-full max-w-md">
              <div class="text-center mb-8">
                <div class="flex items-center justify-center mb-4">
                  <div class="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center mr-3">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" class="text-white">
                      <path d="M12 2L2 7l10 5 10-5-10-5z" fill="currentColor"/>
                      <path d="m2 17 10 5 10-5M2 12l10 5 10-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                  </div>
                  <div>
                    <h1 class="text-3xl font-bold text-gray-900">APMC Trader</h1>
                    <p class="text-gray-600">Agricultural Market Management</p>
                  </div>
                </div>
              </div>
              
              <div class="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
                <div class="text-center mb-6">
                  <h2 class="text-2xl font-semibold text-gray-900">Welcome back</h2>
                  <p class="text-gray-600 mt-2">Sign in to your APMC account</p>
                </div>
                
                <form id="loginForm" class="space-y-6">
                  <div class="space-y-4">
                    <div>
                      <label class="block text-sm font-medium text-gray-900 mb-2">Username</label>
                      <input type="text" id="username" name="username" required
                             class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-gray-900"
                             placeholder="Enter your username">
                    </div>
                    
                    <div>
                      <label class="block text-sm font-medium text-gray-900 mb-2">Password</label>
                      <input type="password" id="password" name="password" required
                             class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-gray-900"
                             placeholder="Enter your password">
                    </div>
                  </div>
                  
                  <button type="submit" id="loginBtn"
                          class="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 transition-colors font-medium">
                    Sign in
                  </button>
                </form>
                
                <div id="error-message" style="display: none;" class="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                  <p class="text-sm text-red-800"></p>
                </div>
              </div>
              
              <div class="text-center mt-6 text-sm text-gray-500">
                <p>Default credentials: <span class="font-semibold text-gray-700">admin</span> / <span class="font-semibold text-gray-700">admin123</span></p>
                <p class="mt-2"><a href="/api/setup" class="text-blue-600 hover:text-blue-700 hover:underline">Need to setup database?</a></p>
              </div>
            </div>
          </div>
          
          <script>
            document.getElementById('loginForm').addEventListener('submit', async (e) => {
              e.preventDefault();
              
              const username = document.getElementById('username').value;
              const password = document.getElementById('password').value;
              const loginBtn = document.getElementById('loginBtn');
              const errorDiv = document.getElementById('error-message');
              
              loginBtn.textContent = 'Signing In...';
              loginBtn.disabled = true;
              errorDiv.style.display = 'none';
              
              try {
                const response = await fetch('/api/login', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ username, password })
                });
                
                const data = await response.json();
                
                if (response.ok) {
                  window.location.href = '/dashboard';
                } else {
                  errorDiv.style.display = 'block';
                  errorDiv.querySelector('p').textContent = data.message || 'Login failed';
                }
              } catch (error) {
                errorDiv.style.display = 'block';
                errorDiv.querySelector('p').textContent = 'Network error. Please try again.';
              } finally {
                loginBtn.textContent = 'Sign In';
                loginBtn.disabled = false;
              }
            });
          </script>
        </body>
        </html>
      `);
  });
};

async function startProductionServer() {
  console.log("🚀 Initializing APMC Trading System...");

  const app = express();

  // Basic middleware
  app.use(express.json({ limit: "50mb" }));
  app.use(
    express.urlencoded({
      extended: true,
      limit: "50mb",
      parameterLimit: 50000,
    }),
  );

  // Increase server timeout for large uploads
  app.use((req, res, next) => {
    req.setTimeout(300000); // 5 minutes
    res.setTimeout(300000); // 5 minutes
    next();
  });

  // Serve uploaded files statically
  app.use("/uploads", express.static("uploads"));

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
  app.get("/health", (req: Request, res: Response) => {
    res.status(200).json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || "1.0.0",
    });
  });

  // Debug endpoint to check database connectivity
  app.get("/api/debug", async (req: Request, res: Response) => {
    try {
      const tenants = await storage.getAllTenants();
      res.json({
        status: "connected",
        tenantCount: tenants.length,
        databaseUrl: !!process.env.DATABASE_URL,
        environment: process.env.NODE_ENV,
      });
    } catch (error) {
      res.status(500).json({
        status: "error",
        message: (error as Error).message,
        databaseUrl: !!process.env.DATABASE_URL,
        environment: process.env.NODE_ENV,
      });
    }
  });

  // Setup API endpoint for database initialization
  app.post("/api/setup", async (req: Request, res: Response) => {
    try {
      console.log("Running production setup...");

      // Check if setup is needed
      const tenants = await storage.getAllTenants();
      if (tenants.length > 0) {
        const users = await storage.getUsersByTenant(1);
        if (users.length > 0) {
          return res.json({
            status: "already_setup",
            message: "System is already configured",
            tenantCount: tenants.length,
            userCount: users.length,
          });
        }
      }

      // Create default tenant if needed
      let defaultTenant;
      if (tenants.length === 0) {
        console.log("Creating default tenant...");
        defaultTenant = await storage.createTenant({
          name: "Default APMC",
          apmcCode: "DEFAULT001",
          place: "Default Location",
          mobileNumber: "1234567890",
          panNumber: "DEFPAN123A",
          subscriptionPlan: "basic"
        });
        console.log("Default tenant created:", defaultTenant.id);
      } else {
        defaultTenant = tenants[0];
      }

      // Create default admin user
      console.log("Creating default admin user...");
      const hashedPassword = await bcrypt.hash("admin123", 10);

      const adminUser = await storage.createUser({
        username: "admin",
        name: "Administrator",
        password: hashedPassword,
        tenantId: defaultTenant.id,
        role: "super_admin",
        isActive: true,
        email: "admin@example.com",
      });

      console.log("Setup completed successfully!");

      res.json({
        status: "setup_completed",
        message: "System configured successfully",
        credentials: {
          username: "admin",
          password: "admin123",
        },
        tenantId: defaultTenant.id,
        userId: adminUser.id,
      });
    } catch (error) {
      console.error("Setup error:", error);
      res.status(500).json({
        status: "error",
        message: "Setup failed",
        error: (error as Error).message,
      });
    }
  });

  // Simple setup page for production initialization
  app.get("/setup", (req: Request, res: Response) => {
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
    console.log("🔧 Registering routes...");
    const server = await registerRoutes(app);

    console.log("✅ Routes registered successfully");

    // Error handling middleware
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      console.error("Server error:", err);
      res.status(status).json({ message });
    });

    // Serve static files in production
    console.log("📁 Setting up static file serving...");
    serveStatic(app);

    // Start server
    const port = process.env.PORT || 5000;
    console.log(`🌐 Starting server on port ${port}...`);

    server.listen(
      {
        port: Number(port),
        host: "0.0.0.0",
        reusePort: true,
      },
      () => {
        console.log(`✅ APMC Trading System running on port ${port}`);
        console.log(`🔗 Health check: http://localhost:${port}/health`);
        console.log(`🔧 Setup page: http://localhost:${port}/setup`);
      },
    );
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
}

// Start the server
startProductionServer().catch((error) => {
  console.error("❌ Server startup failed:", error);
  process.exit(1);
});
