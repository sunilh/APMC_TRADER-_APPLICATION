import express, { type Request, type Response, type NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

async function startServer() {
  try {
    console.log("Starting server initialization...");
    
    const app = express();
    
    // Basic middleware
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));

    // Add simple root route for Replit health check
    app.get('/', (_req: Request, res: Response) => {
      res.send("🟢 Replit health check passed.");
    });

    // Setup routes
    const httpServer = registerRoutes(app);
    console.log("Routes registered successfully");

    // Setup Vite development server or static files for production
    if (app.get("env") === "development") {
      console.log("Setting up Vite development server...");
      await setupVite(app, httpServer);
      console.log("✓ Vite development server configured");
    } else {
      serveStatic(app);
    }

    // Error handler
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      
      console.error("Express error:", err);
      res.status(status).json({ message });
    });

    // Start the server with proper event handling
    console.log("PORT from Replit env:", process.env.PORT);
    console.log("REPL_ID:", process.env.REPL_ID);
    console.log("REPLIT_DOMAINS:", process.env.REPLIT_DOMAINS);
    
    // Replit sets PORT automatically, but fallback to 5000 if not set
    const port = Number(process.env.PORT) || 5000;
    console.log(`Attempting to bind to port ${port}...`);
    
    return new Promise<void>((resolve, reject) => {
      const server = httpServer.listen(port, "0.0.0.0", () => {
        log(`serving on port ${port}`);
        console.log(`✓ Server listening on http://0.0.0.0:${port}`);
        console.log(`✓ Visit http://localhost:${port} for the application`);
        console.log("✓ Server startup completed successfully");
        resolve();
      });

      server.on('error', (error: any) => {
        console.error("Server startup error:", error);
        reject(error);
      });

      // Ensure server is ready
      server.on('listening', () => {
        console.log("✓ Server socket bound and listening");
      });
    });

  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

// Start server and handle any startup errors
startServer().catch((error) => {
  console.error("Server startup failed:", error);
  process.exit(1);
});