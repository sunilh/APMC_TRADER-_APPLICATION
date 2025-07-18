import express, { type Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import * as fs from 'fs';
import * as path from 'path';
import bcrypt from "bcrypt";
import { generateFarmerDayBill, getFarmerDayBills, generateBuyerDayBill, getBuyerDayBills, generateTaxInvoice } from "./billing";
import { generateTaxReport, generateCessReport, generateGstReport, getDateRange } from "./reports";
import {
  generateProfitLossReport,
  generateBalanceSheet, 
  generateCashFlowReport,
  analyzeProfitabilityByFarmer,
  analyzeProfitabilityByBuyer,
  calculateGSTLiability,
  generateFinalAccounts,
  recordPaymentReceived,
  recordPaymentMade,
  recordFarmerBillTransaction,
  recordTaxInvoiceTransaction,
  getCurrentFiscalYear
} from "./accounting";
import {
  insertFarmerSchema,
  insertLotSchema,
  insertBagSchema,
  insertBuyerSchema,
  insertTenantSchema,
  lots,
  farmers,
  buyers,
  users,
  bags,
  farmerBills,
  taxInvoices,
  tenants,
  accountingLedger,
  bankTransactions,
  expenseCategories,
  expenses,
  purchaseInvoices,
  stockInventory,
  bidPrices,
  suppliers,
} from "@shared/schema";
import { getSimpleFinalAccounts, getSimpleFinalAccountsDateRange, getTradingDetails } from "./finalAccountsReal";
import { 
  getLedgerEntries, 
  getBalanceSheet, 
  getExpensesSummary, 
  getDetailedExpenses, 
  getComprehensiveProfitLoss, 
  getCashFlowStatement 
} from "./accounting-complete";
import { db } from "./db";
import { eq, and, desc, gte, lte, or, ilike, isNull, sql, inArray, between } from "drizzle-orm";
import { z } from "zod";
import multer from "multer";
import { OCRService } from "./ocr-service";

// Multer configuration for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit to handle large mobile photos
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only image files and PDFs are allowed'), false);
    }
  }
});

function requireAuth(req: any, res: any, next: any) {
  console.log('requireAuth check:', { isAuthenticated: req.isAuthenticated(), user: req.user });
  if (!req.isAuthenticated() || !req.user) {
    console.log('Authentication failed');
    return res.status(401).json({ message: "Authentication required" });
  }
  next();
}

