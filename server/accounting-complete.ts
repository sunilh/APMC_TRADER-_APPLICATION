import { db } from "./db";
import { sql } from "drizzle-orm";

// Complete Accounting System Implementation

// 1. LEDGER FUNCTIONS - Detailed transaction tracking
export async function getLedgerEntries(tenantId: number, startDate?: string, endDate?: string) {
  try {
    let query = sql`
      SELECT 
        al.id,
        al.transaction_date,
        al.account_head,
        al.description,
        al.debit_amount,
        al.credit_amount,
        al.reference_type,
        al.reference_id,
        al.created_at
      FROM accounting_ledger al
      WHERE al.tenant_id = ${tenantId}
    `;

    if (startDate && endDate) {
      query = sql`${query} AND DATE(al.transaction_date) BETWEEN ${startDate} AND ${endDate}`;
    }

    query = sql`${query} ORDER BY al.transaction_date DESC, al.created_at DESC`;

    const result = await db.execute(query);
    
    return result.rows.map(row => ({
      id: row.id,
      date: row.transaction_date,
      account: row.account_head,
      description: row.description,
      debit: parseFloat(row.debit_amount || '0'),
      credit: parseFloat(row.credit_amount || '0'),
      reference_type: row.reference_type,
      reference_id: row.reference_id,
      created_at: row.created_at
    }));
  } catch (error) {
    console.error('Error getting ledger entries:', error);
    throw error;
  }
}

// 2. BALANCE SHEET FUNCTIONS - Financial position tracking
export async function getBalanceSheet(tenantId: number, asOfDate?: string) {
  try {
    const dateFilter = asOfDate ? 
      sql`AND DATE(al.transaction_date) <= ${asOfDate}` : 
      sql``;

    // Assets calculation
    const assetsQuery = await db.execute(sql`
      SELECT 
        COALESCE(SUM(CASE WHEN account_head = 'cash' THEN (debit_amount - credit_amount) ELSE 0 END), 0) as cash,
        COALESCE(SUM(CASE WHEN account_head = 'bank' THEN (debit_amount - credit_amount) ELSE 0 END), 0) as bank_balance,
        COALESCE(SUM(CASE WHEN account_head = 'accounts_receivable' THEN (debit_amount - credit_amount) ELSE 0 END), 0) as accounts_receivable,
        COALESCE(SUM(CASE WHEN account_head = 'inventory' THEN (debit_amount - credit_amount) ELSE 0 END), 0) as inventory,
        COALESCE(SUM(CASE WHEN account_head = 'fixed_assets' THEN (debit_amount - credit_amount) ELSE 0 END), 0) as fixed_assets
      FROM accounting_ledger al
      WHERE al.tenant_id = ${tenantId} ${dateFilter}
    `);

    // Liabilities calculation
    const liabilitiesQuery = await db.execute(sql`
      SELECT 
        COALESCE(SUM(CASE WHEN account_head = 'accounts_payable' THEN (credit_amount - debit_amount) ELSE 0 END), 0) as accounts_payable,
        COALESCE(SUM(CASE WHEN account_head = 'gst_payable' THEN (credit_amount - debit_amount) ELSE 0 END), 0) as gst_payable,
        COALESCE(SUM(CASE WHEN account_head = 'cess_payable' THEN (credit_amount - debit_amount) ELSE 0 END), 0) as cess_payable,
        COALESCE(SUM(CASE WHEN account_head = 'loans' THEN (credit_amount - debit_amount) ELSE 0 END), 0) as loans
      FROM accounting_ledger al
      WHERE al.tenant_id = ${tenantId} ${dateFilter}
    `);

    const assets = assetsQuery.rows[0] as any;
    const liabilities = liabilitiesQuery.rows[0] as any;

    const totalAssets = parseFloat(assets.cash || '0') + 
                       parseFloat(assets.bank_balance || '0') + 
                       parseFloat(assets.accounts_receivable || '0') + 
                       parseFloat(assets.inventory || '0') + 
                       parseFloat(assets.fixed_assets || '0');

    const totalLiabilities = parseFloat(liabilities.accounts_payable || '0') + 
                            parseFloat(liabilities.gst_payable || '0') + 
                            parseFloat(liabilities.cess_payable || '0') + 
                            parseFloat(liabilities.loans || '0');

    const netWorth = totalAssets - totalLiabilities;

    return {
      assets: {
        cash: parseFloat(assets.cash || '0'),
        bank_balance: parseFloat(assets.bank_balance || '0'),
        accounts_receivable: parseFloat(assets.accounts_receivable || '0'),
        inventory: parseFloat(assets.inventory || '0'),
        fixed_assets: parseFloat(assets.fixed_assets || '0'),
        total: totalAssets
      },
      liabilities: {
        accounts_payable: parseFloat(liabilities.accounts_payable || '0'),
        gst_payable: parseFloat(liabilities.gst_payable || '0'),
        cess_payable: parseFloat(liabilities.cess_payable || '0'),
        loans: parseFloat(liabilities.loans || '0'),
        total: totalLiabilities
      },
      net_worth: netWorth,
      as_of_date: asOfDate || new Date().toISOString().split('T')[0]
    };
  } catch (error) {
    console.error('Error getting balance sheet:', error);
    throw error;
  }
}

