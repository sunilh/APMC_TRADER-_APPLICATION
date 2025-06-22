import { useParams, useLocation } from "wouter";
import { Navigation } from "@/components/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function BagEntrySimple() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const lotId = parseInt(params.id as string);

  console.log("Simple BagEntry - params:", params, "lotId:", lotId);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardContent className="p-8">
            <h1 className="text-2xl font-bold mb-4">Bag Entry Test Page</h1>
            <p>Lot ID: {lotId}</p>
            <p>Params: {JSON.stringify(params)}</p>
            <Button 
              onClick={() => setLocation("/lots")}
              className="mt-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Lots
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}