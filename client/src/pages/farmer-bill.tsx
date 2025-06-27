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
  farmer: {
    id: number;
    name: string;
    place: string;
    mobile: string;
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
  const [selectedLotId, setSelectedLotId] = useState<string>("");
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

  const selectedLot = lots?.find((lot: Lot) => lot.id.toString() === selectedLotId);

  // Calculate total amount and net payable
  const totalAmount = selectedLot ? (selectedLot.totalWeight / 100) * selectedLot.pricePerQuintal : 0;
  const commission = totalAmount * 0.03; // 3% commission
  const totalDeductions = billData.hamali + billData.vehicleRent + billData.emptyBagCharges + 
                         billData.advance + commission + billData.other;
  const netPayable = totalAmount - totalDeductions;

  // Update commission when total amount changes
  useEffect(() => {
    setBillData(prev => ({ ...prev, commission: totalAmount * 0.03 }));
  }, [totalAmount]);

  const handleInputChange = (field: keyof FarmerBillData, value: string) => {
    setBillData(prev => ({
      ...prev,
      [field]: parseFloat(value) || 0
    }));
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const generatePDF = () => {
    if (!selectedLot || !tenant) return;

    const currentDate = new Date().toLocaleDateString('en-IN');
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Farmer Bill - ${selectedLot.lotNumber}</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 30px auto; 
              font-size: 14px; 
              line-height: 1.5; 
              max-width: 80%; 
              background: white;
            }
            .header { 
              text-align: center; 
              margin-bottom: 25px; 
              border-bottom: 2px solid #333;
              padding-bottom: 15px;
            }
            .bill-title { 
              font-size: 24px; 
              font-weight: bold; 
              margin-bottom: 10px; 
              color: #333;
            }
            .section { 
              margin-bottom: 20px; 
              border: 1px solid #ccc; 
              padding: 15px; 
              border-radius: 5px;
            }
            .section-title { 
              font-size: 16px; 
              font-weight: bold; 
              margin-bottom: 10px; 
              color: #444;
              border-bottom: 1px solid #eee;
              padding-bottom: 5px;
            }
            .row { 
              display: flex; 
              justify-content: space-between; 
              margin-bottom: 8px; 
            }
            .label { 
              font-weight: bold; 
              color: #555;
            }
            .value { 
              color: #333;
            }
            .net-section { 
              background-color: #f8f9fa; 
              border: 2px solid #28a745; 
              padding: 20px; 
              text-align: center;
            }
            .net-amount { 
              font-size: 20px; 
              font-weight: bold; 
              color: #28a745;
            }
            .signature-section { 
              margin-top: 40px; 
              display: flex; 
              justify-content: space-between;
            }
            .signature-box { 
              text-align: center; 
              width: 45%;
            }
            .signature-line { 
              border-top: 1px solid #333; 
              margin-top: 50px; 
              padding-top: 5px;
            }
            @media print {
              body { margin: 20px; font-size: 12px; max-width: 100%; }
              .section { page-break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="bill-title">Farmer Payment Bill / ರೈತ ಪಾವತಿ ಬಿಲ್</div>
          </div>

          <div class="section">
            <div class="section-title">Tenant Details / ದಾರುಗಾರ ವಿವರಗಳು</div>
            <div class="row">
              <span class="label">Tenant Name / ದಾರುಗಾರನ ಹೆಸರು:</span>
              <span class="value">${tenant.name}</span>
            </div>
            <div class="row">
              <span class="label">GST No. / ಜಿ.ಎಸ್.ಟಿ ಸಂಖ್ಯೆ:</span>
              <span class="value">${tenant.gstNumber || 'N/A'}</span>
            </div>
            <div class="row">
              <span class="label">HSN Code / ಎಚ್.ಎಸ್.ಎನ್ ಕೋಡ್:</span>
              <span class="value">${tenant.hsnCode || 'N/A'}</span>
            </div>
            <div class="row">
              <span class="label">Mobile Number / ಮೊಬೈಲ್ ಸಂಖ್ಯೆ:</span>
              <span class="value">${tenant.mobileNumber}</span>
            </div>
            <div class="row">
              <span class="label">Patti Number / ಪಟ್ಟಿ ಸಂಖ್ಯೆ:</span>
              <span class="value">${pattiNumber || 'N/A'}</span>
            </div>
            <div class="row">
              <span class="label">Date / ದಿನಾಂಕ:</span>
              <span class="value">${currentDate}</span>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Farmer Details / ರೈತ ವಿವರಗಳು</div>
            <div class="row">
              <span class="label">Farmer Name / ರೈತನ ಹೆಸರು:</span>
              <span class="value">${selectedLot.farmer.name}</span>
            </div>
            <div class="row">
              <span class="label">Place / ಸ್ಥಳ:</span>
              <span class="value">${selectedLot.farmer.place}</span>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Lot Details / ಲಾಟ್ ವಿವರಗಳು</div>
            <div class="row">
              <span class="label">Lot Number / ಲಾಟ್ ಸಂಖ್ಯೆ:</span>
              <span class="value">${selectedLot.lotNumber}</span>
            </div>
            <div class="row">
              <span class="label">Number of Bags / ಚೀಲಗಳ ಸಂಖ್ಯೆ:</span>
              <span class="value">${selectedLot.numberOfBags}</span>
            </div>
            <div class="row">
              <span class="label">Total Weight (Qtl) / ಒಟ್ಟು ತೂಕ:</span>
              <span class="value">${(selectedLot.totalWeight / 100).toFixed(2)} Qtl</span>
            </div>
            <div class="row">
              <span class="label">Rate per Quintal / ಪ್ರತಿ ಕ್ವಿಂಟಲ್ ದರ:</span>
              <span class="value">${formatCurrency(selectedLot.pricePerQuintal)}</span>
            </div>
            <div class="row">
              <span class="label">Total Amount / ಒಟ್ಟು ಮೊತ್ತ:</span>
              <span class="value">${formatCurrency(totalAmount)}</span>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Deductions / ಕಳೆದುಕೊಳ್ಳುವ ಮೊತ್ತಗಳು</div>
            <div class="row">
              <span class="label">Hamali / ಹಮಾಲಿ:</span>
              <span class="value">${formatCurrency(billData.hamali)}</span>
            </div>
            <div class="row">
              <span class="label">Vehicle Rent / ವಾಹನ ಬಾಡಿಗೆ:</span>
              <span class="value">${formatCurrency(billData.vehicleRent)}</span>
            </div>
            <div class="row">
              <span class="label">Empty Bag Charges / ಖಾಲಿ ಚೀಲಗಳು:</span>
              <span class="value">${formatCurrency(billData.emptyBagCharges)}</span>
            </div>
            <div class="row">
              <span class="label">Advance / ಮೊದಲು ನೀಡಿದ ಮೊತ್ತ:</span>
              <span class="value">${formatCurrency(billData.advance)}</span>
            </div>
            <div class="row">
              <span class="label">Commission (3%) / ಕಮಿಷನ್ (3%):</span>
              <span class="value">${formatCurrency(commission)}</span>
            </div>
            <div class="row">
              <span class="label">Other / ಇತರೆ:</span>
              <span class="value">${formatCurrency(billData.other)}</span>
            </div>
            <div class="row" style="border-top: 1px solid #ccc; padding-top: 8px; margin-top: 8px;">
              <span class="label">Total Deductions / ಒಟ್ಟು ಕಳೆದುಕೊಳ್ಳುವ ಮೊತ್ತ:</span>
              <span class="value">${formatCurrency(totalDeductions)}</span>
            </div>
          </div>

          <div class="section net-section">
            <div class="section-title">Net Payable Amount / ನಿವ್ವಳ ಪಾವತಿಸಬೇಕಾದ ಮೊತ್ತ</div>
            <div class="net-amount">${formatCurrency(netPayable)}</div>
          </div>

          <div class="signature-section">
            <div class="signature-box">
              <div class="signature-line">Farmer Signature / ರೈತನ ಸಹಿ</div>
            </div>
            <div class="signature-box">
              <div class="signature-line">Authorized Signature / ಅಧಿಕೃತ ಸಹಿ</div>
            </div>
          </div>
        </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `farmer-bill-${selectedLot.lotNumber}-${new Date().getTime()}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!user?.tenantId) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Please log in to access farmer bills.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Farmer Bill / ರೈತ ಬಿಲ್</h1>
        {selectedLot && (
          <Button onClick={generatePDF} className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Download Bill / ಬಿಲ್ ಡೌನ್‌ಲೋಡ್
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Select Lot / ಲಾಟ್ ಆಯ್ಕೆ ಮಾಡಿ</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="lot-select">Lot / ಲಾಟ್</Label>
              <Select value={selectedLotId} onValueChange={setSelectedLotId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a lot / ಲಾಟ್ ಆಯ್ಕೆ ಮಾಡಿ" />
                </SelectTrigger>
                <SelectContent>
                  {lots?.map((lot: Lot) => (
                    <SelectItem key={lot.id} value={lot.id.toString()}>
                      {lot.lotNumber} - {lot.farmer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="patti-number">Patti Number / ಪಟ್ಟಿ ಸಂಖ್ಯೆ</Label>
              <VoiceInput
                onResult={setPattiNumber}
                placeholder="Enter patti number / ಪಟ್ಟಿ ಸಂಖ್ಯೆ ನಮೂದಿಸಿ"
                type="text"
                value={pattiNumber}
                onChange={(e) => setPattiNumber(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedLot && tenant && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Header Details / ಮುಖ್ಯ ವಿವರಗಳು</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="space-y-2">
                    <Label>Tenant Name / ದಾರುಗಾರನ ಹೆಸರು</Label>
                    <div className="p-2 bg-gray-50 rounded">{tenant.name}</div>
                  </div>
                </div>
                <div>
                  <div className="space-y-2">
                    <Label>GST No. / ಜಿ.ಎಸ್.ಟಿ ಸಂಖ್ಯೆ</Label>
                    <div className="p-2 bg-gray-50 rounded">{tenant.gstNumber || 'N/A'}</div>
                  </div>
                </div>
                <div>
                  <div className="space-y-2">
                    <Label>HSN Code / ಎಚ್.ಎಸ್.ಎನ್ ಕೋಡ್</Label>
                    <div className="p-2 bg-gray-50 rounded">{tenant.hsnCode || 'N/A'}</div>
                  </div>
                </div>
                <div>
                  <div className="space-y-2">
                    <Label>Mobile Number / ಮೊಬೈಲ್ ಸಂಖ್ಯೆ</Label>
                    <div className="p-2 bg-gray-50 rounded">{tenant.mobileNumber}</div>
                  </div>
                </div>
                <div>
                  <div className="space-y-2">
                    <Label>Date / ದಿನಾಂಕ</Label>
                    <div className="p-2 bg-gray-50 rounded">{new Date().toLocaleDateString('en-IN')}</div>
                  </div>
                </div>
                <div>
                  <div className="space-y-2">
                    <Label>Farmer Name / ರೈತನ ಹೆಸರು</Label>
                    <div className="p-2 bg-gray-50 rounded">{selectedLot.farmer.name}</div>
                  </div>
                </div>
                <div>
                  <div className="space-y-2">
                    <Label>Place / ಸ್ಥಳ</Label>
                    <div className="p-2 bg-gray-50 rounded">{selectedLot.farmer.place}</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Lot Details / ಲಾಟ್ ವಿವರಗಳು</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <div className="space-y-2">
                    <Label>Lot Number / ಲಾಟ್ ಸಂಖ್ಯೆ</Label>
                    <div className="p-2 bg-gray-50 rounded">{selectedLot.lotNumber}</div>
                  </div>
                </div>
                <div>
                  <div className="space-y-2">
                    <Label>Number of Bags / ಚೀಲಗಳ ಸಂಖ್ಯೆ</Label>
                    <div className="p-2 bg-gray-50 rounded">{selectedLot.numberOfBags}</div>
                  </div>
                </div>
                <div>
                  <div className="space-y-2">
                    <Label>Total Weight (Qtl) / ಒಟ್ಟು ತೂಕ</Label>
                    <div className="p-2 bg-gray-50 rounded">{(selectedLot.totalWeight / 100).toFixed(2)} Qtl</div>
                  </div>
                </div>
                <div>
                  <div className="space-y-2">
                    <Label>Rate per Quintal / ಪ್ರತಿ ಕ್ವಿಂಟಲ್ ದರ</Label>
                    <div className="p-2 bg-gray-50 rounded">{formatCurrency(selectedLot.pricePerQuintal)}</div>
                  </div>
                </div>
                <div>
                  <div className="space-y-2">
                    <Label>Total Amount / ಒಟ್ಟು ಮೊತ್ತ</Label>
                    <div className="p-2 bg-blue-50 rounded font-semibold text-blue-700">{formatCurrency(totalAmount)}</div>
                  </div>
                </div>
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
                  <Label htmlFor="commission">Commission (3%) / ಕಮಿಷನ್ (3%)</Label>
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
              
              <Separator />
              
              <div className="flex justify-between items-center text-lg font-semibold">
                <span>Total Deductions / ಒಟ್ಟು ಕಳೆದುಕೊಳ್ಳುವ ಮೊತ್ತ:</span>
                <span className="text-red-600">{formatCurrency(totalDeductions)}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="text-green-800">Net Payable Amount / ನಿವ್ವಳ ಪಾವತಿಸಬೇಕಾದ ಮೊತ್ತ</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-700 mb-2">
                  {formatCurrency(netPayable)}
                </div>
                <div className="text-sm text-green-600">
                  Amount to be paid to farmer / ರೈತನಿಗೆ ಪಾವತಿಸಬೇಕಾದ ಮೊತ್ತ
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}