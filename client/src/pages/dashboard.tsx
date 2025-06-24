import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Navigation } from "@/components/navigation";
import { Users, Package, TrendingUp, ShoppingBag } from "lucide-react";
import { useI18n } from "@/lib/i18n";

interface DashboardStats {
  totalFarmers: number;
  activeLots: number;
  totalBagsToday: number;
  revenueToday: number;
}

export default function Dashboard() {
  const { user } = useAuth();
  const { t } = useI18n();

  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
    enabled: !!user?.tenantId,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader className="space-y-0 pb-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const dashboardCards = [
    {
      title: t("dashboard.totalFarmers"),
      value: stats?.totalFarmers || 0,
      icon: Users,
      color: "text-blue-600",
    },
    {
      title: t("dashboard.activeLots"),
      value: stats?.activeLots || 0,
      icon: Package,
      color: "text-green-600",
    },
    {
      title: t("dashboard.bagsToday"),
      value: stats?.totalBagsToday || 0,
      icon: ShoppingBag,
      color: "text-yellow-600",
    },
    {
      title: t("dashboard.revenueToday"),
      value: `₹${stats?.revenueToday || 0}`,
      icon: TrendingUp,
      color: "text-purple-600",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">{t("dashboard.title")}</h1>
          <p className="text-muted-foreground">
            {t("dashboard.welcome")}, {user?.name}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {dashboardCards.map((card, index) => {
            const Icon = card.icon;
            return (
              <Card key={index}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {card.title}
                  </CardTitle>
                  <Icon className={`h-4 w-4 ${card.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{card.value}</div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}