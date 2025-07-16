import { 
  users, farmers, lots, bags, buyers, tenants, auditLogs, bagEntryDrafts,
  purchaseInvoices, purchaseInvoiceItems, stockInventory, stockMovements, 
  ocrExtractionLogs, suppliers, taxInvoices,
  type User, type InsertUser, type Farmer, type InsertFarmer,
  type Lot, type InsertLot, type Bag, type InsertBag,
  type Buyer, type InsertBuyer, type Tenant, type InsertTenant,
  type AuditLog, type InsertAuditLog, type PurchaseInvoice, type InsertPurchaseInvoice,
  type PurchaseInvoiceItem, type InsertPurchaseInvoiceItem, type StockInventory,
  type InsertStockInventory, type StockMovement, type InsertStockMovement,
  type OcrExtractionLog, type InsertOcrExtractionLog, type Supplier, type InsertSupplier
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, count, sql, gte, lte, lt, isNotNull, or, ilike } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // User management
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string, tenantId?: number): Promise<User | undefined>;
  getUsersByUsername(username: string): Promise<User[]>;
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
  getLotsByTenant(tenantId: number, search?: string, date?: string): Promise<(Lot & { farmer: Farmer; buyer?: Buyer })[]>;
  getAllLotsByTenant(tenantId: number): Promise<(Lot & { farmer: Farmer; buyer?: Buyer })[]>;
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

  // Lot completion analysis
  getLotCompletionStats(tenantId: number): Promise<Array<{
    lotId: number;
    lotNumber: string;
    farmerName: string;
    expectedBags: number;
    actualBags: number;
    missingBags: number;
    completionPercentage: number;
  }>>;

  // Bag entry draft management for cross-device syncing
  saveBagEntryDraft(lotId: number, userId: number, tenantId: number, draftData: any): Promise<void>;
  getBagEntryDraft(lotId: number, userId: number, tenantId: number): Promise<any | null>;
  deleteBagEntryDraft(lotId: number, userId: number, tenantId: number): Promise<void>;

  // Buyer tracking methods
  getBuyerPurchaseStats(buyerId: number, tenantId: number): Promise<{
    totalLots: number;
    completedLots: number;
    billGeneratedLots: number;
    pendingBills: number;
    totalAmountDue: string;
    totalAmountPaid: string;
    pendingPayments: number;
  }>;
  getBuyerPurchaseHistory(buyerId: number, tenantId: number): Promise<Array<{
    lotId: number;
    lotNumber: string;
    farmerName: string;
    numberOfBags: number;
    varietyGrade: string;
    grade: string;
    status: string;
    billGenerated: boolean;
    billGeneratedAt: string;
    paymentStatus: string;
    amountDue: string;
    amountPaid: string;
    paymentDate: string;
    createdAt: string;
  }>>;
  updateLotPayment(lotId: number, tenantId: number, paymentData: {
    paymentStatus: string;
    amountPaid: number | null;
    paymentDate: string | null;
  }): Promise<void>;

  // Patti management methods
  getPattisByTenant(tenantId: number): Promise<any[]>;
  createPatti(patti: { pattiNumber: string; description?: string; tenantId: number }): Promise<any>;

  // Buyer-side inventory management methods
  createPurchaseInvoice(invoice: any): Promise<any>;
  getPurchaseInvoices(buyerId: number, tenantId: number): Promise<any[]>;
  createPurchaseInvoiceItems(items: any[]): Promise<any[]>;
  updateStockInventory(buyerId: number, tenantId: number, items: any[]): Promise<void>;
  getStockInventory(buyerId: number, tenantId: number): Promise<any[]>;
  createStockMovements(movements: any[]): Promise<any[]>;
  createOcrExtractionLog(log: any): Promise<any>;
  getSuppliers(buyerId: number, tenantId: number): Promise<any[]>;
  getAllSuppliers(tenantId: number): Promise<any[]>;
  createSupplier(supplier: any): Promise<any>;

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

  async getUsersByUsername(username: string): Promise<User[]> {
    return await db.select().from(users).where(eq(users.username, username));
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
    if (search && search.trim()) {
      const searchTerm = `%${search.trim().toLowerCase()}%`;
      return await db.select().from(farmers)
        .where(
          and(
            eq(farmers.tenantId, tenantId),
            or(
              sql`LOWER(${farmers.name}) LIKE ${searchTerm}`,
              sql`LOWER(${farmers.mobile}) LIKE ${searchTerm}`,
              sql`LOWER(${farmers.place}) LIKE ${searchTerm}`,
              sql`LOWER(${farmers.nameAsInBank}) LIKE ${searchTerm}`,
              sql`LOWER(${farmers.bankName}) LIKE ${searchTerm}`
            )
          )
        )
        .orderBy(desc(farmers.createdAt));
    }
    
    return await db.select().from(farmers)
      .where(eq(farmers.tenantId, tenantId))
      .orderBy(desc(farmers.createdAt));
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
    const [result] = await db.select({
      lot: lots,
      farmer: farmers,
      buyer: buyers,
    })
    .from(lots)
    .leftJoin(farmers, eq(lots.farmerId, farmers.id))
    .leftJoin(buyers, eq(lots.buyerId, buyers.id))
    .where(and(eq(lots.id, id), eq(lots.tenantId, tenantId)));

    if (!result || !result.farmer) return undefined;

    return {
      ...result.lot,
      farmer: result.farmer,
      buyer: result.buyer || undefined,
    };
  }

  async getLotsByTenant(tenantId: number, search?: string, date?: string): Promise<(Lot & { farmer: Farmer; buyer?: Buyer })[]> {
    let whereConditions = eq(lots.tenantId, tenantId);

    // Add date filtering - if no date provided, default to today
    if (date) {
      const targetDate = new Date(date);
      const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
      const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));
      
      whereConditions = and(
        whereConditions,
        gte(lots.createdAt, startOfDay),
        lte(lots.createdAt, endOfDay)
      );
    } else {
      // Default to today's lots
      const today = new Date();
      const startOfToday = new Date(today.setHours(0, 0, 0, 0));
      const endOfToday = new Date(today.setHours(23, 59, 59, 999));
      
      whereConditions = and(
        whereConditions,
        gte(lots.createdAt, startOfToday),
        lte(lots.createdAt, endOfToday)
      );
    }

    const results = await db.select({
      lot: lots,
      farmer: farmers,
      buyer: buyers,
    })
    .from(lots)
    .leftJoin(farmers, eq(lots.farmerId, farmers.id))
    .leftJoin(buyers, eq(lots.buyerId, buyers.id))
    .where(whereConditions)
    .orderBy(desc(lots.createdAt));

    return results
      .filter(result => result.farmer !== null)
      .map(result => ({
        ...result.lot,
        farmer: result.farmer,
        buyer: result.buyer || undefined,
      }));
  }

  async getAllLotsByTenant(tenantId: number): Promise<(Lot & { farmer: Farmer; buyer?: Buyer })[]> {
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
    
    // Check if lot should be auto-completed after price update
    if (lot.lotPrice) {
      await this.checkAndCompleteLot(id, tenantId);
    }
    
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
    
    // Check if lot should be auto-completed after bag creation with weight
    if (bag.weight) {
      await this.checkAndCompleteLot(newBag.lotId, bag.tenantId);
    }
    
    return newBag;
  }

  async updateBag(id: number, bag: Partial<InsertBag>, tenantId: number): Promise<Bag> {
    const [updatedBag] = await db.update(bags)
      .set({ ...bag, updatedAt: new Date() })
      .where(and(eq(bags.id, id), eq(bags.tenantId, tenantId)))
      .returning();
    
    // Check if lot should be auto-completed after bag weight update
    if (bag.weight) {
      await this.checkAndCompleteLot(updatedBag.lotId, tenantId);
    }
    
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

  async checkAndCompleteLot(lotId: number, tenantId: number): Promise<void> {
    // Get lot details
    const [lot] = await db.select()
      .from(lots)
      .where(and(eq(lots.id, lotId), eq(lots.tenantId, tenantId)));
    
    if (!lot || lot.status === 'completed' || !lot.lotPrice || parseFloat(lot.lotPrice) <= 0) {
      return;
    }

    // Check if all bags have weights
    const bagStats = await db.select({
      totalBags: sql<number>`COUNT(*)`,
      weighedBags: sql<number>`COUNT(CASE WHEN ${bags.weight} IS NOT NULL AND ${bags.weight} > 0 THEN 1 END)`
    })
    .from(bags)
    .where(and(eq(bags.lotId, lotId), eq(bags.tenantId, tenantId)));

    const stats = bagStats[0];
    console.log(`Auto-completion check for lot ${lotId}: totalBags=${stats?.totalBags}, weighedBags=${stats?.weighedBags}, lotPrice=${lot.lotPrice}`);
    
    if (stats && stats.totalBags > 0 && stats.weighedBags === stats.totalBags) {
      // All bags are weighed and lot has valid price - auto-complete
      console.log(`Auto-completing lot ${lotId} - all bags weighed and price set`);
      await db.update(lots)
        .set({ status: 'completed', updatedAt: new Date() })
        .where(and(eq(lots.id, lotId), eq(lots.tenantId, tenantId)));
    }
  }

  async getDashboardStats(tenantId: number): Promise<{
    totalFarmers: number;
    activeLots: number;
    totalBagsToday: number;
    revenueToday: number;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [farmersCount] = await db.select({ count: count() })
      .from(farmers)
      .where(eq(farmers.tenantId, tenantId));

    const [activeLotsCount] = await db.select({ count: count() })
      .from(lots)
      .where(and(eq(lots.tenantId, tenantId), eq(lots.status, 'active')));

    // Count bags created today
    const [bagsToday] = await db.select({ count: count() })
      .from(bags)
      .where(and(
        eq(bags.tenantId, tenantId),
        gte(bags.createdAt, today),
        lt(bags.createdAt, tomorrow)
      ));

    // Calculate revenue from completed lots today
    const completedLotsToday = await db.select({
      totalWeight: sql<number>`SUM(${bags.weight})`,
      lotPrice: lots.lotPrice
    })
    .from(bags)
    .innerJoin(lots, eq(bags.lotId, lots.id))
    .where(and(
      eq(bags.tenantId, tenantId),
      eq(lots.status, 'completed'),
      gte(bags.createdAt, today),
      lt(bags.createdAt, tomorrow),
      isNotNull(bags.weight)
    ))
    .groupBy(lots.id, lots.lotPrice);

    const revenueToday = completedLotsToday.reduce((total, lot) => {
      const weightInQuintals = (lot.totalWeight || 0) / 100; // Convert kg to quintals
      const price = parseFloat(lot.lotPrice || '0');
      return total + (weightInQuintals * price);
    }, 0);

    return {
      totalFarmers: farmersCount.count,
      activeLots: activeLotsCount.count,
      totalBagsToday: bagsToday.count,
      revenueToday: Math.round(revenueToday),
    };
  }

  async getLotCompletionStats(tenantId: number): Promise<Array<{
    lotId: number;
    lotNumber: string;
    farmerName: string;
    expectedBags: number;
    actualBags: number;
    missingBags: number;
    completionPercentage: number;
  }>> {
    const result = await db.select({
      lotId: lots.id,
      lotNumber: lots.lotNumber,
      farmerName: farmers.name,
      expectedBags: lots.numberOfBags,
      actualBags: sql<number>`COALESCE(COUNT(${bags.id}), 0)`,
    })
    .from(lots)
    .innerJoin(farmers, eq(lots.farmerId, farmers.id))
    .leftJoin(bags, eq(lots.id, bags.lotId))
    .where(eq(lots.tenantId, tenantId))
    .groupBy(lots.id, lots.lotNumber, farmers.name, lots.numberOfBags)
    .orderBy(lots.id);

    return result.map(row => {
      const missingBags = row.expectedBags - row.actualBags;
      const completionPercentage = row.expectedBags > 0 ? Math.round((row.actualBags / row.expectedBags) * 100) : 0;
      
      return {
        lotId: row.lotId,
        lotNumber: row.lotNumber,
        farmerName: row.farmerName,
        expectedBags: row.expectedBags,
        actualBags: row.actualBags,
        missingBags,
        completionPercentage,
      };
    });
  }

  // Bag entry draft management for cross-device syncing
  async saveBagEntryDraft(lotId: number, userId: number, tenantId: number, draftData: any): Promise<void> {
    await db.insert(bagEntryDrafts)
      .values({
        lotId,
        userId,
        tenantId,
        draftData,
        lastModified: new Date(),
      })
      .onConflictDoUpdate({
        target: [bagEntryDrafts.lotId, bagEntryDrafts.userId],
        set: {
          draftData,
          lastModified: new Date(),
        },
      });
  }

  async getBagEntryDraft(lotId: number, userId: number, tenantId: number): Promise<any | null> {
    const [draft] = await db.select()
      .from(bagEntryDrafts)
      .where(and(
        eq(bagEntryDrafts.lotId, lotId),
        eq(bagEntryDrafts.userId, userId),
        eq(bagEntryDrafts.tenantId, tenantId)
      ));
    
    return draft ? draft.draftData : null;
  }

  async deleteBagEntryDraft(lotId: number, userId: number, tenantId: number): Promise<void> {
    await db.delete(bagEntryDrafts)
      .where(and(
        eq(bagEntryDrafts.lotId, lotId),
        eq(bagEntryDrafts.userId, userId),
        eq(bagEntryDrafts.tenantId, tenantId)
      ));
  }

  async getBuyerPurchaseStats(buyerId: number, tenantId: number): Promise<{
    totalLots: number;
    completedLots: number;
    billGeneratedLots: number;
    pendingBills: number;
    totalAmountDue: string;
    totalAmountPaid: string;
    pendingPayments: number;
  }> {
    const result = await db
      .select({
        totalLots: sql<number>`count(*)`,
        completedLots: sql<number>`count(case when ${lots.status} = 'completed' then 1 end)`,
        billGeneratedLots: sql<number>`count(case when ${lots.billGenerated} = true then 1 end)`,
        totalAmountPaid: sql<string>`coalesce(sum(${lots.amountPaid}), 0)`,
        pendingPayments: sql<number>`count(case when ${lots.status} = 'completed' and (${lots.paymentStatus} = 'pending' or ${lots.paymentStatus} = 'partial' or ${lots.paymentStatus} is null) then 1 end)`,
      })
      .from(lots)
      .where(and(
        eq(lots.buyerId, buyerId),
        eq(lots.tenantId, tenantId)
      ));

    // Calculate total amount due including taxes from tax invoices
    const taxInvoicesTotal = await db
      .select({
        totalTaxInvoiceAmount: sql<string>`COALESCE(SUM(CAST(${taxInvoices.totalAmount} AS DECIMAL)), 0)`,
      })
      .from(taxInvoices)
      .where(and(
        eq(taxInvoices.buyerId, buyerId),
        eq(taxInvoices.tenantId, tenantId)
      ));

    let totalAmountDue = parseFloat(taxInvoicesTotal[0]?.totalTaxInvoiceAmount || '0');

    // If no tax invoices exist, fall back to basic calculation
    if (totalAmountDue === 0) {
      const lotsWithPrices = await db
        .select({
          lotId: lots.id,
          lotPrice: lots.lotPrice,
        })
        .from(lots)
        .where(and(
          eq(lots.buyerId, buyerId),
          eq(lots.tenantId, tenantId)
        ));

      for (const lot of lotsWithPrices) {
        const bagWeights = await db
          .select({
            totalWeight: sql<number>`COALESCE(SUM(${bags.weight}), 0)`,
          })
          .from(bags)
          .where(eq(bags.lotId, lot.lotId));

        const totalWeightKg = bagWeights[0]?.totalWeight || 0;
        const totalWeightQuintals = totalWeightKg / 100;
        const lotPrice = parseFloat(lot.lotPrice || '0');
        totalAmountDue += totalWeightQuintals * lotPrice;
      }
    }

    const stats = result[0];
    const pendingBills = stats.totalLots - stats.billGeneratedLots;
    const totalPaid = parseFloat(stats.totalAmountPaid || '0');
    const remainingAmount = Math.max(0, totalAmountDue - totalPaid);

    return {
      totalLots: stats.totalLots,
      completedLots: stats.completedLots,
      billGeneratedLots: stats.billGeneratedLots,
      pendingBills,
      totalAmountDue: totalAmountDue.toFixed(2),
      totalAmountPaid: stats.totalAmountPaid || '0',
      remainingAmount: remainingAmount.toFixed(2),
      pendingPayments: stats.pendingPayments,
    };
  }

  async getBuyerPurchaseHistory(buyerId: number, tenantId: number): Promise<Array<{
    lotId: number;
    lotNumber: string;
    farmerName: string;
    numberOfBags: number;
    varietyGrade: string;
    grade: string;
    status: string;
    billGenerated: boolean;
    billGeneratedAt: string;
    paymentStatus: string;
    amountDue: string;
    amountPaid: string;
    paymentDate: string;
    createdAt: string;
  }>> {
    const result = await db
      .select({
        lotId: lots.id,
        lotNumber: lots.lotNumber,
        farmerName: farmers.name,
        numberOfBags: lots.numberOfBags,
        varietyGrade: lots.varietyGrade,
        grade: lots.grade,
        status: lots.status,
        billGenerated: lots.billGenerated,
        billGeneratedAt: lots.billGeneratedAt,
        paymentStatus: lots.paymentStatus,
        lotPrice: lots.lotPrice,
        amountPaid: lots.amountPaid,
        paymentDate: lots.paymentDate,
        createdAt: lots.createdAt,
      })
      .from(lots)
      .leftJoin(farmers, eq(lots.farmerId, farmers.id))
      .where(and(
        eq(lots.buyerId, buyerId),
        eq(lots.tenantId, tenantId)
      ))
      .orderBy(desc(lots.createdAt));

    // Calculate amount due including taxes from tax invoices
    const enrichedResult = await Promise.all(result.map(async (row) => {
      // Check if this specific lot has a tax invoice by looking in lotIds JSON array
      const allTaxInvoices = await db
        .select({
          totalAmount: taxInvoices.totalAmount,
          basicAmount: taxInvoices.basicAmount,
          lotIds: taxInvoices.lotIds,
        })
        .from(taxInvoices)
        .where(and(
          eq(taxInvoices.buyerId, buyerId),
          eq(taxInvoices.tenantId, tenantId)
        ));

      // Find invoice that contains this lot ID
      const taxInvoice = allTaxInvoices.find(invoice => {
        try {
          let lotIds: string[];
          const lotIdsRaw = invoice.lotIds;
          
          if (typeof lotIdsRaw === 'string') {
            // Handle comma-separated string format
            if (lotIdsRaw.includes(',')) {
              lotIds = lotIdsRaw.split(',').map(id => id.trim());
            } else {
              // Try JSON parsing for array format
              try {
                let lotIdsStr = lotIdsRaw;
                // Handle escaped JSON
                while (lotIdsStr.startsWith('"') && lotIdsStr.endsWith('"')) {
                  lotIdsStr = lotIdsStr.slice(1, -1);
                  lotIdsStr = lotIdsStr.replace(/\\"/g, '"');
                }
                const parsed = JSON.parse(lotIdsStr);
                lotIds = Array.isArray(parsed) ? parsed : [lotIdsStr];
              } catch {
                lotIds = [lotIdsRaw];
              }
            }
          } else if (Array.isArray(lotIdsRaw)) {
            lotIds = lotIdsRaw;
          } else {
            lotIds = [];
          }
          
          const isIncluded = lotIds.includes(row.lotNumber);
          console.log(`Debug: Lot ${row.lotNumber} found in invoice lotIds: ${lotIds.join(', ')} - ${isIncluded}`);
          return isIncluded;
        } catch (e) {
          console.log(`Failed to parse lotIds for invoice: ${invoice.lotIds}`, e);
          return false;
        }
      });

      let calculatedAmount: number;

      if (taxInvoice) {
        // Use tax invoice amount (includes all taxes and charges)
        const totalInvoiceAmount = parseFloat(taxInvoice.totalAmount);
        
        // Parse lot IDs to calculate proportional amount for multi-lot invoices
        let lotIds: string[] = [];
        try {
          const lotIdsRaw = taxInvoice.lotIds;
          if (typeof lotIdsRaw === 'string' && lotIdsRaw.includes(',')) {
            lotIds = lotIdsRaw.split(',').map(id => id.trim());
          } else if (Array.isArray(lotIdsRaw)) {
            lotIds = lotIdsRaw;
          } else {
            lotIds = [row.lotNumber]; // Single lot
          }
        } catch {
          lotIds = [row.lotNumber];
        }
        
        // If multiple lots in the invoice, calculate proportional amount based on bag count
        if (lotIds.length > 1) {
          // Get bag counts for all lots in this invoice using proper parameter binding
          const allLotsInInvoice = await Promise.all(
            lotIds.map(async (lotNumber) => {
              const result = await db
                .select({
                  lotId: lots.id,
                  lotNumber: lots.lotNumber,
                  numberOfBags: lots.numberOfBags,
                })
                .from(lots)
                .where(and(
                  eq(lots.tenantId, tenantId),
                  eq(lots.lotNumber, lotNumber)
                ))
                .limit(1);
              return result[0];
            })
          ).then(results => results.filter(Boolean));
          
          console.log(`Debug: SQL query for lots with tenantId=${tenantId}, lotIds: ${lotIds.join(', ')}`);
          
          console.log(`Debug: Found ${allLotsInInvoice.length} lots in invoice:`, allLotsInInvoice);
          
          const totalBagsInInvoice = allLotsInInvoice.reduce((sum, lot) => sum + (lot.numberOfBags || 0), 0);
          const thisLotBags = allLotsInInvoice.find(lot => lot.lotNumber === row.lotNumber)?.numberOfBags || row.numberOfBags || 0;
          
          console.log(`Debug: Total bags in invoice: ${totalBagsInInvoice}, This lot bags: ${thisLotBags}`);
          
          if (totalBagsInInvoice > 0) {
            const proportionalAmount = (thisLotBags / totalBagsInInvoice) * totalInvoiceAmount;
            calculatedAmount = proportionalAmount;
            console.log(`Using proportional tax invoice amount for lot ${row.lotNumber}: ₹${calculatedAmount.toFixed(2)} (${thisLotBags}/${totalBagsInInvoice} bags, total: ₹${totalInvoiceAmount})`);
          } else {
            // Fallback: split equally among lots
            calculatedAmount = totalInvoiceAmount / lotIds.length;
            console.log(`Fallback: Equal split for lot ${row.lotNumber}: ₹${calculatedAmount.toFixed(2)} (${lotIds.length} lots)`);
          }
        } else {
          // Single lot in invoice
          calculatedAmount = totalInvoiceAmount;
          console.log(`Using full tax invoice amount for lot ${row.lotNumber}: ₹${calculatedAmount}`);
        }
      } else {
        // Fallback to basic calculation for lots without tax invoice
        const bagWeights = await db
          .select({
            totalWeight: sql<number>`COALESCE(SUM(${bags.weight}), 0)`,
          })
          .from(bags)
          .where(eq(bags.lotId, row.lotId));

        const totalWeightKg = bagWeights[0]?.totalWeight || 0;
        const totalWeightQuintals = totalWeightKg / 100;
        const lotPrice = parseFloat(row.lotPrice || '0');
        calculatedAmount = totalWeightQuintals * lotPrice;
        console.log(`Using basic calculation for lot ${row.lotNumber}: ₹${calculatedAmount}`);
      }

      // Calculate remaining amount due (total - paid)
      const amountPaid = parseFloat(row.amountPaid?.toString() || '0');
      const remainingDue = Math.max(0, calculatedAmount - amountPaid);

      return {
        ...row,
        farmerName: row.farmerName || '',
        grade: row.grade || '',
        billGeneratedAt: row.billGeneratedAt?.toISOString() || '',
        paymentDate: row.paymentDate?.toISOString() || '',
        createdAt: row.createdAt?.toISOString() || '',
        amountDue: remainingDue.toFixed(2), // Show remaining balance, not total
        amountPaid: row.amountPaid?.toString() || '0',
        paymentStatus: row.paymentStatus || 'pending',
      };
    }));

    return enrichedResult;
  }

  async updateLotPayment(lotId: number, tenantId: number, paymentData: {
    paymentStatus: string;
    amountPaid: number | null;
    paymentDate: string | null;
  }): Promise<void> {
    let finalAmountPaid = paymentData.amountPaid;
    
    if (paymentData.paymentStatus === 'partial' && paymentData.amountPaid) {
      // For partial payments, ADD to existing amount
      const [currentLot] = await db
        .select({ amountPaid: lots.amountPaid })
        .from(lots)
        .where(and(eq(lots.id, lotId), eq(lots.tenantId, tenantId)));
      
      if (currentLot) {
        const currentPaid = parseFloat(currentLot.amountPaid?.toString() || '0');
        finalAmountPaid = currentPaid + paymentData.amountPaid;
        console.log(`Adding partial payment: ${currentPaid} + ${paymentData.amountPaid} = ${finalAmountPaid}`);
      }
    } else if (paymentData.paymentStatus === 'paid') {
      // For "paid" status, get the full invoice amount from tax invoice
      const lotDate = await db
        .select({ createdAt: lots.createdAt, buyerId: lots.buyerId })
        .from(lots)
        .where(and(eq(lots.id, lotId), eq(lots.tenantId, tenantId)));
      
      if (lotDate.length > 0) {
        const taxInvoice = await db
          .select({ totalAmount: taxInvoices.totalAmount })
          .from(taxInvoices)
          .where(and(
            eq(taxInvoices.buyerId, lotDate[0].buyerId),
            eq(taxInvoices.tenantId, tenantId),
            gte(taxInvoices.invoiceDate, new Date(lotDate[0].createdAt.toDateString())),
            lte(taxInvoices.invoiceDate, new Date(new Date(lotDate[0].createdAt.toDateString()).getTime() + 86400000))
          ))
          .limit(1);
        
        if (taxInvoice.length > 0) {
          finalAmountPaid = parseFloat(taxInvoice[0].totalAmount);
          console.log(`Setting full payment amount from tax invoice: ${finalAmountPaid}`);
        }
      }
    }

    await db
      .update(lots)
      .set({
        paymentStatus: paymentData.paymentStatus,
        amountPaid: finalAmountPaid,
        paymentDate: paymentData.paymentDate ? new Date(paymentData.paymentDate) : null,
      })
      .where(and(
        eq(lots.id, lotId),
        eq(lots.tenantId, tenantId)
      ));
  }

  // Buyer-side inventory management implementation
  async createPurchaseInvoice(invoice: any): Promise<PurchaseInvoice> {
    const [created] = await db.insert(purchaseInvoices).values({
      invoiceNumber: invoice.invoiceNumber,
      invoiceDate: new Date(invoice.invoiceDate),
      traderName: invoice.traderName,
      traderContact: invoice.traderContact || '',
      traderAddress: invoice.traderAddress || '',
      totalAmount: invoice.totalAmount || '0',
      taxAmount: invoice.taxAmount || '0',
      netAmount: invoice.netAmount || '0',
      notes: invoice.notes || '',
      buyerId: invoice.buyerId || 10,
      tenantId: invoice.tenantId,
      paymentStatus: 'pending',
      ocrProcessed: true,
      ocrConfidence: 95.0
    }).returning();
    return created;
  }

  async getPurchaseInvoices(buyerId: number, tenantId: number): Promise<PurchaseInvoice[]> {
    return await db.select()
      .from(purchaseInvoices)
      .where(and(eq(purchaseInvoices.buyerId, buyerId), eq(purchaseInvoices.tenantId, tenantId)))
      .orderBy(desc(purchaseInvoices.createdAt));
  }

  async createPurchaseInvoiceItems(items: any[]): Promise<any[]> {
    return await db.insert(purchaseInvoiceItems).values(items).returning();
  }

  async updateStockInventory(buyerId: number, tenantId: number, items: any[]): Promise<void> {
    for (const item of items) {
      const existingStock = await db.select()
        .from(stockInventory)
        .where(and(
          eq(stockInventory.buyerId, buyerId),
          eq(stockInventory.tenantId, tenantId),
          eq(stockInventory.itemName, item.itemName)
        ));

      if (existingStock.length > 0) {
        // Update existing stock
        const stock = existingStock[0];
        const newQuantity = parseFloat(stock.currentQuantity) + parseFloat(item.quantity);
        const newAvailable = parseFloat(stock.availableQuantity) + parseFloat(item.quantity);
        
        // Calculate weighted average purchase rate
        const totalValue = (parseFloat(stock.currentQuantity) * parseFloat(stock.avgPurchaseRate || '0')) + 
                          (parseFloat(item.quantity) * parseFloat(item.ratePerUnit));
        const newAvgRate = totalValue / newQuantity;

        await db.update(stockInventory)
          .set({
            currentQuantity: newQuantity.toString(),
            availableQuantity: newAvailable.toString(),
            avgPurchaseRate: newAvgRate.toString(),
            lastPurchaseRate: item.ratePerUnit,
            lastPurchaseDate: new Date(),
            lastUpdated: new Date()
          })
          .where(eq(stockInventory.id, stock.id));
      } else {
        // Create new stock entry
        await db.insert(stockInventory).values({
          itemName: item.itemName,
          itemDescription: item.itemDescription || '',
          currentQuantity: item.quantity,
          availableQuantity: item.quantity,
          reservedQuantity: '0',
          unit: item.unit,
          avgPurchaseRate: item.ratePerUnit,
          lastPurchaseRate: item.ratePerUnit,
          lastPurchaseDate: new Date(),
          minimumStockLevel: '0',
          hsnCode: item.hsnCode || '',
          isActive: true,
          buyerId,
          tenantId
        });
      }
    }
  }

  async getStockInventory(buyerId: number, tenantId: number): Promise<StockInventory[]> {
    return await db.select()
      .from(stockInventory)
      .where(and(eq(stockInventory.buyerId, buyerId), eq(stockInventory.tenantId, tenantId)))
      .orderBy(stockInventory.itemName);
  }

  async createStockMovements(movements: InsertStockMovement[]): Promise<StockMovement[]> {
    return await db.insert(stockMovements).values(movements).returning();
  }

  async createOcrExtractionLog(log: InsertOcrExtractionLog): Promise<OcrExtractionLog> {
    const [created] = await db.insert(ocrExtractionLogs).values(log).returning();
    return created;
  }

  async getSuppliers(buyerId: number, tenantId: number): Promise<Supplier[]> {
    return await db.select()
      .from(suppliers)
      .where(and(eq(suppliers.buyerId, buyerId), eq(suppliers.tenantId, tenantId)))
      .orderBy(suppliers.name);
  }

  async getAllSuppliers(tenantId: number): Promise<Supplier[]> {
    return await db.select()
      .from(suppliers)
      .where(eq(suppliers.tenantId, tenantId))
      .orderBy(suppliers.name);
  }

  // Enhanced methods with date range filtering
  async getPurchaseInvoicesWithDateRange(buyerId: number, tenantId: number, startDate?: string, endDate?: string): Promise<PurchaseInvoice[]> {
    let query = db.select()
      .from(purchaseInvoices)
      .where(and(
        eq(purchaseInvoices.buyerId, buyerId),
        eq(purchaseInvoices.tenantId, tenantId)
      ));

    if (startDate) {
      query = query.where(and(
        eq(purchaseInvoices.buyerId, buyerId),
        eq(purchaseInvoices.tenantId, tenantId),
        gte(purchaseInvoices.invoiceDate, new Date(startDate))
      ));
    }

    if (endDate) {
      const endDateTime = new Date(endDate);
      endDateTime.setHours(23, 59, 59, 999);
      query = query.where(and(
        eq(purchaseInvoices.buyerId, buyerId),
        eq(purchaseInvoices.tenantId, tenantId),
        startDate ? gte(purchaseInvoices.invoiceDate, new Date(startDate)) : undefined,
        lte(purchaseInvoices.invoiceDate, endDateTime)
      ).filter(Boolean));
    }

    return await query.orderBy(desc(purchaseInvoices.invoiceDate));
  }

  async getAllPurchaseInvoicesWithDateRange(tenantId: number, startDate?: string, endDate?: string): Promise<PurchaseInvoice[]> {
    let whereConditions = [eq(purchaseInvoices.tenantId, tenantId)];

    if (startDate) {
      whereConditions.push(gte(purchaseInvoices.invoiceDate, new Date(startDate)));
    }

    if (endDate) {
      const endDateTime = new Date(endDate);
      endDateTime.setHours(23, 59, 59, 999);
      whereConditions.push(lte(purchaseInvoices.invoiceDate, endDateTime));
    }

    return await db.select({
      id: purchaseInvoices.id,
      invoiceNumber: purchaseInvoices.invoiceNumber,
      invoiceDate: purchaseInvoices.invoiceDate,
      traderName: purchaseInvoices.traderName,
      traderContact: purchaseInvoices.traderContact,
      itemsTotal: purchaseInvoices.totalAmount,
      taxAmount: purchaseInvoices.taxAmount,
      netAmount: purchaseInvoices.netAmount,
      buyerId: purchaseInvoices.buyerId,
      notes: purchaseInvoices.notes,
      createdAt: purchaseInvoices.createdAt
    })
      .from(purchaseInvoices)
      .where(and(...whereConditions))
      .orderBy(desc(purchaseInvoices.invoiceDate));
  }

  async getAllStockInventory(tenantId: number): Promise<StockInventory[]> {
    return await db.select()
      .from(stockInventory)
      .where(eq(stockInventory.tenantId, tenantId))
      .orderBy(stockInventory.itemName);
  }

  async getStockMovementsWithDateRange(tenantId: number, filters: {
    buyerId?: number;
    startDate?: string;
    endDate?: string;
    itemName?: string;
  }): Promise<StockMovement[]> {
    let whereConditions = [eq(stockMovements.tenantId, tenantId)];

    if (filters.buyerId) {
      whereConditions.push(eq(stockMovements.buyerId, filters.buyerId));
    }

    if (filters.startDate) {
      whereConditions.push(gte(stockMovements.createdAt, new Date(filters.startDate)));
    }

    if (filters.endDate) {
      const endDateTime = new Date(filters.endDate);
      endDateTime.setHours(23, 59, 59, 999);
      whereConditions.push(lte(stockMovements.createdAt, endDateTime));
    }

    if (filters.itemName) {
      // Join with stock inventory to filter by item name
      return await db.select({
        id: stockMovements.id,
        stockId: stockMovements.stockId,
        movementType: stockMovements.movementType,
        referenceType: stockMovements.referenceType,
        referenceId: stockMovements.referenceId,
        quantityChange: stockMovements.quantityChange,
        balanceAfter: stockMovements.balanceAfter,
        ratePerUnit: stockMovements.ratePerUnit,
        totalValue: stockMovements.totalValue,
        notes: stockMovements.notes,
        buyerId: stockMovements.buyerId,
        tenantId: stockMovements.tenantId,
        createdAt: stockMovements.createdAt,
        createdBy: stockMovements.createdBy,
        itemName: stockInventory.itemName,
        unit: stockInventory.unit
      })
      .from(stockMovements)
      .innerJoin(stockInventory, eq(stockMovements.stockId, stockInventory.id))
      .where(and(
        ...whereConditions,
        ilike(stockInventory.itemName, `%${filters.itemName}%`)
      ))
      .orderBy(desc(stockMovements.createdAt));
    }

    return await db.select({
      id: stockMovements.id,
      stockId: stockMovements.stockId,
      movementType: stockMovements.movementType,
      referenceType: stockMovements.referenceType,
      referenceId: stockMovements.referenceId,
      quantityChange: stockMovements.quantityChange,
      balanceAfter: stockMovements.balanceAfter,
      ratePerUnit: stockMovements.ratePerUnit,
      totalValue: stockMovements.totalValue,
      notes: stockMovements.notes,
      buyerId: stockMovements.buyerId,
      tenantId: stockMovements.tenantId,
      createdAt: stockMovements.createdAt,
      createdBy: stockMovements.createdBy,
      itemName: sql<string>`'Unknown'`,
      unit: sql<string>`'Kg'`
    })
      .from(stockMovements)
      .where(and(...whereConditions))
      .orderBy(desc(stockMovements.createdAt));
  }

  async createSupplier(supplier: InsertSupplier): Promise<Supplier> {
    const [created] = await db.insert(suppliers).values(supplier).returning();
    return created;
  }
}

export const storage = new DatabaseStorage();
