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
import { Download, Eye, CheckCircle, AlertCircle, Plus, History, FileText } from "lucide-react";
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

  const formatCurrency = (amount: number | string) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN');
  };

  const selectedFarmer = farmers.find(f => f.id === parseInt(selectedFarmerId));

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
                              
                              <Button
                                onClick={() => {
                                  window.open('/farmer-bill', '_blank');
                                }}
                                variant="outline"
                                size="sm"
                              >
                                <Download className="h-4 w-4 mr-2" />
                                Download Bill
                              </Button>
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
                          
                          <div className="text-sm text-gray-600">
                            <p>To generate a farmer bill:</p>
                            <ol className="list-decimal list-inside mt-2 space-y-1">
                              <li>Ensure the farmer has completed lots with proper bag entries</li>
                              <li>Set appropriate deduction amounts (hamali, vehicle rent, etc.)</li>
                              <li>Click "Generate & Save Bill" to create the farmer payment document</li>
                            </ol>
                          </div>
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
                                          
                                          <div className="text-center">
                                            <Button
                                              onClick={() => {
                                                window.open(`/farmer-bill?billId=${bill.id}`, '_blank');
                                              }}
                                              variant="outline"
                                              size="sm"
                                            >
                                              <Download className="h-4 w-4 mr-2" />
                                              Download Bill
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