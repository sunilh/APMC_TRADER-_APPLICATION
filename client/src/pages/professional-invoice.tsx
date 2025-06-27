import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, FileText, Download, Printer, Building } from "lucide-react";
import { useI18n, formatDate, formatCurrency } from "@/lib/i18n";
import { VoiceInput } from "@/components/voice-input";

interface InvoiceData {
  // Company Info
  companyName: string;
  companyNameKannada: string;
  address: string;
  phoneNumber: string;
  gstin: string;
  fssaiNo: string;
  apmcCode: string;
  
  // Buyer Info
  buyerName: string;
  invoiceDate: string;
  
  // Product Details
  lotNo: string;
  productName: string;
  hsnCode: string;
  
  // Purchase Details
  numberOfBags: number;
  totalWeightKg: number;
  ratePerQuintal: number;
  packingCharges: number;
  weighingCharges: number;
  commissionPercent: number;
}

export default function ProfessionalInvoice() {
  const { t, language, setLanguage } = useI18n();
  
  const [invoiceData, setInvoiceData] = useState<InvoiceData>({
    companyName: "",
    companyNameKannada: "",
    address: "",
    phoneNumber: "",
    gstin: "",
    fssaiNo: "",
    apmcCode: "",
    buyerName: "",
    invoiceDate: new Date().toISOString().split('T')[0],
    lotNo: "",
    productName: "",
    hsnCode: "",
    numberOfBags: 0,
    totalWeightKg: 0,
    ratePerQuintal: 0,
    packingCharges: 0,
    weighingCharges: 0,
    commissionPercent: 0,
  });

  const handleInputChange = (field: keyof InvoiceData, value: string | number) => {
    setInvoiceData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleVoiceInput = (field: keyof InvoiceData, value: string) => {
    if (['numberOfBags', 'totalWeightKg', 'ratePerQuintal', 'packingCharges', 'weighingCharges', 'commissionPercent'].includes(field)) {
      const numValue = parseFloat(value) || 0;
      handleInputChange(field, numValue);
    } else {
      handleInputChange(field, value);
    }
  };

  // Calculations
  const totalWeightQuintals = invoiceData.totalWeightKg / 100;
  const basicAmount = totalWeightQuintals * invoiceData.ratePerQuintal;
  const commissionAmount = (basicAmount * invoiceData.commissionPercent) / 100;
  const sgst = (basicAmount * 2.5) / 100;
  const cgst = (basicAmount * 2.5) / 100;
  const cess = (basicAmount * 0.6) / 100;
  const totalAmount = basicAmount + invoiceData.packingCharges + invoiceData.weighingCharges + commissionAmount + sgst + cgst + cess;

  const generateInvoice = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const invoiceContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Tax Invoice - ${invoiceData.companyName}</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 0; 
              padding: 20px;
              font-size: 14px;
              line-height: 1.4;
            }
            .invoice-header { 
              text-align: center; 
              border-bottom: 3px solid #000; 
              padding-bottom: 20px; 
              margin-bottom: 30px;
            }
            .company-name { 
              font-size: 24px; 
              font-weight: bold; 
              margin-bottom: 5px;
            }
            .company-name-kannada { 
              font-size: 20px; 
              font-weight: bold; 
              margin-bottom: 15px;
              color: #333;
            }
            .invoice-title { 
              font-size: 20px; 
              font-weight: bold; 
              text-decoration: underline;
              margin-top: 15px;
            }
            .company-details { 
              display: flex; 
              justify-content: space-between; 
              margin-bottom: 30px;
            }
            .company-info, .buyer-info { 
              width: 48%; 
              padding: 15px; 
              border: 2px solid #000;
            }
            .company-info h3, .buyer-info h3 { 
              margin: 0 0 15px 0; 
              font-size: 16px; 
              text-decoration: underline;
            }
            .info-row { 
              display: flex; 
              margin-bottom: 8px;
            }
            .info-label { 
              font-weight: bold; 
              width: 40%; 
            }
            .info-value { 
              width: 60%; 
            }
            .purchase-table { 
              width: 100%; 
              border-collapse: collapse; 
              margin: 30px 0;
              border: 2px solid #000;
            }
            .purchase-table th, .purchase-table td { 
              border: 1px solid #000; 
              padding: 10px; 
              text-align: left;
            }
            .purchase-table th { 
              background-color: #f0f0f0; 
              font-weight: bold; 
              text-align: center;
            }
            .text-right { 
              text-align: right; 
            }
            .text-center { 
              text-align: center; 
            }
            .total-section { 
              margin-top: 30px; 
              border: 2px solid #000; 
              padding: 20px;
            }
            .total-row { 
              display: flex; 
              justify-content: space-between; 
              margin-bottom: 8px;
            }
            .grand-total { 
              font-size: 18px; 
              font-weight: bold; 
              border-top: 2px solid #000; 
              padding-top: 10px; 
              margin-top: 15px;
            }
            .signature-section { 
              margin-top: 50px; 
              display: flex; 
              justify-content: space-between;
            }
            .signature-box { 
              width: 30%; 
              text-align: center;
            }
            .signature-line { 
              border-top: 1px solid #000; 
              margin-top: 40px; 
              padding-top: 10px;
            }
            @media print {
              body { margin: 0; padding: 15px; font-size: 12px; }
            }
          </style>
        </head>
        <body>
          <div class="invoice-header">
            <div class="company-name">${invoiceData.companyName}</div>
            ${invoiceData.companyNameKannada ? `<div class="company-name-kannada">${invoiceData.companyNameKannada}</div>` : ''}
            <div class="invoice-title">${t('billing.title')}</div>
          </div>

          <div class="company-details">
            <div class="company-info">
              <h3>Company Information</h3>
              <div class="info-row">
                <div class="info-label">Address:</div>
                <div class="info-value">${invoiceData.address}</div>
              </div>
              <div class="info-row">
                <div class="info-label">Phone:</div>
                <div class="info-value">${invoiceData.phoneNumber}</div>
              </div>
              <div class="info-row">
                <div class="info-label">GSTIN:</div>
                <div class="info-value">${invoiceData.gstin}</div>
              </div>
              <div class="info-row">
                <div class="info-label">FSSAI No:</div>
                <div class="info-value">${invoiceData.fssaiNo}</div>
              </div>
              <div class="info-row">
                <div class="info-label">APMC Code:</div>
                <div class="info-value">${invoiceData.apmcCode}</div>
              </div>
            </div>

            <div class="buyer-info">
              <h3>Buyer Information</h3>
              <div class="info-row">
                <div class="info-label">Customer Name:</div>
                <div class="info-value">${invoiceData.buyerName || 'N/A'}</div>
              </div>
              <div class="info-row">
                <div class="info-label">Invoice Date:</div>
                <div class="info-value">${formatDate(new Date(invoiceData.invoiceDate), language)}</div>
              </div>
              <div class="info-row">
                <div class="info-label">Lot No:</div>
                <div class="info-value">${invoiceData.lotNo}</div>
              </div>
              <div class="info-row">
                <div class="info-label">Product Name:</div>
                <div class="info-value">${invoiceData.productName}</div>
              </div>
              <div class="info-row">
                <div class="info-label">HSN Code:</div>
                <div class="info-value">${invoiceData.hsnCode}</div>
              </div>
            </div>
          </div>

          <table class="purchase-table">
            <thead>
              <tr>
                <th>Description</th>
                <th>Quantity</th>
                <th>Unit</th>
                <th>Rate</th>
                <th>Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>${invoiceData.productName}</td>
                <td class="text-right">${totalWeightQuintals.toFixed(2)}</td>
                <td class="text-center">Quintals</td>
                <td class="text-right">${formatCurrency(invoiceData.ratePerQuintal, language)}</td>
                <td class="text-right">${formatCurrency(basicAmount, language)}</td>
              </tr>
              <tr>
                <td>No. of Bags</td>
                <td class="text-right">${invoiceData.numberOfBags}</td>
                <td class="text-center">Bags</td>
                <td class="text-right">-</td>
                <td class="text-right">-</td>
              </tr>
              <tr>
                <td>Total Weight</td>
                <td class="text-right">${invoiceData.totalWeightKg.toFixed(1)}</td>
                <td class="text-center">Kg</td>
                <td class="text-right">-</td>
                <td class="text-right">-</td>
              </tr>
            </tbody>
          </table>

          <div class="total-section">
            <div class="total-row">
              <span>Basic Amount:</span>
              <span>${formatCurrency(basicAmount, language)}</span>
            </div>
            <div class="total-row">
              <span>Packing Charges:</span>
              <span>+ ${formatCurrency(invoiceData.packingCharges, language)}</span>
            </div>
            <div class="total-row">
              <span>Weighing Charges:</span>
              <span>+ ${formatCurrency(invoiceData.weighingCharges, language)}</span>
            </div>
            <div class="total-row">
              <span>Commission (${invoiceData.commissionPercent}%):</span>
              <span>+ ${formatCurrency(commissionAmount, language)}</span>
            </div>
            <div class="total-row">
              <span>SGST @ 2.5%:</span>
              <span>+ ${formatCurrency(sgst, language)}</span>
            </div>
            <div class="total-row">
              <span>CGST @ 2.5%:</span>
              <span>+ ${formatCurrency(cgst, language)}</span>
            </div>
            <div class="total-row">
              <span>CESS @ 0.6%:</span>
              <span>+ ${formatCurrency(cess, language)}</span>
            </div>
            <div class="total-row grand-total">
              <span>GRAND TOTAL:</span>
              <span>${formatCurrency(totalAmount, language)}</span>
            </div>
          </div>

          <div class="signature-section">
            <div class="signature-box">
              <div>Customer Signature</div>
              <div class="signature-line"></div>
            </div>
            <div class="signature-box">
              <div>Authorized Signatory</div>
              <div class="signature-line">${invoiceData.companyName}</div>
            </div>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(invoiceContent);
    printWindow.document.close();
    printWindow.print();
  };

  const downloadInvoice = () => {
    const content = generateInvoiceHTML();
    const blob = new Blob([content], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoice-${invoiceData.lotNo || 'draft'}-${invoiceData.invoiceDate}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const generateInvoiceHTML = () => {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Tax Invoice - ${invoiceData.companyName}</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 0; 
              padding: 20px;
              font-size: 14px;
              line-height: 1.4;
            }
            .invoice-header { 
              text-align: center; 
              border-bottom: 3px solid #000; 
              padding-bottom: 20px; 
              margin-bottom: 30px;
            }
            .company-name { 
              font-size: 24px; 
              font-weight: bold; 
              margin-bottom: 5px;
            }
            .company-name-kannada { 
              font-size: 20px; 
              font-weight: bold; 
              margin-bottom: 15px;
              color: #333;
            }
            .invoice-title { 
              font-size: 20px; 
              font-weight: bold; 
              text-decoration: underline;
              margin-top: 15px;
            }
            .company-details { 
              display: flex; 
              justify-content: space-between; 
              margin-bottom: 30px;
            }
            .company-info, .buyer-info { 
              width: 48%; 
              padding: 15px; 
              border: 2px solid #000;
            }
            .company-info h3, .buyer-info h3 { 
              margin: 0 0 15px 0; 
              font-size: 16px; 
              text-decoration: underline;
            }
            .info-row { 
              display: flex; 
              margin-bottom: 8px;
            }
            .info-label { 
              font-weight: bold; 
              width: 40%; 
            }
            .info-value { 
              width: 60%; 
            }
            .purchase-table { 
              width: 100%; 
              border-collapse: collapse; 
              margin: 30px 0;
              border: 2px solid #000;
            }
            .purchase-table th, .purchase-table td { 
              border: 1px solid #000; 
              padding: 10px; 
              text-align: left;
            }
            .purchase-table th { 
              background-color: #f0f0f0; 
              font-weight: bold; 
              text-align: center;
            }
            .text-right { 
              text-align: right; 
            }
            .text-center { 
              text-align: center; 
            }
            .total-section { 
              margin-top: 30px; 
              border: 2px solid #000; 
              padding: 20px;
            }
            .total-row { 
              display: flex; 
              justify-content: space-between; 
              margin-bottom: 8px;
            }
            .grand-total { 
              font-size: 18px; 
              font-weight: bold; 
              border-top: 2px solid #000; 
              padding-top: 10px; 
              margin-top: 15px;
            }
            .signature-section { 
              margin-top: 50px; 
              display: flex; 
              justify-content: space-between;
            }
            .signature-box { 
              width: 30%; 
              text-align: center;
            }
            .signature-line { 
              border-top: 1px solid #000; 
              margin-top: 40px; 
              padding-top: 10px;
            }
            @media print {
              body { margin: 0; padding: 15px; font-size: 12px; }
            }
          </style>
        </head>
        <body>
          <div class="invoice-header">
            <div class="company-name">${invoiceData.companyName}</div>
            ${invoiceData.companyNameKannada ? `<div class="company-name-kannada">${invoiceData.companyNameKannada}</div>` : ''}
            <div class="invoice-title">${t('billing.title')}</div>
          </div>

          <div class="company-details">
            <div class="company-info">
              <h3>Company Information</h3>
              <div class="info-row">
                <div class="info-label">Address:</div>
                <div class="info-value">${invoiceData.address}</div>
              </div>
              <div class="info-row">
                <div class="info-label">Phone:</div>
                <div class="info-value">${invoiceData.phoneNumber}</div>
              </div>
              <div class="info-row">
                <div class="info-label">GSTIN:</div>
                <div class="info-value">${invoiceData.gstin}</div>
              </div>
              <div class="info-row">
                <div class="info-label">FSSAI No:</div>
                <div class="info-value">${invoiceData.fssaiNo}</div>
              </div>
              <div class="info-row">
                <div class="info-label">APMC Code:</div>
                <div class="info-value">${invoiceData.apmcCode}</div>
              </div>
            </div>

            <div class="buyer-info">
              <h3>Buyer Information</h3>
              <div class="info-row">
                <div class="info-label">Customer Name:</div>
                <div class="info-value">${invoiceData.buyerName || 'N/A'}</div>
              </div>
              <div class="info-row">
                <div class="info-label">Invoice Date:</div>
                <div class="info-value">${formatDate(new Date(invoiceData.invoiceDate), language)}</div>
              </div>
              <div class="info-row">
                <div class="info-label">Lot No:</div>
                <div class="info-value">${invoiceData.lotNo}</div>
              </div>
              <div class="info-row">
                <div class="info-label">Product Name:</div>
                <div class="info-value">${invoiceData.productName}</div>
              </div>
              <div class="info-row">
                <div class="info-label">HSN Code:</div>
                <div class="info-value">${invoiceData.hsnCode}</div>
              </div>
            </div>
          </div>

          <table class="purchase-table">
            <thead>
              <tr>
                <th>Description</th>
                <th>Quantity</th>
                <th>Unit</th>
                <th>Rate</th>
                <th>Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>${invoiceData.productName}</td>
                <td class="text-right">${totalWeightQuintals.toFixed(2)}</td>
                <td class="text-center">Quintals</td>
                <td class="text-right">${formatCurrency(invoiceData.ratePerQuintal, language)}</td>
                <td class="text-right">${formatCurrency(basicAmount, language)}</td>
              </tr>
              <tr>
                <td>No. of Bags</td>
                <td class="text-right">${invoiceData.numberOfBags}</td>
                <td class="text-center">Bags</td>
                <td class="text-right">-</td>
                <td class="text-right">-</td>
              </tr>
              <tr>
                <td>Total Weight</td>
                <td class="text-right">${invoiceData.totalWeightKg.toFixed(1)}</td>
                <td class="text-center">Kg</td>
                <td class="text-right">-</td>
                <td class="text-right">-</td>
              </tr>
            </tbody>
          </table>

          <div class="total-section">
            <div class="total-row">
              <span>Basic Amount:</span>
              <span>${formatCurrency(basicAmount, language)}</span>
            </div>
            <div class="total-row">
              <span>Packing Charges:</span>
              <span>+ ${formatCurrency(invoiceData.packingCharges, language)}</span>
            </div>
            <div class="total-row">
              <span>Weighing Charges:</span>
              <span>+ ${formatCurrency(invoiceData.weighingCharges, language)}</span>
            </div>
            <div class="total-row">
              <span>Commission (${invoiceData.commissionPercent}%):</span>
              <span>+ ${formatCurrency(commissionAmount, language)}</span>
            </div>
            <div class="total-row">
              <span>SGST @ 2.5%:</span>
              <span>+ ${formatCurrency(sgst, language)}</span>
            </div>
            <div class="total-row">
              <span>CGST @ 2.5%:</span>
              <span>+ ${formatCurrency(cgst, language)}</span>
            </div>
            <div class="total-row">
              <span>CESS @ 0.6%:</span>
              <span>+ ${formatCurrency(cess, language)}</span>
            </div>
            <div class="total-row grand-total">
              <span>GRAND TOTAL:</span>
              <span>${formatCurrency(totalAmount, language)}</span>
            </div>
          </div>

          <div class="signature-section">
            <div class="signature-box">
              <div>Customer Signature</div>
              <div class="signature-line"></div>
            </div>
            <div class="signature-box">
              <div>Authorized Signatory</div>
              <div class="signature-line">${invoiceData.companyName}</div>
            </div>
          </div>
        </body>
      </html>
    `;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Professional Invoice Generator
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Create professional invoices with all required details
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <Select value={language} onValueChange={setLanguage}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="hi">हिंदी</SelectItem>
              <SelectItem value="kn">ಕನ್ನಡ</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Company Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Building className="h-5 w-5" />
              <span>1. Company Information</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Company Name (English)</Label>
              <VoiceInput
                type="text"
                placeholder="Enter company name"
                onResult={(value) => handleVoiceInput('companyName', value)}
              />
              <Input
                value={invoiceData.companyName}
                onChange={(e) => handleInputChange('companyName', e.target.value)}
                placeholder="Enter company name"
              />
            </div>

            <div className="space-y-2">
              <Label>Company Name (Kannada)</Label>
              <VoiceInput
                type="text"
                placeholder="ಕಂಪನಿ ಹೆಸರು ನಮೂದಿಸಿ"
                onResult={(value) => handleVoiceInput('companyNameKannada', value)}
              />
              <Input
                value={invoiceData.companyNameKannada}
                onChange={(e) => handleInputChange('companyNameKannada', e.target.value)}
                placeholder="ಕಂಪನಿ ಹೆಸರು ನಮೂದಿಸಿ"
              />
            </div>

            <div className="space-y-2">
              <Label>Address</Label>
              <VoiceInput
                type="text"
                placeholder="Enter complete address"
                onResult={(value) => handleVoiceInput('address', value)}
              />
              <Textarea
                value={invoiceData.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
                placeholder="Enter complete address"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Phone Number</Label>
                <VoiceInput
                  type="tel"
                  placeholder="Enter phone number"
                  onResult={(value) => handleVoiceInput('phoneNumber', value)}
                />
                <Input
                  value={invoiceData.phoneNumber}
                  onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                  placeholder="Enter phone number"
                />
              </div>

              <div className="space-y-2">
                <Label>APMC Code</Label>
                <VoiceInput
                  type="text"
                  placeholder="Enter APMC code"
                  onResult={(value) => handleVoiceInput('apmcCode', value)}
                />
                <Input
                  value={invoiceData.apmcCode}
                  onChange={(e) => handleInputChange('apmcCode', e.target.value)}
                  placeholder="Enter APMC code"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>GSTIN</Label>
                <VoiceInput
                  type="text"
                  placeholder="Enter GST number"
                  onResult={(value) => handleVoiceInput('gstin', value)}
                />
                <Input
                  value={invoiceData.gstin}
                  onChange={(e) => handleInputChange('gstin', e.target.value)}
                  placeholder="Enter GST number"
                />
              </div>

              <div className="space-y-2">
                <Label>FSSAI No</Label>
                <VoiceInput
                  type="text"
                  placeholder="Enter FSSAI number"
                  onResult={(value) => handleVoiceInput('fssaiNo', value)}
                />
                <Input
                  value={invoiceData.fssaiNo}
                  onChange={(e) => handleInputChange('fssaiNo', e.target.value)}
                  placeholder="Enter FSSAI number"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Buyer & Product Information */}
        <Card>
          <CardHeader>
            <CardTitle>2. Buyer & Product Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Buyer/Customer Name (Optional)</Label>
              <VoiceInput
                type="text"
                placeholder="Enter buyer name (optional)"
                onResult={(value) => handleVoiceInput('buyerName', value)}
              />
              <Input
                value={invoiceData.buyerName}
                onChange={(e) => handleInputChange('buyerName', e.target.value)}
                placeholder="Enter buyer name (optional)"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Invoice Date</Label>
                <Input
                  type="date"
                  value={invoiceData.invoiceDate}
                  onChange={(e) => handleInputChange('invoiceDate', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Lot No</Label>
                <VoiceInput
                  type="text"
                  placeholder="Enter lot number"
                  onResult={(value) => handleVoiceInput('lotNo', value)}
                />
                <Input
                  value={invoiceData.lotNo}
                  onChange={(e) => handleInputChange('lotNo', e.target.value)}
                  placeholder="Enter lot number"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Product Name</Label>
                <VoiceInput
                  type="text"
                  placeholder="e.g., Dry Chillies"
                  onResult={(value) => handleVoiceInput('productName', value)}
                />
                <Input
                  value={invoiceData.productName}
                  onChange={(e) => handleInputChange('productName', e.target.value)}
                  placeholder="e.g., Dry Chillies"
                />
              </div>

              <div className="space-y-2">
                <Label>HSN Code</Label>
                <VoiceInput
                  type="text"
                  placeholder="Enter HSN code"
                  onResult={(value) => handleVoiceInput('hsnCode', value)}
                />
                <Input
                  value={invoiceData.hsnCode}
                  onChange={(e) => handleInputChange('hsnCode', e.target.value)}
                  placeholder="Enter HSN code"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Purchase Details */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>3. Purchase Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="space-y-2">
                <Label>No. of Bags</Label>
                <VoiceInput
                  type="number"
                  placeholder="Enter number of bags"
                  onResult={(value) => handleVoiceInput('numberOfBags', value)}
                />
                <Input
                  type="number"
                  value={invoiceData.numberOfBags || ''}
                  onChange={(e) => handleInputChange('numberOfBags', Number(e.target.value))}
                  placeholder="Enter number of bags"
                />
              </div>

              <div className="space-y-2">
                <Label>Total Weight (KG)</Label>
                <VoiceInput
                  type="number"
                  placeholder="Enter weight in kg"
                  onResult={(value) => handleVoiceInput('totalWeightKg', value)}
                />
                <Input
                  type="number"
                  step="0.1"
                  value={invoiceData.totalWeightKg || ''}
                  onChange={(e) => handleInputChange('totalWeightKg', Number(e.target.value))}
                  placeholder="Enter weight in kg"
                />
              </div>

              <div className="space-y-2">
                <Label>Rate per Quintal (₹)</Label>
                <VoiceInput
                  type="currency"
                  placeholder="Enter rate per quintal"
                  onResult={(value) => handleVoiceInput('ratePerQuintal', value)}
                />
                <Input
                  type="number"
                  step="0.01"
                  value={invoiceData.ratePerQuintal || ''}
                  onChange={(e) => handleInputChange('ratePerQuintal', Number(e.target.value))}
                  placeholder="Enter rate per quintal"
                />
              </div>

              <div className="space-y-2">
                <Label>Packing Charges (₹)</Label>
                <VoiceInput
                  type="currency"
                  placeholder="Enter packing charges"
                  onResult={(value) => handleVoiceInput('packingCharges', value)}
                />
                <Input
                  type="number"
                  step="0.01"
                  value={invoiceData.packingCharges || ''}
                  onChange={(e) => handleInputChange('packingCharges', Number(e.target.value))}
                  placeholder="Enter packing charges"
                />
              </div>

              <div className="space-y-2">
                <Label>Weighing Charges (₹)</Label>
                <VoiceInput
                  type="currency"
                  placeholder="Enter weighing charges"
                  onResult={(value) => handleVoiceInput('weighingCharges', value)}
                />
                <Input
                  type="number"
                  step="0.01"
                  value={invoiceData.weighingCharges || ''}
                  onChange={(e) => handleInputChange('weighingCharges', Number(e.target.value))}
                  placeholder="Enter weighing charges"
                />
              </div>

              <div className="space-y-2">
                <Label>Commission %</Label>
                <VoiceInput
                  type="number"
                  placeholder="Enter commission percentage"
                  onResult={(value) => handleVoiceInput('commissionPercent', value)}
                />
                <Input
                  type="number"
                  step="0.1"
                  value={invoiceData.commissionPercent || ''}
                  onChange={(e) => handleInputChange('commissionPercent', Number(e.target.value))}
                  placeholder="Enter commission %"
                />
              </div>
            </div>

            {/* Calculation Summary */}
            <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <h4 className="font-semibold mb-3">Invoice Summary</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Weight (Quintals):</span>
                  <div className="font-semibold">{totalWeightQuintals.toFixed(2)}</div>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Basic Amount:</span>
                  <div className="font-semibold">{formatCurrency(basicAmount, language)}</div>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Total Charges:</span>
                  <div className="font-semibold">{formatCurrency(invoiceData.packingCharges + invoiceData.weighingCharges + commissionAmount + sgst + cgst + cess, language)}</div>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Grand Total:</span>
                  <div className="font-bold text-lg text-green-600">{formatCurrency(totalAmount, language)}</div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-center space-x-4 mt-6">
              <Button onClick={generateInvoice} className="flex items-center space-x-2">
                <Printer className="h-4 w-4" />
                <span>Print Invoice</span>
              </Button>
              <Button variant="outline" onClick={downloadInvoice} className="flex items-center space-x-2">
                <Download className="h-4 w-4" />
                <span>Download HTML</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}