// 3. EXPENSE TRACKING FUNCTIONS - Business cost management
export async function getExpensesSummary(tenantId: number, startDate?: string, endDate?: string) {
  try {
    let query = sql`
      SELECT 
        e.category,
        e.subcategory,
        SUM(e.amount) as total_amount,
        COUNT(*) as transaction_count
      FROM expenses e
      WHERE e.tenant_id = ${tenantId}
    `;

    if (startDate && endDate) {
      query = sql`${query} AND DATE(e.expense_date) BETWEEN ${startDate} AND ${endDate}`;
    }

    query = sql`${query} GROUP BY e.category, e.subcategory ORDER BY e.category, total_amount DESC`;

    const result = await db.execute(query);
    
    const expenses = result.rows.map(row => ({
      category: row.category,
      subcategory: row.subcategory,
      total_amount: parseFloat(row.total_amount || '0'),
      transaction_count: parseInt(row.transaction_count || '0')
    }));

    // Calculate category totals
    const categoryTotals = expenses.reduce((acc, expense) => {
      if (!acc[expense.category]) {
        acc[expense.category] = 0;
      }
      acc[expense.category] += expense.total_amount;
      return acc;
    }, {} as Record<string, number>);

    const totalExpenses = Object.values(categoryTotals).reduce((sum, amount) => sum + amount, 0);

    return {
      expenses,
      category_totals: categoryTotals,
      total_expenses: totalExpenses
    };
  } catch (error) {
    console.error('Error getting expenses summary:', error);
    throw error;
  }
}

export async function getDetailedExpenses(tenantId: number, startDate?: string, endDate?: string) {
  try {
    let query = sql`
      SELECT 
        e.id,
        e.expense_date,
        e.category,
        e.subcategory,
        e.description,
        e.amount,
        e.payment_method,
        e.receipt_number,
        e.vendor_name,
        e.created_at
      FROM expenses e
      WHERE e.tenant_id = ${tenantId}
    `;

    if (startDate && endDate) {
      query = sql`${query} AND DATE(e.expense_date) BETWEEN ${startDate} AND ${endDate}`;
    }

    query = sql`${query} ORDER BY e.expense_date DESC, e.created_at DESC`;

    const result = await db.execute(query);
    
    return result.rows.map(row => ({
      id: row.id,
      date: row.expense_date,
      category: row.category,
      subcategory: row.subcategory,
      description: row.description,
      amount: parseFloat(row.amount || '0'),
      payment_method: row.payment_method,
      receipt_number: row.receipt_number,
      vendor_name: row.vendor_name,
      created_at: row.created_at
    }));
  } catch (error) {
    console.error('Error getting detailed expenses:', error);
    throw error;
  }
}

