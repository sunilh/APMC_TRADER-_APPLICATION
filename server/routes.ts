import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import bcrypt from "bcrypt";
import { generateFarmerDayBill, getFarmerDayBills } from "./billing";
import {
  insertFarmerSchema,
  insertLotSchema,
  insertBagSchema,
  insertBuyerSchema,
  insertTenantSchema,
} from "@shared/schema";
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
  if (req.user?.role !== "super_admin") {
    return res.status(403).json({ message: "Super admin access required" });
  }
  next();
}

async function createAuditLog(
  req: any,
  action: string,
  entityType?: string,
  entityId?: number,
  oldData?: any,
  newData?: any,
) {
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
      userAgent: req.get("User-Agent"),
    });
  }
}

export function registerRoutes(app: Express): Server {
  setupAuth(app);

  // Tenant info
  app.get("/api/tenant", requireAuth, requireTenant, async (req: any, res) => {
    try {
      if (!req.user || !req.user.tenantId) {
        return res.status(400).json({ message: "Invalid user or tenant context" });
      }
      
      const tenant = await storage.getTenant(req.user.tenantId);
      if (!tenant) {
        return res.status(404).json({ message: "Tenant not found" });
      }
      res.json(tenant);
    } catch (error) {
      console.error("Error fetching tenant info:", error);
      res.status(500).json({ message: "Failed to fetch tenant info", error: (error as Error).message });
    }
  });

  // Dashboard stats
  app.get(
    "/api/dashboard/stats",
    requireAuth,
    requireTenant,
    async (req, res) => {
      try {
        const stats = await storage.getDashboardStats(req.user.tenantId);
        res.json(stats);
      } catch (error) {
        res.status(500).json({ message: "Failed to fetch dashboard stats" });
      }
    },
  );

  // Billing routes
  app.get(
    "/api/billing/farmer/:farmerId/:date",
    requireAuth,
    requireTenant,
    async (req, res) => {
      try {
        const farmerId = parseInt(req.params.farmerId);
        const date = new Date(req.params.date);

        if (isNaN(farmerId) || isNaN(date.getTime())) {
          return res.status(400).json({ message: "Invalid farmer ID or date" });
        }

        const bill = await generateFarmerDayBill(
          farmerId,
          date,
          req.user.tenantId,
        );

        if (!bill) {
          return res
            .status(404)
            .json({
              message: "No completed lots found for farmer on this date",
            });
        }

        res.json(bill);
      } catch (error) {
        res.status(500).json({ message: "Failed to generate farmer bill" });
      }
    },
  );

  app.get(
    "/api/billing/daily/:date",
    requireAuth,
    requireTenant,
    async (req, res) => {
      try {
        const date = new Date(req.params.date);

        if (isNaN(date.getTime())) {
          return res.status(400).json({ message: "Invalid date" });
        }

        const bills = await getFarmerDayBills(date, req.user.tenantId);
        res.json(bills);
      } catch (error) {
        res.status(500).json({ message: "Failed to fetch daily bills" });
      }
    },
  );

  // Farmer routes
  app.get("/api/farmers", requireAuth, requireTenant, async (req, res) => {
    try {
      const { search } = req.query;
      const farmers = await storage.getFarmersByTenant(
        req.user.tenantId,
        search as string,
      );
      res.json(farmers);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch farmers" });
    }
  });

  app.get("/api/farmers/:id", requireAuth, requireTenant, async (req, res) => {
    try {
      const farmer = await storage.getFarmer(
        parseInt(req.params.id),
        req.user.tenantId,
      );
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
      await createAuditLog(req, "create", "farmer", farmer.id, null, farmer);

      res.status(201).json(farmer);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res
          .status(400)
          .json({ message: "Validation error", errors: error.errors });
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
      const farmer = await storage.updateFarmer(
        id,
        validatedData,
        req.user.tenantId,
      );

      await createAuditLog(
        req,
        "update",
        "farmer",
        farmer.id,
        oldFarmer,
        farmer,
      );

      res.json(farmer);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res
          .status(400)
          .json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update farmer" });
    }
  });

  app.delete(
    "/api/farmers/:id",
    requireAuth,
    requireTenant,
    async (req, res) => {
      try {
        const id = parseInt(req.params.id);
        const farmer = await storage.getFarmer(id, req.user.tenantId);

        if (!farmer) {
          return res.status(404).json({ message: "Farmer not found" });
        }

        await storage.deleteFarmer(id, req.user.tenantId);
        await createAuditLog(req, "delete", "farmer", id, farmer, null);

        res.status(204).send();
      } catch (error) {
        res.status(500).json({ message: "Failed to delete farmer" });
      }
    },
  );

  // Lot routes
  app.get("/api/lots", requireAuth, requireTenant, async (req, res) => {
    try {
      const { search } = req.query;
      const lots = await storage.getLotsByTenant(
        req.user.tenantId,
        search as string,
      );
      res.json(lots);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch lots" });
    }
  });

  app.get("/api/lots/:id", requireAuth, requireTenant, async (req, res) => {
    try {
      const lot = await storage.getLot(
        parseInt(req.params.id),
        req.user.tenantId,
      );
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
      const lotNumber = `LOT${String(existingLots.length + 1).padStart(4, "0")}`;

      const validatedData = insertLotSchema.parse({
        ...req.body,
        lotNumber,
        tenantId: req.user.tenantId,
      });

      const lot = await storage.createLot(validatedData);
      await createAuditLog(req, "create", "lot", lot.id, null, lot);

      res.status(201).json(lot);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res
          .status(400)
          .json({ message: "Validation error", errors: error.errors });
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

      await createAuditLog(req, "update", "lot", lot.id, oldLot, lot);

      res.json(lot);
    } catch (error) {
      console.error("Lot update error:", error);
      if (error instanceof z.ZodError) {
        return res
          .status(400)
          .json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update lot" });
    }
  });

  // Bag routes
  app.get(
    "/api/lots/:lotId/bags",
    requireAuth,
    requireTenant,
    async (req, res) => {
      try {
        const bags = await storage.getBagsByLot(
          parseInt(req.params.lotId),
          req.user.tenantId,
        );
        res.json(bags);
      } catch (error) {
        res.status(500).json({ message: "Failed to fetch bags" });
      }
    },
  );

  app.post(
    "/api/lots/:lotId/bags",
    requireAuth,
    requireTenant,
    async (req, res) => {
      try {
        // Check for duplicate bag numbers first
        const existingBag = await storage.getBagsByLot(
          parseInt(req.params.lotId),
          req.user.tenantId,
        );
        const bagNumber = req.body.bagNumber;

        if (existingBag.some((bag) => bag.bagNumber === bagNumber)) {
          return res
            .status(400)
            .json({ message: "Bag number already exists for this lot" });
        }

        const validatedData = insertBagSchema.parse({
          ...req.body,
          lotId: parseInt(req.params.lotId),
          tenantId: req.user.tenantId,
        });

        const bag = await storage.createBag(validatedData);
        await createAuditLog(req, "create", "bag", bag.id, null, bag);

        res.status(201).json(bag);
      } catch (error) {
        console.error("Bag creation error:", error);
        if (error instanceof z.ZodError) {
          return res
            .status(400)
            .json({ message: "Validation error", errors: error.errors });
        }
        res.status(500).json({ message: "Failed to create bag" });
      }
    },
  );

  app.put("/api/bags/:id", requireAuth, requireTenant, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertBagSchema.partial().parse(req.body);

      const bag = await storage.updateBag(id, validatedData, req.user.tenantId);
      await createAuditLog(req, "update", "bag", bag.id, null, bag);

      res.json(bag);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res
          .status(400)
          .json({ message: "Validation error", errors: error.errors });
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

      await createAuditLog(req, "create", "buyer", buyer.id, null, buyer);

      res.status(201).json(buyer);
    } catch (error) {
      console.error("Buyer creation error:", error);
      if (error instanceof z.ZodError) {
        return res
          .status(400)
          .json({ message: "Validation error", errors: error.errors });
      }
      res
        .status(500)
        .json({ message: "Failed to create buyer", error: error.message });
    }
  });

  app.put("/api/buyers/:id", requireAuth, requireTenant, async (req, res) => {
    try {
      const buyerId = parseInt(req.params.id);
      const validatedData = insertBuyerSchema.partial().parse(req.body);

      const buyer = await storage.updateBuyer(
        buyerId,
        validatedData,
        req.user.tenantId,
      );
      await createAuditLog(req, "update", "buyer", buyerId, null, buyer);

      res.json(buyer);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res
          .status(400)
          .json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update buyer" });
    }
  });

  app.delete(
    "/api/buyers/:id",
    requireAuth,
    requireTenant,
    async (req, res) => {
      try {
        const buyerId = parseInt(req.params.id);
        await storage.deleteBuyer(buyerId, req.user.tenantId);
        await createAuditLog(req, "delete", "buyer", buyerId, null, null);

        res.status(204).send();
      } catch (error) {
        res.status(500).json({ message: "Failed to delete buyer" });
      }
    },
  );

  // Tenant management (super admin only)
  app.post("/api/tenants", requireAuth, requireSuperAdmin, async (req, res) => {
    try {
      const { adminUser, ...tenantData } = req.body;

      // Generate schema name
      const schemaName = `tenant_${tenantData.apmcCode.toLowerCase().replace(/[^a-z0-9]/g, "_")}`;

      const validatedTenantData = insertTenantSchema.parse({
        ...tenantData,
        schemaName,
        maxUsers:
          tenantData.subscriptionPlan === "basic"
            ? 2
            : tenantData.subscriptionPlan === "gold"
              ? 10
              : 50,
      });

      const tenant = await storage.createTenant(validatedTenantData);

      // Create admin user for the tenant
      const adminUserData = {
        ...adminUser,
        tenantId: tenant.id,
        role: "admin",
      };

      await storage.createUser(adminUserData);
      await createAuditLog(req, "create", "tenant", tenant.id, null, tenant);

      res.status(201).json(tenant);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res
          .status(400)
          .json({ message: "Validation error", errors: error.errors });
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
      const logs = await storage.getAuditLogs(
        req.user.tenantId,
        limit ? parseInt(limit as string) : undefined,
      );
      res.json(logs);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch audit logs" });
    }
  });

  // Get all tenants (super admin only)
  app.get('/api/tenants', requireAuth, requireSuperAdmin, async (req: any, res) => {
    try {
      const tenants = await storage.getAllTenants();
      res.json(tenants);
    } catch (error) {
      console.error("Error fetching tenants:", error);
      res.status(500).json({ message: "Failed to fetch tenants" });
    }
  });

  // Tenant onboarding (super admin only)
  app.post('/api/tenant/onboard', requireAuth, requireSuperAdmin, async (req: any, res) => {
    try {
      const { tenant: tenantData, adminUser: userData } = req.body;

      // Validate required fields
      if (!tenantData.name || !tenantData.apmcCode || !tenantData.place || !tenantData.mobileNumber) {
        return res.status(400).json({ message: "Missing required tenant fields" });
      }

      if (!userData.username || !userData.password) {
        return res.status(400).json({ message: "Missing required admin user fields" });
      }

      // Check if APMC code already exists
      const existingTenant = await storage.getTenantByCode(tenantData.apmcCode);
      if (existingTenant) {
        return res.status(400).json({ message: "APMC code already exists" });
      }

      // Create tenant
      const tenant = await storage.createTenant({
        name: tenantData.name,
        apmcCode: tenantData.apmcCode,
        place: tenantData.place,
        mobileNumber: tenantData.mobileNumber,
        address: tenantData.address || "",
        subscriptionPlan: tenantData.subscriptionPlan || "basic",
        settings: {}
      });

      // Check if username already exists for this tenant
      const existingUser = await storage.getUserByUsername(userData.username, tenant.id);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      // Hash password before creating admin user
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      
      // Create admin user
      const user = await storage.createUser({
        username: userData.username,
        password: hashedPassword,
        name: userData.username, // Use username as name for admin
        email: `${userData.username}@${tenant.apmcCode.toLowerCase()}.local`, // Generate email
        role: "admin",
        tenantId: tenant.id
      });

      // Log tenant creation
      await createAuditLog(req.user.id, "tenant_created", `Created tenant: ${tenant.name}`, null);

      res.status(201).json({
        message: "Tenant and admin user created successfully",
        tenant,
        user: { id: user.id, username: user.username, role: user.role }
      });
    } catch (error) {
      console.error("Error creating tenant:", error);
      res.status(500).json({ message: "Failed to create tenant" });
    }
  });

  // Staff management routes
  app.get(
    "/api/staff",
    requireAuth,
    requireTenant,
    async (req: any, res) => {
      try {
        const staff = await storage.getUsersByTenant(req.user.tenantId);
        res.json(staff);
      } catch (error) {
        console.error("Error fetching staff:", error);
        res.status(500).json({ message: "Failed to fetch staff" });
      }
    },
  );

  app.post(
    "/api/staff",
    requireAuth,
    requireTenant,
    async (req: any, res) => {
      try {
        const userData = req.body;
        
        // Check if username already exists in this tenant
        const existingUser = await storage.getUserByUsername(userData.username, req.user.tenantId);
        if (existingUser) {
          return res.status(400).json({ message: "Username already exists in this APMC center" });
        }

        // Hash password before creating staff user
        const hashedPassword = await bcrypt.hash(userData.password, 10);
        
        // Create staff user
        const user = await storage.createUser({
          username: userData.username,
          password: hashedPassword,
          name: userData.name,
          email: userData.email,
          role: userData.role,
          tenantId: req.user.tenantId,
          isActive: userData.isActive ?? true,
        });

        await createAuditLog(req.user.id, "CREATE", "USER", `Created staff: ${user.name}`, req.user.tenantId);
        
        res.json(user);
      } catch (error) {
        console.error("Error creating staff:", error);
        res.status(500).json({ message: "Failed to create staff member" });
      }
    },
  );

  app.patch(
    "/api/staff/:id",
    requireAuth,
    requireTenant,
    async (req: any, res) => {
      try {
        const staffId = parseInt(req.params.id);
        const updates = req.body;
        
        // Ensure the staff member belongs to the same tenant
        const existingUser = await storage.getUser(staffId);
        if (!existingUser || existingUser.tenantId !== req.user.tenantId) {
          return res.status(404).json({ message: "Staff member not found" });
        }

        // Don't allow changing tenantId
        delete updates.tenantId;
        
        // If password is empty, don't update it
        if (updates.password === "") {
          delete updates.password;
        } else if (updates.password) {
          // Hash password if it's being updated
          updates.password = await bcrypt.hash(updates.password, 10);
        }

        const user = await storage.updateUser(staffId, updates);
        
        await createAuditLog(req.user.id, "UPDATE", "USER", `Updated staff: ${user.name}`, req.user.tenantId);
        
        res.json(user);
      } catch (error) {
        console.error("Error updating staff:", error);
        res.status(500).json({ message: "Failed to update staff member" });
      }
    },
  );

  app.delete(
    "/api/staff/:id",
    requireAuth,
    requireTenant,
    async (req: any, res) => {
      try {
        const staffId = parseInt(req.params.id);
        
        // Ensure the staff member belongs to the same tenant
        const existingUser = await storage.getUser(staffId);
        if (!existingUser || existingUser.tenantId !== req.user.tenantId) {
          return res.status(404).json({ message: "Staff member not found" });
        }

        // Don't allow deleting yourself
        if (staffId === req.user.id) {
          return res.status(400).json({ message: "Cannot delete your own account" });
        }

        await storage.updateUser(staffId, { isActive: false });
        
        await createAuditLog(req.user.id, "DELETE", "USER", `Deleted staff: ${existingUser.name}`, req.user.tenantId);
        
        res.json({ message: "Staff member deleted successfully" });
      } catch (error) {
        console.error("Error deleting staff:", error);
        res.status(500).json({ message: "Failed to delete staff member" });
      }
    },
  );

  // Bag entry draft syncing endpoints for cross-device functionality
  app.post('/api/bag-entry-draft/:lotId', requireAuth, requireTenant, 
    async (req: any, res) => {
      try {
        const lotId = parseInt(req.params.lotId);
        const { draftData } = req.body;
        
        await storage.saveBagEntryDraft(lotId, req.user.id, req.user.tenantId, draftData);
        res.json({ message: "Draft saved successfully" });
      } catch (error) {
        console.error("Error saving draft:", error);
        res.status(500).json({ message: "Failed to save draft" });
      }
    },
  );

  app.get('/api/bag-entry-draft/:lotId', requireAuth, requireTenant,
    async (req: any, res) => {
      try {
        const lotId = parseInt(req.params.lotId);
        
        const draft = await storage.getBagEntryDraft(lotId, req.user.id, req.user.tenantId);
        res.json({ draftData: draft });
      } catch (error) {
        console.error("Error fetching draft:", error);
        res.status(500).json({ message: "Failed to fetch draft" });
      }
    },
  );

  app.delete('/api/bag-entry-draft/:lotId', requireAuth, requireTenant,
    async (req: any, res) => {
      try {
        const lotId = parseInt(req.params.lotId);
        
        await storage.deleteBagEntryDraft(lotId, req.user.id, req.user.tenantId);
        res.json({ message: "Draft deleted successfully" });
      } catch (error) {
        console.error("Error deleting draft:", error);
        res.status(500).json({ message: "Failed to delete draft" });
      }
    },
  );

  const httpServer = createServer(app);
  return httpServer;
}
