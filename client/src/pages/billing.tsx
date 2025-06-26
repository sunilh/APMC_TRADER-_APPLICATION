import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Navigation } from "@/components/navigation";
import { VoiceInput } from "@/components/voice-input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar, Download, IndianRupee, Calculator } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

interface FarmerDayBill {
  farmerId: number;
  farmerName: string;
  farmerMobile: string;
  date: string;
  lots: Array<{
    lotNumber: string;
    lotPrice: number;
    numberOfBags: number;
    weighedBags: number;
    totalWeight: number;
    totalWeightQuintals: number;
    vehicleRent?: number;
    advance?: number;
    unloadHamali?: number;
    packaging?: number;
    weighingFee?: number;
    apmcCommission?: number;
    grade?: string;
  }>;
  summary: {
    totalLots: number;
    totalBags: number;
    totalWeighedBags: number;
    totalWeight: number;
    totalWeightQuintals: number;
    grossAmount: number;
    totalDeductions: number;
    netAmount: number;
  };
}

export default function Billing() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [manualDeductions, setManualDeductions] = useState<Record<number, number>>({});

  const { data: dailyBills, isLoading, error } = useQuery<FarmerDayBill[]>({
    queryKey: [`/api/billing/daily/${selectedDate}`],
    enabled: !!selectedDate,
  });

  const updateManualDeduction = (farmerId: number, amount: string) => {
    const numAmount = parseFloat(amount) || 0;
    setManualDeductions(prev => ({
      ...prev,
      [farmerId]: numAmount
    }));
  };

  const calculateAdjustedBill = (bill: FarmerDayBill) => {
    const manualDeduction = manualDeductions[bill.farmerId] || 0;
    return {
      ...bill,
      summary: {
        ...bill.summary,
        totalDeductions: bill.summary.totalDeductions + manualDeduction,
        netAmount: bill.summary.netAmount - manualDeduction
      }
    };
  };

  if (!user) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p>Please log in to view billing information.</p>
    </div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Daily Billing</h1>
          <p className="text-gray-600">
            Consolidated farmer bills with weights and deductions
          </p>
        </div>

        {/* Date Selection */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="flex-1 max-w-xs">
                <Label htmlFor="billing-date">Select Date</Label>
                <div className="flex space-x-2">
                  <Input
                    id="billing-date"
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                  />
                  <Button
                    variant="outline"
                    onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    Today
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Loading State */}
        {isLoading && (
          <Card>
            <CardContent className="p-6 text-center">
              <p>Loading billing data...</p>
            </CardContent>
          </Card>
        )}

        {/* Error State */}
        {error && (
          <Card>
            <CardContent className="p-6 text-center text-red-600">
              <p>Error loading billing data. Please try again.</p>
            </CardContent>
          </Card>
        )}

        {/* No Data */}
        {dailyBills && dailyBills.length === 0 && (
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-gray-500">
                No completed lots with weights and prices found for {selectedDate}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Bills Display */}
        {dailyBills && dailyBills.length > 0 && (
          <div className="space-y-6">
            {dailyBills.map((originalBill) => {
              const bill = calculateAdjustedBill(originalBill);
              return (
                <Card key={bill.farmerId} className="overflow-hidden">
                <CardHeader className="bg-blue-50 border-b">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-xl text-blue-900">
                        {bill.farmerName}
                      </CardTitle>
                      <p className="text-blue-600">Mobile: {bill.farmerMobile}</p>
                      <p className="text-sm text-blue-600">Date: {bill.date}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-blue-600">Net Amount</p>
                      <p className="text-2xl font-bold text-green-600">
                        ₹{bill.summary.netAmount.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-6">
                  {/* Lot Details */}
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-3">Lot Details</h3>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Lot Number</TableHead>
                            <TableHead>Grade</TableHead>
                            <TableHead>Bags</TableHead>
                            <TableHead>Weight (kg)</TableHead>
                            <TableHead>Weight (Qt)</TableHead>
                            <TableHead>Price/Qt (₹)</TableHead>
                            <TableHead>Amount (₹)</TableHead>
                            <TableHead>Vehicle</TableHead>
                            <TableHead>Advance</TableHead>
                            <TableHead>Hamali</TableHead>
                            <TableHead>Packaging</TableHead>
                            <TableHead>Weighing</TableHead>
                            <TableHead>Commission</TableHead>
                            <TableHead>Total Deductions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {bill.lots.map((lot) => {
                            const totalDeductions = (lot.vehicleRent || 0) + (lot.advance || 0) + (lot.unloadHamali || 0) + (lot.packaging || 0) + (lot.weighingFee || 0) + (lot.apmcCommission || 0);
                            return (
                              <TableRow key={lot.lotNumber}>
                                <TableCell className="font-medium">{lot.lotNumber}</TableCell>
                                <TableCell>{lot.grade || '-'}</TableCell>
                                <TableCell>{lot.weighedBags}/{lot.numberOfBags}</TableCell>
                                <TableCell>{lot.totalWeight.toFixed(1)}</TableCell>
                                <TableCell>{lot.totalWeightQuintals.toFixed(2)}</TableCell>
                                <TableCell>₹{lot.lotPrice.toFixed(2)}</TableCell>
                                <TableCell className="font-medium">₹{(lot.totalWeightQuintals * lot.lotPrice).toFixed(2)}</TableCell>
                                <TableCell>₹{(lot.vehicleRent || 0).toFixed(2)}</TableCell>
                                <TableCell>₹{(lot.advance || 0).toFixed(2)}</TableCell>
                                <TableCell>₹{(lot.unloadHamali || 0).toFixed(2)}</TableCell>
                                <TableCell>₹{(lot.packaging || 0).toFixed(2)}</TableCell>
                                <TableCell>₹{(lot.weighingFee || 0).toFixed(2)}</TableCell>
                                <TableCell>₹{(lot.apmcCommission || 0).toFixed(2)}</TableCell>
                                <TableCell className="font-medium">₹{totalDeductions.toFixed(2)}</TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </div>

                  {/* Summary */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
                    <div className="text-center">
                      <p className="text-sm text-gray-600">Total Lots</p>
                      <p className="text-xl font-bold">{bill.summary.totalLots}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-600">Weighed Bags</p>
                      <p className="text-xl font-bold">{bill.summary.totalWeighedBags}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-600">Total Weight</p>
                      <p className="text-xl font-bold">{bill.summary.totalWeight.toFixed(1)} kg</p>
                      <p className="text-xs text-gray-500">({bill.summary.totalWeightQuintals.toFixed(2)} Qt)</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-600">Gross Amount</p>
                      <p className="text-xl font-bold text-green-600">₹{bill.summary.grossAmount.toFixed(2)}</p>
                    </div>
                  </div>

                  {/* Deduction Breakdown */}
                  <div className="mt-4 p-4 bg-red-50 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-red-800">Total Deductions:</span>
                      <span className="text-xl font-bold text-red-600">₹{bill.summary.totalDeductions.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Manual Deduction Input */}
                  <div className="mt-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                    <div className="flex items-center space-x-4">
                      <Calculator className="h-5 w-5 text-yellow-600" />
                      <Label htmlFor={`manual-deduction-${bill.farmerId}`} className="font-medium text-yellow-800">
                        Additional Deduction:
                      </Label>
                      <div className="flex items-center space-x-2">
                        <span className="text-yellow-800">₹</span>
                        <VoiceInput
                          type="currency"
                          placeholder="0.00"
                          onResult={(value) => updateManualDeduction(bill.farmerId, value)}
                          className="w-32 text-center"
                        />
                      </div>
                      {manualDeductions[bill.farmerId] > 0 && (
                        <span className="text-sm text-yellow-600">
                          (Additional ₹{manualDeductions[bill.farmerId].toFixed(2)} deducted)
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Final Amount */}
                  <div className="mt-4 p-4 bg-green-50 rounded-lg border-2 border-green-200">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-semibold text-green-800">Final Amount to Pay:</span>
                      <span className="text-2xl font-bold text-green-600">₹{bill.summary.netAmount.toFixed(2)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              );
            })}

            {/* Overall Summary */}
            <Card className="bg-blue-50 border-blue-200">
              <CardHeader>
                <CardTitle className="text-blue-900">Daily Summary</CardTitle>
                <p className="text-sm text-blue-600">Note: Lot prices are per quintal (100kg), amounts calculated accordingly</p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
                  <div>
                    <p className="text-sm text-blue-600">Total Farmers</p>
                    <p className="text-2xl font-bold text-blue-800">{dailyBills.length}</p>
                  </div>
                  <div>
                    <p className="text-sm text-blue-600">Total Lots</p>
                    <p className="text-2xl font-bold text-blue-800">
                      {dailyBills.reduce((sum, bill) => sum + bill.summary.totalLots, 0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-blue-600">Total Weight</p>
                    <p className="text-2xl font-bold text-blue-800">
                      {dailyBills.reduce((sum, bill) => sum + bill.summary.totalWeight, 0).toFixed(1)} kg
                    </p>
                    <p className="text-sm text-blue-600">
                      ({dailyBills.reduce((sum, bill) => sum + bill.summary.totalWeightQuintals, 0).toFixed(2)} Qt)
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-blue-600">Gross Revenue</p>
                    <p className="text-2xl font-bold text-green-600">
                      ₹{dailyBills.reduce((sum, bill) => sum + bill.summary.grossAmount, 0).toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-blue-600">Net Payout</p>
                    <p className="text-2xl font-bold text-green-600">
                      ₹{dailyBills.reduce((sum, bill) => sum + bill.summary.netAmount, 0).toFixed(2)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}