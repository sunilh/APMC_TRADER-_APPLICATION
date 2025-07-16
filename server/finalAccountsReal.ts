import { db } from "./db";
import { sql } from "drizzle-orm";
import { getCurrentFiscalYear } from "./accounting";

export async function getSimpleFinalAccounts(tenantId: number, fiscalYear: string) {
  try {
    // Calculate totals directly from actual data only
    const salesData = await db.execute(sql`
      SELECT 
        COALESCE(SUM(CASE WHEN account_head = 'sales' THEN credit_amount ELSE 0 END), 0) as total_sales,
        COALESCE(SUM(CASE WHEN account_head = 'commission_income' THEN credit_amount ELSE 0 END), 0) as commission_income,
        COALESCE(SUM(CASE WHEN account_head = 'service_charges' THEN credit_amount ELSE 0 END), 0) as service_charges,
        COALESCE(SUM(CASE WHEN account_head = 'purchases' THEN debit_amount ELSE 0 END), 0) as total_purchases,
        COALESCE(SUM(CASE WHEN account_head = 'operating_expenses' THEN debit_amount ELSE 0 END), 0) as operating_expenses,
        COALESCE(SUM(CASE WHEN account_head = 'bank_charges' THEN debit_amount ELSE 0 END), 0) as bank_charges
      FROM accounting_ledger 
      WHERE tenant_id = ${tenantId} AND fiscal_year = ${fiscalYear}
    `);

    const row = salesData.rows[0] as any;
    const totalSales = parseFloat(row.total_sales || '0');
    const commissionIncome = parseFloat(row.commission_income || '0');
    const serviceCharges = parseFloat(row.service_charges || '0');
    const totalPurchases = parseFloat(row.total_purchases || '0');
    const operatingExpenses = parseFloat(row.operating_expenses || '0');
    const bankCharges = parseFloat(row.bank_charges || '0');

    const totalRevenue = totalSales + commissionIncome + serviceCharges;
    const totalExpenses = operatingExpenses + bankCharges;
    const grossProfit = totalSales - totalPurchases;
    const netProfit = totalRevenue - totalExpenses - totalPurchases;

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
    const balanceData = await db.execute(sql`
      SELECT 
        COALESCE(SUM(CASE WHEN account_head = 'cash' THEN (credit_amount - debit_amount) ELSE 0 END), 0) as cash,
        COALESCE(SUM(CASE WHEN account_head = 'bank' THEN (credit_amount - debit_amount) ELSE 0 END), 0) as bank_balance,
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
      totalExpenses,
      netProfit,
      cash,
      bankBalance,
      accountsReceivable,
      totalAssets: cash + bankBalance + accountsReceivable,
      accountsPayable,
      totalLiabilities: accountsPayable,
      netWorth: (cash + bankBalance + accountsReceivable) - accountsPayable,
      gstPayable: sgst + cgst,
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
        COALESCE(SUM(CASE WHEN account_head = 'bank_charges' THEN debit_amount ELSE 0 END), 0) as bank_charges
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

    const totalRevenue = totalSales + commissionIncome + serviceCharges;
    const totalExpenses = operatingExpenses + bankCharges;
    const grossProfit = totalSales - totalPurchases;
    const netProfit = totalRevenue - totalExpenses - totalPurchases;

    // Get GST data for date range - AUTHENTIC DATA ONLY
    const gstData = await db.execute(sql`
      SELECT 
        COALESCE(SUM(sgst), 0) as total_sgst,
        COALESCE(SUM(cgst), 0) as total_cgst,
        COALESCE(SUM(cess), 0) as total_cess
      FROM tax_invoices 
      WHERE tenant_id = ${tenantId} 
      AND invoice_date >= ${startDateStr}
      AND invoice_date <= ${endDateStr}
    `);

    const gstRow = gstData.rows[0] as any;
    const sgst = parseFloat(gstRow.total_sgst || '0');
    const cgst = parseFloat(gstRow.total_cgst || '0');
    const cess = parseFloat(gstRow.total_cess || '0');

    // Get real balance sheet data from accounting ledger for date range - NO MOCK DATA
    const balanceData = await db.execute(sql`
      SELECT 
        COALESCE(SUM(CASE WHEN account_head = 'cash' THEN (credit_amount - debit_amount) ELSE 0 END), 0) as cash,
        COALESCE(SUM(CASE WHEN account_head = 'bank' THEN (credit_amount - debit_amount) ELSE 0 END), 0) as bank_balance,
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
      totalExpenses,
      netProfit,
      cash,
      bankBalance,
      accountsReceivable,
      totalAssets: cash + bankBalance + accountsReceivable,
      accountsPayable,
      totalLiabilities: accountsPayable,
      netWorth: (cash + bankBalance + accountsReceivable) - accountsPayable,
      gstPayable: sgst + cgst,
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