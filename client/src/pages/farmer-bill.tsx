import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/use-auth";
import { VoiceInput } from "@/components/voice-input";
import { Download, FileText } from "lucide-react";

interface Lot {
  id: number;
  lotNumber: string;
  farmerId: number;
  numberOfBags: number;
  pricePerQuintal: number;
  totalWeight: number;
  status: string;
  farmer: {
    id: number;
    name: string;
    place: string;
    mobile: string;
    bankAccountNumber: string;
  };
}

interface Tenant {
  id: number;
  name: string;
  gstNumber: string;
  hsnCode: string;
  mobileNumber: string;
}

interface FarmerBillData {
  hamali: number;
  vehicleRent: number;
  emptyBagCharges: number;
  advance: number;
  commission: number;
  other: number;
}

export default function FarmerBill() {
  const { user } = useAuth();
  const [selectedFarmerId, setSelectedFarmerId] = useState<string>("");
  const [pattiNumber, setPattiNumber] = useState("");
  const [billData, setBillData] = useState<FarmerBillData>({
    hamali: 0,
    vehicleRent: 0,
    emptyBagCharges: 0,
    advance: 0,
    commission: 0,
    other: 0
  });

  const { data: lots } = useQuery({
    queryKey: ["/api/lots"],
    enabled: !!user?.tenantId,
  });

  const { data: tenant } = useQuery({
    queryKey: [`/api/tenants/${user?.tenantId}`],
    enabled: !!user?.tenantId,
  });

  // Get all completed lots for the selected farmer
  const farmerLots = lots?.filter((lot: Lot) => 
    lot.farmerId.toString() === selectedFarmerId && lot.status === 'completed'
  ) || [];

  const selectedFarmer = farmerLots.length > 0 ? farmerLots[0].farmer : null;

  // Calculate totals across all farmer's completed lots
  const totalAmount = farmerLots.reduce((sum, lot) => {
    return sum + ((lot.totalWeight / 100) * lot.pricePerQuintal);
  }, 0);
  
  const totalBags = farmerLots.reduce((sum, lot) => sum + lot.numberOfBags, 0);
  const totalWeight = farmerLots.reduce((sum, lot) => sum + lot.totalWeight, 0);
  
  const commission = totalAmount * 0.03; // 3% commission
  const totalDeductions = billData.hamali + billData.vehicleRent + billData.emptyBagCharges + 
                         billData.advance + commission + billData.other;
  const netPayable = totalAmount - totalDeductions;

  // Update commission when total amount changes
  useEffect(() => {
    setBillData(prev => ({ ...prev, commission: totalAmount * 0.03 }));
  }, [totalAmount]);

  const handleInputChange = (field: keyof FarmerBillData, value: string | number) => {
    const numValue = typeof value === 'string' ? parseFloat(value) || 0 : value;
    setBillData(prev => ({ ...prev, [field]: numValue }));
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const generatePDF = () => {
    if (!selectedFarmer || !tenant || farmerLots.length === 0) return;

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Farmer Bill - ${selectedFarmer.name}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; font-size: 12px; line-height: 1.4; }
            .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px; }
            .header h1 { margin: 0; font-size: 18px; font-weight: bold; }
            .header h2 { margin: 5px 0; font-size: 14px; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 15px; }
            .info-section { border: 1px solid #ccc; padding: 10px; }
            .info-section h3 { margin: 0 0 10px 0; font-size: 14px; font-weight: bold; background: #f5f5f5; padding: 5px; text-align: center; }
            .info-row { display: flex; margin-bottom: 5px; }
            .info-label { font-weight: bold; width: 120px; }
            .lots-table { width: 100%; border-collapse: collapse; margin: 15px 0; }
            .lots-table th, .lots-table td { border: 1px solid #000; padding: 8px; text-align: left; font-size: 11px; }
            .lots-table th { background-color: #f0f0f0; font-weight: bold; text-align: center; }
            .calc-section { margin: 15px 0; }
            .calc-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
            .calc-box { border: 1px solid #000; padding: 10px; }
            .calc-box h3 { margin: 0 0 10px 0; font-size: 14px; font-weight: bold; text-align: center; background: #f5f5f5; padding: 5px; }
            .calc-row { display: flex; justify-content: space-between; margin-bottom: 5px; padding: 2px 0; }
            .calc-row.total { border-top: 2px solid #000; font-weight: bold; font-size: 13px; margin-top: 10px; padding-top: 5px; }
            .net-amount { text-align: center; margin: 20px 0; padding: 15px; border: 2px solid #000; background: #f9f9f9; }
            .net-amount h2 { margin: 0; font-size: 16px; }
            .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 30px; }
            .signature-box { text-align: center; border-top: 1px solid #000; padding-top: 10px; }
            @media print {
              body { margin: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${tenant.name} / ${tenant.name}</h1>
            <h2>Farmer Payment Bill / ರೈತ ಪಾವತಿ ಬಿಲ್</h2>
            <div>Date / ದಿನಾಂಕ: ${new Date().toLocaleDateString('en-IN')} | Patti No / ಪಟ್ಟಿ ಸಂ: ${pattiNumber}</div>
          </div>

          <div class="info-grid">
            <div class="info-section">
              <h3>Farmer Details / ರೈತ ವಿವರಗಳು</h3>
              <div class="info-row">
                <span class="info-label">Name / ಹೆಸರು:</span>
                <span>${selectedFarmer.name}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Mobile / ಮೊಬೈಲ್:</span>
                <span>${selectedFarmer.mobile}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Place / ಸ್ಥಳ:</span>
                <span>${selectedFarmer.place}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Account / ಖಾತೆ:</span>
                <span>${selectedFarmer.bankAccountNumber}</span>
              </div>
            </div>
            
            <div class="info-section">
              <h3>Trader Details / ವ್ಯಾಪಾರಿ ವಿವರಗಳು</h3>
              <div class="info-row">
                <span class="info-label">Name / ಹೆಸರು:</span>
                <span>${tenant.name}</span>
              </div>
              <div class="info-row">
                <span class="info-label">GST / ಜಿಎಸ್ಟಿ:</span>
                <span>${tenant.gstNumber}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Mobile / ಮೊಬೈಲ್:</span>
                <span>${tenant.mobileNumber}</span>
              </div>
            </div>
          </div>

          <table class="lots-table">
            <thead>
              <tr>
                <th>Lot No / ಲಾಟ್ ಸಂ</th>
                <th>Bags / ಚೀಲಗಳು</th>
                <th>Weight (kg) / ತೂಕ</th>
                <th>Price/Quintal / ದರ</th>
                <th>Amount / ಮೊತ್ತ</th>
              </tr>
            </thead>
            <tbody>
              ${farmerLots.map(lot => `
                <tr>
                  <td>${lot.lotNumber}</td>
                  <td>${lot.numberOfBags}</td>
                  <td>${lot.totalWeight.toFixed(1)}</td>
                  <td>${formatCurrency(lot.pricePerQuintal)}</td>
                  <td>${formatCurrency((lot.totalWeight / 100) * lot.pricePerQuintal)}</td>
                </tr>
              `).join('')}
              <tr style="background-color: #f0f0f0; font-weight: bold;">
                <td>Total / ಒಟ್ಟು</td>
                <td>${totalBags}</td>
                <td>${totalWeight.toFixed(1)}</td>
                <td>-</td>
                <td>${formatCurrency(totalAmount)}</td>
              </tr>
            </tbody>
          </table>

          <div class="calc-section">
            <div class="calc-grid">
              <div class="calc-box">
                <h3>Deductions / ಕಳೆದುಕೊಳ್ಳುವ ಮೊತ್ತಗಳು</h3>
                <div class="calc-row">
                  <span>Hamali / ಹಮಾಲಿ:</span>
                  <span>${formatCurrency(billData.hamali)}</span>
                </div>
                <div class="calc-row">
                  <span>Vehicle Rent / ವಾಹನ ಬಾಡಿಗೆ:</span>
                  <span>${formatCurrency(billData.vehicleRent)}</span>
                </div>
                <div class="calc-row">
                  <span>Empty Bags / ಖಾಲಿ ಚೀಲಗಳು:</span>
                  <span>${formatCurrency(billData.emptyBagCharges)}</span>
                </div>
                <div class="calc-row">
                  <span>Advance / ಮುಂಗಡ:</span>
                  <span>${formatCurrency(billData.advance)}</span>
                </div>
                <div class="calc-row">
                  <span>Commission (3%) / ಕಮಿಷನ್:</span>
                  <span>${formatCurrency(commission)}</span>
                </div>
                <div class="calc-row">
                  <span>Other / ಇತರೆ:</span>
                  <span>${formatCurrency(billData.other)}</span>
                </div>
                <div class="calc-row total">
                  <span>Total Deductions / ಒಟ್ಟು ಕಳೆತ:</span>
                  <span>${formatCurrency(totalDeductions)}</span>
                </div>
              </div>

              <div class="calc-box">
                <h3>Summary / ಸಾರಾಂಶ</h3>
                <div class="calc-row">
                  <span>Total Lots / ಒಟ್ಟು ಲಾಟ್‌ಗಳು:</span>
                  <span>${farmerLots.length}</span>
                </div>
                <div class="calc-row">
                  <span>Total Bags / ಒಟ್ಟು ಚೀಲಗಳು:</span>
                  <span>${totalBags}</span>
                </div>
                <div class="calc-row">
                  <span>Total Weight / ಒಟ್ಟು ತೂಕ:</span>
                  <span>${totalWeight.toFixed(1)} kg</span>
                </div>
                <div class="calc-row">
                  <span>Gross Amount / ಒಟ್ಟು ಮೊತ್ತ:</span>
                  <span>${formatCurrency(totalAmount)}</span>
                </div>
                <div class="calc-row">
                  <span>Total Deductions / ಒಟ್ಟು ಕಳೆತ:</span>
                  <span>${formatCurrency(totalDeductions)}</span>
                </div>
              </div>
            </div>
          </div>

          <div class="net-amount">
            <h2>Net Payable to Farmer / ರೈತನಿಗೆ ನೀಡಬೇಕಾದ ನಿವ್ವಳ ಮೊತ್ತ: ${formatCurrency(netPayable)}</h2>
          </div>

          <div class="signatures">
            <div class="signature-box">
              <div>Farmer Signature / ರೈತ ಸಹಿ</div>
              <div style="margin-top: 10px;">${selectedFarmer.name}</div>
            </div>
            <div class="signature-box">
              <div>Authorized Signature / ಅಧಿಕೃತ ಸಹಿ</div>
              <div style="margin-top: 10px;">${tenant.name}</div>
            </div>
          </div>
        </body>
      </html>
    `;

    // Create and download the HTML file
    const blob = new Blob([printContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `farmer-bill-${selectedFarmer.name}-${new Date().toISOString().split('T')[0]}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Get unique farmers with completed lots
  const completedLots = lots?.filter((lot: Lot) => lot.status === 'completed') || [];
  const uniqueFarmers = Array.from(
    new Map(
      completedLots.map((lot: Lot) => [lot.farmerId, lot])
    ).values()
  );

  // Don't auto-select farmer - let user choose

  // Manual selection for SHIVAPPA
  const selectShivappa = () => {
    if (uniqueFarmers.length > 0) {
      const shivappaLot = uniqueFarmers.find(lot => lot.farmer.name === 'SHIVAPPA');
      if (shivappaLot) {
        console.log('Manually selecting SHIVAPPA:', shivappaLot.farmerId);
        setSelectedFarmerId(shivappaLot.farmerId.toString());
      }
    }
  };

  // Debug: Show what lots we have
  console.log('All lots:', lots);
  console.log('Completed lots:', completedLots);
  console.log('Unique farmers with completed lots:', uniqueFarmers);
  console.log('Selected farmer ID:', selectedFarmerId);
  console.log('Farmer lots for selected farmer:', farmerLots);
  console.log('Selected farmer object:', selectedFarmer);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Farmer Bill / ರೈತ ಬಿಲ್</h1>
          <p className="text-gray-600 mt-2">Generate consolidated farmer payment bills for ALL completed lots / ಎಲ್ಲಾ ಪೂರ್ಣಗೊಂಡ ಲಾಟ್‌ಗಳಿಗೆ ಏಕೀಕೃತ ರೈತ ಪಾವತಿ ಬಿಲ್‌ಗಳನ್ನು ರಚಿಸಿ</p>
          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800 font-medium">
              📊 Status: {lots ? `${lots.length} total lots, ${completedLots.length} completed, ${uniqueFarmers.length} farmers ready for billing` : 'Loading...'}
            </p>
            {uniqueFarmers.length > 0 && (
              <p className="text-sm text-green-600 font-medium mt-1">
                ✅ Ready to generate bills! Select farmer and scroll down to see the billing form.
              </p>
            )}
          </div>
          {farmerLots.length > 1 && (
            <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-800 font-medium">
                ✓ Multi-lot billing: This farmer has {farmerLots.length} completed lots that will be included in one consolidated bill
              </p>
            </div>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Today's Farmers with Completed Lots / ಇಂದಿನ ಪೂರ್ಣಗೊಂಡ ಲಾಟ್‌ಗಳ ರೈತರು</CardTitle>
          <p className="text-sm text-gray-600">Select a farmer to generate their payment bill / ಪಾವತಿ ಬಿಲ್ ರಚಿಸಲು ರೈತ ಆಯ್ಕೆ ಮಾಡಿ</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {!lots ? (
            <div className="text-center py-4">
              <p className="text-gray-500">Loading lots data...</p>
            </div>
          ) : lots.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-2">No lots found</p>
              <p className="text-sm text-gray-400">Create some lots first to generate farmer bills</p>
            </div>
          ) : uniqueFarmers.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-2">No completed lots found for today</p>
              <p className="text-sm text-gray-400">Complete some lots with bag weights and prices to generate farmer bills</p>
              <p className="text-xs text-gray-400 mt-2">
                Total lots: {lots.length} | Active lots: {lots.filter((lot: any) => lot.status === 'active').length} | Completed lots: {lots.filter((lot: any) => lot.status === 'completed').length}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {uniqueFarmers.map((lot: Lot) => (
                <Card 
                  key={lot.farmerId} 
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    selectedFarmerId === lot.farmerId.toString() 
                      ? 'ring-2 ring-blue-500 bg-blue-50' 
                      : 'hover:bg-gray-50'
                  }`}
                  onClick={() => setSelectedFarmerId(lot.farmerId.toString())}
                >
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      <h3 className="font-semibold text-lg">{lot.farmer.name}</h3>
                      <p className="text-sm text-gray-600">{lot.farmer.place}</p>
                      <p className="text-sm text-gray-600">Mobile: {lot.farmer.mobile}</p>
                      <div className="mt-3 pt-3 border-t">
                        <p className="text-xs text-gray-500">
                          {farmerLots.filter(l => l.farmerId === lot.farmerId).length} completed lot(s)
                        </p>
                        <p className="text-xs text-green-600 font-medium">
                          Ready for billing
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedFarmer && tenant && farmerLots.length > 0 && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Enter Patti Number / ಪಟ್ಟಿ ಸಂಖ್ಯೆ ನಮೂದಿಸಿ</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="patti-number">Patti Number / ಪಟ್ಟಿ ಸಂಖ್ಯೆ</Label>
                <div className="flex gap-2">
                  <VoiceInput
                    onResult={setPattiNumber}
                    placeholder="Enter patti number (e.g., P001, P002) / ಪಟ್ಟಿ ಸಂಖ್ಯೆ ನಮೂದಿಸಿ"
                    type="text"
                    value={pattiNumber}
                    onChange={(e) => setPattiNumber(e.target.value)}
                    className="flex-1"
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                      const today = new Date();
                      const dateStr = today.toISOString().slice(2, 10).replace(/-/g, "");
                      const timeStr = today.getHours().toString().padStart(2, "0") + 
                                     today.getMinutes().toString().padStart(2, "0");
                      setPattiNumber(`P${dateStr}${timeStr}`);
                    }}
                    className="whitespace-nowrap"
                  >
                    Generate / ರಚನೆ
                  </Button>
                </div>
                <p className="text-xs text-gray-500">
                  Patti number is used to group farmer bills / ಪಟ್ಟಿ ಸಂಖ್ಯೆಯನ್ನು ರೈತರ ಬಿಲ್‌ಗಳನ್ನು ಗುಂಪುಗೂಡಿಸಲು ಬಳಸಲಾಗುತ್ತದೆ
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Farmer's Completed Lots / ರೈತನ ಪೂರ್ಣಗೊಂಡ ಲಾಟ್‌ಗಳು</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border border-gray-300 p-2 text-left">Lot No / ಲಾಟ್ ಸಂ</th>
                      <th className="border border-gray-300 p-2 text-left">Bags / ಚೀಲಗಳು</th>
                      <th className="border border-gray-300 p-2 text-left">Weight (kg) / ತೂಕ</th>
                      <th className="border border-gray-300 p-2 text-left">Price/Quintal / ದರ</th>
                      <th className="border border-gray-300 p-2 text-left">Amount / ಮೊತ್ತ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {farmerLots.map((lot) => (
                      <tr key={lot.id}>
                        <td className="border border-gray-300 p-2">{lot.lotNumber}</td>
                        <td className="border border-gray-300 p-2">{lot.numberOfBags}</td>
                        <td className="border border-gray-300 p-2">{lot.totalWeight.toFixed(1)}</td>
                        <td className="border border-gray-300 p-2">{formatCurrency(lot.pricePerQuintal)}</td>
                        <td className="border border-gray-300 p-2">{formatCurrency((lot.totalWeight / 100) * lot.pricePerQuintal)}</td>
                      </tr>
                    ))}
                    <tr className="bg-yellow-50 font-semibold">
                      <td className="border border-gray-300 p-2">Total / ಒಟ್ಟು</td>
                      <td className="border border-gray-300 p-2">{totalBags}</td>
                      <td className="border border-gray-300 p-2">{totalWeight.toFixed(1)}</td>
                      <td className="border border-gray-300 p-2">-</td>
                      <td className="border border-gray-300 p-2">{formatCurrency(totalAmount)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Deductions / ಕಳೆದುಕೊಳ್ಳುವ ಮೊತ್ತಗಳು</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="hamali">Hamali / ಹಮಾಲಿ</Label>
                  <VoiceInput
                    onResult={(value) => handleInputChange('hamali', value)}
                    placeholder="0"
                    type="currency"
                    value={billData.hamali.toString()}
                    onChange={(e) => handleInputChange('hamali', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vehicle-rent">Vehicle Rent / ವಾಹನ ಬಾಡಿಗೆ</Label>
                  <VoiceInput
                    onResult={(value) => handleInputChange('vehicleRent', value)}
                    placeholder="0"
                    type="currency"
                    value={billData.vehicleRent.toString()}
                    onChange={(e) => handleInputChange('vehicleRent', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="empty-bags">Empty Bag Charges / ಖಾಲಿ ಚೀಲಗಳು</Label>
                  <VoiceInput
                    onResult={(value) => handleInputChange('emptyBagCharges', value)}
                    placeholder="0"
                    type="currency"
                    value={billData.emptyBagCharges.toString()}
                    onChange={(e) => handleInputChange('emptyBagCharges', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="advance">Advance / ಮೊದಲು ನೀಡಿದ ಮೊತ್ತ</Label>
                  <VoiceInput
                    onResult={(value) => handleInputChange('advance', value)}
                    placeholder="0"
                    type="currency"
                    value={billData.advance.toString()}
                    onChange={(e) => handleInputChange('advance', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="commission">Commission (3%) / ಕಮಿಷನ್</Label>
                  <div className="p-2 bg-yellow-50 rounded font-semibold text-yellow-700">
                    {formatCurrency(commission)}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="other">Other / ಇತರೆ</Label>
                  <VoiceInput
                    onResult={(value) => handleInputChange('other', value)}
                    placeholder="0"
                    type="currency"
                    value={billData.other.toString()}
                    onChange={(e) => handleInputChange('other', e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Bill Summary / ಬಿಲ್ ಸಾರಾಂಶ</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>Total Lots / ಒಟ್ಟು ಲಾಟ್‌ಗಳು:</span>
                    <span className="font-semibold">{farmerLots.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Bags / ಒಟ್ಟು ಚೀಲಗಳು:</span>
                    <span className="font-semibold">{totalBags}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Weight / ಒಟ್ಟು ತೂಕ:</span>
                    <span className="font-semibold">{totalWeight.toFixed(1)} kg</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-lg font-semibold">
                    <span>Gross Amount / ಒಟ್ಟು ಮೊತ್ತ:</span>
                    <span className="text-green-600">{formatCurrency(totalAmount)}</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>Total Deductions / ಒಟ್ಟು ಕಳೆತ:</span>
                    <span className="font-semibold text-red-600">{formatCurrency(totalDeductions)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-xl font-bold">
                    <span>Net Payable / ನಿವ್ವಳ ಪಾವತಿ:</span>
                    <span className="text-blue-600">{formatCurrency(netPayable)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Generate Bill / ಬಿಲ್ ರಚಿಸಿ</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <Button 
                  onClick={generatePDF}
                  className="flex items-center gap-2"
                  size="lg"
                >
                  <Download className="h-4 w-4" />
                  Download Bill / ಬಿಲ್ ಡೌನ್‌ಲೋಡ್ ಮಾಡಿ
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}