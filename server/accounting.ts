import { db } from "./db";
import { 
  accountingLedger, 
  bankTransactions, 
  finalAccounts, 
  expenseCategories, 
  expenses,
  lots,
  farmers,
  buyers,
  farmerBills,
  taxInvoices,
  tenants
} from "@shared/schema";
import { eq, sum, desc, and, between, sql } from "drizzle-orm";

// Fiscal year helper functions
export function getCurrentFiscalYear(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  
  // Indian fiscal year: April 1 to March 31
  if (month >= 3) { // April onwards (month 3 = April)
    return `${year}-${year + 1}`;
  } else {
    return `${year - 1}-${year}`;
  }
}

export function getFiscalYearDates(fiscalYear: string): { startDate: Date; endDate: Date } {
  const [startYear, endYear] = fiscalYear.split('-').map(Number);
  return {
    startDate: new Date(startYear, 3, 1), // April 1st
    endDate: new Date(endYear, 2, 31, 23, 59, 59) // March 31st
  };
}

// Double-entry bookkeeping functions
export async function recordTransaction(
  tenantId: number,
  transactionType: string,
  entityType: string,
  entityId: number | null,
  referenceType: string,
  referenceId: number,
  debitAmount: number,
  creditAmount: number,
  description: string,
  accountHead: string,
  userId: number,
  transactionDate?: Date
) {
  const fiscalYear = getCurrentFiscalYear();
  
  await db.insert(accountingLedger).values({
    tenantId,
    transactionType,
    entityType,
    entityId,
    referenceType,
    referenceId,
    debitAmount: debitAmount.toString(),
    creditAmount: creditAmount.toString(),
    description,
    accountHead,
    fiscalYear,
    transactionDate: transactionDate || new Date(),
    createdBy: userId,
  });
}

// Automatic transaction recording when bills/invoices are generated
export async function recordFarmerBillTransaction(
  farmerBillId: number,
  farmerId: number,
  totalAmount: number,
  rok: number,
  tenantId: number,
  userId: number
) {
  // Record purchase (debit)
  await recordTransaction(
    tenantId,
    'purchase',
    'farmer',
    farmerId,
    'farmer_bill',
    farmerBillId,
    totalAmount,
    0,
    `Purchase from farmer - Bill #${farmerBillId}`,
    'purchases',
    userId
  );

  // Record accounts payable (credit)
  await recordTransaction(
    tenantId,
    'purchase',
    'farmer',
    farmerId,
    'farmer_bill',
    farmerBillId,
    0,
    totalAmount,
    `Amount payable to farmer - Bill #${farmerBillId}`,
    'accounts_payable',
    userId
  );

  // Record rok income if any
  if (rok > 0) {
    await recordTransaction(
      tenantId,
      'income',
      'farmer',
      farmerId,
      'farmer_bill',
      farmerBillId,
      0,
      rok,
      `Rok income - Bill #${farmerBillId}`,
      'rok_income',
      userId
    );
  }
}

export async function recordTaxInvoiceTransaction(
  invoiceId: number,
  buyerId: number,
  basicAmount: number,
  totalCharges: number,
  totalAmount: number,
  tenantId: number,
  userId: number
) {
  // Record sale (credit)
  await recordTransaction(
    tenantId,
    'sale',
    'buyer',
    buyerId,
    'tax_invoice',
    invoiceId,
    0,
    basicAmount,
    `Sale to buyer - Invoice #${invoiceId}`,
    'sales',
    userId
  );

  // Record accounts receivable (debit)
  await recordTransaction(
    tenantId,
    'sale',
    'buyer',
    buyerId,
    'tax_invoice',
    invoiceId,
    totalAmount,
    0,
    `Amount receivable from buyer - Invoice #${invoiceId}`,
    'accounts_receivable',
    userId
  );

  // Record service charges if any
  if (totalCharges > 0) {
    await recordTransaction(
      tenantId,
      'income',
      'buyer',
      buyerId,
      'tax_invoice',
      invoiceId,
      0,
      totalCharges,
      `Service charges - Invoice #${invoiceId}`,
      'service_charges',
      userId
    );
  }
}

