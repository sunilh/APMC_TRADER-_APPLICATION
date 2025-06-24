import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Navigation } from "@/components/navigation";
import { Users, Package, Weight, DollarSign, Plus, Search, Edit, Printer } from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";

interface DashboardStats {
  totalFarmers: number;
  activeLots: number;
  totalBagsToday: number;
  revenueToday: number;
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

  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  const { data: lots, isLoading: lotsLoading } = useQuery<Lot[]>({
    queryKey: ["/api/lots"],
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Dashboard Overview */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard Overview</h1>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="bg-white shadow-sm border border-gray-200">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Users className="h-8 w-8 text-primary" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Total Farmers</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {statsLoading ? "-" : stats?.totalFarmers || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white shadow-sm border border-gray-200">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Package className="h-8 w-8 text-secondary" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Active Lots</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {statsLoading ? "-" : stats?.activeLots || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white shadow-sm border border-gray-200">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Weight className="h-8 w-8 text-warning" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Total Bags Today</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {statsLoading ? "-" : stats?.totalBagsToday || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white shadow-sm border border-gray-200">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <DollarSign className="h-8 w-8 text-success" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Revenue Today</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      ₹{statsLoading ? "-" : (stats?.revenueToday || 0).toLocaleString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {lotsLoading ? (
                  <tr>
                    <td colSpan={10} className="px-6 py-4 text-center text-gray-500">
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
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <Link href={`/lots/${lot.id}/bags`}>
                          <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80">
                            <Edit className="h-4 w-4 mr-1" />
                            Create Bag Details
                          </Button>
                        </Link>
                        <Button variant="ghost" size="sm" className="text-secondary hover:text-secondary/80">
                          <Printer className="h-4 w-4 mr-1" />
                          Print
                        </Button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={10} className="px-6 py-4 text-center text-gray-500">
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
