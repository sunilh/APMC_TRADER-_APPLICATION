import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Navigation } from "@/components/navigation";
import { FarmerForm } from "@/components/farmer-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Search, Edit, Trash2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { BackToDashboard } from "@/components/back-to-dashboard";
import type { Farmer } from "@shared/schema";

export default function Farmers() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingFarmer, setEditingFarmer] = useState<Farmer | null>(null);
  const { toast } = useToast();

  const { data: farmers, isLoading } = useQuery<Farmer[]>({
    queryKey: ["/api/farmers", searchTerm],
    queryFn: async () => {
      const url = searchTerm 
        ? `/api/farmers?search=${encodeURIComponent(searchTerm)}`
        : "/api/farmers";
      const response = await fetch(url, { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch farmers");
      return response.json();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/farmers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/farmers"] });
      toast({
        title: "Success",
        description: "Farmer deleted successfully",
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

  const handleEdit = (farmer: Farmer) => {
    setEditingFarmer(farmer);
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this farmer?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingFarmer(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-8">
        <BackToDashboard />
        <div className="mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">Farmer Management</h1>
          
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <div className="relative w-full sm:w-auto">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                type="text"
                placeholder="Search farmers by name, mobile, or place..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full sm:w-80 min-h-[44px]"
              />
            </div>
            
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-primary hover:bg-primary/90 w-full sm:w-auto min-h-[44px]">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Farmer
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[95vw] max-w-2xl max-h-[95vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingFarmer ? "Edit Farmer" : "Add New Farmer"}
                  </DialogTitle>
                </DialogHeader>
                <FarmerForm 
                  farmer={editingFarmer} 
                  onSuccess={handleDialogClose}
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Farmers Grid - Mobile Optimized */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader className="pb-2 sm:pb-3">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    <div className="h-3 bg-gray-200 rounded"></div>
                    <div className="h-3 bg-gray-200 rounded w-5/6"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : farmers && farmers.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
            {farmers.map((farmer) => (
              <Card key={farmer.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2 sm:pb-3">
                  <CardTitle className="text-base sm:text-lg">{farmer.name}</CardTitle>
                  <p className="text-sm text-gray-600">{farmer.place}</p>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-1.5 sm:space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Mobile:</span>
                      <span className="font-medium">{farmer.mobile}</span>
                    </div>
                    {farmer.bankName && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Bank:</span>
                        <span className="font-medium truncate ml-2">{farmer.bankName}</span>
                      </div>
                    )}
                    {farmer.nameAsInBank && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Bank Name:</span>
                        <span className="font-medium truncate ml-2">{farmer.nameAsInBank}</span>
                      </div>
                    )}
                    {farmer.bankAccountNumber && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Account:</span>
                        <span className="font-medium">
                          ****{farmer.bankAccountNumber.slice(-4)}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex justify-end space-x-1 sm:space-x-2 mt-3 sm:mt-4 pt-3 sm:pt-4 border-t">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(farmer)}
                      className="text-primary hover:text-primary/80 min-h-[36px] px-2 sm:px-3"
                    >
                      <Edit className="h-4 w-4 sm:mr-1" />
                      <span className="hidden sm:inline">Edit</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(farmer.id)}
                      className="text-destructive hover:text-destructive/80 min-h-[36px] px-2 sm:px-3"
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4 sm:mr-1" />
                      <span className="hidden sm:inline">Delete</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="text-center py-12">
            <CardContent>
              <div className="flex flex-col items-center space-y-4">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                  <Plus className="h-8 w-8 text-gray-400" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900">No farmers found</h3>
                  <p className="text-gray-500 mt-1">
                    {searchTerm 
                      ? "Try adjusting your search terms"
                      : "Get started by adding your first farmer"
                    }
                  </p>
                </div>
                {!searchTerm && (
                  <Button 
                    onClick={() => setIsDialogOpen(true)}
                    className="bg-primary hover:bg-primary/90"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Farmer
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
