import { 
  users, farmers, lots, bags, buyers, tenants, auditLogs,
  type User, type InsertUser, type Farmer, type InsertFarmer,
  type Lot, type InsertLot, type Bag, type InsertBag,
  type Buyer, type InsertBuyer, type Tenant, type InsertTenant,
  type AuditLog, type InsertAuditLog
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, count } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // User management
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string, tenantId?: number): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getUsersByTenant(tenantId: number): Promise<User[]>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User>;

  // Tenant management
  getTenant(id: number): Promise<Tenant | undefined>;
  getTenantByCode(apmcCode: string): Promise<Tenant | undefined>;
  createTenant(tenant: InsertTenant): Promise<Tenant>;
  getAllTenants(): Promise<Tenant[]>;
  updateTenant(id: number, tenant: Partial<InsertTenant>): Promise<Tenant>;

  // Farmer management
  getFarmer(id: number, tenantId: number): Promise<Farmer | undefined>;
  getFarmersByTenant(tenantId: number, search?: string): Promise<Farmer[]>;
  createFarmer(farmer: InsertFarmer): Promise<Farmer>;
  updateFarmer(id: number, farmer: Partial<InsertFarmer>, tenantId: number): Promise<Farmer>;
  deleteFarmer(id: number, tenantId: number): Promise<void>;

  // Lot management
  getLot(id: number, tenantId: number): Promise<(Lot & { farmer: Farmer; buyer?: Buyer }) | undefined>;
  getLotsByTenant(tenantId: number, search?: string): Promise<(Lot & { farmer: Farmer; buyer?: Buyer })[]>;
  createLot(lot: InsertLot): Promise<Lot>;
  updateLot(id: number, lot: Partial<InsertLot>, tenantId: number): Promise<Lot>;
  deleteLot(id: number, tenantId: number): Promise<void>;

  // Bag management
  getBagsByLot(lotId: number, tenantId: number): Promise<Bag[]>;
  createBag(bag: InsertBag): Promise<Bag>;
  updateBag(id: number, bag: Partial<InsertBag>, tenantId: number): Promise<Bag>;
  deleteBag(id: number, tenantId: number): Promise<void>;

  // Buyer management
  getBuyersByTenant(tenantId: number): Promise<Buyer[]>;
  createBuyer(buyer: InsertBuyer): Promise<Buyer>;
  updateBuyer(id: number, buyer: Partial<InsertBuyer>, tenantId: number): Promise<Buyer>;
  deleteBuyer(id: number, tenantId: number): Promise<void>;

  // Audit logging
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
  getAuditLogs(tenantId: number, limit?: number): Promise<AuditLog[]>;

  // Dashboard stats
  getDashboardStats(tenantId: number): Promise<{
    totalFarmers: number;
    activeLots: number;
    totalBagsToday: number;
    revenueToday: number;
  }>;

  sessionStore: any;
}

export class DatabaseStorage implements IStorage {
  sessionStore: any;

  constructor() {
    this.sessionStore = new PostgresSessionStore({ pool, createTableIfMissing: true });
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string, tenantId?: number): Promise<User | undefined> {
    const conditions = tenantId 
      ? and(eq(users.username, username), eq(users.tenantId, tenantId))
      : eq(users.username, username);
    
    const [user] = await db.select().from(users).where(conditions);
    return user || undefined;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }

  async getUsersByTenant(tenantId: number): Promise<User[]> {
    return await db.select().from(users).where(eq(users.tenantId, tenantId));
  }

  async updateUser(id: number, user: Partial<InsertUser>): Promise<User> {
    const [updatedUser] = await db.update(users).set(user).where(eq(users.id, id)).returning();
    return updatedUser;
  }

