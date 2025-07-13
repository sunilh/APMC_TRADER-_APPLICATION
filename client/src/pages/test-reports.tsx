import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function TestReports() {
  // Simple test to see if the APIs are working
  const { data: invoices = [], isLoading: invoicesLoading, error: invoicesError } = useQuery({
    queryKey: ["/api/purchase-invoices"],
  });

  const { data: inventory = [], isLoading: inventoryLoading, error: inventoryError } = useQuery({
    queryKey: ["/api/stock-inventory"],
  });

  const { data: movements = [], isLoading: movementsLoading, error: movementsError } = useQuery({
    queryKey: ["/api/stock-movements"],
  });

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold">Reports Test Page</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Purchase Invoices</CardTitle>
            <CardDescription>Testing invoice API</CardDescription>
          </CardHeader>
          <CardContent>
            {invoicesLoading && <p>Loading...</p>}
            {invoicesError && <p className="text-red-500">Error: {String(invoicesError)}</p>}
            {!invoicesLoading && !invoicesError && (
              <div>
                <p>Count: {invoices.length}</p>
                {invoices.length > 0 && (
                  <pre className="text-xs">{JSON.stringify(invoices[0], null, 2)}</pre>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Stock Inventory</CardTitle>
            <CardDescription>Testing inventory API</CardDescription>
          </CardHeader>
          <CardContent>
            {inventoryLoading && <p>Loading...</p>}
            {inventoryError && <p className="text-red-500">Error: {String(inventoryError)}</p>}
            {!inventoryLoading && !inventoryError && (
              <div>
                <p>Count: {inventory.length}</p>
                {inventory.length > 0 && (
                  <pre className="text-xs">{JSON.stringify(inventory[0], null, 2)}</pre>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Stock Movements</CardTitle>
            <CardDescription>Testing movements API</CardDescription>
          </CardHeader>
          <CardContent>
            {movementsLoading && <p>Loading...</p>}
            {movementsError && <p className="text-red-500">Error: {String(movementsError)}</p>}
            {!movementsLoading && !movementsError && (
              <div>
                <p>Count: {movements.length}</p>
                {movements.length > 0 && (
                  <pre className="text-xs">{JSON.stringify(movements[0], null, 2)}</pre>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}