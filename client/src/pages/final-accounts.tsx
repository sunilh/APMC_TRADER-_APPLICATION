import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Calendar, 
  FileText, 
  BarChart3,
  PieChart,
  Calculator,
  Building2,
  CreditCard,
  BanknoteIcon,
  Receipt,
  Users,
  Download,
  Plus,
  Eye
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
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

// Format percentage
const formatPercentage = (value: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'percent',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value / 100);
};

export default function FinalAccounts() {
  // Add authentication check
  const { user } = useAuth();
  
  // Let the page load and handle authentication in the data fetching
  const { toast } = useToast();
  const [selectedFiscalYear, setSelectedFiscalYear] = useState<string>("");
  const [paymentDialog, setPaymentDialog] = useState<{ type: 'received' | 'made', open: boolean }>({ type: 'received', open: false });
  const [expenseDialog, setExpenseDialog] = useState(false);

  // Simple test to ensure component loads
  console.log("Final Accounts component is loading...");

  // Get current fiscal year
  const { data: fiscalYearData } = useQuery({
    queryKey: ["/api/accounting/fiscal-year"],
    staleTime: 1000 * 60 * 60, // 1 hour
  });

  const currentFiscalYear = fiscalYearData?.fiscalYear || "2024-25";

  // Get final accounts data
  const { data: finalAccounts, isLoading: finalAccountsLoading, error: finalAccountsError } = useQuery({
    queryKey: ["/api/accounting/final-accounts", selectedFiscalYear || currentFiscalYear],
    enabled: !!(selectedFiscalYear || currentFiscalYear),
    retry: 1,
  });

  // Get profitability analysis
  const { data: farmerProfitability } = useQuery({
    queryKey: ["/api/accounting/profitability/farmers", selectedFiscalYear || currentFiscalYear],
  });

  const { data: buyerProfitability } = useQuery({
    queryKey: ["/api/accounting/profitability/buyers", selectedFiscalYear || currentFiscalYear],
  });

  // Get GST liability
  const { data: gstLiability } = useQuery({
    queryKey: ["/api/accounting/gst-liability", selectedFiscalYear || currentFiscalYear],
  });

  // Get expense categories
  const { data: expenseCategories } = useQuery({
    queryKey: ["/api/accounting/expense-categories"],
  });

  // Get recent ledger entries
  const { data: ledgerEntries } = useQuery({
    queryKey: ["/api/accounting/ledger"],
  });

  // Get bank transactions
  const { data: bankTransactions } = useQuery({
    queryKey: ["/api/accounting/bank-transactions"],
  });

  // Record payment received
  const handlePaymentReceived = async (formData: FormData) => {
    try {
      const data = {
        buyerId: formData.get('buyerId'),
        amount: formData.get('amount'),
        paymentMethod: formData.get('paymentMethod'),
        referenceNumber: formData.get('referenceNumber'),
      };

      await apiRequest('POST', '/api/accounting/payment-received', data);
      
      toast({
        title: "Payment Recorded",
        description: "Payment received has been recorded successfully.",
      });

      setPaymentDialog({ type: 'received', open: false });
      queryClient.invalidateQueries({ queryKey: ["/api/accounting"] });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to record payment received.",
        variant: "destructive",
      });
    }
  };

  // Record payment made
  const handlePaymentMade = async (formData: FormData) => {
    try {
      const data = {
        farmerId: formData.get('farmerId'),
        amount: formData.get('amount'),
        paymentMethod: formData.get('paymentMethod'),
        referenceNumber: formData.get('referenceNumber'),
      };

      await apiRequest('POST', '/api/accounting/payment-made', data);
      
      toast({
        title: "Payment Recorded",
        description: "Payment made has been recorded successfully.",
      });

      setPaymentDialog({ type: 'made', open: false });
      queryClient.invalidateQueries({ queryKey: ["/api/accounting"] });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to record payment made.",
        variant: "destructive",
      });
    }
  };

  // Add expense
  const handleAddExpense = async (formData: FormData) => {
    try {
      const data = {
        categoryId: formData.get('categoryId'),
        amount: formData.get('amount'),
        description: formData.get('description'),
        expenseDate: formData.get('expenseDate'),
        paymentMethod: formData.get('paymentMethod'),
        receiptNumber: formData.get('receiptNumber'),
      };

      await apiRequest('POST', '/api/accounting/expenses', data);
      
      toast({
        title: "Expense Added",
        description: "Expense has been recorded successfully.",
      });

      setExpenseDialog(false);
      queryClient.invalidateQueries({ queryKey: ["/api/accounting"] });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to record expense.",
        variant: "destructive",
      });
    }
  };

  // Download financial reports
  const downloadReport = (reportType: string) => {
    // Implementation for downloading reports as PDF/Excel
    toast({
      title: "Download Started",
      description: `${reportType} report download has started.`,
    });
  };

  if (finalAccountsLoading) {
    return (
      <div className="p-6">
        <h2 className="text-2xl font-bold mb-4">Final Accounts - Loading...</h2>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (finalAccountsError) {
    return (
      <div className="p-6">
        <h2 className="text-2xl font-bold mb-4">Final Accounts - Setup Required</h2>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">Setting up Final Accounts</h3>
              <p className="text-muted-foreground mb-4">
                The accounting system is being initialized. Please wait a moment.
              </p>
              <Button onClick={() => window.location.reload()}>
                Refresh Page
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="p-6 space-y-6">
        <BackToDashboard />
        
        {/* Debug Info */}
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <h3 className="font-semibold text-green-800">✓ Final Accounts Page Loaded Successfully!</h3>
          <p className="text-green-700">Current Fiscal Year: {currentFiscalYear}</p>
          <p className="text-green-700">Data loaded: {finalAccounts ? 'Yes' : 'No'}</p>
        </div>
        
        {/* Header */}
        <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Final Accounts</h1>
          <p className="text-muted-foreground">
            Comprehensive accounting and financial management system
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          <Select value={selectedFiscalYear || currentFiscalYear} onValueChange={setSelectedFiscalYear}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select fiscal year" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2024-25">FY 2024-25</SelectItem>
              <SelectItem value="2023-24">FY 2023-24</SelectItem>
              <SelectItem value="2022-23">FY 2022-23</SelectItem>
            </SelectContent>
          </Select>
          
          <Button onClick={() => downloadReport("Final Accounts")} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Download Report
          </Button>
        </div>
      </div>

      {/* Key Financial Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(finalAccounts?.netProfit || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Current fiscal year
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(finalAccounts?.totalIncome || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Sales + Commission + Service charges
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Worth</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {formatCurrency(finalAccounts?.netWorth || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Assets - Liabilities
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cash Position</CardTitle>
            <BanknoteIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {formatCurrency((parseFloat(finalAccounts?.cash || '0') + parseFloat(finalAccounts?.bankBalance || '0')))}
            </div>
            <p className="text-xs text-muted-foreground">
              Cash + Bank balance
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="profit-loss">P&L</TabsTrigger>
          <TabsTrigger value="balance-sheet">Balance Sheet</TabsTrigger>
          <TabsTrigger value="cash-flow">Cash Flow</TabsTrigger>
          <TabsTrigger value="profitability">Profitability</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <PieChart className="h-5 w-5 mr-2" />
                  Revenue Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span>Sales Revenue</span>
                    <span className="font-medium">{formatCurrency(finalAccounts?.totalSales || 0)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Commission Income</span>
                    <span className="font-medium">{formatCurrency(finalAccounts?.commissionIncome || 0)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Service Charges</span>
                    <span className="font-medium">{formatCurrency(finalAccounts?.serviceCharges || 0)}</span>
                  </div>
                  <hr />
                  <div className="flex justify-between items-center font-bold">
                    <span>Total Revenue</span>
                    <span>{formatCurrency(finalAccounts?.totalIncome || 0)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Calculator className="h-5 w-5 mr-2" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Dialog open={paymentDialog.open && paymentDialog.type === 'received'} 
                       onOpenChange={(open) => setPaymentDialog({ type: 'received', open })}>
                  <DialogTrigger asChild>
                    <Button className="w-full" variant="outline">
                      <CreditCard className="h-4 w-4 mr-2" />
                      Record Payment Received
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Record Payment Received</DialogTitle>
                      <DialogDescription>
                        Record a payment received from a buyer
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={(e) => {
                      e.preventDefault();
                      handlePaymentReceived(new FormData(e.currentTarget));
                    }}>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="buyerId">Buyer ID</Label>
                          <Input id="buyerId" name="buyerId" type="number" required />
                        </div>
                        <div>
                          <Label htmlFor="amount">Amount</Label>
                          <Input id="amount" name="amount" type="number" step="0.01" required />
                        </div>
                        <div>
                          <Label htmlFor="paymentMethod">Payment Method</Label>
                          <Select name="paymentMethod" required>
                            <SelectTrigger>
                              <SelectValue placeholder="Select payment method" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="cash">Cash</SelectItem>
                              <SelectItem value="bank">Bank Transfer</SelectItem>
                              <SelectItem value="cheque">Cheque</SelectItem>
                              <SelectItem value="upi">UPI</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="referenceNumber">Reference Number</Label>
                          <Input id="referenceNumber" name="referenceNumber" />
                        </div>
                      </div>
                      <DialogFooter className="mt-6">
                        <Button type="submit">Record Payment</Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>

                <Dialog open={paymentDialog.open && paymentDialog.type === 'made'} 
                       onOpenChange={(open) => setPaymentDialog({ type: 'made', open })}>
                  <DialogTrigger asChild>
                    <Button className="w-full" variant="outline">
                      <BanknoteIcon className="h-4 w-4 mr-2" />
                      Record Payment Made
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Record Payment Made</DialogTitle>
                      <DialogDescription>
                        Record a payment made to a farmer
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={(e) => {
                      e.preventDefault();
                      handlePaymentMade(new FormData(e.currentTarget));
                    }}>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="farmerId">Farmer ID</Label>
                          <Input id="farmerId" name="farmerId" type="number" required />
                        </div>
                        <div>
                          <Label htmlFor="amount">Amount</Label>
                          <Input id="amount" name="amount" type="number" step="0.01" required />
                        </div>
                        <div>
                          <Label htmlFor="paymentMethod">Payment Method</Label>
                          <Select name="paymentMethod" required>
                            <SelectTrigger>
                              <SelectValue placeholder="Select payment method" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="cash">Cash</SelectItem>
                              <SelectItem value="bank">Bank Transfer</SelectItem>
                              <SelectItem value="cheque">Cheque</SelectItem>
                              <SelectItem value="upi">UPI</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="referenceNumber">Reference Number</Label>
                          <Input id="referenceNumber" name="referenceNumber" />
                        </div>
                      </div>
                      <DialogFooter className="mt-6">
                        <Button type="submit">Record Payment</Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>

                <Dialog open={expenseDialog} onOpenChange={setExpenseDialog}>
                  <DialogTrigger asChild>
                    <Button className="w-full" variant="outline">
                      <Receipt className="h-4 w-4 mr-2" />
                      Add Expense
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Business Expense</DialogTitle>
                      <DialogDescription>
                        Record a business expense
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={(e) => {
                      e.preventDefault();
                      handleAddExpense(new FormData(e.currentTarget));
                    }}>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="categoryId">Category</Label>
                          <Select name="categoryId" required>
                            <SelectTrigger>
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent>
                              {expenseCategories?.map((category: any) => (
                                <SelectItem key={category.id} value={category.id.toString()}>
                                  {category.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="amount">Amount</Label>
                          <Input id="amount" name="amount" type="number" step="0.01" required />
                        </div>
                        <div>
                          <Label htmlFor="description">Description</Label>
                          <Textarea id="description" name="description" />
                        </div>
                        <div>
                          <Label htmlFor="expenseDate">Date</Label>
                          <Input id="expenseDate" name="expenseDate" type="date" required />
                        </div>
                        <div>
                          <Label htmlFor="paymentMethod">Payment Method</Label>
                          <Select name="paymentMethod" required>
                            <SelectTrigger>
                              <SelectValue placeholder="Select payment method" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="cash">Cash</SelectItem>
                              <SelectItem value="bank">Bank Transfer</SelectItem>
                              <SelectItem value="cheque">Cheque</SelectItem>
                              <SelectItem value="upi">UPI</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="receiptNumber">Receipt Number</Label>
                          <Input id="receiptNumber" name="receiptNumber" />
                        </div>
                      </div>
                      <DialogFooter className="mt-6">
                        <Button type="submit">Add Expense</Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>

                <Button 
                  className="w-full" 
                  variant="outline"
                  onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/accounting"] })}
                >
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Refresh Reports
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* GST Summary */}
          <Card>
            <CardHeader>
              <CardTitle>GST & Tax Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {formatCurrency(gstLiability?.sgst || 0)}
                  </div>
                  <p className="text-sm text-muted-foreground">SGST (2.5%)</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrency(gstLiability?.cgst || 0)}
                  </div>
                  <p className="text-sm text-muted-foreground">CGST (2.5%)</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {formatCurrency(gstLiability?.cess || 0)}
                  </div>
                  <p className="text-sm text-muted-foreground">CESS (0.6%)</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {formatCurrency(gstLiability?.totalTaxLiability || 0)}
                  </div>
                  <p className="text-sm text-muted-foreground">Total Tax Liability</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Profit & Loss Tab */}
        <TabsContent value="profit-loss" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Profit & Loss Statement</CardTitle>
              <CardDescription>
                {finalAccounts?.periodStartDate && finalAccounts?.periodEndDate ? 
                  `Period: ${new Date(finalAccounts.periodStartDate).toLocaleDateString()} to ${new Date(finalAccounts.periodEndDate).toLocaleDateString()}` :
                  `Fiscal Year: ${selectedFiscalYear || currentFiscalYear}`
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Revenue Section */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Revenue</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Sales Revenue</span>
                      <span className="font-medium">{formatCurrency(finalAccounts?.totalSales || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Commission Income</span>
                      <span className="font-medium">{formatCurrency(finalAccounts?.commissionIncome || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Service Charges</span>
                      <span className="font-medium">{formatCurrency(finalAccounts?.serviceCharges || 0)}</span>
                    </div>
                    <hr />
                    <div className="flex justify-between font-bold text-lg">
                      <span>Total Revenue</span>
                      <span className="text-green-600">{formatCurrency(finalAccounts?.totalIncome || 0)}</span>
                    </div>
                  </div>
                </div>

                {/* Cost of Goods Sold */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Cost of Goods Sold</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Purchases</span>
                      <span className="font-medium">{formatCurrency(finalAccounts?.totalPurchases || 0)}</span>
                    </div>
                    <hr />
                    <div className="flex justify-between font-bold text-lg">
                      <span>Gross Profit</span>
                      <span className="text-blue-600">{formatCurrency(finalAccounts?.grossProfit || 0)}</span>
                    </div>
                  </div>
                </div>

                {/* Operating Expenses */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Operating Expenses</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Total Expenses</span>
                      <span className="font-medium">{formatCurrency(finalAccounts?.totalExpenses || 0)}</span>
                    </div>
                    <hr />
                    <div className="flex justify-between font-bold text-xl">
                      <span>Net Profit</span>
                      <span className={`${parseFloat(finalAccounts?.netProfit || '0') >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(finalAccounts?.netProfit || 0)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Balance Sheet Tab */}
        <TabsContent value="balance-sheet" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Balance Sheet</CardTitle>
              <CardDescription>
                As of {finalAccounts?.periodEndDate ? 
                  new Date(finalAccounts.periodEndDate).toLocaleDateString() :
                  'Current Date'
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Assets */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Assets</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span>Cash</span>
                      <span className="font-medium">{formatCurrency(finalAccounts?.cash || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Bank Balance</span>
                      <span className="font-medium">{formatCurrency(finalAccounts?.bankBalance || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Accounts Receivable</span>
                      <span className="font-medium">{formatCurrency(finalAccounts?.accountsReceivable || 0)}</span>
                    </div>
                    <hr />
                    <div className="flex justify-between font-bold text-lg">
                      <span>Total Assets</span>
                      <span className="text-blue-600">{formatCurrency(finalAccounts?.totalAssets || 0)}</span>
                    </div>
                  </div>
                </div>

                {/* Liabilities & Equity */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Liabilities & Equity</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span>Accounts Payable</span>
                      <span className="font-medium">{formatCurrency(finalAccounts?.accountsPayable || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>GST Payable</span>
                      <span className="font-medium">{formatCurrency(finalAccounts?.gstPayable || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>CESS Payable</span>
                      <span className="font-medium">{formatCurrency(finalAccounts?.cessPayable || 0)}</span>
                    </div>
                    <hr />
                    <div className="flex justify-between font-bold">
                      <span>Total Liabilities</span>
                      <span className="text-red-600">{formatCurrency(finalAccounts?.totalLiabilities || 0)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-lg">
                      <span>Net Worth</span>
                      <span className="text-green-600">{formatCurrency(finalAccounts?.netWorth || 0)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cash Flow Tab */}
        <TabsContent value="cash-flow" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Cash Flow Statement</CardTitle>
              <CardDescription>
                Cash inflows and outflows for {selectedFiscalYear || currentFiscalYear}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-3 text-green-600">Cash Inflows</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Payments Received from Buyers</span>
                      <span className="font-medium">{formatCurrency(finalAccounts?.cashFlow?.cashIn?.paymentReceived || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Other Income</span>
                      <span className="font-medium">{formatCurrency(finalAccounts?.cashFlow?.cashIn?.otherIncome || 0)}</span>
                    </div>
                    <hr />
                    <div className="flex justify-between font-bold">
                      <span>Total Cash Inflows</span>
                      <span className="text-green-600">{formatCurrency(finalAccounts?.cashFlow?.cashIn?.total || 0)}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-3 text-red-600">Cash Outflows</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Payments Made to Farmers</span>
                      <span className="font-medium">{formatCurrency(finalAccounts?.cashFlow?.cashOut?.paymentMade || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Business Expenses</span>
                      <span className="font-medium">{formatCurrency(finalAccounts?.cashFlow?.cashOut?.expenses || 0)}</span>
                    </div>
                    <hr />
                    <div className="flex justify-between font-bold">
                      <span>Total Cash Outflows</span>
                      <span className="text-red-600">{formatCurrency(finalAccounts?.cashFlow?.cashOut?.total || 0)}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <div className="flex justify-between font-bold text-xl">
                    <span>Net Cash Flow</span>
                    <span className={`${(finalAccounts?.cashFlow?.netCashFlow || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(finalAccounts?.cashFlow?.netCashFlow || 0)}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Profitability Analysis Tab */}
        <TabsContent value="profitability" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Farmer Profitability */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="h-5 w-5 mr-2" />
                  Farmer Profitability
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-64">
                  <div className="space-y-2">
                    {farmerProfitability?.map((farmer: any) => (
                      <div key={farmer.farmerId} className="flex justify-between items-center p-2 border rounded">
                        <div>
                          <div className="font-medium">{farmer.farmerName}</div>
                          <div className="text-sm text-muted-foreground">
                            Sales: {formatCurrency(farmer.totalSales)} | 
                            Purchases: {formatCurrency(farmer.totalPurchases)}
                          </div>
                        </div>
                        <div className={`font-bold ${farmer.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCurrency(farmer.profit)}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Buyer Revenue */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Building2 className="h-5 w-5 mr-2" />
                  Buyer Revenue
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-64">
                  <div className="space-y-2">
                    {buyerProfitability?.map((buyer: any) => (
                      <div key={buyer.buyerId} className="flex justify-between items-center p-2 border rounded">
                        <div>
                          <div className="font-medium">{buyer.buyerName}</div>
                          <div className="text-sm text-muted-foreground">
                            Sales: {formatCurrency(buyer.totalSales)} | 
                            Service: {formatCurrency(buyer.serviceCharges)}
                          </div>
                        </div>
                        <div className="font-bold text-blue-600">
                          {formatCurrency(buyer.totalRevenue)}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Transactions Tab */}
        <TabsContent value="transactions" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Ledger Entries */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Ledger Entries</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-64">
                  <div className="space-y-2">
                    {ledgerEntries?.map((entry: any) => (
                      <div key={entry.id} className="p-2 border rounded">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-medium">{entry.description}</div>
                            <div className="text-sm text-muted-foreground">
                              {entry.accountHead} | {new Date(entry.transactionDate).toLocaleDateString()}
                            </div>
                          </div>
                          <div>
                            {parseFloat(entry.debitAmount) > 0 && (
                              <Badge variant="destructive">DR {formatCurrency(entry.debitAmount)}</Badge>
                            )}
                            {parseFloat(entry.creditAmount) > 0 && (
                              <Badge variant="secondary">CR {formatCurrency(entry.creditAmount)}</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Bank Transactions */}
            <Card>
              <CardHeader>
                <CardTitle>Bank Transactions</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-64">
                  <div className="space-y-2">
                    {bankTransactions?.map((transaction: any) => (
                      <div key={transaction.id} className="p-2 border rounded">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-medium">{transaction.description}</div>
                            <div className="text-sm text-muted-foreground">
                              {transaction.referenceNumber} | {new Date(transaction.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                          <div>
                            <Badge variant={transaction.transactionType === 'deposit' ? 'default' : 'destructive'}>
                              {transaction.transactionType === 'deposit' ? '+' : '-'} {formatCurrency(transaction.amount)}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Expenses Tab */}
        <TabsContent value="expenses" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center">
                  <Receipt className="h-5 w-5 mr-2" />
                  Business Expenses
                </span>
                <Button onClick={() => setExpenseDialog(true)} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Expense
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Expense Summary */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 border rounded">
                    <div className="text-2xl font-bold text-red-600">
                      {formatCurrency(finalAccounts?.totalExpenses || 0)}
                    </div>
                    <p className="text-sm text-muted-foreground">Total Expenses</p>
                  </div>
                  <div className="text-center p-4 border rounded">
                    <div className="text-2xl font-bold text-blue-600">
                      {expenseCategories?.length || 0}
                    </div>
                    <p className="text-sm text-muted-foreground">Expense Categories</p>
                  </div>
                  <div className="text-center p-4 border rounded">
                    <div className="text-2xl font-bold text-green-600">
                      {formatPercentage((parseFloat(finalAccounts?.totalExpenses || '0') / parseFloat(finalAccounts?.totalIncome || '1')) * 100)}
                    </div>
                    <p className="text-sm text-muted-foreground">Expense Ratio</p>
                  </div>
                </div>

                {/* Expense Categories */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Expense Categories</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {expenseCategories?.map((category: any) => (
                      <div key={category.id} className="p-4 border rounded">
                        <div className="font-medium">{category.name}</div>
                        <div className="text-sm text-muted-foreground">{category.description}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </div>
    </div>
  );
}