function requireTenant(req: any, res: any, next: any) {
  console.log('requireTenant check:', { user: req.user, tenantId: req.user?.tenantId });
  if (!req.user?.tenantId) {
    console.log('Tenant access denied: no tenantId');
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
  
  // Serve uploaded files statically
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

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

  // Lot completion analysis
  app.get(
    "/api/dashboard/lot-completion",
    requireAuth,
    requireTenant,
    async (req, res) => {
      try {
        const completionStats = await storage.getLotCompletionStats(req.user.tenantId);
        res.json(completionStats);
      } catch (error) {
        res.status(500).json({ message: "Failed to fetch lot completion stats" });
      }
    },
  );

  // Final Accounts & Accounting API Endpoints
  
  // Test accounting system status
  app.get("/api/accounting/status", requireAuth, requireTenant, async (req: any, res) => {
    try {
      res.json({ 
        status: "ok", 
        tenantId: req.user.tenantId,
        fiscalYear: getCurrentFiscalYear(),
        message: "Accounting system is operational"
      });
    } catch (error) {
      console.error("Error checking accounting status:", error);
      res.status(500).json({ message: "Accounting system error" });
    }
  });
  
  // Removed duplicate route - consolidated into single route below

  // Get final accounts without fiscal year parameter (with optional date range)
  app.get("/api/accounting/final-accounts", requireAuth, requireTenant, async (req: any, res) => {
    try {
      const { startDate, endDate } = req.query;
      let fiscalYear = getCurrentFiscalYear();
      
      console.log('🔍 Final Accounts API called with:', { 
        startDate, 
        endDate, 
        fiscalYear, 
        tenantId: req.user.tenantId,
        queryParams: req.query 
      });
      
      // If custom date range provided, use that instead of fiscal year
      if (startDate && endDate) {
        console.log('📅 Using DATE RANGE mode:', { startDate, endDate });
        const finalAccounts = await getSimpleFinalAccountsDateRange(
          req.user.tenantId, 
          new Date(startDate as string), 
          new Date(endDate as string)
        );
        console.log('📊 Date range result:', { 
          netProfit: finalAccounts.netProfit, 
          totalIncome: finalAccounts.totalIncome,
          fiscalYear: finalAccounts.fiscalYear 
        });
        
        // Add cache-control headers to prevent caching
        res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.set('Pragma', 'no-cache');
        res.set('Expires', '0');
        
        res.json(finalAccounts);
      } else {
        console.log('🗓️ Using FISCAL YEAR mode:', { fiscalYear });
        const finalAccounts = await getSimpleFinalAccounts(req.user.tenantId, fiscalYear);
        console.log('📊 Fiscal year result:', { 
          netProfit: finalAccounts.netProfit, 
          totalIncome: finalAccounts.totalIncome,
          fiscalYear: finalAccounts.fiscalYear 
        });
        res.json(finalAccounts);
      }
    } catch (error) {
      console.error("Error generating final accounts:", error);
      res.status(500).json({ message: "Failed to generate final accounts" });
    }
  });

  // Get P&L report
  app.get("/api/accounting/profit-loss/:fiscalYear?", requireAuth, requireTenant, async (req: any, res) => {
    try {
      const fiscalYear = req.params.fiscalYear;
      const profitLoss = await generateProfitLossReport(req.user.tenantId, fiscalYear);
      res.json(profitLoss);
    } catch (error) {
      console.error("Error generating P&L report:", error);
      res.status(500).json({ message: "Failed to generate P&L report" });
    }
  });

  // Get balance sheet
  app.get("/api/accounting/balance-sheet/:fiscalYear?", requireAuth, requireTenant, async (req: any, res) => {
    try {
      const fiscalYear = req.params.fiscalYear;
      const balanceSheet = await generateBalanceSheet(req.user.tenantId, fiscalYear);
      res.json(balanceSheet);
    } catch (error) {
      console.error("Error generating balance sheet:", error);
      res.status(500).json({ message: "Failed to generate balance sheet" });
    }
  });

  // Get cash flow report
  app.get("/api/accounting/cash-flow/:fiscalYear?", requireAuth, requireTenant, async (req: any, res) => {
    try {
      const fiscalYear = req.params.fiscalYear;
      const cashFlow = await generateCashFlowReport(req.user.tenantId, fiscalYear);
      res.json(cashFlow);
    } catch (error) {
      console.error("Error generating cash flow report:", error);
      res.status(500).json({ message: "Failed to generate cash flow report" });
    }
  });

  // Get trading details breakdown  
  app.get("/api/accounting/trading-details", requireAuth, requireTenant, async (req: any, res) => {
    try {
      const { startDate, endDate, fiscalYear } = req.query;
      
      console.log('🔍 Trading Details API called with:', { 
        startDate, 
        endDate, 
        fiscalYear, 
        tenantId: req.user.tenantId 
      });
      
      const tradingDetails = await getTradingDetails(
        req.user.tenantId, 
        startDate as string, 
        endDate as string, 
        fiscalYear as string
      );
      
      console.log('📊 Trading details result:', { 
        cashInflow: tradingDetails.summary.total_cash_inflow, 
        cashOutflow: tradingDetails.summary.total_cash_outflow,
        netProfit: tradingDetails.summary.net_profit 
      });
      
      res.json(tradingDetails);
    } catch (error) {
      console.error("Error getting trading details:", error);
      res.status(500).json({ message: "Failed to get trading details" });
    }
  });

  // Get farmer profitability analysis
  app.get("/api/accounting/profitability/farmers/:fiscalYear?", requireAuth, requireTenant, async (req: any, res) => {
    try {
      const fiscalYear = req.params.fiscalYear || req.query.fiscalYear;
      const startDate = req.query.startDate;
      const endDate = req.query.endDate;
      console.log('🔍 Farmer profitability API called with:', { fiscalYear, startDate, endDate, queryParams: req.query });
      
      const profitability = await analyzeProfitabilityByFarmer(req.user.tenantId, fiscalYear, startDate, endDate);
      res.json(profitability);
    } catch (error) {
      console.error("Error analyzing farmer profitability:", error);
      res.status(500).json({ message: "Failed to analyze farmer profitability" });
    }
  });

  // Get buyer profitability analysis
  app.get("/api/accounting/profitability/buyers/:fiscalYear?", requireAuth, requireTenant, async (req: any, res) => {
    try {
      const fiscalYear = req.params.fiscalYear || req.query.fiscalYear;
      const startDate = req.query.startDate;
      const endDate = req.query.endDate;
      console.log('🔍 Buyer profitability API called with:', { fiscalYear, startDate, endDate, queryParams: req.query });
      
      const profitability = await analyzeProfitabilityByBuyer(req.user.tenantId, fiscalYear, startDate, endDate);
      res.json(profitability);
    } catch (error) {
      console.error("Error analyzing buyer profitability:", error);
      res.status(500).json({ message: "Failed to analyze buyer profitability" });
    }
  });

  // Get GST liability
  app.get("/api/accounting/gst-liability/:fiscalYear?", requireAuth, requireTenant, async (req: any, res) => {
    try {
      const fiscalYear = req.params.fiscalYear || req.query.fiscalYear;
      const startDate = req.query.startDate;
      const endDate = req.query.endDate;
      console.log('🔍 GST liability API called with:', { fiscalYear, startDate, endDate, queryParams: req.query });
      
      const gstLiability = await calculateGSTLiability(req.user.tenantId, fiscalYear, startDate, endDate);
      res.json(gstLiability);
    } catch (error) {
      console.error("Error calculating GST liability:", error);
      res.status(500).json({ message: "Failed to calculate GST liability" });
    }
  });

  // Get current fiscal year
  app.get("/api/accounting/fiscal-year", requireAuth, async (req: any, res) => {
    try {
      const fiscalYear = getCurrentFiscalYear();
      res.json({ fiscalYear });
    } catch (error) {
      console.error("Error getting fiscal year:", error);
      res.status(500).json({ message: "Failed to get fiscal year" });
    }
  });

  // COMPREHENSIVE ACCOUNTING SYSTEM API ENDPOINTS

  // 1. LEDGER ENDPOINTS - Detailed transaction tracking
  app.get('/api/accounting/ledger', requireAuth, requireTenant, async (req: any, res) => {
    try {
      const { startDate, endDate } = req.query;
      const result = await getLedgerEntries(req.user.tenantId, startDate, endDate);
      res.json(result);
    } catch (error) {
      console.error('Error getting ledger entries:', error);
      res.status(500).json({ message: 'Failed to get ledger entries' });
    }
  });

  // 2. BALANCE SHEET ENDPOINTS - Financial position
  app.get('/api/accounting/balance-sheet', requireAuth, requireTenant, async (req: any, res) => {
    try {
      const { asOfDate } = req.query;
      const result = await getBalanceSheet(req.user.tenantId, asOfDate);
      res.json(result);
    } catch (error) {
      console.error('Error getting balance sheet:', error);
      res.status(500).json({ message: 'Failed to get balance sheet' });
    }
  });

  // 3. EXPENSE TRACKING ENDPOINTS - Business cost management
  app.get('/api/accounting/expenses/summary', requireAuth, requireTenant, async (req: any, res) => {
    try {
      const { startDate, endDate } = req.query;
      const result = await getExpensesSummary(req.user.tenantId, startDate, endDate);
      res.json(result);
    } catch (error) {
      console.error('Error getting expenses summary:', error);
      res.status(500).json({ message: 'Failed to get expenses summary' });
    }
  });

  app.get('/api/accounting/expenses/detailed', requireAuth, requireTenant, async (req: any, res) => {
    try {
      const { startDate, endDate } = req.query;
      const result = await getDetailedExpenses(req.user.tenantId, startDate, endDate);
      res.json(result);
    } catch (error) {
      console.error('Error getting detailed expenses:', error);
      res.status(500).json({ message: 'Failed to get detailed expenses' });
    }
  });

  // Add expense endpoint
  app.post('/api/accounting/expenses', requireAuth, requireTenant, async (req: any, res) => {
    try {
      const expenseData = {
        ...req.body,
        tenantId: req.user.tenantId
      };

      const [expense] = await db.insert(expenses).values(expenseData).returning();
      
      // Also create accounting ledger entry
      await db.insert(accountingLedger).values({
        tenantId: req.user.tenantId,
        accountHead: req.body.category,
        description: `${req.body.category}: ${req.body.description}`,
        debitAmount: req.body.amount,
        creditAmount: 0,
        referenceType: 'expense',
        referenceId: expense.id.toString(),
        transactionDate: req.body.expenseDate || new Date(),
        fiscalYear: getCurrentFiscalYear()
      });

      res.json(expense);
    } catch (error) {
      console.error('Error adding expense:', error);
      res.status(500).json({ message: 'Failed to add expense' });
    }
  });

  // 4. COMPREHENSIVE PROFIT & LOSS - True business profitability
  app.get('/api/accounting/profit-loss-comprehensive', requireAuth, requireTenant, async (req: any, res) => {
    try {
      const { startDate, endDate } = req.query;
      const result = await getComprehensiveProfitLoss(req.user.tenantId, startDate, endDate);
      res.json(result);
    } catch (error) {
      console.error('Error getting comprehensive P&L:', error);
      res.status(500).json({ message: 'Failed to get comprehensive P&L' });
    }
  });

  // 5. CASH FLOW STATEMENT - Money movement tracking
  app.get('/api/accounting/cash-flow', requireAuth, requireTenant, async (req: any, res) => {
    try {
      const { startDate, endDate } = req.query;
      const result = await getCashFlowStatement(req.user.tenantId, startDate, endDate);
      res.json(result);
    } catch (error) {
      console.error('Error getting cash flow statement:', error);
      res.status(500).json({ message: 'Failed to get cash flow statement' });
    }
  });

  // Record payment received
  app.post("/api/accounting/payment-received", requireAuth, requireTenant, async (req: any, res) => {
    try {
      const { buyerId, amount, paymentMethod, referenceNumber } = req.body;
      await recordPaymentReceived(
        parseInt(buyerId),
        parseFloat(amount),
        paymentMethod,
        referenceNumber,
        req.user.tenantId,
        req.user.id
      );
      res.json({ message: "Payment received recorded successfully" });
    } catch (error) {
      console.error("Error recording payment received:", error);
      res.status(500).json({ message: "Failed to record payment received" });
    }
  });

  // Record payment made
  app.post("/api/accounting/payment-made", requireAuth, requireTenant, async (req: any, res) => {
    try {
      const { farmerId, amount, paymentMethod, referenceNumber } = req.body;
      await recordPaymentMade(
        parseInt(farmerId),
        parseFloat(amount),
        paymentMethod,
        referenceNumber,
        req.user.tenantId,
        req.user.id
      );
      res.json({ message: "Payment made recorded successfully" });
    } catch (error) {
      console.error("Error recording payment made:", error);
      res.status(500).json({ message: "Failed to record payment made" });
    }
  });

  // Get expense categories
  app.get("/api/accounting/expense-categories", requireAuth, requireTenant, async (req: any, res) => {
    try {
      const categories = await db.execute(sql`
        SELECT * FROM expense_categories 
        WHERE tenant_id = ${req.user.tenantId} 
        ORDER BY name
      `);
      res.json(categories.rows);
    } catch (error) {
      console.error("Error fetching expense categories:", error);
      res.status(500).json({ message: "Failed to fetch expense categories" });
    }
  });

  // Add expense
  app.post("/api/accounting/expenses", requireAuth, requireTenant, async (req: any, res) => {
    try {
      const { categoryId, amount, description, expenseDate, paymentMethod, receiptNumber } = req.body;
      const [expense] = await db
        .insert(expenses)
        .values({
          categoryId: parseInt(categoryId),
          tenantId: req.user.tenantId,
          amount: parseFloat(amount).toString(),
          description,
          expenseDate: new Date(expenseDate),
          paymentMethod,
          receiptNumber,
          createdBy: req.user.id,
        })
        .returning();
      res.json({ message: "Expense recorded successfully", expenseId: expense.id });
    } catch (error) {
      console.error("Error recording expense:", error);
      res.status(500).json({ message: "Failed to record expense" });
    }
  });

  // Get expenses
  app.get("/api/accounting/expenses", requireAuth, requireTenant, async (req: any, res) => {
    try {
      const { categoryId } = req.query;
      const tenantId = req.user.tenantId;

      let query = db
        .select()
        .from(expenses)
        .where(eq(expenses.tenantId, tenantId))
        .orderBy(desc(expenses.expenseDate));

      if (categoryId) {
        query = query.where(and(
          eq(expenses.tenantId, tenantId),
          eq(expenses.categoryId, parseInt(categoryId as string))
        ));
      }

      const expensesList = await query;
      res.json(expensesList);
    } catch (error) {
      console.error('Error fetching expenses:', error);
      res.status(500).json({ message: 'Failed to fetch expenses' });
    }
  });

  // Get recent ledger entries
  app.get("/api/accounting/ledger", requireAuth, requireTenant, async (req: any, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const fiscalYear = req.query.fiscalYear;
      const startDate = req.query.startDate;
      const endDate = req.query.endDate;
      
      console.log('🔍 Ledger entries API called with:', { fiscalYear, startDate, endDate, queryParams: req.query });
      
      let query = db
        .select()
        .from(accountingLedger)
        .where(eq(accountingLedger.tenantId, req.user.tenantId))
        .orderBy(desc(accountingLedger.transactionDate))
        .limit(limit);

      // Add date filtering
      if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999); // Include full end date
        
        query = query.where(and(
          eq(accountingLedger.tenantId, req.user.tenantId),
          gte(accountingLedger.transactionDate, start),
          lte(accountingLedger.transactionDate, end)
        ));
        console.log('📅 Using DATE RANGE mode for ledger entries:', { startDate, endDate });
      } else if (fiscalYear) {
        query = query.where(and(
          eq(accountingLedger.tenantId, req.user.tenantId),
          eq(accountingLedger.fiscalYear, fiscalYear)
        ));
        console.log('📅 Using FISCAL YEAR mode for ledger entries:', { fiscalYear });
      }

      const entries = await query;
      res.json(entries);
    } catch (error) {
      console.error("Error fetching ledger entries:", error);
      res.status(500).json({ message: "Failed to fetch ledger entries" });
    }
  });

  // Get bank transactions
  app.get("/api/accounting/bank-transactions", requireAuth, requireTenant, async (req: any, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const fiscalYear = req.query.fiscalYear;
      const startDate = req.query.startDate;
      const endDate = req.query.endDate;
      
      console.log('🔍 Bank transactions API called with:', { fiscalYear, startDate, endDate, queryParams: req.query });
      
      let whereClause = `WHERE tenant_id = ${req.user.tenantId}`;
      
      // Add date filtering
      if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999); // Include full end date
        
        whereClause += ` AND created_at BETWEEN '${start.toISOString()}' AND '${end.toISOString()}'`;
        console.log('📅 Using DATE RANGE mode for bank transactions:', { startDate, endDate });
      } else if (fiscalYear) {
        // For fiscal year filtering, you would need to add fiscal_year column to bank_transactions table
        // For now, we'll use the created_at field
        console.log('📅 Using FISCAL YEAR mode for bank transactions:', { fiscalYear });
      }
      
      const transactions = await db.execute(sql`
        SELECT * FROM bank_transactions 
        ${sql.raw(whereClause)}
        ORDER BY created_at DESC 
        LIMIT ${limit}
      `);
      res.json(transactions.rows);
    } catch (error) {
      console.error("Error fetching bank transactions:", error);
      res.status(500).json({ message: "Failed to fetch bank transactions" });
    }
  });

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

  // Get completed lots for a farmer for bill generation (supports date filtering)
  app.get("/api/farmer/:farmerId/completed-lots", requireAuth, requireTenant, async (req: any, res) => {
    try {
      const farmerId = parseInt(req.params.farmerId);
      const tenantId = req.user.tenantId;
      const { date } = req.query;

      // Use provided date or default to today
      const targetDate = date ? new Date(date as string) : new Date();
      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);

      // Get completed lots for this farmer on the specified date with bag weights
      const completedLots = await db.select({
        id: lots.id,
        lotNumber: lots.lotNumber,
        farmerId: lots.farmerId,
        numberOfBags: lots.numberOfBags,
        lotPrice: lots.lotPrice,
        vehicleRent: lots.vehicleRent,
        advance: lots.advance,
        unloadHamali: lots.unloadHamali,
        varietyGrade: lots.varietyGrade,
        grade: lots.grade,
        status: lots.status,
        createdAt: lots.createdAt,
      })
      .from(lots)
      .where(and(
        eq(lots.farmerId, farmerId),
        eq(lots.tenantId, tenantId),
        eq(lots.status, 'completed'),
        gte(lots.createdAt, startOfDay),
        lte(lots.createdAt, endOfDay),
        sql`${lots.lotPrice} IS NOT NULL AND ${lots.lotPrice} > 0`
      ))
      .orderBy(desc(lots.createdAt));

      // Get bag counts and total weights for each lot
      const lotsWithWeights = [];
      for (const lot of completedLots) {
        const bagData = await db.select({
          totalWeight: sql<number>`COALESCE(SUM(CAST(${bags.weight} AS DECIMAL)), 0)`,
          bagCount: sql<number>`COUNT(*)`
        })
        .from(bags)
        .where(and(
          eq(bags.lotId, lot.id),
          eq(bags.tenantId, tenantId)
        ));

        const totalWeight = parseFloat(bagData[0]?.totalWeight?.toString() || '0');
        const bagCount = parseInt(bagData[0]?.bagCount?.toString() || '0');

        // Only include lots that have actual bag weights
        if (totalWeight > 0 && bagCount > 0) {
          lotsWithWeights.push({
            ...lot,
            totalWeight,
            actualBagCount: bagCount
          });
        }
      }

      res.json(lotsWithWeights);
    } catch (error) {
      console.error("Error fetching farmer completed lots:", error);
      res.status(500).json({ message: "Failed to fetch farmer completed lots" });
    }
  });

  // Get farmer bill details by farmer ID for download/view (simple working version)
  app.get("/api/farmer-bill/:farmerId", requireAuth, requireTenant, async (req: any, res) => {
    try {
      const farmerId = parseInt(req.params.farmerId);
      const tenantId = req.user.tenantId;

      // Find the farmer bill record
      const [bill] = await db
        .select()
        .from(farmerBills)
        .where(and(eq(farmerBills.farmerId, farmerId), eq(farmerBills.tenantId, tenantId)))
        .orderBy(desc(farmerBills.createdAt))
        .limit(1);

      if (!bill) {
        return res.status(404).json({ message: "Farmer bill not found" });
      }

      // Get farmer details
      const [farmer] = await db
        .select()
        .from(farmers)
        .where(and(eq(farmers.id, farmerId), eq(farmers.tenantId, tenantId)))
        .limit(1);

      // Get tenant details
      const [tenant] = await db
        .select()
        .from(tenants)
        .where(eq(tenants.id, tenantId))
        .limit(1);

      // Get basic lot data without complex joins
      let lotsData = [];
      if (bill.lotIds) {
        try {
          // Handle different lotIds formats
          let lotIds = [];
          if (typeof bill.lotIds === 'string') {
            // Try to parse as JSON, fallback to simple string handling
            if (bill.lotIds.startsWith('[')) {
              lotIds = JSON.parse(bill.lotIds);
            } else if (bill.lotIds.includes(',')) {
              lotIds = bill.lotIds.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
            } else {
              const id = parseInt(bill.lotIds);
              if (!isNaN(id)) lotIds = [id];
            }
          } else if (Array.isArray(bill.lotIds)) {
            lotIds = bill.lotIds;
          }
          
          if (lotIds.length > 0) {
            // Get lots with their bags
            const lotsWithBags = await Promise.all(
              lotIds.map(async (lotId) => {
                const [lot] = await db
                  .select()
                  .from(lots)
                  .where(and(eq(lots.id, lotId), eq(lots.tenantId, tenantId)))
                  .limit(1);
                
                if (lot) {
                  const lotBags = await db
                    .select()
                    .from(bags)
                    .where(and(eq(bags.lotId, lotId), eq(bags.tenantId, tenantId)))
                    .orderBy(bags.bagNumber);
                  
                  return { ...lot, bags: lotBags };
                }
                return null;
              })
            );
            
            lotsData = lotsWithBags.filter(lot => lot !== null);
          }
        } catch (parseError) {
          console.error("Error parsing lot IDs:", parseError);
        }
      }

      res.json({
        pattiNumber: bill.pattiNumber,
        totalAmount: bill.totalAmount,
        netPayable: bill.netPayable,
        hamali: bill.hamali || '0',
        vehicleRent: bill.vehicleRent || '0',
        emptyBagCharges: bill.emptyBagCharges || '0',
        advance: bill.advance || '0',
        rok: bill.rok || '0',
        other: bill.otherCharges || '0',
        totalBags: bill.totalBags || 0,
        totalWeight: bill.totalWeight || '0',
        createdAt: bill.createdAt,
        farmerName: farmer?.name || 'N/A',
        farmerMobile: farmer?.mobile || 'N/A',
        farmerPlace: farmer?.place || 'N/A',
        bankName: farmer?.bankName || 'N/A',
        accountNumber: farmer?.accountNumber || 'N/A',
        tenantName: tenant?.name || 'AGRICULTURAL TRADING COMPANY',
        lots: lotsData
      });
    } catch (error) {
      console.error("Error fetching farmer bill data:", error);
      res.status(500).json({ message: "Failed to fetch farmer bill data" });
    }
  });

  // Check if farmer bill already exists for specific date
  app.get("/api/farmer-bill/:farmerId/check", requireAuth, requireTenant, async (req: any, res) => {
    try {
      const farmerId = parseInt(req.params.farmerId);
      const tenantId = req.user.tenantId;
      const { date } = req.query;

      // Use provided date or default to today for bill checking
      const targetDate = date ? new Date(date as string) : new Date();
      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);

      const existingBill = await db.select()
        .from(farmerBills)
        .where(and(
          eq(farmerBills.farmerId, farmerId), 
          eq(farmerBills.tenantId, tenantId),
          gte(farmerBills.createdAt, startOfDay),
          lte(farmerBills.createdAt, endOfDay)
        ))
        .limit(1);

      res.json({ 
        exists: existingBill.length > 0,
        bill: existingBill[0] || null
      });
    } catch (error) {
      console.error("Error checking farmer bill:", error);
      res.status(500).json({ message: "Failed to check farmer bill" });
    }
  });

  // Generate and save farmer bill (only if not exists for specific date)
  app.post("/api/farmer-bill/:farmerId", requireAuth, requireTenant, async (req: any, res) => {
    try {
      const farmerId = parseInt(req.params.farmerId);
      const tenantId = req.user.tenantId;
      const { pattiNumber, billData, lotIds, billDate } = req.body;

      // Use provided bill date or default to today
      const targetDate = billDate ? new Date(billDate) : new Date();
      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);

      // Check if bill already exists for this farmer on the specified date
      const existingBill = await db.select()
        .from(farmerBills)
        .where(and(
          eq(farmerBills.farmerId, farmerId), 
          eq(farmerBills.tenantId, tenantId),
          gte(farmerBills.createdAt, startOfDay),
          lte(farmerBills.createdAt, endOfDay)
        ))
        .limit(1);

      if (existingBill.length > 0) {
        return res.status(400).json({ 
          message: "Farmer bill already generated for this farmer on this date",
          billId: existingBill[0].id
        });
      }

      // Check if patti number already exists
      const existingPatti = await db.select()
        .from(farmerBills)
        .where(and(eq(farmerBills.pattiNumber, pattiNumber), eq(farmerBills.tenantId, tenantId)))
        .limit(1);

      if (existingPatti.length > 0) {
        return res.status(400).json({ 
          message: "Patti number already exists. Please generate a new one.",
        });
      }

      // Calculate totals from request data
      const totalDeductions = billData.hamali + billData.vehicleRent + billData.emptyBagCharges + 
                             billData.advance + billData.rok + billData.other;

      // Enhanced validation before saving
      if (!pattiNumber || !billData || !lotIds || lotIds.length === 0) {
        return res.status(400).json({ 
          message: "Missing required data: pattiNumber, billData, or lotIds" 
        });
      }

      if (!billData.totalAmount || billData.totalAmount <= 0) {
        return res.status(400).json({ 
          message: "Invalid total amount for bill generation" 
        });
      }

      // Save bill to database with creator tracking
      const savedBill = await db.insert(farmerBills).values({
        pattiNumber: pattiNumber,
        farmerId: farmerId,
        tenantId: tenantId,
        totalAmount: billData.totalAmount.toString(),
        hamali: billData.hamali.toString(),
        vehicleRent: billData.vehicleRent.toString(),
        emptyBagCharges: billData.emptyBagCharges.toString(),
        advance: billData.advance.toString(),
        rok: billData.rok.toString(),
        otherCharges: billData.other.toString(),
        totalDeductions: totalDeductions.toString(),
        netPayable: (billData.totalAmount - totalDeductions).toString(),
        totalBags: billData.totalBags,
        totalWeight: billData.totalWeight.toString(),
        lotIds: JSON.stringify(lotIds),
        createdBy: req.user.id,
      }).returning();

      // Record accounting transactions for farmer bill
      try {
        await recordFarmerBillTransaction(
          savedBill[0].id,
          farmerId,
          parseFloat(totalAmount.toString()),
          parseFloat(billData.rok.toString()),
          tenantId,
          req.user.id
        );
      } catch (accountingError) {
        console.error("Error recording accounting transaction:", accountingError);
        // Continue with response even if accounting fails
      }

      res.json({ 
        message: "Farmer bill generated and saved successfully",
        billId: savedBill[0].id,
        pattiNumber: pattiNumber
      });
    } catch (error) {
      console.error("Error generating farmer bill:", error);
      res.status(500).json({ message: "Failed to generate farmer bill" });
    }
  });

  // Get farmer bill (for viewing previously generated) with enhanced data
  app.get("/api/farmer-bill/:farmerId", requireAuth, requireTenant, async (req: any, res) => {
    try {
      const farmerId = parseInt(req.params.farmerId);
      const tenantId = req.user.tenantId;

      // Get the saved bill with creator information
      const savedBillResult = await db.select({
        id: farmerBills.id,
        pattiNumber: farmerBills.pattiNumber,
        farmerId: farmerBills.farmerId,
        tenantId: farmerBills.tenantId,
        totalAmount: farmerBills.totalAmount,
        hamali: farmerBills.hamali,
        vehicleRent: farmerBills.vehicleRent,
        emptyBagCharges: farmerBills.emptyBagCharges,
        advance: farmerBills.advance,
        commission: farmerBills.commission,
        otherCharges: farmerBills.otherCharges,
        totalDeductions: farmerBills.totalDeductions,
        netPayable: farmerBills.netPayable,
        totalBags: farmerBills.totalBags,
        totalWeight: farmerBills.totalWeight,
        lotIds: farmerBills.lotIds,
        createdAt: farmerBills.createdAt,
        createdBy: farmerBills.createdBy,
        // Join with user to get creator details
        creatorName: users.fullName,
        creatorUsername: users.username
      })
        .from(farmerBills)
        .leftJoin(users, eq(farmerBills.createdBy, users.id))
        .where(and(eq(farmerBills.farmerId, farmerId), eq(farmerBills.tenantId, tenantId)))
        .limit(1);

      if (savedBillResult.length === 0) {
        return res.status(404).json({ message: "No farmer bill found for this farmer" });
      }

      const savedBill = savedBillResult[0];

      // Get associated lots and farmer data for the saved bill
      const lotIds = JSON.parse(savedBill.lotIds || '[]');
      let associatedLots = [];
      
      if (lotIds.length > 0) {
        const lotsData = await db.select({
          lotId: lots.id,
          lotNumber: lots.lotNumber,
          farmerId: lots.farmerId,
          varietyGrade: lots.varietyGrade,
          grade: lots.grade,
          numberOfBags: lots.numberOfBags,
          lotPrice: lots.lotPrice,
          vehicleRent: lots.vehicleRent,
          advance: lots.advance,
          unloadHamali: lots.unloadHamali,
          status: lots.status,
          createdAt: lots.createdAt,
          farmerName: farmers.name,
          farmerMobile: farmers.mobile,
          farmerPlace: farmers.place
        })
          .from(lots)
          .leftJoin(farmers, eq(lots.farmerId, farmers.id))
          .where(and(
            inArray(lots.id, lotIds),
            eq(lots.tenantId, tenantId)
          ));

        associatedLots = lotsData;
      }

      // Get bags data for weight verification
      const bagsData = await db.select()
        .from(bags)
        .where(and(
          inArray(bags.lotId, lotIds),
          eq(bags.tenantId, tenantId)
        ));

      const enrichedBill = {
        ...savedBill,
        associatedLots,
        bagWeights: bagsData,
        metadata: {
          createdBy: savedBill.creatorName || savedBill.creatorUsername || 'Unknown',
          createdAt: savedBill.createdAt,
          totalLots: associatedLots.length,
          dataIntegrity: {
            lotDataAvailable: associatedLots.length === lotIds.length,
            bagDataAvailable: bagsData.length > 0
          }
        }
      };

      res.json(enrichedBill);
    } catch (error) {
      console.error("Error retrieving farmer bill:", error);
      res.status(500).json({ message: "Failed to retrieve farmer bill" });
    }
  });

  // Update farmer bill deductions
  app.patch("/api/farmer-bill/:billId", requireAuth, requireTenant, async (req: any, res) => {
    try {
      const billId = parseInt(req.params.billId);
      const tenantId = req.user.tenantId;
      const { deductions } = req.body;

      // Validate deductions data
      if (!deductions || typeof deductions !== 'object') {
        return res.status(400).json({ message: "Invalid deductions data" });
      }

      const { hamali, vehicleRent, emptyBagCharges, advance, other, rok } = deductions;

      // Validate all deduction amounts are numbers
      const deductionValues = [hamali, vehicleRent, emptyBagCharges, advance, other, rok];
      if (deductionValues.some(val => typeof val !== 'number' || val < 0)) {
        return res.status(400).json({ message: "All deduction amounts must be valid positive numbers" });
      }

      // Get the current bill to calculate new net payable
      const [currentBill] = await db
        .select()
        .from(farmerBills)
        .where(and(eq(farmerBills.id, billId), eq(farmerBills.tenantId, tenantId)))
        .limit(1);

      if (!currentBill) {
        return res.status(404).json({ message: "Farmer bill not found" });
      }

      // Calculate new totals
      const totalDeductions = hamali + vehicleRent + emptyBagCharges + advance + other + rok;
      const totalAmount = parseFloat(currentBill.totalAmount.toString());
      const newNetPayable = totalAmount - totalDeductions;

      // Update the bill with new deductions
      await db
        .update(farmerBills)
        .set({
          hamali: hamali.toString(),
          vehicleRent: vehicleRent.toString(),
          emptyBagCharges: emptyBagCharges.toString(),
          advance: advance.toString(),
          otherCharges: other.toString(),
          rok: rok.toString(),
          totalDeductions: totalDeductions.toString(),
          netPayable: newNetPayable.toString(),
          updatedAt: new Date()
        })
        .where(and(eq(farmerBills.id, billId), eq(farmerBills.tenantId, tenantId)));

      res.json({
        message: "Farmer bill deductions updated successfully",
        billId: billId,
        updatedDeductions: {
          hamali,
          vehicleRent,
          emptyBagCharges,
          advance,
          other: other,
          rok,
          totalDeductions,
          netPayable: newNetPayable
        }
      });
    } catch (error) {
      console.error("Error updating farmer bill deductions:", error);
      res.status(500).json({ message: "Failed to update farmer bill deductions" });
    }
  });

  // Check if tax invoice already exists for buyer on specific date
  app.get("/api/tax-invoice/:buyerId/check", requireAuth, requireTenant, async (req: any, res) => {
    try {
      const buyerId = parseInt(req.params.buyerId);
      const tenantId = req.user.tenantId;
      const { date } = req.query; // Get selected date from query parameter

      let query = db.select()
        .from(taxInvoices)
        .where(and(eq(taxInvoices.buyerId, buyerId), eq(taxInvoices.tenantId, tenantId)));

      // If date is provided, filter by that specific date
      if (date) {
        const targetDate = new Date(date as string);
        const startOfDay = new Date(targetDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(targetDate);
        endOfDay.setHours(23, 59, 59, 999);

        query = query.where(and(
          eq(taxInvoices.buyerId, buyerId),
          eq(taxInvoices.tenantId, tenantId),
          gte(taxInvoices.invoiceDate, startOfDay),
          lte(taxInvoices.invoiceDate, endOfDay)
        ));

        console.log(`Checking for tax invoice on specific date: ${date} for buyer ${buyerId}`);
      } else {
        console.log(`Checking for any tax invoice for buyer ${buyerId} (no date filter)`);
      }

      const existingInvoice = await query.limit(1);

      res.json({ 
        exists: existingInvoice.length > 0,
        invoice: existingInvoice[0] || null
      });
    } catch (error) {
      console.error("Error checking tax invoice:", error);
      res.status(500).json({ message: "Failed to check tax invoice" });
    }
  });

  // Generate and save tax invoice (only if not exists)
  app.post("/api/tax-invoice/:buyerId", requireAuth, requireTenant, async (req: any, res) => {
    try {
      const buyerId = parseInt(req.params.buyerId);
      const tenantId = req.user.tenantId;

      // Get selected date from request body (optional, defaults to today)
      const selectedDate = req.body.selectedDate ? new Date(req.body.selectedDate) : new Date();
      console.log(`Checking for existing invoice on date: ${selectedDate.toISOString().split('T')[0]} for buyer ${buyerId}`);

      // Check if invoice already exists for this specific date
      let existingQuery = db.select()
        .from(taxInvoices)
        .where(and(eq(taxInvoices.buyerId, buyerId), eq(taxInvoices.tenantId, tenantId)));

      // Filter by the specific date
      const startOfDay = new Date(selectedDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(selectedDate);
      endOfDay.setHours(23, 59, 59, 999);

      existingQuery = existingQuery.where(and(
        eq(taxInvoices.buyerId, buyerId),
        eq(taxInvoices.tenantId, tenantId),
        gte(taxInvoices.invoiceDate, startOfDay),
        lte(taxInvoices.invoiceDate, endOfDay)
      ));

      const existingInvoice = await existingQuery.limit(1);

      if (existingInvoice.length > 0) {
        return res.status(400).json({ 
          message: `Tax invoice already generated for this buyer on ${selectedDate.toISOString().split('T')[0]}`,
          invoiceId: existingInvoice[0].id
        });
      }

      console.log(`Generating tax invoice for buyer ${buyerId}, tenant ${tenantId}`);
      try {
        console.log(`Selected date for invoice: ${selectedDate.toISOString().split('T')[0]}`);
        
        const taxInvoice = await generateTaxInvoice(buyerId, tenantId, selectedDate);
        
        console.log("Tax invoice generation result:", taxInvoice ? "Success" : "Failed");
        if (taxInvoice) {
          console.log("Tax invoice details:", {
            invoiceNumber: taxInvoice.invoiceNumber,
            itemsCount: taxInvoice.items.length,
            totalAmount: taxInvoice.calculations.totalAmount
          });
        }
        if (!taxInvoice) {
          return res.status(404).json({ message: "No completed lots found for this buyer" });
        }

      // Enhanced validation before saving
      if (!taxInvoice.invoiceNumber || !taxInvoice.buyer || !taxInvoice.items || taxInvoice.items.length === 0) {
        return res.status(400).json({ 
          message: "Missing required invoice data: invoice number, buyer information, or items" 
        });
      }

      if (!taxInvoice.calculations.totalAmount || taxInvoice.calculations.totalAmount <= 0) {
        return res.status(400).json({ 
          message: "Invalid total amount for invoice generation" 
        });
      }

      // Save invoice to database with creator tracking
      const savedInvoice = await db.insert(taxInvoices).values({
        invoiceNumber: taxInvoice.invoiceNumber,
        buyerId: buyerId,
        tenantId: tenantId,
        basicAmount: taxInvoice.calculations.basicAmount.toString(),
        packaging: taxInvoice.calculations.packaging.toString(),
        hamali: taxInvoice.calculations.hamali.toString(),
        weighingCharges: taxInvoice.calculations.weighingCharges.toString(),
        commission: taxInvoice.calculations.commission.toString(),
        cess: taxInvoice.calculations.cess.toString(),
        sgst: taxInvoice.calculations.sgst.toString(),
        cgst: taxInvoice.calculations.cgst.toString(),
        igst: taxInvoice.calculations.igst.toString(),
        totalGst: taxInvoice.calculations.totalGst.toString(),
        totalAmount: taxInvoice.calculations.totalAmount.toString(),
        totalBags: taxInvoice.items.reduce((sum, item) => sum + item.bags, 0),
        totalWeight: taxInvoice.items.reduce((sum, item) => sum + item.weightKg, 0).toString(),
        lotIds: JSON.stringify(taxInvoice.items.map(item => item.lotNo)),
        invoiceData: JSON.stringify(taxInvoice),
        createdBy: req.user.id,
      }).returning();

      // Record accounting transactions for tax invoice
      try {
        await recordTaxInvoiceTransaction(
          savedInvoice[0].id,
          buyerId,
          taxInvoice.calculations.basicAmount,
          taxInvoice.calculations.packaging + taxInvoice.calculations.hamali + 
          taxInvoice.calculations.weighingCharges + taxInvoice.calculations.commission,
          taxInvoice.calculations.totalAmount,
          tenantId,
          req.user.id
        );
      } catch (accountingError) {
        console.error("Error recording accounting transaction:", accountingError);
        // Continue with response even if accounting fails
      }

      // Update lot billGenerated status for all lots in this invoice
      const lotNumbers = taxInvoice.items.map(item => item.lotNo);
      console.log("Updating billGenerated status for lots:", lotNumbers);
      
      try {
        // Update each lot individually to ensure proper SQL syntax
        for (const lotNumber of lotNumbers) {
          await db
            .update(lots)
            .set({
              billGenerated: true,
              billGeneratedAt: new Date(),
              amountDue: (taxInvoice.calculations.totalAmount / taxInvoice.items.length).toString(), // Split total amount across lots
            })
            .where(
              and(
                eq(lots.buyerId, buyerId),
                eq(lots.tenantId, tenantId),
                eq(lots.lotNumber, lotNumber)
              )
            );
        }
        
        console.log("Successfully updated billGenerated status for lots");
      } catch (error) {
        console.error("Error updating lot billGenerated status:", error);
        // Continue with response even if this update fails
      }

      res.json({ 
        message: "Tax invoice generated and saved successfully",
        invoiceId: savedInvoice[0].id,
        invoice: taxInvoice
      });
      } catch (error) {
        console.error("Error in tax invoice generation process:", error);
        res.status(500).json({ message: "Failed to generate tax invoice", error: error.message });
      }
    } catch (error) {
      console.error("Error generating tax invoice:", error);
      res.status(500).json({ message: "Failed to generate tax invoice" });
    }
  });

  // Get tax invoice (for viewing previously generated)
  app.get("/api/tax-invoice/:buyerId", requireAuth, requireTenant, async (req: any, res) => {
    try {
      const buyerId = parseInt(req.params.buyerId);
      const tenantId = req.user.tenantId;
      const { date } = req.query; // Get selected date from query parameter

      let query = db.select()
        .from(taxInvoices)
        .where(and(eq(taxInvoices.buyerId, buyerId), eq(taxInvoices.tenantId, tenantId)));

      // If date is provided, filter by that specific date
      if (date) {
        const targetDate = new Date(date as string);
        const startOfDay = new Date(targetDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(targetDate);
        endOfDay.setHours(23, 59, 59, 999);

        query = query.where(and(
          eq(taxInvoices.buyerId, buyerId),
          eq(taxInvoices.tenantId, tenantId),
          gte(taxInvoices.invoiceDate, startOfDay),
          lte(taxInvoices.invoiceDate, endOfDay)
        ));

        console.log(`Fetching tax invoice for specific date: ${date} for buyer ${buyerId}`);
      } else {
        console.log(`Fetching latest tax invoice for buyer ${buyerId} (no date filter)`);
      }

      const savedInvoice = await query.orderBy(desc(taxInvoices.createdAt)).limit(1);

      if (savedInvoice.length === 0) {
        return res.status(404).json({ message: "No tax invoice found for this buyer" });
      }

      res.json(savedInvoice[0].invoiceData);
    } catch (error) {
      console.error("Error retrieving tax invoice:", error);
      res.status(500).json({ message: "Failed to retrieve tax invoice" });
    }
  });

  // Get tax invoice details by invoice ID for download/view  
  app.get("/api/tax-invoice-data/:invoiceId", requireAuth, requireTenant, async (req: any, res) => {
    try {
      const invoiceId = parseInt(req.params.invoiceId);
      const tenantId = req.user.tenantId;

      // Find the tax invoice record
      const [invoice] = await db
        .select()
        .from(taxInvoices)
        .where(and(eq(taxInvoices.id, invoiceId), eq(taxInvoices.tenantId, tenantId)))
        .limit(1);

      if (!invoice) {
        return res.status(404).json({ message: "Tax invoice not found" });
      }

      // Parse the invoice data and return
      const invoiceData = typeof invoice.invoiceData === 'string' 
        ? JSON.parse(invoice.invoiceData) 
        : invoice.invoiceData;

      res.json(invoiceData);
    } catch (error) {
      console.error("Error fetching tax invoice data:", error);
      res.status(500).json({ message: "Failed to fetch tax invoice data" });
    }
  });

  // Get all tax invoices for a buyer with date range filtering
  app.get("/api/tax-invoices/:buyerId", requireAuth, requireTenant, async (req: any, res) => {
    try {
      const buyerId = parseInt(req.params.buyerId);
      const tenantId = req.user.tenantId;
      const { startDate, endDate } = req.query;

      let query = db.select()
        .from(taxInvoices)
        .where(and(eq(taxInvoices.buyerId, buyerId), eq(taxInvoices.tenantId, tenantId)));

      // Add date filtering if provided
      if (startDate && endDate) {
        const start = new Date(startDate as string);
        start.setHours(0, 0, 0, 0);
        const end = new Date(endDate as string);
        end.setHours(23, 59, 59, 999);
        
        query = query.where(and(
          eq(taxInvoices.buyerId, buyerId),
          eq(taxInvoices.tenantId, tenantId),
          gte(taxInvoices.invoiceDate, start),
          lte(taxInvoices.invoiceDate, end)
        ));
      }

      const invoices = await query.orderBy(desc(taxInvoices.invoiceDate));
      res.json(invoices);
    } catch (error) {
      console.error("Error retrieving tax invoices:", error);
      res.status(500).json({ message: "Failed to retrieve tax invoices" });
    }
  });

  // Get farmer's outstanding balance for payment calculation
  app.get("/api/accounting/farmer-balance/:farmerId", requireAuth, requireTenant, async (req: any, res) => {
    try {
      const farmerId = parseInt(req.params.farmerId);
      const tenantId = req.user.tenantId;

      // Calculate total amount earned by farmer from all farmer bills
      const farmerBillsResult = await db.select({
        totalEarned: sql<number>`COALESCE(SUM(CAST(${farmerBills.billData}->'netAmount' AS DECIMAL)), 0)`
      })
      .from(farmerBills)
      .where(and(eq(farmerBills.farmerId, farmerId), eq(farmerBills.tenantId, tenantId)));

      const totalEarned = farmerBillsResult[0]?.totalEarned || 0;

      // Calculate total amount paid to farmer from accounting ledger
      const paymentsResult = await db.select({
        totalPaid: sql<number>`COALESCE(SUM(${accountingLedger.amount}), 0)`
      })
      .from(accountingLedger)
      .where(and(
        eq(accountingLedger.tenantId, tenantId),
        eq(accountingLedger.transactionType, 'payment_made'),
        sql`${accountingLedger.description} LIKE '%Farmer ID: ${farmerId}%'`
      ));

      const totalPaid = paymentsResult[0]?.totalPaid || 0;

      // Calculate outstanding balance (what farmer should receive minus what was already paid)
      const outstandingBalance = Math.max(0, totalEarned - totalPaid);

      res.json({
        farmerId,
        totalEarned,
        totalPaid,
        outstandingBalance
      });
    } catch (error) {
      console.error("Error calculating farmer balance:", error);
      res.status(500).json({ message: "Failed to calculate farmer balance" });
    }
  });

  // Get all farmer bills for a farmer with date range filtering  
  app.get("/api/farmer-bills/:farmerId", requireAuth, requireTenant, async (req: any, res) => {
    try {
      const farmerId = parseInt(req.params.farmerId);
      const tenantId = req.user.tenantId;
      const { startDate, endDate } = req.query;

      let query = db.select()
        .from(farmerBills)
        .where(and(eq(farmerBills.farmerId, farmerId), eq(farmerBills.tenantId, tenantId)));

      // Add date filtering if provided
      if (startDate && endDate) {
        const start = new Date(startDate as string);
        start.setHours(0, 0, 0, 0);
        const end = new Date(endDate as string);
        end.setHours(23, 59, 59, 999);
        
        query = query.where(and(
          eq(farmerBills.farmerId, farmerId),
          eq(farmerBills.tenantId, tenantId),
          gte(farmerBills.createdAt, start),
          lte(farmerBills.createdAt, end)
        ));
      }

      const bills = await query.orderBy(desc(farmerBills.createdAt));
      res.json(bills);
    } catch (error) {
      console.error("Error retrieving farmer bills:", error);
      res.status(500).json({ message: "Failed to retrieve farmer bills" });
    }
  });

  // Buyer billing routes
  app.get(
    "/api/billing/buyer/:buyerId/:date",
    requireAuth,
    requireTenant,
    async (req, res) => {
      try {
        const buyerId = parseInt(req.params.buyerId);
        const date = new Date(req.params.date);

        if (isNaN(buyerId) || isNaN(date.getTime())) {
          return res.status(400).json({ message: "Invalid buyer ID or date" });
        }

        const bill = await generateBuyerDayBill(
          buyerId,
          date,
          req.user.tenantId,
        );

        if (!bill) {
          return res
            .status(404)
            .json({
              message: "No completed lots found for buyer on this date",
            });
        }

        res.json(bill);
      } catch (error) {
        res.status(500).json({ message: "Failed to generate buyer bill" });
      }
    },
  );

  app.get(
    "/api/billing/buyers/daily/:date",
    requireAuth,
    requireTenant,
    async (req, res) => {
      try {
        const date = new Date(req.params.date);

        if (isNaN(date.getTime())) {
          return res.status(400).json({ message: "Invalid date" });
        }

        const bills = await getBuyerDayBills(date, req.user.tenantId);
        res.json(bills);
      } catch (error) {
        res.status(500).json({ message: "Failed to fetch buyer daily bills" });
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
      const { search, date } = req.query;
      const lots = await storage.getLotsByTenant(
        req.user.tenantId,
        search as string,
        date as string,
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
      console.log("Lot creation request body:", req.body); // Debug log
      
      // Generate daily lot number (starts from 1 each day)
      const today = new Date();
      const startOfDay = new Date(today);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(today);
      endOfDay.setHours(23, 59, 59, 999);
      
      // Get today's lots for this tenant
      const todaysLots = await db.select()
        .from(lots)
        .where(and(
          eq(lots.tenantId, req.user.tenantId),
          gte(lots.createdAt, startOfDay),
          lte(lots.createdAt, endOfDay)
        ));
        
      const dailySequence = todaysLots.length + 1;
      const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
      const lotNumber = `LOT${dateStr}-${String(dailySequence).padStart(3, "0")}`;

      const validatedData = insertLotSchema.parse({
        ...req.body,
        lotNumber,
        tenantId: req.user.tenantId,
      });

      console.log("Validated lot data:", validatedData); // Debug log

      const lot = await storage.createLot(validatedData);
      await createAuditLog(req, "create", "lot", lot.id, null, lot);

      res.status(201).json(lot);
    } catch (error) {
      console.error("Lot creation backend error:", error); // Debug log
      if (error instanceof z.ZodError) {
        console.error("Validation errors:", error.errors); // Debug log
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
    "/api/bags",
    requireAuth,
    requireTenant,
    async (req, res) => {
      try {
        // Get all bags for the tenant by fetching all lots first
        const lots = await storage.getAllLotsByTenant(req.user.tenantId);
        const allBags = [];
        
        for (const lot of lots) {
          const bags = await storage.getBagsByLot(lot.id, req.user.tenantId);
          allBags.push(...bags);
        }
        
        res.json(allBags);
      } catch (error) {
        console.error("Error fetching all bags:", error);
        res.status(500).json({ message: "Failed to fetch bags" });
      }
    },
  );

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
      console.log(`Fetching buyers for tenant: ${req.user.tenantId}`);
      const buyers = await storage.getBuyersByTenant(req.user.tenantId);
      console.log(`Found ${buyers.length} buyers:`, buyers.map(b => ({ id: b.id, name: b.name })));
      res.json(buyers);
    } catch (error) {
      console.error("Error fetching buyers:", error);
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

  // Buyer summary route with purchase statistics
  app.get("/api/buyers/summary", requireAuth, requireTenant, async (req, res) => {
    try {
      const search = req.query.search as string || '';
      const buyers = await storage.getBuyersByTenant(req.user.tenantId, search);
      
      // Get purchase statistics for each buyer
      const buyerSummaries = await Promise.all(buyers.map(async (buyer) => {
        const stats = await storage.getBuyerPurchaseStats(buyer.id, req.user.tenantId);
        return {
          ...buyer,
          ...stats
        };
      }));

      res.json(buyerSummaries);
    } catch (error) {
      console.error("Error fetching buyer summaries:", error);
      res.status(500).json({ message: "Failed to fetch buyer summaries" });
    }
  });

  // Buyer purchase history route
  app.get("/api/buyers/:id/purchases", requireAuth, requireTenant, async (req: any, res) => {
    console.log('Buyer purchase route hit:', req.params.id);
    try {
      const buyerId = parseInt(req.params.id);
      if (isNaN(buyerId)) {
        console.log("Invalid buyer ID:", req.params.id);
        return res.status(400).json({ message: "Invalid buyer ID" });
      }
      
      console.log(`User:`, req.user);
      console.log(`Fetching purchase history for buyer ${buyerId}, tenant ${req.user.tenantId}`);
      
      const purchases = await storage.getBuyerPurchaseHistory(buyerId, req.user.tenantId);
      console.log(`Found ${purchases.length} purchases for buyer ${buyerId}`);
      
      // Debug: Log the first purchase to see actual amount calculation
      if (purchases.length > 0) {
        console.log('First purchase debug:', {
          lotNumber: purchases[0].lotNumber,
          amountDue: purchases[0].amountDue,
          amountPaid: purchases[0].amountPaid
        });
      }
      
      res.json(purchases);
    } catch (error) {
      console.error("Error fetching buyer purchases:", error);
      res.status(500).json({ message: "Failed to fetch buyer purchases", error: error.message });
    }
  });

  // Update lot payment status
  app.patch("/api/lots/:id/payment", requireAuth, requireTenant, async (req, res) => {
    try {
      const lotId = parseInt(req.params.id);
      const { paymentStatus, amountPaid, paymentDate } = req.body;
      
      await storage.updateLotPayment(lotId, req.user.tenantId, {
        paymentStatus,
        amountPaid: amountPaid ? parseFloat(amountPaid) : null,
        paymentDate: paymentDate || null
      });

      res.json({ message: "Payment status updated successfully" });
    } catch (error) {
      console.error("Error updating payment:", error);
      res.status(500).json({ message: "Failed to update payment" });
    }
  });

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
      if (!tenantData.name || !tenantData.apmcCode || !tenantData.place || !tenantData.mobileNumber || !tenantData.panNumber) {
        return res.status(400).json({ message: "Missing required tenant fields (name, APMC code, place, mobile number, and PAN card number are required)" });
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
        gstNumber: tenantData.gstNumber || null,
        fssaiNumber: tenantData.fssaiNumber || null,
        panNumber: tenantData.panNumber,
        address: tenantData.address || "",
        bankName: tenantData.bankName || null,
        bankAccountNumber: tenantData.bankAccountNumber || null,
        ifscCode: tenantData.ifscCode || null,
        accountHolderName: tenantData.accountHolderName || null,
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

  // Buyer billing route without date parameter (uses today)
  app.get(
    "/api/billing/buyers/daily",
    requireAuth,
    requireTenant,
    async (req: any, res) => {
      try {
        const date = new Date(); // Use today's date
        const bills = await getBuyerDayBills(date, req.user.tenantId);
        res.json(bills);
      } catch (error) {
        console.error("Error fetching buyer daily bills:", error);
        res.status(500).json({ message: "Failed to fetch buyer daily bills" });
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

  // Settings API endpoints
  app.get('/api/settings', requireAuth, requireTenant, async (req: any, res) => {
    try {
      const tenant = await storage.getTenant(req.user.tenantId);
      if (!tenant) {
        return res.status(404).json({ message: "Tenant not found" });
      }

      // Return default settings if not set
      const defaultSettings = {
        gstSettings: {
          sgst: 9,
          cgst: 9,
          cess: 0.6,
          unloadHamali: 3,
        },
        maxUsers: tenant.maxUsers || 1,
        subscriptionPlan: tenant.subscriptionPlan || "basic",
      };

      // Merge with existing settings
      const settings = {
        ...defaultSettings,
        ...(tenant.settings || {}),
        maxUsers: tenant.maxUsers,
        subscriptionPlan: tenant.subscriptionPlan,
      };

      res.json(settings);
    } catch (error) {
      console.error("Error fetching settings:", error);
      res.status(500).json({ message: "Failed to fetch settings" });
    }
  });

  app.put('/api/settings', requireAuth, requireTenant, async (req: any, res) => {
    try {
      const { gstSettings, maxUsers, subscriptionPlan, ...otherSettings } = req.body;
      
      const tenant = await storage.getTenant(req.user.tenantId);
      if (!tenant) {
        return res.status(404).json({ message: "Tenant not found" });
      }

      // Get current settings or use defaults
      const currentSettings = tenant.settings || {};
      
      // Update settings
      const updatedSettings = {
        ...currentSettings,
        ...otherSettings,
      };

      // Update GST settings if provided
      if (gstSettings) {
        updatedSettings.gstSettings = {
          ...(currentSettings.gstSettings || {}),
          ...gstSettings,
        };
      }

      // Prepare tenant update data
      const tenantUpdateData: any = {
        settings: updatedSettings,
      };

      // Update maxUsers and subscriptionPlan if provided
      if (maxUsers !== undefined) {
        tenantUpdateData.maxUsers = maxUsers;
      }
      if (subscriptionPlan !== undefined) {
        tenantUpdateData.subscriptionPlan = subscriptionPlan;
      }

      // Update tenant
      await storage.updateTenant(req.user.tenantId, tenantUpdateData);
      
      await createAuditLog(req.user.id, "UPDATE", "SETTINGS", "Updated tenant settings", req.user.tenantId);

      res.json({ message: "Settings updated successfully" });
    } catch (error) {
      console.error("Error updating settings:", error);
      res.status(500).json({ message: "Failed to update settings" });
    }
  });

  // Payment status update for buyer purchases  
  app.patch('/api/lots/:lotId/payment', requireAuth, requireTenant, async (req, res) => {
    try {
      const lotId = parseInt(req.params.lotId);
      const tenantId = req.user?.tenantId!;
      const { paymentStatus, amountPaid, paymentDate } = req.body;

      await db
        .update(lots)
        .set({
          paymentStatus,
          amountPaid: amountPaid?.toString(),
          paymentDate: paymentDate ? new Date(paymentDate) : null,
        })
        .where(
          and(
            eq(lots.id, lotId),
            eq(lots.tenantId, tenantId)
          )
        );

      res.json({ success: true });
    } catch (error) {
      console.error('Error updating payment status:', error);
      res.status(500).json({ message: 'Failed to update payment status' });
    }
  });

  // REMOVED DUPLICATE - keeping the endpoint above

  // Mark tax invoice as generated and calculate amount due
  app.patch('/api/tax-invoice/:buyerId/mark-generated', requireAuth, requireTenant, async (req, res) => {
    try {
      const buyerId = parseInt(req.params.buyerId);
      const tenantId = req.user?.tenantId!;
      const { totalAmount } = req.body;

      // Mark all completed lots for this buyer as bill generated and set amount due
      await db
        .update(lots)
        .set({
          billGenerated: true,
          billGeneratedAt: new Date(),
          amountDue: totalAmount?.toString(),
          paymentStatus: 'pending',
        })
        .where(
          and(
            eq(lots.buyerId, buyerId),
            eq(lots.tenantId, tenantId),
            eq(lots.status, 'completed'),
            eq(lots.billGenerated, false)
          )
        );

      res.json({ success: true });
    } catch (error) {
      console.error('Error marking bills as generated:', error);
      res.status(500).json({ message: 'Failed to mark bills as generated' });
    }
  });

  // Tax Reports endpoints
  app.get("/api/reports/tax", requireAuth, requireTenant, async (req: any, res) => {
    try {
      const tenantId = req.user.tenantId;
      const { 
        reportType = 'daily', 
        startDate, 
        endDate,
        customStartDate,
        customEndDate 
      } = req.query;

      let dateRange;
      
      if (reportType === 'custom' && customStartDate && customEndDate) {
        dateRange = {
          startDate: new Date(customStartDate as string),
          endDate: new Date(customEndDate as string)
        };
      } else {
        const baseDate = startDate ? new Date(startDate as string) : new Date();
        dateRange = getDateRange(reportType as any, baseDate);
      }

      const report = await generateTaxReport(
        tenantId,
        dateRange.startDate,
        dateRange.endDate,
        reportType as any
      );

      res.json(report);
    } catch (error) {
      console.error('Error generating tax report:', error);
      res.status(500).json({ message: 'Failed to generate tax report' });
    }
  });

  // CESS Reports endpoint
  app.get("/api/reports/cess", requireAuth, requireTenant, async (req: any, res) => {
    try {
      const tenantId = req.user.tenantId;
      const { 
        reportType = 'daily', 
        startDate, 
        endDate,
        customStartDate,
        customEndDate 
      } = req.query;

      let dateRange;
      
      if (reportType === 'custom' && customStartDate && customEndDate) {
        dateRange = {
          startDate: new Date(customStartDate as string),
          endDate: new Date(customEndDate as string)
        };
      } else {
        const baseDate = startDate ? new Date(startDate as string) : new Date();
        dateRange = getDateRange(reportType as any, baseDate);
      }

      const report = await generateCessReport(
        tenantId,
        dateRange.startDate,
        dateRange.endDate,
        reportType as any
      );

      res.json(report);
    } catch (error) {
      console.error('Error generating CESS report:', error);
      res.status(500).json({ message: 'Failed to generate CESS report' });
    }
  });

  // GST Reports endpoint
  app.get("/api/reports/gst", requireAuth, requireTenant, async (req: any, res) => {
    try {
      const tenantId = req.user.tenantId;
      const { 
        reportType = 'daily', 
        startDate, 
        endDate,
        customStartDate,
        customEndDate 
      } = req.query;

      let dateRange;
      
      if (reportType === 'custom' && customStartDate && customEndDate) {
        dateRange = {
          startDate: new Date(customStartDate as string),
          endDate: new Date(customEndDate as string)
        };
      } else {
        const baseDate = startDate ? new Date(startDate as string) : new Date();
        dateRange = getDateRange(reportType as any, baseDate);
      }

      const report = await generateGstReport(
        tenantId,
        dateRange.startDate,
        dateRange.endDate,
        reportType as any
      );

      res.json(report);
    } catch (error) {
      console.error('Error generating GST report:', error);
      res.status(500).json({ message: 'Failed to generate GST report' });
    }
  });

  // =================================
  // FINAL ACCOUNTS & ACCOUNTING SYSTEM API ENDPOINTS
  // =================================

  // Get current fiscal year
  app.get("/api/accounting/fiscal-year", requireAuth, requireTenant, async (req, res) => {
    try {
      const currentFiscalYear = getCurrentFiscalYear();
      res.json({ fiscalYear: currentFiscalYear });
    } catch (error) {
      console.error('Error getting fiscal year:', error);
      res.status(500).json({ message: 'Failed to get fiscal year' });
    }
  });

  // Generate Profit & Loss Report
  app.get("/api/accounting/profit-loss", requireAuth, requireTenant, async (req: any, res) => {
    try {
      const tenantId = req.user.tenantId;
      const { fiscalYear } = req.query;
      
      const report = await generateProfitLossReport(tenantId, fiscalYear);
      res.json(report);
    } catch (error) {
      console.error('Error generating P&L report:', error);
      res.status(500).json({ message: 'Failed to generate profit & loss report' });
    }
  });

  // Generate Balance Sheet
  app.get("/api/accounting/balance-sheet", requireAuth, requireTenant, async (req: any, res) => {
    try {
      const tenantId = req.user.tenantId;
      const { fiscalYear } = req.query;
      
      const report = await generateBalanceSheet(tenantId, fiscalYear);
      res.json(report);
    } catch (error) {
      console.error('Error generating balance sheet:', error);
      res.status(500).json({ message: 'Failed to generate balance sheet' });
    }
  });

  // Generate Cash Flow Report
  app.get("/api/accounting/cash-flow", requireAuth, requireTenant, async (req: any, res) => {
    try {
      const tenantId = req.user.tenantId;
      const { fiscalYear } = req.query;
      
      const report = await generateCashFlowReport(tenantId, fiscalYear);
      res.json(report);
    } catch (error) {
      console.error('Error generating cash flow report:', error);
      res.status(500).json({ message: 'Failed to generate cash flow report' });
    }
  });



  // Profitability Analysis by Farmer
  app.get("/api/accounting/profitability/farmers", requireAuth, requireTenant, async (req: any, res) => {
    try {
      const tenantId = req.user.tenantId;
      const { fiscalYear, startDate, endDate } = req.query;
      
      console.log('🔍 Farmer Profitability API called with:', { fiscalYear, startDate, endDate, tenantId });
      
      const analysis = await analyzeProfitabilityByFarmer(tenantId, fiscalYear, startDate, endDate);
      res.json(analysis);
    } catch (error) {
      console.error('Error analyzing farmer profitability:', error);
      res.status(500).json({ message: 'Failed to analyze farmer profitability' });
    }
  });

  // Profitability Analysis by Buyer
  app.get("/api/accounting/profitability/buyers", requireAuth, requireTenant, async (req: any, res) => {
    try {
      const tenantId = req.user.tenantId;
      const { fiscalYear, startDate, endDate } = req.query;
      
      console.log('🔍 Buyer Profitability API called with:', { fiscalYear, startDate, endDate, tenantId });
      
      const analysis = await analyzeProfitabilityByBuyer(tenantId, fiscalYear, startDate, endDate);
      res.json(analysis);
    } catch (error) {
      console.error('Error analyzing buyer profitability:', error);
      res.status(500).json({ message: 'Failed to analyze buyer profitability' });
    }
  });

  // GST Liability Calculation
  app.get("/api/accounting/gst-liability", requireAuth, requireTenant, async (req: any, res) => {
    try {
      const tenantId = req.user.tenantId;
      const { fiscalYear, startDate, endDate } = req.query;
      
      console.log('🔍 GST Liability API called with:', { fiscalYear, startDate, endDate, tenantId });
      
      const liability = await calculateGSTLiability(tenantId, fiscalYear, startDate, endDate);
      res.json(liability);
    } catch (error) {
      console.error('Error calculating GST liability:', error);
      res.status(500).json({ message: 'Failed to calculate GST liability' });
    }
  });

  // Record Payment Received from Buyer
  app.post("/api/accounting/payment-received", requireAuth, requireTenant, async (req: any, res) => {
    try {
      const tenantId = req.user.tenantId;
      const userId = req.user.id;
      const { buyerId, amount, paymentMethod, referenceNumber } = req.body;
      
      await recordPaymentReceived(
        parseInt(buyerId),
        parseFloat(amount),
        paymentMethod,
        referenceNumber,
        tenantId,
        userId
      );
      
      await createAuditLog(req, "payment_received", "buyer", parseInt(buyerId), null, req.body);
      res.json({ message: "Payment received recorded successfully" });
    } catch (error) {
      console.error('Error recording payment received:', error);
      res.status(500).json({ message: 'Failed to record payment received' });
    }
  });

  // Record Payment Made to Farmer
  app.post("/api/accounting/payment-made", requireAuth, requireTenant, async (req: any, res) => {
    try {
      const tenantId = req.user.tenantId;
      const userId = req.user.id;
      const { farmerId, amount, paymentMethod, referenceNumber } = req.body;
      
      await recordPaymentMade(
        parseInt(farmerId),
        parseFloat(amount),
        paymentMethod,
        referenceNumber,
        tenantId,
        userId
      );
      
      await createAuditLog(req, "payment_made", "farmer", parseInt(farmerId), null, req.body);
      res.json({ message: "Payment made recorded successfully" });
    } catch (error) {
      console.error('Error recording payment made:', error);
      res.status(500).json({ message: 'Failed to record payment made' });
    }
  });





  // Add expense category
  app.post("/api/accounting/expense-categories", requireAuth, requireTenant, async (req: any, res) => {
    try {
      const tenantId = req.user.tenantId;
      const { name, description } = req.body;
      
      const category = await db.insert(expenseCategories).values({
        tenantId,
        name,
        description,
      }).returning();

      await createAuditLog(req, "create", "expense_category", category[0].id, null, category[0]);
      res.status(201).json(category[0]);
    } catch (error) {
      console.error('Error creating expense category:', error);
      res.status(500).json({ message: 'Failed to create expense category' });
    }
  });

  // Get expense categories
  app.get("/api/accounting/expense-categories", requireAuth, requireTenant, async (req: any, res) => {
    try {
      const tenantId = req.user.tenantId;
      
      const categories = await db
        .select()
        .from(expenseCategories)
        .where(eq(expenseCategories.tenantId, tenantId))
        .orderBy(expenseCategories.name);

      res.json(categories);
    } catch (error) {
      console.error('Error fetching expense categories:', error);
      res.status(500).json({ message: 'Failed to fetch expense categories' });
    }
  });

  // Add expense
  app.post("/api/accounting/expenses", requireAuth, requireTenant, async (req: any, res) => {
    try {
      const tenantId = req.user.tenantId;
      const userId = req.user.id;
      const { categoryId, amount, description, expenseDate, paymentMethod, receiptNumber } = req.body;
      
      const expense = await db.insert(expenses).values({
        tenantId,
        categoryId: parseInt(categoryId),
        amount: amount.toString(),
        description,
        expenseDate: expenseDate ? new Date(expenseDate) : new Date(),
        paymentMethod,
        receiptNumber,
        createdBy: userId,
      }).returning();

      // Record in accounting ledger
      await db.insert(accountingLedger).values({
        tenantId,
        transactionType: 'expense',
        entityType: 'expense',
        entityId: expense[0].id,
        referenceType: 'manual_entry',
        referenceId: expense[0].id,
        debitAmount: parseFloat(amount),
        creditAmount: 0,
        description: description || 'Business expense',
        accountHead: 'expenses',
        createdBy: userId,
        transactionDate: expense[0].expenseDate,
        fiscalYear: getCurrentFiscalYear(),
      });

      await createAuditLog(req, "create", "expense", expense[0].id, null, expense[0]);
      res.status(201).json(expense[0]);
    } catch (error) {
      console.error('Error creating expense:', error);
      res.status(500).json({ message: 'Failed to create expense' });
    }
  });

  // Get expenses
  app.get("/api/accounting/expenses", requireAuth, requireTenant, async (req: any, res) => {
    try {
      const tenantId = req.user.tenantId;
      const { limit = 50, categoryId } = req.query;
      
      let query = db
        .select({
          id: expenses.id,
          categoryId: expenses.categoryId,
          categoryName: expenseCategories.name,
          amount: expenses.amount,
          description: expenses.description,
          expenseDate: expenses.expenseDate,
          paymentMethod: expenses.paymentMethod,
          receiptNumber: expenses.receiptNumber,
          createdAt: expenses.createdAt,
        })
        .from(expenses)
        .leftJoin(expenseCategories, eq(expenses.categoryId, expenseCategories.id))
        .where(eq(expenses.tenantId, tenantId))
        .orderBy(desc(expenses.expenseDate))
        .limit(parseInt(limit as string));

      if (categoryId) {
        query = query.where(and(
          eq(expenses.tenantId, tenantId),
          eq(expenses.categoryId, parseInt(categoryId as string))
        ));
      }

      const expensesList = await query;
      res.json(expensesList);
    } catch (error) {
      console.error('Error fetching expenses:', error);
      res.status(500).json({ message: 'Failed to fetch expenses' });
    }
  });

  // =================================
  // BUYER-SIDE INVENTORY & OCR SYSTEM API ENDPOINTS  
  // =================================

  // Missing Bags Detection endpoint - with date filtering
  app.get('/api/missing-bags', requireAuth, requireTenant, async (req: any, res) => {
    try {
      const tenantId = req.user.tenantId;
      const { date } = req.query;
      
      // Get target date range (default to today if no date provided)
      const targetDate = date ? new Date(date) : new Date();
      const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
      const endOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate() + 1);

      // Get all lots for the target date
      const dateLots = await db
        .select({
          id: lots.id,
          lotNumber: lots.lotNumber,
          farmerId: lots.farmerId,
          numberOfBags: lots.numberOfBags,
          farmerName: farmers.name,
          createdAt: lots.createdAt,
          status: lots.status
        })
        .from(lots)
        .leftJoin(farmers, eq(lots.farmerId, farmers.id))
        .where(
          and(
            eq(lots.tenantId, tenantId),
            gte(lots.createdAt, startOfDay),
            lte(lots.createdAt, endOfDay)
          )
        )
        .orderBy(lots.createdAt);

      // For each lot, check for missing bags
      const missingBagsReport = [];

      for (const lot of dateLots) {
        // Get all bags for this lot
        const lotBags = await db
          .select({
            bagNumber: bags.bagNumber,
            weight: bags.weight
          })
          .from(bags)
          .where(eq(bags.lotId, lot.id))
          .orderBy(bags.bagNumber);

        // Find missing bag numbers
        const expectedBags = Array.from({ length: lot.numberOfBags }, (_, i) => i + 1);
        const existingBagNumbers = lotBags.map(bag => bag.bagNumber);
        const missingBagNumbers = expectedBags.filter(bagNum => !existingBagNumbers.includes(bagNum));
        
        // Find empty weight bags (bags without weight entry)
        const emptyWeightBags = lotBags
          .filter(bag => !bag.weight || bag.weight === null || bag.weight === '0')
          .map(bag => bag.bagNumber);

        if (missingBagNumbers.length > 0 || emptyWeightBags.length > 0) {
          missingBagsReport.push({
            lotId: lot.id,
            lotNumber: lot.lotNumber,
            farmerId: lot.farmerId,
            farmerName: lot.farmerName,
            totalBags: lot.numberOfBags,
            enteredBags: existingBagNumbers.length,
            missingBagNumbers,
            emptyWeightBags,
            missingCount: missingBagNumbers.length,
            emptyWeightCount: emptyWeightBags.length,
            completionPercentage: Math.round((existingBagNumbers.length / lot.numberOfBags) * 100),
            status: lot.status,
            createdAt: lot.createdAt
          });
        }
      }

      // Summary statistics
      const summary = {
        totalLotsForDate: dateLots.length,
        lotsWithMissingBags: missingBagsReport.length,
        lotsComplete: dateLots.length - missingBagsReport.length,
        totalMissingBags: missingBagsReport.reduce((sum, lot) => sum + lot.missingCount, 0),
        totalEmptyWeightBags: missingBagsReport.reduce((sum, lot) => sum + lot.emptyWeightCount, 0),
        date: targetDate.toISOString().split('T')[0]
      };

      res.json({
        summary,
        missingBagsDetails: missingBagsReport,
        dateLots: dateLots.map(lot => ({
          ...lot,
          isComplete: !missingBagsReport.find(missing => missing.lotId === lot.id)
        }))
      });

    } catch (error) {
      console.error('Missing bags detection error:', error);
      res.status(500).json({ error: 'Failed to detect missing bags' });
    }
  });

  // Missing Bags Detection endpoint - Today's lots only (backward compatibility)
  app.get('/api/missing-bags/today', requireAuth, requireTenant, async (req: any, res) => {
    try {
      const tenantId = req.user.tenantId;
      
      // Get today's date range
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

      // Get all lots created today
      const todaysLots = await db
        .select({
          id: lots.id,
          lotNumber: lots.lotNumber,
          farmerId: lots.farmerId,
          numberOfBags: lots.numberOfBags,
          farmerName: farmers.name,
          createdAt: lots.createdAt,
          status: lots.status
        })
        .from(lots)
        .leftJoin(farmers, eq(lots.farmerId, farmers.id))
        .where(
          and(
            eq(lots.tenantId, tenantId),
            gte(lots.createdAt, startOfDay),
            lte(lots.createdAt, endOfDay)
          )
        )
        .orderBy(lots.createdAt);

      // For each lot, check for missing bags
      const missingBagsReport = [];

      for (const lot of todaysLots) {
        // Get all bags for this lot
        const lotBags = await db
          .select({
            bagNumber: bags.bagNumber,
            weight: bags.weight
          })
          .from(bags)
          .where(eq(bags.lotId, lot.id))
          .orderBy(bags.bagNumber);

        // Find missing bag numbers
        const expectedBags = Array.from({ length: lot.numberOfBags }, (_, i) => i + 1);
        const existingBagNumbers = lotBags.map(bag => bag.bagNumber);
        const missingBagNumbers = expectedBags.filter(bagNum => !existingBagNumbers.includes(bagNum));
        
        // Find empty weight bags (bags without weight entry)
        const emptyWeightBags = lotBags
          .filter(bag => !bag.weight || bag.weight === null || bag.weight === '0')
          .map(bag => bag.bagNumber);

        if (missingBagNumbers.length > 0 || emptyWeightBags.length > 0) {
          missingBagsReport.push({
            lotId: lot.id,
            lotNumber: lot.lotNumber,
            farmerId: lot.farmerId,
            farmerName: lot.farmerName,
            totalBags: lot.numberOfBags,
            enteredBags: existingBagNumbers.length,
            missingBagNumbers,
            emptyWeightBags,
            missingCount: missingBagNumbers.length,
            emptyWeightCount: emptyWeightBags.length,
            completionPercentage: Math.round((existingBagNumbers.length / lot.numberOfBags) * 100),
            status: lot.status,
            createdAt: lot.createdAt
          });
        }
      }

      // Summary statistics
      const summary = {
        totalLotsToday: todaysLots.length,
        lotsWithMissingBags: missingBagsReport.length,
        lotsComplete: todaysLots.length - missingBagsReport.length,
        totalMissingBags: missingBagsReport.reduce((sum, lot) => sum + lot.missingCount, 0),
        totalEmptyWeightBags: missingBagsReport.reduce((sum, lot) => sum + lot.emptyWeightCount, 0),
        date: today.toISOString().split('T')[0]
      };

      res.json({
        summary,
        missingBagsDetails: missingBagsReport,
        todaysLots: todaysLots.map(lot => ({
          ...lot,
          isComplete: !missingBagsReport.find(missing => missing.lotId === lot.id)
        }))
      });

    } catch (error) {
      console.error('Missing bags detection error:', error);
      res.status(500).json({ error: 'Failed to detect missing bags' });
    }
  });

  // OCR invoice processing endpoint
  app.post("/api/ocr/process-invoice", requireAuth, requireTenant, upload.single('image'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No image file provided" });
      }

      const tenantId = req.user.tenantId;

      // Save uploaded file
      const imagePath = await OCRService.saveUploadedFile(req.file, tenantId);

      // Process OCR
      const ocrResult = await OCRService.processInvoiceImage(imagePath);

      // Return OCR results
      res.json(ocrResult);
    } catch (error) {
      console.error('OCR processing error:', error);
      res.status(500).json({ message: 'OCR processing failed', error: (error as Error).message });
    }
  });

  // Create purchase invoice with items and stock update
  app.post("/api/purchase-invoices", requireAuth, requireTenant, async (req: any, res) => {
    try {
      const tenantId = req.user.tenantId;
      const { items, ...invoiceData } = req.body;

      // Check for duplicate invoice (same seller, date, and invoice number)
      const existingInvoice = await db.select()
        .from(purchaseInvoices)
        .where(and(
          eq(purchaseInvoices.tenantId, tenantId),
          eq(purchaseInvoices.invoiceNumber, invoiceData.invoiceNumber),
          eq(purchaseInvoices.traderName, invoiceData.traderName),
          eq(purchaseInvoices.invoiceDate, new Date(invoiceData.invoiceDate))
        ))
        .limit(1);

      if (existingInvoice.length > 0) {
        return res.status(400).json({ 
          message: `Invoice ${invoiceData.invoiceNumber} from ${invoiceData.traderName} on this date already exists. Please check for duplicates.`,
          existingInvoiceId: existingInvoice[0].id
        });
      }

      // Create purchase invoice
      const invoice = await storage.createPurchaseInvoice({
        ...invoiceData,
        buyerId: parseInt(invoiceData.buyerId),
        tenantId,
        invoiceDate: new Date(invoiceData.invoiceDate)
      });

      // Create invoice items
      const invoiceItems = items.map((item: any) => ({
        ...item,
        invoiceId: invoice.id,
        tenantId
      }));
      
      await storage.createPurchaseInvoiceItems(invoiceItems);

      // Update stock inventory
      await storage.updateStockInventory(parseInt(invoiceData.buyerId), tenantId, items);

      // Create stock movements for audit trail
      const stockMovements = items.map((item: any) => ({
        stockId: null, // Will be updated by storage layer
        movementType: 'purchase_in',
        referenceType: 'purchase_invoice',
        referenceId: invoice.id,
        quantityChange: item.quantity,
        ratePerUnit: item.ratePerUnit,
        totalValue: item.amount,
        buyerId: parseInt(invoiceData.buyerId),
        tenantId,
        createdBy: req.user.id
      }));

      // await storage.createStockMovements(stockMovements); // Disabled for now

      await createAuditLog(req, "create", "purchase_invoice", invoice.id, null, invoice);
      res.status(201).json({ message: "Invoice saved and stock updated", invoice });
    } catch (error) {
      console.error('Error creating purchase invoice:', error);
      res.status(500).json({ message: 'Failed to create purchase invoice', error: (error as Error).message });
    }
  });

  // Get purchase invoices with date range filtering
  app.get("/api/purchase-invoices", requireAuth, requireTenant, async (req: any, res) => {
    try {
      const tenantId = req.user.tenantId;
      const { buyerId, startDate, endDate } = req.query;

      if (buyerId) {
        // Get invoices for specific buyer
        const invoices = await storage.getPurchaseInvoicesWithDateRange(parseInt(buyerId), tenantId, startDate, endDate);
        res.json(invoices);
      } else {
        // Get all invoices for tenant
        const invoices = await storage.getAllPurchaseInvoicesWithDateRange(tenantId, startDate, endDate);
        res.json(invoices);
      }
    } catch (error) {
      console.error('Error fetching purchase invoices:', error);
      res.status(500).json({ message: 'Failed to fetch purchase invoices' });
    }
  });

  // Get stock inventory with filtering
  app.get("/api/stock-inventory", requireAuth, requireTenant, async (req: any, res) => {
    try {
      const tenantId = req.user.tenantId;
      const { buyerId, includeMovements } = req.query;

      if (buyerId) {
        // Get inventory for specific buyer
        const inventory = await storage.getStockInventory(parseInt(buyerId), tenantId);
        res.json(inventory);
      } else {
        // Get all inventory for tenant
        const inventory = await storage.getAllStockInventory(tenantId);
        res.json(inventory);
      }
    } catch (error) {
      console.error('Error fetching stock inventory:', error);
      res.status(500).json({ message: 'Failed to fetch stock inventory' });
    }
  });

  // Update minimum stock level for alert system
  app.put("/api/stock-inventory/:stockId/min-stock", requireAuth, requireTenant, async (req: any, res) => {
    try {
      const tenantId = req.user.tenantId;
      const stockId = parseInt(req.params.stockId);
      const { minimumStockLevel } = req.body;

      // Validate minimum stock level
      if (!minimumStockLevel || parseFloat(minimumStockLevel) < 0) {
        return res.status(400).json({ message: "Invalid minimum stock level" });
      }

      // Update minimum stock level
      const updated = await db.update(stockInventory)
        .set({ 
          minimumStockLevel: minimumStockLevel.toString(),
          lastUpdated: new Date()
        })
        .where(and(eq(stockInventory.id, stockId), eq(stockInventory.tenantId, tenantId)))
        .returning();

      if (updated.length === 0) {
        return res.status(404).json({ message: "Stock item not found" });
      }

      await createAuditLog(req, "update", "stock_inventory", stockId, null, { minimumStockLevel });
      res.json({ message: "Minimum stock level updated successfully", stock: updated[0] });
    } catch (error) {
      console.error('Error updating minimum stock level:', error);
      res.status(500).json({ message: 'Failed to update minimum stock level' });
    }
  });

  // Get stock movements with date range
  app.get("/api/stock-movements", requireAuth, requireTenant, async (req: any, res) => {
    try {
      const tenantId = req.user.tenantId;
      const { buyerId, startDate, endDate, itemName } = req.query;

      const movements = await storage.getStockMovementsWithDateRange(tenantId, {
        buyerId: buyerId ? parseInt(buyerId) : undefined,
        startDate,
        endDate,
        itemName
      });
      res.json(movements);
    } catch (error) {
      console.error('Error fetching stock movements:', error);
      res.status(500).json({ message: 'Failed to fetch stock movements' });
    }
  });

  // Get all suppliers for tenant
  app.get("/api/suppliers", requireAuth, requireTenant, async (req: any, res) => {
    try {
      const tenantId = req.user.tenantId;
      
      const suppliers = await storage.getAllSuppliers(tenantId);
      res.json(suppliers);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      res.status(500).json({ message: 'Failed to fetch suppliers' });
    }
  });

  // Create supplier
  app.post("/api/suppliers", requireAuth, requireTenant, async (req: any, res) => {
    try {
      const tenantId = req.user.tenantId;
      const supplierData = { ...req.body, tenantId };

      const supplier = await storage.createSupplier(supplierData);
      await createAuditLog(req, "create", "supplier", supplier.id, null, supplier);
      
      res.status(201).json(supplier);
    } catch (error) {
      console.error('Error creating supplier:', error);
      res.status(500).json({ message: 'Failed to create supplier' });
    }
  });

  const httpServer = createServer(app);
  // ====================================
  // BID PRICE SYSTEM API ROUTES
  // ====================================
  
  // Get all dalals with their TODAY'S lots for bidding only
  app.get("/api/bid-dalals", requireAuth, requireTenant, async (req: any, res) => {
    try {
      const tenantId = req.user.tenantId;
      
      // Get today's date range (start and end of today)
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
      
      // Get all unique dalals from suppliers table and their TODAY'S lots from bid_prices
      const dalals = await db
        .select({
          dalalName: suppliers.name,
          dalalContact: suppliers.mobile,
          dalalAddress: suppliers.address,
          apmcCode: suppliers.apmcCode,
        })
        .from(suppliers)
        .where(eq(suppliers.tenantId, tenantId))
        .groupBy(suppliers.name, suppliers.mobile, suppliers.address, suppliers.apmcCode);
      
      // Get TODAY'S bid lots for each dalal
      const dalalLots = await Promise.all(dalals.map(async (dalal) => {
        const lots = await db
          .select({
            id: bidPrices.id,
            supplierId: bidPrices.supplierId,
            lotNumber: bidPrices.lotNumber,
            bidPrice: bidPrices.bidPrice,
            buyerName: buyers.name,
            bidDate: bidPrices.bidDate,
            chiliPhotos: bidPrices.chiliPhotos,
            notes: bidPrices.notes,
          })
          .from(bidPrices)
          .leftJoin(buyers, eq(bidPrices.buyerId, buyers.id))
          .where(
            and(
              eq(bidPrices.tenantId, tenantId),
              eq(bidPrices.dalalName, dalal.dalalName),
              gte(bidPrices.bidDate, startOfDay),
              lte(bidPrices.bidDate, endOfDay)
            )
          )
          .orderBy(desc(bidPrices.bidDate));
        
        return {
          ...dalal,
          lots,
          totalLots: lots.length,
        };
      }));
      
      // Only return dalals who have bids today
      const dalalLotsWithBids = dalalLots.filter(dalal => dalal.totalLots > 0);
      
      res.json(dalalLotsWithBids);
    } catch (error) {
      console.error("Error fetching dalals:", error);
      res.status(500).json({ message: "Failed to fetch dalals" });
    }
  });
  
  // Get bid prices for specific buyer
  app.get("/api/bid-prices", requireAuth, requireTenant, async (req: any, res) => {
    try {
      const tenantId = req.user.tenantId;
      const { buyerId } = req.query;
      
      let query = db
        .select({
          id: bidPrices.id,
          dalalName: bidPrices.dalalName,
          lotNumber: bidPrices.lotNumber,
          bidPrice: bidPrices.bidPrice,
          chiliPhotos: bidPrices.chiliPhotos,
          notes: bidPrices.notes,
          bidDate: bidPrices.bidDate,
          buyerName: buyers.name,
        })
        .from(bidPrices)
        .leftJoin(buyers, eq(bidPrices.buyerId, buyers.id))
        .where(eq(bidPrices.tenantId, tenantId));
      
      if (buyerId) {
        query = query.where(eq(bidPrices.buyerId, parseInt(buyerId as string)));
      }
      
      const results = await query.orderBy(desc(bidPrices.bidDate));
      res.json(results);
    } catch (error) {
      console.error("Error fetching bid prices:", error);
      res.status(500).json({ message: "Failed to fetch bid prices" });
    }
  });
  
  // Upload photos for bid prices with metadata
  app.post("/api/bid-photos", requireAuth, requireTenant, upload.array('photos', 5), async (req: any, res) => {
    try {
      const files = req.files as Express.Multer.File[];
      const { dalalName, lotNumber } = req.body;
      
      if (!files || files.length === 0) {
        return res.status(400).json({ message: "No files uploaded" });
      }

      if (!dalalName || !lotNumber) {
        return res.status(400).json({ message: "Dalal name and lot number are required for photo organization" });
      }

      const photoData: Array<{url: string, metadata: any}> = [];
      const currentDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const timestamp = Date.now();
        const randomId = Math.random().toString(36).substring(7);
        
        // Create organized filename with metadata
        const safeSupplierName = dalalName.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 20);
        const safeLotNumber = lotNumber.replace(/[^a-zA-Z0-9]/g, '_');
        const filename = `${safeSupplierName}_${safeLotNumber}_${currentDate}_${timestamp}_${i + 1}.jpg`;
        const filePath = `uploads/bid-photos/${filename}`;
        
        // Create directory if it doesn't exist
        await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
        
        // Save file
        await fs.promises.writeFile(filePath, file.buffer);
        
        // Store photo with metadata
        const photoMetadata = {
          url: filePath,
          metadata: {
            supplierName: dalalName,
            lotNumber: lotNumber,
            uploadDate: currentDate,
            uploadTime: new Date().toISOString(),
            photoNumber: i + 1,
            totalPhotos: files.length,
            originalName: file.originalname,
            fileSize: file.size
          }
        };
        
        photoData.push(photoMetadata);
      }
      
      res.json({ photos: photoData });
    } catch (error) {
      console.error("Error uploading photos:", error);
      res.status(500).json({ message: "Failed to upload photos" });
    }
  });

  // Create new bid price entry
  app.post("/api/bid-prices", requireAuth, requireTenant, async (req: any, res) => {
    try {
      const tenantId = req.user.tenantId;
      const { dalalName, lotNumber, bidPrice, chiliPhotos, notes } = req.body;
      
      // Validate required fields
      if (!dalalName || !lotNumber || !bidPrice) {
        return res.status(400).json({ message: "Missing required fields: dalalName, lotNumber, and bidPrice are required" });
      }

      // Validate bidPrice is a valid number
      const priceNumber = parseFloat(bidPrice);
      if (isNaN(priceNumber) || priceNumber <= 0) {
        return res.status(400).json({ message: "Bid price must be a valid positive number" });
      }
      
      let supplierId = null;
      
      try {
        // Find supplier ID by dalal name (case-insensitive search)
        const supplier = await db
          .select({ id: suppliers.id })
          .from(suppliers)
          .where(
            and(
              sql`LOWER(${suppliers.name}) = LOWER(${dalalName})`,
              eq(suppliers.tenantId, tenantId)
            )
          )
          .limit(1);

        if (supplier && supplier.length > 0) {
          supplierId = supplier[0].id;
        } else {
          // Auto-create supplier if not found
          console.log(`Auto-creating supplier for dalal: ${dalalName}`);
          const [newSupplier] = await db
            .insert(suppliers)
            .values({
              name: dalalName,
              apmcCode: null,
              tenantId,
              isActive: true,
              contactPerson: null,
              mobile: null,
              address: null,
              email: null,
              gstNumber: null,
              panNumber: null,
            })
            .returning();
          
          supplierId = newSupplier.id;
          console.log(`Created new supplier with ID: ${supplierId}`);
        }
      } catch (supplierError) {
        console.error("Error handling supplier lookup/creation:", supplierError);
        // Continue without supplierId - bid price can still be saved
      }

      // Insert bid price with retry logic
      let retryCount = 0;
      const maxRetries = 3;
      let newBid;

      while (retryCount < maxRetries) {
        try {
          const [bid] = await db
            .insert(bidPrices)
            .values({
              buyerId: null,
              supplierId,
              dalalName,
              lotNumber,
              bidPrice,
              chiliPhotos: chiliPhotos || [],
              notes: notes || "",
              tenantId,
            })
            .returning();
          
          newBid = bid;
          break; // Success, exit retry loop
        } catch (insertError: any) {
          retryCount++;
          console.error(`Bid price insert attempt ${retryCount} failed:`, insertError);
          
          if (retryCount >= maxRetries) {
            throw insertError; // Re-throw after max retries
          }
          
          // Wait before retry (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, retryCount * 100));
        }
      }

      if (!newBid) {
        throw new Error("Failed to create bid price after multiple attempts");
      }
      
      // Log audit trail
      try {
        await createAuditLog(
          tenantId,
          req.user.id,
          "bid_price",
          "create",
          newBid.id,
          `Created bid for ${dalalName} - Lot ${lotNumber} at ₹${bidPrice}`
        );
      } catch (auditError) {
        console.error("Audit log creation failed:", auditError);
        // Don't fail the request if audit logging fails
      }
      
      console.log(`Bid price saved successfully: ID ${newBid.id}, Dalal: ${dalalName}, Lot: ${lotNumber}, Price: ₹${bidPrice}`);
      res.json(newBid);
    } catch (error) {
      console.error("Error creating bid price:", error);
      res.status(500).json({ 
        message: "Failed to create bid price", 
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  
  // Get dalal suggestions (from suppliers table)
  app.get("/api/dalal-suggestions", requireAuth, requireTenant, async (req: any, res) => {
    try {
      const tenantId = req.user.tenantId;
      const { search } = req.query;
      
      let query = db
        .select({
          name: suppliers.name,
          mobile: suppliers.mobile,
          address: suppliers.address,
        })
        .from(suppliers)
        .where(eq(suppliers.tenantId, tenantId))
        .groupBy(suppliers.name, suppliers.mobile, suppliers.address);
      
      if (search) {
        query = query.where(
          like(suppliers.name, `%${search}%`)
        );
      }
      
      const suggestions = await query.limit(10);
      res.json(suggestions);
    } catch (error) {
      console.error("Error fetching dalal suggestions:", error);
      res.status(500).json({ message: "Failed to fetch dalal suggestions" });
    }
  });
  
  // Update bid price
  app.put("/api/bid-prices/:id", requireAuth, requireTenant, async (req: any, res) => {
    try {
      const tenantId = req.user.tenantId;
      const bidId = parseInt(req.params.id);
      const { dalalName, lotNumber, bidPrice, chiliPhotos, notes } = req.body;
      
      const [updatedBid] = await db
        .update(bidPrices)
        .set({
          dalalName,
          lotNumber,
          bidPrice,
          chiliPhotos,
          notes,
        })
        .where(
          and(
            eq(bidPrices.id, bidId),
            eq(bidPrices.tenantId, tenantId)
          )
        )
        .returning();
      
      if (!updatedBid) {
        return res.status(404).json({ message: "Bid price not found" });
      }
      
      await createAuditLog(
        tenantId,
        req.user.id,
        "bid_price",
        "update",
        bidId,
        `Updated bid for ${dalalName} - Lot ${lotNumber}`
      );
      
      res.json(updatedBid);
    } catch (error) {
      console.error("Error updating bid price:", error);
      res.status(500).json({ message: "Failed to update bid price" });
    }
  });
  
  // Delete bid price
  app.delete("/api/bid-prices/:id", requireAuth, requireTenant, async (req: any, res) => {
    try {
      const tenantId = req.user.tenantId;
      const bidId = parseInt(req.params.id);
      
      const [deletedBid] = await db
        .delete(bidPrices)
        .where(
          and(
            eq(bidPrices.id, bidId),
            eq(bidPrices.tenantId, tenantId)
          )
        )
        .returning();
      
      if (!deletedBid) {
        return res.status(404).json({ message: "Bid price not found" });
      }
      
      await createAuditLog(
        tenantId,
        req.user.id,
        "bid_price",
        "delete",
        bidId,
        `Deleted bid for ${deletedBid.dalalName} - Lot ${deletedBid.lotNumber}`
      );
      
      res.json({ message: "Bid price deleted successfully" });
    } catch (error) {
      console.error("Error deleting bid price:", error);
      res.status(500).json({ message: "Failed to delete bid price" });
    }
  });

  return httpServer;
}
