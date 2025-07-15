import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Download } from "lucide-react";
import { VoiceInput } from "@/components/VoiceInput";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";

interface FarmerBillData {
  hamali: number;
  vehicleRent: number;
  emptyBagCharges: number;
  advance: number;
  other: number;
  rok: number;
}

export default function FarmerBillNew() {
  const { user } = useAuth();
  const [selectedFarmerId, setSelectedFarmerId] = useState<string>("");
  const [pattiNumber, setPattiNumber] = useState<string>("");
  const [billData, setBillData] = useState<FarmerBillData>({
    hamali: 0,
    vehicleRent: 0,
    emptyBagCharges: 0,
    advance: 0,
    other: 0,
    rok: 0,
  });

  const { data: lots } = useQuery({
    queryKey: ["/api/lots"],
    enabled: !!user?.tenantId,
  });

  const { data: tenant } = useQuery({
    queryKey: ["/api/tenant"],
    enabled: !!user?.tenantId,
  });

  // Get completed lots only
  const completedLots = lots?.filter((lot: any) => lot.status === 'completed') || [];
  
  // Get unique farmers with completed lots
  const uniqueFarmers = Array.from(
    new Map(completedLots.map((lot: any) => [lot.farmerId, lot])).values()
  );

  // Get lots for selected farmer
  const farmerLots = selectedFarmerId ? 
    completedLots.filter((lot: any) => lot.farmerId.toString() === selectedFarmerId) : [];

  const selectedFarmer = farmerLots.length > 0 ? farmerLots[0].farmer : null;

  // Calculate totals
  const totalAmount = farmerLots.reduce((sum: number, lot: any) => {
    return sum + ((lot.totalWeight / 100) * lot.pricePerQuintal);
  }, 0);
  
  const totalBags = farmerLots.reduce((sum: number, lot: any) => sum + lot.numberOfBags, 0);
  const totalWeight = farmerLots.reduce((sum: number, lot: any) => sum + lot.totalWeight, 0);
  
  const rok = totalAmount * 0.03; // 3% commission
  const totalDeductions = billData.hamali + billData.vehicleRent + billData.emptyBagCharges + 
                         billData.advance + rok + billData.other;
  const netPayable = totalAmount - totalDeductions;

  // Update commission when total amount changes
  useEffect(() => {
    setBillData(prev => ({ ...prev, rok: totalAmount * 0.03 }));
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
    if (!selectedFarmer || farmerLots.length === 0) return;

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Farmer Bill - ${selectedFarmer.name}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; font-size: 14px; line-height: 1.4; }
            .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px; }
            .header h1 { margin: 0; font-size: 20px; font-weight: bold; }
            .section { margin: 15px 0; }
            .farmer-info { margin: 15px 0; }
            .lot-table { width: 100%; border-collapse: collapse; margin: 15px 0; }
            .lot-table th, .lot-table td { border: 1px solid #000; padding: 8px; text-align: left; }
            .lot-table th { background-color: #f0f0f0; font-weight: bold; }
            .summary { margin: 20px 0; }
            .total-row { font-weight: bold; background-color: #f9f9f9; }
            .signature { margin-top: 40px; display: flex; justify-content: space-between; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${tenant?.name || 'APMC TRADER'}</h1>
            <p><strong>FARMER PAYMENT BILL / ರೈತ ಪಾವತಿ ಬಿಲ್</strong></p>
            <p>Date: ${new Date().toLocaleDateString('en-IN')} | Patti No: ${pattiNumber}</p>
          </div>
          
          <div class="farmer-info">
            <h3>Farmer Details / ರೈತ ವಿವರಗಳು</h3>
            <p><strong>Name / ಹೆಸರು:</strong> ${selectedFarmer.name}</p>
            <p><strong>Mobile / ಮೊಬೈಲ್:</strong> ${selectedFarmer.mobile}</p>
            <p><strong>Place / ಸ್ಥಳ:</strong> ${selectedFarmer.place}</p>
            <p><strong>Bank / ಬ್ಯಾಂಕ್:</strong> ${selectedFarmer.bankName} - ${selectedFarmer.bankAccountNumber}</p>
          </div>

          <table class="lot-table">
            <thead>
              <tr>
                <th>Lot No / ಲಾಟ್ ಸಂ</th>
                <th>Bags / ಚೀಲಗಳು</th>
                <th>Weight (kg) / ತೂಕ</th>
                <th>Rate/Quintal / ದರ</th>
                <th>Amount / ಮೊತ್ತ</th>
              </tr>
            </thead>
            <tbody>
              ${farmerLots.map((lot: any) => `
                <tr>
                  <td>${lot.lotNumber}</td>
                  <td>${lot.numberOfBags}</td>
                  <td>${lot.totalWeight.toFixed(1)}</td>
                  <td>${formatCurrency(lot.pricePerQuintal)}</td>
                  <td>${formatCurrency((lot.totalWeight / 100) * lot.pricePerQuintal)}</td>
                </tr>
              `).join('')}
              <tr class="total-row">
                <td><strong>Total / ಒಟ್ಟು</strong></td>
                <td><strong>${totalBags}</strong></td>
                <td><strong>${totalWeight.toFixed(1)}</strong></td>
                <td>-</td>
                <td><strong>${formatCurrency(totalAmount)}</strong></td>
              </tr>
            </tbody>
          </table>

          <div class="summary">
            <h3>Payment Summary / ಪಾವತಿ ಸಾರಾಂಶ</h3>
            <table class="lot-table">
              <tr><td>Gross Amount / ಒಟ್ಟು ಮೊತ್ತ</td><td>${formatCurrency(totalAmount)}</td></tr>
              <tr><td>Less: Hamali / ಕಡಿಮೆ: ಹಮಾಲಿ</td><td>-${formatCurrency(billData.hamali)}</td></tr>
              <tr><td>Less: Vehicle Rent / ಕಡಿಮೆ: ವಾಹನ ಬಾಡಿಗೆ</td><td>-${formatCurrency(billData.vehicleRent)}</td></tr>
              <tr><td>Less: Empty Bags / ಕಡಿಮೆ: ಖಾಲಿ ಚೀಲಗಳು</td><td>-${formatCurrency(billData.emptyBagCharges)}</td></tr>
              <tr><td>Less: Advance / ಕಡಿಮೆ: ಮೊದಲು ನೀಡಿದ ಮೊತ್ತ</td><td>-${formatCurrency(billData.advance)}</td></tr>
              <tr><td>Less: Rok (3%) / ಕಡಿಮೆ: ರೋಕ್</td><td>-${formatCurrency(rok)}</td></tr>
              <tr><td>Less: Other / ಕಡಿಮೆ: ಇತರೆ</td><td>-${formatCurrency(billData.other)}</td></tr>
              <tr class="total-row"><td><strong>Net Payable / ನಿವ್ವಳ ಪಾವತಿ</strong></td><td><strong>${formatCurrency(netPayable)}</strong></td></tr>
            </table>
          </div>

          <div class="signature">
            <div>
              <p>_____________________</p>
              <p>Trader Signature / ವ್ಯಾಪಾರಿ ಸಹಿ</p>
            </div>
            <div>
              <p>_____________________</p>
              <p>Date / ದಿನಾಂಕ</p>
            </div>
          </div>
        </body>
      </html>
    `;

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

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Farmer Bill / ರೈತ ಬಿಲ್</h1>
          <p className="text-gray-600 mt-2">Generate farmer payment bills / ರೈತ ಪಾವತಿ ಬಿಲ್‌ಗಳನ್ನು ರಚಿಸಿ</p>
          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              Status: {uniqueFarmers.length} farmers with completed lots ready for billing
            </p>
          </div>
        </div>
      </div>

      {/* Farmer Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Farmer / ರೈತ ಆಯ್ಕೆ ಮಾಡಿ</CardTitle>
        </CardHeader>
        <CardContent>
          {uniqueFarmers.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No completed lots found for billing</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {uniqueFarmers.map((lot: any) => (
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
                    <h3 className="font-semibold text-lg">{lot.farmer.name}</h3>
                    <p className="text-sm text-gray-600">{lot.farmer.place}</p>
                    <p className="text-sm text-gray-600">Mobile: {lot.farmer.mobile}</p>
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-xs text-green-600 font-medium">
                        {farmerLots.filter((l: any) => l.farmerId === lot.farmerId).length} completed lot(s)
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Billing Form - Shows when farmer is selected */}
      {selectedFarmer && farmerLots.length > 0 && (
        <>
          {/* Patti Number */}
          <Card>
            <CardHeader>
              <CardTitle>Patti Number / ಪಟ್ಟಿ ಸಂಖ್ಯೆ</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <VoiceInput
                  onResult={setPattiNumber}
                  placeholder="Enter patti number / ಪಟ್ಟಿ ಸಂಖ್ಯೆ ನಮೂದಿಸಿ"
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
                >
                  Auto Generate
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Farmer's Lots */}
          <Card>
            <CardHeader>
              <CardTitle>Farmer's Completed Lots / ರೈತನ ಪೂರ್ಣಗೊಂಡ ಲಾಟ್‌ಗಳು</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border border-gray-300 p-2 text-left">Lot No</th>
                      <th className="border border-gray-300 p-2 text-left">Bags</th>
                      <th className="border border-gray-300 p-2 text-left">Weight (kg)</th>
                      <th className="border border-gray-300 p-2 text-left">Rate/Quintal</th>
                      <th className="border border-gray-300 p-2 text-left">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {farmerLots.map((lot: any) => (
                      <tr key={lot.id}>
                        <td className="border border-gray-300 p-2">{lot.lotNumber}</td>
                        <td className="border border-gray-300 p-2">{lot.numberOfBags}</td>
                        <td className="border border-gray-300 p-2">{lot.totalWeight.toFixed(1)}</td>
                        <td className="border border-gray-300 p-2">{formatCurrency(lot.pricePerQuintal)}</td>
                        <td className="border border-gray-300 p-2">{formatCurrency((lot.totalWeight / 100) * lot.pricePerQuintal)}</td>
                      </tr>
                    ))}
                    <tr className="bg-yellow-50 font-semibold">
                      <td className="border border-gray-300 p-2">Total</td>
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

          {/* Deductions */}
          <Card>
            <CardHeader>
              <CardTitle>Deductions / ಕಳೆದುಕೊಳ್ಳುವ ಮೊತ್ತಗಳು</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Hamali / ಹಮಾಲಿ</Label>
                  <VoiceInput
                    onResult={(value) => handleInputChange('hamali', value)}
                    placeholder="0"
                    type="currency"
                    value={billData.hamali.toString()}
                    onChange={(e) => handleInputChange('hamali', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Vehicle Rent / ವಾಹನ ಬಾಡಿಗೆ</Label>
                  <VoiceInput
                    onResult={(value) => handleInputChange('vehicleRent', value)}
                    placeholder="0"
                    type="currency"
                    value={billData.vehicleRent.toString()}
                    onChange={(e) => handleInputChange('vehicleRent', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Empty Bag Charges / ಖಾಲಿ ಚೀಲಗಳು</Label>
                  <VoiceInput
                    onResult={(value) => handleInputChange('emptyBagCharges', value)}
                    placeholder="0"
                    type="currency"
                    value={billData.emptyBagCharges.toString()}
                    onChange={(e) => handleInputChange('emptyBagCharges', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Advance / ಮೊದಲು ನೀಡಿದ ಮೊತ್ತ</Label>
                  <VoiceInput
                    onResult={(value) => handleInputChange('advance', value)}
                    placeholder="0"
                    type="currency"
                    value={billData.advance.toString()}
                    onChange={(e) => handleInputChange('advance', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Commission (3%) / ಕಮಿಷನ್</Label>
                  <div className="p-2 bg-yellow-50 rounded font-semibold text-yellow-700">
                    {formatCurrency(rok)}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Other / ಇತರೆ</Label>
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

          {/* Bill Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Bill Summary / ಬಿಲ್ ಸಾರಾಂಶ</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>Total Lots:</span>
                    <span className="font-semibold">{farmerLots.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Bags:</span>
                    <span className="font-semibold">{totalBags}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Weight:</span>
                    <span className="font-semibold">{totalWeight.toFixed(1)} kg</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-lg font-semibold">
                    <span>Gross Amount:</span>
                    <span className="text-green-600">{formatCurrency(totalAmount)}</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>Total Deductions:</span>
                    <span className="font-semibold text-red-600">{formatCurrency(totalDeductions)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-xl font-bold">
                    <span>Net Payable:</span>
                    <span className="text-blue-600">{formatCurrency(netPayable)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Generate Bill */}
          <Card>
            <CardHeader>
              <CardTitle>Generate Bill / ಬಿಲ್ ರಚಿಸಿ</CardTitle>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={generatePDF}
                className="flex items-center gap-2"
                size="lg"
                disabled={!pattiNumber}
              >
                <Download className="h-4 w-4" />
                Download Bill / ಬಿಲ್ ಡೌನ್‌ಲೋಡ್ ಮಾಡಿ
              </Button>
              {!pattiNumber && (
                <p className="text-sm text-gray-500 mt-2">
                  Please enter patti number to generate bill
                </p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}