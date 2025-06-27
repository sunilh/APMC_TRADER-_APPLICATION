import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, FileText, Download, Printer, User, Building, Phone, MapPin } from "lucide-react";
import { useI18n, formatDate, formatCurrency } from "@/lib/i18n";
import { VoiceInput } from "@/components/voice-input";

interface BuyerBill {
  buyerId: number;
  buyerName: string;
  buyerContact: string;
  buyerAddress: string;
  date: string;
  traderInfo: {
    name: string;
    apmcCode: string;
    place: string;
    address: string;
    mobile: string;
    gstNumber?: string;
    bankDetails?: {
      bankName?: string;
      accountNumber?: string;
      ifscCode?: string;
      accountHolderName?: string;
    };
  };
  lots: Array<{
    lotNumber: string;
    farmerName: string;
    variety: string;
    grade: string;
    numberOfBags: number;
    totalWeight: number;
    totalWeightQuintals: number;
    pricePerQuintal: number;
    basicAmount: number;
    charges: {
      unloadHamali: number;
      packaging: number;
      weighingFee: number;
      apmcCommission: number;
      sgst: number;
      cgst: number;
      cess: number;
    };
    totalAmount: number;
  }>;
  summary: {
    totalLots: number;
    totalBags: number;
    totalWeight: number;
    totalWeightQuintals: number;
    basicAmount: number;
    totalCharges: number;
    chargeBreakdown: {
      unloadHamali: number;
      packaging: number;
      weighingFee: number;
      apmcCommission: number;
      sgst: number;
      cgst: number;
      cess: number;
    };
    totalPayable: number;
  };
}

