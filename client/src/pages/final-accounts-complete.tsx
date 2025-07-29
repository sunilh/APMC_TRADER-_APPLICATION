import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Navigation } from "@/components/navigation";
import { Calendar, IndianRupee, TrendingUp, TrendingDown, DollarSign, CreditCard, FileText, PlusCircle, Eye } from "lucide-react";
import { format } from "date-fns";
import { UnifiedInput } from "@/components/ui/unified-input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface ComprehensiveFinancials {
  tradingRevenue: number;
  otherIncome: number;
  totalRevenue: number;
  tradingExpenses: number;
  operatingExpenses: number;
  totalExpenses: number;
  grossProfit: number;
  netProfit: number;
  profitMargin: number;
  cashPosition: number;
  assetsTotal: number;
  liabilitiesTotal: number;
  netWorth: number;
}

interface Expense {
  id: number;
  category: string;
  subcategory: string;
  description: string;
  amount: string;
  paymentMethod: string;
  receiptNumber: string;
  vendorName: string;
  expenseDate: string;
}

interface LedgerEntry {
  id: number;
  accountHead: string;
  description: string;
  debitAmount: string;
  creditAmount: string;
  transactionDate: string;
  referenceType: string;
  balance: string;
}

interface BalanceSheet {
  assets: {
    cash: number;
    bankBalance: number;
    accountsReceivable: number;
    totalAssets: number;
  };
  liabilities: {
    accountsPayable: number;
    taxLiabilities: number;
    totalLiabilities: number;
  };
  equity: {
    netWorth: number;
  };
}

