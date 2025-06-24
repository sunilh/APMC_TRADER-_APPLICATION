import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Navigation } from "@/components/navigation";
import { LotForm } from "@/components/lot-form";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";
import { apiRequest } from "@/lib/queryClient";
import { Search, Plus, Package, Eye, Trash2 } from "lucide-react";
import { Lot, Farmer, Buyer } from "@shared/schema";

interface LotWithDetails extends Lot {
  farmer: Farmer;
  buyer?: Buyer;
}

export default function Lots() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: lots, isLoading } = useQuery<LotWithDetails[]>({
    queryKey: ["/api/lots", search],
    enabled: !!user?.tenantId,
  });

  const deleteLotMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest(`/api/lots/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lots"] });
      toast({
        title: "Lot deleted",
        description: "Lot has been deleted successfully",
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
    queryClient.invalidateQueries({ queryKey: ["/api/lots"] });
  };

  const getStatusBadge = (status: string) => {
    const statusColors = {
      pending: "bg-yellow-100 text-yellow-800",
      in_progress: "bg-blue-100 text-blue-800",
      completed: "bg-green-100 text-green-800",
      cancelled: "bg-red-100 text-red-800",
    };
    return statusColors[status as keyof typeof statusColors] || "bg-gray-100 text-gray-800";
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto p-6">
          <div className="grid grid-cols-1 gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="h-3 bg-gray-200 rounded"></div>
                    <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const filteredLots = lots?.filter((lot) =>
    lot.lotNumber.toLowerCase().includes(search.toLowerCase()) ||
    lot.farmer.name.toLowerCase().includes(search.toLowerCase()) ||
    lot.varietyGrade.toLowerCase().includes(search.toLowerCase())
  ) || [];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">{t("lots.title")}</h1>
            <p className="text-muted-foreground">{t("lots.subtitle")}</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                {t("lots.addNew")}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{t("lots.addNew")}</DialogTitle>
              </DialogHeader>
              <LotForm onSuccess={handleSuccess} />
            </DialogContent>
          </Dialog>
        </div>

        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("lots.searchPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {filteredLots.map((lot) => (
            <Card key={lot.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Package className="w-5 h-5" />
                      {lot.lotNumber}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {lot.farmer.name} • {lot.varietyGrade}
                    </p>
                  </div>
                  <Badge className={getStatusBadge(lot.status)}>
                    {lot.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <p className="text-sm font-medium">{t("lots.numberOfBags")}</p>
                    <p className="text-lg">{lot.numberOfBags}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">{t("lots.estimatedWeight")}</p>
                    <p className="text-lg">{lot.estimatedWeight} kg</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">{t("lots.rate")}</p>
                    <p className="text-lg">₹{lot.rate}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">{t("lots.totalValue")}</p>
                    <p className="text-lg">₹{lot.totalValue}</p>
                  </div>
                </div>
                
                <div className="flex justify-between items-center">
                  <div className="text-sm text-muted-foreground">
                    {lot.buyer && (
                      <span>Buyer: {lot.buyer.name}</span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Link href={`/lots/${lot.id}/bags`}>
                      <Button variant="outline" size="sm">
                        <Eye className="w-4 h-4 mr-2" />
                        {t("lots.viewBags")}
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteLotMutation.mutate(lot.id)}
                      disabled={deleteLotMutation.isPending}
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

        {filteredLots.length === 0 && (
          <div className="text-center py-8">
            <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">{t("lots.noLotsFound")}</h3>
            <p className="text-muted-foreground mb-4">{t("lots.noLotsDescription")}</p>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  {t("lots.addFirst")}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{t("lots.addNew")}</DialogTitle>
                </DialogHeader>
                <LotForm onSuccess={handleSuccess} />
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>
    </div>
  );
}