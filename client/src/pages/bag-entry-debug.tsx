import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Navigation } from "@/components/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function BagEntryDebug() {
  const [, setLocation] = useLocation();
  const params = useParams();
  const lotId = parseInt(params.id as string);

  console.log("BagEntryDebug - params:", params, "lotId:", lotId);

  const { data: lot, isLoading, error } = useQuery({
    queryKey: ["/api/lots", lotId],
    queryFn: async () => {
      console.log("Fetching lot:", lotId);
      const response = await fetch(`/api/lots/${lotId}`, { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch lot");
      const data = await response.json();
      console.log("Lot data:", data);
      return data;
    },
    enabled: !isNaN(lotId),
  });

  console.log("Query state:", { lot, isLoading, error });

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Bag Entry Debug - Lot ID: {lotId}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <strong>Params:</strong> {JSON.stringify(params)}
              </div>
              <div>
                <strong>Lot ID:</strong> {lotId} (Valid: {!isNaN(lotId) ? "Yes" : "No"})
              </div>
              <div>
                <strong>Loading:</strong> {isLoading ? "Yes" : "No"}
              </div>
              <div>
                <strong>Error:</strong> {error ? error.message : "None"}
              </div>
              <div>
                <strong>Lot Data:</strong> {lot ? JSON.stringify(lot, null, 2) : "None"}
              </div>
              <Button onClick={() => setLocation("/lots")}>
                Back to Lots
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}