// 4. COMPREHENSIVE PROFIT & LOSS - True business profitability
export async function getComprehensiveProfitLoss(tenantId: number, startDate?: string, endDate?: string) {
  try {
    // Get trading revenue and costs
    const tradingQuery = await db.execute(sql`
      SELECT 
        COALESCE(SUM(CASE WHEN account_head = 'sales' THEN credit_amount ELSE 0 END), 0) as total_sales,
        COALESCE(SUM(CASE WHEN account_head = 'purchase' THEN debit_amount ELSE 0 END), 0) as total_purchases,
        COALESCE(SUM(CASE WHEN account_head = 'commission_income' THEN credit_amount ELSE 0 END), 0) as commission_income
      FROM accounting_ledger al
      WHERE al.tenant_id = ${tenantId}
      ${startDate && endDate ? sql`AND DATE(al.transaction_date) BETWEEN ${startDate} AND ${endDate}` : sql``}
    `);

    // Get total expenses
    const expenseQuery = await db.execute(sql`
      SELECT COALESCE(SUM(amount), 0) as total_expenses
      FROM expenses e
      WHERE e.tenant_id = ${tenantId}
      ${startDate && endDate ? sql`AND DATE(e.expense_date) BETWEEN ${startDate} AND ${endDate}` : sql``}
    `);

    const trading = tradingQuery.rows[0] as any;
    const expenses = expenseQuery.rows[0] as any;

    const totalSales = parseFloat(trading.total_sales || '0');
    const totalPurchases = parseFloat(trading.total_purchases || '0');
    const commissionIncome = parseFloat(trading.commission_income || '0');
    const totalExpenses = parseFloat(expenses.total_expenses || '0');

    const grossProfit = totalSales - totalPurchases + commissionIncome;
    const netProfit = grossProfit - totalExpenses;

    return {
      revenue: {
        total_sales: totalSales,
        commission_income: commissionIncome,
        total_revenue: totalSales + commissionIncome
      },
      cost_of_goods: {
        total_purchases: totalPurchases
      },
      gross_profit: grossProfit,
      operating_expenses: {
        total_expenses: totalExpenses
      },
      net_profit: netProfit,
      profit_margin_percent: totalSales > 0 ? (netProfit / totalSales) * 100 : 0
    };
  } catch (error) {
    console.error('Error getting comprehensive P&L:', error);
    throw error;
  }
}

// 5. CASH FLOW STATEMENT - Money movement tracking
export async function getCashFlowStatement(tenantId: number, startDate?: string, endDate?: string) {
  try {
    const query = sql`
      SELECT 
        COALESCE(SUM(CASE WHEN account_head = 'cash' AND debit_amount > 0 THEN debit_amount ELSE 0 END), 0) as cash_inflows,
        COALESCE(SUM(CASE WHEN account_head = 'cash' AND credit_amount > 0 THEN credit_amount ELSE 0 END), 0) as cash_outflows,
        COALESCE(SUM(CASE WHEN account_head = 'bank' AND debit_amount > 0 THEN debit_amount ELSE 0 END), 0) as bank_inflows,
        COALESCE(SUM(CASE WHEN account_head = 'bank' AND credit_amount > 0 THEN credit_amount ELSE 0 END), 0) as bank_outflows
      FROM accounting_ledger al
      WHERE al.tenant_id = ${tenantId}
      ${startDate && endDate ? sql`AND DATE(al.transaction_date) BETWEEN ${startDate} AND ${endDate}` : sql``}
    `;

    const result = await db.execute(query);
    const row = result.rows[0] as any;

    const cashInflows = parseFloat(row.cash_inflows || '0');
    const cashOutflows = parseFloat(row.cash_outflows || '0');
    const bankInflows = parseFloat(row.bank_inflows || '0');
    const bankOutflows = parseFloat(row.bank_outflows || '0');

    const netCashFlow = (cashInflows + bankInflows) - (cashOutflows + bankOutflows);

    return {
      cash_flows: {
        cash_inflows: cashInflows,
        cash_outflows: cashOutflows,
        net_cash_flow: cashInflows - cashOutflows
      },
      bank_flows: {
        bank_inflows: bankInflows,
        bank_outflows: bankOutflows,
        net_bank_flow: bankInflows - bankOutflows
      },
      total_net_flow: netCashFlow
    };
  } catch (error) {
    console.error('Error getting cash flow statement:', error);
    throw error;
  }
}