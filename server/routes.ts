import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { createTenantSchema, TenantDB } from "./tenant-db";
import { insertFarmerSchema, insertLotSchema, insertBagSchema, insertBuyerSchema, insertTenantSchema, insertUserSchema } from "@shared/schema";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import { db } from "./db";
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

async function getTenantDB(req: any): Promise<TenantDB> {
  try {
    const tenant = await storage.getTenant(req.user.tenantId);
    if (!tenant) {
      throw new Error("Tenant not found");
    }
    return new TenantDB(tenant.schemaName);
  } catch (error) {
    console.error('Error getting tenant DB:', error);
    throw error;
  }
}



function requireSuperAdmin(req: any, res: any, next: any) {
  if (req.user?.role !== 'super_admin') {
    return res.status(403).json({ message: "Super admin access required" });
  }
  next();
}

async function createAuditLog(req: any, action: string, entityType?: string, entityId?: number, oldData?: any, newData?: any) {
  if (req.user) {
    try {
      const tenantDB = await getTenantDB(req);
      await tenantDB.createAuditLog({
        userId: req.user.id,
        action,
        entityType,
        entityId,
        oldData,
        newData,
      });
    } catch (error) {
      console.error('Failed to create audit log:', error);
    }
  }
}

export function registerRoutes(app: Express): Server {
  setupAuth(app);

  // Dashboard stats
  app.get("/api/dashboard/stats", requireAuth, requireTenant, async (req, res) => {
    try {
      const tenantDB = await getTenantDB(req);
      const stats = await tenantDB.getDashboardStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // Farmer routes
  app.get("/api/farmers", requireAuth, requireTenant, async (req, res) => {
    try {
      const { search } = req.query;
      const tenantDB = await getTenantDB(req);
      const farmers = await tenantDB.getFarmers(search as string);
      res.json(farmers);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch farmers" });
    }
  });

  app.get("/api/farmers/:id", requireAuth, requireTenant, async (req, res) => {
    try {
      const tenantDB = await getTenantDB(req);
      const farmer = await tenantDB.getFarmer(parseInt(req.params.id));
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
      const validatedData = insertFarmerSchema.parse(req.body);
      const tenantDB = await getTenantDB(req);
      
      const farmer = await tenantDB.createFarmer(validatedData, req.user.id);
      await tenantDB.createAuditLog({
        userId: req.user.id,
        action: 'create',
        entityType: 'farmer',
        entityId: farmer.id,
        oldData: null,
        newData: farmer
      });
      
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
      const tenantDB = await getTenantDB(req);
      const oldFarmer = await tenantDB.getFarmer(id);
      
      if (!oldFarmer) {
        return res.status(404).json({ message: "Farmer not found" });
      }

      const validatedData = insertFarmerSchema.partial().parse(req.body);
      const farmer = await tenantDB.updateFarmer(id, validatedData, req.user.id);
      
      await tenantDB.createAuditLog({
        userId: req.user.id,
        action: 'update',
        entityType: 'farmer',
        entityId: farmer.id,
        oldData: oldFarmer,
        newData: farmer
      });
      
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
      const tenantDB = await getTenantDB(req);
      const farmer = await tenantDB.getFarmer(id);
      
      if (!farmer) {
        return res.status(404).json({ message: "Farmer not found" });
      }

      await tenantDB.deleteFarmer(id);
      await tenantDB.createAuditLog({
        userId: req.user.id,
        action: 'delete',
        entityType: 'farmer',
        entityId: id,
        oldData: farmer,
        newData: null
      });
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete farmer" });
    }
  });

  // Lot routes
  app.get("/api/lots", requireAuth, requireTenant, async (req, res) => {
    try {
      const { search } = req.query;
      const tenantDB = await getTenantDB(req);
      const lots = await tenantDB.getLots(search as string);
      res.json(lots);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch lots" });
    }
  });

  app.get("/api/lots/:id", requireAuth, requireTenant, async (req, res) => {
    try {
      const tenantDB = await getTenantDB(req);
      const lot = await tenantDB.getLot(parseInt(req.params.id));
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
      const tenantDB = await getTenantDB(req);
      
      // Generate lot number
      const existingLots = await tenantDB.getLots();
      const lotNumber = `LOT${String(existingLots.length + 1).padStart(4, '0')}`;

      const validatedData = insertLotSchema.parse({
        ...req.body,
        lotNumber,
      });
      
      const lot = await tenantDB.createLot(validatedData, req.user.id);
      await tenantDB.createAuditLog({
        userId: req.user.id,
        action: 'create',
        entityType: 'lot',
        entityId: lot.id,
        oldData: null,
        newData: lot
      });
      
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
      const tenantDB = await getTenantDB(req);
      const oldLot = await tenantDB.getLot(id);
      
      if (!oldLot) {
        return res.status(404).json({ message: "Lot not found" });
      }

      const validatedData = insertLotSchema.partial().parse(req.body);
      const lot = await tenantDB.updateLot(id, validatedData, req.user.id);
      
      await tenantDB.createAuditLog({
        userId: req.user.id,
        action: 'update',
        entityType: 'lot',
        entityId: lot.id,
        oldData: oldLot,
        newData: lot
      });
      
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
      const tenantDB = await getTenantDB(req);
      const bags = await tenantDB.getBagsByLot(parseInt(req.params.lotId));
      res.json(bags);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch bags" });
    }
  });

  app.post("/api/lots/:lotId/bags", requireAuth, requireTenant, async (req, res) => {
    try {
      const validatedData = insertBagSchema.parse({
        ...req.body,
        lotId: parseInt(req.params.lotId),
      });
      
      const tenantDB = await getTenantDB(req);
      const bag = await tenantDB.createBag(validatedData, req.user.id);
      await tenantDB.createAuditLog({
        userId: req.user.id,
        action: 'create',
        entityType: 'bag',
        entityId: bag.id,
        oldData: null,
        newData: bag
      });
      
      res.status(201).json(bag);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create bag" });
    }
  });

  app.put("/api/bags/:id", requireAuth, requireTenant, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertBagSchema.partial().parse(req.body);
      
      const tenantDB = await getTenantDB(req);
      const bag = await tenantDB.updateBag(id, validatedData, req.user.id);
      await tenantDB.createAuditLog({
        userId: req.user.id,
        action: 'update',
        entityType: 'bag',
        entityId: bag.id,
        oldData: null,
        newData: bag
      });
      
      res.json(bag);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update bag" });
    }
  });

  // Buyer routes
  app.get("/api/buyers", requireAuth, requireTenant, async (req, res) => {
    try {
      const tenantDB = await getTenantDB(req);
      const buyers = await tenantDB.getBuyers();
      res.json(buyers);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch buyers" });
    }
  });

  app.post("/api/buyers", requireAuth, requireTenant, async (req, res) => {
    try {
      const validatedData = insertBuyerSchema.parse(req.body);
      
      const tenantDB = await getTenantDB(req);
      const buyer = await tenantDB.createBuyer(validatedData, req.user.id);
      await tenantDB.createAuditLog({
        userId: req.user.id,
        action: 'create',
        entityType: 'buyer',
        entityId: buyer.id,
        oldData: null,
        newData: buyer
      });
      
      res.status(201).json(buyer);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create buyer" });
    }
  });

  app.put("/api/buyers/:id", requireAuth, requireTenant, async (req, res) => {
    try {
      const buyerId = parseInt(req.params.id);
      const validatedData = insertBuyerSchema.partial().parse(req.body);
      
      const tenantDB = await getTenantDB(req);
      const buyer = await tenantDB.updateBuyer(buyerId, validatedData, req.user.id);
      await tenantDB.createAuditLog({
        userId: req.user.id,
        action: 'update',
        entityType: 'buyer',
        entityId: buyerId,
        oldData: null,
        newData: buyer
      });
      
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
      const tenantDB = await getTenantDB(req);
      await tenantDB.deleteBuyer(buyerId);
      await tenantDB.createAuditLog({
        userId: req.user.id,
        action: 'delete',
        entityType: 'buyer',
        entityId: buyerId,
        oldData: null,
        newData: null
      });
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete buyer" });
    }
  });

  // Super admin setup route (only works if no super admin exists)
  app.post("/api/setup-super-admin", async (req, res) => {
    try {
      // Check if super admin already exists
      const existingSuperAdmin = await db.select().from(users).where(eq(users.role, 'super_admin')).limit(1);
      
      if (existingSuperAdmin.length > 0) {
        return res.status(400).json({ message: "Super admin already exists" });
      }

      const validatedData = insertUserSchema.parse({
        ...req.body,
        role: 'super_admin',
        tenantId: null, // Super admin doesn't belong to any tenant
      });

      const user = await storage.createUser(validatedData);
      res.status(201).json({ id: user.id, username: user.username, role: user.role });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create super admin" });
    }
  });

  // Check if super admin exists
  app.get("/api/super-admin-exists", async (req, res) => {
    try {
      const existingSuperAdmin = await db.select().from(users).where(eq(users.role, 'super_admin')).limit(1);
      res.json({ exists: existingSuperAdmin.length > 0 });
    } catch (error) {
      res.status(500).json({ message: "Failed to check super admin status" });
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
      
      // Create separate schema for this tenant
      try {
        await createTenantSchema(tenant.schemaName);
        console.log(`Successfully created schema: ${tenant.schemaName}`);
      } catch (error) {
        console.error(`Failed to create schema ${tenant.schemaName}:`, error);
        // Continue anyway - schema might already exist
      }

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
  
  // Add error handling for the server
  httpServer.on('error', (error) => {
    console.error('HTTP Server error:', error);
  });
  
  return httpServer;
}
