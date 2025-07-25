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

      const modernInvoiceHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>Tax Invoice - ${invoice.invoiceNumber}</title>
            <style>
              body {
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
                line-height: 1.5;
                color: #1a1a1a;
                background: white;
                margin: 0;
                padding: 0;
              }

              .invoice-container {
                max-width: 210mm;
                margin: 0 auto;
                background: white;
                position: relative;
              }

              .invoice-header {
                background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
                color: white;
                padding: 2rem;
                text-align: center;
                position: relative;
                overflow: hidden;
              }

              .invoice-title {
                font-size: 2.5rem;
                font-weight: 800;
                margin-bottom: 0.5rem;
                letter-spacing: 2px;
                text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
              }

              .invoice-subtitle {
                font-size: 1.1rem;
                font-weight: 500;
                opacity: 0.9;
              }

              .invoice-content {
                padding: 2rem;
              }

              .company-section {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 2rem;
                margin-bottom: 2rem;
                padding: 1.5rem;
                background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
                border-radius: 12px;
                border: 1px solid #e2e8f0;
              }

              .company-card {
                background: white;
                padding: 1.5rem;
                border-radius: 8px;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
                border-left: 4px solid #2563eb;
              }

              .company-card.buyer {
                border-left-color: #16a34a;
              }

              .company-title {
                font-size: 1.1rem;
                font-weight: 700;
                color: #1e293b;
                margin-bottom: 1rem;
                text-transform: uppercase;
                letter-spacing: 1px;
                display: flex;
                align-items: center;
                gap: 0.5rem;
              }

              .company-title::before {
                content: '';
                width: 8px;
                height: 8px;
                background: currentColor;
                border-radius: 50%;
              }

              .company-field {
                display: flex;
                margin-bottom: 0.75rem;
                font-size: 0.95rem;
                align-items: flex-start;
              }

              .field-label {
                font-weight: 600;
                color: #475569;
                min-width: 80px;
                margin-right: 1rem;
              }

              .field-value {
                color: #1e293b;
                flex: 1;
                word-break: break-word;
              }

              .items-section {
                margin: 2rem 0;
              }

              .section-title {
                font-size: 1.3rem;
                font-weight: 700;
                color: #1e293b;
                margin-bottom: 1rem;
                text-transform: uppercase;
                letter-spacing: 1px;
                position: relative;
                padding-bottom: 0.5rem;
              }

              .section-title::after {
                content: '';
                position: absolute;
                bottom: 0;
                left: 0;
                width: 60px;
                height: 3px;
                background: linear-gradient(90deg, #2563eb, #16a34a);
                border-radius: 2px;
              }

              .modern-table {
                width: 100%;
                border-collapse: separate;
                border-spacing: 0;
                background: white;
                border-radius: 12px;
                overflow: hidden;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
                border: 1px solid #e2e8f0;
              }

              .modern-table th {
                background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
                color: white;
                padding: 1rem 0.75rem;
                font-weight: 600;
                font-size: 0.9rem;
                text-align: center;
                text-transform: uppercase;
                letter-spacing: 0.5px;
              }

              .modern-table td {
                padding: 1rem 0.75rem;
                text-align: center;
                font-size: 0.9rem;
                color: #374151;
                border-bottom: 1px solid #f1f5f9;
              }

              .modern-table tbody tr:last-child td {
                border-bottom: none;
              }

              .calculations-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 2rem;
                margin-top: 2rem;
              }

              .calc-card, .bank-card {
                background: white;
                padding: 1.5rem;
                border-radius: 12px;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
                border: 1px solid #e2e8f0;
              }

              .calc-card {
                border-left: 4px solid #dc2626;
              }

              .bank-card {
                border-left: 4px solid #059669;
              }

              .card-title {
                font-size: 1.1rem;
                font-weight: 700;
                color: #1e293b;
                margin-bottom: 1rem;
                text-transform: uppercase;
                letter-spacing: 1px;
              }

              .calc-row, .bank-row {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 0.5rem 0;
                border-bottom: 1px solid #f1f5f9;
                font-size: 0.9rem;
              }

              .calc-row:last-child, .bank-row:last-child {
                border-bottom: none;
              }

              .calc-label {
                color: #475569;
                font-weight: 500;
              }

              .calc-value {
                color: #1e293b;
                font-weight: 600;
              }

              .total-row {
                background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
                margin: 0.5rem -1.5rem -1.5rem;
                padding: 1rem 1.5rem;
                border-top: 2px solid #dc2626;
                font-size: 1.1rem;
                font-weight: 700;
              }

              .terms-section {
                background: #f8fafc;
                padding: 1.5rem;
                border-radius: 12px;
                margin-top: 2rem;
                border-left: 4px solid #6366f1;
              }

              .terms-title {
                font-weight: 700;
                color: #1e293b;
                margin-bottom: 0.75rem;
                font-size: 1rem;
              }

              .terms-text {
                font-size: 0.9rem;
                color: #475569;
                line-height: 1.6;
                margin-bottom: 0.5rem;
              }

              .signature-section {
                display: flex;
                justify-content: flex-end;
                align-items: flex-end;
                margin-top: 3rem;
                padding-top: 2rem;
                border-top: 2px solid #e2e8f0;
              }

              .signature-box {
                text-align: center;
                min-width: 200px;
              }

              .signature-line {
                border-top: 2px solid #374151;
                margin-bottom: 0.5rem;
                height: 60px;
                display: flex;
                align-items: flex-end;
                justify-content: center;
              }

              .signature-text {
                font-size: 0.9rem;
                color: #475569;
                font-weight: 500;
                text-transform: uppercase;
                letter-spacing: 0.5px;
              }

              @media print {
                .invoice-container {
                  box-shadow: none !important;
                  border-radius: 0 !important;
                  max-width: none !important;
                  margin: 0 !important;
                }
                
                .calc-card, .bank-card, .company-card {
                  box-shadow: none !important;
                  border: 1px solid #e2e8f0 !important;
                }
                
                .modern-table {
                  box-shadow: none !important;
                }
              }
            </style>
          </head>
          <body>
            <div class="invoice-container">
              <div class="invoice-header">
                <div class="invoice-title">TAX INVOICE</div>
                <div class="invoice-subtitle">Invoice No: ${invoice.invoiceNumber} | Date: ${new Date(invoice.invoiceDate).toLocaleDateString('en-GB')} | HSN: 09042110</div>
              </div>

              <div class="invoice-content">
                <div class="company-section">
                  <div class="company-card">
                    <div class="company-title">Seller Details</div>
                    <div class="company-field">
                      <span class="field-label">Company:</span>
                      <span class="field-value">${invoiceData.seller?.companyName || 'N/A'}</span>
                    </div>
                    <div class="company-field">
                      <span class="field-label">APMC:</span>
                      <span class="field-value">${invoiceData.seller?.apmcCode || 'N/A'}</span>
                    </div>
                    <div class="company-field">
                      <span class="field-label">Address:</span>
                      <span class="field-value">${invoiceData.seller?.address || 'N/A'}</span>
                    </div>
                    <div class="company-field">
                      <span class="field-label">Mobile:</span>
                      <span class="field-value">${invoiceData.seller?.mobile || 'N/A'}</span>
                    </div>
                    <div class="company-field">
                      <span class="field-label">GSTIN:</span>
                      <span class="field-value">${invoiceData.seller?.gstin || 'N/A'}</span>
                    </div>
                    <div class="company-field">
                      <span class="field-label">PAN:</span>
                      <span class="field-value">${invoiceData.seller?.pan || 'N/A'}</span>
                    </div>
                    <div class="company-field">
                      <span class="field-label">FSSAI:</span>
                      <span class="field-value">${invoiceData.seller?.fssai || 'N/A'}</span>
                    </div>
                  </div>
                  
                  <div class="company-card buyer">
                    <div class="company-title">Buyer Details</div>
                    <div class="company-field">
                      <span class="field-label">Company:</span>
                      <span class="field-value">${invoiceData.buyer?.companyName || 'N/A'}</span>
                    </div>
                    <div class="company-field">
                      <span class="field-label">Contact:</span>
                      <span class="field-value">${invoiceData.buyer?.contactPerson || 'N/A'}</span>
                    </div>
                    <div class="company-field">
                      <span class="field-label">Address:</span>
                      <span class="field-value">${invoiceData.buyer?.address || 'N/A'}</span>
                    </div>
                    <div class="company-field">
                      <span class="field-label">Mobile:</span>
                      <span class="field-value">${invoiceData.buyer?.mobile || 'N/A'}</span>
                    </div>
                    <div class="company-field">
                      <span class="field-label">GSTIN:</span>
                      <span class="field-value">${invoiceData.buyer?.gstin || 'N/A'}</span>
                    </div>
                    <div class="company-field">
                      <span class="field-label">PAN:</span>
                      <span class="field-value">${invoiceData.buyer?.pan || 'N/A'}</span>
                    </div>
                  </div>
                </div>
                
                <div class="items-section">
                  <div class="section-title">Item Details</div>
                  <table class="modern-table">
                    <thead>
                      <tr>
                        <th>Lot No</th>
                        <th>Item Name</th>
                        <th>HSN Code</th>
                        <th>Bags</th>
                        <th>Weight (KG)</th>
                        <th>Rate/Quintal</th>
                        <th>Amount (₹)</th>
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
                </div>

                <div class="calculations-grid">
                  <div class="calc-card">
                    <div class="card-title">Amount Calculations</div>
                    <div class="calc-row">
                      <span class="calc-label">Basic Amount</span>
                      <span class="calc-value">₹${(invoiceData.calculations?.basicAmount || 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
                    </div>
                    <div class="calc-row">
                      <span class="calc-label">+ Packaging (${invoiceData.items?.reduce((sum, item) => sum + (item.bags || 0), 0) || 0} bags × ₹5)</span>
                      <span class="calc-value">₹${(invoiceData.calculations?.packaging || 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
                    </div>
                    <div class="calc-row">
                      <span class="calc-label">+ Hamali (${invoiceData.items?.reduce((sum, item) => sum + (item.bags || 0), 0) || 0} bags × ₹3)</span>
                      <span class="calc-value">₹${(invoiceData.calculations?.hamali || 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
                    </div>
                    <div class="calc-row">
                      <span class="calc-label">+ Weighing (${invoiceData.items?.reduce((sum, item) => sum + (item.bags || 0), 0) || 0} bags × ₹2)</span>
                      <span class="calc-value">₹${(invoiceData.calculations?.weighingCharges || 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
                    </div>
                    <div class="calc-row">
                      <span class="calc-label">+ Commission (5%)</span>
                      <span class="calc-value">₹${(invoiceData.calculations?.commission || 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
                    </div>
                    <div class="calc-row">
                      <span class="calc-label">+ CESS @ 0.6%</span>
                      <span class="calc-value">₹${(invoiceData.calculations?.cess || 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
                    </div>
                    <div class="calc-row">
                      <span class="calc-label">+ SGST @ 2.5%</span>
                      <span class="calc-value">₹${(invoiceData.calculations?.sgst || 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
                    </div>
                    <div class="calc-row">
                      <span class="calc-label">+ CGST @ 2.5%</span>
                      <span class="calc-value">₹${(invoiceData.calculations?.cgst || 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
                    </div>
                    <div class="total-row">
                      <span class="calc-label">TOTAL PAYABLE</span>
                      <span class="calc-value">₹${(invoiceData.calculations?.totalAmount || 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
                    </div>
                  </div>
                  
                  <div class="bank-card">
                    <div class="card-title">Bank Details for Payment</div>
                    <div class="bank-row">
                      <span class="calc-label">Bank Name:</span>
                      <span class="calc-value">${invoiceData.bankDetails?.bankName || 'N/A'}</span>
                    </div>
                    <div class="bank-row">
                      <span class="calc-label">Account No:</span>
                      <span class="calc-value">${invoiceData.bankDetails?.accountNumber || 'N/A'}</span>
                    </div>
                    <div class="bank-row">
                      <span class="calc-label">IFSC Code:</span>
                      <span class="calc-value">${invoiceData.bankDetails?.ifscCode || 'N/A'}</span>
                    </div>
                    <div class="bank-row">
                      <span class="calc-label">Account Holder:</span>
                      <span class="calc-value">${invoiceData.bankDetails?.accountHolder || 'N/A'}</span>
                    </div>
                    <div class="bank-row">
                      <span class="calc-label">Branch:</span>
                      <span class="calc-value">${invoiceData.bankDetails?.branchName || 'N/A'}</span>
                    </div>
                    <div class="bank-row">
                      <span class="calc-label">Branch Address:</span>
                      <span class="calc-value">${invoiceData.bankDetails?.branchAddress || 'N/A'}</span>
                    </div>
                    
                    <div class="terms-section">
                      <div class="terms-title">Terms & Conditions</div>
                      <div class="terms-text">• Payment due within 30 days</div>
                      <div class="terms-text">• Goods once sold will not be taken back</div>
                      <div class="terms-text">• All disputes subject to local jurisdiction</div>
                    </div>
                  </div>
                </div>
                
                <div class="signature-section">
                  <div class="signature-box">
                    <div class="signature-line"></div>
                    <div class="signature-text">Authorized Signature</div>
                  </div>
                </div>
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

      printWindow.document.write(modernInvoiceHtml);
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

    const modernInvoiceHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Tax Invoice - ${taxInvoice.invoiceNumber}</title>
          <style>
            body {
              font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
              line-height: 1.5;
              color: #1a1a1a;
              background: white;
              margin: 0;
              padding: 0;
            }

            .invoice-container {
              max-width: 210mm;
              margin: 0 auto;
              background: white;
              position: relative;
            }

            .invoice-header {
              background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
              color: white;
              padding: 2rem;
              text-align: center;
              position: relative;
              overflow: hidden;
            }

            .invoice-title {
              font-size: 2.5rem;
              font-weight: 800;
              margin-bottom: 0.5rem;
              letter-spacing: 2px;
              text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
            }

            .invoice-subtitle {
              font-size: 1.1rem;
              font-weight: 500;
              opacity: 0.9;
            }

            .invoice-content {
              padding: 2rem;
            }

            .company-section {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 2rem;
              margin-bottom: 2rem;
              padding: 1.5rem;
              background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
              border-radius: 12px;
              border: 1px solid #e2e8f0;
            }

            .company-card {
              background: white;
              padding: 1.5rem;
              border-radius: 8px;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
              border-left: 4px solid #2563eb;
            }

            .company-card.buyer {
              border-left-color: #16a34a;
            }

            .company-title {
              font-size: 1.1rem;
              font-weight: 700;
              color: #1e293b;
              margin-bottom: 1rem;
              text-transform: uppercase;
              letter-spacing: 1px;
              display: flex;
              align-items: center;
              gap: 0.5rem;
            }

            .company-title::before {
              content: '';
              width: 8px;
              height: 8px;
              background: currentColor;
              border-radius: 50%;
            }

            .company-field {
              display: flex;
              margin-bottom: 0.75rem;
              font-size: 0.95rem;
              align-items: flex-start;
            }

            .field-label {
              font-weight: 600;
              color: #475569;
              min-width: 80px;
              margin-right: 1rem;
            }

            .field-value {
              color: #1e293b;
              flex: 1;
              word-break: break-word;
            }

            .items-section {
              margin: 2rem 0;
            }

            .section-title {
              font-size: 1.3rem;
              font-weight: 700;
              color: #1e293b;
              margin-bottom: 1rem;
              text-transform: uppercase;
              letter-spacing: 1px;
              position: relative;
              padding-bottom: 0.5rem;
            }

            .section-title::after {
              content: '';
              position: absolute;
              bottom: 0;
              left: 0;
              width: 60px;
              height: 3px;
              background: linear-gradient(90deg, #2563eb, #16a34a);
              border-radius: 2px;
            }

            .modern-table {
              width: 100%;
              border-collapse: separate;
              border-spacing: 0;
              background: white;
              border-radius: 12px;
              overflow: hidden;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
              border: 1px solid #e2e8f0;
            }

            .modern-table th {
              background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
              color: white;
              padding: 1rem 0.75rem;
              font-weight: 600;
              font-size: 0.9rem;
              text-align: center;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }

            .modern-table td {
              padding: 1rem 0.75rem;
              text-align: center;
              font-size: 0.9rem;
              color: #374151;
              border-bottom: 1px solid #f1f5f9;
            }

            .modern-table tbody tr:last-child td {
              border-bottom: none;
            }

            .calculations-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 2rem;
              margin-top: 2rem;
            }

            .calc-card, .bank-card {
              background: white;
              padding: 1.5rem;
              border-radius: 12px;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
              border: 1px solid #e2e8f0;
            }

            .calc-card {
              border-left: 4px solid #dc2626;
            }

            .bank-card {
              border-left: 4px solid #059669;
            }

            .card-title {
              font-size: 1.1rem;
              font-weight: 700;
              color: #1e293b;
              margin-bottom: 1rem;
              text-transform: uppercase;
              letter-spacing: 1px;
            }

            .calc-row, .bank-row {
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding: 0.5rem 0;
              border-bottom: 1px solid #f1f5f9;
              font-size: 0.9rem;
            }

            .calc-row:last-child, .bank-row:last-child {
              border-bottom: none;
            }

            .calc-label {
              color: #475569;
              font-weight: 500;
            }

            .calc-value {
              color: #1e293b;
              font-weight: 600;
            }

            .total-row {
              background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
              margin: 0.5rem -1.5rem -1.5rem;
              padding: 1rem 1.5rem;
              border-top: 2px solid #dc2626;
              font-size: 1.1rem;
              font-weight: 700;
            }

            .terms-section {
              background: #f8fafc;
              padding: 1.5rem;
              border-radius: 12px;
              margin-top: 2rem;
              border-left: 4px solid #6366f1;
            }

            .terms-title {
              font-weight: 700;
              color: #1e293b;
              margin-bottom: 0.75rem;
              font-size: 1rem;
            }

            .terms-text {
              font-size: 0.9rem;
              color: #475569;
              line-height: 1.6;
              margin-bottom: 0.5rem;
            }

            .signature-section {
              display: flex;
              justify-content: flex-end;
              align-items: flex-end;
              margin-top: 3rem;
              padding-top: 2rem;
              border-top: 2px solid #e2e8f0;
            }

            .signature-box {
              text-align: center;
              min-width: 200px;
            }

            .signature-line {
              border-top: 2px solid #374151;
              margin-bottom: 0.5rem;
              height: 60px;
              display: flex;
              align-items: flex-end;
              justify-content: center;
            }

            .signature-text {
              font-size: 0.9rem;
              color: #475569;
              font-weight: 500;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }

            @media print {
              body {
                margin: 0 !important;
                padding: 10px !important;
                font-size: 10px !important;
                transform: scale(0.85) !important;
                transform-origin: top left !important;
                width: 118% !important;
              }
              
              .modern-tax-invoice {
                page-break-inside: avoid !important;
                max-height: 100vh !important;
                overflow: hidden !important;
              }
              
              .invoice-container {
                box-shadow: none !important;
                border-radius: 0 !important;
                max-width: none !important;
                margin: 0 !important;
              }
              
              .calc-card, .bank-card, .company-card {
                box-shadow: none !important;
                border: 1px solid #e2e8f0 !important;
              }
              
              .modern-table {
                box-shadow: none !important;
              }
            }
          </style>
        </head>
        <body>
          <div class="invoice-container">
            <div class="invoice-header">
              <div class="invoice-title">TAX INVOICE</div>
              <div class="invoice-subtitle">Invoice No: ${taxInvoice.invoiceNumber} | Date: ${new Date(taxInvoice.invoiceDate).toLocaleDateString('en-GB')} | HSN: 09042110</div>
            </div>

            <div class="invoice-content">
              <div class="company-section">
                <div class="company-card">
                  <div class="company-title">Seller Details</div>
                  <div class="company-field">
                    <span class="field-label">Company:</span>
                    <span class="field-value">${taxInvoice.tenantName || 'N/A'}</span>
                  </div>
                  <div class="company-field">
                    <span class="field-label">APMC:</span>
                    <span class="field-value">${taxInvoice.tenantCode || 'N/A'}</span>
                  </div>
                  <div class="company-field">
                    <span class="field-label">Address:</span>
                    <span class="field-value">${taxInvoice.tenantAddress || 'N/A'}</span>
                  </div>
                  <div class="company-field">
                    <span class="field-label">Mobile:</span>
                    <span class="field-value">${taxInvoice.tenantMobile || 'N/A'}</span>
                  </div>
                  <div class="company-field">
                    <span class="field-label">GSTIN:</span>
                    <span class="field-value">${taxInvoice.tenantGstin || 'N/A'}</span>
                  </div>
                  <div class="company-field">
                    <span class="field-label">PAN:</span>
                    <span class="field-value">${taxInvoice.tenantPan || 'N/A'}</span>
                  </div>
                  <div class="company-field">
                    <span class="field-label">FSSAI:</span>
                    <span class="field-value">${taxInvoice.tenantFssai || 'N/A'}</span>
                  </div>
                </div>
                
                <div class="company-card buyer">
                  <div class="company-title">Buyer Details</div>
                  <div class="company-field">
                    <span class="field-label">Company:</span>
                    <span class="field-value">${taxInvoice.buyerName || 'N/A'}</span>
                  </div>
                  <div class="company-field">
                    <span class="field-label">Contact:</span>
                    <span class="field-value">${taxInvoice.buyerContactPerson || 'N/A'}</span>
                  </div>
                  <div class="company-field">
                    <span class="field-label">Address:</span>
                    <span class="field-value">${taxInvoice.buyerAddress || 'N/A'}</span>
                  </div>
                  <div class="company-field">
                    <span class="field-label">Mobile:</span>
                    <span class="field-value">${taxInvoice.buyerMobile || 'N/A'}</span>
                  </div>
                  <div class="company-field">
                    <span class="field-label">GSTIN:</span>
                    <span class="field-value">${taxInvoice.buyerGstin || 'N/A'}</span>
                  </div>
                  <div class="company-field">
                    <span class="field-label">PAN:</span>
                    <span class="field-value">${taxInvoice.buyerPan || 'N/A'}</span>
                  </div>
                </div>
              </div>
              
              <div class="items-section">
                <div class="section-title">Item Details</div>
                <table class="modern-table">
                  <thead>
                    <tr>
                      <th>Lot No</th>
                      <th>Item Name</th>
                      <th>HSN Code</th>
                      <th>Bags</th>
                      <th>Weight (KG)</th>
                      <th>Rate/Quintal</th>
                      <th>Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${taxInvoice.items?.map(item => `
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
              </div>

              <div class="calculations-grid">
                <div class="calc-card">
                  <div class="card-title">Amount Calculations</div>
                  <div class="calc-row">
                    <span class="calc-label">Basic Amount</span>
                    <span class="calc-value">₹${(taxInvoice.basicAmount || 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
                  </div>
                  <div class="calc-row">
                    <span class="calc-label">+ Packaging (${taxInvoice.totalBags || 0} bags × ₹5)</span>
                    <span class="calc-value">₹${(taxInvoice.packaging || 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
                  </div>
                  <div class="calc-row">
                    <span class="calc-label">+ Hamali (${taxInvoice.totalBags || 0} bags × ₹3)</span>
                    <span class="calc-value">₹${(taxInvoice.hamali || 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
                  </div>
                  <div class="calc-row">
                    <span class="calc-label">+ Weighing (${taxInvoice.totalBags || 0} bags × ₹2)</span>
                    <span class="calc-value">₹${(taxInvoice.weighingCharges || 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
                  </div>
                  <div class="calc-row">
                    <span class="calc-label">+ Commission (5%)</span>
                    <span class="calc-value">₹${(taxInvoice.commission || 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
                  </div>
                  <div class="calc-row">
                    <span class="calc-label">+ CESS @ 0.6%</span>
                    <span class="calc-value">₹${(taxInvoice.cess || 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
                  </div>
                  <div class="calc-row">
                    <span class="calc-label">+ SGST @ 2.5%</span>
                    <span class="calc-value">₹${(taxInvoice.sgst || 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
                  </div>
                  <div class="calc-row">
                    <span class="calc-label">+ CGST @ 2.5%</span>
                    <span class="calc-value">₹${(taxInvoice.cgst || 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
                  </div>
                  <div class="total-row">
                    <span class="calc-label">TOTAL PAYABLE</span>
                    <span class="calc-value">₹${(taxInvoice.totalAmount || 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
                  </div>
                </div>
                
                <div class="bank-card">
                  <div class="card-title">Bank Details for Payment</div>
                  <div class="bank-row">
                    <span class="calc-label">Bank Name:</span>
                    <span class="calc-value">${taxInvoice.bankName || 'N/A'}</span>
                  </div>
                  <div class="bank-row">
                    <span class="calc-label">Account No:</span>
                    <span class="calc-value">${taxInvoice.accountNumber || 'N/A'}</span>
                  </div>
                  <div class="bank-row">
                    <span class="calc-label">IFSC Code:</span>
                    <span class="calc-value">${taxInvoice.ifscCode || 'N/A'}</span>
                  </div>
                  <div class="bank-row">
                    <span class="calc-label">Account Holder:</span>
                    <span class="calc-value">${taxInvoice.accountHolder || 'N/A'}</span>
                  </div>
                  <div class="bank-row">
                    <span class="calc-label">Branch:</span>
                    <span class="calc-value">${taxInvoice.branchName || 'N/A'}</span>
                  </div>
                  <div class="bank-row">
                    <span class="calc-label">Branch Address:</span>
                    <span class="calc-value">${taxInvoice.branchAddress || 'N/A'}</span>
                  </div>
                  
                  <div class="terms-section">
                    <div class="terms-title">Terms & Conditions</div>
                    <div class="terms-text">• Payment due within 30 days</div>
                    <div class="terms-text">• Goods once sold will not be taken back</div>
                    <div class="terms-text">• All disputes subject to local jurisdiction</div>
                  </div>
                </div>
              </div>
              
              <div class="signature-section">
                <div class="signature-box">
                  <div class="signature-line"></div>
                  <div class="signature-text">Authorized Signature</div>
                </div>
              </div>
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

    printWindow.document.write(modernInvoiceHtml);
    printWindow.document.close();

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