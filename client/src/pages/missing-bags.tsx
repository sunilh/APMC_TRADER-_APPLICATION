import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Navigation } from "@/components/navigation";
import { AlertTriangle, CheckCircle, Package, RefreshCw, Calendar, User, Hash, ExternalLink } from "lucide-react";
import { Link } from "wouter";

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
  totalLotsForDate: number;
  lotsWithMissingBags: number;
  lotsComplete: number;
  totalMissingBags: number;
  totalEmptyWeightBags: number;
  date: string;
}

interface MissingBagsResponse {
  summary: MissingBagsSummary;
  missingBagsDetails: MissingBagDetail[];
  dateLots: any[];
}

export default function MissingBagsPage() {
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [refreshKey, setRefreshKey] = useState(0);

  const { data: missingBagsData, isLoading, refetch } = useQuery<MissingBagsResponse>({
    queryKey: ['/api/missing-bags', selectedDate, refreshKey],
    queryFn: async () => {
      const response = await fetch(`/api/missing-bags?date=${selectedDate}`);
      if (!response.ok) throw new Error('Failed to fetch missing bags data');
      return response.json();
    }
  });

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
    refetch();
  };

  const handleDateChange = (date: string) => {
    setSelectedDate(date);
  };

  const summary = missingBagsData?.summary;
  const missingBags = missingBagsData?.missingBagsDetails || [];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Missing Bags Detection</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Monitor and track incomplete bag entries across lots
          </p>
        </div>

        {/* Date Selection and Controls */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Analysis Date Selection
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
              <div className="flex-1 max-w-sm">
                <Label htmlFor="analysis-date" className="text-sm font-medium">
                  Select Date
                </Label>
                <Input
                  id="analysis-date"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => handleDateChange(e.target.value)}
                  className="mt-1"
                />
              </div>
              <Button onClick={handleRefresh} variant="outline" className="gap-2">
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh Analysis
              </Button>
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
              <p className="text-gray-600 dark:text-gray-400">Analyzing lots for missing bags...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            {summary && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Lots</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                          {summary.totalLotsForDate}
                        </p>
                      </div>
                      <Package className="h-8 w-8 text-blue-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Complete Lots</p>
                        <p className="text-2xl font-bold text-green-600">
                          {summary.lotsComplete}
                        </p>
                      </div>
                      <CheckCircle className="h-8 w-8 text-green-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Incomplete Lots</p>
                        <p className="text-2xl font-bold text-red-600">
                          {summary.lotsWithMissingBags}
                        </p>
                      </div>
                      <AlertTriangle className="h-8 w-8 text-red-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Missing Bags</p>
                        <p className="text-2xl font-bold text-orange-600">
                          {summary.totalMissingBags}
                        </p>
                      </div>
                      <Hash className="h-8 w-8 text-orange-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Empty Weights</p>
                        <p className="text-2xl font-bold text-yellow-600">
                          {summary.totalEmptyWeightBags}
                        </p>
                      </div>
                      <Package className="h-8 w-8 text-yellow-600" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Status Alert */}
            {summary && (
              <Alert className={summary.lotsWithMissingBags > 0 ? "border-red-200 bg-red-50 mb-6" : "border-green-200 bg-green-50 mb-6"}>
                {summary.lotsWithMissingBags > 0 ? (
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                ) : (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                )}
                <AlertDescription>
                  {summary.lotsWithMissingBags > 0 ? (
                    <div className="text-red-800">
                      <strong>Action Required:</strong> {summary.lotsWithMissingBags} lots have incomplete bag entries on {summary.date}. 
                      Please complete missing bag entries to ensure accurate tracking.
                    </div>
                  ) : (
                    <div className="text-green-800">
                      <strong>All Complete:</strong> All {summary.totalLotsForDate} lots have complete bag entries on {summary.date}. 
                      No missing bags detected.
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {/* Missing Bags Details */}
            {missingBags.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                    Lots Requiring Attention ({missingBags.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {missingBags.map((lot) => (
                      <div key={lot.lotId} className="border border-red-200 rounded-lg p-4 bg-red-50 dark:bg-red-900/20">
                        {/* Lot Header */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <Badge variant="outline" className="font-mono text-red-800 border-red-300">
                              {lot.lotNumber}
                            </Badge>
                            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                              <User className="h-4 w-4" />
                              {lot.farmerName}
                            </div>
                            <Badge variant={lot.status === 'active' ? 'default' : 'secondary'}>
                              {lot.status}
                            </Badge>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium">
                              {lot.enteredBags}/{lot.totalBags} bags entered
                            </div>
                            <div className="text-xs text-gray-500">
                              {lot.completionPercentage}% complete
                            </div>
                          </div>
                        </div>

                        {/* Missing Bags Info */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {lot.missingBagNumbers.length > 0 && (
                            <div className="bg-white dark:bg-gray-800 p-3 rounded border-l-4 border-red-500">
                              <h4 className="font-medium text-red-800 dark:text-red-400 mb-2">
                                Missing Bags ({lot.missingCount})
                              </h4>
                              <div className="flex flex-wrap gap-1">
                                {lot.missingBagNumbers.map((bagNum) => (
                                  <Badge key={bagNum} variant="destructive" className="text-xs">
                                    #{bagNum}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          {lot.emptyWeightBags.length > 0 && (
                            <div className="bg-white dark:bg-gray-800 p-3 rounded border-l-4 border-yellow-500">
                              <h4 className="font-medium text-yellow-800 dark:text-yellow-400 mb-2">
                                Empty Weight Bags ({lot.emptyWeightCount})
                              </h4>
                              <div className="flex flex-wrap gap-1">
                                {lot.emptyWeightBags.map((bagNum) => (
                                  <Badge key={bagNum} variant="outline" className="text-xs border-yellow-500 text-yellow-700">
                                    #{bagNum}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Action Button */}
                        <div className="mt-4 pt-3 border-t border-red-200">
                          <Link href="/lots">
                            <Button size="sm" variant="outline" className="gap-2">
                              <ExternalLink className="h-4 w-4" />
                              Go to Lots Page
                            </Button>
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : summary && summary.totalLotsForDate > 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    All Lots Complete!
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    All {summary.totalLotsForDate} lots on {summary.date} have complete bag entries.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    No Lots Found
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    No lots were created on {selectedDate}.
                  </p>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}