export async function recordPaymentReceived(
  buyerId: number,
  amount: number,
  paymentMethod: string,
  referenceNumber: string,
  tenantId: number,
  userId: number
) {
  // Record cash/bank (debit)
  await recordTransaction(
    tenantId,
    'payment_received',
    'buyer',
    buyerId,
    'manual_entry',
    0,
    amount,
    0,
    `Payment received from buyer via ${paymentMethod} - ${referenceNumber}`,
    paymentMethod === 'cash' ? 'cash' : 'bank',
    userId
  );

  // Reduce accounts receivable (credit)
  await recordTransaction(
    tenantId,
    'payment_received',
    'buyer',
    buyerId,
    'manual_entry',
    0,
    0,
    amount,
    `Payment received from buyer - ${referenceNumber}`,
    'accounts_receivable',
    userId
  );

  // Record bank transaction
  if (paymentMethod !== 'cash') {
    await db.insert(bankTransactions).values({
      tenantId,
      transactionType: 'deposit',
      amount: amount.toString(),
      bankAccount: 'main', // Default account
      referenceNumber,
      description: `Payment received from buyer`,
      entityType: 'buyer',
      entityId: buyerId,
      createdBy: userId,
    });
  }
}

export async function recordPaymentMade(
  farmerId: number,
  amount: number,
  paymentMethod: string,
  referenceNumber: string,
  tenantId: number,
  userId: number
) {
  // Reduce cash/bank (credit)
  await recordTransaction(
    tenantId,
    'payment_made',
    'farmer',
    farmerId,
    'manual_entry',
    0,
    0,
    amount,
    `Payment made to farmer via ${paymentMethod} - ${referenceNumber}`,
    paymentMethod === 'cash' ? 'cash' : 'bank',
    userId
  );

  // Reduce accounts payable (debit)
  await recordTransaction(
    tenantId,
    'payment_made',
    'farmer',
    farmerId,
    'manual_entry',
    0,
    amount,
    0,
    `Payment made to farmer - ${referenceNumber}`,
    'accounts_payable',
    userId
  );

  // Record bank transaction
  if (paymentMethod !== 'cash') {
    await db.insert(bankTransactions).values({
      tenantId,
      transactionType: 'withdrawal',
      amount: amount.toString(),
      bankAccount: 'main',
      referenceNumber,
      description: `Payment made to farmer`,
      entityType: 'farmer',
      entityId: farmerId,
      createdBy: userId,
    });
  }
}

// Financial reports generation
export async function generateProfitLossReport(tenantId: number, fiscalYear?: string) {
  const currentFiscalYear = fiscalYear || getCurrentFiscalYear();
  const { startDate, endDate } = getFiscalYearDates(currentFiscalYear);

  // Calculate total sales
  const salesData = await db
    .select({
      total: sum(accountingLedger.creditAmount)
    })
    .from(accountingLedger)
    .where(
      and(
        eq(accountingLedger.tenantId, tenantId),
        eq(accountingLedger.accountHead, 'sales'),
        between(accountingLedger.transactionDate, startDate, endDate)
      )
    );

  // Calculate total purchases
  const purchasesData = await db
    .select({
      total: sum(accountingLedger.debitAmount)
    })
    .from(accountingLedger)
    .where(
      and(
        eq(accountingLedger.tenantId, tenantId),
        eq(accountingLedger.accountHead, 'purchases'),
        between(accountingLedger.transactionDate, startDate, endDate)
      )
    );

  // Calculate commission income
  const commissionData = await db
    .select({
      total: sum(accountingLedger.creditAmount)
    })
    .from(accountingLedger)
    .where(
      and(
        eq(accountingLedger.tenantId, tenantId),
        eq(accountingLedger.accountHead, 'commission_income'),
        between(accountingLedger.transactionDate, startDate, endDate)
      )
    );

  // Calculate service charges
  const serviceChargesData = await db
    .select({
      total: sum(accountingLedger.creditAmount)
    })
    .from(accountingLedger)
    .where(
      and(
        eq(accountingLedger.tenantId, tenantId),
        eq(accountingLedger.accountHead, 'service_charges'),
        between(accountingLedger.transactionDate, startDate, endDate)
      )
    );

  // Calculate total expenses (including farmer payments and other business expenses)
  const expensesData = await db
    .select({
      total: sum(accountingLedger.debitAmount)
    })
    .from(accountingLedger)
    .where(
      and(
        eq(accountingLedger.tenantId, tenantId),
        eq(accountingLedger.accountHead, 'expenses'),
        between(accountingLedger.transactionDate, startDate, endDate)
      )
    );

  // Calculate farmer payments (recorded as accounts_payable debits)
  const farmerPaymentsData = await db
    .select({
      total: sum(accountingLedger.debitAmount)
    })
    .from(accountingLedger)
    .where(
      and(
        eq(accountingLedger.tenantId, tenantId),
        eq(accountingLedger.accountHead, 'accounts_payable'),
        between(accountingLedger.transactionDate, startDate, endDate)
      )
    );

  const totalSales = parseFloat(salesData[0]?.total || '0');
  const totalPurchases = parseFloat(purchasesData[0]?.total || '0');
  const commissionIncome = parseFloat(commissionData[0]?.total || '0');
  const serviceCharges = parseFloat(serviceChargesData[0]?.total || '0');
  const totalExpenses = parseFloat(expensesData[0]?.total || '0');
  const farmerPayments = parseFloat(farmerPaymentsData[0]?.total || '0');

  const grossProfit = totalSales - totalPurchases;
  const totalIncome = totalSales + commissionIncome + serviceCharges;
  // Net profit = Total Income - All Expenses (including farmer payments)
  const netProfit = totalIncome - totalPurchases - totalExpenses - farmerPayments;

  return {
    fiscalYear: currentFiscalYear,
    periodStartDate: startDate,
    periodEndDate: endDate,
    totalSales,
    totalPurchases,
    grossProfit,
    commissionIncome,
    serviceCharges,
    totalIncome,
    totalExpenses,
    farmerPayments,
    netProfit,
  };
}

