import { 
  users, farmers, lots, bags, buyers, auditLogs,
  type User, type InsertUser, type Farmer, type InsertFarmer,
  type Lot, type InsertLot, type Bag, type InsertBag,
  type Buyer, type InsertBuyer, type AuditLog, type InsertAuditLog
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, count, like, ilike } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // User management
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User>;

  // Farmer management
  getFarmer(id: number): Promise<Farmer | undefined>;
  getAllFarmers(search?: string): Promise<Farmer[]>;
  createFarmer(farmer: InsertFarmer, userId?: number): Promise<Farmer>;
  updateFarmer(id: number, farmer: Partial<InsertFarmer>, userId?: number): Promise<Farmer>;
  deleteFarmer(id: number): Promise<void>;

  // Lot management
  getLot(id: number): Promise<(Lot & { farmer: Farmer; buyer?: Buyer }) | undefined>;
  getAllLots(search?: string): Promise<(Lot & { farmer: Farmer; buyer?: Buyer })[]>;
  createLot(lot: InsertLot, userId?: number): Promise<Lot>;
  updateLot(id: number, lot: Partial<InsertLot>, userId?: number): Promise<Lot>;
  deleteLot(id: number): Promise<void>;

  // Bag management
  getBagsByLot(lotId: number): Promise<Bag[]>;
  createBag(bag: InsertBag, userId?: number): Promise<Bag>;
  updateBag(id: number, bag: Partial<InsertBag>, userId?: number): Promise<Bag>;
  deleteBag(id: number): Promise<void>;

  // Buyer management
  getAllBuyers(): Promise<Buyer[]>;
  createBuyer(buyer: InsertBuyer, userId?: number): Promise<Buyer>;
  updateBuyer(id: number, buyer: Partial<InsertBuyer>, userId?: number): Promise<Buyer>;
  deleteBuyer(id: number): Promise<void>;

  // Audit logging
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
  getAuditLogs(limit?: number): Promise<AuditLog[]>;

  // Dashboard stats
  getDashboardStats(): Promise<{
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
    try {
      this.sessionStore = new PostgresSessionStore({ 
        pool, 
        createTableIfMissing: true,
        tableName: 'session'
      });
    } catch (error) {
      console.error('Failed to initialize session store:', error);
      throw error;
    }
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  async updateUser(id: number, user: Partial<InsertUser>): Promise<User> {
    const [updatedUser] = await db.update(users)
      .set({ ...user, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }

  async getFarmer(id: number): Promise<Farmer | undefined> {
    const [farmer] = await db.select().from(farmers).where(eq(farmers.id, id));
    return farmer || undefined;
  }

  async getAllFarmers(search?: string): Promise<Farmer[]> {
    if (search) {
      return await db.select().from(farmers)
        .where(
          ilike(farmers.name, `%${search}%`)
        )
        .orderBy(desc(farmers.createdAt));
    }
    return await db.select().from(farmers).orderBy(desc(farmers.createdAt));
  }

  async createFarmer(farmer: InsertFarmer, userId?: number): Promise<Farmer> {
    const [newFarmer] = await db.insert(farmers).values(farmer).returning();
    
    if (userId) {
      await this.createAuditLog({
        userId,
        action: 'CREATE',
        entityType: 'farmer',
        entityId: newFarmer.id,
        newData: newFarmer,
      });
    }
    
    return newFarmer;
  }

  async updateFarmer(id: number, farmer: Partial<InsertFarmer>, userId?: number): Promise<Farmer> {
    const oldFarmer = await this.getFarmer(id);
    
    const [updatedFarmer] = await db.update(farmers)
      .set({ ...farmer, updatedAt: new Date() })
      .where(eq(farmers.id, id))
      .returning();
    
    if (userId) {
      await this.createAuditLog({
        userId,
        action: 'UPDATE',
        entityType: 'farmer',
        entityId: id,
        oldData: oldFarmer,
        newData: updatedFarmer,
      });
    }
    
    return updatedFarmer;
  }

  async deleteFarmer(id: number): Promise<void> {
    await db.delete(farmers).where(eq(farmers.id, id));
  }

  async getLot(id: number): Promise<(Lot & { farmer: Farmer; buyer?: Buyer }) | undefined> {
    const [result] = await db.select({
      id: lots.id,
      lotNumber: lots.lotNumber,
      farmerId: lots.farmerId,
      buyerId: lots.buyerId,
      varietyGrade: lots.varietyGrade,
      numberOfBags: lots.numberOfBags,
      estimatedWeight: lots.estimatedWeight,
      rate: lots.rate,
      totalValue: lots.totalValue,
      status: lots.status,
      createdAt: lots.createdAt,
      updatedAt: lots.updatedAt,
      farmer: farmers,
      buyer: buyers,
    })
    .from(lots)
    .leftJoin(farmers, eq(lots.farmerId, farmers.id))
    .leftJoin(buyers, eq(lots.buyerId, buyers.id))
    .where(eq(lots.id, id));

    if (!result) return undefined;

    return {
      ...result,
      farmer: result.farmer!,
      buyer: result.buyer || undefined,
    };
  }

  async getAllLots(search?: string): Promise<(Lot & { farmer: Farmer; buyer?: Buyer })[]> {
    let query = db.select({
      id: lots.id,
      lotNumber: lots.lotNumber,
      farmerId: lots.farmerId,
      buyerId: lots.buyerId,
      varietyGrade: lots.varietyGrade,
      numberOfBags: lots.numberOfBags,
      estimatedWeight: lots.estimatedWeight,
      rate: lots.rate,
      totalValue: lots.totalValue,
      status: lots.status,
      createdAt: lots.createdAt,
      updatedAt: lots.updatedAt,
      farmer: farmers,
      buyer: buyers,
    })
    .from(lots)
    .leftJoin(farmers, eq(lots.farmerId, farmers.id))
    .leftJoin(buyers, eq(lots.buyerId, buyers.id));

    if (search) {
      query = query.where(
        ilike(lots.lotNumber, `%${search}%`)
      );
    }

    const results = await query.orderBy(desc(lots.createdAt));

    return results.map(result => ({
      ...result,
      farmer: result.farmer!,
      buyer: result.buyer || undefined,
    }));
  }

  async createLot(lot: InsertLot, userId?: number): Promise<Lot> {
    const [newLot] = await db.insert(lots).values(lot).returning();
    
    if (userId) {
      await this.createAuditLog({
        userId,
        action: 'CREATE',
        entityType: 'lot',
        entityId: newLot.id,
        newData: newLot,
      });
    }
    
    return newLot;
  }

  async updateLot(id: number, lot: Partial<InsertLot>, userId?: number): Promise<Lot> {
    const oldLot = await this.getLot(id);
    
    const [updatedLot] = await db.update(lots)
      .set({ ...lot, updatedAt: new Date() })
      .where(eq(lots.id, id))
      .returning();
    
    if (userId) {
      await this.createAuditLog({
        userId,
        action: 'UPDATE',
        entityType: 'lot',
        entityId: id,
        oldData: oldLot,
        newData: updatedLot,
      });
    }
    
    return updatedLot;
  }

  async deleteLot(id: number): Promise<void> {
    await db.delete(lots).where(eq(lots.id, id));
  }

  async getBagsByLot(lotId: number): Promise<Bag[]> {
    return await db.select().from(bags)
      .where(eq(bags.lotId, lotId))
      .orderBy(bags.bagNumber);
  }

  async createBag(bag: InsertBag, userId?: number): Promise<Bag> {
    const [newBag] = await db.insert(bags).values(bag).returning();
    
    if (userId) {
      await this.createAuditLog({
        userId,
        action: 'CREATE',
        entityType: 'bag',
        entityId: newBag.id,
        newData: newBag,
      });
    }
    
    return newBag;
  }

  async updateBag(id: number, bag: Partial<InsertBag>, userId?: number): Promise<Bag> {
    const [updatedBag] = await db.update(bags)
      .set({ ...bag, updatedAt: new Date() })
      .where(eq(bags.id, id))
      .returning();
    
    if (userId) {
      await this.createAuditLog({
        userId,
        action: 'UPDATE',
        entityType: 'bag',
        entityId: id,
        newData: updatedBag,
      });
    }
    
    return updatedBag;
  }

  async deleteBag(id: number): Promise<void> {
    await db.delete(bags).where(eq(bags.id, id));
  }

  async getAllBuyers(): Promise<Buyer[]> {
    return await db.select().from(buyers).orderBy(desc(buyers.createdAt));
  }

  async createBuyer(buyer: InsertBuyer, userId?: number): Promise<Buyer> {
    const [newBuyer] = await db.insert(buyers).values(buyer).returning();
    
    if (userId) {
      await this.createAuditLog({
        userId,
        action: 'CREATE',
        entityType: 'buyer',
        entityId: newBuyer.id,
        newData: newBuyer,
      });
    }
    
    return newBuyer;
  }

  async updateBuyer(id: number, buyer: Partial<InsertBuyer>, userId?: number): Promise<Buyer> {
    const [updatedBuyer] = await db.update(buyers)
      .set({ ...buyer, updatedAt: new Date() })
      .where(eq(buyers.id, id))
      .returning();
    
    if (userId) {
      await this.createAuditLog({
        userId,
        action: 'UPDATE',
        entityType: 'buyer',
        entityId: id,
        newData: updatedBuyer,
      });
    }
    
    return updatedBuyer;
  }

  async deleteBuyer(id: number): Promise<void> {
    await db.delete(buyers).where(eq(buyers.id, id));
  }

  async createAuditLog(log: InsertAuditLog): Promise<AuditLog> {
    const [newLog] = await db.insert(auditLogs).values(log).returning();
    return newLog;
  }

  async getAuditLogs(limit = 100): Promise<AuditLog[]> {
    return await db.select().from(auditLogs)
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit);
  }

  async getDashboardStats(): Promise<{
    totalFarmers: number;
    activeLots: number;
    totalBagsToday: number;
    revenueToday: number;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalFarmersResult] = await db.select({ count: count() }).from(farmers);
    const [activeLotsResult] = await db.select({ count: count() }).from(lots);
    const [totalBagsResult] = await db.select({ count: count() }).from(bags);

    return {
      totalFarmers: totalFarmersResult.count,
      activeLots: activeLotsResult.count,
      totalBagsToday: totalBagsResult.count,
      revenueToday: 0,
    };
  }
}

export const storage = new DatabaseStorage();