import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import bcrypt from "bcrypt";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

async function hashPassword(password: string) {
  return await bcrypt.hash(password, 10);
}

async function comparePasswords(supplied: string, stored: string) {
  return await bcrypt.compare(supplied, stored);
}

export function setupAuth(app: Express) {
  const isProduction = process.env.NODE_ENV === 'production';
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "development-secret-key-12345",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: isProduction, // Use secure cookies in production
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000,
      sameSite: isProduction ? 'none' : 'lax' // Adjust for production CORS
    },
    store: storage.sessionStore, // Use PostgreSQL store for persistence
  };

  console.log("Session configuration:", {
    secure: sessionSettings.cookie?.secure,
    sameSite: sessionSettings.cookie?.sameSite,
    hasStore: !!sessionSettings.store,
    nodeEnv: process.env.NODE_ENV
  });

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        console.log("Authentication attempt for username:", username);
        
        // Get all users with this username across all tenants
        const users = await storage.getUsersByUsername(username);
        console.log(`Found ${users?.length || 0} users with username ${username}`);
        
        if (!users || users.length === 0) {
          console.log("No users found with username:", username);
          return done(null, false, { message: "Invalid credentials" });
        }
        
        // Try to authenticate against each user until password matches
        for (const user of users) {
          console.log(`Checking password for user ID ${user.id} in tenant ${user.tenantId}`);
          
          if (await comparePasswords(password, user.password)) {
            // Check if user account is active
            if (!user.isActive) {
              console.log("User account is inactive:", user.id);
              return done(null, false, { message: "Your account has been deactivated. Please contact your admin to reactivate your account." });
            }
            console.log("Authentication successful for user:", user.id);
            return done(null, user);
          }
        }
        
        // No matching password found
        console.log("Password mismatch for all users with username:", username);
        return done(null, false, { message: "Invalid credentials" });
      } catch (error) {
        console.error("Authentication error:", error);
        return done(error);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    const user = await storage.getUser(id);
    done(null, user);
  });

  app.post("/api/register", async (req, res, next) => {
    const existingUser = await storage.getUserByUsername(req.body.username);
    if (existingUser) {
      return res.status(400).send("Username already exists");
    }

    const user = await storage.createUser({
      ...req.body,
      password: await hashPassword(req.body.password),
    });

    req.login(user, (err) => {
      if (err) return next(err);
      res.status(201).json(user);
    });
  });

  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) {
        return next(err);
      }
      if (!user) {
        return res.status(401).json({ 
          message: info?.message || "Invalid username or password" 
        });
      }
      req.login(user, (err) => {
        if (err) {
          return next(err);
        }
        res.status(200).json(user);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    res.json(req.user);
  });

  // Debug endpoint for production troubleshooting
  app.get("/api/debug/health", async (req, res) => {
    try {
      const dbCheck = await storage.getAllTenants();
      const users = dbCheck.length > 0 ? await storage.getUsersByTenant(1) : [];
      
      res.json({
        status: "ok",
        database: "connected",
        tenantCount: dbCheck.length,
        userCount: users.length,
        environment: process.env.NODE_ENV,
        sessionSecret: !!process.env.SESSION_SECRET,
        databaseUrl: !!process.env.DATABASE_URL
      });
    } catch (error) {
      res.status(500).json({
        status: "error",
        database: "disconnected",
        error: (error as Error).message,
        environment: process.env.NODE_ENV
      });
    }
  });

  // Auto-setup endpoint for production - creates default tenant and admin user
  app.post("/api/setup", async (req, res) => {
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
            userCount: users.length
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
          address: "Default Address",
          contactNumber: "1234567890",
          registrationNumber: "REG001",
          gstNumber: "DEFAULT001"
        });
        console.log("Default tenant created:", defaultTenant.id);
      } else {
        defaultTenant = tenants[0];
      }

      // Create default admin user
      console.log("Creating default admin user...");
      const hashedPassword = await hashPassword('admin123');
      
      const adminUser = await storage.createUser({
        username: 'admin',
        password: hashedPassword,
        tenantId: defaultTenant.id,
        role: 'super_admin',
        isActive: true,
        email: 'admin@example.com'
      });

      console.log("Setup completed successfully!");
      
      res.json({
        status: "setup_completed",
        message: "System configured successfully",
        credentials: {
          username: "admin",
          password: "admin123"
        },
        tenantId: defaultTenant.id,
        userId: adminUser.id
      });
      
    } catch (error) {
      console.error("Setup error:", error);
      res.status(500).json({
        status: "error",
        message: "Setup failed",
        error: (error as Error).message
      });
    }
  });
}
