import { useQuery } from "@tanstack/react-query";
import { DashboardService } from "@/lib/api-services";
import { ApiEndpoints } from "@/lib/api-config";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Navigation } from "@/components/navigation";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Users, Package, Weight, DollarSign, Plus, Search, AlertTriangle, Building2, CheckCircle } from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";

interface DashboardStats {
  totalFarmers: number;
  activeLots: number;
  totalBagsToday: number;
  revenueToday: number;
}

interface LotCompletionStat {
  lotId: number;
  lotNumber: string;
  farmerName: string;
  expectedBags: number;
  actualBags: number;
  missingBags: number;
  completionPercentage: number;
}

interface MissingBagDetail {
  lotId: number;
  lotNumber: string;
  farmerId: number;
  farmerName: string;
  totalBags: number;
  enteredBags: number;
  missingBagNumbers: number[];
  emptyWeightBags: number[];
  missingCount: number;
  emptyWeightCount: number;
  completionPercentage: number;
  status: string;
  createdAt: string;
}

interface MissingBagsSummary {
  totalLotsToday: number;
  lotsWithMissingBags: number;
  lotsComplete: number;
  totalMissingBags: number;
  totalEmptyWeightBags: number;
  date: string;
}

interface MissingBagsResponse {
  summary: MissingBagsSummary;
  missingBagsDetails: MissingBagDetail[];
  todaysLots: any[];
}

interface Lot {
  id: number;
  lotNumber: string;
  farmerId: number;
  numberOfBags: number;
  vehicleRent: string;
  advance: string;
  varietyGrade: string;
  unloadHamali: string;
  farmer: {
    name: string;
    mobile: string;
    place: string;
  };
  buyer?: {
    name: string;
  };
}

