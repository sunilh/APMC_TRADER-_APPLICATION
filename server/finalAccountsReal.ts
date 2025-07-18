import { db } from "./db";
import { sql } from "drizzle-orm";
import { getCurrentFiscalYear } from "./accounting";

export async function getTradingDetails(tenantId: number, startDate?: string, endDate?: string, fiscalYear?: string) {
  try {
    let buyerInvoicesData;
    let farmerBillsData;

    if (startDate && endDate) {
      // Date range query
      buyerInvoicesData = await db.execute(sql`
        SELECT 
          ti.buyer_id,
          b.name as buyer_name,
          ti.invoice_number,
          ti.invoice_date,
          ti.basic_amount,
          ti.total_amount,
          ti.sgst,
          ti.cgst,
          ti.cess,
          (ti.sgst + ti.cgst + ti.cess) as total_taxes_collected
        FROM tax_invoices ti
        JOIN buyers b ON ti.buyer_id = b.id
        WHERE ti.tenant_id = ${tenantId} 
        AND DATE(ti.invoice_date) BETWEEN ${startDate} AND ${endDate}
        ORDER BY ti.invoice_date DESC
      `);

      farmerBillsData = await db.execute(sql`
        SELECT 
          fb.farmer_id,
          f.name as farmer_name,
          fb.patti_number,
          fb.bill_date,
          fb.total_amount as gross_amount,
          fb.hamali,
          fb.vehicle_rent,
          fb.empty_bag_charges,
          fb.advance,
          fb.rok,
          fb.other_charges as other_deductions,
          fb.net_payable,
          (fb.total_amount - fb.net_payable) as total_deductions
        FROM farmer_bills fb
        JOIN farmers f ON fb.farmer_id = f.id
        WHERE fb.tenant_id = ${tenantId} 
        AND DATE(fb.bill_date) BETWEEN ${startDate} AND ${endDate}
        ORDER BY fb.bill_date DESC
      `);
    } else if (fiscalYear) {
      // Fiscal year query
      const year = parseInt(fiscalYear.split('-')[0]);
      buyerInvoicesData = await db.execute(sql`
        SELECT 
          ti.buyer_id,
          b.name as buyer_name,
          ti.invoice_number,
          ti.invoice_date,
          ti.basic_amount,
          ti.total_amount,
          ti.sgst,
          ti.cgst,
          ti.cess,
          (ti.sgst + ti.cgst + ti.cess) as total_taxes_collected
        FROM tax_invoices ti
        JOIN buyers b ON ti.buyer_id = b.id
        WHERE ti.tenant_id = ${tenantId} 
        AND EXTRACT(YEAR FROM ti.invoice_date) = ${year}
        ORDER BY ti.invoice_date DESC
      `);

      farmerBillsData = await db.execute(sql`
        SELECT 
          fb.farmer_id,
          f.name as farmer_name,
          fb.patti_number,
          fb.bill_date,
          fb.total_amount as gross_amount,
          fb.hamali,
          fb.vehicle_rent,
          fb.empty_bag_charges,
          fb.advance,
          fb.rok,
          fb.other_charges as other_deductions,
          fb.net_payable,
          (fb.total_amount - fb.net_payable) as total_deductions
        FROM farmer_bills fb
        JOIN farmers f ON fb.farmer_id = f.id
        WHERE fb.tenant_id = ${tenantId} 
        AND EXTRACT(YEAR FROM fb.bill_date) = ${year}
        ORDER BY fb.bill_date DESC
      `);
    } else {
      // All data for tenant
      buyerInvoicesData = await db.execute(sql`
        SELECT 
          ti.buyer_id,
          b.name as buyer_name,
          ti.invoice_number,
          ti.invoice_date,
          ti.basic_amount,
          ti.total_amount,
          ti.sgst,
          ti.cgst,
          ti.cess,
          (ti.sgst + ti.cgst + ti.cess) as total_taxes_collected
        FROM tax_invoices ti
        JOIN buyers b ON ti.buyer_id = b.id
        WHERE ti.tenant_id = ${tenantId}
        ORDER BY ti.invoice_date DESC
      `);

      farmerBillsData = await db.execute(sql`
        SELECT 
          fb.farmer_id,
          f.name as farmer_name,
          fb.patti_number,
          fb.bill_date,
          fb.total_amount as gross_amount,
          fb.hamali,
          fb.vehicle_rent,
          fb.empty_bag_charges,
          fb.advance,
          fb.rok,
          fb.other_charges as other_deductions,
          fb.net_payable,
          (fb.total_amount - fb.net_payable) as total_deductions
        FROM farmer_bills fb
        JOIN farmers f ON fb.farmer_id = f.id
        WHERE fb.tenant_id = ${tenantId}
        ORDER BY fb.bill_date DESC
      `);
    }

    // Calculate totals
    const buyerInvoices = buyerInvoicesData.rows.map(row => ({
      buyer_id: row.buyer_id,
      buyer_name: row.buyer_name,
      invoice_number: row.invoice_number,
      invoice_date: row.invoice_date,
      basic_amount: parseFloat(row.basic_amount || '0'),
      total_amount: parseFloat(row.total_amount || '0'),
      sgst: parseFloat(row.sgst || '0'),
      cgst: parseFloat(row.cgst || '0'),
      cess: parseFloat(row.cess || '0'),
      total_taxes_collected: parseFloat(row.total_taxes_collected || '0')
    }));

    const farmerBills = farmerBillsData.rows.map(row => ({
      farmer_id: row.farmer_id,
      farmer_name: row.farmer_name,
      patti_number: row.patti_number,
      bill_date: row.bill_date,
      gross_amount: parseFloat(row.gross_amount || '0'),
      hamali: parseFloat(row.hamali || '0'),
      vehicle_rent: parseFloat(row.vehicle_rent || '0'),
      empty_bag_charges: parseFloat(row.empty_bag_charges || '0'),
      advance: parseFloat(row.advance || '0'),
      rok: parseFloat(row.rok || '0'),
      other_deductions: parseFloat(row.other_deductions || '0'),
      net_payable: parseFloat(row.net_payable || '0'),
      total_deductions: parseFloat(row.total_deductions || '0')
    }));

    // Calculate summary totals
    const totalCashInflow = buyerInvoices.reduce((sum, invoice) => sum + invoice.total_amount, 0);
    const totalBasicAmount = buyerInvoices.reduce((sum, invoice) => sum + invoice.basic_amount, 0);
    const totalTaxesCollected = buyerInvoices.reduce((sum, invoice) => sum + invoice.total_taxes_collected, 0);
    const totalGSTCollected = buyerInvoices.reduce((sum, invoice) => sum + invoice.sgst + invoice.cgst, 0);
    const totalCessCollected = buyerInvoices.reduce((sum, invoice) => sum + invoice.cess, 0);
    
    const totalCashOutflow = farmerBills.reduce((sum, bill) => sum + bill.net_payable, 0);
    const totalGrossAmount = farmerBills.reduce((sum, bill) => sum + bill.gross_amount, 0);
    const totalDeductions = farmerBills.reduce((sum, bill) => sum + bill.total_deductions, 0);
    
    // Calculate individual deduction components
    const totalHamali = farmerBills.reduce((sum, bill) => sum + bill.hamali, 0);
    const totalVehicleRent = farmerBills.reduce((sum, bill) => sum + bill.vehicle_rent, 0);
    const totalEmptyBags = farmerBills.reduce((sum, bill) => sum + bill.empty_bag_charges, 0);
    const totalAdvance = farmerBills.reduce((sum, bill) => sum + bill.advance, 0);
    const totalRok = farmerBills.reduce((sum, bill) => sum + bill.rok, 0);
    const totalOther = farmerBills.reduce((sum, bill) => sum + bill.other_deductions, 0);
    
    // Cash difference and net profit calculations
    const cashDifference = totalCashInflow - totalCashOutflow;
    
    // Net profit is the trading margin (total deductions from farmers)
    // This represents the trader's actual profit from operations
    const netProfit = totalDeductions;
    
    // Additional accounting features
    const avgProfitPerTransaction = buyerInvoices.length > 0 ? netProfit / buyerInvoices.length : 0;
    const avgDealSize = buyerInvoices.length > 0 ? totalCashInflow / buyerInvoices.length : 0;
    const profitMarginPercent = totalCashInflow > 0 ? (netProfit / totalCashInflow) * 100 : 0;
    
    // Tax calculations for compliance
    const taxLiability = {
      sgst_collected: buyerInvoices.reduce((sum, invoice) => sum + invoice.sgst, 0),
      cgst_collected: buyerInvoices.reduce((sum, invoice) => sum + invoice.cgst, 0),
      cess_collected: buyerInvoices.reduce((sum, invoice) => sum + invoice.cess, 0),
      total_tax_liability: totalTaxesCollected
    };

    // Outstanding tracking
    const pendingPayments = {
      buyers_pending: 0, // Would need payment tracking
      farmers_pending: 0, // Would need payment tracking
      advance_adjustments: totalAdvance
    };

    // Daily trading statistics
    const dailyStats = {
      total_lots_traded: farmerBills.length,
      total_farmers_paid: farmerBills.length,
      total_buyers_invoiced: buyerInvoices.length,
      avg_profit_per_lot: farmerBills.length > 0 ? netProfit / farmerBills.length : 0
    };

    return {
      summary: {
        total_cash_inflow: totalCashInflow,
        total_basic_amount: totalBasicAmount,
        total_taxes_collected: totalTaxesCollected,
        total_gst_collected: totalGSTCollected,
        total_cess_collected: totalCessCollected,
        total_cash_outflow: totalCashOutflow,
        total_gross_amount: totalGrossAmount,
        total_deductions: totalDeductions,
        cash_difference: cashDifference,
        net_profit: netProfit,
        profit_margin_percent: profitMarginPercent,
        avg_deal_size: avgDealSize,
        avg_profit_per_transaction: avgProfitPerTransaction
      },
      trading_margin_breakdown: {
        hamali: totalHamali,
        vehicle_rent: totalVehicleRent,
        empty_bags: totalEmptyBags,
        advance: totalAdvance,
        rok_commission: totalRok,
        other: totalOther,
        total: totalDeductions
      },
      tax_liability: taxLiability,
      pending_payments: pendingPayments,
      daily_stats: dailyStats,
      buyer_invoices: buyerInvoices,
      farmer_bills: farmerBills
    };
  } catch (error) {
    console.error('Error getting trading details:', error);
    throw error;
  }
}

