import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Download, FileText, Printer } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Enhanced Tax Invoice Interface matching backend
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

export default function TaxInvoice() {
  const [selectedBuyerId, setSelectedBuyerId] = useState<number | null>(null);
  const { toast } = useToast();

  // Fetch all buyers
  const { data: buyers = [], isLoading: buyersLoading } = useQuery<Buyer[]>({
    queryKey: ["/api/buyers"],
  });

  // Fetch tax invoice for selected buyer
  const { data: taxInvoice, isLoading: invoiceLoading, error } = useQuery<TaxInvoice>({
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
    enabled: !!selectedBuyerId,
  });

  const formatCurrency = (amount: number | undefined | null) => {
    if (amount === undefined || amount === null || isNaN(amount)) {
      return '₹0.00';
    }
    return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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
            body { font-family: Arial, sans-serif; margin: 15px; font-size: 10px; line-height: 1.2; }
            .header { text-align: center; margin-bottom: 12px; }
            .invoice-title { font-size: 18px; font-weight: bold; margin-bottom: 6px; }
            .invoice-info { font-size: 11px; margin-bottom: 12px; }
            .details-box { border: 1px solid #000; padding: 8px; margin-bottom: 8px; }
            .details-header { font-weight: bold; text-align: center; margin-bottom: 6px; padding: 3px; background-color: #f0f0f0; font-size: 10px; }
            .details-row { display: flex; justify-content: space-between; margin-bottom: 2px; }
            .details-label { font-weight: bold; min-width: 120px; font-size: 9px; }
            .details-value { font-size: 9px; }
            .items-table { width: 100%; border-collapse: collapse; margin-bottom: 10px; font-size: 9px; }
            .items-table th, .items-table td { border: 1px solid #000; padding: 4px; text-align: center; }
            .items-table th { background-color: #f0f0f0; font-weight: bold; }
            .calculations-box { border: 1px solid #000; padding: 8px; margin-bottom: 8px; }
            .calc-row { display: flex; justify-content: space-between; margin-bottom: 2px; font-size: 9px; }
            .calc-label { font-weight: bold; }
            .total-row { border-top: 1px solid #000; padding-top: 4px; margin-top: 4px; font-weight: bold; font-size: 11px; }
            .bank-details { border: 1px solid #000; padding: 8px; margin-bottom: 10px; }
            .footer { margin-top: 15px; text-align: right; font-size: 9px; }
            .company-details { display: flex; justify-content: space-between; gap: 10px; }
            .company-box { flex: 1; }
            .two-column { display: flex; gap: 10px; margin-bottom: 8px; }
            .column { flex: 1; }
            @media print { 
              body { margin: 10px; font-size: 9px; } 
              .header { margin-bottom: 8px; }
              .details-box { margin-bottom: 6px; padding: 6px; }
              .calculations-box { margin-bottom: 6px; padding: 6px; }
              .bank-details { margin-bottom: 6px; padding: 6px; }
              .footer { margin-top: 10px; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="invoice-title">TAX INVOICE</div>
            <div class="invoice-info">
              Invoice No: ${taxInvoice.invoiceNumber} &nbsp;&nbsp;&nbsp; Date: ${taxInvoice.invoiceDate}<br>
              HSN Code: ${taxInvoice.hsnCode}
            </div>
          </div>

          <div class="two-column">
            <div class="details-box column">
              <div class="details-header">SELLER DETAILS</div>
              <div class="details-row">
                <span class="details-label">Company:</span>
                <span class="details-value">${taxInvoice.seller.companyName}</span>
              </div>
              <div class="details-row">
                <span class="details-label">APMC:</span>
                <span class="details-value">${taxInvoice.seller.apmcCode}</span>
              </div>
              <div class="details-row">
                <span class="details-label">Address:</span>
                <span class="details-value">${taxInvoice.seller.address}</span>
              </div>
              <div class="details-row">
                <span class="details-label">Mobile:</span>
                <span class="details-value">${taxInvoice.seller.mobile}</span>
              </div>
              <div class="details-row">
                <span class="details-label">GSTIN:</span>
                <span class="details-value">${taxInvoice.seller.gstin}</span>
              </div>
              <div class="details-row">
                <span class="details-label">PAN:</span>
                <span class="details-value">${taxInvoice.seller.pan}</span>
              </div>
              <div class="details-row">
                <span class="details-label">FSSAI:</span>
                <span class="details-value">${taxInvoice.seller.fssai}</span>
              </div>
            </div>

            <div class="details-box column">
              <div class="details-header">BUYER DETAILS</div>
              <div class="details-row">
                <span class="details-label">Company:</span>
                <span class="details-value">${taxInvoice.buyer.companyName}</span>
              </div>
              <div class="details-row">
                <span class="details-label">Contact:</span>
                <span class="details-value">${taxInvoice.buyer.contactPerson}</span>
              </div>
              <div class="details-row">
                <span class="details-label">Address:</span>
                <span class="details-value">${taxInvoice.buyer.address}</span>
              </div>
              <div class="details-row">
                <span class="details-label">Mobile:</span>
                <span class="details-value">${taxInvoice.buyer.mobile}</span>
              </div>
              <div class="details-row">
                <span class="details-label">GSTIN:</span>
                <span class="details-value">${taxInvoice.buyer.gstin}</span>
              </div>
              <div class="details-row">
                <span class="details-label">PAN:</span>
                <span class="details-value">${taxInvoice.buyer.pan || 'N/A'}</span>
              </div>
            </div>
          </div>

          <div style="margin-bottom: 20px;">
            <strong>ITEM DETAILS:</strong>
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
              ${taxInvoice.items.map((item, index) => `
                <tr>
                  <td>${index + 1}</td>
                  <td>${item.itemName}</td>
                  <td>${item.hsnCode}</td>
                  <td>${item.bags}</td>
                  <td>${item.weightKg.toFixed(1)}</td>
                  <td>${formatCurrency(item.ratePerQuintal)}</td>
                  <td>${formatCurrency(item.basicAmount)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="two-column">
            <div class="calculations-box column">
              <div class="details-header">AMOUNT CALCULATIONS</div>
              <div class="calc-row">
                <span class="calc-label">Basic Amount</span>
                <span>${formatCurrency(taxInvoice.calculations.basicAmount)}</span>
              </div>
              <div class="calc-row">
                <span class="calc-label">+ Packaging (${taxInvoice.items.reduce((sum, item) => sum + item.bags, 0)} bags)</span>
                <span>${formatCurrency(taxInvoice.calculations.packaging)}</span>
              </div>
              <div class="calc-row">
                <span class="calc-label">+ Hamali (${taxInvoice.items.reduce((sum, item) => sum + item.bags, 0)} bags)</span>
                <span>${formatCurrency(taxInvoice.calculations.hamali)}</span>
              </div>
              <div class="calc-row">
                <span class="calc-label">+ Weighing (${taxInvoice.items.reduce((sum, item) => sum + item.bags, 0)} bags)</span>
                <span>${formatCurrency(taxInvoice.calculations.weighingCharges)}</span>
              </div>
              <div class="calc-row">
                <span class="calc-label">+ Commission</span>
                <span>${formatCurrency(taxInvoice.calculations.commission)}</span>
              </div>
              <div class="calc-row">
                <span class="calc-label">+ Cess on Commission</span>
                <span>${formatCurrency(taxInvoice.calculations.cessOnCommission)}</span>
              </div>
              <div class="calc-row" style="background-color: #fef3c7; font-weight: bold;">
                <span class="calc-label">Taxable Amount</span>
                <span>${formatCurrency(taxInvoice.calculations.taxableAmount)}</span>
              </div>
              <div class="calc-row">
                <span class="calc-label">+ SGST (2.5%)</span>
                <span>${formatCurrency(taxInvoice.calculations.sgst)}</span>
              </div>
              <div class="calc-row">
                <span class="calc-label">+ CGST (2.5%)</span>
                <span>${formatCurrency(taxInvoice.calculations.cgst)}</span>
              </div>
              ${taxInvoice.calculations.igst > 0 ? `
              <div class="calc-row">
                <span class="calc-label">+ IGST (5%)</span>
                <span>${formatCurrency(taxInvoice.calculations.igst)}</span>
              </div>` : ''}
              <div class="calc-row" style="background-color: #dbeafe; font-weight: bold;">
                <span class="calc-label">Total GST</span>
                <span>${formatCurrency(taxInvoice.calculations.totalGst)}</span>
              </div>
              <div class="calc-row total-row">
                <span class="calc-label">TOTAL PAYABLE</span>
                <span>${formatCurrency(taxInvoice.calculations.totalAmount)}</span>
              </div>
            </div>

            <div class="bank-details column">
              <div class="details-header">BANK DETAILS FOR PAYMENT</div>
              <div class="details-row">
                <span class="details-label">Bank:</span>
                <span class="details-value">${taxInvoice.bankDetails.bankName}</span>
              </div>
              <div class="details-row">
                <span class="details-label">A/C No:</span>
                <span class="details-value">${taxInvoice.bankDetails.accountNumber}</span>
              </div>
              <div class="details-row">
                <span class="details-label">IFSC:</span>
                <span class="details-value">${taxInvoice.bankDetails.ifscCode}</span>
              </div>
              <div class="details-row">
                <span class="details-label">Holder:</span>
                <span class="details-value">${taxInvoice.bankDetails.accountHolder}</span>
              </div>
              <div class="details-row">
                <span class="details-label">Branch:</span>
                <span class="details-value">${taxInvoice.bankDetails.branchName}</span>
              </div>
              <div class="details-row">
                <span class="details-label">Branch Address:</span>
                <span class="details-value">${taxInvoice.bankDetails.branchAddress}</span>
              </div>
              <div style="margin-top: 15px; font-size: 9px;">
                <strong>Terms:</strong> Payment due within 30 days<br>
                Goods once sold will not be taken back
              </div>
            </div>
          </div>

          <div class="footer">
            <div style="text-align: right; margin-top: 10px;">
              <div style="border-top: 1px solid #000; padding-top: 5px; width: 150px; margin-left: auto;">
                Authorized Signature
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(invoiceHtml);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const downloadInvoice = () => {
    if (!taxInvoice) return;

    generatePrintableInvoice();
    
    toast({
      title: "Invoice Generated",
      description: "Tax invoice opened in new window for printing/downloading",
    });
  };

  if (buyersLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">Loading buyers...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tax Invoice Generator</h1>
          <p className="text-muted-foreground">
            Generate professional tax invoices for completed buyer transactions
          </p>
        </div>
        <FileText className="h-8 w-8 text-muted-foreground" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Select Buyer</CardTitle>
          <CardDescription>
            Choose a buyer to generate their tax invoice based on completed lots
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select
            value={selectedBuyerId?.toString() || ""}
            onValueChange={(value) => setSelectedBuyerId(parseInt(value))}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a buyer to generate invoice" />
            </SelectTrigger>
            <SelectContent>
              {buyers.map((buyer) => (
                <SelectItem key={buyer.id} value={buyer.id.toString()}>
                  {buyer.name} - {buyer.mobile}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive">
              {error instanceof Error ? error.message : "Failed to generate invoice"}
            </p>
          </CardContent>
        </Card>
      )}

      {invoiceLoading && selectedBuyerId && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">Generating tax invoice...</div>
          </CardContent>
        </Card>
      )}

      {taxInvoice && (
        <div className="space-y-6">
          {/* Invoice Actions */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex gap-4">
                <Button onClick={downloadInvoice} className="flex items-center gap-2">
                  <Printer className="h-4 w-4" />
                  Print/Download Invoice
                </Button>
                <Button variant="outline" onClick={downloadInvoice} className="flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  Generate PDF
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Invoice Preview */}
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">TAX INVOICE</CardTitle>
              <div className="flex justify-center gap-8 text-sm">
                <span>Invoice No: {taxInvoice.invoiceNumber}</span>
                <span>Date: {taxInvoice.invoiceDate}</span>
              </div>
              <div className="text-sm">HSN Code: {taxInvoice.hsnCode}</div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Seller Details */}
              <div className="border-2 border-gray-300 p-4 rounded-lg">
                <h3 className="font-bold text-center mb-4 bg-gray-100 p-2 rounded">SELLER DETAILS</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div><strong>Company Name:</strong> {taxInvoice.seller.companyName}</div>
                  <div><strong>APMC Code:</strong> {taxInvoice.seller.apmcCode}</div>
                  <div><strong>Address:</strong> {taxInvoice.seller.address}</div>
                  <div><strong>Mobile:</strong> {taxInvoice.seller.mobile}</div>
                  <div><strong>GSTIN:</strong> {taxInvoice.seller.gstin}</div>
                  <div><strong>PAN:</strong> {taxInvoice.seller.pan}</div>
                  <div><strong>FSSAI:</strong> {taxInvoice.seller.fssai}</div>
                </div>
              </div>

              {/* Buyer Details */}
              <div className="border-2 border-gray-300 p-4 rounded-lg">
                <h3 className="font-bold text-center mb-4 bg-gray-100 p-2 rounded">BUYER DETAILS</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div><strong>Company Name:</strong> {taxInvoice.buyer.companyName}</div>
                  <div><strong>Contact Person:</strong> {taxInvoice.buyer.contactPerson}</div>
                  <div><strong>Address:</strong> {taxInvoice.buyer.address}</div>
                  <div><strong>Mobile:</strong> {taxInvoice.buyer.mobile}</div>
                  <div><strong>GSTIN:</strong> {taxInvoice.buyer.gstin}</div>
                  <div><strong>PAN:</strong> {taxInvoice.buyer.pan}</div>
                </div>
              </div>

              {/* Item Details Table */}
              <div>
                <h3 className="font-bold mb-4">ITEM DETAILS:</h3>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-300">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border border-gray-300 p-2 text-center">LOT NO</th>
                        <th className="border border-gray-300 p-2 text-center">ITEM NAME</th>
                        <th className="border border-gray-300 p-2 text-center">HSN CODE</th>
                        <th className="border border-gray-300 p-2 text-center">BAGS</th>
                        <th className="border border-gray-300 p-2 text-center">WEIGHT (KG)</th>
                        <th className="border border-gray-300 p-2 text-center">RATE/QUINTAL</th>
                        <th className="border border-gray-300 p-2 text-center">AMOUNT IN RUPEES</th>
                      </tr>
                    </thead>
                    <tbody>
                      {taxInvoice.items.map((item, index) => (
                        <tr key={index}>
                          <td className="border border-gray-300 p-2 text-center">{index + 1}</td>
                          <td className="border border-gray-300 p-2 text-center">{item.itemName}</td>
                          <td className="border border-gray-300 p-2 text-center">{item.hsnCode}</td>
                          <td className="border border-gray-300 p-2 text-center">{item.bags}</td>
                          <td className="border border-gray-300 p-2 text-center">{item.weightKg.toFixed(1)}</td>
                          <td className="border border-gray-300 p-2 text-center">{formatCurrency(item.ratePerQuintal)}</td>
                          <td className="border border-gray-300 p-2 text-center">{formatCurrency(item.basicAmount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Calculations */}
              <div className="border-2 border-gray-300 p-4 rounded-lg">
                <h3 className="font-bold text-center mb-4 bg-gray-100 p-2 rounded">AMOUNT CALCULATIONS</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span><strong>Sub Total (Basic Amount)</strong></span>
                    <span>{formatCurrency(taxInvoice.calculations.basicAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span><strong>Add: Packing Charges ({taxInvoice.items.reduce((sum, item) => sum + item.bags, 0)} bags × ₹5)</strong></span>
                    <span>{formatCurrency(taxInvoice.calculations.packaging)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span><strong>Add: Weighing Charges ({taxInvoice.items.reduce((sum, item) => sum + item.bags, 0)} bags × ₹1.50)</strong></span>
                    <span>{formatCurrency(taxInvoice.calculations.weighingCharges)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span><strong>Add: Commission (2% of basic amount)</strong></span>
                    <span>{formatCurrency(taxInvoice.calculations.commission)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span><strong>Taxable Amount</strong></span>
                    <span>{formatCurrency(taxInvoice.calculations.taxableAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span><strong>Add: SGST @ 2.5%</strong></span>
                    <span>{formatCurrency(taxInvoice.calculations.sgst)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span><strong>Add: CGST @ 2.5%</strong></span>
                    <span>{formatCurrency(taxInvoice.calculations.cgst)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span><strong>Add: CESS @ 0.6% (on basic amount)</strong></span>
                    <span>{formatCurrency(taxInvoice.calculations.cess)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-lg font-bold">
                    <span>TOTAL AMOUNT PAYABLE</span>
                    <span>{formatCurrency(taxInvoice.calculations.totalAmount)}</span>
                  </div>
                </div>
              </div>

              {/* Bank Details */}
              <div className="border-2 border-gray-300 p-4 rounded-lg">
                <h3 className="font-bold text-center mb-4 bg-gray-100 p-2 rounded">BANK DETAILS FOR PAYMENT</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div><strong>Bank Name:</strong> {taxInvoice.bankDetails.bankName}</div>
                  <div><strong>Account Number:</strong> {taxInvoice.bankDetails.accountNumber}</div>
                  <div><strong>IFSC Code:</strong> {taxInvoice.bankDetails.ifscCode}</div>
                  <div><strong>Account Holder:</strong> {taxInvoice.bankDetails.accountHolder}</div>
                </div>
              </div>

              <div className="text-sm space-y-4">
                <div><strong>Terms & Conditions:</strong> Payment due within 30 days</div>
                <div className="text-right">
                  <div>Authorized Signature: _________________________</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}