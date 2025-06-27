import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Download } from "lucide-react";
import { VoiceInput } from "@/components/voice-input";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import jsPDF from "jspdf";
import "jspdf-autotable";

interface FarmerBillData {
  hamali: number;
  vehicleRent: number;
  emptyBagCharges: number;
  advance: number;
  other: number;
  commission: number;
}

export default function FarmerBill() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [selectedFarmerId, setSelectedFarmerId] = useState<string>("");
  const [pattiNumber, setPattiNumber] = useState<string>("");
  const [billData, setBillData] = useState<FarmerBillData>({
    hamali: 0,
    vehicleRent: 0,
    emptyBagCharges: 0,
    advance: 0,
    other: 0,
    commission: 0
  });

  const { data: lots } = useQuery({
    queryKey: ["/api/lots"],
    enabled: !!user?.tenantId,
  });

  const { data: bags } = useQuery({
    queryKey: ["/api/bags"],
    enabled: !!user?.tenantId,
  });

  const { data: tenant } = useQuery({
    queryKey: ["/api/tenant"],
    enabled: !!user?.tenantId,
  });

  // Get completed lots only
  const completedLots = (lots && Array.isArray(lots)) ? lots.filter((lot: any) => lot.status === 'completed') : [];
  
  // Get unique farmers with completed lots
  const uniqueFarmers = Array.from(
    new Map(completedLots.map((lot: any) => [lot.farmerId, lot])).values()
  );

  // Get lots for selected farmer
  const farmerLots = selectedFarmerId ? 
    completedLots.filter((lot: any) => lot.farmerId.toString() === selectedFarmerId) : [];

  const selectedFarmer = farmerLots.length > 0 ? farmerLots[0].farmer : null;

  // Calculate weight from bags for each lot - calculate when farmer is selected
  const enrichedFarmerLots: any[] = [];
  if (selectedFarmerId && farmerLots.length && bags && Array.isArray(bags)) {
    for (const lot of farmerLots) {
      const lotBags = bags.filter((bag: any) => bag.lotId === lot.id) || [];
      const totalWeightFromBags = lotBags.reduce((sum: number, bag: any) => {
        const weight = parseFloat(bag.weight) || 0;
        return sum + weight;
      }, 0);
      const totalBagsCount = lotBags.length;
      
      enrichedFarmerLots.push({
        ...lot,
        actualTotalWeight: totalWeightFromBags,
        actualBagCount: totalBagsCount,
        vehicleRent: lot.vehicleRent || 0,
        advance: lot.advance || 0,
        unloadHamali: lot.unloadHamali || 0
      });
    }
  }

  // Calculate totals
  const totalWeight = enrichedFarmerLots.reduce((sum: number, lot: any) => sum + lot.actualTotalWeight, 0);
  const totalBags = enrichedFarmerLots.reduce((sum: number, lot: any) => sum + lot.actualBagCount, 0);
  const totalAmount = enrichedFarmerLots.reduce((sum: number, lot: any) => {
    const weightInQuintals = lot.actualTotalWeight / 100;
    const lotTotal = weightInQuintals * (lot.lotPrice || 0);
    return sum + lotTotal;
  }, 0);

  const commission = totalAmount * 0.03;
  const totalDeductions = billData.hamali + billData.vehicleRent + billData.emptyBagCharges + billData.advance + billData.other + commission;
  const netAmount = totalAmount - totalDeductions;

  useEffect(() => {
    if (enrichedFarmerLots.length > 0) {
      const totalVehicleRent = enrichedFarmerLots.reduce((sum: number, lot: any) => sum + lot.vehicleRent, 0);
      const totalAdvance = enrichedFarmerLots.reduce((sum: number, lot: any) => sum + lot.advance, 0);
      const totalUnloadHamali = enrichedFarmerLots.reduce((sum: number, lot: any) => sum + lot.unloadHamali, 0);
      
      setBillData(prev => ({
        ...prev,
        vehicleRent: totalVehicleRent,
        advance: totalAdvance,
        hamali: totalUnloadHamali,
        commission: commission
      }));
    }
  }, [enrichedFarmerLots, commission]);

  // PDF generation function
  const generatePDF = () => {
    try {
      if (!selectedFarmer || !enrichedFarmerLots.length) {
        toast({
          title: "Error",
          description: "Please select a farmer and ensure lot data is available",
          variant: "destructive",
        });
        return;
      }

      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      
      // Header
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("FARMER PAYMENT BILL / ರೈತ ಪಾವತಿ ಬಿಲ್", pageWidth / 2, 20, { align: "center" });
      
      // Trader Info
      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      const traderName = tenant && typeof tenant === 'object' && 'name' in tenant ? tenant.name : "N/A";
      const apmcCode = tenant && typeof tenant === 'object' && 'apmcCode' in tenant ? tenant.apmcCode : "N/A";
      doc.text(`Trader: ${traderName}`, 20, 35);
      doc.text(`APMC Code: ${apmcCode}`, 20, 45);
      doc.text(`Date: ${new Date().toLocaleDateString()}`, 150, 35);
      doc.text(`Patti No: ${pattiNumber}`, 150, 45);
    
      // Farmer Info
      doc.setFont("helvetica", "bold");
      doc.text("Farmer Details / ರೈತ ವಿವರಗಳು:", 20, 60);
      doc.setFont("helvetica", "normal");
      doc.text(`Name / ಹೆಸರು: ${selectedFarmer?.name || ""}`, 20, 70);
      doc.text(`Mobile / ಮೊಬೈಲ್: ${selectedFarmer?.mobile || ""}`, 20, 80);
      doc.text(`Place / ಸ್ಥಳ: ${selectedFarmer?.place || ""}`, 20, 90);
      
      // Lot Details Table
      const lotTableData = enrichedFarmerLots.map((lot: any) => [
        lot.lotNumber,
        lot.actualBagCount.toString(),
        `${lot.actualTotalWeight.toFixed(2)} kg`,
        `₹${lot.lotPrice.toLocaleString()}`
      ]);
      
      (doc as any).autoTable({
        startY: 100,
        head: [['Lot Number', 'Bags', 'Weight', 'Amount']],
        body: lotTableData,
        theme: 'grid',
        headStyles: { fillColor: [64, 64, 64] }
      });
      
      // Calculations
      const finalY = (doc as any).lastAutoTable.finalY + 10;
      doc.text(`Total Amount / ಒಟ್ಟು ಮೊತ್ತ: ₹${totalAmount.toLocaleString()}`, 20, finalY);
      
      // Deductions
      doc.text("Deductions / ಕಡಿತಗಳು:", 20, finalY + 15);
      const deductions = [
        { label: "Hamali / ಹಮಾಲಿ", value: billData.hamali },
        { label: "Vehicle Rent / ವಾಹನ ಬಾಡಿಗೆ", value: billData.vehicleRent },
        { label: "Empty Bag Charges / ಖಾಲಿ ಚೀಲ ಶುಲ್ಕ", value: billData.emptyBagCharges },
        { label: "Advance / ಮುಂಗಡ", value: billData.advance },
        { label: "Other / ಇತರೆ", value: billData.other },
        { label: "Commission (3%) / ಕಮಿಷನ್", value: totalAmount * 0.03 }
      ];
      
      let yPos = finalY + 25;
      deductions.forEach(deduction => {
        doc.text(`${deduction.label}: ₹${deduction.value.toLocaleString()}`, 20, yPos);
        yPos += 10;
      });
      
      const totalDeductionsPDF = deductions.reduce((sum, d) => sum + d.value, 0);
      const netAmountPDF = totalAmount - totalDeductionsPDF;
      
      doc.setFont("helvetica", "bold");
      doc.text(`Total Deductions / ಒಟ್ಟು ಕಡಿತಗಳು: ₹${totalDeductionsPDF.toLocaleString()}`, 20, yPos + 5);
      doc.text(`Net Payable / ನಿವ್ವಳ ಪಾವತಿ: ₹${netAmountPDF.toLocaleString()}`, 20, yPos + 20);
      
      // Signature section
      doc.setFont("helvetica", "normal");
      doc.text("Farmer Signature / ರೈತ ಸಹಿ: _______________", 20, yPos + 50);
      doc.text("Trader Signature / ವ್ಯಾಪಾರಿ ಸಹಿ: _______________", 120, yPos + 50);
      
      // Download PDF
      doc.save(`farmer-bill-${selectedFarmer?.name || 'farmer'}-${new Date().toISOString().split('T')[0]}.pdf`);
      
      toast({
        title: "Success",
        description: "Farmer bill PDF generated successfully",
      });
    } catch (error) {
      console.error("PDF generation error:", error);
      toast({
        title: "Error",
        description: "Failed to generate PDF. Please try again.",
        variant: "destructive",
      });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const handleBillDataChange = (field: keyof FarmerBillData, value: string) => {
    const numValue = parseFloat(value) || 0;
    setBillData(prev => ({
      ...prev,
      [field]: numValue
    }));
  };

  if (!user || !user.tenantId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Please log in to access farmer billing.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">
            Farmer Bill System / ರೈತ ಬಿಲ್ ವ್ಯವಸ್ಥೆ
          </CardTitle>
          <p className="text-center text-muted-foreground">
            {completedLots.length} total lots, {completedLots.filter((lot: any) => lot.status === 'completed').length} completed, {uniqueFarmers.length} farmers ready for billing
          </p>
        </CardHeader>
        <CardContent>
          {uniqueFarmers.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No completed lots available for billing</p>
              <p className="text-sm text-gray-400 mt-2">
                Complete lot weighing and pricing to enable farmer billing
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {uniqueFarmers.map((lot: any) => (
                <Card 
                  key={lot.farmerId} 
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    selectedFarmerId === lot.farmerId.toString() ? 'ring-2 ring-blue-500 bg-blue-50' : ''
                  }`}
                  onClick={() => setSelectedFarmerId(lot.farmerId.toString())}
                >
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-lg">{lot.farmer?.name}</h3>
                    <p className="text-sm text-gray-600">{lot.farmer?.mobile}</p>
                    <p className="text-sm text-gray-600">{lot.farmer?.place}</p>
                    <div className="mt-2 pt-2 border-t">
                      <p className="text-xs text-gray-500">
                        Lots: {farmerLots.filter((l: any) => l.farmerId === lot.farmerId).length}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedFarmerId && (
        <Card>
          <CardHeader>
            <CardTitle>Generate Bill for {selectedFarmer?.name} / {selectedFarmer?.name} ಗಾಗಿ ಬಿಲ್ ತಯಾರಿಸಿ</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Patti Number */}
            <div className="space-y-2">
              <Label htmlFor="pattiNumber">Patti Number / ಪಟ್ಟಿ ಸಂಖ್ಯೆ</Label>
              <VoiceInput
                value={pattiNumber}
                onChange={(e) => setPattiNumber(e.target.value)}
                onResult={setPattiNumber}
                placeholder="Enter patti number"
                className="w-full"
              />
            </div>

            {/* Lot Summary */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-3">Lot Summary / ಲಾಟ್ ಸಾರಾಂಶ</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Total Lots:</span>
                  <p className="font-medium">{enrichedFarmerLots.length}</p>
                </div>
                <div>
                  <span className="text-gray-600">Total Bags:</span>
                  <p className="font-medium">{totalBags}</p>
                </div>
                <div>
                  <span className="text-gray-600">Total Weight:</span>
                  <p className="font-medium">{totalWeight.toFixed(2)} kg</p>
                </div>
                <div>
                  <span className="text-gray-600">Total Amount:</span>
                  <p className="font-medium">{formatCurrency(totalAmount)}</p>
                </div>
              </div>
            </div>

            {/* Deduction Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="hamali">Hamali / ಹಮಾಲಿ (₹)</Label>
                <VoiceInput
                  value={billData.hamali.toString()}
                  onChange={(e) => handleBillDataChange('hamali', e.target.value)}
                  onResult={(value) => handleBillDataChange('hamali', value)}
                  placeholder="0"
                  type="number"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vehicleRent">Vehicle Rent / ವಾಹನ ಬಾಡಿಗೆ (₹)</Label>
                <VoiceInput
                  value={billData.vehicleRent.toString()}
                  onChange={(e) => handleBillDataChange('vehicleRent', e.target.value)}
                  onResult={(value) => handleBillDataChange('vehicleRent', value)}
                  placeholder="0"
                  type="number"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="emptyBagCharges">Empty Bag Charges / ಖಾಲಿ ಚೀಲ ಶುಲ್ಕ (₹)</Label>
                <VoiceInput
                  value={billData.emptyBagCharges.toString()}
                  onChange={(e) => handleBillDataChange('emptyBagCharges', e.target.value)}
                  onResult={(value) => handleBillDataChange('emptyBagCharges', value)}
                  placeholder="0"
                  type="number"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="advance">Advance / ಮುಂಗಡ (₹)</Label>
                <VoiceInput
                  value={billData.advance.toString()}
                  onChange={(e) => handleBillDataChange('advance', e.target.value)}
                  onResult={(value) => handleBillDataChange('advance', value)}
                  placeholder="0"
                  type="number"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="other">Other Charges / ಇತರ ಶುಲ್ಕಗಳು (₹)</Label>
                <VoiceInput
                  value={billData.other.toString()}
                  onChange={(e) => handleBillDataChange('other', e.target.value)}
                  onResult={(value) => handleBillDataChange('other', value)}
                  placeholder="0"
                  type="number"
                />
              </div>
            </div>

            <Separator />

            {/* Bill Summary */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-3">Bill Summary / ಬಿಲ್ ಸಾರಾಂಶ</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Total Amount / ಒಟ್ಟು ಮೊತ್ತ:</span>
                  <span className="font-medium">{formatCurrency(totalAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Commission (3%) / ಕಮಿಷನ್:</span>
                  <span className="font-medium">{formatCurrency(commission)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Deductions / ಒಟ್ಟು ಕಡಿತಗಳು:</span>
                  <span className="font-medium">{formatCurrency(totalDeductions)}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-lg font-bold">
                  <span>Net Payable / ನಿವ್ವಳ ಪಾವತಿ:</span>
                  <span className="text-green-600">{formatCurrency(netAmount)}</span>
                </div>
              </div>
            </div>

            {/* Generate PDF Button */}
            <div className="flex justify-center">
              <Button 
                onClick={generatePDF}
                className="bg-green-600 hover:bg-green-700 text-white px-8 py-3"
                disabled={!pattiNumber.trim()}
              >
                <Download className="mr-2 h-4 w-4" />
                Generate PDF Bill
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}