  async getTenant(id: number): Promise<Tenant | undefined> {
    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, id));
    return tenant || undefined;
  }

  async getTenantByCode(apmcCode: string): Promise<Tenant | undefined> {
    const [tenant] = await db.select().from(tenants).where(eq(tenants.apmcCode, apmcCode));
    return tenant || undefined;
  }

  async createTenant(tenant: InsertTenant): Promise<Tenant> {
    const [newTenant] = await db.insert(tenants).values([tenant]).returning();
    return newTenant;
  }

  async getAllTenants(): Promise<Tenant[]> {
    return await db.select().from(tenants).orderBy(desc(tenants.createdAt));
  }

  async updateTenant(id: number, tenant: Partial<InsertTenant>): Promise<Tenant> {
    const [updatedTenant] = await db.update(tenants).set(tenant).where(eq(tenants.id, id)).returning();
    return updatedTenant;
  }

  async getFarmer(id: number, tenantId: number): Promise<Farmer | undefined> {
    const [farmer] = await db.select().from(farmers)
      .where(and(eq(farmers.id, id), eq(farmers.tenantId, tenantId)));
    return farmer || undefined;
  }

  async getFarmersByTenant(tenantId: number, search?: string): Promise<Farmer[]> {
    let query = db.select().from(farmers).where(eq(farmers.tenantId, tenantId));
    
    if (search) {
      // Add search functionality here if needed
    }
    
    return await query.orderBy(desc(farmers.createdAt));
  }

  async createFarmer(farmer: InsertFarmer): Promise<Farmer> {
    const [newFarmer] = await db.insert(farmers).values(farmer).returning();
    return newFarmer;
  }

  async updateFarmer(id: number, farmer: Partial<InsertFarmer>, tenantId: number): Promise<Farmer> {
    const [updatedFarmer] = await db.update(farmers)
      .set({ ...farmer, updatedAt: new Date() })
      .where(and(eq(farmers.id, id), eq(farmers.tenantId, tenantId)))
      .returning();
    return updatedFarmer;
  }

  async deleteFarmer(id: number, tenantId: number): Promise<void> {
    await db.delete(farmers).where(and(eq(farmers.id, id), eq(farmers.tenantId, tenantId)));
  }

  async getLot(id: number, tenantId: number): Promise<(Lot & { farmer: Farmer; buyer?: Buyer }) | undefined> {
    console.log(`getLot called with id: ${id}, tenantId: ${tenantId}`);
    
    const [result] = await db.select({
      lot: lots,
      farmer: farmers,
      buyer: buyers,
    })
    .from(lots)
    .leftJoin(farmers, eq(lots.farmerId, farmers.id))
    .leftJoin(buyers, eq(lots.buyerId, buyers.id))
    .where(and(eq(lots.id, id), eq(lots.tenantId, tenantId)));

    console.log('getLot result:', JSON.stringify(result, null, 2));

    if (!result) {
      console.log('No result found');
      return undefined;
    }
    
    if (!result.farmer) {
      console.log('No farmer found in result');
      return undefined;
    }

    return {
      ...result.lot,
      farmer: result.farmer,
      buyer: result.buyer || undefined,
    };
  }

  async getLotsByTenant(tenantId: number, search?: string): Promise<(Lot & { farmer: Farmer; buyer?: Buyer })[]> {
    const results = await db.select({
      lot: lots,
      farmer: farmers,
      buyer: buyers,
    })
    .from(lots)
    .leftJoin(farmers, eq(lots.farmerId, farmers.id))
    .leftJoin(buyers, eq(lots.buyerId, buyers.id))
    .where(eq(lots.tenantId, tenantId))
    .orderBy(desc(lots.createdAt));

    return results
      .filter(result => result.farmer !== null)
      .map(result => ({
        ...result.lot,
        farmer: result.farmer,
        buyer: result.buyer || undefined,
      }));
  }

  async createLot(lot: InsertLot): Promise<Lot> {
    const [newLot] = await db.insert(lots).values(lot).returning();
    return newLot;
  }

  async updateLot(id: number, lot: Partial<InsertLot>, tenantId: number): Promise<Lot> {
    const [updatedLot] = await db.update(lots)
      .set({ ...lot, updatedAt: new Date() })
      .where(and(eq(lots.id, id), eq(lots.tenantId, tenantId)))
      .returning();
    return updatedLot;
  }

  async deleteLot(id: number, tenantId: number): Promise<void> {
    await db.delete(lots).where(and(eq(lots.id, id), eq(lots.tenantId, tenantId)));
  }

  async getBagsByLot(lotId: number, tenantId: number): Promise<Bag[]> {
    return await db.select().from(bags)
      .where(and(eq(bags.lotId, lotId), eq(bags.tenantId, tenantId)))
      .orderBy(bags.bagNumber);
  }

  async createBag(bag: InsertBag): Promise<Bag> {
    const [newBag] = await db.insert(bags).values(bag).returning();
    return newBag;
  }

  async updateBag(id: number, bag: Partial<InsertBag>, tenantId: number): Promise<Bag> {
    const [updatedBag] = await db.update(bags)
      .set({ ...bag, updatedAt: new Date() })
      .where(and(eq(bags.id, id), eq(bags.tenantId, tenantId)))
      .returning();
    return updatedBag;
  }

  async deleteBag(id: number, tenantId: number): Promise<void> {
    await db.delete(bags).where(and(eq(bags.id, id), eq(bags.tenantId, tenantId)));
  }

  async getBuyersByTenant(tenantId: number): Promise<Buyer[]> {
    return await db.select().from(buyers).where(eq(buyers.tenantId, tenantId));
  }

  async createBuyer(buyer: InsertBuyer): Promise<Buyer> {
    const [newBuyer] = await db.insert(buyers).values(buyer).returning();
    return newBuyer;
  }

  async updateBuyer(id: number, buyer: Partial<InsertBuyer>, tenantId: number): Promise<Buyer> {
    const [updated] = await db
      .update(buyers)
      .set({ ...buyer, updatedAt: new Date() })
      .where(and(eq(buyers.id, id), eq(buyers.tenantId, tenantId)))
      .returning();
    
    if (!updated) {
      throw new Error("Buyer not found");
    }
    
    return updated;
  }

  async deleteBuyer(id: number, tenantId: number): Promise<void> {
    await db
      .delete(buyers)
      .where(and(eq(buyers.id, id), eq(buyers.tenantId, tenantId)));
  }

  async updateBuyer(id: number, buyer: Partial<InsertBuyer>, tenantId: number): Promise<Buyer> {
    const [updatedBuyer] = await db.update(buyers)
      .set(buyer)
      .where(and(eq(buyers.id, id), eq(buyers.tenantId, tenantId)))
      .returning();
    return updatedBuyer;
  }

  async createAuditLog(log: InsertAuditLog): Promise<AuditLog> {
    const [newLog] = await db.insert(auditLogs).values(log).returning();
    return newLog;
  }

  async getAuditLogs(tenantId: number, limit = 100): Promise<AuditLog[]> {
    return await db.select().from(auditLogs)
      .where(eq(auditLogs.tenantId, tenantId))
      .orderBy(desc(auditLogs.timestamp))
      .limit(limit);
  }

  async getDashboardStats(tenantId: number): Promise<{
    totalFarmers: number;
    activeLots: number;
    totalBagsToday: number;
    revenueToday: number;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [farmersCount] = await db.select({ count: count() })
      .from(farmers)
      .where(eq(farmers.tenantId, tenantId));

    const [activeLotsCount] = await db.select({ count: count() })
      .from(lots)
      .where(and(eq(lots.tenantId, tenantId), eq(lots.status, 'active')));

    // For now, return basic stats - can be enhanced with more complex queries
    return {
      totalFarmers: farmersCount.count,
      activeLots: activeLotsCount.count,
      totalBagsToday: 0, // Would need date-based bag counting
      revenueToday: 0, // Would need revenue calculation
    };
  }
}

export const storage = new DatabaseStorage();
