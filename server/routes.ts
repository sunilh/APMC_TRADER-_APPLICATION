import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertFarmerSchema, insertLotSchema, insertBagSchema, insertBuyerSchema, insertTenantSchema } from "@shared/schema";
import { z } from "zod";

function requireAuth(req: any, res: any, next: any) {
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ message: "Authentication required" });
  }
  next();
}

function requireTenant(req: any, res: any, next: any) {
  if (!req.user?.tenantId) {
    return res.status(403).json({ message: "Tenant access required" });
  }
  next();
}

function requireSuperAdmin(req: any, res: any, next: any) {
  if (req.user?.role !== 'super_admin') {
    return res.status(403).json({ message: "Super admin access required" });
  }
  next();
}

async function createAuditLog(req: any, action: string, entityType?: string, entityId?: number, oldData?: any, newData?: any) {
  if (req.user) {
    await storage.createAuditLog({
      userId: req.user.id,
      tenantId: req.user.tenantId,
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
  app.get("/api/dashboard/stats", requireAuth, requireTenant, async (req, res) => {
    try {
      const stats = await storage.getDashboardStats(req.user.tenantId);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // Farmer routes
  app.get("/api/farmers", requireAuth, requireTenant, async (req, res) => {
    try {
      const { search } = req.query;
      const farmers = await storage.getFarmersByTenant(req.user.tenantId, search as string);
      res.json(farmers);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch farmers" });
    }
  });

  app.get("/api/farmers/:id", requireAuth, requireTenant, async (req, res) => {
    try {
      const farmer = await storage.getFarmer(parseInt(req.params.id), req.user.tenantId);
      if (!farmer) {
        return res.status(404).json({ message: "Farmer not found" });
      }
      res.json(farmer);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch farmer" });
    }
  });

  app.post("/api/farmers", requireAuth, requireTenant, async (req, res) => {
    try {
      const validatedData = insertFarmerSchema.parse({
        ...req.body,
        tenantId: req.user.tenantId,
      });
      
      const farmer = await storage.createFarmer(validatedData);
      await createAuditLog(req, 'create', 'farmer', farmer.id, null, farmer);
      
      res.status(201).json(farmer);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create farmer" });
    }
  });

  app.put("/api/farmers/:id", requireAuth, requireTenant, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const oldFarmer = await storage.getFarmer(id, req.user.tenantId);
      
      if (!oldFarmer) {
        return res.status(404).json({ message: "Farmer not found" });
      }

      const validatedData = insertFarmerSchema.partial().parse(req.body);
      const farmer = await storage.updateFarmer(id, validatedData, req.user.tenantId);
      
      await createAuditLog(req, 'update', 'farmer', farmer.id, oldFarmer, farmer);
      
      res.json(farmer);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update farmer" });
    }
  });

  app.delete("/api/farmers/:id", requireAuth, requireTenant, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const farmer = await storage.getFarmer(id, req.user.tenantId);
      
      if (!farmer) {
        return res.status(404).json({ message: "Farmer not found" });
      }

      await storage.deleteFarmer(id, req.user.tenantId);
      await createAuditLog(req, 'delete', 'farmer', id, farmer, null);
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete farmer" });
    }
  });

  // Lot routes
  app.get("/api/lots", requireAuth, requireTenant, async (req, res) => {
    try {
      const { search } = req.query;
      const lots = await storage.getLotsByTenant(req.user.tenantId, search as string);
      res.json(lots);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch lots" });
    }
  });

  app.get("/api/lots/:id", requireAuth, requireTenant, async (req, res) => {
    try {
      const lot = await storage.getLot(parseInt(req.params.id), req.user.tenantId);
      if (!lot) {
        return res.status(404).json({ message: "Lot not found" });
      }
      res.json(lot);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch lot" });
    }
  });

  app.post("/api/lots", requireAuth, requireTenant, async (req, res) => {
    try {
      // Generate lot number
      const existingLots = await storage.getLotsByTenant(req.user.tenantId);
      const lotNumber = `LOT${String(existingLots.length + 1).padStart(4, '0')}`;

      const validatedData = insertLotSchema.parse({
        ...req.body,
        lotNumber,
        tenantId: req.user.tenantId,
      });
      
      const lot = await storage.createLot(validatedData);
      await createAuditLog(req, 'create', 'lot', lot.id, null, lot);
      
      res.status(201).json(lot);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create lot" });
    }
  });

  app.put("/api/lots/:id", requireAuth, requireTenant, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const oldLot = await storage.getLot(id, req.user.tenantId);
      
      if (!oldLot) {
        return res.status(404).json({ message: "Lot not found" });
      }

      const validatedData = insertLotSchema.partial().parse(req.body);
      const lot = await storage.updateLot(id, validatedData, req.user.tenantId);
      
      await createAuditLog(req, 'update', 'lot', lot.id, oldLot, lot);
      
      res.json(lot);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update lot" });
    }
  });

  // Bag routes
  app.get("/api/lots/:lotId/bags", requireAuth, requireTenant, async (req, res) => {
    try {
      const bags = await storage.getBagsByLot(parseInt(req.params.lotId), req.user.tenantId);
      res.json(bags);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch bags" });
    }
  });

  app.post("/api/lots/:lotId/bags", requireAuth, requireTenant, async (req, res) => {
    try {
      console.log('Bag creation - request body:', req.body);
      
      const validatedData = insertBagSchema.parse({
        ...req.body,
        lotId: parseInt(req.params.lotId),
        tenantId: req.user.tenantId,
      });
      
      console.log('Bag creation - validated data:', validatedData);
      
      const bag = await storage.createBag(validatedData);
      console.log('Bag creation - created bag:', bag);
      
      await createAuditLog(req, 'create', 'bag', bag.id, null, bag);
      
      res.status(201).json(bag);
    } catch (error) {
      console.log('Bag creation error:', error);
      if (error instanceof z.ZodError) {
        console.log('Validation errors:', error.errors);
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create bag" });
    }
  });

  app.put("/api/bags/:id", requireAuth, requireTenant, async (req, res) => {
    try {
      console.log('Bag update - request body:', req.body);
      const id = parseInt(req.params.id);
      const validatedData = insertBagSchema.partial().parse(req.body);
      console.log('Bag update - validated data:', validatedData);
      
      const bag = await storage.updateBag(id, validatedData, req.user.tenantId);
      console.log('Bag update - updated bag:', bag);
      
      await createAuditLog(req, 'update', 'bag', bag.id, null, bag);
      
      res.json(bag);
    } catch (error) {
      console.log('Bag update error:', error);
      if (error instanceof z.ZodError) {
        console.log('Update validation errors:', error.errors);
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update bag" });
    }
  });

  // Buyer routes
  app.get("/api/buyers", requireAuth, requireTenant, async (req, res) => {
    try {
      const buyers = await storage.getBuyersByTenant(req.user.tenantId);
      res.json(buyers);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch buyers" });
    }
  });

  app.post("/api/buyers", requireAuth, requireTenant, async (req, res) => {
    try {
      console.log("Creating buyer - request body:", req.body);
      console.log("User tenant ID:", req.user.tenantId);
      
      const validatedData = insertBuyerSchema.parse({
        ...req.body,
        tenantId: req.user.tenantId,
      });
      
      console.log("Validated buyer data:", validatedData);
      
      const buyer = await storage.createBuyer(validatedData);
      console.log("Created buyer:", buyer);
      
      await createAuditLog(req, 'create', 'buyer', buyer.id, null, buyer);
      
      res.status(201).json(buyer);
    } catch (error) {
      console.error("Buyer creation error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create buyer", error: error.message });
    }
  });

  app.put("/api/buyers/:id", requireAuth, requireTenant, async (req, res) => {
    try {
      const buyerId = parseInt(req.params.id);
      const validatedData = insertBuyerSchema.partial().parse(req.body);
      
      const buyer = await storage.updateBuyer(buyerId, validatedData, req.user.tenantId);
      await createAuditLog(req, 'update', 'buyer', buyerId, null, buyer);
      
      res.json(buyer);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update buyer" });
    }
  });

  app.delete("/api/buyers/:id", requireAuth, requireTenant, async (req, res) => {
    try {
      const buyerId = parseInt(req.params.id);
      await storage.deleteBuyer(buyerId, req.user.tenantId);
      await createAuditLog(req, 'delete', 'buyer', buyerId, null, null);
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete buyer" });
    }
  });

  // Tenant management (super admin only)
  app.post("/api/tenants", requireAuth, requireSuperAdmin, async (req, res) => {
    try {
      const { adminUser, ...tenantData } = req.body;
      
      // Generate schema name
      const schemaName = `tenant_${tenantData.apmcCode.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
      
      const validatedTenantData = insertTenantSchema.parse({
        ...tenantData,
        schemaName,
        maxUsers: tenantData.subscriptionPlan === 'basic' ? 2 : 
                  tenantData.subscriptionPlan === 'gold' ? 10 : 50,
      });
      
      const tenant = await storage.createTenant(validatedTenantData);
      
      // Create admin user for the tenant
      const adminUserData = {
        ...adminUser,
        tenantId: tenant.id,
        role: 'admin',
      };
      
      await storage.createUser(adminUserData);
      await createAuditLog(req, 'create', 'tenant', tenant.id, null, tenant);
      
      res.status(201).json(tenant);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create tenant" });
    }
  });

  app.get("/api/tenants", requireAuth, requireSuperAdmin, async (req, res) => {
    try {
      const tenants = await storage.getAllTenants();
      res.json(tenants);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch tenants" });
    }
  });

  // Audit logs
  app.get("/api/audit-logs", requireAuth, requireTenant, async (req, res) => {
    try {
      const { limit } = req.query;
      const logs = await storage.getAuditLogs(req.user.tenantId, limit ? parseInt(limit as string) : undefined);
      res.json(logs);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch audit logs" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