export async function generateBalanceSheet(tenantId: number, fiscalYear?: string) {
  const currentFiscalYear = fiscalYear || getCurrentFiscalYear();
  const { startDate, endDate } = getFiscalYearDates(currentFiscalYear);

  // Calculate accounts receivable (money to collect from buyers)
  const receivableData = await db
    .select({
      total: sql<number>`COALESCE(SUM(CASE WHEN account_head = 'accounts_receivable' THEN CAST(debit_amount AS DECIMAL) - CAST(credit_amount AS DECIMAL) END), 0)`
    })
    .from(accountingLedger)
    .where(
      and(
        eq(accountingLedger.tenantId, tenantId),
        eq(accountingLedger.accountHead, 'accounts_receivable'),
        between(accountingLedger.transactionDate, startDate, endDate)
      )
    );

  // Calculate accounts payable (money to pay to farmers)
  const payableData = await db
    .select({
      total: sql<number>`COALESCE(SUM(CASE WHEN account_head = 'accounts_payable' THEN CAST(credit_amount AS DECIMAL) - CAST(debit_amount AS DECIMAL) END), 0)`
    })
    .from(accountingLedger)
    .where(
      and(
        eq(accountingLedger.tenantId, tenantId),
        eq(accountingLedger.accountHead, 'accounts_payable'),
        between(accountingLedger.transactionDate, startDate, endDate)
      )
    );

  // Calculate cash position
  const cashData = await db
    .select({
      total: sql<number>`COALESCE(SUM(CASE WHEN account_head = 'cash' THEN CAST(debit_amount AS DECIMAL) - CAST(credit_amount AS DECIMAL) END), 0)`
    })
    .from(accountingLedger)
    .where(
      and(
        eq(accountingLedger.tenantId, tenantId),
        eq(accountingLedger.accountHead, 'cash'),
        between(accountingLedger.transactionDate, startDate, endDate)
      )
    );

  // Calculate bank balance
  const bankData = await db
    .select({
      total: sql<number>`COALESCE(SUM(CASE WHEN account_head = 'bank' THEN CAST(debit_amount AS DECIMAL) - CAST(credit_amount AS DECIMAL) END), 0)`
    })
    .from(accountingLedger)
    .where(
      and(
        eq(accountingLedger.tenantId, tenantId),
        eq(accountingLedger.accountHead, 'bank'),
        between(accountingLedger.transactionDate, startDate, endDate)
      )
    );

  const accountsReceivable = receivableData[0]?.total || 0;
  const accountsPayable = payableData[0]?.total || 0;
  const cash = cashData[0]?.total || 0;
  const bankBalance = bankData[0]?.total || 0;

  const totalAssets = cash + bankBalance + accountsReceivable;
  const totalLiabilities = accountsPayable;
  const netWorth = totalAssets - totalLiabilities;

  return {
    fiscalYear: currentFiscalYear,
    cash,
    bankBalance,
    accountsReceivable,
    totalAssets,
    accountsPayable,
    totalLiabilities,
    netWorth,
  };
}

