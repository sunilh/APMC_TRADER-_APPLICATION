import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CalendarIcon, Download, TrendingUp, IndianRupee } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BackToDashboard } from "@/components/back-to-dashboard";
import { Navigation } from "@/components/navigation";

interface CessReportData {
  period: string;
  totalTransactions: number;
  totalWeight: number;
  totalWeightQuintals: number;
  basicAmount: number;
  cessAmount: number;
  totalAmount: number;
}

interface DetailedCessReport {
  summary: CessReportData;
  transactions: Array<{
    date: string;
    lotNumber: string;
    farmerName: string;
    buyerName: string;
    weight: number;
    weightQuintals: number;
    basicAmount: number;
    cessAmount: number;
    totalAmount: number;
  }>;
}

export default function CessReports() {
  const [reportType, setReportType] = useState<'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom'>('daily');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'summary' | 'detailed'>('summary');

  const { data: cessReport, isLoading, refetch } = useQuery<DetailedCessReport>({
    queryKey: ['/api/reports/cess', reportType, selectedDate, customStartDate, customEndDate],
    queryFn: async () => {
      const params = new URLSearchParams({
        reportType,
        startDate: selectedDate,
        ...(reportType === 'custom' && { customStartDate, customEndDate })
      });
      
      const response = await fetch(`/api/reports/cess?${params}`, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch CESS report');
      return response.json() as unknown as DetailedCessReport;
    },
    enabled: reportType !== 'custom' || !!(customStartDate && customEndDate)
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatWeight = (weight: number) => {
    return `${weight.toFixed(2)} kg (${(weight / 100).toFixed(2)} quintals)`;
  };

  const generateReport = () => {
    refetch();
  };

  const downloadReport = () => {
    if (!cessReport) return;
    
    const csvContent = [
      // Header
      ['Date', 'Lot Number', 'Weight (kg)', 'Weight (quintals)', 'Basic Amount', 'CESS Amount', 'Total Amount'],
      // Transactions
      ...((cessReport as any)?.transactions || []).map((t: any) => [
        t.date,
        t.lotNumber,
        t.weight.toFixed(2),
        t.weightQuintals.toFixed(2),
        t.basicAmount.toFixed(2),
        t.cessAmount.toFixed(2),
        t.totalAmount.toFixed(2)
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cess-report-${reportType}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6">
        <BackToDashboard />
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h1 className="text-xl sm:text-3xl font-bold text-gray-900 dark:text-white">CESS Reports</h1>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <Button 
              onClick={generateReport} 
              className="bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto min-h-[44px]"
              disabled={isLoading}
            >
              {isLoading ? 'Generating...' : 'Generate Report'}
            </Button>
            <Button 
              onClick={downloadReport} 
              variant="outline"
              disabled={!cessReport}
              className="w-full sm:w-auto min-h-[44px]"
            >
              <Download className="h-4 w-4 mr-2" />
              Download CSV
            </Button>
          </div>
        </div>

        {/* Report Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <CalendarIcon className="h-5 w-5 mr-2" />
            Report Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <div>
            <Label htmlFor="reportType">Report Type</Label>
            <Select value={reportType} onValueChange={(value: any) => setReportType(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select report type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="yearly">Yearly</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {reportType !== 'custom' && (
            <div>
              <Label htmlFor="selectedDate">Date</Label>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>
          )}

          {reportType === 'custom' && (
            <>
              <div>
                <Label htmlFor="customStartDate">Start Date</Label>
                <Input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="customEndDate">End Date</Label>
                <Input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Report Results */}
      {cessReport && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{(cessReport as any)?.summary?.totalTransactions || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Period: {(cessReport as any)?.summary?.period || 'N/A'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Weight</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{((cessReport as any)?.summary?.totalWeightQuintals || 0).toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">
                  {formatWeight((cessReport as any)?.summary?.totalWeight || 0)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Basic Amount</CardTitle>
                <IndianRupee className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency((cessReport as any)?.summary?.basicAmount || 0)}</div>
                <p className="text-xs text-muted-foreground">
                  Total agricultural produce value
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">CESS Amount</CardTitle>
                <IndianRupee className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{formatCurrency((cessReport as any)?.summary?.cessAmount || 0)}</div>
                <p className="text-xs text-muted-foreground">
                  @ 0.6% on basic amount
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Report */}
          <Card>
            <CardHeader>
              <CardTitle>CESS Report Details</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={(value: any) => setActiveTab(value)}>
                <TabsList>
                  <TabsTrigger value="summary">Summary</TabsTrigger>
                  <TabsTrigger value="detailed">Transaction Details</TabsTrigger>
                </TabsList>

                <TabsContent value="summary" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <h3 className="text-lg font-semibold">CESS Summary</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>Basic Amount:</span>
                          <span className="font-semibold">{formatCurrency((cessReport as any)?.summary?.basicAmount || 0)}</span>
                        </div>
                        <div className="flex justify-between text-red-600">
                          <span>CESS @ 0.6%:</span>
                          <span className="font-semibold">{formatCurrency((cessReport as any)?.summary?.cessAmount || 0)}</span>
                        </div>
                        <div className="border-t pt-2">
                          <div className="flex justify-between text-lg font-bold">
                            <span>Total Amount:</span>
                            <span>{formatCurrency((cessReport as any)?.summary?.totalAmount || 0)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="detailed">
                  <div className="overflow-x-auto">
                    <div className="min-w-full">
                      {/* Mobile Card View */}
                      <div className="grid gap-3 md:hidden">
                        {((cessReport as any)?.transactions || []).map((transaction: any, index: number) => (
                          <Card key={index} className="p-3">
                            <div className="space-y-2">
                              <div className="flex justify-between items-center">
                                <span className="font-medium">{transaction.lotNumber}</span>
                                <span className="text-sm text-gray-500">{transaction.date}</span>
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-sm">
                                <div>
                                  <span className="text-gray-500">Weight:</span>
                                  <div>{transaction.weight.toFixed(2)} kg</div>
                                </div>
                                <div>
                                  <span className="text-gray-500">Quintals:</span>
                                  <div>{transaction.weightQuintals.toFixed(2)}</div>
                                </div>
                                <div>
                                  <span className="text-gray-500">Basic:</span>
                                  <div>{formatCurrency(transaction.basicAmount)}</div>
                                </div>
                                <div>
                                  <span className="text-gray-500">CESS:</span>
                                  <div className="text-red-600">{formatCurrency(transaction.cessAmount)}</div>
                                </div>
                              </div>
                              <div className="pt-2 border-t border-gray-200">
                                <span className="text-gray-500 text-sm">Total Amount:</span>
                                <div className="font-bold text-lg">{formatCurrency(transaction.totalAmount)}</div>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                      
                      {/* Desktop Table View */}
                      <div className="hidden md:block">
                        <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Lot Number</TableHead>
                          <TableHead>Weight (kg)</TableHead>
                          <TableHead>Weight (quintals)</TableHead>
                          <TableHead>Basic Amount</TableHead>
                          <TableHead>CESS Amount</TableHead>
                          <TableHead>Total Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {((cessReport as any)?.transactions || []).map((transaction: any, index: number) => (
                          <TableRow key={index}>
                            <TableCell>{transaction.date}</TableCell>
                            <TableCell className="font-medium">{transaction.lotNumber}</TableCell>
                            <TableCell>{transaction.weight.toFixed(2)}</TableCell>
                            <TableCell>{transaction.weightQuintals.toFixed(2)}</TableCell>
                            <TableCell>{formatCurrency(transaction.basicAmount)}</TableCell>
                            <TableCell className="text-red-600">{formatCurrency(transaction.cessAmount)}</TableCell>
                            <TableCell className="font-semibold">{formatCurrency(transaction.totalAmount)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                        </Table>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      )}

        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2">Generating CESS report...</span>
          </div>
        )}
      </div>
    </div>
  );
}