export default function FinalAccountsComplete() {
  const [dateRange, setDateRange] = useState({
    startDate: format(new Date(), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd')
  });
  const [showExpenseDialog, setShowExpenseDialog] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    category: '',
    subcategory: '',
    description: '',
    amount: '',
    paymentMethod: 'cash',
    receiptNumber: '',
    vendorName: '',
    expenseDate: format(new Date(), 'yyyy-MM-dd')
  });

  const queryClient = useQueryClient();

  // Comprehensive Profit & Loss Query
  const { data: profitLoss, isLoading: profitLossLoading } = useQuery({
    queryKey: ['/api/accounting/profit-loss-comprehensive', dateRange.startDate, dateRange.endDate],
    staleTime: 0
  });

  // Balance Sheet Query
  const { data: balanceSheet, isLoading: balanceSheetLoading } = useQuery({
    queryKey: ['/api/accounting/balance-sheet', dateRange.endDate],
    staleTime: 0
  });

  // Ledger Entries Query
  const { data: ledgerEntries, isLoading: ledgerLoading } = useQuery({
    queryKey: ['/api/accounting/ledger', dateRange.startDate, dateRange.endDate],
    staleTime: 0
  });

  // Expenses Summary Query
  const { data: expensesSummary, isLoading: expensesLoading } = useQuery({
    queryKey: ['/api/accounting/expenses/summary', dateRange.startDate, dateRange.endDate],
    staleTime: 0
  });

  // Detailed Expenses Query
  const { data: detailedExpenses } = useQuery({
    queryKey: ['/api/accounting/expenses/detailed', dateRange.startDate, dateRange.endDate],
    staleTime: 0
  });

  // Cash Flow Query
  const { data: cashFlow, isLoading: cashFlowLoading } = useQuery({
    queryKey: ['/api/accounting/cash-flow', dateRange.startDate, dateRange.endDate],
    staleTime: 0
  });

  // Add Expense Mutation
  const addExpenseMutation = useMutation({
    mutationFn: async (expenseData: any) => {
      return await apiRequest('POST', '/api/accounting/expenses', expenseData);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Expense added successfully"
      });
      setShowExpenseDialog(false);
      setExpenseForm({
        category: '',
        subcategory: '',
        description: '',
        amount: '',
        paymentMethod: 'cash',
        receiptNumber: '',
        vendorName: '',
        expenseDate: format(new Date(), 'yyyy-MM-dd')
      });
      queryClient.invalidateQueries();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to add expense",
        variant: "destructive"
      });
    }
  });

  const handleAddExpense = () => {
    if (!expenseForm.category || !expenseForm.description || !expenseForm.amount) {
      toast({
        title: "Error",
        description: "Please fill all required fields",
        variant: "destructive"
      });
      return;
    }
    addExpenseMutation.mutate(expenseForm);
  };

  const formatCurrency = (amount: number | string) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num || 0);
  };

  const expenseCategories = [
    { value: 'office', label: 'Office Expenses' },
    { value: 'vehicle', label: 'Vehicle & Transport' },
    { value: 'utilities', label: 'Utilities' },
    { value: 'staff', label: 'Staff Expenses' },
    { value: 'licenses', label: 'Licenses & Fees' },
    { value: 'maintenance', label: 'Maintenance' },
    { value: 'marketing', label: 'Marketing' },
    { value: 'other', label: 'Other Expenses' }
  ];

  const paymentMethods = [
    { value: 'cash', label: 'Cash' },
    { value: 'bank', label: 'Bank Transfer' },
    { value: 'cheque', label: 'Cheque' },
    { value: 'upi', label: 'UPI' },
    { value: 'card', label: 'Card' }
  ];

  return (
    <div className="container mx-auto p-4 space-y-6">
      <Navigation />
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Comprehensive Final Accounts</h1>
          <p className="text-muted-foreground">Complete business accounting with expenses tracking</p>
        </div>
        <Badge variant="outline" className="text-green-600 border-green-600">
          COMPLETE ACCOUNTING SYSTEM
        </Badge>
      </div>

      {/* Date Range Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Date Range Selection
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={() => queryClient.invalidateQueries()} className="w-full">
                Refresh Data
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="profit-loss">Profit & Loss</TabsTrigger>
          <TabsTrigger value="balance-sheet">Balance Sheet</TabsTrigger>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="ledger">Ledger</TabsTrigger>
          <TabsTrigger value="cash-flow">Cash Flow</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency((profitLoss as any)?.totalRevenue || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Trading + Other Income
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
                <TrendingDown className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {formatCurrency((profitLoss as any)?.totalExpenses || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Trading + Operating
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
                <DollarSign className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {formatCurrency((profitLoss as any)?.netProfit || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {(((profitLoss as any)?.profitMargin || 0) * 100).toFixed(1)}% margin
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Net Worth</CardTitle>
                <CreditCard className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">
                  {formatCurrency((balanceSheet as any)?.equity?.netWorth || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Assets - Liabilities
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Profit & Loss Tab */}
        <TabsContent value="profit-loss">
          <Card>
            <CardHeader>
              <CardTitle>Comprehensive Profit & Loss Statement</CardTitle>
              <CardDescription>True business profitability including all expenses</CardDescription>
            </CardHeader>
            <CardContent>
              {profitLossLoading ? (
                <div>Loading...</div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h3 className="font-semibold text-green-600 mb-2">REVENUE</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>Trading Revenue</span>
                          <span>{formatCurrency((profitLoss as any)?.tradingRevenue || 0)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Other Income</span>
                          <span>{formatCurrency((profitLoss as any)?.otherIncome || 0)}</span>
                        </div>
                        <div className="flex justify-between font-semibold border-t pt-2">
                          <span>Total Revenue</span>
                          <span>{formatCurrency((profitLoss as any)?.totalRevenue || 0)}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="font-semibold text-red-600 mb-2">EXPENSES</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>Trading Expenses</span>
                          <span>{formatCurrency((profitLoss as any)?.tradingExpenses || 0)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Operating Expenses</span>
                          <span>{formatCurrency((profitLoss as any)?.operatingExpenses || 0)}</span>
                        </div>
                        <div className="flex justify-between font-semibold border-t pt-2">
                          <span>Total Expenses</span>
                          <span>{formatCurrency((profitLoss as any)?.totalExpenses || 0)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="border-t pt-4">
                    <div className="flex justify-between text-lg font-bold">
                      <span>NET PROFIT</span>
                      <span className={(profitLoss as any)?.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {formatCurrency((profitLoss as any)?.netProfit || 0)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>Profit Margin</span>
                      <span>{((profitLoss?.profitMargin || 0) * 100).toFixed(2)}%</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Balance Sheet Tab */}
        <TabsContent value="balance-sheet">
          <Card>
            <CardHeader>
              <CardTitle>Balance Sheet</CardTitle>
              <CardDescription>Financial position as of {format(new Date(dateRange.endDate), 'PPP')}</CardDescription>
            </CardHeader>
            <CardContent>
              {balanceSheetLoading ? (
                <div>Loading...</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold text-blue-600 mb-3">ASSETS</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Cash</span>
                        <span>{formatCurrency((balanceSheet as any)?.assets?.cash || 0)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Bank Balance</span>
                        <span>{formatCurrency((balanceSheet as any)?.assets?.bankBalance || 0)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Accounts Receivable</span>
                        <span>{formatCurrency((balanceSheet as any)?.assets?.accountsReceivable || 0)}</span>
                      </div>
                      <div className="flex justify-between font-semibold border-t pt-2">
                        <span>Total Assets</span>
                        <span>{formatCurrency((balanceSheet as any)?.assets?.totalAssets || 0)}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold text-red-600 mb-3">LIABILITIES</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Accounts Payable</span>
                        <span>{formatCurrency((balanceSheet as any)?.liabilities?.accountsPayable || 0)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Tax Liabilities</span>
                        <span>{formatCurrency((balanceSheet as any)?.liabilities?.taxLiabilities || 0)}</span>
                      </div>
                      <div className="flex justify-between font-semibold border-t pt-2">
                        <span>Total Liabilities</span>
                        <span>{formatCurrency((balanceSheet as any)?.liabilities?.totalLiabilities || 0)}</span>
                      </div>
                    </div>
                    
                    <div className="mt-6">
                      <h3 className="font-semibold text-green-600 mb-3">EQUITY</h3>
                      <div className="flex justify-between font-semibold">
                        <span>Net Worth</span>
                        <span>{formatCurrency((balanceSheet as any)?.equity?.netWorth || 0)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Expenses Tab */}
        <TabsContent value="expenses" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Business Expenses Management</h2>
            <Dialog open={showExpenseDialog} onOpenChange={setShowExpenseDialog}>
              <DialogTrigger asChild>
                <Button>
                  <PlusCircle className="w-4 h-4 mr-2" />
                  Add Expense
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Add New Business Expense</DialogTitle>
                  <DialogDescription>
                    Record a new business expense with voice input support
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Category</Label>
                      <Select value={expenseForm.category} onValueChange={(value) => setExpenseForm(prev => ({ ...prev, category: value }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {expenseCategories.map(cat => (
                            <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Subcategory</Label>
                      <UnifiedInput
                        type="text"
                        placeholder="Subcategory (optional)"
                        value={expenseForm.subcategory}
                        onChange={(value) => setExpenseForm(prev => ({ ...prev, subcategory: value }))}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label>Description *</Label>
                    <UnifiedInput
                      type="text"
                      placeholder="Expense description"
                      value={expenseForm.description}
                      onChange={(value) => setExpenseForm(prev => ({ ...prev, description: value }))}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Amount *</Label>
                      <UnifiedInput
                        type="number"
                        placeholder="Amount in ₹"
                        value={expenseForm.amount}
                        onChange={(value) => setExpenseForm(prev => ({ ...prev, amount: value }))}
                      />
                    </div>
                    <div>
                      <Label>Payment Method</Label>
                      <Select value={expenseForm.paymentMethod} onValueChange={(value) => setExpenseForm(prev => ({ ...prev, paymentMethod: value }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {paymentMethods.map(method => (
                            <SelectItem key={method.value} value={method.value}>{method.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Receipt Number</Label>
                      <UnifiedInput
                        type="text"
                        placeholder="Receipt/Invoice number"
                        value={expenseForm.receiptNumber}
                        onChange={(value) => setExpenseForm(prev => ({ ...prev, receiptNumber: value }))}
                      />
                    </div>
                    <div>
                      <Label>Vendor Name</Label>
                      <UnifiedInput
                        type="text"
                        placeholder="Vendor/Supplier name"
                        value={expenseForm.vendorName}
                        onChange={(value) => setExpenseForm(prev => ({ ...prev, vendorName: value }))}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label>Expense Date</Label>
                    <Input
                      type="date"
                      value={expenseForm.expenseDate}
                      onChange={(e) => setExpenseForm(prev => ({ ...prev, expenseDate: e.target.value }))}
                    />
                  </div>
                  
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setShowExpenseDialog(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleAddExpense} disabled={addExpenseMutation.isPending}>
                      {addExpenseMutation.isPending ? 'Adding...' : 'Add Expense'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Expenses Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {expensesSummary && Object.entries(expensesSummary).map(([category, amount]) => (
              <Card key={category}>
                <CardContent className="p-4">
                  <div className="text-sm font-medium capitalize">{category.replace('_', ' ')}</div>
                  <div className="text-2xl font-bold">{formatCurrency(amount as number)}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Detailed Expenses Table */}
          <Card>
            <CardHeader>
              <CardTitle>Detailed Expenses</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Date</th>
                      <th className="text-left py-2">Category</th>
                      <th className="text-left py-2">Description</th>
                      <th className="text-left py-2">Amount</th>
                      <th className="text-left py-2">Payment</th>
                      <th className="text-left py-2">Vendor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detailedExpenses?.map((expense: Expense) => (
                      <tr key={expense.id} className="border-b">
                        <td className="py-2">{format(new Date(expense.expenseDate), 'MMM dd')}</td>
                        <td className="py-2 capitalize">{expense.category}</td>
                        <td className="py-2">{expense.description}</td>
                        <td className="py-2">{formatCurrency(expense.amount)}</td>
                        <td className="py-2 capitalize">{expense.paymentMethod}</td>
                        <td className="py-2">{expense.vendorName || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Ledger Tab */}
        <TabsContent value="ledger">
          <Card>
            <CardHeader>
              <CardTitle>General Ledger</CardTitle>
              <CardDescription>All accounting transactions in chronological order</CardDescription>
            </CardHeader>
            <CardContent>
              {ledgerLoading ? (
                <div>Loading...</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2">Date</th>
                        <th className="text-left py-2">Account</th>
                        <th className="text-left py-2">Description</th>
                        <th className="text-left py-2">Debit</th>
                        <th className="text-left py-2">Credit</th>
                        <th className="text-left py-2">Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ledgerEntries?.map((entry: LedgerEntry) => (
                        <tr key={entry.id} className="border-b">
                          <td className="py-2">{entry.transactionDate ? format(new Date(entry.transactionDate), 'MMM dd, yyyy') : '-'}</td>
                          <td className="py-2">{entry.accountHead}</td>
                          <td className="py-2">{entry.description}</td>
                          <td className="py-2">{entry.debitAmount !== '0' ? formatCurrency(entry.debitAmount) : '-'}</td>
                          <td className="py-2">{entry.creditAmount !== '0' ? formatCurrency(entry.creditAmount) : '-'}</td>
                          <td className="py-2">{formatCurrency(entry.balance)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cash Flow Tab */}
        <TabsContent value="cash-flow">
          <Card>
            <CardHeader>
              <CardTitle>Cash Flow Statement</CardTitle>
              <CardDescription>Money movement tracking</CardDescription>
            </CardHeader>
            <CardContent>
              {cashFlowLoading ? (
                <div>Loading...</div>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                      <CardContent className="p-4">
                        <div className="text-sm font-medium">Operating Cash Flow</div>
                        <div className="text-2xl font-bold text-green-600">
                          {formatCurrency(cashFlow?.operatingCashFlow || 0)}
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <div className="text-sm font-medium">Investing Cash Flow</div>
                        <div className="text-2xl font-bold text-blue-600">
                          {formatCurrency(cashFlow?.investingCashFlow || 0)}
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <div className="text-sm font-medium">Net Cash Flow</div>
                        <div className="text-2xl font-bold text-purple-600">
                          {formatCurrency(cashFlow?.netCashFlow || 0)}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}