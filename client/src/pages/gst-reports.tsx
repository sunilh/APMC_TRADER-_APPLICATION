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

interface GstReportData {
  period: string;
  totalTransactions: number;
  totalWeight: number;
  totalWeightQuintals: number;
  basicAmount: number;
  sgstAmount: number;
  cgstAmount: number;
  totalGstAmount: number;
  totalAmount: number;
}

interface DetailedGstReport {
  summary: GstReportData;
  transactions: Array<{
    date: string;
    lotNumber: string;
    farmerName: string;
    buyerName: string;
    weight: number;
    weightQuintals: number;
    basicAmount: number;
    sgstAmount: number;
    cgstAmount: number;
    totalGstAmount: number;
    totalAmount: number;
  }>;
}

export default function GstReports() {
  const [reportType, setReportType] = useState<'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom'>('daily');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'summary' | 'detailed'>('summary');

  const { data: gstReport, isLoading, refetch } = useQuery<DetailedGstReport>({
    queryKey: ['/api/reports/gst', reportType, selectedDate, customStartDate, customEndDate],
    queryFn: async () => {
      const params = new URLSearchParams({
        reportType,
        startDate: selectedDate,
        ...(reportType === 'custom' && { customStartDate, customEndDate })
      });
      
      const response = await fetch(`/api/reports/gst?${params}`);
      if (!response.ok) throw new Error('Failed to fetch GST report');
      return response.json();
    },
    enabled: reportType !== 'custom' || (customStartDate && customEndDate)
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
    if (!gstReport) return;
    
    const csvContent = [
      // Header
      ['Date', 'Lot Number', 'Weight (kg)', 'Weight (quintals)', 'Basic Amount', 'SGST', 'CGST', 'Total GST', 'Total Amount'],
      // Transactions
      ...gstReport.transactions.map(t => [
        t.date,
        t.lotNumber,
        t.weight.toFixed(2),
        t.weightQuintals.toFixed(2),
        t.basicAmount.toFixed(2),
        t.sgstAmount.toFixed(2),
        t.cgstAmount.toFixed(2),
        t.totalGstAmount.toFixed(2),
        t.totalAmount.toFixed(2)
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gst-report-${reportType}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">GST Reports</h1>
        <div className="flex items-center space-x-3">
          <Button 
            onClick={generateReport} 
            className="bg-blue-600 hover:bg-blue-700 text-white"
            disabled={isLoading}
          >
            {isLoading ? 'Generating...' : 'Generate Report'}
          </Button>
          <Button 
            onClick={downloadReport} 
            variant="outline"
            disabled={!gstReport}
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
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
      {gstReport && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{gstReport.summary.totalTransactions}</div>
                <p className="text-xs text-muted-foreground">
                  Period: {gstReport.summary.period}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Weight</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{gstReport.summary.totalWeightQuintals.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">
                  {formatWeight(gstReport.summary.totalWeight)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Basic Amount</CardTitle>
                <IndianRupee className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(gstReport.summary.basicAmount)}</div>
                <p className="text-xs text-muted-foreground">
                  Total agricultural produce value
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total GST</CardTitle>
                <IndianRupee className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{formatCurrency(gstReport.summary.totalGstAmount)}</div>
                <p className="text-xs text-muted-foreground">
                  SGST (2.5%) + CGST (2.5%)
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Report */}
          <Card>
            <CardHeader>
              <CardTitle>GST Report Details</CardTitle>
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
                      <h3 className="text-lg font-semibold">GST Summary</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>Basic Amount:</span>
                          <span className="font-semibold">{formatCurrency(gstReport.summary.basicAmount)}</span>
                        </div>

                        <div className="border-t pt-2">
                          <div className="flex justify-between text-blue-600">
                            <span>SGST @ 2.5%:</span>
                            <span className="font-semibold">{formatCurrency(gstReport.summary.sgstAmount)}</span>
                          </div>
                          <div className="flex justify-between text-blue-600">
                            <span>CGST @ 2.5%:</span>
                            <span className="font-semibold">{formatCurrency(gstReport.summary.cgstAmount)}</span>
                          </div>
                          <div className="flex justify-between text-lg font-bold text-blue-600">
                            <span>Total GST:</span>
                            <span>{formatCurrency(gstReport.summary.totalGstAmount)}</span>
                          </div>
                        </div>
                        <div className="border-t pt-2">
                          <div className="flex justify-between text-lg font-bold">
                            <span>Total Amount:</span>
                            <span>{formatCurrency(gstReport.summary.totalAmount)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="detailed">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Lot Number</TableHead>
                          <TableHead>Weight (kg)</TableHead>
                          <TableHead>Weight (quintals)</TableHead>
                          <TableHead>Basic Amount</TableHead>
                          <TableHead>SGST</TableHead>
                          <TableHead>CGST</TableHead>
                          <TableHead>Total GST</TableHead>
                          <TableHead>Total Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {gstReport.transactions.map((transaction, index) => (
                          <TableRow key={index}>
                            <TableCell>{transaction.date}</TableCell>
                            <TableCell className="font-medium">{transaction.lotNumber}</TableCell>
                            <TableCell>{transaction.weight.toFixed(2)}</TableCell>
                            <TableCell>{transaction.weightQuintals.toFixed(2)}</TableCell>
                            <TableCell>{formatCurrency(transaction.basicAmount)}</TableCell>
                            <TableCell className="text-blue-600">{formatCurrency(transaction.sgstAmount)}</TableCell>
                            <TableCell className="text-blue-600">{formatCurrency(transaction.cgstAmount)}</TableCell>
                            <TableCell className="text-blue-600 font-semibold">{formatCurrency(transaction.totalGstAmount)}</TableCell>
                            <TableCell className="font-semibold">{formatCurrency(transaction.totalAmount)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
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
          <span className="ml-2">Generating GST report...</span>
        </div>
      )}
    </div>
  );
}