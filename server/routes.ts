import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
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
  farmerBills,
  taxInvoices,
  accountingLedger,
  bankTransactions,
  expenseCategories,
  expenses,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, gte, lte, or, ilike, isNull, sql, inArray } from "drizzle-orm";
import { z } from "zod";

function requireAuth(req: any, res: any, next: any) {
  console.log('requireAuth check:', {
    isAuthenticated: req.isAuthenticated(),
    hasUser: !!req.user,
    userId: req.user?.id,
    sessionID: req.sessionID
  });
  
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
  
  // Get final accounts for fiscal year
  app.get("/api/accounting/final-accounts/:fiscalYear?", requireAuth, requireTenant, async (req: any, res) => {
    try {
      const fiscalYear = req.params.fiscalYear;
      const finalAccounts = await generateFinalAccounts(req.user.tenantId, fiscalYear);
      res.json(finalAccounts);
    } catch (error) {
      console.error("Error generating final accounts:", error);
      res.status(500).json({ message: "Failed to generate final accounts" });
    }
  });

  // Get final accounts without fiscal year parameter
  app.get("/api/accounting/final-accounts", requireAuth, requireTenant, async (req: any, res) => {
    try {
      const finalAccounts = await generateFinalAccounts(req.user.tenantId);
      res.json(finalAccounts);
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

  // Get farmer profitability analysis
  app.get("/api/accounting/profitability/farmers/:fiscalYear?", requireAuth, requireTenant, async (req: any, res) => {
    try {
      const fiscalYear = req.params.fiscalYear;
      const profitability = await analyzeProfitabilityByFarmer(req.user.tenantId, fiscalYear);
      res.json(profitability);
    } catch (error) {
      console.error("Error analyzing farmer profitability:", error);
      res.status(500).json({ message: "Failed to analyze farmer profitability" });
    }
  });

  // Get buyer profitability analysis
  app.get("/api/accounting/profitability/buyers/:fiscalYear?", requireAuth, requireTenant, async (req: any, res) => {
    try {
      const fiscalYear = req.params.fiscalYear;
      const profitability = await analyzeProfitabilityByBuyer(req.user.tenantId, fiscalYear);
      res.json(profitability);
    } catch (error) {
      console.error("Error analyzing buyer profitability:", error);
      res.status(500).json({ message: "Failed to analyze buyer profitability" });
    }
  });

  // Get GST liability
  app.get("/api/accounting/gst-liability/:fiscalYear?", requireAuth, requireTenant, async (req: any, res) => {
    try {
      const fiscalYear = req.params.fiscalYear;
      const gstLiability = await calculateGSTLiability(req.user.tenantId, fiscalYear);
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
      const categories = await db
        .select()
        .from(expenseCategories)
        .where(eq(expenseCategories.tenantId, req.user.tenantId))
        .orderBy(expenseCategories.name);
      res.json(categories);
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
      const entries = await db
        .select()
        .from(accountingLedger)
        .where(eq(accountingLedger.tenantId, req.user.tenantId))
        .orderBy(desc(accountingLedger.transactionDate))
        .limit(limit);
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
      const transactions = await db
        .select()
        .from(bankTransactions)
        .where(eq(bankTransactions.tenantId, req.user.tenantId))
        .orderBy(desc(bankTransactions.createdAt))
        .limit(limit);
      res.json(transactions);
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

  // Check if farmer bill already exists
  app.get("/api/farmer-bill/:farmerId/check", requireAuth, requireTenant, async (req: any, res) => {
    try {
      const farmerId = parseInt(req.params.farmerId);
      const tenantId = req.user.tenantId;

      const existingBill = await db.select()
        .from(farmerBills)
        .where(and(eq(farmerBills.farmerId, farmerId), eq(farmerBills.tenantId, tenantId)))
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

  // Generate and save farmer bill (only if not exists)
  app.post("/api/farmer-bill/:farmerId", requireAuth, requireTenant, async (req: any, res) => {
    try {
      const farmerId = parseInt(req.params.farmerId);
      const tenantId = req.user.tenantId;
      const { pattiNumber, billData, lotIds } = req.body;

      // Check if bill already exists for this farmer
      const existingBill = await db.select()
        .from(farmerBills)
        .where(and(eq(farmerBills.farmerId, farmerId), eq(farmerBills.tenantId, tenantId)))
        .limit(1);

      if (existingBill.length > 0) {
        return res.status(400).json({ 
          message: "Farmer bill already generated for this farmer",
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
                             billData.advance + billData.commission + billData.other;

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
        commission: billData.commission.toString(),
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
          parseFloat(billData.commission.toString()),
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

  // Check if tax invoice already exists for buyer
  app.get("/api/tax-invoice/:buyerId/check", requireAuth, requireTenant, async (req: any, res) => {
    try {
      const buyerId = parseInt(req.params.buyerId);
      const tenantId = req.user.tenantId;

      const existingInvoice = await db.select()
        .from(taxInvoices)
        .where(and(eq(taxInvoices.buyerId, buyerId), eq(taxInvoices.tenantId, tenantId)))
        .limit(1);

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

      // Check if invoice already exists
      const existingInvoice = await db.select()
        .from(taxInvoices)
        .where(and(eq(taxInvoices.buyerId, buyerId), eq(taxInvoices.tenantId, tenantId)))
        .limit(1);

      if (existingInvoice.length > 0) {
        return res.status(400).json({ 
          message: "Tax invoice already generated for this buyer",
          invoiceId: existingInvoice[0].id
        });
      }

      console.log(`Generating tax invoice for buyer ${buyerId}, tenant ${tenantId}`);
      try {
        const taxInvoice = await generateTaxInvoice(buyerId, tenantId);
        
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

      const savedInvoice = await db.select()
        .from(taxInvoices)
        .where(and(eq(taxInvoices.buyerId, buyerId), eq(taxInvoices.tenantId, tenantId)))
        .limit(1);

      if (savedInvoice.length === 0) {
        return res.status(404).json({ message: "No tax invoice found for this buyer" });
      }

      res.json(savedInvoice[0].invoiceData);
    } catch (error) {
      console.error("Error retrieving tax invoice:", error);
      res.status(500).json({ message: "Failed to retrieve tax invoice" });
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
      
      // Generate lot number
      const existingLots = await storage.getAllLotsByTenant(req.user.tenantId);
      const lotNumber = `LOT${String(existingLots.length + 1).padStart(4, "0")}`;

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
  app.get("/api/buyers/:id/purchases", requireAuth, requireTenant, async (req, res) => {
    try {
      const buyerId = parseInt(req.params.id);
      const purchases = await storage.getBuyerPurchaseHistory(buyerId, req.user.tenantId);
      res.json(purchases);
    } catch (error) {
      console.error("Error fetching buyer purchases:", error);
      res.status(500).json({ message: "Failed to fetch buyer purchases" });
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

  // Buyer purchase tracking - get buyer's purchase history and payment status
  app.get('/api/buyers/:buyerId/purchases', requireAuth, requireTenant, async (req, res) => {
    try {
      const buyerId = parseInt(req.params.buyerId);
      const tenantId = req.user?.tenantId!;

      const purchases = await db
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
          amountDue: lots.amountDue,
          amountPaid: lots.amountPaid,
          paymentDate: lots.paymentDate,
          createdAt: lots.createdAt,
        })
        .from(lots)
        .leftJoin(farmers, eq(lots.farmerId, farmers.id))
        .where(
          and(
            eq(lots.buyerId, buyerId),
            eq(lots.tenantId, tenantId)
          )
        )
        .orderBy(desc(lots.createdAt));

      res.json(purchases);
    } catch (error) {
      console.error('Error fetching buyer purchases:', error);
      res.status(500).json({ message: 'Failed to fetch buyer purchases' });
    }
  });

  // Get all buyers with their purchase summary
  app.get('/api/buyers/summary', requireAuth, requireTenant, async (req, res) => {
    try {
      const tenantId = req.user?.tenantId!;
      const { search } = req.query;

      let whereCondition = eq(buyers.tenantId, tenantId);
      
      if (search) {
        whereCondition = and(
          whereCondition,
          or(
            ilike(buyers.name, `%${search}%`),
            ilike(buyers.mobile, `%${search}%`),
            ilike(buyers.contactPerson, `%${search}%`)
          )
        );
      }

      const buyerSummaries = await db
        .select({
          buyerId: buyers.id,
          buyerName: buyers.name,
          buyerMobile: buyers.mobile,
          buyerContact: buyers.contactPerson,
          totalLots: sql<number>`COUNT(${lots.id})::int`,
          completedLots: sql<number>`COUNT(CASE WHEN ${lots.status} = 'completed' THEN 1 END)::int`,
          billGeneratedLots: sql<number>`COUNT(CASE WHEN ${lots.billGenerated} = true THEN 1 END)::int`,
          pendingBills: sql<number>`COUNT(CASE WHEN ${lots.status} = 'completed' AND ${lots.billGenerated} = false THEN 1 END)::int`,
          totalAmountDue: sql<string>`COALESCE(SUM(${lots.amountDue}), 0)`,
          totalAmountPaid: sql<string>`COALESCE(SUM(${lots.amountPaid}), 0)`,
          pendingPayments: sql<number>`COUNT(CASE WHEN ${lots.paymentStatus} = 'pending' AND ${lots.billGenerated} = true THEN 1 END)::int`,
        })
        .from(buyers)
        .leftJoin(lots, and(eq(buyers.id, lots.buyerId), eq(lots.tenantId, tenantId)))
        .where(whereCondition)
        .groupBy(buyers.id, buyers.name, buyers.mobile, buyers.contactPerson)
        .orderBy(buyers.name);

      res.json(buyerSummaries);
    } catch (error) {
      console.error('Error fetching buyer summaries:', error);
      res.status(500).json({ message: 'Failed to fetch buyer summaries' });
    }
  });

  // Update payment status for a lot
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

  // Generate Final Accounts (comprehensive)
  app.get("/api/accounting/final-accounts", requireAuth, requireTenant, async (req: any, res) => {
    try {
      const tenantId = req.user.tenantId;
      const { fiscalYear } = req.query;
      
      const accounts = await generateFinalAccounts(tenantId, fiscalYear);
      res.json(accounts);
    } catch (error) {
      console.error('Error generating final accounts:', error);
      res.status(500).json({ message: 'Failed to generate final accounts' });
    }
  });

  // Profitability Analysis by Farmer
  app.get("/api/accounting/profitability/farmers", requireAuth, requireTenant, async (req: any, res) => {
    try {
      const tenantId = req.user.tenantId;
      const { fiscalYear } = req.query;
      
      const analysis = await analyzeProfitabilityByFarmer(tenantId, fiscalYear);
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
      const { fiscalYear } = req.query;
      
      const analysis = await analyzeProfitabilityByBuyer(tenantId, fiscalYear);
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
      const { fiscalYear } = req.query;
      
      const liability = await calculateGSTLiability(tenantId, fiscalYear);
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

  // Get accounting ledger entries (for audit and review)
  app.get("/api/accounting/ledger", requireAuth, requireTenant, async (req: any, res) => {
    try {
      const tenantId = req.user.tenantId;
      const { fiscalYear, accountHead, entityType, limit = 100 } = req.query;
      
      let query = db
        .select()
        .from(accountingLedger)
        .where(eq(accountingLedger.tenantId, tenantId))
        .orderBy(desc(accountingLedger.transactionDate))
        .limit(parseInt(limit as string));

      if (fiscalYear) {
        query = query.where(and(
          eq(accountingLedger.tenantId, tenantId),
          eq(accountingLedger.fiscalYear, fiscalYear as string)
        ));
      }

      if (accountHead) {
        query = query.where(and(
          eq(accountingLedger.tenantId, tenantId),
          eq(accountingLedger.accountHead, accountHead as string)
        ));
      }

      if (entityType) {
        query = query.where(and(
          eq(accountingLedger.tenantId, tenantId),
          eq(accountingLedger.entityType, entityType as string)
        ));
      }

      const entries = await query;
      res.json(entries);
    } catch (error) {
      console.error('Error fetching ledger entries:', error);
      res.status(500).json({ message: 'Failed to fetch ledger entries' });
    }
  });

  // Get bank transactions
  app.get("/api/accounting/bank-transactions", requireAuth, requireTenant, async (req: any, res) => {
    try {
      const tenantId = req.user.tenantId;
      const { limit = 50 } = req.query;
      
      const transactions = await db
        .select()
        .from(bankTransactions)
        .where(eq(bankTransactions.tenantId, tenantId))
        .orderBy(desc(bankTransactions.createdAt))
        .limit(parseInt(limit as string));

      res.json(transactions);
    } catch (error) {
      console.error('Error fetching bank transactions:', error);
      res.status(500).json({ message: 'Failed to fetch bank transactions' });
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
      await recordTransaction(
        tenantId,
        'expense',
        'expense',
        expense[0].id,
        'manual_entry',
        expense[0].id,
        parseFloat(amount),
        0,
        description || 'Business expense',
        'expenses',
        userId,
        expense[0].expenseDate
      );

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

  const httpServer = createServer(app);
  return httpServer;
}