export async function generateCashFlowReport(tenantId: number, fiscalYear?: string) {
  const currentFiscalYear = fiscalYear || getCurrentFiscalYear();
  const { startDate, endDate } = getFiscalYearDates(currentFiscalYear);

  // Cash inflows
  const cashInData = await db
    .select({
      paymentReceived: sum(sql<number>`CASE WHEN transaction_type = 'payment_received' THEN CAST(debit_amount AS DECIMAL) ELSE 0 END`),
      otherIncome: sum(sql<number>`CASE WHEN account_head IN ('commission_income', 'service_charges') THEN CAST(credit_amount AS DECIMAL) ELSE 0 END`),
    })
    .from(accountingLedger)
    .where(
      and(
        eq(accountingLedger.tenantId, tenantId),
        between(accountingLedger.transactionDate, startDate, endDate)
      )
    );

  // Cash outflows
  const cashOutData = await db
    .select({
      paymentMade: sum(sql<number>`CASE WHEN transaction_type = 'payment_made' THEN CAST(credit_amount AS DECIMAL) ELSE 0 END`),
      expenses: sum(sql<number>`CASE WHEN account_head = 'expenses' THEN CAST(debit_amount AS DECIMAL) ELSE 0 END`),
    })
    .from(accountingLedger)
    .where(
      and(
        eq(accountingLedger.tenantId, tenantId),
        between(accountingLedger.transactionDate, startDate, endDate)
      )
    );

  const paymentReceived = parseFloat(cashInData[0]?.paymentReceived?.toString() || '0');
  const otherIncome = parseFloat(cashInData[0]?.otherIncome?.toString() || '0');
  const paymentMade = parseFloat(cashOutData[0]?.paymentMade?.toString() || '0');
  const expenses = parseFloat(cashOutData[0]?.expenses?.toString() || '0');

  const totalCashIn = paymentReceived + otherIncome;
  const totalCashOut = paymentMade + expenses;
  const netCashFlow = totalCashIn - totalCashOut;

  return {
    fiscalYear: currentFiscalYear,
    cashIn: {
      paymentReceived,
      otherIncome,
      total: totalCashIn,
    },
    cashOut: {
      paymentMade,
      expenses,
      total: totalCashOut,
    },
    netCashFlow,
  };
}

// Profitability analysis functions
export async function analyzeProfitabilityByFarmer(tenantId: number, fiscalYear?: string, startDateParam?: string, endDateParam?: string) {
  // Use date range if provided, otherwise fall back to fiscal year
  let startDate: Date, endDate: Date;
  
  if (startDateParam && endDateParam) {
    startDate = new Date(startDateParam);
    endDate = new Date(endDateParam);
    console.log('📅 Using DATE RANGE mode for farmer profitability:', { startDate: startDateParam, endDate: endDateParam });
  } else {
    const currentFiscalYear = fiscalYear || getCurrentFiscalYear();
    const fiscalDates = getFiscalYearDates(currentFiscalYear);
    startDate = fiscalDates.startDate;
    endDate = fiscalDates.endDate;
    console.log('📅 Using FISCAL YEAR mode for farmer profitability:', { fiscalYear: currentFiscalYear });
  }

  const farmerProfits = await db
    .select({
      farmerId: farmers.id,
      farmerName: farmers.name,
      totalPurchases: sum(sql<number>`CASE WHEN account_head = 'purchases' THEN CAST(debit_amount AS DECIMAL) ELSE 0 END`),
      totalSales: sum(sql<number>`CASE WHEN account_head = 'sales' AND entity_type = 'farmer' THEN CAST(credit_amount AS DECIMAL) ELSE 0 END`),
      commission: sum(sql<number>`CASE WHEN account_head = 'commission_income' THEN CAST(credit_amount AS DECIMAL) ELSE 0 END`),
    })
    .from(accountingLedger)
    .innerJoin(farmers, eq(farmers.id, accountingLedger.entityId))
    .where(
      and(
        eq(accountingLedger.tenantId, tenantId),
        eq(accountingLedger.entityType, 'farmer'),
        between(accountingLedger.transactionDate, startDate, endDate)
      )
    )
    .groupBy(farmers.id, farmers.name);

  return farmerProfits.map(farmer => ({
    ...farmer,
    totalPurchases: parseFloat(farmer.totalPurchases?.toString() || '0'),
    totalSales: parseFloat(farmer.totalSales?.toString() || '0'),
    commission: parseFloat(farmer.commission?.toString() || '0'),
    profit: parseFloat(farmer.totalSales?.toString() || '0') - parseFloat(farmer.totalPurchases?.toString() || '0') + parseFloat(farmer.commission?.toString() || '0'),
  }));
}