export default function Dashboard() {
  const { user } = useAuth();

  // SuperAdmin Dashboard - no tenant-specific queries
  if (user?.role === 'super_admin') {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="p-3 sm:p-6">
          <div className="max-w-7xl mx-auto">
            <div className="mb-6 sm:mb-8">
              <h1 className="text-2xl sm:text-3xl font-bold">Super Admin Dashboard</h1>
              <p className="text-sm sm:text-base text-muted-foreground mt-2">
                Welcome, {user.name}! Manage tenant organizations here.
              </p>
            </div>
            
            <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-1">
              <Card>
                <CardContent className="p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold">Tenant Management</h3>
                      <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                        Create and manage APMC organizations
                      </p>
                    </div>
                    <Building2 className="h-6 w-6 sm:h-8 sm:w-8 text-primary flex-shrink-0" />
                  </div>
                  <div className="mt-4">
                    <Link href="/tenant-onboarding">
                      <Button className="w-full min-h-[44px] text-sm sm:text-base">
                        <Plus className="h-4 w-4 mr-2" />
                        Create New Tenant
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Regular tenant user dashboard with stats
  const { data: stats = { totalFarmers: 0, activeLots: 0, totalBagsToday: 0, revenueToday: 0 }, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: [ApiEndpoints.dashboard.stats()],
    queryFn: DashboardService.getStats,
    enabled: user?.role !== 'super_admin', // Only fetch for tenant users
  });

  const { data: lots = [], isLoading: lotsLoading } = useQuery<Lot[]>({
    queryKey: ["/api/lots"],
    enabled: user?.role !== 'super_admin', // Only fetch for tenant users
  });

  const { data: lotCompletion = [], isLoading: completionLoading } = useQuery<LotCompletionStat[]>({
    queryKey: ["/api/dashboard/lot-completion"],
  });

  const { data: missingBagsData, isLoading: missingBagsLoading } = useQuery<MissingBagsResponse>({
    queryKey: ["/api/missing-bags/today"],
    enabled: user?.role !== 'super_admin',
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-8">

        {/* Dashboard Overview - Mobile Optimized */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">Dashboard Overview</h1>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8">
            <Card className="bg-white shadow-sm border border-gray-200">
              <CardContent className="p-3 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <div className="flex-shrink-0 order-2 sm:order-1">
                    <Users className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
                  </div>
                  <div className="flex-1 order-1 sm:order-2 sm:ml-4">
                    <p className="text-xs sm:text-sm font-medium text-gray-500">Total Farmers</p>
                    <p className="text-lg sm:text-2xl font-semibold text-gray-900">
                      {statsLoading ? "-" : stats?.totalFarmers || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white shadow-sm border border-gray-200">
              <CardContent className="p-3 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <div className="flex-shrink-0 order-2 sm:order-1">
                    <Package className="h-6 w-6 sm:h-8 sm:w-8 text-secondary" />
                  </div>
                  <div className="flex-1 order-1 sm:order-2 sm:ml-4">
                    <p className="text-xs sm:text-sm font-medium text-gray-500">Active Lots</p>
                    <p className="text-lg sm:text-2xl font-semibold text-gray-900">
                      {statsLoading ? "-" : stats?.activeLots || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white shadow-sm border border-gray-200">
              <CardContent className="p-3 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <div className="flex-shrink-0 order-2 sm:order-1">
                    <Weight className="h-6 w-6 sm:h-8 sm:w-8 text-warning" />
                  </div>
                  <div className="flex-1 order-1 sm:order-2 sm:ml-4">
                    <p className="text-xs sm:text-sm font-medium text-gray-500">Total Bags Today</p>
                    <p className="text-lg sm:text-2xl font-semibold text-gray-900">
                      {statsLoading ? "-" : stats?.totalBagsToday || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white shadow-sm border border-gray-200">
              <CardContent className="p-3 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <div className="flex-shrink-0 order-2 sm:order-1">
                    <DollarSign className="h-6 w-6 sm:h-8 sm:w-8 text-success" />
                  </div>
                  <div className="flex-1 order-1 sm:order-2 sm:ml-4">
                    <p className="text-xs sm:text-sm font-medium text-gray-500">Revenue Today</p>
                    <p className="text-lg sm:text-2xl font-semibold text-gray-900">
                      ₹{statsLoading ? "-" : (stats?.revenueToday || 0).toLocaleString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Today's Missing Bags Alert */}
        {!missingBagsLoading && missingBagsData && (
          <div className="mb-6 sm:mb-8">
            {missingBagsData.summary.lotsWithMissingBags > 0 ? (
              <Alert className="border-red-200 bg-red-50">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <AlertDescription>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold text-red-900 mb-2">
                        Today's Missing Bags Detected ({missingBagsData.summary.date})
                      </h4>
                      <p className="text-red-700 text-sm mb-3">
                        {missingBagsData.summary.lotsWithMissingBags} lots have incomplete bag entries - 
                        {missingBagsData.summary.totalMissingBags} missing bags, {missingBagsData.summary.totalEmptyWeightBags} empty weights
                      </p>
                    </div>
                    
                    <div className="space-y-3">
                      {missingBagsData.missingBagsDetails.map((lot) => (
                        <div key={lot.lotId} className="bg-red-100 p-3 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="font-mono text-red-800 border-red-300">
                                {lot.lotNumber}
                              </Badge>
                              <span className="text-red-800 font-medium">{lot.farmerName}</span>
                            </div>
                            <div className="text-right">
                              <div className="text-red-900 font-semibold">
                                {lot.enteredBags}/{lot.totalBags} bags ({lot.completionPercentage}%)
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex flex-wrap gap-4 text-sm">
                            {lot.missingBagNumbers.length > 0 && (
                              <div>
                                <span className="text-red-700 font-medium">Missing: </span>
                                <span className="text-red-600">
                                  {lot.missingBagNumbers.slice(0, 5).map(n => `#${n}`).join(', ')}
                                  {lot.missingBagNumbers.length > 5 && ` +${lot.missingBagNumbers.length - 5} more`}
                                </span>
                              </div>
                            )}
                            {lot.emptyWeightBags.length > 0 && (
                              <div>
                                <span className="text-yellow-700 font-medium">No Weight: </span>
                                <span className="text-yellow-600">
                                  {lot.emptyWeightBags.slice(0, 5).map(n => `#${n}`).join(', ')}
                                  {lot.emptyWeightBags.length > 5 && ` +${lot.emptyWeightBags.length - 5} more`}
                                </span>
                              </div>
                            )}
                          </div>
                          
                          <div className="mt-2 flex gap-2">
                            <Link href={`/lots/${lot.lotId}/bags`}>
                              <Button size="sm" className="text-xs bg-red-600 hover:bg-red-700">
                                Fix Missing Bags
                              </Button>
                            </Link>
                            <Link href="/missing-bags">
                              <Button size="sm" variant="outline" className="text-xs border-red-300 text-red-700 hover:bg-red-50">
                                View Details
                              </Button>
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            ) : (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <AlertDescription>
                  <div className="text-green-800">
                    <span className="font-semibold">✅ All Today's Lots Complete!</span>
                    <span className="ml-2">
                      {missingBagsData.summary.totalLotsToday} lots processed with no missing bags detected.
                    </span>
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link href="/lots">
              <Button className="w-full h-auto p-4 text-left bg-primary hover:bg-primary/90 text-white">
                <div className="flex flex-col items-start">
                  <Plus className="h-5 w-5 mb-2" />
                  <h3 className="font-semibold">Create New Lot</h3>
                  <p className="text-sm opacity-90">Start a new lot entry</p>
                </div>
              </Button>
            </Link>
            
            <Link href="/farmers">
              <Button className="w-full h-auto p-4 text-left bg-secondary hover:bg-secondary/90 text-white">
                <div className="flex flex-col items-start">
                  <Users className="h-5 w-5 mb-2" />
                  <h3 className="font-semibold">Add Farmer</h3>
                  <p className="text-sm opacity-90">Register new farmer</p>
                </div>
              </Button>
            </Link>
            
            <Button className="w-full h-auto p-4 text-left bg-warning hover:bg-warning/90 text-white">
              <div className="flex flex-col items-start">
                <Package className="h-5 w-5 mb-2" />
                <h3 className="font-semibold">View Reports</h3>
                <p className="text-sm opacity-90">Generate APMC reports</p>
              </div>
            </Button>
          </div>
        </div>

        {/* Recent Lots Table */}
        <Card className="bg-white shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Recent Lots</h2>
              <div className="mt-4 sm:mt-0 flex space-x-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input 
                    type="text" 
                    placeholder="Search lots..." 
                    className="pl-10 pr-4 py-2"
                  />
                </div>
                <Link href="/lots">
                  <Button className="bg-primary hover:bg-primary/90">
                    <Plus className="h-4 w-4 mr-2" />
                    New Lot
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Lot No.
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Farmer Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Mobile
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Place
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    No. of Bags
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vehicle Rent
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Advance
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Variety/Grade
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Unload Hamali
                  </th>

                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {lotsLoading ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-4 text-center text-gray-500">
                      Loading lots...
                    </td>
                  </tr>
                ) : lots && lots.length > 0 ? (
                  lots.slice(0, 10).map((lot) => (
                    <tr key={lot.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {lot.lotNumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {lot.farmer.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {lot.farmer.mobile}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {lot.farmer.place}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {lot.numberOfBags}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ₹{lot.vehicleRent}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ₹{lot.advance}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {lot.varietyGrade}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ₹{lot.unloadHamali}
                      </td>

                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} className="px-6 py-4 text-center text-gray-500">
                      No lots found. Create your first lot to get started.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {lots && lots.length > 10 && (
            <div className="px-6 py-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Showing <span className="font-medium">1</span> to{" "}
                  <span className="font-medium">10</span> of{" "}
                  <span className="font-medium">{lots.length}</span> results
                </div>
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm">
                    Previous
                  </Button>
                  <Button variant="outline" size="sm" className="bg-primary text-white">
                    1
                  </Button>
                  <Button variant="outline" size="sm">
                    2
                  </Button>
                  <Button variant="outline" size="sm">
                    3
                  </Button>
                  <Button variant="outline" size="sm">
                    Next
                  </Button>
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
