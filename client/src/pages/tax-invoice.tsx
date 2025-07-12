import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Download, FileText, Printer, Eye, CheckCircle, AlertCircle, Plus, History } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { BackToDashboard } from "@/components/back-to-dashboard";

// Tax Invoice Interface
interface TaxInvoice {
  invoiceNumber: string;
  invoiceDate: string;
  hsnCode: string;
  seller: {
    companyName: string;
    apmcCode: string;
    address: string;
    mobile: string;
    gstin: string;
    pan: string;
    fssai: string;
  };
  buyer: {
    companyName: string;
    contactPerson: string;
    address: string;
    mobile: string;
    gstin: string;
    pan: string;
  };
  items: Array<{
    lotNo: string;
    itemName: string;
    hsnCode: string;
    bags: number;
    weightKg: number;
    weightQuintals: number;
    ratePerQuintal: number;
    basicAmount: number;
  }>;
  calculations: {
    basicAmount: number;
    packaging: number;
    hamali: number;
    weighingCharges: number;
    commission: number;
    cess: number;
    taxableAmount: number;
    sgst: number;
    cgst: number;
    igst: number;
    totalGst: number;
    totalAmount: number;
  };
  bankDetails: {
    bankName: string;
    accountNumber: string;
    ifscCode: string;
    accountHolder: string;
    branchName: string;
    branchAddress: string;
  };
}

interface Buyer {
  id: number;
  name: string;
  contactPerson: string;
  mobile: string;
  address: string;
  gstNumber: string;
  panNumber: string;
  hsnCode: string;
}

interface InvoiceRecord {
  id: number;
  invoiceNumber: string;
  invoiceDate: string;
  basicAmount: string;
  totalAmount: string;
  totalBags: number;
  totalWeight: string;
  status: string;
  createdAt: string;
}