export async function getSimpleFinalAccounts(tenantId: number, fiscalYear: string) {
  try {
    // Use the new trading details for consistent calculation
    const tradingData = await getTradingDetails(tenantId, undefined, undefined, fiscalYear);

    // Get GST data from actual tax invoices only
    const gstData = await db.execute(sql`
      SELECT 
        COALESCE(SUM(sgst), 0) as total_sgst,
        COALESCE(SUM(cgst), 0) as total_cgst,
        COALESCE(SUM(cess), 0) as total_cess
      FROM tax_invoices 
      WHERE tenant_id = ${tenantId} 
      AND EXTRACT(YEAR FROM invoice_date) = EXTRACT(YEAR FROM CURRENT_DATE)
    `);

    const gstRow = gstData.rows[0] as any;
    const sgst = parseFloat(gstRow.total_sgst || '0');
    const cgst = parseFloat(gstRow.total_cgst || '0');
    const cess = parseFloat(gstRow.total_cess || '0');

    // Get real balance sheet data from accounting ledger - NO MOCK DATA
    // Fix sign conventions: Assets use debit-credit, Liabilities use credit-debit
    const balanceData = await db.execute(sql`
      SELECT 
        COALESCE(SUM(CASE WHEN account_head = 'cash' THEN (debit_amount - credit_amount) ELSE 0 END), 0) as cash,
        COALESCE(SUM(CASE WHEN account_head = 'bank' THEN (debit_amount - credit_amount) ELSE 0 END), 0) as bank_balance,
        COALESCE(SUM(CASE WHEN account_head = 'accounts_receivable' THEN (debit_amount - credit_amount) ELSE 0 END), 0) as accounts_receivable,
        COALESCE(SUM(CASE WHEN account_head = 'accounts_payable' THEN (credit_amount - debit_amount) ELSE 0 END), 0) as accounts_payable
      FROM accounting_ledger 
      WHERE tenant_id = ${tenantId} AND fiscal_year = ${fiscalYear}
    `);

    const balanceRow = balanceData.rows[0] as any;
    const cash = parseFloat(balanceRow.cash || '0');
    const bankBalance = parseFloat(balanceRow.bank_balance || '0');
    const accountsReceivable = parseFloat(balanceRow.accounts_receivable || '0');
    const accountsPayable = parseFloat(balanceRow.accounts_payable || '0');

    // Fix sign handling for liabilities (they should be positive values)
    const correctAccountsPayable = Math.abs(accountsPayable);
    const gstPayable = sgst + cgst;
    const totalLiabilities = correctAccountsPayable + gstPayable + cess;

    // Calculate missing variables from trading data
    const totalSales = tradingData.summary.total_basic_amount;
    const totalPurchases = tradingData.summary.total_cash_outflow;
    const grossProfit = totalSales - totalPurchases;
    const commissionIncome = tradingData.trading_margin_breakdown.rok_commission;
    const serviceCharges = tradingData.trading_margin_breakdown.hamali + tradingData.trading_margin_breakdown.vehicle_rent;
    const totalRevenue = totalSales + commissionIncome + serviceCharges;
    const operatingExpenses = tradingData.trading_margin_breakdown.other;
    const bankCharges = 0; // No bank charges in current data
    const farmerPayments = tradingData.summary.total_cash_outflow;
    const totalExpenses = operatingExpenses + bankCharges + farmerPayments;
    const netProfit = tradingData.summary.net_profit;

    return {
      tenantId,
      fiscalYear,
      totalSales,
      totalPurchases,
      grossProfit,
      commissionIncome,
      serviceCharges,
      totalIncome: totalRevenue,
      operatingExpenses,
      bankCharges,
      farmerPayments,
      totalExpenses,
      netProfit,
      cash,
      bankBalance,
      accountsReceivable,
      totalAssets: cash + bankBalance + accountsReceivable,
      accountsPayable: correctAccountsPayable,
      totalLiabilities,
      netWorth: (cash + bankBalance + accountsReceivable) - totalLiabilities,
      gstPayable,
      cessPayable: cess,
      gstLiability: {
        sgst,
        cgst,
        cess,
        totalTaxLiability: sgst + cgst + cess
      }
    };
  } catch (error) {
    console.error("Error calculating final accounts:", error);
    throw error;
  }
}