export async function analyzeProfitabilityByBuyer(tenantId: number, fiscalYear?: string, startDateParam?: string, endDateParam?: string) {
  // Use date range if provided, otherwise fall back to fiscal year
  let startDate: Date, endDate: Date;
  
  if (startDateParam && endDateParam) {
    startDate = new Date(startDateParam);
    endDate = new Date(endDateParam);
    console.log('📅 Using DATE RANGE mode for buyer profitability:', { startDate: startDateParam, endDate: endDateParam });
  } else {
    const currentFiscalYear = fiscalYear || getCurrentFiscalYear();
    const fiscalDates = getFiscalYearDates(currentFiscalYear);
    startDate = fiscalDates.startDate;
    endDate = fiscalDates.endDate;
    console.log('📅 Using FISCAL YEAR mode for buyer profitability:', { fiscalYear: currentFiscalYear });
  }

  const buyerProfits = await db
    .select({
      buyerId: buyers.id,
      buyerName: buyers.name,
      totalSales: sum(sql<number>`CASE WHEN account_head = 'sales' THEN CAST(credit_amount AS DECIMAL) ELSE 0 END`),
      serviceCharges: sum(sql<number>`CASE WHEN account_head = 'service_charges' THEN CAST(credit_amount AS DECIMAL) ELSE 0 END`),
    })
    .from(accountingLedger)
    .innerJoin(buyers, eq(buyers.id, accountingLedger.entityId))
    .where(
      and(
        eq(accountingLedger.tenantId, tenantId),
        eq(accountingLedger.entityType, 'buyer'),
        between(accountingLedger.transactionDate, startDate, endDate)
      )
    )
    .groupBy(buyers.id, buyers.name);

  return buyerProfits.map(buyer => ({
    ...buyer,
    totalSales: parseFloat(buyer.totalSales?.toString() || '0'),
    serviceCharges: parseFloat(buyer.serviceCharges?.toString() || '0'),
    totalRevenue: parseFloat(buyer.totalSales?.toString() || '0') + parseFloat(buyer.serviceCharges?.toString() || '0'),
  }));
}

// GST and tax compliance functions
export async function calculateGSTLiability(tenantId: number, fiscalYear?: string, startDateParam?: string, endDateParam?: string) {
  // Use date range if provided, otherwise fall back to fiscal year
  let startDate: Date, endDate: Date, currentFiscalYear: string;
  
  if (startDateParam && endDateParam) {
    startDate = new Date(startDateParam);
    endDate = new Date(endDateParam);
    currentFiscalYear = `Custom Range: ${startDateParam} to ${endDateParam}`;
    console.log('📅 Using DATE RANGE mode for GST liability:', { startDate: startDateParam, endDate: endDateParam });
  } else {
    currentFiscalYear = fiscalYear || getCurrentFiscalYear();
    const fiscalDates = getFiscalYearDates(currentFiscalYear);
    startDate = fiscalDates.startDate;
    endDate = fiscalDates.endDate;
    console.log('📅 Using FISCAL YEAR mode for GST liability:', { fiscalYear: currentFiscalYear });
  }

  // Get all tax invoices for the period
  const gstData = await db
    .select({
      totalSGST: sum(taxInvoices.sgst),
      totalCGST: sum(taxInvoices.cgst),
      totalCESS: sum(taxInvoices.cess),
    })
    .from(taxInvoices)
    .where(
      and(
        eq(taxInvoices.tenantId, tenantId),
        between(taxInvoices.invoiceDate, startDate, endDate)
      )
    );

  const totalSGST = parseFloat(gstData[0]?.totalSGST?.toString() || '0');
  const totalCGST = parseFloat(gstData[0]?.totalCGST?.toString() || '0');
  const totalCESS = parseFloat(gstData[0]?.totalCESS?.toString() || '0');

  return {
    fiscalYear: currentFiscalYear,
    sgst: totalSGST,
    cgst: totalCGST,
    totalGST: totalSGST + totalCGST,
    cess: totalCESS,
    totalTaxLiability: totalSGST + totalCGST + totalCESS,
  };
}

