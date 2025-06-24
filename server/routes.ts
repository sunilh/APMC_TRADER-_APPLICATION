import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertFarmerSchema, insertLotSchema, insertBagSchema, insertBuyerSchema, insertUserSchema } from "@shared/schema";
import { hashPassword } from "./auth";
import { z } from "zod";

function requireAuth(req: any, res: any, next: any) {
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ message: "Authentication required" });
  }
  next();
}

function requireAdmin(req: any, res: any, next: any) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
}

async function createAuditLog(req: any, action: string, entityType?: string, entityId?: number, oldData?: any, newData?: any) {
  if (req.user) {
    await storage.createAuditLog({
      userId: req.user.id,
      action,
      entityType,
      entityId,
      oldData,
      newData,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });
  }
}

export function registerRoutes(app: Express): Server {
  setupAuth(app);

  // Dashboard stats
  app.get("/api/dashboard/stats", requireAuth, async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error: any) {
      console.error("Dashboard stats error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Setup admin user (for initial setup)
  app.post("/api/setup-admin", async (req, res) => {
    try {
      const { name, email, username, password } = req.body;
      
      // Check if any admin already exists
      const users = await storage.getAllUsers();
      const adminExists = users.some(user => user.role === 'admin');
      
      if (adminExists) {
        return res.status(400).json({ message: "Admin already exists" });
      }

      const hashedPassword = await hashPassword(password);
      const admin = await storage.createUser({
        name,
        email,
        username,
        password: hashedPassword,
        role: 'admin',
        isActive: true,
      });

      res.json({ message: "Admin created successfully", user: { id: admin.id, username: admin.username, role: admin.role } });
    } catch (error: any) {
      console.error("Setup admin error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Login
  app.post("/api/login", async (req, res, next) => {
    try {
      const passport = await import("passport");
      passport.default.authenticate("local", (err: any, user: any) => {
        if (err) {
          return res.status(500).json({ message: "Authentication error" });
        }
        if (!user) {
          return res.status(401).json({ message: "Invalid credentials" });
        }
        req.logIn(user, (err: any) => {
          if (err) {
            return res.status(500).json({ message: "Login error" });
          }
          res.json({ 
            user: { 
              id: user.id, 
              username: user.username, 
              name: user.name, 
              email: user.email, 
              role: user.role 
            } 
          });
        });
      })(req, res, next);
    } catch (error: any) {
      console.error("Login error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Logout
  app.post("/api/logout", requireAuth, async (req, res) => {
    try {
      req.logout((err: any) => {
        if (err) {
          return res.status(500).json({ message: "Logout error" });
        }
        res.json({ message: "Logged out successfully" });
      });
    } catch (error: any) {
      console.error("Logout error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Get current user
  app.get("/api/me", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json({ 
        user: { 
          id: user.id, 
          username: user.username, 
          name: user.name, 
          email: user.email, 
          role: user.role 
        } 
      });
    } catch (error: any) {
      console.error("Get user error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Farmers
  app.get("/api/farmers", requireAuth, async (req, res) => {
    try {
      const search = req.query.search as string;
      const farmers = await storage.getAllFarmers(search);
      res.json(farmers);
    } catch (error: any) {
      console.error("Get farmers error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/farmers", requireAuth, async (req, res) => {
    try {
      const farmerData = insertFarmerSchema.parse(req.body);
      const farmer = await storage.createFarmer(farmerData, req.user.id);
      await createAuditLog(req, 'CREATE', 'farmer', farmer.id, null, farmer);
      res.json(farmer);
    } catch (error: any) {
      console.error("Create farmer error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.put("/api/farmers/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const farmerData = insertFarmerSchema.partial().parse(req.body);
      const farmer = await storage.updateFarmer(id, farmerData, req.user.id);
      await createAuditLog(req, 'UPDATE', 'farmer', id, null, farmer);
      res.json(farmer);
    } catch (error: any) {
      console.error("Update farmer error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/farmers/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteFarmer(id);
      await createAuditLog(req, 'DELETE', 'farmer', id);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Delete farmer error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Lots
  app.get("/api/lots", requireAuth, async (req, res) => {
    try {
      const search = req.query.search as string;
      const lots = await storage.getAllLots(search);
      res.json(lots);
    } catch (error: any) {
      console.error("Get lots error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/lots", requireAuth, async (req, res) => {
    try {
      const lotData = insertLotSchema.parse(req.body);
      const lot = await storage.createLot(lotData, req.user.id);
      await createAuditLog(req, 'CREATE', 'lot', lot.id, null, lot);
      res.json(lot);
    } catch (error: any) {
      console.error("Create lot error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/lots/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const lot = await storage.getLot(id);
      if (!lot) {
        return res.status(404).json({ message: "Lot not found" });
      }
      res.json(lot);
    } catch (error: any) {
      console.error("Get lot error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.put("/api/lots/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const lotData = insertLotSchema.partial().parse(req.body);
      const lot = await storage.updateLot(id, lotData, req.user.id);
      await createAuditLog(req, 'UPDATE', 'lot', id, null, lot);
      res.json(lot);
    } catch (error: any) {
      console.error("Update lot error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/lots/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteLot(id);
      await createAuditLog(req, 'DELETE', 'lot', id);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Delete lot error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Bags
  app.get("/api/lots/:lotId/bags", requireAuth, async (req, res) => {
    try {
      const lotId = parseInt(req.params.lotId);
      const bags = await storage.getBagsByLot(lotId);
      res.json(bags);
    } catch (error: any) {
      console.error("Get bags error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/bags", requireAuth, async (req, res) => {
    try {
      const bagData = insertBagSchema.parse(req.body);
      const bag = await storage.createBag(bagData, req.user.id);
      await createAuditLog(req, 'CREATE', 'bag', bag.id, null, bag);
      res.json(bag);
    } catch (error: any) {
      console.error("Create bag error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.put("/api/bags/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const bagData = insertBagSchema.partial().parse(req.body);
      const bag = await storage.updateBag(id, bagData, req.user.id);
      await createAuditLog(req, 'UPDATE', 'bag', id, null, bag);
      res.json(bag);
    } catch (error: any) {
      console.error("Update bag error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/bags/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteBag(id);
      await createAuditLog(req, 'DELETE', 'bag', id);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Delete bag error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Buyers
  app.get("/api/buyers", requireAuth, async (req, res) => {
    try {
      const buyers = await storage.getAllBuyers();
      res.json(buyers);
    } catch (error: any) {
      console.error("Get buyers error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/buyers", requireAuth, async (req, res) => {
    try {
      const buyerData = insertBuyerSchema.parse(req.body);
      const buyer = await storage.createBuyer(buyerData, req.user.id);
      await createAuditLog(req, 'CREATE', 'buyer', buyer.id, null, buyer);
      res.json(buyer);
    } catch (error: any) {
      console.error("Create buyer error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.put("/api/buyers/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const buyerData = insertBuyerSchema.partial().parse(req.body);
      const buyer = await storage.updateBuyer(id, buyerData, req.user.id);
      await createAuditLog(req, 'UPDATE', 'buyer', id, null, buyer);
      res.json(buyer);
    } catch (error: any) {
      console.error("Update buyer error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/buyers/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteBuyer(id);
      await createAuditLog(req, 'DELETE', 'buyer', id);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Delete buyer error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Audit logs
  app.get("/api/audit-logs", requireAuth, requireAdmin, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const logs = await storage.getAuditLogs(limit);
      res.json(logs);
    } catch (error: any) {
      console.error("Get audit logs error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}