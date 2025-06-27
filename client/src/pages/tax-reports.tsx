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

interface TaxReportData {
  period: string;
  totalTransactions: number;
  totalWeight: number;
  totalWeightQuintals: number;
  basicAmount: number;
  packaging: number;
  weighingCharges: number;
  commission: number;
  cessAmount: number;
  sgstAmount: number;
  cgstAmount: number;
  totalTaxAmount: number;
  totalAmount: number;
}

interface DetailedTaxReport {
  summary: TaxReportData;
  transactions: Array<{
    date: string;
    lotNumber: string;
    farmerName: string;
    buyerName: string;
    weight: number;
    weightQuintals: number;
    basicAmount: number;
    cessAmount: number;
    sgstAmount: number;
    cgstAmount: number;
    totalTaxAmount: number;
    totalAmount: number;
  }>;
}

export default function TaxReports() {
  const [reportType, setReportType] = useState<'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom'>('daily');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'summary' | 'detailed'>('summary');

  const { data: taxReport, isLoading, refetch } = useQuery<DetailedTaxReport>({
    queryKey: ['/api/reports/tax', reportType, selectedDate, customStartDate, customEndDate],
    queryFn: async () => {
      const params = new URLSearchParams({
        reportType,
        startDate: selectedDate,
        ...(reportType === 'custom' && { customStartDate, customEndDate })
      });
      
      const response = await fetch(`/api/reports/tax?${params}`);
      if (!response.ok) throw new Error('Failed to fetch tax report');
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
    if (!taxReport) return;
    
    const csvContent = [
      // Header
      ['Date', 'Lot Number', 'Weight (kg)', 'Weight (quintals)', 'Basic Amount', 'CESS', 'SGST', 'CGST', 'Total Tax', 'Total Amount'],
      // Transactions
      ...taxReport.transactions.map(t => [
        t.date,
        t.lotNumber,
        t.weight.toFixed(2),
        t.weightQuintals.toFixed(2),
        t.basicAmount.toFixed(2),
        t.cessAmount.toFixed(2),
        t.sgstAmount.toFixed(2),
        t.cgstAmount.toFixed(2),
        t.totalTaxAmount.toFixed(2),
        t.totalAmount.toFixed(2)
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tax-report-${reportType}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Tax Reports</h1>
          <p className="text-gray-600">GST and CESS reporting for agricultural transactions</p>
        </div>
        <Button onClick={downloadReport} disabled={!taxReport} className="flex items-center gap-2">
          <Download className="h-4 w-4" />
          Download CSV
        </Button>
      </div>

      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Report Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Report Type */}
            <div className="space-y-2">
              <Label>Report Period</Label>
              <Select value={reportType} onValueChange={(value: any) => setReportType(value)}>
                <SelectTrigger>
                  <SelectValue />
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

            {/* Base Date */}
            {reportType !== 'custom' && (
              <div className="space-y-2">
                <Label>Base Date</Label>
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
              </div>
            )}

            {/* Custom Date Range */}
            {reportType === 'custom' && (
              <>
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                  />
                </div>
              </>
            )}

            {/* Generate Button */}
            <div className="flex items-end">
              <Button onClick={generateReport} disabled={isLoading} className="w-full">
                {isLoading ? 'Generating...' : 'Generate Report'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Report Content */}
      {taxReport && (
        <Tabs value={activeTab} onValueChange={(value: any) => setActiveTab(value)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="detailed">Detailed Transactions</TabsTrigger>
          </TabsList>

          {/* Summary Tab */}
          <TabsContent value="summary" className="space-y-6">
            {/* Period Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Report Period: {taxReport.summary.period}</span>
                  <span className="text-sm text-gray-600">{taxReport.summary.totalTransactions} transactions</span>
                </CardTitle>
              </CardHeader>
            </Card>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Weight</p>
                      <p className="text-2xl font-bold">{taxReport.summary.totalWeightQuintals.toFixed(2)}</p>
                      <p className="text-xs text-gray-500">quintals</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center space-x-2">
                    <IndianRupee className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="text-sm font-medium text-gray-600">Basic Amount</p>
                      <p className="text-2xl font-bold">{formatCurrency(taxReport.summary.basicAmount)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center space-x-2">
                    <IndianRupee className="h-5 w-5 text-orange-600" />
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Tax</p>
                      <p className="text-2xl font-bold">{formatCurrency(taxReport.summary.totalTaxAmount)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center space-x-2">
                    <IndianRupee className="h-5 w-5 text-purple-600" />
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Amount</p>
                      <p className="text-2xl font-bold">{formatCurrency(taxReport.summary.totalAmount)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Tax Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Tax Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-gray-600">CESS (0.6%)</span>
                      <span className="font-semibold">{formatCurrency(taxReport.summary.cessAmount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">SGST (2.5%)</span>
                      <span className="font-semibold">{formatCurrency(taxReport.summary.sgstAmount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">CGST (2.5%)</span>
                      <span className="font-semibold">{formatCurrency(taxReport.summary.cgstAmount)}</span>
                    </div>
                    <hr />
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total Tax</span>
                      <span>{formatCurrency(taxReport.summary.totalTaxAmount)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Charges Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Basic Amount</span>
                      <span className="font-semibold">{formatCurrency(taxReport.summary.basicAmount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Packaging Charges</span>
                      <span className="font-semibold">{formatCurrency(taxReport.summary.packaging)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Weighing Charges</span>
                      <span className="font-semibold">{formatCurrency(taxReport.summary.weighingCharges)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Commission</span>
                      <span className="font-semibold">{formatCurrency(taxReport.summary.commission)}</span>
                    </div>
                    <hr />
                    <div className="flex justify-between text-lg font-bold">
                      <span>Subtotal</span>
                      <span>{formatCurrency(taxReport.summary.basicAmount + taxReport.summary.packaging + taxReport.summary.weighingCharges + taxReport.summary.commission)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Detailed Tab */}
          <TabsContent value="detailed">
            <Card>
              <CardHeader>
                <CardTitle>Transaction Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Lot Number</TableHead>
                        <TableHead>Weight</TableHead>
                        <TableHead>Basic Amount</TableHead>
                        <TableHead>CESS</TableHead>
                        <TableHead>SGST</TableHead>
                        <TableHead>CGST</TableHead>
                        <TableHead>Total Tax</TableHead>
                        <TableHead>Total Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {taxReport.transactions.map((transaction, index) => (
                        <TableRow key={index}>
                          <TableCell>{transaction.date}</TableCell>
                          <TableCell className="font-medium">{transaction.lotNumber}</TableCell>
                          <TableCell>{formatWeight(transaction.weight)}</TableCell>
                          <TableCell>{formatCurrency(transaction.basicAmount)}</TableCell>
                          <TableCell>{formatCurrency(transaction.cessAmount)}</TableCell>
                          <TableCell>{formatCurrency(transaction.sgstAmount)}</TableCell>
                          <TableCell>{formatCurrency(transaction.cgstAmount)}</TableCell>
                          <TableCell className="font-semibold">{formatCurrency(transaction.totalTaxAmount)}</TableCell>
                          <TableCell className="font-bold">{formatCurrency(transaction.totalAmount)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Loading State */}
      {isLoading && (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="text-gray-500">Generating tax report...</div>
          </CardContent>
        </Card>
      )}

      {/* No Data State */}
      {!isLoading && !taxReport && (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="text-gray-500">Configure report parameters and click Generate Report</div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}