export default function TaxInvoice() {
  const [selectedBuyerId, setSelectedBuyerId] = useState<number | null>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [activeTab, setActiveTab] = useState("generate");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Set default date range to current month
  useEffect(() => {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    setStartDate(startOfMonth.toISOString().slice(0, 10));
    setEndDate(endOfMonth.toISOString().slice(0, 10));
  }, []);

  // Fetch all buyers
  const { data: buyers = [], isLoading: buyersLoading } = useQuery<Buyer[]>({
    queryKey: ["/api/buyers"],
  });

  // Check if tax invoice already exists for selected buyer
  const { data: invoiceCheck, isLoading: checkLoading } = useQuery({
    queryKey: ["/api/tax-invoice", selectedBuyerId, "check"],
    queryFn: async () => {
      if (!selectedBuyerId) return null;
      const response = await fetch(`/api/tax-invoice/${selectedBuyerId}/check`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error(`${response.status}: ${response.statusText}`);
      }
      return response.json();
    },
    enabled: !!selectedBuyerId,
  });

  // Fetch tax invoice for selected buyer (only if exists)
  const { data: taxInvoice, isLoading: invoiceLoading } = useQuery<TaxInvoice>({
    queryKey: ["/api/tax-invoice", selectedBuyerId],
    queryFn: async () => {
      if (!selectedBuyerId) return null;
      const response = await fetch(`/api/tax-invoice/${selectedBuyerId}`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error(`${response.status}: ${response.statusText}`);
      }
      return response.json();
    },
    enabled: !!selectedBuyerId && invoiceCheck?.exists,
  });

  // Fetch all historical invoices with date range filtering
  const { data: allInvoices = [], isLoading: allInvoicesLoading } = useQuery<InvoiceRecord[]>({
    queryKey: ["/api/tax-invoices", selectedBuyerId, startDate, endDate],
    queryFn: async () => {
      if (!selectedBuyerId) return [];
      let url = `/api/tax-invoices/${selectedBuyerId}`;
      if (startDate && endDate) {
        url += `?startDate=${startDate}&endDate=${endDate}`;
      }
      const response = await fetch(url, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error(`${response.status}: ${response.statusText}`);
      }
      return response.json();
    },
    enabled: !!selectedBuyerId && activeTab === "history",
  });

  // Generate new tax invoice
  const generateInvoiceMutation = useMutation({
    mutationFn: async (buyerId: number) => {
      return await apiRequest("POST", `/api/tax-invoice/${buyerId}`, {});
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Tax invoice generated and saved successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/tax-invoice", selectedBuyerId, "check"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tax-invoice", selectedBuyerId] });
      queryClient.invalidateQueries({ queryKey: ["/api/tax-invoices", selectedBuyerId] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to generate tax invoice",
        variant: "destructive",
      });
    },
  });

  const formatCurrency = (amount: number | string | undefined | null) => {
    if (amount === undefined || amount === null) return '₹0.00';
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(num)) return '₹0.00';
    return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN');
  };

  const selectedBuyer = buyers.find(b => b.id === selectedBuyerId);

  // Function to download tax invoice as PDF
  const downloadTaxInvoicePDF = async (invoice: InvoiceRecord) => {
    try {
      const response = await fetch(`/api/tax-invoice-data/${invoice.id}`, {
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error("Failed to fetch invoice details");
      }
      
      const invoiceData = await response.json();
      
      // Create and download PDF
      const { jsPDF } = await import('jspdf');
      const pdf = new jsPDF();
      
      // Header
      pdf.setFontSize(16);
      pdf.text('TAX INVOICE', 105, 20, { align: 'center' });
      
      pdf.setFontSize(12);
      pdf.text(`Invoice Number: ${invoice.invoiceNumber}`, 20, 35);
      pdf.text(`Date: ${formatDate(invoice.invoiceDate)}`, 150, 35);
      
      // Seller and buyer details
      pdf.text('Seller Details:', 20, 50);
      pdf.text(`${invoiceData.seller?.companyName || 'N/A'}`, 20, 60);
      pdf.text(`GSTIN: ${invoiceData.seller?.gstin || 'N/A'}`, 20, 70);
      
      pdf.text('Buyer Details:', 20, 85);
      pdf.text(`${invoiceData.buyer?.companyName || 'N/A'}`, 20, 95);
      pdf.text(`GSTIN: ${invoiceData.buyer?.gstin || 'N/A'}`, 20, 105);
      
      // Invoice summary
      let yPos = 120;
      pdf.text('Invoice Summary:', 20, yPos);
      yPos += 15;
      
      pdf.text(`Basic Amount: ${formatCurrency(invoice.basicAmount)}`, 20, yPos);
      yPos += 10;
      pdf.text(`Total Bags: ${invoice.totalBags}`, 20, yPos);
      yPos += 10;
      pdf.text(`Total Weight: ${invoice.totalWeight} kg`, 20, yPos);
      yPos += 15;
      
      pdf.setFontSize(14);
      pdf.text(`Total Amount: ${formatCurrency(invoice.totalAmount)}`, 20, yPos);
      
      pdf.save(`tax-invoice-${invoice.invoiceNumber}.pdf`);
      
      toast({
        title: "Success",
        description: "Invoice PDF downloaded successfully!",
      });
    } catch (error) {
      console.error("Error downloading PDF:", error);
      toast({
        title: "Error",
        description: "Failed to download PDF",
        variant: "destructive",
      });
    }
  };

  // Function to print tax invoice
  const printTaxInvoice = async (invoice: InvoiceRecord) => {
    try {
      const response = await fetch(`/api/tax-invoice-data/${invoice.id}`, {
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error("Failed to fetch invoice details");
      }
      
      const invoiceData = await response.json();
      
      const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Tax Invoice - ${invoice.invoiceNumber}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 20px; }
            .details { margin-bottom: 20px; }
            .summary { border-collapse: collapse; width: 100%; }
            .summary th, .summary td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            .summary th { background-color: #f2f2f2; }
            .total { font-weight: bold; background-color: #e8f5e8; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>TAX INVOICE</h2>
            <p>Invoice Number: ${invoice.invoiceNumber} | Date: ${formatDate(invoice.invoiceDate)}</p>
          </div>
          
          <div class="details">
            <h3>Seller Details:</h3>
            <p><strong>Company:</strong> ${invoiceData.seller?.companyName || 'N/A'}</p>
            <p><strong>GSTIN:</strong> ${invoiceData.seller?.gstin || 'N/A'}</p>
            
            <h3>Buyer Details:</h3>
            <p><strong>Company:</strong> ${invoiceData.buyer?.companyName || 'N/A'}</p>
            <p><strong>GSTIN:</strong> ${invoiceData.buyer?.gstin || 'N/A'}</p>
          </div>
          
          <table class="summary">
            <tr><th>Description</th><th>Details</th></tr>
            <tr><td>Invoice Number</td><td>${invoice.invoiceNumber}</td></tr>
            <tr><td>Basic Amount</td><td>${formatCurrency(invoice.basicAmount)}</td></tr>
            <tr><td>Total Bags</td><td>${invoice.totalBags}</td></tr>
            <tr><td>Total Weight</td><td>${invoice.totalWeight} kg</td></tr>
            <tr class="total"><td><strong>Total Amount</strong></td><td><strong>${formatCurrency(invoice.totalAmount)}</strong></td></tr>
          </table>
          
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 100);
            }
          </script>
        </body>
        </html>
      `;
      
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(printContent);
        printWindow.document.close();
      }
    } catch (error) {
      console.error("Error printing invoice:", error);
      toast({
        title: "Error",
        description: "Failed to print invoice",
        variant: "destructive",
      });
    }
  };

  const generatePrintableInvoice = () => {
    if (!taxInvoice) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const invoiceHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Tax Invoice - ${taxInvoice.invoiceNumber}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; font-size: 12px; line-height: 1.4; }
            .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px; }
            .invoice-title { font-size: 18px; font-weight: bold; margin-bottom: 5px; }
            .company-info { display: flex; justify-content: space-between; margin-bottom: 20px; }
            .seller, .buyer { width: 48%; }
            .section-title { font-weight: bold; margin-bottom: 5px; text-decoration: underline; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th, td { border: 1px solid #000; padding: 8px; text-align: left; }
            th { background-color: #f0f0f0; font-weight: bold; }
            .calculations { margin-top: 20px; }
            .total-row { font-weight: bold; background-color: #f0f0f0; }
            .bank-details { margin-top: 20px; border: 1px solid #000; padding: 10px; }
            @media print { body { margin: 0; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="invoice-title">TAX INVOICE</div>
            <div>Invoice No: ${taxInvoice.invoiceNumber} | Date: ${taxInvoice.invoiceDate}</div>
          </div>

          <div class="company-info">
            <div class="seller">
              <div class="section-title">SELLER DETAILS</div>
              <div><strong>${taxInvoice.seller.companyName}</strong></div>
              <div>APMC Code: ${taxInvoice.seller.apmcCode}</div>
              <div>${taxInvoice.seller.address}</div>
              <div>Mobile: ${taxInvoice.seller.mobile}</div>
              <div>GSTIN: ${taxInvoice.seller.gstin}</div>
              <div>PAN: ${taxInvoice.seller.pan}</div>
              <div>FSSAI: ${taxInvoice.seller.fssai}</div>
            </div>
            <div class="buyer">
              <div class="section-title">BUYER DETAILS</div>
              <div><strong>${taxInvoice.buyer.companyName}</strong></div>
              <div>Contact: ${taxInvoice.buyer.contactPerson}</div>
              <div>${taxInvoice.buyer.address}</div>
              <div>Mobile: ${taxInvoice.buyer.mobile}</div>
              <div>GSTIN: ${taxInvoice.buyer.gstin}</div>
              <div>PAN: ${taxInvoice.buyer.pan}</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Lot No</th>
                <th>Item</th>
                <th>HSN Code</th>
                <th>Bags</th>
                <th>Weight (Kg)</th>
                <th>Weight (Qtl)</th>
                <th>Rate/Qtl</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              ${taxInvoice.items.map(item => `
                <tr>
                  <td>${item.lotNo}</td>
                  <td>${item.itemName}</td>
                  <td>${item.hsnCode}</td>
                  <td>${item.bags}</td>
                  <td>${item.weightKg}</td>
                  <td>${item.weightQuintals.toFixed(2)}</td>
                  <td>${formatCurrency(item.ratePerQuintal)}</td>
                  <td>${formatCurrency(item.basicAmount)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="calculations">
            <table style="width: 50%; margin-left: auto;">
              <tr><td>Basic Amount:</td><td>${formatCurrency(taxInvoice.calculations.basicAmount)}</td></tr>
              <tr><td>Packaging:</td><td>${formatCurrency(taxInvoice.calculations.packaging)}</td></tr>
              <tr><td>Hamali:</td><td>${formatCurrency(taxInvoice.calculations.hamali)}</td></tr>
              <tr><td>Weighing Charges:</td><td>${formatCurrency(taxInvoice.calculations.weighingCharges)}</td></tr>
              <tr><td>Commission:</td><td>${formatCurrency(taxInvoice.calculations.commission)}</td></tr>
              <tr><td>CESS @ 0.6%:</td><td>${formatCurrency(taxInvoice.calculations.cess)}</td></tr>
              <tr><td>SGST @ 2.5%:</td><td>${formatCurrency(taxInvoice.calculations.sgst)}</td></tr>
              <tr><td>CGST @ 2.5%:</td><td>${formatCurrency(taxInvoice.calculations.cgst)}</td></tr>
              <tr class="total-row"><td><strong>Total Amount:</strong></td><td><strong>${formatCurrency(taxInvoice.calculations.totalAmount)}</strong></td></tr>
            </table>
          </div>

          <div class="bank-details">
            <div class="section-title">BANK DETAILS</div>
            <div>Bank: ${taxInvoice.bankDetails.bankName}</div>
            <div>Account No: ${taxInvoice.bankDetails.accountNumber}</div>
            <div>IFSC: ${taxInvoice.bankDetails.ifscCode}</div>
            <div>Account Holder: ${taxInvoice.bankDetails.accountHolder}</div>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(invoiceHtml);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  if (buyersLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">Loading buyers...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <BackToDashboard />
      
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center gap-2 mb-6">
            <FileText className="h-6 w-6 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">Tax Invoice Management</h1>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="generate" className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Generate Invoice
              </TabsTrigger>
              <TabsTrigger value="history" className="flex items-center gap-2">
                <History className="h-4 w-4" />
                Invoice History
              </TabsTrigger>
            </TabsList>

            <TabsContent value="generate" className="space-y-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Generate New Tax Invoice</CardTitle>
                  <CardDescription>
                    Select a buyer to generate tax invoice for today's completed lots
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="buyer">Select Buyer</Label>
                    <Select
                      value={selectedBuyerId?.toString() || ""}
                      onValueChange={(value) => setSelectedBuyerId(parseInt(value))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a buyer..." />
                      </SelectTrigger>
                      <SelectContent>
                        {buyers.map((buyer) => (
                          <SelectItem key={buyer.id} value={buyer.id.toString()}>
                            {buyer.name} - {buyer.contactPerson}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedBuyerId && (
                    <div className="space-y-4">
                      {checkLoading ? (
                        <Alert>
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>Checking invoice status...</AlertDescription>
                        </Alert>
                      ) : invoiceCheck?.exists ? (
                        <div className="space-y-4">
                          <Alert>
                            <CheckCircle className="h-4 w-4" />
                            <AlertDescription>
                              Tax invoice already exists for {selectedBuyer?.name}.
                            </AlertDescription>
                          </Alert>
                          
                          {taxInvoice && (
                            <Card>
                              <CardHeader>
                                <CardTitle className="text-lg">Latest Invoice</CardTitle>
                              </CardHeader>
                              <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                  <div>
                                    <span className="font-medium">Invoice Number:</span>
                                    <div>{taxInvoice.invoiceNumber}</div>
                                  </div>
                                  <div>
                                    <span className="font-medium">Date:</span>
                                    <div>{taxInvoice.invoiceDate}</div>
                                  </div>
                                  <div>
                                    <span className="font-medium">Total Amount:</span>
                                    <div className="font-bold text-green-600">
                                      {formatCurrency(taxInvoice.calculations.totalAmount)}
                                    </div>
                                  </div>
                                  <div>
                                    <span className="font-medium">Items:</span>
                                    <div>{taxInvoice.items.length} lots</div>
                                  </div>
                                </div>
                                
                                <div className="flex gap-2">
                                  <Button
                                    onClick={generatePrintableInvoice}
                                    variant="outline"
                                    size="sm"
                                  >
                                    <Printer className="h-4 w-4 mr-2" />
                                    Print
                                  </Button>
                                </div>
                              </CardContent>
                            </Card>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <Alert>
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                              No tax invoice found for {selectedBuyer?.name}. You can generate a new one.
                            </AlertDescription>
                          </Alert>
                          
                          <Button
                            onClick={() => generateInvoiceMutation.mutate(selectedBuyerId)}
                            disabled={generateInvoiceMutation.isPending}
                            className="w-full sm:w-auto"
                          >
                            {generateInvoiceMutation.isPending ? "Generating..." : "Generate Tax Invoice"}
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="history" className="space-y-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Invoice History</CardTitle>
                  <CardDescription>
                    View all historical tax invoices with date range filtering
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="buyer-history">Select Buyer</Label>
                      <Select
                        value={selectedBuyerId?.toString() || ""}
                        onValueChange={(value) => setSelectedBuyerId(parseInt(value))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a buyer..." />
                        </SelectTrigger>
                        <SelectContent>
                          {buyers.map((buyer) => (
                            <SelectItem key={buyer.id} value={buyer.id.toString()}>
                              {buyer.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="start-date">Start Date</Label>
                      <Input
                        id="start-date"
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="end-date">End Date</Label>
                      <Input
                        id="end-date"
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                      />
                    </div>
                  </div>

                  {selectedBuyerId && (
                    <div className="space-y-4">
                      {allInvoicesLoading ? (
                        <Alert>
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>Loading invoice history...</AlertDescription>
                        </Alert>
                      ) : allInvoices.length > 0 ? (
                        <div className="border rounded-lg overflow-hidden">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Invoice Number</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Basic Amount</TableHead>
                                <TableHead>Total Amount</TableHead>
                                <TableHead>Bags</TableHead>
                                <TableHead>Weight (Kg)</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {allInvoices.map((invoice) => (
                                <TableRow key={invoice.id}>
                                  <TableCell className="font-medium">
                                    {invoice.invoiceNumber}
                                  </TableCell>
                                  <TableCell>{formatDate(invoice.invoiceDate)}</TableCell>
                                  <TableCell>{formatCurrency(invoice.basicAmount)}</TableCell>
                                  <TableCell className="font-semibold">
                                    {formatCurrency(invoice.totalAmount)}
                                  </TableCell>
                                  <TableCell>{invoice.totalBags}</TableCell>
                                  <TableCell>{parseFloat(invoice.totalWeight).toFixed(2)}</TableCell>
                                  <TableCell>
                                    <Badge variant={invoice.status === 'generated' ? 'default' : 'secondary'}>
                                      {invoice.status}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      <Dialog>
                                        <DialogTrigger asChild>
                                          <Button variant="outline" size="sm">
                                            <Eye className="h-4 w-4 mr-1" />
                                            View
                                          </Button>
                                        </DialogTrigger>
                                        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                                          <DialogHeader>
                                            <DialogTitle>Tax Invoice - {invoice.invoiceNumber}</DialogTitle>
                                          </DialogHeader>
                                          <div className="space-y-4">
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                              <div>
                                                <span className="font-medium">Invoice Number:</span>
                                                <div>{invoice.invoiceNumber}</div>
                                              </div>
                                              <div>
                                                <span className="font-medium">Date:</span>
                                                <div>{formatDate(invoice.invoiceDate)}</div>
                                              </div>
                                              <div>
                                                <span className="font-medium">Basic Amount:</span>
                                                <div className="font-bold text-green-600">
                                                  {formatCurrency(invoice.basicAmount)}
                                                </div>
                                              </div>
                                              <div>
                                                <span className="font-medium">Total Amount:</span>
                                                <div className="font-bold text-blue-600">
                                                  {formatCurrency(invoice.totalAmount)}
                                                </div>
                                              </div>
                                              <div>
                                                <span className="font-medium">Total Bags:</span>
                                                <div>{invoice.totalBags}</div>
                                              </div>
                                              <div>
                                                <span className="font-medium">Total Weight:</span>
                                                <div>{parseFloat(invoice.totalWeight).toFixed(2)} kg</div>
                                              </div>
                                            </div>
                                            
                                            <div className="flex justify-center gap-2">
                                              <Button
                                                onClick={() => downloadTaxInvoicePDF(invoice)}
                                                variant="outline"
                                                size="sm"
                                              >
                                                <Download className="h-4 w-4 mr-2" />
                                                Download PDF
                                              </Button>
                                              <Button
                                                onClick={() => printTaxInvoice(invoice)}
                                                variant="outline"
                                                size="sm"
                                              >
                                                <Printer className="h-4 w-4 mr-2" />
                                                Print
                                              </Button>
                                            </div>
                                          </div>
                                        </DialogContent>
                                      </Dialog>
                                      
                                      <Button 
                                        variant="ghost" 
                                        size="sm"
                                        onClick={() => downloadTaxInvoicePDF(invoice)}
                                      >
                                        <Download className="h-4 w-4 mr-1" />
                                        Download
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      ) : (
                        <Alert>
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>
                            No invoices found for {selectedBuyer?.name} in the selected date range.
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}