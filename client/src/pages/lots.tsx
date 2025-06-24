import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Navigation } from "@/components/navigation";
import { LotForm } from "@/components/lot-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Search, Edit, Printer, Package } from "lucide-react";
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

  const { data: lots, isLoading } = useQuery<Lot[]>({
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

  const printMutation = useMutation({
    mutationFn: async (lot: Lot) => {
      const apmcData = {
        place: lot.farmer.place,
        traderName: "APMC Trader", // This should come from settings or user data
        traderCode: "TRADER001", // This should come from settings
        date: formatDateForAPMC(new Date()),
        lots: [{
          lotNumber: lot.lotNumber,
          farmerName: lot.farmer.name,
          place: lot.farmer.place,
          numberOfBags: lot.numberOfBags
        }]
      };
      
      await generateAPMCPDF(apmcData);
      return lot;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "APMC format generated successfully",
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

  const handlePrint = (lot: Lot) => {
    printMutation.mutate(lot);
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
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Lot Management</h1>
          
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                type="text"
                placeholder="Search lots by lot number, farmer name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full sm:w-80"
              />
            </div>
            
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
                          <div className="font-medium text-gray-900">{lot.farmer.name}</div>
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
                            <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80">
                              <Package className="h-4 w-4 mr-1" />
                              Bag Entry
                            </Button>
                          </Link>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-secondary hover:text-secondary/80"
                            onClick={() => handlePrint(lot)}
                            disabled={printMutation.isPending}
                          >
                            <Printer className="h-4 w-4 mr-1" />
                            Print
                          </Button>
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
                          <h3 className="text-lg font-medium text-gray-900">No lots found</h3>
                          <p className="text-gray-500 mt-1">
                            {searchTerm 
                              ? "Try adjusting your search terms"
                              : "Get started by creating your first lot"
                            }
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