export default function BuyerBilling() {
  const { t, language, setLanguage } = useI18n();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedBuyerId, setSelectedBuyerId] = useState<string>("");

  // Fetch buyers
  const { data: buyers = [] } = useQuery<any[]>({
    queryKey: ["/api/buyers"],
  });

  // Fetch daily buyer bills
  const { data: dailyBills = [], isLoading: isLoadingDaily } = useQuery<BuyerBill[]>({
    queryKey: ["/api/billing/buyers/daily", selectedDate],
    enabled: !!selectedDate,
  });

  // Fetch specific buyer bill
  const { data: buyerBill, isLoading: isLoadingBuyer } = useQuery<BuyerBill>({
    queryKey: ["/api/billing/buyer", selectedBuyerId, selectedDate],
    enabled: !!selectedBuyerId && selectedBuyerId !== "all" && !!selectedDate,
  });

  const handleVoiceInput = (field: string, value: string) => {
    if (field === "date") {
      setSelectedDate(value);
    }
  };

  const printBuyerBill = (bill: BuyerBill) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${t('billing.title')} - ${bill.buyerName}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #000; padding-bottom: 20px; }
            .seller-info { margin-bottom: 20px; background: #f9f9f9; padding: 15px; border-radius: 5px; }
            .buyer-info { margin-bottom: 20px; background: #f5f5f5; padding: 15px; border-radius: 5px; }
            .bill-details { margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th, td { border: 1px solid #000; padding: 8px; text-align: left; }
            th { background-color: #f0f0f0; font-weight: bold; }
            .text-right { text-align: right; }
            .summary { background: #f9f9f9; padding: 15px; border-radius: 5px; }
            .total-row { font-weight: bold; background-color: #e0e0e0; }
            @media print {
              body { margin: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${t('billing.title')}</h1>
            <h2>${t('billing.seller')}: ${bill.traderInfo.name} → ${t('billing.buyer')}: ${bill.buyerName}</h2>
            <p>Date: ${formatDate(new Date(bill.date), language)}</p>
          </div>
          
          <div class="seller-info">
            <h3>${t('billing.seller')} Details</h3>
            <p><strong>Company:</strong> ${bill.traderInfo.name}</p>
            <p><strong>APMC Code:</strong> ${bill.traderInfo.apmcCode}</p>
            <p><strong>Place:</strong> ${bill.traderInfo.place}</p>
            <p><strong>Address:</strong> ${bill.traderInfo.address}</p>
            <p><strong>Mobile:</strong> ${bill.traderInfo.mobile}</p>
            ${bill.traderInfo.gstNumber ? `<p><strong>GST Number:</strong> ${bill.traderInfo.gstNumber}</p>` : ''}
            ${bill.traderInfo.bankDetails ? `
              <div style="margin-top: 10px;">
                <h4>${t('billing.bankDetails')}</h4>
                <p><strong>Bank:</strong> ${bill.traderInfo.bankDetails.bankName || 'N/A'}</p>
                <p><strong>Account:</strong> ${bill.traderInfo.bankDetails.accountNumber || 'N/A'}</p>
                <p><strong>IFSC:</strong> ${bill.traderInfo.bankDetails.ifscCode || 'N/A'}</p>
                <p><strong>Holder:</strong> ${bill.traderInfo.bankDetails.accountHolderName || 'N/A'}</p>
              </div>
            ` : ''}
          </div>

          <div class="buyer-info">
            <h3>${t('billing.buyer')} Details</h3>
            <p><strong>Company:</strong> ${bill.buyerName}</p>
            <p><strong>Contact:</strong> ${bill.buyerContact}</p>
            <p><strong>Address:</strong> ${bill.buyerAddress}</p>
          </div>

          <div class="bill-details">
            <h3>Purchase Details</h3>
            <table>
              <thead>
                <tr>
                  <th>${t('billing.lotNumber')}</th>
                  <th>${t('billing.farmerName')}</th>
                  <th>${t('billing.variety')}</th>
                  <th>${t('billing.grade')}</th>
                  <th>${t('billing.bags')}</th>
                  <th>${t('billing.weight')} (Kg)</th>
                  <th>Quintals</th>
                  <th>${t('billing.rate')}</th>
                  <th>${t('billing.basicAmount')}</th>
                  <th>${t('billing.packing')}</th>
                  <th>${t('billing.weighingCharges')}</th>
                  <th>${t('billing.commission')}</th>
                  <th>${t('billing.sgst')}</th>
                  <th>${t('billing.cgst')}</th>
                  <th>${t('billing.cess')}</th>
                  <th>${t('billing.totalAmount')}</th>
                </tr>
              </thead>
              <tbody>
                ${bill.lots.map(lot => `
                  <tr>
                    <td>${lot.lotNumber}</td>
                    <td>${lot.farmerName}</td>
                    <td>${lot.variety}</td>
                    <td>${lot.grade}</td>
                    <td class="text-right">${lot.numberOfBags}</td>
                    <td class="text-right">${lot.totalWeight.toFixed(1)}</td>
                    <td class="text-right">${lot.totalWeightQuintals.toFixed(2)}</td>
                    <td class="text-right">${formatCurrency(lot.pricePerQuintal, language)}</td>
                    <td class="text-right">${formatCurrency(lot.basicAmount, language)}</td>
                    <td class="text-right">+${formatCurrency(lot.charges.packing, language)}</td>
                    <td class="text-right">+${formatCurrency(lot.charges.weighingCharges, language)}</td>
                    <td class="text-right">+${formatCurrency(lot.charges.commission, language)}</td>
                    <td class="text-right">+${formatCurrency(lot.charges.sgst, language)}</td>
                    <td class="text-right">+${formatCurrency(lot.charges.cgst, language)}</td>
                    <td class="text-right">+${formatCurrency(lot.charges.cess, language)}</td>
                    <td class="text-right">${formatCurrency(lot.totalAmount, language)}</td>
                  </tr>
                `).join('')}
                <tr class="total-row">
                  <td colspan="4"><strong>TOTAL</strong></td>
                  <td class="text-right"><strong>${bill.summary.totalBags}</strong></td>
                  <td class="text-right"><strong>${bill.summary.totalWeight.toFixed(1)}</strong></td>
                  <td class="text-right"><strong>${bill.summary.totalWeightQuintals.toFixed(2)}</strong></td>
                  <td></td>
                  <td class="text-right"><strong>${formatCurrency(bill.summary.basicAmount, language)}</strong></td>
                  <td colspan="4" class="text-right"><strong>Total Charges: +${formatCurrency(bill.summary.totalCharges, language)}</strong></td>
                  <td class="text-right"><strong>${formatCurrency(bill.summary.totalPayable, language)}</strong></td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="summary">
            <h3>Payment Summary</h3>
            <p><strong>Total Lots:</strong> ${bill.summary.totalLots}</p>
            <p><strong>Total Bags:</strong> ${bill.summary.totalBags}</p>
            <p><strong>Total Weight:</strong> ${bill.summary.totalWeightQuintals.toFixed(2)} Quintals</p>
            <p><strong>Gross Amount:</strong> ${formatCurrency(bill.summary.grossAmount, language)}</p>
            <p><strong>Total Deductions:</strong> ${formatCurrency(bill.summary.totalDeductions, language)}</p>
            <p style="font-size: 18px; margin-top: 15px;"><strong>NET PAYABLE: ${formatCurrency(bill.summary.netPayable, language)}</strong></p>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
  };

  const downloadBuyerBill = (bill: BuyerBill) => {
    const content = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Buyer Bill - ${bill.buyerName}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #000; padding-bottom: 20px; }
            .buyer-info { margin-bottom: 20px; background: #f5f5f5; padding: 15px; border-radius: 5px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th, td { border: 1px solid #000; padding: 8px; text-align: left; }
            th { background-color: #f0f0f0; font-weight: bold; }
            .text-right { text-align: right; }
            .summary { background: #f9f9f9; padding: 15px; border-radius: 5px; }
            .total-row { font-weight: bold; background-color: #e0e0e0; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>BUYER PURCHASE BILL</h1>
            <h2>${bill.buyerName}</h2>
            <p>Date: ${formatDate(new Date(bill.date), language)}</p>
          </div>
          
          <div class="buyer-info">
            <h3>Buyer Information</h3>
            <p><strong>Company:</strong> ${bill.buyerName}</p>
            <p><strong>Contact:</strong> ${bill.buyerContact}</p>
            <p><strong>Address:</strong> ${bill.buyerAddress}</p>
          </div>

          <table>
            <thead>
              <tr>
                <th>Lot No.</th>
                <th>Farmer</th>
                <th>Variety</th>
                <th>Grade</th>
                <th>Bags</th>
                <th>Weight (Kg)</th>
                <th>Quintals</th>
                <th>Rate/Qt</th>
                <th>Gross Amt</th>
                <th>Unload</th>
                <th>Packaging</th>
                <th>Weighing</th>
                <th>Commission</th>
                <th>Net Amount</th>
              </tr>
            </thead>
            <tbody>
              ${bill.lots.map(lot => `
                <tr>
                  <td>${lot.lotNumber}</td>
                  <td>${lot.farmerName}</td>
                  <td>${lot.variety}</td>
                  <td>${lot.grade}</td>
                  <td class="text-right">${lot.numberOfBags}</td>
                  <td class="text-right">${lot.totalWeight.toFixed(1)}</td>
                  <td class="text-right">${lot.totalWeightQuintals.toFixed(2)}</td>
                  <td class="text-right">${formatCurrency(lot.pricePerQuintal, language)}</td>
                  <td class="text-right">${formatCurrency(lot.basicAmount, language)}</td>
                  <td class="text-right">+${formatCurrency(lot.charges.unloadHamali, language)}</td>
                  <td class="text-right">+${formatCurrency(lot.charges.packaging, language)}</td>
                  <td class="text-right">+${formatCurrency(lot.charges.weighingFee, language)}</td>
                  <td class="text-right">+${formatCurrency(lot.charges.apmcCommission, language)}</td>
                  <td class="text-right">${formatCurrency(lot.totalAmount, language)}</td>
                </tr>
              `).join('')}
              <tr class="total-row">
                <td colspan="4"><strong>TOTAL</strong></td>
                <td class="text-right"><strong>${bill.summary.totalBags}</strong></td>
                <td class="text-right"><strong>${bill.summary.totalWeight.toFixed(1)}</strong></td>
                <td class="text-right"><strong>${bill.summary.totalWeightQuintals.toFixed(2)}</strong></td>
                <td></td>
                <td class="text-right"><strong>${formatCurrency(bill.summary.basicAmount, language)}</strong></td>
                <td colspan="4" class="text-right"><strong>Total Charges: +${formatCurrency(bill.summary.totalCharges, language)}</strong></td>
                <td class="text-right"><strong>${formatCurrency(bill.summary.totalPayable, language)}</strong></td>
              </tr>
            </tbody>
          </table>

          <div class="summary">
            <h3>Payment Summary</h3>
            <p><strong>Total Lots:</strong> ${bill.summary.totalLots}</p>
            <p><strong>Total Bags:</strong> ${bill.summary.totalBags}</p>
            <p><strong>Total Weight:</strong> ${bill.summary.totalWeightQuintals.toFixed(2)} Quintals</p>
            <p><strong>Gross Amount:</strong> ${formatCurrency(bill.summary.grossAmount, language)}</p>
            <p><strong>Total Deductions:</strong> ${formatCurrency(bill.summary.totalDeductions, language)}</p>
            <p style="font-size: 18px; margin-top: 15px;"><strong>NET PAYABLE: ${formatCurrency(bill.summary.netPayable, language)}</strong></p>
          </div>
        </body>
      </html>
    `;

    const blob = new Blob([content], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `buyer-bill-${bill.buyerName}-${bill.date}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {t("billing.buyerBilling")}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {t("billing.buyerBillingDescription")}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Calendar className="h-5 w-5 text-blue-600" />
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {formatDate(new Date(), language)}
          </span>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>{t("billing.filters")}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="language">Language / भाषा / ಭಾಷೆ</Label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger>
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="hi">हिंदी</SelectItem>
                  <SelectItem value="kn">ಕನ್ನಡ</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">{t("billing.selectDate")}</Label>
              <div className="flex space-x-2">
                <Input
                  id="date"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="flex-1"
                />
                <VoiceInput
                  onResult={(value) => handleVoiceInput("date", value)}
                  placeholder={t("billing.selectDate")}
                  type="text"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="buyer">{t("billing.selectBuyer")}</Label>
              <Select value={selectedBuyerId} onValueChange={setSelectedBuyerId}>
                <SelectTrigger>
                  <SelectValue placeholder={t("billing.selectBuyer")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("billing.allBuyers")}</SelectItem>
                  {buyers.map((buyer: any) => (
                    <SelectItem key={buyer.id} value={buyer.id.toString()}>
                      {buyer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-center pt-4">
            <Button 
              size="lg" 
              className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 text-lg font-semibold"
              onClick={() => {
                // Force refetch of bills - the system will now show working bills
                window.location.reload();
              }}
            >
              <FileText className="h-5 w-5 mr-2" />
              ✓ Generate Bills for {formatDate(new Date(selectedDate), language)}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Individual Buyer Bill */}
      {selectedBuyerId && selectedBuyerId !== "all" && buyerBill && (
        <Card>
          <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl flex items-center space-x-2">
                  <Building className="h-6 w-6" />
                  <span>SALE INVOICE</span>
                </CardTitle>
                <p className="text-blue-100">SELLER: {buyerBill.traderInfo?.name || "Trader"} → BUYER: {buyerBill.buyerName}</p>
                <p className="text-blue-200 text-sm">Date: {formatDate(new Date(buyerBill.date), language)}</p>
              </div>
              <div className="flex space-x-2">
                <Button 
                  variant="secondary" 
                  size="sm"
                  onClick={() => printBuyerBill(buyerBill)}
                >
                  <Printer className="h-4 w-4 mr-2" />
                  {t("common.print")}
                </Button>
                <Button 
                  variant="secondary" 
                  size="sm"
                  onClick={() => downloadBuyerBill(buyerBill)}
                >
                  <Download className="h-4 w-4 mr-2" />
                  {t("common.download")}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {/* Seller/Trader Information - Prominent Header */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:bg-gradient-to-r dark:from-blue-900/30 dark:to-indigo-900/30 p-6 rounded-lg mb-6 border-2 border-blue-300 dark:border-blue-600 shadow-lg">
              <div className="text-center mb-4">
                <div className="bg-blue-600 text-white px-4 py-2 rounded-full inline-block mb-3">
                  <h2 className="text-lg font-bold">
                    SELLER DETAILS
                  </h2>
                </div>
                <h3 className="text-2xl font-bold text-blue-800 dark:text-blue-200 mb-2">
                  {buyerBill.traderInfo?.name || "TRADER NAME"}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-blue-700 dark:text-blue-300">
                  <p><span className="font-semibold">APMC Code:</span> {buyerBill.traderInfo?.apmcCode}</p>
                  <p><span className="font-semibold">Place:</span> {buyerBill.traderInfo?.place}</p>
                  <p className="md:col-span-2"><span className="font-semibold">Address:</span> {buyerBill.traderInfo?.address}</p>
                  <p><span className="font-semibold">Mobile:</span> {buyerBill.traderInfo?.mobile}</p>
                  {buyerBill.traderInfo?.gstNumber && (
                    <p className="font-semibold text-blue-800 dark:text-blue-200">
                      <span>GST:</span> {buyerBill.traderInfo.gstNumber}
                    </p>
                  )}
                </div>
              </div>
              
              {/* Bank Details */}
              {buyerBill.traderInfo?.bankDetails && (
                <div className="border-t border-blue-200 dark:border-blue-700 pt-3">
                  <h4 className="font-semibold text-sm text-blue-800 dark:text-blue-200 mb-2">Bank Details:</h4>
                  <div className="grid grid-cols-2 gap-2 text-xs text-blue-700 dark:text-blue-300">
                    {buyerBill.traderInfo.bankDetails.bankName && (
                      <div>Bank: {buyerBill.traderInfo.bankDetails.bankName}</div>
                    )}
                    {buyerBill.traderInfo.bankDetails.accountNumber && (
                      <div>A/C: {buyerBill.traderInfo.bankDetails.accountNumber}</div>
                    )}
                    {buyerBill.traderInfo.bankDetails.ifscCode && (
                      <div>IFSC: {buyerBill.traderInfo.bankDetails.ifscCode}</div>
                    )}
                    {buyerBill.traderInfo.bankDetails.accountHolderName && (
                      <div>Holder: {buyerBill.traderInfo.bankDetails.accountHolderName}</div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Buyer Information */}
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg mb-6 border-l-4 border-green-500">
              <h3 className="font-semibold mb-3 flex items-center">
                <User className="h-4 w-4 mr-2" />
                BUYER DETAILS (CUSTOMER PURCHASING FROM TRADER)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="flex items-center">
                  <Building className="h-4 w-4 mr-2 text-gray-500" />
                  <span className="font-medium mr-2">Company:</span>
                  <span>{buyerBill.buyerName}</span>
                </div>
                <div className="flex items-center">
                  <Phone className="h-4 w-4 mr-2 text-gray-500" />
                  <span className="font-medium mr-2">Contact:</span>
                  <span>{buyerBill.buyerContact}</span>
                </div>
                <div className="flex items-center col-span-2">
                  <MapPin className="h-4 w-4 mr-2 text-gray-500" />
                  <span className="font-medium mr-2">{t("billing.address")}:</span>
                  <span>{buyerBill.buyerAddress}</span>
                </div>
              </div>
            </div>

            {/* Purchase Details Table */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300 dark:border-gray-600">
                <thead>
                  <tr className="bg-gray-100 dark:bg-gray-700">
                    <th className="border border-gray-300 dark:border-gray-600 p-2 text-left">{t("billing.lotNumber")}</th>
                    <th className="border border-gray-300 dark:border-gray-600 p-2 text-left">{t("billing.farmer")}</th>
                    <th className="border border-gray-300 dark:border-gray-600 p-2 text-left">{t("billing.variety")}</th>
                    <th className="border border-gray-300 dark:border-gray-600 p-2 text-left">{t("billing.grade")}</th>
                    <th className="border border-gray-300 dark:border-gray-600 p-2 text-right">{t("billing.bags")}</th>
                    <th className="border border-gray-300 dark:border-gray-600 p-2 text-right">{t("billing.weight")} (Kg)</th>
                    <th className="border border-gray-300 dark:border-gray-600 p-2 text-right">{t("billing.quintals")}</th>
                    <th className="border border-gray-300 dark:border-gray-600 p-2 text-right">{t("billing.ratePerQuintal")}</th>
                    <th className="border border-gray-300 dark:border-gray-600 p-2 text-right">Basic Amount</th>
                    <th className="border border-gray-300 dark:border-gray-600 p-2 text-right">Hamali</th>
                    <th className="border border-gray-300 dark:border-gray-600 p-2 text-right">Packaging</th>
                    <th className="border border-gray-300 dark:border-gray-600 p-2 text-right">Weighing Fee</th>
                    <th className="border border-gray-300 dark:border-gray-600 p-2 text-right">Commission</th>
                    <th className="border border-gray-300 dark:border-gray-600 p-2 text-right">GST + Cess</th>
                    <th className="border border-gray-300 dark:border-gray-600 p-2 text-right">Total Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {buyerBill.lots.map((lot, index) => (
                    <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="border border-gray-300 dark:border-gray-600 p-2">{lot.lotNumber}</td>
                      <td className="border border-gray-300 dark:border-gray-600 p-2">{lot.farmerName}</td>
                      <td className="border border-gray-300 dark:border-gray-600 p-2">{lot.variety}</td>
                      <td className="border border-gray-300 dark:border-gray-600 p-2">{lot.grade}</td>
                      <td className="border border-gray-300 dark:border-gray-600 p-2 text-right">{lot.numberOfBags}</td>
                      <td className="border border-gray-300 dark:border-gray-600 p-2 text-right">{lot.totalWeight.toFixed(1)}</td>
                      <td className="border border-gray-300 dark:border-gray-600 p-2 text-right">{lot.totalWeightQuintals.toFixed(2)}</td>
                      <td className="border border-gray-300 dark:border-gray-600 p-2 text-right">{formatCurrency(lot.pricePerQuintal, language)}</td>
                      <td className="border border-gray-300 dark:border-gray-600 p-2 text-right">{formatCurrency(lot.basicAmount, language)}</td>
                      <td className="border border-gray-300 dark:border-gray-600 p-2 text-right">+{formatCurrency(lot.charges.unloadHamali, language)}</td>
                      <td className="border border-gray-300 dark:border-gray-600 p-2 text-right">+{formatCurrency(lot.charges.packaging, language)}</td>
                      <td className="border border-gray-300 dark:border-gray-600 p-2 text-right">+{formatCurrency(lot.charges.weighingFee, language)}</td>
                      <td className="border border-gray-300 dark:border-gray-600 p-2 text-right">+{formatCurrency(lot.charges.apmcCommission, language)}</td>
                      <td className="border border-gray-300 dark:border-gray-600 p-2 text-right">+{formatCurrency(lot.charges.sgst + lot.charges.cgst + lot.charges.cess, language)}</td>
                      <td className="border border-gray-300 dark:border-gray-600 p-2 text-right font-semibold">{formatCurrency(lot.totalAmount, language)}</td>
                    </tr>
                  ))}
                  <tr className="bg-gray-100 dark:bg-gray-700 font-bold">
                    <td className="border border-gray-300 dark:border-gray-600 p-2" colSpan={4}>
                      {t("billing.total")}
                    </td>
                    <td className="border border-gray-300 dark:border-gray-600 p-2 text-right">{buyerBill.summary.totalBags}</td>
                    <td className="border border-gray-300 dark:border-gray-600 p-2 text-right">{buyerBill.summary.totalWeight.toFixed(1)}</td>
                    <td className="border border-gray-300 dark:border-gray-600 p-2 text-right">{buyerBill.summary.totalWeightQuintals.toFixed(2)}</td>
                    <td className="border border-gray-300 dark:border-gray-600 p-2"></td>
                    <td className="border border-gray-300 dark:border-gray-600 p-2 text-right">{formatCurrency(buyerBill.summary.basicAmount, language)}</td>
                    <td className="border border-gray-300 dark:border-gray-600 p-2 text-right" colSpan={5}>
                      Total Charges: {formatCurrency(buyerBill.summary.totalCharges, language)}
                    </td>
                    <td className="border border-gray-300 dark:border-gray-600 p-2 text-right text-lg">
                      {formatCurrency(buyerBill.summary.totalPayable, language)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Summary */}
            <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
              <h3 className="font-semibold mb-3">{t("billing.paymentSummary")}</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="font-medium">{t("billing.totalLots")}:</span>
                  <span className="ml-1">{buyerBill.summary.totalLots}</span>
                </div>
                <div>
                  <span className="font-medium">{t("billing.totalBags")}:</span>
                  <span className="ml-1">{buyerBill.summary.totalBags}</span>
                </div>
                <div>
                  <span className="font-medium">{t("billing.totalWeight")}:</span>
                  <span className="ml-1">{buyerBill.summary.totalWeightQuintals.toFixed(2)} Qt</span>
                </div>
                <div>
                  <span className="font-medium">{t("billing.grossAmount")}:</span>
                  <span className="ml-1">{formatCurrency(buyerBill.summary.grossAmount, language)}</span>
                </div>
              </div>
              
              {/* Tax Details Section */}
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <h4 className="font-semibold text-sm mb-3 text-gray-700 dark:text-gray-300">Tax Details:</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex justify-between">
                    <span>SGST (9%):</span>
                    <span>{formatCurrency(buyerBill.summary.taxDetails.sgst, language)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>CGST (9%):</span>
                    <span>{formatCurrency(buyerBill.summary.taxDetails.cgst, language)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>CESS (1%):</span>
                    <span>{formatCurrency(buyerBill.summary.taxDetails.cess, language)}</span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span>Total Tax:</span>
                    <span>{formatCurrency(buyerBill.summary.taxDetails.totalTax, language)}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-blue-200 dark:border-blue-700">
                <div className="flex justify-between items-center text-lg font-bold">
                  <span>Net Payable:</span>
                  <span className="text-blue-600 dark:text-blue-400">
                    {formatCurrency(buyerBill.summary.netPayable, language)}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Daily Bills Summary */}
      {(!selectedBuyerId || selectedBuyerId === "all") && Array.isArray(dailyBills) && dailyBills.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t("billing.dailyBuyerBills")} - {formatDate(new Date(selectedDate), language)}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              {dailyBills.map((bill: BuyerBill) => (
                <div key={bill.buyerId} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-lg">{bill.buyerName}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {bill.summary.totalLots} {t("billing.lots")} • {bill.summary.totalBags} {t("billing.bags")} • 
                        {bill.summary.totalWeightQuintals.toFixed(2)} Qt
                      </p>
                      <p className="text-lg font-bold text-green-600">
                        {t("billing.netPayable")}: {formatCurrency(bill.summary.netPayable, language)}
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setSelectedBuyerId(bill.buyerId.toString())}
                      >
                        {t("common.view")}
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => printBuyerBill(bill)}
                      >
                        <Printer className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => downloadBuyerBill(bill)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bills Display - Show data directly */}
      {!selectedBuyerId && (
        <Card>
          <CardHeader>
            <CardTitle>Daily Buyer Bills - {formatDate(new Date(selectedDate), language)}</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingDaily ? (
              <div className="text-center py-8">
                <p>Loading bills...</p>
              </div>
            ) : (
              <div>
                {Array.isArray(dailyBills) && dailyBills.length > 0 ? (
                  <div className="space-y-4">
                    {dailyBills.map((bill: any, index: number) => (
                      <div key={index} className="border rounded-lg p-4 bg-white dark:bg-gray-900 shadow-sm">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="text-lg font-semibold text-blue-600">{bill.buyerName}</h3>
                            <div className="text-sm text-gray-600 space-y-1 mt-2">
                              <p>Contact: {bill.buyerContact}</p>
                              <p>Lots: {bill.summary?.totalLots} • Bags: {bill.summary?.totalBags}</p>
                              <p>Weight: {bill.summary?.totalWeightQuintals?.toFixed(2)} Quintals</p>
                            </div>
                            <div className="mt-3">
                              <p className="text-lg">
                                <span className="text-gray-600">Gross: </span>
                                <span className="font-semibold">{formatCurrency(bill.summary?.grossAmount || 0, language)}</span>
                              </p>
                              <p className="text-lg">
                                <span className="text-red-600">Deductions: </span>
                                <span className="font-semibold">-{formatCurrency(bill.summary?.totalDeductions || 0, language)}</span>
                              </p>
                              <p className="text-xl font-bold text-green-600 border-t pt-2">
                                Net Payable: {formatCurrency(bill.summary?.netPayable || 0, language)}
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-col space-y-2">
                            <Button 
                              onClick={() => printBuyerBill(bill)}
                              className="bg-blue-600 hover:bg-blue-700"
                            >
                              <Printer className="h-4 w-4 mr-2" />
                              Print Bill
                            </Button>
                            <Button 
                              variant="outline"
                              onClick={() => setSelectedBuyerId(bill.buyerId.toString())}
                            >
                              View Details
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      No bills found for this date
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      Click the Generate Bills button to create bills for your buyers
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}