import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Navigation } from "@/components/navigation";
import { FarmerForm } from "@/components/farmer-form";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";
import { apiRequest } from "@/lib/queryClient";
import { Search, Plus, User, Phone, MapPin, Edit, Trash2 } from "lucide-react";
import { Farmer } from "@shared/schema";

export default function Farmers() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingFarmer, setEditingFarmer] = useState<Farmer | null>(null);

  const { data: farmers, isLoading } = useQuery<Farmer[]>({
    queryKey: ["/api/farmers", search],
    enabled: !!user?.tenantId,
  });

  const deleteFarmerMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest(`/api/farmers/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/farmers"] });
      toast({
        title: "Farmer deleted",
        description: "Farmer has been deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSuccess = () => {
    setIsDialogOpen(false);
    setEditingFarmer(null);
    queryClient.invalidateQueries({ queryKey: ["/api/farmers"] });
  };

  const handleEdit = (farmer: Farmer) => {
    setEditingFarmer(farmer);
    setIsDialogOpen(true);
  };

  const handleAddNew = () => {
    setEditingFarmer(null);
    setIsDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="h-3 bg-gray-200 rounded"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const filteredFarmers = farmers?.filter((farmer) =>
    farmer.name.toLowerCase().includes(search.toLowerCase()) ||
    farmer.mobile.includes(search) ||
    farmer.place.toLowerCase().includes(search.toLowerCase())
  ) || [];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">{t("farmers.title")}</h1>
            <p className="text-muted-foreground">{t("farmers.subtitle")}</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleAddNew}>
                <Plus className="w-4 h-4 mr-2" />
                {t("farmers.addNew")}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingFarmer ? t("farmers.editFarmer") : t("farmers.addNew")}
                </DialogTitle>
              </DialogHeader>
              <FarmerForm farmer={editingFarmer} onSuccess={handleSuccess} />
            </DialogContent>
          </Dialog>
        </div>

        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("farmers.searchPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredFarmers.map((farmer) => (
            <Card key={farmer.id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  {farmer.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <span>{farmer.mobile}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <span>{farmer.place}</span>
                  </div>
                  {farmer.email && (
                    <div className="text-sm text-muted-foreground">
                      {farmer.email}
                    </div>
                  )}
                </div>
                
                <div className="flex justify-between items-center mt-4">
                  <div className="text-sm text-muted-foreground">
                    ID: {farmer.farmerId}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(farmer)}
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      {t("common.edit")}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteFarmerMutation.mutate(farmer.id)}
                      disabled={deleteFarmerMutation.isPending}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      {t("common.delete")}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredFarmers.length === 0 && (
          <div className="text-center py-8">
            <User className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">{t("farmers.noFarmersFound")}</h3>
            <p className="text-muted-foreground mb-4">{t("farmers.noFarmersDescription")}</p>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={handleAddNew}>
                  <Plus className="w-4 h-4 mr-2" />
                  {t("farmers.addFirst")}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{t("farmers.addNew")}</DialogTitle>
                </DialogHeader>
                <FarmerForm farmer={null} onSuccess={handleSuccess} />
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>
    </div>
  );
}