// Date range version of final accounts - AUTHENTIC DATA ONLY
export async function getSimpleFinalAccountsDateRange(tenantId: number, startDate: Date, endDate: Date) {
  try {
    // Format dates for SQL
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];
    
    // Calculate totals directly from actual data for date range
    const salesData = await db.execute(sql`
      SELECT 
        COALESCE(SUM(CASE WHEN account_head = 'sales' THEN credit_amount ELSE 0 END), 0) as total_sales,
        COALESCE(SUM(CASE WHEN account_head = 'commission_income' THEN credit_amount ELSE 0 END), 0) as commission_income,
        COALESCE(SUM(CASE WHEN account_head = 'service_charges' THEN credit_amount ELSE 0 END), 0) as service_charges,
        COALESCE(SUM(CASE WHEN account_head = 'purchases' THEN debit_amount ELSE 0 END), 0) as total_purchases,
        COALESCE(SUM(CASE WHEN account_head = 'operating_expenses' THEN debit_amount ELSE 0 END), 0) as operating_expenses,
        COALESCE(SUM(CASE WHEN account_head = 'bank_charges' THEN debit_amount ELSE 0 END), 0) as bank_charges,
        COALESCE(SUM(CASE WHEN account_head = 'accounts_payable' THEN debit_amount ELSE 0 END), 0) as farmer_payments
      FROM accounting_ledger 
      WHERE tenant_id = ${tenantId} 
      AND transaction_date >= ${startDateStr}
      AND transaction_date <= ${endDateStr}
    `);

    const row = salesData.rows[0] as any;
    const totalSales = parseFloat(row.total_sales || '0');
    const commissionIncome = parseFloat(row.commission_income || '0');
    const serviceCharges = parseFloat(row.service_charges || '0');
    const totalPurchases = parseFloat(row.total_purchases || '0');
    const operatingExpenses = parseFloat(row.operating_expenses || '0');
    const bankCharges = parseFloat(row.bank_charges || '0');
    const farmerPayments = parseFloat(row.farmer_payments || '0');

    const totalRevenue = totalSales + commissionIncome + serviceCharges;
    const totalExpenses = operatingExpenses + bankCharges + farmerPayments;
    const grossProfit = totalSales - totalPurchases;
    // Net profit = Total Income - All Expenses (including farmer payments)
    const netProfit = totalRevenue - totalExpenses - totalPurchases;

    // Get GST data for date range - AUTHENTIC DATA ONLY
    console.log(`🔍 GST Query Debug: tenantId=${tenantId}, startDate=${startDateStr}, endDate=${endDateStr}`);
    const gstData = await db.execute(sql`
      SELECT 
        COALESCE(SUM(sgst), 0) as total_sgst,
        COALESCE(SUM(cgst), 0) as total_cgst,
        COALESCE(SUM(cess), 0) as total_cess
      FROM tax_invoices 
      WHERE tenant_id = ${tenantId} 
      AND DATE(invoice_date) >= ${startDateStr}
      AND DATE(invoice_date) <= ${endDateStr}
    `);
    console.log(`📊 GST Data Result:`, gstData.rows[0]);

    const gstRow = gstData.rows[0] as any;
    const sgst = parseFloat(gstRow.total_sgst || '0');
    const cgst = parseFloat(gstRow.total_cgst || '0');
    const cess = parseFloat(gstRow.total_cess || '0');

    // Get real balance sheet data from accounting ledger for date range - NO MOCK DATA
    // Fixed sign conventions: Assets use debit-credit, Liabilities use credit-debit
    const balanceData = await db.execute(sql`
      SELECT 
        COALESCE(SUM(CASE WHEN account_head = 'cash' THEN (debit_amount - credit_amount) ELSE 0 END), 0) as cash,
        COALESCE(SUM(CASE WHEN account_head = 'bank' THEN (debit_amount - credit_amount) ELSE 0 END), 0) as bank_balance,
        COALESCE(SUM(CASE WHEN account_head = 'accounts_receivable' THEN (debit_amount - credit_amount) ELSE 0 END), 0) as accounts_receivable,
        COALESCE(SUM(CASE WHEN account_head = 'accounts_payable' THEN (credit_amount - debit_amount) ELSE 0 END), 0) as accounts_payable
      FROM accounting_ledger 
      WHERE tenant_id = ${tenantId} 
      AND transaction_date >= ${startDateStr}
      AND transaction_date <= ${endDateStr}
    `);

    const balanceRow = balanceData.rows[0] as any;
    const cash = parseFloat(balanceRow.cash || '0');
    const bankBalance = parseFloat(balanceRow.bank_balance || '0');
    const accountsReceivable = parseFloat(balanceRow.accounts_receivable || '0');
    const accountsPayable = parseFloat(balanceRow.accounts_payable || '0');

    // Fix sign handling for liabilities (they should be positive values)
    const correctAccountsPayable = Math.abs(accountsPayable);
    const gstPayable = sgst + cgst;
    const totalLiabilities = correctAccountsPayable + gstPayable + cess;

    return {
      tenantId,
      fiscalYear: `Custom Range: ${startDateStr} to ${endDateStr}`,
      periodStartDate: startDate,
      periodEndDate: endDate,
      totalSales,
      totalPurchases,
      grossProfit,
      commissionIncome,
      serviceCharges,
      totalIncome: totalRevenue,
      operatingExpenses,
      bankCharges,
      farmerPayments,
      totalExpenses,
      netProfit,
      cash,
      bankBalance,
      accountsReceivable,
      totalAssets: cash + bankBalance + accountsReceivable,
      accountsPayable: correctAccountsPayable,
      totalLiabilities,
      netWorth: (cash + bankBalance + accountsReceivable) - totalLiabilities,
      gstPayable,
      cessPayable: cess,
      gstLiability: {
        sgst,
        cgst,
        cess,
        totalTaxLiability: sgst + cgst + cess
      }
    };
  } catch (error) {
    console.error("Error calculating final accounts for date range:", error);
    throw error;
  }
}