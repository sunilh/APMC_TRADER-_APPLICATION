import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Navigation } from "@/components/navigation";
import { LotForm } from "@/components/lot-form";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Plus,
  Search,
  Package,
  CheckCircle,
  Printer,
  Calendar,
  Filter,
} from "lucide-react";
import { Link } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { BackToDashboard } from "@/components/back-to-dashboard";
import { generateAPMCPDF, formatDateForAPMC } from "@/lib/pdf-generator";

interface Lot {
  id: number;
  lotNumber: string;
  farmerId: number;
  numberOfBags: number;
  vehicleRent: string;
  advance: string;
  varietyGrade: string;
  unloadHamali: string;
  lotPrice?: string;
  status: string;
  farmer: {
    name: string;
    mobile: string;
    place: string;
  };
  buyer?: {
    name: string;
  };
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "active":
      return "bg-yellow-100 text-yellow-800";
    case "completed":
      return "bg-green-100 text-green-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

export default function Lots() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]); // Today's date
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false);
  const [printStartDate, setPrintStartDate] = useState("");
  const [printEndDate, setPrintEndDate] = useState("");
  const [printType, setPrintType] = useState<"all" | "active" | "completed">("all");
  const { toast } = useToast();

  const { data: allLots, isLoading } = useQuery<Lot[]>({
    queryKey: ["/api/lots", searchTerm, selectedDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchTerm) params.append("search", searchTerm);
      if (selectedDate) params.append("date", selectedDate);
      
      const url = `/api/lots${params.toString() ? `?${params.toString()}` : ""}`;
      const response = await fetch(url, { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch lots");
      return response.json();
    },
  });

  // Show both active and completed lots from selected date
  const lots = allLots || [];

  const { data: tenant } = useQuery({
    queryKey: ["/api/tenant"],
    queryFn: async () => {
      const response = await fetch("/api/tenant", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch tenant info");
      return response.json();
    },
  });

  const completeLotMutation = useMutation({
    mutationFn: async (lotId: number) => {
      return await apiRequest("PUT", `/api/lots/${lotId}`, {
        status: "completed",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lots"] });
      toast({
        title: "Success",
        description: "Lot marked as completed and ready for billing",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleCompleteLot = (lotId: number) => {
    completeLotMutation.mutate(lotId);
  };

  const handlePrintAllLots = async () => {
    if (!allLots || !tenant) {
      toast({
        title: "Error",
        description: "Unable to print - missing data",
        variant: "destructive",
      });
      return;
    }

    // Filter lots based on selected criteria
    let filteredLots = allLots || [];
    
    // Filter by status
    if (printType === "active") {
      filteredLots = filteredLots.filter(lot => lot.status === "active");
    } else if (printType === "completed") {
      filteredLots = filteredLots.filter(lot => lot.status === "completed");
    }
    
    // Filter by date range
    if (printStartDate || printEndDate) {
      filteredLots = filteredLots.filter(lot => {
        const lotDate = new Date(lot.createdAt || Date.now()).toISOString().split('T')[0];
        const startMatch = !printStartDate || lotDate >= printStartDate;
        const endMatch = !printEndDate || lotDate <= printEndDate;
        return startMatch && endMatch;
      });
    }

    const sortedLots = [...filteredLots].sort((a, b) => {
      const lotA = parseInt(a.lotNumber.replace(/\D/g, ""), 10) || 0;
      const lotB = parseInt(b.lotNumber.replace(/\D/g, ""), 10) || 0;
      return lotA - lotB;
    });

    const apmcData = {
      place: tenant.place || tenant.name,
      traderName: tenant.name,
      traderMobile: tenant.mobileNumber || "N/A",
      traderCode: tenant.apmcCode,
      traderAddress: `${tenant.address || tenant.name} - Trader Code: ${tenant.apmcCode}`,
      date: formatDateForAPMC(new Date()),
      lots: sortedLots.map((lot) => ({
        lotNumber: lot.lotNumber,
        farmerName: lot.farmer.name,
        place: lot.farmer.place,
        numberOfBags: lot.numberOfBags,
      })),
    };

    try {
      await generateAPMCPDF(apmcData);
      toast({
        title: "Success",
        description: `${printType} lots printed successfully`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: (error as Error).message,
        variant: "destructive",
      });
    }

    // Close the print dialog
    setIsPrintDialogOpen(false);
  };



  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-8">
        <BackToDashboard />
        <div className="mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">
            Daily Lots Management
          </h1>
          
          <div className="mb-4 p-3 sm:p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex-1">
                <h3 className="text-base sm:text-lg font-medium text-blue-900">Daily Lots Overview</h3>
                <p className="text-sm text-blue-700">
                  Showing lots for {new Date(selectedDate).toLocaleDateString('en-IN')} - 
                  Active: {lots?.filter(lot => lot.status === 'active').length || 0}, 
                  Completed: {lots?.filter(lot => lot.status === 'completed').length || 0}
                </p>
              </div>
              <div className="text-xl sm:text-2xl font-bold text-blue-900 text-center sm:text-right">
                {lots?.length || 0} Total Lots
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:gap-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1 sm:flex-none">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  type="text"
                  placeholder="Search lots by lot number, farmer name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full sm:w-72 min-h-[44px]"
                />
              </div>
              
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full sm:w-40 min-h-[44px]"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <Dialog open={isPrintDialogOpen} onOpenChange={setIsPrintDialogOpen}>
                <DialogTrigger asChild>
                  <Button 
                    variant="outline"
                    className="bg-green-50 border-green-300 text-green-700 hover:bg-green-100 w-full sm:w-auto min-h-[44px]"
                  >
                    <Printer className="h-4 w-4 mr-2" />
                    Print Lots Report
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Print Lots Report</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="printType">Report Type</Label>
                      <div className="mt-2 space-y-2">
                        <label className="flex items-center space-x-2">
                          <input
                            type="radio"
                            name="printType"
                            value="all"
                            checked={printType === "all"}
                            onChange={(e) => setPrintType(e.target.value as any)}
                            className="w-4 h-4"
                          />
                          <span>All Lots (Active + Completed)</span>
                        </label>
                        <label className="flex items-center space-x-2">
                          <input
                            type="radio"
                            name="printType"
                            value="active"
                            checked={printType === "active"}
                            onChange={(e) => setPrintType(e.target.value as any)}
                            className="w-4 h-4"
                          />
                          <span>Active Lots Only</span>
                        </label>
                        <label className="flex items-center space-x-2">
                          <input
                            type="radio"
                            name="printType"
                            value="completed"
                            checked={printType === "completed"}
                            onChange={(e) => setPrintType(e.target.value as any)}
                            className="w-4 h-4"
                          />
                          <span>Completed Lots Only</span>
                        </label>
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="dateRange">Date Range (Optional)</Label>
                      <div className="mt-2 space-y-2">
                        <div>
                          <Label htmlFor="startDate" className="text-sm">Start Date</Label>
                          <Input
                            id="startDate"
                            type="date"
                            value={printStartDate}
                            onChange={(e) => setPrintStartDate(e.target.value)}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label htmlFor="endDate" className="text-sm">End Date</Label>
                          <Input
                            id="endDate"
                            type="date"
                            value={printEndDate}
                            onChange={(e) => setPrintEndDate(e.target.value)}
                            className="mt-1"
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-2 pt-4">
                      <Button
                        onClick={handlePrintAllLots}
                        className="flex-1 bg-green-600 hover:bg-green-700"
                      >
                        <Printer className="h-4 w-4 mr-2" />
                        Generate Report
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setIsPrintDialogOpen(false)}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-primary hover:bg-primary/90">
                    <Plus className="h-4 w-4 mr-2" />
                    Create New Lot
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Create New Lot</DialogTitle>
                  </DialogHeader>
                  <LotForm onSuccess={() => setIsDialogOpen(false)} />
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>

        {/* Lots Table */}
        <Card className="bg-white shadow-sm border border-gray-200">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Lot No.
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Farmer Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Bags & Variety
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Financial Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                      Loading lots...
                    </td>
                  </tr>
                ) : lots && lots.length > 0 ? (
                  lots.map((lot) => (
                    <tr key={lot.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {lot.lotNumber}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          <div className="font-medium text-gray-900">
                            {lot.farmer.name}
                          </div>
                          <div className="text-gray-500">{lot.farmer.mobile}</div>
                          <div className="text-gray-500">{lot.farmer.place}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          <div className="font-medium text-gray-900">
                            {lot.numberOfBags} bags
                          </div>
                          <div className="text-gray-500">{lot.varietyGrade}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          <div className="text-gray-900">
                            Vehicle: ₹{lot.vehicleRent}
                          </div>
                          <div className="text-gray-500">
                            Advance: ₹{lot.advance}
                          </div>
                          <div className="text-gray-500">
                            Hamali: ₹{lot.unloadHamali}
                          </div>
                          {lot.lotPrice && (
                            <div className="font-medium text-gray-900">
                              Price: ₹{lot.lotPrice}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge className={getStatusColor(lot.status)}>
                          {lot.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <Link href={`/lots/${lot.id}/bags`}>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-primary hover:text-primary/80"
                            >
                              <Package className="h-4 w-4 mr-1" />
                              Bag Entry
                            </Button>
                          </Link>
                          {lot.status === "active" && lot.lotPrice && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-green-600 hover:text-green-700"
                              onClick={() => handleCompleteLot(lot.id)}
                              disabled={completeLotMutation.isPending}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Complete
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center space-y-4">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                          <Package className="h-8 w-8 text-gray-400" />
                        </div>
                        <div>
                          <h3 className="text-lg font-medium text-gray-900">
                            No active lots found
                          </h3>
                          <p className="text-gray-500 mt-1">
                            {searchTerm
                              ? "No active lots match your search criteria"
                              : "All lots have been completed or no lots exist. Create a new lot to get started."}
                          </p>
                        </div>
                        {!searchTerm && (
                          <Button
                            onClick={() => setIsDialogOpen(true)}
                            className="bg-primary hover:bg-primary/90"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Create First Lot
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>


        </Card>
      </div>
    </div>
  );
}
