import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, CheckCircle, Package, RefreshCw, Calendar, User, Hash } from "lucide-react";

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

export default function MissingBagsPage() {
  const [refreshKey, setRefreshKey] = useState(0);

  const { data: missingBagsData, isLoading, refetch } = useQuery<MissingBagsResponse>({
    queryKey: ['/api/missing-bags/today', refreshKey],
  });

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
    refetch();
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
            <p className="text-gray-600">Analyzing today's lots for missing bags...</p>
          </div>
        </div>
      </div>
    );
  }

  const summary = missingBagsData?.summary;
  const missingBags = missingBagsData?.missingBagsDetails || [];

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Missing Bags Detection</h1>
          <p className="text-gray-600 mt-1">Today's lots analysis - {summary?.date}</p>
        </div>
        <Button onClick={handleRefresh} variant="outline" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh Analysis
        </Button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Calendar className="h-8 w-8 text-blue-600" />
                <div>
                  <p className="text-2xl font-bold text-blue-600">{summary.totalLotsToday}</p>
                  <p className="text-sm text-gray-600">Total Lots Today</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-8 w-8 text-green-600" />
                <div>
                  <p className="text-2xl font-bold text-green-600">{summary.lotsComplete}</p>
                  <p className="text-sm text-gray-600">Complete Lots</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-8 w-8 text-red-600" />
                <div>
                  <p className="text-2xl font-bold text-red-600">{summary.lotsWithMissingBags}</p>
                  <p className="text-sm text-gray-600">Lots with Issues</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Package className="h-8 w-8 text-orange-600" />
                <div>
                  <p className="text-2xl font-bold text-orange-600">{summary.totalMissingBags}</p>
                  <p className="text-sm text-gray-600">Missing Bags</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Hash className="h-8 w-8 text-yellow-600" />
                <div>
                  <p className="text-2xl font-bold text-yellow-600">{summary.totalEmptyWeightBags}</p>
                  <p className="text-sm text-gray-600">Empty Weights</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Status Alert */}
      {summary && (
        <Alert className={summary.lotsWithMissingBags === 0 ? "border-green-200 bg-green-50" : "border-yellow-200 bg-yellow-50"}>
          <AlertTriangle className={`h-4 w-4 ${summary.lotsWithMissingBags === 0 ? "text-green-600" : "text-yellow-600"}`} />
          <AlertDescription className={summary.lotsWithMissingBags === 0 ? "text-green-800" : "text-yellow-800"}>
            {summary.lotsWithMissingBags === 0 
              ? "🎉 All lots for today are complete! No missing bags detected."
              : `⚠️ Found ${summary.lotsWithMissingBags} lots with missing bags or empty weights that need attention.`
            }
          </AlertDescription>
        </Alert>
      )}

      {/* Missing Bags Details */}
      {missingBags.length > 0 && (
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
                <div key={lot.lotId} className="border rounded-lg p-4 bg-gray-50">
                  {/* Lot Header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="font-mono">
                        {lot.lotNumber}
                      </Badge>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
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
                      <Progress 
                        value={lot.completionPercentage} 
                        className="w-24 h-2 mt-1"
                      />
                    </div>
                  </div>

                  {/* Missing Bags */}
                  {lot.missingBagNumbers.length > 0 && (
                    <div className="mb-3">
                      <h4 className="text-sm font-medium text-red-700 mb-2">
                        Missing Bag Numbers ({lot.missingCount}):
                      </h4>
                      <div className="flex flex-wrap gap-1">
                        {lot.missingBagNumbers.map((bagNum) => (
                          <Badge key={bagNum} variant="destructive" className="text-xs">
                            Bag {bagNum}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Empty Weight Bags */}
                  {lot.emptyWeightBags.length > 0 && (
                    <div className="mb-3">
                      <h4 className="text-sm font-medium text-yellow-700 mb-2">
                        Bags with Empty Weights ({lot.emptyWeightCount}):
                      </h4>
                      <div className="flex flex-wrap gap-1">
                        {lot.emptyWeightBags.map((bagNum) => (
                          <Badge key={bagNum} variant="outline" className="text-xs border-yellow-500 text-yellow-700">
                            Bag {bagNum}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-2">
                    <Button 
                      size="sm" 
                      onClick={() => window.location.href = `/lots?lot=${lot.lotNumber}`}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      Fix Missing Bags
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => window.location.href = `/lots?farmer=${lot.farmerId}`}
                    >
                      View Farmer Lots
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>How to Use Missing Bags Detection</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">What This Shows:</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Only today's lots are analyzed</li>
                <li>• Missing bag numbers in sequence</li>
                <li>• Bags entered but without weight</li>
                <li>• Completion percentage for each lot</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">How to Fix:</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Click "Fix Missing Bags" to go to lot page</li>
                <li>• Enter missing bag numbers and weights</li>
                <li>• Use voice input for faster data entry</li>
                <li>• Refresh analysis to see updated status</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}