import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Navigation } from "@/components/navigation";
import { LotForm } from "@/components/lot-form";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Plus,
  Search,
  Package,
  CheckCircle,
  Printer,
} from "lucide-react";
import { Link } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
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

export default function Lots() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  const { data: allLots, isLoading } = useQuery<Lot[]>({
    queryKey: ["/api/lots", searchTerm],
    queryFn: async () => {
      const url = searchTerm
        ? `/api/lots?search=${encodeURIComponent(searchTerm)}`
        : "/api/lots";
      const response = await fetch(url, { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch lots");
      return response.json();
    },
  });

  // Filter only active lots
  const lots = allLots?.filter(lot => lot.status === "active") || [];

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

  const handlePrintActiveLots = () => {
    const printContent = `
      <html>
        <head>
          <title>Active Lots Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { text-align: center; color: #333; margin-bottom: 30px; }
            .header { text-align: center; margin-bottom: 20px; }
            .date { font-size: 14px; color: #666; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f8f9fa; font-weight: bold; }
            .text-center { text-align: center; }
            .no-data { text-align: center; padding: 40px; color: #666; }
            @media print {
              body { margin: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Active Lots Report</h1>
            <div class="date">Generated on: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</div>
            <div class="date">Trader: ${tenant?.name || 'N/A'}</div>
          </div>
          
          ${lots && lots.length > 0 ? `
            <table>
              <thead>
                <tr>
                  <th>Lot Number</th>
                  <th>Farmer Details</th>
                  <th>Bags & Variety</th>
                  <th>Financial Details</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${lots.map(lot => `
                  <tr>
                    <td><strong>${lot.lotNumber}</strong></td>
                    <td>
                      <strong>${lot.farmer.name}</strong><br>
                      ${lot.farmer.mobile}<br>
                      ${lot.farmer.place}
                    </td>
                    <td>
                      <strong>${lot.numberOfBags} bags</strong><br>
                      ${lot.varietyGrade}
                    </td>
                    <td>
                      Vehicle Rent: ₹${lot.vehicleRent}<br>
                      Advance: ₹${lot.advance}<br>
                      Unload Hamali: ₹${lot.unloadHamali}<br>
                      ${lot.lotPrice ? `Price: ₹${lot.lotPrice}` : 'Price: Not Set'}
                    </td>
                    <td>
                      <span style="background: #fef3c7; color: #d97706; padding: 2px 8px; border-radius: 4px; font-size: 12px;">
                        ${lot.status.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            <div style="margin-top: 30px; text-align: center; font-size: 14px; color: #666;">
              Total Active Lots: ${lots.length}
            </div>
          ` : `
            <div class="no-data">
              <h3>No Active Lots Found</h3>
              <p>All lots have been completed or no lots exist.</p>
            </div>
          `}
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.onload = () => {
        printWindow.print();
        printWindow.close();
      };
    }
  };

  const handlePrintAllLots = async () => {
    if (!lots || !tenant) {
      toast({
        title: "Error",
        description: "Unable to print - missing data",
        variant: "destructive",
      });
      return;
    }

    const sortedLots = [...lots].sort((a, b) => {
      const lotA = parseInt(a.lotNumber.replace(/\D/g, ""), 10) || 0;
      const lotB = parseInt(b.lotNumber.replace(/\D/g, ""), 10) || 0;
      return lotA - lotB;
    });

    const apmcData = {
      place: tenant.place || tenant.name, // Use tenant place or name as fallback
      traderName: tenant.mobileNumber, // Use mobile number instead of trader name
      traderCode: tenant.apmcCode,
      traderAddress: `${tenant.address || tenant.mobileNumber} - Trader Code: ${tenant.apmcCode}`, // Include trader code in address
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
        description: "All lots printed successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: (error as Error).message,
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-blue-100 text-blue-800";
      case "completed":
        return "bg-green-100 text-green-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            Active Lots Management
          </h1>
          
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-blue-900">Active Lots Overview</h3>
                <p className="text-blue-700">Showing only active (incomplete) lots that need attention</p>
              </div>
              <div className="text-2xl font-bold text-blue-900">
                {lots?.length || 0} Active Lots
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                type="text"
                placeholder="Search active lots by lot number, farmer name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full sm:w-80"
              />
            </div>

            <div className="flex gap-2">
              <Button 
                variant="outline"
                onClick={handlePrintActiveLots}
                className="bg-green-50 border-green-300 text-green-700 hover:bg-green-100"
              >
                <Printer className="h-4 w-4 mr-2" />
                Print Active Lots
              </Button>
              
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
