import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Download, Eye, CheckCircle, AlertCircle, Plus, History, FileText, Printer } from "lucide-react";
import { VoiceInput } from "@/components/voice-input";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { BackToDashboard } from "@/components/back-to-dashboard";

interface FarmerBillData {
  hamali: number;
  vehicleRent: number;
  emptyBagCharges: number;
  advance: number;
  other: number;
  commission: number;
}

interface FarmerBillRecord {
  id: number;
  pattiNumber: string;
  farmerId: number;
  totalAmount: string;
  netPayable: string;
  totalBags: number;
  totalWeight: string;
  createdAt: string;
  creatorName: string;
  creatorUsername: string;
}

interface Farmer {
  id: number;
  name: string;
  mobile: string;
  place: string;
}

export default function FarmerBill() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedFarmerId, setSelectedFarmerId] = useState<string>("");
  const [pattiNumber, setPattiNumber] = useState<string>("");
  const [lastBillKey, setLastBillKey] = useState<string>("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [activeTab, setActiveTab] = useState("generate");
  const [billData, setBillData] = useState<FarmerBillData>({
    hamali: 0,
    vehicleRent: 0,
    emptyBagCharges: 0,
    advance: 0,
    other: 0,
    commission: 0,
  });

  // Set default date range to current month
  useEffect(() => {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    setStartDate(startOfMonth.toISOString().slice(0, 10));
    setEndDate(endOfMonth.toISOString().slice(0, 10));
  }, []);

  // Auto-generate unique patti number each time
  const generatePattiNumber = () => {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const timeStr = today.getTime().toString().slice(-6); // Use more digits for uniqueness
    const randomNum = Math.floor(Math.random() * 100).toString().padStart(2, '0');
    return `P${dateStr}${timeStr}${randomNum}`;
  };

  // Fetch all farmers for dropdown
  const { data: farmers = [], isLoading: farmersLoading } = useQuery<Farmer[]>({
    queryKey: ["/api/farmers"],
    enabled: !!user?.tenantId,
  });

  // Fetch historical farmer bills with date range filtering
  const { data: historicalBills = [], isLoading: historicalBillsLoading } = useQuery<FarmerBillRecord[]>({
    queryKey: ["/api/farmer-bills", selectedFarmerId, startDate, endDate],
    queryFn: async () => {
      if (!selectedFarmerId) return [];
      let url = `/api/farmer-bills/${selectedFarmerId}`;
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
    enabled: !!selectedFarmerId && activeTab === "history",
  });

  // Check if farmer bill already exists
  const { data: billCheck, isLoading: checkLoading } = useQuery({
    queryKey: ["/api/farmer-bill", selectedFarmerId, "check"],
    queryFn: async () => {
      if (!selectedFarmerId) return null;
      const response = await fetch(`/api/farmer-bill/${selectedFarmerId}/check`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error(`${response.status}: ${response.statusText}`);
      }
      return response.json();
    },
    enabled: !!selectedFarmerId && activeTab === "generate",
  });

  // Generate farmer bill mutation
  const generateBillMutation = useMutation({
    mutationFn: async (data: { 
      farmerId: number; 
      pattiNumber: string; 
      billData: any; 
      lotIds: number[] 
    }) => {
      return apiRequest("POST", `/api/farmer-bill/${data.farmerId}`, {
        pattiNumber: data.pattiNumber,
        billData: data.billData,
        lotIds: data.lotIds,
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Farmer bill generated and saved successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/farmer-bill"] });
      queryClient.invalidateQueries({ queryKey: ["/api/farmer-bills"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to generate farmer bill",
        variant: "destructive",
      });
    },
  });

  // Fetch farmer's completed lots for bill generation (all dates)
  const { data: farmerLots = [], isLoading: lotsLoading } = useQuery({
    queryKey: ["/api/farmer", selectedFarmerId, "completed-lots"],
    queryFn: async () => {
      if (!selectedFarmerId) return [];
      const response = await fetch(`/api/farmer/${selectedFarmerId}/completed-lots`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error(`${response.status}: ${response.statusText}`);
      }
      return response.json();
    },
    enabled: !!selectedFarmerId && activeTab === "generate" && !billCheck?.exists,
  });

  const formatCurrency = (amount: number | string) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN');
  };

  const selectedFarmer = farmers.find(f => f.id === parseInt(selectedFarmerId));

  // Function to download farmer bill as PDF (Exact format as shown in uploaded HTML)
  const downloadFarmerBillPDF = async (bill: FarmerBillRecord) => {
    try {
      const response = await fetch(`/api/farmer-bill/${bill.farmerId}`, {
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error("Failed to fetch bill details");
      }
      
      const billDetails = await response.json();
      
      // Generate HTML format matching uploaded example
      const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Farmer Bill - ${billDetails.farmerName}</title>
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
            <h1>${billDetails.tenantName || 'AGRICULTURAL TRADING COMPANY'}</h1>
            <p><strong>FARMER PAYMENT BILL / ರೈತ ಪಾವತಿ ಬಿಲ್</strong></p>
            <p>Date: ${formatDate(bill.createdAt)} | Patti No: ${bill.pattiNumber}</p>
          </div>
          
          <div class="farmer-info">
            <h3>Farmer Details / ರೈತ ವಿವರಗಳು</h3>
            <p><strong>Name / ಹೆಸರು:</strong> ${billDetails.farmerName || 'N/A'}</p>
            <p><strong>Mobile / ಮೊಬೈಲ್:</strong> ${billDetails.farmerMobile || 'N/A'}</p>
            <p><strong>Place / ಸ್ಥಳ:</strong> ${billDetails.farmerPlace || 'N/A'}</p>
            <p><strong>Bank / ಬ್ಯಾಂಕ್:</strong> ${billDetails.bankName || 'N/A'} - ${billDetails.accountNumber || 'N/A'}</p>
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
              ${billDetails.lots ? billDetails.lots.map(lot => `
                <tr>
                  <td>${lot.lotNumber}</td>
                  <td>${lot.numberOfBags}</td>
                  <td>${lot.totalWeight}</td>
                  <td>${formatCurrency(lot.pricePerQuintal || 0)}</td>
                  <td>${formatCurrency((lot.totalWeight / 100) * (lot.pricePerQuintal || 0))}</td>
                </tr>
              `).join('') : ''}
              <tr class="total-row">
                <td><strong>Total / ಒಟ್ಟು</strong></td>
                <td><strong>${bill.totalBags}</strong></td>
                <td><strong>${bill.totalWeight}</strong></td>
                <td>-</td>
                <td><strong>${formatCurrency(bill.totalAmount)}</strong></td>
              </tr>
            </tbody>
          </table>

          <div class="summary">
            <h3>Payment Summary / ಪಾವತಿ ಸಾರಾಂಶ</h3>
            <table class="lot-table">
              <tr><td>Gross Amount / ಒಟ್ಟು ಮೊತ್ತ</td><td>${formatCurrency(bill.totalAmount)}</td></tr>
              <tr><td>Less: Hamali / ಕಡಿಮೆ: ಹಮಾಲಿ</td><td>-${formatCurrency(billDetails.hamali || 0)}</td></tr>
              <tr><td>Less: Vehicle Rent / ಕಡಿಮೆ: ವಾಹನ ಬಾಡಿಗೆ</td><td>-${formatCurrency(billDetails.vehicleRent || 0)}</td></tr>
              <tr><td>Less: Empty Bags / ಕಡಿಮೆ: ಖಾಲಿ ಚೀಲಗಳು</td><td>-${formatCurrency(billDetails.emptyBagCharges || 0)}</td></tr>
              <tr><td>Less: Advance / ಕಡಿಮೆ: ಮೊದಲು ನೀಡಿದ ಮೊತ್ತ</td><td>-${formatCurrency(billDetails.advance || 0)}</td></tr>
              <tr><td>Less: Commission (3%) / ಕಡಿಮೆ: ಕಮಿಷನ್</td><td>-${formatCurrency(billDetails.commission || 0)}</td></tr>
              <tr><td>Less: Other / ಕಡಿಮೆ: ಇತರೆ</td><td>-${formatCurrency(billDetails.other || 0)}</td></tr>
              <tr class="total-row"><td><strong>Net Payable / ನಿವ್ವಳ ಪಾವತಿ</strong></td><td><strong>${formatCurrency(bill.netPayable)}</strong></td></tr>
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
      link.download = `farmer-bill-${billDetails.farmerName}-${formatDate(bill.createdAt)}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Success",
        description: "Farmer bill downloaded successfully!",
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

  // Function to print farmer bill (Exact format as shown in uploaded HTML)
  const printFarmerBill = async (bill: FarmerBillRecord) => {
    try {
      const response = await fetch(`/api/farmer-bill/${bill.farmerId}`, {
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error("Failed to fetch bill details");
      }
      
      const billDetails = await response.json();
      
      const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Farmer Bill - ${billDetails.farmerName}</title>
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
            <h1>${billDetails.tenantName || 'AGRICULTURAL TRADING COMPANY'}</h1>
            <p><strong>FARMER PAYMENT BILL / ರೈತ ಪಾವತಿ ಬಿಲ್</strong></p>
            <p>Date: ${formatDate(bill.createdAt)} | Patti No: ${bill.pattiNumber}</p>
          </div>
          
          <div class="farmer-info">
            <h3>Farmer Details / ರೈತ ವಿವರಗಳು</h3>
            <p><strong>Name / ಹೆಸರು:</strong> ${billDetails.farmerName || 'N/A'}</p>
            <p><strong>Mobile / ಮೊಬೈಲ್:</strong> ${billDetails.farmerMobile || 'N/A'}</p>
            <p><strong>Place / ಸ್ಥಳ:</strong> ${billDetails.farmerPlace || 'N/A'}</p>
            <p><strong>Bank / ಬ್ಯಾಂಕ್:</strong> ${billDetails.bankName || 'N/A'} - ${billDetails.accountNumber || 'N/A'}</p>
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
              ${billDetails.lots ? billDetails.lots.map(lot => `
                <tr>
                  <td>${lot.lotNumber}</td>
                  <td>${lot.numberOfBags}</td>
                  <td>${lot.totalWeight}</td>
                  <td>${formatCurrency(lot.pricePerQuintal || 0)}</td>
                  <td>${formatCurrency((lot.totalWeight / 100) * (lot.pricePerQuintal || 0))}</td>
                </tr>
              `).join('') : ''}
              <tr class="total-row">
                <td><strong>Total / ಒಟ್ಟು</strong></td>
                <td><strong>${bill.totalBags}</strong></td>
                <td><strong>${bill.totalWeight}</strong></td>
                <td>-</td>
                <td><strong>${formatCurrency(bill.totalAmount)}</strong></td>
              </tr>
            </tbody>
          </table>

          <div class="summary">
            <h3>Payment Summary / ಪಾವತಿ ಸಾರಾಂಶ</h3>
            <table class="lot-table">
              <tr><td>Gross Amount / ಒಟ್ಟು ಮೊತ್ತ</td><td>${formatCurrency(bill.totalAmount)}</td></tr>
              <tr><td>Less: Hamali / ಕಡಿಮೆ: ಹಮಾಲಿ</td><td>-${formatCurrency(billDetails.hamali || 0)}</td></tr>
              <tr><td>Less: Vehicle Rent / ಕಡಿಮೆ: ವಾಹನ ಬಾಡಿಗೆ</td><td>-${formatCurrency(billDetails.vehicleRent || 0)}</td></tr>
              <tr><td>Less: Empty Bags / ಕಡಿಮೆ: ಖಾಲಿ ಚೀಲಗಳು</td><td>-${formatCurrency(billDetails.emptyBagCharges || 0)}</td></tr>
              <tr><td>Less: Advance / ಕಡಿಮೆ: ಮೊದಲು ನೀಡಿದ ಮೊತ್ತ</td><td>-${formatCurrency(billDetails.advance || 0)}</td></tr>
              <tr><td>Less: Commission (3%) / ಕಡಿಮೆ: ಕಮಿಷನ್</td><td>-${formatCurrency(billDetails.commission || 0)}</td></tr>
              <tr><td>Less: Other / ಕಡಿಮೆ: ಇತರೆ</td><td>-${formatCurrency(billDetails.other || 0)}</td></tr>
              <tr class="total-row"><td><strong>Net Payable / ನಿವ್ವಳ ಪಾವತಿ</strong></td><td><strong>${formatCurrency(bill.netPayable)}</strong></td></tr>
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
          
          <!-- Back Side - Individual Bag Weights -->
          <div class="page-break"></div>
          
          <div class="header">
            <h1>${billDetails.tenantName}</h1>
            <h2>BAG WEIGHT DETAILS / ಚೀಲ ತೂಕ ವಿವರಗಳು</h2>
            <div class="farmer-info">
              <p><strong>Farmer:</strong> ${billDetails.farmerName} | <strong>Patti No:</strong> ${billDetails.pattiNumber}</p>
              <p><strong>Date:</strong> ${new Date(billDetails.createdAt).toLocaleDateString()}</p>
            </div>
          </div>

          ${billDetails.lots ? billDetails.lots.map(lot => `
            <div class="lot-section">
              <h3>Lot ${lot.lotNumber} - ${lot.varietyGrade} (${lot.grade})</h3>
              <p><strong>Total Bags:</strong> ${lot.numberOfBags} | <strong>Total Weight:</strong> ${lot.totalWeight} kg</p>
              
              <div class="bag-grid">
                ${lot.bags && lot.bags.length > 0 ? lot.bags.map(bag => `
                  <div class="bag-card">
                    <div class="bag-number">B${bag.bagNumber}</div>
                    <div class="bag-weight">${bag.weight}kg</div>
                  </div>
                `).join('') : Array.from({length: lot.numberOfBags}, (_, i) => `
                  <div class="bag-card">
                    <div class="bag-number">B${i + 1}</div>
                    <div class="bag-weight">--</div>
                  </div>
                `).join('')}
              </div>
              
              <div class="lot-summary">
                <strong>Rate:</strong> ₹${formatCurrency(lot.pricePerQuintal || 0)}/quintal | 
                <strong>Amount:</strong> ₹${formatCurrency((lot.totalWeight / 100) * (lot.pricePerQuintal || 0))}
              </div>
            </div>
          `).join('') : ''}
          
          <style>
            .page-break {
              page-break-before: always;
              margin-top: 40px;
            }
            
            .lot-section {
              margin-bottom: 25px;
              border-bottom: 1px solid #ddd;
              padding-bottom: 15px;
            }
            
            .lot-section h3 {
              color: #2563eb;
              margin-bottom: 8px;
              font-size: 16px;
            }
            
            .bag-grid {
              display: grid;
              grid-template-columns: repeat(25, 1fr);
              gap: 2px;
              margin: 8px 0;
            }
            
            .bag-card {
              border: 1px solid #ccc;
              border-radius: 2px;
              padding: 2px 1px;
              text-align: center;
              background: #f8f9fa;
              font-size: 7px;
              line-height: 1.1;
            }
            
            .bag-number {
              font-weight: bold;
              color: #1f2937;
              margin-bottom: 0px;
            }
            
            .bag-weight {
              color: #059669;
              font-weight: 600;
            }
            
            .lot-summary {
              background: #e5f3ff;
              padding: 4px;
              border-radius: 2px;
              font-size: 10px;
              margin-top: 6px;
            }
            
            .lot-section {
              margin-bottom: 15px;
              border-bottom: 1px solid #ddd;
              padding-bottom: 10px;
            }
            
            .lot-section h3 {
              color: #2563eb;
              margin-bottom: 6px;
              font-size: 14px;
            }
            
            @media print {
              .bag-grid {
                grid-template-columns: repeat(50, 1fr);
                gap: 1px;
              }
              
              .bag-card {
                padding: 1px;
                font-size: 6px;
                border-radius: 1px;
              }
              
              .lot-section {
                margin-bottom: 12px;
                padding-bottom: 8px;
              }
              
              .lot-section h3 {
                font-size: 12px;
                margin-bottom: 4px;
              }
              
              .lot-summary {
                padding: 2px;
                font-size: 8px;
                margin-top: 4px;
              }
            }
          </style>
          
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 100);
            }
          </script>
        </body>
        </html>
      `;
      
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(printContent);
        printWindow.document.close();
      }
    } catch (error) {
      console.error("Error printing bill:", error);
      toast({
        title: "Error",
        description: "Failed to print bill",
        variant: "destructive",
      });
    }
  };

  if (farmersLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">Loading farmers...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <BackToDashboard />
      
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center gap-2 mb-6">
            <FileText className="h-6 w-6 text-green-600" />
            <h1 className="text-2xl font-bold text-gray-900">Farmer Bill Management</h1>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="generate" className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Generate Bill
              </TabsTrigger>
              <TabsTrigger value="history" className="flex items-center gap-2">
                <History className="h-4 w-4" />
                Bill History
              </TabsTrigger>
            </TabsList>

            <TabsContent value="generate" className="space-y-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Generate New Farmer Bill</CardTitle>
                  <CardDescription>
                    Select a farmer to generate bill for completed lots
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="farmer">Select Farmer</Label>
                    <Select
                      value={selectedFarmerId}
                      onValueChange={setSelectedFarmerId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a farmer..." />
                      </SelectTrigger>
                      <SelectContent>
                        {farmers.map((farmer) => (
                          <SelectItem key={farmer.id} value={farmer.id.toString()}>
                            {farmer.name} - {farmer.place}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedFarmerId && (
                    <div className="space-y-4">
                      {checkLoading ? (
                        <Alert>
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>Checking bill status...</AlertDescription>
                        </Alert>
                      ) : billCheck?.exists ? (
                        <div className="space-y-4">
                          <Alert>
                            <CheckCircle className="h-4 w-4" />
                            <AlertDescription>
                              Farmer bill already exists for {selectedFarmer?.name}.
                            </AlertDescription>
                          </Alert>
                          
                          <Card>
                            <CardHeader>
                              <CardTitle className="text-lg">Existing Bill</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div>
                                  <span className="font-medium">Patti Number:</span>
                                  <div>{billCheck.bill?.pattiNumber}</div>
                                </div>
                                <div>
                                  <span className="font-medium">Total Amount:</span>
                                  <div className="font-bold text-green-600">
                                    {formatCurrency(billCheck.bill?.totalAmount || 0)}
                                  </div>
                                </div>
                                <div>
                                  <span className="font-medium">Net Payable:</span>
                                  <div className="font-bold text-blue-600">
                                    {formatCurrency(billCheck.bill?.netPayable || 0)}
                                  </div>
                                </div>
                                <div>
                                  <span className="font-medium">Bags:</span>
                                  <div>{billCheck.bill?.totalBags || 0}</div>
                                </div>
                              </div>
                              
                              <div className="flex gap-2">
                                <Button
                                  onClick={() => downloadFarmerBillPDF(billCheck.bill)}
                                  variant="outline"
                                  size="sm"
                                >
                                  <Download className="h-4 w-4 mr-2" />
                                  Download PDF
                                </Button>
                                <Button
                                  onClick={() => printFarmerBill(billCheck.bill)}
                                  variant="outline"
                                  size="sm"
                                >
                                  <Printer className="h-4 w-4 mr-2" />
                                  Print
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <Alert>
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                              No farmer bill found for {selectedFarmer?.name}. You can generate a new one.
                            </AlertDescription>
                          </Alert>
                          
                          {lotsLoading ? (
                            <Alert>
                              <AlertCircle className="h-4 w-4" />
                              <AlertDescription>Loading farmer lots...</AlertDescription>
                            </Alert>
                          ) : farmerLots.length > 0 ? (
                            <div className="space-y-4">
                              <div className="text-sm text-gray-600">
                                <p className="font-medium">Completed lots for {selectedFarmer?.name}:</p>
                                <ul className="mt-2 space-y-1">
                                  {farmerLots.map((lot: any) => (
                                    <li key={lot.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                      <span>{lot.lotNumber}</span>
                                      <span className="text-green-600 font-medium">
                                        {lot.actualBagCount || lot.numberOfBags} bags • {lot.totalWeight?.toFixed(1)}kg • ₹{parseFloat(lot.lotPrice || 0).toLocaleString()}/quintal
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              </div>

                              <Card>
                                <CardHeader>
                                  <CardTitle className="text-lg">Bill Configuration</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                      <Label htmlFor="patti-number">Patti Number</Label>
                                      <Input
                                        id="patti-number"
                                        value={pattiNumber}
                                        onChange={(e) => setPattiNumber(e.target.value)}
                                        placeholder="Auto-generated if empty"
                                      />
                                    </div>
                                    <div>
                                      <Label htmlFor="hamali">Hamali (₹)</Label>
                                      <Input
                                        id="hamali"
                                        type="number"
                                        value={billData.hamali}
                                        onChange={(e) => setBillData(prev => ({ 
                                          ...prev, 
                                          hamali: parseFloat(e.target.value) || 0 
                                        }))}
                                      />
                                    </div>
                                    <div>
                                      <Label htmlFor="vehicle-rent">Vehicle Rent (₹)</Label>
                                      <Input
                                        id="vehicle-rent"
                                        type="number"
                                        value={billData.vehicleRent}
                                        onChange={(e) => setBillData(prev => ({ 
                                          ...prev, 
                                          vehicleRent: parseFloat(e.target.value) || 0 
                                        }))}
                                      />
                                    </div>
                                    <div>
                                      <Label htmlFor="advance">Advance (₹)</Label>
                                      <Input
                                        id="advance"
                                        type="number"
                                        value={billData.advance}
                                        onChange={(e) => setBillData(prev => ({ 
                                          ...prev, 
                                          advance: parseFloat(e.target.value) || 0 
                                        }))}
                                      />
                                    </div>
                                  </div>

                                  <Button
                                    onClick={() => {
                                      if (!selectedFarmerId || farmerLots.length === 0) {
                                        toast({
                                          title: "Error",
                                          description: "Please select a farmer with completed lots.",
                                          variant: "destructive",
                                        });
                                        return;
                                      }

                                      let finalPattiNumber = pattiNumber;
                                      if (!finalPattiNumber) {
                                        finalPattiNumber = generatePattiNumber();
                                        setPattiNumber(finalPattiNumber);
                                      }

                                      const lotIds = farmerLots.map((lot: any) => lot.id);
                                      const totalBags = farmerLots.reduce((sum: number, lot: any) => sum + (lot.actualBagCount || lot.numberOfBags || 0), 0);
                                      const totalWeight = farmerLots.reduce((sum: number, lot: any) => sum + (lot.totalWeight || 0), 0);
                                      const totalAmount = farmerLots.reduce((sum: number, lot: any) => {
                                        const weight = lot.totalWeight || 0;
                                        const price = parseFloat(lot.lotPrice || 0);
                                        const quintals = weight / 100; // Convert kg to quintals
                                        return sum + (quintals * price);
                                      }, 0);

                                      generateBillMutation.mutate({
                                        farmerId: parseInt(selectedFarmerId),
                                        pattiNumber: finalPattiNumber,
                                        billData: {
                                          ...billData,
                                          totalAmount,
                                          totalBags,
                                          totalWeight,
                                        },
                                        lotIds,
                                      });
                                    }}
                                    disabled={generateBillMutation.isPending || farmerLots.length === 0}
                                    className="w-full"
                                  >
                                    {generateBillMutation.isPending ? "Generating..." : "Generate & Save Bill"}
                                  </Button>
                                </CardContent>
                              </Card>
                            </div>
                          ) : (
                            <div className="text-sm text-gray-600">
                              <p>No completed lots found for {selectedFarmer?.name}.</p>
                              <p className="mt-2">To generate a farmer bill:</p>
                              <ol className="list-decimal list-inside mt-2 space-y-1">
                                <li>Create lots for this farmer</li>
                                <li>Add bags to the lots with proper weights</li>
                                <li>Complete the lots to make them ready for billing</li>
                              </ol>
                            </div>
                          )}
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
                  <CardTitle>Farmer Bill History</CardTitle>
                  <CardDescription>
                    View all historical farmer bills with date range filtering
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="farmer-history">Select Farmer</Label>
                      <Select
                        value={selectedFarmerId}
                        onValueChange={setSelectedFarmerId}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a farmer..." />
                        </SelectTrigger>
                        <SelectContent>
                          {farmers.map((farmer) => (
                            <SelectItem key={farmer.id} value={farmer.id.toString()}>
                              {farmer.name} - {farmer.place}
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

                  {selectedFarmerId && (
                    <div className="space-y-4">
                      {historicalBillsLoading ? (
                        <Alert>
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>Loading bill history...</AlertDescription>
                        </Alert>
                      ) : historicalBills.length > 0 ? (
                        <div className="border rounded-lg overflow-hidden">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Patti Number</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Total Amount</TableHead>
                                <TableHead>Net Payable</TableHead>
                                <TableHead>Bags</TableHead>
                                <TableHead>Weight (Kg)</TableHead>
                                <TableHead>Created By</TableHead>
                                <TableHead>Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {historicalBills.map((bill) => (
                                <TableRow key={bill.id}>
                                  <TableCell className="font-medium">
                                    {bill.pattiNumber}
                                  </TableCell>
                                  <TableCell>{formatDate(bill.createdAt)}</TableCell>
                                  <TableCell>{formatCurrency(bill.totalAmount)}</TableCell>
                                  <TableCell className="font-semibold text-green-600">
                                    {formatCurrency(bill.netPayable)}
                                  </TableCell>
                                  <TableCell>{bill.totalBags}</TableCell>
                                  <TableCell>{parseFloat(bill.totalWeight).toFixed(2)}</TableCell>
                                  <TableCell>
                                    <div className="text-sm">
                                      <div className="font-medium">{bill.creatorName}</div>
                                      <div className="text-gray-500">@{bill.creatorUsername}</div>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <Dialog>
                                      <DialogTrigger asChild>
                                        <Button variant="outline" size="sm">
                                          <Eye className="h-4 w-4 mr-1" />
                                          View
                                        </Button>
                                      </DialogTrigger>
                                      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                                        <DialogHeader>
                                          <DialogTitle>Bill Details - {bill.pattiNumber}</DialogTitle>
                                        </DialogHeader>
                                        <div className="space-y-4">
                                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                            <div>
                                              <span className="font-medium">Patti Number:</span>
                                              <div>{bill.pattiNumber}</div>
                                            </div>
                                            <div>
                                              <span className="font-medium">Total Amount:</span>
                                              <div className="font-bold text-green-600">
                                                {formatCurrency(bill.totalAmount)}
                                              </div>
                                            </div>
                                            <div>
                                              <span className="font-medium">Net Payable:</span>
                                              <div className="font-bold text-blue-600">
                                                {formatCurrency(bill.netPayable)}
                                              </div>
                                            </div>
                                            <div>
                                              <span className="font-medium">Bags:</span>
                                              <div>{bill.totalBags}</div>
                                            </div>
                                          </div>
                                          
                                          <div className="flex justify-center gap-2">
                                            <Button
                                              onClick={() => downloadFarmerBillPDF(bill)}
                                              variant="outline"
                                              size="sm"
                                            >
                                              <Download className="h-4 w-4 mr-2" />
                                              Download PDF
                                            </Button>
                                            <Button
                                              onClick={() => printFarmerBill(bill)}
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
                            No bills found for {selectedFarmer?.name} in the selected date range.
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