// Final accounts consolidation
export async function generateFinalAccounts(tenantId: number, fiscalYear?: string) {
  const currentFiscalYear = fiscalYear || getCurrentFiscalYear();
  
  try {
    const [profitLoss, balanceSheet, cashFlow, gstLiability] = await Promise.all([
      generateProfitLossReport(tenantId, currentFiscalYear),
      generateBalanceSheet(tenantId, currentFiscalYear),
      generateCashFlowReport(tenantId, currentFiscalYear),
      calculateGSTLiability(tenantId, currentFiscalYear),
    ]);

  // Check if final accounts already exist for this fiscal year
  const existingAccounts = await db
    .select()
    .from(finalAccounts)
    .where(
      and(
        eq(finalAccounts.tenantId, tenantId),
        eq(finalAccounts.fiscalYear, currentFiscalYear)
      )
    );

  const finalAccountsData = {
    tenantId,
    fiscalYear: currentFiscalYear,
    
    // Profit & Loss
    totalSales: profitLoss.totalSales.toString(),
    totalPurchases: profitLoss.totalPurchases.toString(),
    grossProfit: profitLoss.grossProfit.toString(),
    commissionIncome: profitLoss.commissionIncome.toString(),
    serviceCharges: profitLoss.serviceCharges.toString(),
    totalIncome: profitLoss.totalIncome.toString(),
    totalExpenses: profitLoss.totalExpenses.toString(),
    netProfit: profitLoss.netProfit.toString(),
    
    // Balance Sheet
    cash: balanceSheet.cash.toString(),
    bankBalance: balanceSheet.bankBalance.toString(),
    accountsReceivable: balanceSheet.accountsReceivable.toString(),
    totalAssets: balanceSheet.totalAssets.toString(),
    accountsPayable: balanceSheet.accountsPayable.toString(),
    totalLiabilities: balanceSheet.totalLiabilities.toString(),
    netWorth: balanceSheet.netWorth.toString(),
    
    // Tax Information
    gstPayable: gstLiability.totalGST.toString(),
    cessPayable: gstLiability.cess.toString(),
    
    periodStartDate: profitLoss.periodStartDate,
    periodEndDate: profitLoss.periodEndDate,
  };

  if (existingAccounts.length > 0) {
    // Update existing record
    await db
      .update(finalAccounts)
      .set({ ...finalAccountsData, updatedAt: new Date() })
      .where(
        and(
          eq(finalAccounts.tenantId, tenantId),
          eq(finalAccounts.fiscalYear, currentFiscalYear)
        )
      );
  } else {
    // Create new record
    await db.insert(finalAccounts).values(finalAccountsData);
  }

    return {
      ...finalAccountsData,
      profitLoss,
      balanceSheet,
      cashFlow,
      gstLiability,
    };
  } catch (error) {
    console.error("Error generating final accounts:", error);
    
    // Return default values if database tables don't exist yet
    const { startDate, endDate } = getFiscalYearDates(currentFiscalYear);
    return {
      tenantId,
      fiscalYear: currentFiscalYear,
      periodStartDate: startDate,
      periodEndDate: endDate,
      totalSales: "0",
      totalPurchases: "0",
      grossProfit: "0",
      commissionIncome: "0",
      serviceCharges: "0",
      totalIncome: "0",
      totalExpenses: "0",
      netProfit: "0",
      cash: "0",
      bankBalance: "0",
      accountsReceivable: "0",
      totalAssets: "0",
      accountsPayable: "0",
      totalLiabilities: "0",
      netWorth: "0",
      gstPayable: "0",
      cessPayable: "0",
      cashFlow: {
        cashIn: { paymentReceived: "0", otherIncome: "0", total: "0" },
        cashOut: { paymentMade: "0", expenses: "0", total: "0" },
        netCashFlow: "0"
      },
      profitLoss: {
        totalSales: 0,
        totalPurchases: 0,
        grossProfit: 0,
        commissionIncome: 0,
        serviceCharges: 0,
        totalIncome: 0,
        totalExpenses: 0,
        netProfit: 0,
        fiscalYear: currentFiscalYear,
        periodStartDate: startDate,
        periodEndDate: endDate,
      },
      balanceSheet: {
        cash: 0,
        bankBalance: 0,
        accountsReceivable: 0,
        totalAssets: 0,
        accountsPayable: 0,
        totalLiabilities: 0,
        netWorth: 0,
        gstPayable: 0,
        cessPayable: 0,
      },
      gstLiability: {
        sgst: 0,
        cgst: 0,
        totalGST: 0,
        cess: 0,
        totalTaxLiability: 0,
        fiscalYear: currentFiscalYear,
        periodStartDate: startDate,
        periodEndDate: endDate,
      },
    };
  }
}