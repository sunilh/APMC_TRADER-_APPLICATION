import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UnifiedInput } from "@/components/ui/unified-input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, TrendingUp, TrendingDown, DollarSign, Receipt, Users, Calculator } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Navigation } from "@/components/navigation";
import { BackToDashboard } from "@/components/back-to-dashboard";

// Format currency values
const formatCurrency = (amount: number | string) => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(num);
};

// Format date
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-GB');
};

export default function FinalAccountsNew() {
  const { user } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState<string>("today");
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");

  // Calculate date range based on selected period
  const getDateRange = () => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    switch (selectedPeriod) {
      case "today":
        return { startDate: todayStr, endDate: todayStr };
      case "this_week":
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        return { 
          startDate: startOfWeek.toISOString().split('T')[0], 
          endDate: todayStr 
        };
      case "this_month":
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        return { 
          startDate: startOfMonth.toISOString().split('T')[0], 
          endDate: todayStr 
        };
      case "this_quarter":
        const currentQuarter = Math.floor(today.getMonth() / 3);
        const startOfQuarter = new Date(today.getFullYear(), currentQuarter * 3, 1);
        return { 
          startDate: startOfQuarter.toISOString().split('T')[0], 
          endDate: todayStr 
        };
      case "fiscal_year":
        return { fiscalYear: "2025-26" };
      case "custom":
        return { startDate: customStartDate, endDate: customEndDate };
      default:
        return { startDate: todayStr, endDate: todayStr };
    }
  };

  const dateRange = getDateRange();

  // Fetch trading details data
  const { data: tradingData, isLoading, error } = useQuery({
    queryKey: ["trading-details", dateRange],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateRange.startDate) params.set('startDate', dateRange.startDate);
      if (dateRange.endDate) params.set('endDate', dateRange.endDate);
      if (dateRange.fiscalYear) params.set('fiscalYear', dateRange.fiscalYear);
      
      const response = await fetch(`/api/accounting/trading-details?${params}`);
      if (!response.ok) throw new Error('Failed to fetch trading details');
      return response.json();
    },
    enabled: !!user && (!!dateRange.startDate || !!dateRange.fiscalYear),
  });

  const getPeriodTitle = () => {
    switch (selectedPeriod) {
      case "today": return "Today's Trading Details";
      case "this_week": return "This Week's Trading Details";
      case "this_month": return "This Month's Trading Details";
      case "this_quarter": return "This Quarter's Trading Details";
      case "fiscal_year": return "Fiscal Year Trading Details";
      case "custom": return "Custom Period Trading Details";
      default: return "Trading Details";
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">Loading trading details...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-red-600">Error loading trading details</div>
        </div>
      </div>
    );
  }

  const summary = tradingData?.summary || {};
  const marginBreakdown = tradingData?.trading_margin_breakdown || {};
  const buyerInvoices = tradingData?.buyer_invoices || [];
  const farmerBills = tradingData?.farmer_bills || [];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Final Accounts</h1>
            <p className="text-gray-600 mt-1">{getPeriodTitle()}</p>
          </div>
          <BackToDashboard />
        </div>

        {/* Period Selection */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              Select Period
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4 items-end">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Period
                </label>
                <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="this_week">This Week</SelectItem>
                    <SelectItem value="this_month">This Month</SelectItem>
                    <SelectItem value="this_quarter">This Quarter</SelectItem>
                    <SelectItem value="fiscal_year">Fiscal Year 2025-26</SelectItem>
                    <SelectItem value="custom">Custom Range</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {selectedPeriod === "custom" && (
                <>
                  <div className="flex-1 min-w-[150px]">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div className="flex-1 min-w-[150px]">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-md"
                    />
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Cash Inflow */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cash Inflow (Buyers)</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(summary.total_cash_inflow || 0)}
              </div>
              <p className="text-xs text-gray-600">
                Basic: {formatCurrency(summary.total_basic_amount || 0)}
              </p>
            </CardContent>
          </Card>

          {/* Cash Outflow */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cash Outflow (Farmers)</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(summary.total_cash_outflow || 0)}
              </div>
              <p className="text-xs text-gray-600">
                Gross: {formatCurrency(summary.total_gross_amount || 0)}
              </p>
            </CardContent>
          </Card>

          {/* Tax Collected */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tax Collected</CardTitle>
              <Receipt className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {formatCurrency(summary.total_taxes_collected || 0)}
              </div>
              <p className="text-xs text-gray-600">
                GST + CESS collected
              </p>
            </CardContent>
          </Card>

          {/* Net Profit */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Net Profit (Margin)</CardTitle>
              <DollarSign className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {formatCurrency(summary.net_profit || 0)}
              </div>
              <p className="text-xs text-gray-600">
                Trading margin earned
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="breakdown" className="space-y-6">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="breakdown">Trading Breakdown</TabsTrigger>
            <TabsTrigger value="invoices">Buyer Invoices</TabsTrigger>
            <TabsTrigger value="bills">Farmer Bills</TabsTrigger>
            <TabsTrigger value="margin">Margin Analysis</TabsTrigger>
            <TabsTrigger value="expenses">Expenses</TabsTrigger>
            <TabsTrigger value="balance-sheet">Balance Sheet</TabsTrigger>
            <TabsTrigger value="ledger">Ledger</TabsTrigger>
          </TabsList>

          {/* Trading Breakdown */}
          <TabsContent value="breakdown">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Cash Flow Analysis */}
              <Card>
                <CardHeader>
                  <CardTitle>Cash Flow Analysis</CardTitle>
                  <CardDescription>Trader's P&L on transactions</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                    <span className="font-medium">Cash Inflow from Buyers:</span>
                    <span className="font-bold text-green-600">
                      {formatCurrency(summary.total_cash_inflow || 0)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                    <span className="font-medium">Cash Outflow to Farmers:</span>
                    <span className="font-bold text-red-600">
                      {formatCurrency(summary.total_cash_outflow || 0)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center p-3 bg-gray-100 rounded-lg border-t-2 border-gray-300">
                    <span className="font-medium">Difference (Inflows - Outflows):</span>
                    <span className="font-bold text-purple-600">
                      {formatCurrency(summary.cash_difference || 0)}
                    </span>
                  </div>
                  
                  <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-semibold text-blue-900 mb-2">Breakdown:</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Tax Collected (GST + CESS):</span>
                        <span className="font-medium">{formatCurrency(summary.total_taxes_collected || 0)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Trading Margin (sum of deductions):</span>
                        <span className="font-medium">{formatCurrency(summary.total_deductions || 0)}</span>
                      </div>
                      <div className="border-t pt-2 flex justify-between font-semibold">
                        <span>Net Profit (Trader's Margin):</span>
                        <span className="text-green-600">{formatCurrency(summary.net_profit || 0)}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Tax Summary */}
              <Card>
                <CardHeader>
                  <CardTitle>Tax Summary</CardTitle>
                  <CardDescription>GST and CESS collected</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                    <span className="font-medium">Total GST Collected:</span>
                    <span className="font-bold text-blue-600">
                      {formatCurrency(summary.total_gst_collected || 0)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center p-3 bg-indigo-50 rounded-lg">
                    <span className="font-medium">Total CESS Collected:</span>
                    <span className="font-bold text-indigo-600">
                      {formatCurrency(summary.total_cess_collected || 0)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center p-3 bg-gray-100 rounded-lg border-t-2 border-gray-300">
                    <span className="font-medium">Total Tax Collected:</span>
                    <span className="font-bold text-purple-600">
                      {formatCurrency(summary.total_taxes_collected || 0)}
                    </span>
                  </div>

                  <div className="mt-6 p-4 bg-yellow-50 rounded-lg">
                    <p className="text-sm text-yellow-800">
                      <strong>Note:</strong> Taxes are eventually remitted to the government. 
                      Your true net profit is the trading margin: <strong>{formatCurrency(summary.net_profit || 0)}</strong>
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Buyer Invoices */}
          <TabsContent value="invoices">
            <Card>
              <CardHeader>
                <CardTitle>Buyer Invoices (Cash Inflow)</CardTitle>
                <CardDescription>Tax invoices generated for buyers</CardDescription>
              </CardHeader>
              <CardContent>
                {buyerInvoices.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Invoice #</TableHead>
                        <TableHead>Buyer</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Basic Amount</TableHead>
                        <TableHead>Total Amount</TableHead>
                        <TableHead>Tax Collected</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {buyerInvoices.map((invoice, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-mono">{invoice.invoice_number}</TableCell>
                          <TableCell>{invoice.buyer_name}</TableCell>
                          <TableCell>{formatDate(invoice.invoice_date)}</TableCell>
                          <TableCell>{formatCurrency(invoice.basic_amount)}</TableCell>
                          <TableCell className="font-semibold text-green-600">
                            {formatCurrency(invoice.total_amount)}
                          </TableCell>
                          <TableCell className="font-semibold text-blue-600">
                            {formatCurrency(invoice.total_taxes_collected)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No buyer invoices found for the selected period
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Farmer Bills */}
          <TabsContent value="bills">
            <Card>
              <CardHeader>
                <CardTitle>Farmer Bills (Cash Outflow)</CardTitle>
                <CardDescription>Payment bills generated for farmers</CardDescription>
              </CardHeader>
              <CardContent>
                {farmerBills.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Patti #</TableHead>
                        <TableHead>Farmer</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Gross Amount</TableHead>
                        <TableHead>Total Deductions</TableHead>
                        <TableHead>Net Payable</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {farmerBills.map((bill, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-mono">{bill.patti_number}</TableCell>
                          <TableCell>{bill.farmer_name}</TableCell>
                          <TableCell>{formatDate(bill.bill_date)}</TableCell>
                          <TableCell>{formatCurrency(bill.gross_amount)}</TableCell>
                          <TableCell className="font-semibold text-orange-600">
                            {formatCurrency(bill.total_deductions)}
                          </TableCell>
                          <TableCell className="font-semibold text-red-600">
                            {formatCurrency(bill.net_payable)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No farmer bills found for the selected period
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Margin Analysis */}
          <TabsContent value="margin">
            <Card>
              <CardHeader>
                <CardTitle>Trading Margin Breakdown</CardTitle>
                <CardDescription>Detailed breakdown of your trading profit</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-semibold text-gray-900">Deduction Sources</h4>
                    
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <span>Hamali:</span>
                      <span className="font-medium">{formatCurrency(marginBreakdown.hamali || 0)}</span>
                    </div>
                    
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <span>Vehicle Rent:</span>
                      <span className="font-medium">{formatCurrency(marginBreakdown.vehicle_rent || 0)}</span>
                    </div>
                    
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <span>Empty Bags:</span>
                      <span className="font-medium">{formatCurrency(marginBreakdown.empty_bags || 0)}</span>
                    </div>
                    
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <span>Advance:</span>
                      <span className="font-medium">{formatCurrency(marginBreakdown.advance || 0)}</span>
                    </div>
                    
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <span>Rok Commission (3%):</span>
                      <span className="font-medium">{formatCurrency(marginBreakdown.rok_commission || 0)}</span>
                    </div>
                    
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <span>Other Deductions:</span>
                      <span className="font-medium">{formatCurrency(marginBreakdown.other || 0)}</span>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <h4 className="font-semibold text-gray-900">Summary</h4>
                    
                    <div className="p-4 bg-green-50 rounded-lg border-2 border-green-200">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-semibold">Total Trading Margin:</span>
                        <span className="font-bold text-green-600 text-lg">
                          {formatCurrency(marginBreakdown.total || 0)}
                        </span>
                      </div>
                      <p className="text-sm text-green-700">
                        This is your actual profit from trading operations
                      </p>
                    </div>
                    
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <h5 className="font-semibold text-blue-900 mb-2">Profit Calculation:</h5>
                      <div className="text-sm space-y-1">
                        <div>• Revenue from deductions charged to farmers</div>
                        <div>• Commission on total trading volume</div>
                        <div>• Service charges for facilities provided</div>
                        <div className="font-semibold text-blue-800 pt-2">
                          = Net Trading Profit: {formatCurrency(marginBreakdown.total || 0)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* COMPREHENSIVE ACCOUNTING TABS */}

          {/* Expenses Tab */}
          <TabsContent value="expenses">
            <ExpensesTab dateRange={dateRange} />
          </TabsContent>

          {/* Balance Sheet Tab */}
          <TabsContent value="balance-sheet">
            <BalanceSheetTab dateRange={dateRange} />
          </TabsContent>

          {/* Ledger Tab */}
          <TabsContent value="ledger">
            <LedgerTab dateRange={dateRange} />
          </TabsContent>

        </Tabs>
      </div>
    </div>
  );
}

// COMPREHENSIVE ACCOUNTING COMPONENTS

// Expenses Management Component
function ExpensesTab({ dateRange }: { dateRange: any }) {
  const [showExpenseDialog, setShowExpenseDialog] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    category: '',
    description: '',
    amount: '',
    paymentMethod: 'cash',
    receiptNumber: '',
    vendorName: '',
    expenseDate: new Date().toISOString().split('T')[0]
  });

  const queryClient = useQueryClient();

  // Use the same working trading data API
  const queryParams = new URLSearchParams();
  if (dateRange.fiscalYear) {
    queryParams.append('fiscalYear', dateRange.fiscalYear);
  } else {
    queryParams.append('startDate', dateRange.startDate);
    queryParams.append('endDate', dateRange.endDate);
  }

  const { data: tradingData } = useQuery({
    queryKey: ['/api/accounting/trading-details?' + queryParams.toString()],
    staleTime: 0
  });

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

  const formatCurrency = (amount: number | string) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num || 0);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Business Expenses Management</h2>
        <Dialog open={showExpenseDialog} onOpenChange={setShowExpenseDialog}>
          <DialogTrigger asChild>
            <Button>Add New Expense</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Add Business Expense</DialogTitle>
              <DialogDescription>Record a new business expense</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Category</label>
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
                <label className="block text-sm font-medium mb-1">Description</label>
                <UnifiedInput
                  type="text"
                  placeholder="Expense description"
                  value={expenseForm.description}
                  onChange={(value) => setExpenseForm(prev => ({ ...prev, description: value }))}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Amount (₹)</label>
                <UnifiedInput
                  type="number"
                  placeholder="Amount"
                  value={expenseForm.amount}
                  onChange={(value) => setExpenseForm(prev => ({ ...prev, amount: value }))}
                />
              </div>
              
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowExpenseDialog(false)}>Cancel</Button>
                <Button>Add Expense</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Trading Expense Summary from your data */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm font-medium">Trading Deductions</div>
            <div className="text-2xl font-bold">{formatCurrency(tradingData?.summary?.total_deductions || 0)}</div>
            <div className="text-xs text-gray-600">Service charges collected</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="text-sm font-medium">Tax Collected</div>
            <div className="text-2xl font-bold">{formatCurrency(tradingData?.summary?.total_taxes_collected || 0)}</div>
            <div className="text-xs text-gray-600">GST + CESS to remit</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="text-sm font-medium">Net Trading Profit</div>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(tradingData?.summary?.net_profit || 0)}</div>
            <div className="text-xs text-gray-600">After all trading costs</div>
          </CardContent>
        </Card>
      </div>

      {/* Trading Cost Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Trading Cost Analysis</CardTitle>
          <CardDescription>Breakdown of your trading operation costs and earnings</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 bg-green-50 rounded-lg">
              <h4 className="font-semibold text-green-900 mb-2">Revenue Sources:</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Total Cash from Buyers:</span>
                  <span className="font-medium">{formatCurrency(tradingData?.summary?.total_cash_inflow || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Service Charges Collected:</span>
                  <span className="font-medium">{formatCurrency(tradingData?.summary?.total_deductions || 0)}</span>
                </div>
              </div>
            </div>
            
            <div className="p-4 bg-red-50 rounded-lg">
              <h4 className="font-semibold text-red-900 mb-2">Costs & Payments:</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Payments to Farmers:</span>
                  <span className="font-medium">{formatCurrency(tradingData?.summary?.total_cash_outflow || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax Liabilities (GST+CESS):</span>
                  <span className="font-medium">{formatCurrency(tradingData?.summary?.total_taxes_collected || 0)}</span>
                </div>
              </div>
            </div>
            
            <div className="p-4 bg-blue-50 rounded-lg border-l-4 border-blue-400">
              <h4 className="font-semibold text-blue-900 mb-2">Net Position:</h4>
              <div className="flex justify-between text-lg">
                <span>Trading Profit (Your Earnings):</span>
                <span className="font-bold text-green-600">{formatCurrency(tradingData?.summary?.net_profit || 0)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Balance Sheet Component
function BalanceSheetTab({ dateRange }: { dateRange: any }) {
  // Use the same trading data API that's working
  const queryParams = new URLSearchParams();
  if (dateRange.fiscalYear) {
    queryParams.append('fiscalYear', dateRange.fiscalYear);
  } else {
    queryParams.append('startDate', dateRange.startDate);
    queryParams.append('endDate', dateRange.endDate);
  }

  const { data: tradingData } = useQuery({
    queryKey: ['/api/accounting/trading-details?' + queryParams.toString()],
    staleTime: 0
  });

  const formatCurrency = (amount: number | string) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num || 0);
  };

  // Calculate exactly as per your format: Cash = 40,381, GST & CESS = 26,372, Retained Earnings = 14,009
  const cashInflow = tradingData?.summary?.total_cash_inflow || 0;
  const cashOutflow = tradingData?.summary?.total_cash_outflow || 0;
  const netProfit = tradingData?.summary?.net_profit || 0;
  const taxesCollected = tradingData?.summary?.total_taxes_collected || 0;
  
  // Assets side
  const cash = cashInflow - cashOutflow;  // ₹40,381
  
  // Liabilities & Equity side
  const gstCessPayable = taxesCollected;  // ₹26,372 (should be from total_taxes_collected)
  const retainedEarnings = netProfit;     // ₹14,009
  
  // Balance verification: Assets = Liabilities + Equity
  const totalAssets = cash;
  const totalLiabilitiesAndEquity = gstCessPayable + retainedEarnings;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Balance Sheet</CardTitle>
        <CardDescription>Financial position from trading operations</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold text-blue-600 mb-3">ASSETS</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Cash</span>
                <span>{formatCurrency(cash)}</span>
              </div>
              <div className="flex justify-between font-semibold border-t pt-2">
                <span>Total Assets</span>
                <span>{formatCurrency(totalAssets)}</span>
              </div>
            </div>
          </div>
          
          <div>
            <h3 className="font-semibold text-red-600 mb-3">LIABILITIES & EQUITY</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>GST & CESS Payable</span>
                <span>{formatCurrency(gstCessPayable)}</span>
              </div>
              <div className="flex justify-between">
                <span>Retained Earnings (Net Profit)</span>
                <span>{formatCurrency(retainedEarnings)}</span>
              </div>
              <div className="flex justify-between font-semibold border-t pt-2">
                <span>Total Liab & Equity</span>
                <span>{formatCurrency(totalLiabilitiesAndEquity)}</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h4 className="font-semibold text-blue-900 mb-2">Trading Summary:</h4>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span>Cash from Buyers:</span>
              <span className="font-medium text-green-600">{formatCurrency(cashInflow)}</span>
            </div>
            <div className="flex justify-between">
              <span>Paid to Farmers:</span>
              <span className="font-medium text-red-600">{formatCurrency(cashOutflow)}</span>
            </div>
            <div className="flex justify-between">
              <span>Taxes Collected:</span>
              <span className="font-medium text-blue-600">{formatCurrency(gstCessPayable)}</span>
            </div>
            <div className="flex justify-between font-semibold border-t pt-1">
              <span>Net Cash Position:</span>
              <span className="text-green-600">{formatCurrency(cash)}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Ledger Component
function LedgerTab({ dateRange }: { dateRange: any }) {
  // Use the same working trading data API
  const queryParams = new URLSearchParams();
  if (dateRange.fiscalYear) {
    queryParams.append('fiscalYear', dateRange.fiscalYear);
  } else {
    queryParams.append('startDate', dateRange.startDate);
    queryParams.append('endDate', dateRange.endDate);
  }

  const { data: tradingData } = useQuery({
    queryKey: ['/api/accounting/trading-details?' + queryParams.toString()],
    staleTime: 0
  });

  const formatCurrency = (amount: number | string) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num || 0);
  };

  // Generate ledger entries from trading data
  const ledgerEntries = [];
  const buyerInvoices = tradingData?.buyer_invoices || [];
  const farmerBills = tradingData?.farmer_bills || [];

  // Add buyer invoice entries
  buyerInvoices.forEach((invoice: any) => {
    ledgerEntries.push({
      id: `buyer-${invoice.id}`,
      date: invoice.date,
      account: 'Accounts Receivable - Buyers',
      description: `Invoice ${invoice.id} - ${invoice.buyer_name}`,
      debit: invoice.total_amount,
      credit: 0,
      type: 'sale'
    });
    ledgerEntries.push({
      id: `sale-${invoice.id}`,
      date: invoice.date,
      account: 'Sales Revenue',
      description: `Sale to ${invoice.buyer_name}`,
      debit: 0,
      credit: invoice.basic_amount,
      type: 'revenue'
    });
    if (invoice.total_tax > 0) {
      ledgerEntries.push({
        id: `tax-${invoice.id}`,
        date: invoice.date,
        account: 'Tax Collected',
        description: `GST/CESS on sale to ${invoice.buyer_name}`,
        debit: 0,
        credit: invoice.total_tax,
        type: 'tax'
      });
    }
  });

  // Add farmer bill entries
  farmerBills.forEach((bill: any) => {
    ledgerEntries.push({
      id: `farmer-${bill.id}`,
      date: bill.date,
      account: 'Cost of Goods Sold',
      description: `Purchase from ${bill.farmer_name}`,
      debit: bill.total_amount,
      credit: 0,
      type: 'purchase'
    });
    ledgerEntries.push({
      id: `payment-${bill.id}`,
      date: bill.date,
      account: 'Cash/Bank',
      description: `Payment to ${bill.farmer_name}`,
      debit: 0,
      credit: bill.net_amount,
      type: 'payment'
    });
  });

  // Sort by date
  ledgerEntries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <Card>
      <CardHeader>
        <CardTitle>Trading Ledger</CardTitle>
        <CardDescription>All trading transactions and payments</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Account</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Debit</TableHead>
                <TableHead>Credit</TableHead>
                <TableHead>Type</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ledgerEntries.map((entry: any) => (
                <TableRow key={entry.id}>
                  <TableCell>{new Date(entry.date).toLocaleDateString()}</TableCell>
                  <TableCell>{entry.account}</TableCell>
                  <TableCell>{entry.description}</TableCell>
                  <TableCell>{entry.debit > 0 ? formatCurrency(entry.debit) : '-'}</TableCell>
                  <TableCell>{entry.credit > 0 ? formatCurrency(entry.credit) : '-'}</TableCell>
                  <TableCell>
                    <Badge variant={
                      entry.type === 'sale' ? 'default' :
                      entry.type === 'revenue' ? 'default' :
                      entry.type === 'tax' ? 'secondary' :
                      entry.type === 'purchase' ? 'destructive' :
                      'outline'
                    }>
                      {entry.type}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {ledgerEntries.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-gray-500">
                    No trading transactions for this period
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        
        {ledgerEntries.length > 0 && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-semibold mb-2">Transaction Summary:</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Sales:</span>
                <span className="ml-2 font-medium">{ledgerEntries.filter(e => e.type === 'sale').length}</span>
              </div>
              <div>
                <span className="text-gray-600">Purchases:</span>
                <span className="ml-2 font-medium">{ledgerEntries.filter(e => e.type === 'purchase').length}</span>
              </div>
              <div>
                <span className="text-gray-600">Payments:</span>
                <span className="ml-2 font-medium">{ledgerEntries.filter(e => e.type === 'payment').length}</span>
              </div>
              <div>
                <span className="text-gray-600">Tax Records:</span>
                <span className="ml-2 font-medium">{ledgerEntries.filter(e => e.type === 'tax').length}</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}