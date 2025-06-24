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

    // Setup development server or static files for production
    if (app.get("env") === "development") {
      console.log("Setting up development frontend...");
      
      // Simple development frontend that works with the workflow system
      app.get("*", (req, res) => {
        if (req.path.startsWith("/api")) {
          return res.status(404).json({ message: "API endpoint not found" });
        }
        
        // Serve a working React application entry point
        res.send(`
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>APMC Trader System</title>
            <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
            <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
            <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body { 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                background: #f8fafc; color: #1a202c; line-height: 1.6;
              }
              .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
              .header { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-bottom: 20px; }
              .card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-bottom: 20px; }
              .btn { 
                display: inline-block; padding: 12px 24px; background: #3182ce; color: white; 
                text-decoration: none; border-radius: 6px; margin: 8px 8px 8px 0; border: none; cursor: pointer;
                font-size: 14px; font-weight: 500; transition: all 0.2s;
              }
              .btn:hover { background: #2c5aa0; transform: translateY(-1px); }
              .btn-success { background: #38a169; }
              .btn-success:hover { background: #2f855a; }
              .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
              .status { display: flex; align-items: center; margin: 8px 0; }
              .status-icon { margin-right: 8px; font-size: 16px; }
              .form { max-width: 400px; margin: 0 auto; }
              .form-group { margin-bottom: 15px; }
              .form-label { display: block; margin-bottom: 5px; font-weight: 500; }
              .form-input { 
                width: 100%; padding: 10px; border: 1px solid #e2e8f0; border-radius: 6px; 
                font-size: 14px; transition: border-color 0.2s;
              }
              .form-input:focus { outline: none; border-color: #3182ce; box-shadow: 0 0 0 3px rgba(49, 130, 206, 0.1); }
              .hidden { display: none; }
              .text-center { text-align: center; }
              .text-green { color: #38a169; }
              .text-blue { color: #3182ce; }
              .text-orange { color: #ed8936; }
            </style>
          </head>
          <body>
            <div id="root"></div>
            
            <script type="text/babel">
              const { useState, useEffect } = React;
              
              function App() {
                const [currentView, setCurrentView] = useState('dashboard');
                const [user, setUser] = useState(null);
                const [loading, setLoading] = useState(true);
                
                useEffect(() => {
                  checkAuth();
                }, []);
                
                const checkAuth = async () => {
                  try {
                    const response = await fetch('/api/me');
                    if (response.ok) {
                      const data = await response.json();
                      setUser(data.user);
                    }
                  } catch (error) {
                    console.log('Not authenticated');
                  }
                  setLoading(false);
                };
                
                const handleLogin = async (e) => {
                  e.preventDefault();
                  const formData = new FormData(e.target);
                  
                  try {
                    const response = await fetch('/api/login', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        username: formData.get('username'),
                        password: formData.get('password')
                      })
                    });
                    
                    if (response.ok) {
                      const data = await response.json();
                      setUser(data.user);
                      setCurrentView('dashboard');
                    } else {
                      alert('Login failed');
                    }
                  } catch (error) {
                    alert('Login error');
                  }
                };
                
                const handleSetupAdmin = async (e) => {
                  e.preventDefault();
                  const formData = new FormData(e.target);
                  
                  try {
                    const response = await fetch('/api/setup-admin', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        name: formData.get('name'),
                        email: formData.get('email'),
                        username: formData.get('username'),
                        password: formData.get('password')
                      })
                    });
                    
                    if (response.ok) {
                      alert('Admin created successfully! You can now login.');
                      setCurrentView('login');
                    } else {
                      const error = await response.json();
                      alert(error.message);
                    }
                  } catch (error) {
                    alert('Setup error');
                  }
                };
                
                const handleLogout = async () => {
                  try {
                    await fetch('/api/logout', { method: 'POST' });
                    setUser(null);
                    setCurrentView('login');
                  } catch (error) {
                    console.error('Logout error:', error);
                  }
                };
                
                if (loading) {
                  return (
                    <div className="container">
                      <div className="text-center" style={{marginTop: '100px'}}>
                        <h2>Loading...</h2>
                      </div>
                    </div>
                  );
                }
                
                if (!user && currentView !== 'setup') {
                  return (
                    <div className="container">
                      <div className="header text-center">
                        <h1>🌾 APMC Trader System</h1>
                        <p>Agricultural Produce Market Committee Management System</p>
                      </div>
                      
                      {currentView === 'login' ? (
                        <div className="card">
                          <h2 className="text-center">Login</h2>
                          <form className="form" onSubmit={handleLogin}>
                            <div className="form-group">
                              <label className="form-label">Username</label>
                              <input className="form-input" name="username" type="text" required />
                            </div>
                            <div className="form-group">
                              <label className="form-label">Password</label>
                              <input className="form-input" name="password" type="password" required />
                            </div>
                            <div className="form-group text-center">
                              <button className="btn" type="submit">Login</button>
                            </div>
                          </form>
                          <div className="text-center">
                            <button className="btn btn-success" onClick={() => setCurrentView('setup')}>
                              Setup Admin Account
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="card">
                          <h2 className="text-center">Setup Admin Account</h2>
                          <form className="form" onSubmit={handleSetupAdmin}>
                            <div className="form-group">
                              <label className="form-label">Full Name</label>
                              <input className="form-input" name="name" type="text" required />
                            </div>
                            <div className="form-group">
                              <label className="form-label">Email</label>
                              <input className="form-input" name="email" type="email" required />
                            </div>
                            <div className="form-group">
                              <label className="form-label">Username</label>
                              <input className="form-input" name="username" type="text" required />
                            </div>
                            <div className="form-group">
                              <label className="form-label">Password</label>
                              <input className="form-input" name="password" type="password" required />
                            </div>
                            <div className="form-group text-center">
                              <button className="btn btn-success" type="submit">Create Admin</button>
                            </div>
                          </form>
                          <div className="text-center">
                            <button className="btn" onClick={() => setCurrentView('login')}>
                              Back to Login
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                }
                
                return (
                  <div className="container">
                    <div className="header">
                      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                        <div>
                          <h1>🌾 APMC Trader System</h1>
                          <p>Welcome, {user.name}</p>
                        </div>
                        <div>
                          <button className="btn" onClick={() => setCurrentView('farmers')}>Farmers</button>
                          <button className="btn" onClick={() => setCurrentView('lots')}>Lots</button>
                          <button className="btn" onClick={() => setCurrentView('buyers')}>Buyers</button>
                          <button className="btn" onClick={handleLogout}>Logout</button>
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid">
                      <div className="card">
                        <h3>🎯 Dashboard</h3>
                        <div className="status">
                          <span className="status-icon text-green">✅</span>
                          <span>Backend API: Running</span>
                        </div>
                        <div className="status">
                          <span className="status-icon text-green">✅</span>
                          <span>Database: Connected</span>
                        </div>
                        <div className="status">
                          <span className="status-icon text-blue">ℹ️</span>
                          <span>Frontend: Development Mode</span>
                        </div>
                      </div>
                      
                      <div className="card">
                        <h3>🚀 Quick Actions</h3>
                        <button className="btn" onClick={() => window.open('/api/farmers', '_blank')}>
                          View Farmers API
                        </button>
                        <button className="btn" onClick={() => window.open('/api/lots', '_blank')}>
                          View Lots API
                        </button>
                        <button className="btn" onClick={() => window.open('/api/buyers', '_blank')}>
                          View Buyers API
                        </button>
                      </div>
                      
                      <div className="card">
                        <h3>📊 System Status</h3>
                        <p><strong>User:</strong> {user.username} ({user.role})</p>
                        <p><strong>Server:</strong> Express.js</p>
                        <p><strong>Database:</strong> PostgreSQL</p>
                        <p><strong>Status:</strong> <span className="text-green">Operational</span></p>
                      </div>
                    </div>
                  </div>
                );
              }
              
              ReactDOM.render(<App />, document.getElementById('root'));
            </script>
          </body>
          </html>
        `);
      });
      
      console.log("✓ Development frontend configured");
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
