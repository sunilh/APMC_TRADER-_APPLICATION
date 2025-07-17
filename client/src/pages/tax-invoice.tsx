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
import { Navigation } from "@/components/navigation";

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
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10)); // Default to today
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

  // Check if tax invoice already exists for selected buyer on selected date
  const { data: invoiceCheck, isLoading: checkLoading } = useQuery({
    queryKey: ["/api/tax-invoice", selectedBuyerId, "check", selectedDate],
    queryFn: async () => {
      if (!selectedBuyerId) return null;
      const response = await fetch(`/api/tax-invoice/${selectedBuyerId}/check?date=${selectedDate}`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error(`${response.status}: ${response.statusText}`);
      }
      return response.json();
    },
    enabled: !!selectedBuyerId,
  });

  // Fetch tax invoice for selected buyer on selected date (only if exists)
  const { data: taxInvoice, isLoading: invoiceLoading } = useQuery<TaxInvoice>({
    queryKey: ["/api/tax-invoice", selectedBuyerId, selectedDate],
    queryFn: async () => {
      if (!selectedBuyerId || !invoiceCheck?.exists) return null;
      const response = await fetch(`/api/tax-invoice/${selectedBuyerId}?date=${selectedDate}`, {
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
      return await apiRequest("POST", `/api/tax-invoice/${buyerId}`, { selectedDate });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Tax invoice generated and saved successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/tax-invoice", selectedBuyerId, "check", selectedDate] });
      queryClient.invalidateQueries({ queryKey: ["/api/tax-invoice", selectedBuyerId, selectedDate] });
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

  // Function to print tax invoice using new format
  const printTaxInvoice = async (invoice: InvoiceRecord) => {
    try {
      const response = await fetch(`/api/tax-invoice-data/${invoice.id}`, {
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error("Failed to fetch invoice details");
      }
      
      const invoiceData = await response.json();
      
      const printWindow = window.open('', '_blank');
      if (!printWindow) return;

      const invoiceHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>Tax Invoice - ${invoice.invoiceNumber}</title>
            <style>
              body { 
                font-family: Arial, sans-serif; 
                margin: 20px; 
                font-size: 12px; 
                line-height: 1.4; 
                color: #000;
              }
              .header { 
                text-align: center; 
                margin-bottom: 30px; 
              }
              .invoice-title { 
                font-size: 18px; 
                font-weight: bold; 
                margin-bottom: 8px; 
                letter-spacing: 2px;
              }
              .invoice-details { 
                font-size: 14px; 
                margin-bottom: 8px; 
              }
              .hsn-code { 
                font-size: 14px; 
                margin-bottom: 25px; 
              }
              .company-info { 
                display: flex; 
                justify-content: space-between; 
                margin-bottom: 30px; 
                min-height: 160px;
              }
              .seller, .buyer { 
                width: 48%; 
                font-size: 11px; 
              }
              .section-title { 
                font-weight: bold; 
                margin-bottom: 10px; 
                font-size: 12px;
                text-decoration: underline;
              }
              .company-field {
                margin-bottom: 4px;
                line-height: 1.5;
              }
              .item-details-title { 
                font-weight: bold; 
                margin: 25px 0 15px 0; 
                font-size: 12px; 
              }
              .items-table { 
                width: 100%; 
                border-collapse: collapse; 
                margin-bottom: 25px; 
                font-size: 11px; 
              }
              .items-table th, .items-table td { 
                border: 1px solid #000; 
                padding: 8px; 
                text-align: center; 
              }
              .items-table th { 
                background-color: #f0f0f0; 
                font-weight: bold; 
                font-size: 10px; 
              }
              .calculations-section { 
                display: flex; 
                justify-content: space-between; 
                margin-top: 25px; 
              }
              .calculations { 
                width: 45%; 
              }
              .bank-details { 
                width: 45%; 
              }
              .calc-title, .bank-title { 
                font-weight: bold; 
                margin-bottom: 15px; 
                font-size: 12px; 
                text-decoration: underline;
              }
              .calc-line, .bank-line { 
                display: flex; 
                justify-content: space-between; 
                margin-bottom: 3px; 
                font-size: 11px; 
              }
              .total-payable { 
                font-weight: bold; 
                font-size: 13px; 
                margin-top: 8px; 
                padding-top: 8px; 
                border-top: 1px solid #000;
              }
              .terms { 
                margin-top: 20px; 
                font-size: 10px; 
                line-height: 1.4;
              }
              .signature { 
                text-align: right; 
                margin-top: 50px; 
                padding-right: 0px; 
                font-size: 11px;
              }
              @media print { 
                body { margin: 10px; } 
                .calculations-section { page-break-inside: avoid; }
              }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="invoice-title">TAX INVOICE</div>
              <div class="invoice-details">Invoice No: ${invoice.invoiceNumber} Date: ${new Date(invoice.invoiceDate).toLocaleDateString('en-GB')}</div>
              <div class="hsn-code">HSN Code: 09042110</div>
            </div>

            <div class="company-info">
              <div class="seller">
                <div class="section-title">SELLER DETAILS</div>
                <div class="company-field"><strong>Company:</strong> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;${invoiceData.seller?.companyName || 'N/A'}</div>
                <div class="company-field"><strong>APMC:</strong> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;${invoiceData.seller?.apmcCode || 'N/A'}</div>
                <div class="company-field"><strong>Address:</strong> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;${invoiceData.seller?.address || 'N/A'}</div>
                <div class="company-field">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</div>
                <div class="company-field"><strong>Mobile:</strong> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;${invoiceData.seller?.mobile || 'N/A'}</div>
                <div class="company-field"><strong>GSTIN:</strong> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;${invoiceData.seller?.gstin || 'N/A'}</div>
                <div class="company-field"><strong>PAN:</strong> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;${invoiceData.seller?.pan || 'N/A'}</div>
                <div class="company-field"><strong>FSSAI:</strong> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;${invoiceData.seller?.fssai || 'N/A'}</div>
              </div>
              <div class="buyer">
                <div class="section-title">BUYER DETAILS</div>
                <div class="company-field"><strong>Company:</strong> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;${invoiceData.buyer?.companyName || 'N/A'}</div>
                <div class="company-field"><strong>Contact:</strong> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;${invoiceData.buyer?.contactPerson || 'N/A'}</div>
                <div class="company-field"><strong>Address:</strong> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;${invoiceData.buyer?.address || 'N/A'}</div>
                <div class="company-field"><strong>Mobile:</strong> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;${invoiceData.buyer?.mobile || 'N/A'}</div>
                <div class="company-field"><strong>GSTIN:</strong> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;${invoiceData.buyer?.gstin || 'N/A'}</div>
                <div class="company-field"><strong>PAN:</strong> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;${invoiceData.buyer?.pan || 'N/A'}</div>
              </div>
            </div>
            
            <div class="item-details-title">
               ITEM DETAILS:
            </div>

            <table class="items-table">
              <thead>
                <tr>
                  <th>LOT NO</th>
                  <th>ITEM NAME</th>
                  <th>HSN CODE</th>
                  <th>BAGS</th>
                  <th>WEIGHT (KG)</th>
                  <th>RATE/QUINTAL</th>
                  <th>AMOUNT IN RUPEES</th>
                </tr>
              </thead>
              <tbody>
                ${invoiceData.items?.map(item => `
                  <tr>
                    <td>${item.lotNo || ''}</td>
                    <td>${item.itemName || 'AGRICULTURAL PRODUCE'}</td>
                    <td>09042110</td>
                    <td>${item.bags || 0}</td>
                    <td>${item.weightKg || 0}</td>
                    <td>₹${(item.ratePerQuintal || 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                    <td>₹${(item.basicAmount || 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                  </tr>
                `).join('') || ''}
              </tbody>
            </table>

            <div class="calculations-section">
              <div class="calculations">
                <div class="calc-title">AMOUNT CALCULATIONS</div>
                <div class="calc-line">
                  <span>Basic Amount</span>
                  <span>₹${(invoiceData.calculations?.basicAmount || 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
                </div>
                <div class="calc-line">
                  <span>+ Packaging (${invoiceData.calculations?.totalBags || 0} bags × ₹5)</span>
                  <span>₹${(invoiceData.calculations?.packaging || 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
                </div>
                <div class="calc-line">
                  <span>+ Hamali (${invoiceData.calculations?.totalBags || 0} bags × ₹5)</span>
                  <span>₹${(invoiceData.calculations?.hamali || 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
                </div>
                <div class="calc-line">
                  <span>+ Weighing (${invoiceData.calculations?.totalBags || 0} bags)</span>
                  <span>₹${(invoiceData.calculations?.weighingCharges || 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
                </div>
                <div class="calc-line">
                  <span>+ Commission</span>
                  <span>₹${(invoiceData.calculations?.commission || 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
                </div>
                <div class="calc-line">
                  <span>+ Cess @ 0.6% (on basic amount)</span>
                  <span>₹${(invoiceData.calculations?.cess || 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
                </div>
                <div class="calc-line">
                  <span>Taxable Amount</span>
                  <span>₹${((invoiceData.calculations?.basicAmount || 0) + (invoiceData.calculations?.packaging || 0) + (invoiceData.calculations?.hamali || 0) + (invoiceData.calculations?.weighingCharges || 0) + (invoiceData.calculations?.commission || 0) + (invoiceData.calculations?.cess || 0)).toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
                </div>
                <div class="calc-line">
                  <span>+ SGST (2.5%)</span>
                  <span>₹${(invoiceData.calculations?.sgst || 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
                </div>
                <div class="calc-line">
                  <span>+ CGST (2.5%)</span>
                  <span>₹${(invoiceData.calculations?.cgst || 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
                </div>
                <div class="calc-line">
                  <span>Total GST</span>
                  <span>₹${((invoiceData.calculations?.sgst || 0) + (invoiceData.calculations?.cgst || 0)).toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
                </div>
                <br>
                <div class="calc-line total-payable">
                  <span><strong>TOTAL PAYABLE</strong></span>
                  <span><strong>₹${(invoiceData.calculations?.totalAmount || 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}</strong></span>
                </div>
              </div>
              
              <div class="bank-details">
                <div class="bank-title">BANK DETAILS FOR PAYMENT</div>
                <div class="bank-line">
                  <span><strong>Bank:</strong></span>
                  <span>${invoiceData.bankDetails?.bankName || 'N/A'}</span>
                </div>
                <div class="bank-line">
                  <span><strong>A/C No:</strong></span>
                  <span>${invoiceData.bankDetails?.accountNumber || 'N/A'}</span>
                </div>
                <div class="bank-line">
                  <span><strong>IFSC:</strong></span>
                  <span>${invoiceData.bankDetails?.ifscCode || 'N/A'}</span>
                </div>
                <div class="bank-line">
                  <span><strong>Holder:</strong></span>
                  <span>${invoiceData.bankDetails?.accountHolder || 'N/A'}</span>
                </div>
                <div class="bank-line">
                  <span><strong>Branch:</strong></span>
                  <span>${invoiceData.bankDetails?.branchName || ''}</span>
                </div>
                <div class="bank-line">
                  <span><strong>Branch Address:</strong></span>
                  <span>${invoiceData.bankDetails?.branchAddress || ''}</span>
                </div>
                
                <div class="terms">
                  <div>Terms: Payment due within 30 days</div>
                  <div>Goods once sold will not be taken back</div>
                </div>
              </div>
            </div>
            
            <div class="signature">
              <div class="signature-line">
                Authorized Signature
              </div>
            </div>
            
            <script>
              window.onload = function() {
                window.print();
                setTimeout(function() { window.close(); }, 100);
              }
            </script>
          </body>
        </html>
      `;

      printWindow.document.write(invoiceHtml);
      printWindow.document.close();
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
            body { 
              font-family: Arial, sans-serif; 
              margin: 20px; 
              font-size: 12px; 
              line-height: 1.4; 
              color: #000;
            }
            .header { 
              text-align: center; 
              margin-bottom: 30px; 
            }
            .invoice-title { 
              font-size: 18px; 
              font-weight: bold; 
              margin-bottom: 8px; 
              letter-spacing: 2px;
            }
            .invoice-details { 
              font-size: 14px; 
              margin-bottom: 8px; 
            }
            .hsn-code { 
              font-size: 14px; 
              margin-bottom: 25px; 
            }
            .company-info { 
              display: flex; 
              justify-content: space-between; 
              margin-bottom: 30px; 
              min-height: 160px;
            }
            .seller, .buyer { 
              width: 48%; 
              font-size: 11px; 
            }
            .section-title { 
              font-weight: bold; 
              margin-bottom: 10px; 
              font-size: 12px;
              text-decoration: underline;
            }
            .company-field {
              margin-bottom: 4px;
              line-height: 1.5;
            }
            .item-details-title { 
              font-weight: bold; 
              margin: 25px 0 15px 0; 
              font-size: 12px; 
            }
            .items-table { 
              width: 100%; 
              border-collapse: collapse; 
              margin-bottom: 25px; 
              font-size: 11px; 
            }
            .items-table th, .items-table td { 
              border: 1px solid #000; 
              padding: 8px; 
              text-align: center; 
            }
            .items-table th { 
              background-color: #f0f0f0; 
              font-weight: bold; 
              font-size: 10px; 
            }
            .calculations-section { 
              display: flex; 
              justify-content: space-between; 
              margin-top: 25px; 
            }
            .calculations { 
              width: 45%; 
            }
            .bank-details { 
              width: 45%; 
            }
            .calc-title, .bank-title { 
              font-weight: bold; 
              margin-bottom: 15px; 
              font-size: 12px; 
              text-decoration: underline;
            }
            .calc-line, .bank-line { 
              display: flex; 
              justify-content: space-between; 
              margin-bottom: 3px; 
              font-size: 11px; 
            }
            .total-payable { 
              font-weight: bold; 
              font-size: 13px; 
              margin-top: 8px; 
              padding-top: 8px; 
              border-top: 1px solid #000;
            }
            .terms { 
              margin-top: 20px; 
              font-size: 10px; 
              line-height: 1.4;
            }
            .signature { 
              text-align: right; 
              margin-top: 50px; 
              padding-right: 0px; 
              font-size: 11px;
            }
            @media print { 
              body { margin: 10px; } 
              .calculations-section { page-break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="invoice-title">TAX INVOICE</div>
            <div class="invoice-details">Invoice No: ${taxInvoice.invoiceNumber} Date: ${new Date(taxInvoice.invoiceDate).toLocaleDateString('en-GB')}</div>
            <div class="hsn-code">HSN Code: 09042110</div>
          </div>

          <div class="company-info">
            <div class="seller">
              <div class="section-title">SELLER DETAILS</div>
              <div class="company-field"><strong>Company:</strong> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;${taxInvoice.seller.companyName}</div>
              <div class="company-field"><strong>APMC:</strong> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;${taxInvoice.seller.apmcCode}</div>
              <div class="company-field"><strong>Address:</strong> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;${taxInvoice.seller.address}</div>
              <div class="company-field">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</div>
              <div class="company-field"><strong>Mobile:</strong> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;${taxInvoice.seller.mobile}</div>
              <div class="company-field"><strong>GSTIN:</strong> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;${taxInvoice.seller.gstin}</div>
              <div class="company-field"><strong>PAN:</strong> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;${taxInvoice.seller.pan}</div>
              <div class="company-field"><strong>FSSAI:</strong> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;${taxInvoice.seller.fssai}</div>
            </div>
            <div class="buyer">
              <div class="section-title">BUYER DETAILS</div>
              <div class="company-field"><strong>Company:</strong> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;${taxInvoice.buyer.companyName}</div>
              <div class="company-field"><strong>Contact:</strong> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;${taxInvoice.buyer.contactPerson}</div>
              <div class="company-field"><strong>Address:</strong> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;${taxInvoice.buyer.address}</div>
              <div class="company-field"><strong>Mobile:</strong> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;${taxInvoice.buyer.mobile}</div>
              <div class="company-field"><strong>GSTIN:</strong> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;${taxInvoice.buyer.gstin}</div>
              <div class="company-field"><strong>PAN:</strong> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;${taxInvoice.buyer.pan || 'N/A'}</div>
            </div>
          </div>
          
          <div class="item-details-title">
             ITEM DETAILS:
          </div>

          <table class="items-table">
            <thead>
              <tr>
                <th>LOT NO</th>
                <th>ITEM NAME</th>
                <th>HSN CODE</th>
                <th>BAGS</th>
                <th>WEIGHT (KG)</th>
                <th>RATE/QUINTAL</th>
                <th>AMOUNT IN RUPEES</th>
              </tr>
            </thead>
            <tbody>
              ${taxInvoice.items.map(item => `
                <tr>
                  <td>${item.lotNo}</td>
                  <td>${item.itemName}</td>
                  <td>09042110</td>
                  <td>${item.bags}</td>
                  <td>${item.weightKg}</td>
                  <td>₹${formatCurrency(item.ratePerQuintal)}</td>
                  <td>₹${formatCurrency(item.basicAmount)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="calculations-section">
            <div class="calculations">
              <div class="calc-title">AMOUNT CALCULATIONS</div>
              <div class="calc-line">
                <span>Basic Amount</span>
                <span>₹${formatCurrency(taxInvoice.calculations.basicAmount)}</span>
              </div>
              <div class="calc-line">
                <span>+ Packaging (${taxInvoice.calculations.totalBags} bags × ₹5)</span>
                <span>₹${formatCurrency(taxInvoice.calculations.packaging)}</span>
              </div>
              <div class="calc-line">
                <span>+ Hamali (${taxInvoice.calculations.totalBags} bags × ₹5)</span>
                <span>₹${formatCurrency(taxInvoice.calculations.hamali)}</span>
              </div>
              <div class="calc-line">
                <span>+ Weighing (${taxInvoice.calculations.totalBags} bags)</span>
                <span>₹${formatCurrency(taxInvoice.calculations.weighingCharges)}</span>
              </div>
              <div class="calc-line">
                <span>+ Commission</span>
                <span>₹${formatCurrency(taxInvoice.calculations.commission)}</span>
              </div>
              <div class="calc-line">
                <span>+ Cess @ 0.6% (on basic amount)</span>
                <span>₹${formatCurrency(taxInvoice.calculations.cess)}</span>
              </div>
              <div class="calc-line">
                <span>Taxable Amount</span>
                <span>₹${formatCurrency(taxInvoice.calculations.basicAmount + taxInvoice.calculations.packaging + taxInvoice.calculations.hamali + taxInvoice.calculations.weighingCharges + taxInvoice.calculations.commission + taxInvoice.calculations.cess)}</span>
              </div>
              <div class="calc-line">
                <span>+ SGST (2.5%)</span>
                <span>₹${formatCurrency(taxInvoice.calculations.sgst)}</span>
              </div>
              <div class="calc-line">
                <span>+ CGST (2.5%)</span>
                <span>₹${formatCurrency(taxInvoice.calculations.cgst)}</span>
              </div>
              <div class="calc-line">
                <span>Total GST</span>
                <span>₹${formatCurrency(taxInvoice.calculations.sgst + taxInvoice.calculations.cgst)}</span>
              </div>
              <br>
              <div class="calc-line total-payable">
                <span><strong>TOTAL PAYABLE</strong></span>
                <span><strong>₹${formatCurrency(taxInvoice.calculations.totalAmount)}</strong></span>
              </div>
            </div>
            
            <div class="bank-details">
              <div class="bank-title">BANK DETAILS FOR PAYMENT</div>
              <div class="bank-line">
                <span><strong>Bank:</strong></span>
                <span>${taxInvoice.bankDetails.bankName}</span>
              </div>
              <div class="bank-line">
                <span><strong>A/C No:</strong></span>
                <span>${taxInvoice.bankDetails.accountNumber}</span>
              </div>
              <div class="bank-line">
                <span><strong>IFSC:</strong></span>
                <span>${taxInvoice.bankDetails.ifscCode}</span>
              </div>
              <div class="bank-line">
                <span><strong>Holder:</strong></span>
                <span>${taxInvoice.bankDetails.accountHolder}</span>
              </div>
              <div class="bank-line">
                <span><strong>Branch:</strong></span>
                <span>${taxInvoice.bankDetails.branchName || ''}</span>
              </div>
              <div class="bank-line">
                <span><strong>Branch Address:</strong></span>
                <span>${taxInvoice.bankDetails.branchAddress || ''}</span>
              </div>
              
              <div class="terms">
                <div>Terms: Payment due within 30 days</div>
                <div>Goods once sold will not be taken back</div>
              </div>
            </div>
          </div>
          
          <div class="signature">
            Authorized Signature
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
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6">
        <BackToDashboard />
        
        <div className="bg-white rounded-lg shadow-sm border p-3 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-4 sm:mb-6">
            <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Tax Invoice Management</h1>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 h-auto">
              <TabsTrigger value="generate" className="flex items-center justify-center gap-1 sm:gap-2 py-3 text-xs sm:text-sm">
                <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Generate</span> Invoice
              </TabsTrigger>
              <TabsTrigger value="history" className="flex items-center justify-center gap-1 sm:gap-2 py-3 text-xs sm:text-sm">
                <History className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Invoice</span> History
              </TabsTrigger>
            </TabsList>

            <TabsContent value="generate" className="space-y-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Generate New Tax Invoice</CardTitle>
                  <CardDescription>
                    Select a buyer and date to generate tax invoice for completed lots on that specific date
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 sm:space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="buyer" className="text-sm sm:text-base">Select Buyer</Label>
                      <Select
                        value={selectedBuyerId?.toString() || ""}
                        onValueChange={(value) => setSelectedBuyerId(parseInt(value))}
                      >
                        <SelectTrigger className="min-h-[44px]">
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
                    
                    <div>
                      <Label htmlFor="invoice-date" className="text-sm sm:text-base">Invoice Date</Label>
                      <Input
                        id="invoice-date"
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="min-h-[44px]"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Generate invoice for completed lots on this date
                      </p>
                    </div>
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
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 text-sm">
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