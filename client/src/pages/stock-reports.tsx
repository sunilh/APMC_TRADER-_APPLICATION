import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, TrendingUp, TrendingDown, Download, AlertTriangle } from "lucide-react";
import { format } from "date-fns";

interface StockInventory {
  id: number;
  itemName: string;
  itemDescription?: string;
  currentQuantity: string;
  availableQuantity: string;
  reservedQuantity: string;
  unit: string;
  avgPurchaseRate?: string;
  lastPurchaseRate?: string;
  lastPurchaseDate?: string;
  minimumStockLevel: string;
  buyerId: number;
  buyerName?: string;
}

interface StockMovement {
  id: number;
  movementType: string;
  referenceType: string;
  referenceId?: number;
  quantityChange: string;
  balanceAfter: string;
  ratePerUnit?: string;
  totalValue?: string;
  itemName?: string;
  unit?: string;
  createdAt: string;
  buyerId: number;
}

interface Buyer {
  id: number;
  companyName: string;
  contactPerson: string;
  mobile: string;
}

export default function StockReports() {
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    buyerId: "",
    itemName: ""
  });

  const [appliedFilters, setAppliedFilters] = useState(filters);

  // Get buyers for filter dropdown
  const { data: buyers = [] } = useQuery<Buyer[]>({
    queryKey: ["/api/buyers"],
  });

  // Get stock inventory
  const { data: inventory = [], isLoading: inventoryLoading } = useQuery<StockInventory[]>({
    queryKey: ["/api/stock-inventory", appliedFilters.buyerId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (appliedFilters.buyerId) params.append('buyerId', appliedFilters.buyerId);
      
      const response = await fetch(`/api/stock-inventory?${params}`);
      if (!response.ok) throw new Error('Failed to fetch inventory');
      return response.json();
    }
  });

  // Get stock movements
  const { data: movements = [], isLoading: movementsLoading } = useQuery<StockMovement[]>({
    queryKey: ["/api/stock-movements", appliedFilters.buyerId, appliedFilters.startDate, appliedFilters.endDate, appliedFilters.itemName],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (appliedFilters.buyerId) params.append('buyerId', appliedFilters.buyerId);
      if (appliedFilters.startDate) params.append('startDate', appliedFilters.startDate);
      if (appliedFilters.endDate) params.append('endDate', appliedFilters.endDate);
      if (appliedFilters.itemName) params.append('itemName', appliedFilters.itemName);
      
      const response = await fetch(`/api/stock-movements?${params}`);
      if (!response.ok) throw new Error('Failed to fetch movements');
      return response.json();
    }
  });

  const applyFilters = () => {
    setAppliedFilters({ ...filters });
  };

  const clearFilters = () => {
    const emptyFilters = { startDate: "", endDate: "", buyerId: "", itemName: "" };
    setFilters(emptyFilters);
    setAppliedFilters(emptyFilters);
  };

  const downloadInventoryCSV = () => {
    const headers = ['Item Name', 'Description', 'Current Qty', 'Available Qty', 'Unit', 'Avg Rate', 'Last Rate', 'Min Stock'];
    const csvContent = [
      headers.join(','),
      ...inventory.map(item => [
        `"${item.itemName}"`,
        `"${item.itemDescription || ''}"`,
        item.currentQuantity,
        item.availableQuantity,
        item.unit,
        item.avgPurchaseRate || '0',
        item.lastPurchaseRate || '0',
        item.minimumStockLevel
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stock-inventory-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const downloadMovementsCSV = () => {
    const headers = ['Date', 'Item', 'Movement Type', 'Quantity Change', 'Balance After', 'Rate', 'Total Value'];
    const csvContent = [
      headers.join(','),
      ...movements.map(mov => [
        format(new Date(mov.createdAt), 'dd/MM/yyyy HH:mm'),
        `"${mov.itemName || 'Unknown'}"`,
        mov.movementType,
        mov.quantityChange,
        mov.balanceAfter,
        mov.ratePerUnit || '0',
        mov.totalValue || '0'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stock-movements-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Calculate summary statistics
  const totalItems = inventory.length;
  const lowStockItems = inventory.filter(item => 
    parseFloat(item.availableQuantity) <= parseFloat(item.minimumStockLevel)
  ).length;
  const totalValue = inventory.reduce((sum, item) => 
    sum + (parseFloat(item.currentQuantity) * parseFloat(item.avgPurchaseRate || '0')), 0
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Stock Reports</h1>
          <p className="text-muted-foreground">Monitor inventory levels and track stock movements</p>
        </div>
      </div>

      {/* Filters Section */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Filter stock data by date range, buyer, and item name</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="buyer">Buyer</Label>
              <Select value={filters.buyerId} onValueChange={(value) => setFilters({ ...filters, buyerId: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="All Buyers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Buyers</SelectItem>
                  {buyers.map((buyer) => (
                    <SelectItem key={buyer.id} value={buyer.id.toString()}>
                      {buyer.companyName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="itemName">Item Name</Label>
              <Input
                id="itemName"
                placeholder="Search items..."
                value={filters.itemName}
                onChange={(e) => setFilters({ ...filters, itemName: e.target.value })}
              />
            </div>
            <div className="flex items-end gap-2">
              <Button onClick={applyFilters} className="flex-1">
                Apply
              </Button>
              <Button variant="outline" onClick={clearFilters}>
                Clear
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Package className="h-4 w-4" />
              Total Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalItems}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              Low Stock Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">{lowStockItems}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Stock Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{totalValue.toLocaleString('en-IN')}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Movements</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{movements.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for Inventory and Movements */}
      <Tabs defaultValue="inventory" className="space-y-4">
        <TabsList>
          <TabsTrigger value="inventory">Current Inventory</TabsTrigger>
          <TabsTrigger value="movements">Stock Movements</TabsTrigger>
        </TabsList>

        <TabsContent value="inventory">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Current Stock Inventory</CardTitle>
                  <CardDescription>Real-time inventory levels across all items</CardDescription>
                </div>
                <Button onClick={downloadInventoryCSV} disabled={inventory.length === 0}>
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {inventoryLoading ? (
                <div className="text-center py-4">Loading inventory...</div>
              ) : inventory.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No inventory items found
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item Name</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Current Qty</TableHead>
                        <TableHead className="text-right">Available Qty</TableHead>
                        <TableHead>Unit</TableHead>
                        <TableHead className="text-right">Avg Rate</TableHead>
                        <TableHead className="text-right">Stock Value</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {inventory.map((item) => {
                        const isLowStock = parseFloat(item.availableQuantity) <= parseFloat(item.minimumStockLevel);
                        const stockValue = parseFloat(item.currentQuantity) * parseFloat(item.avgPurchaseRate || '0');
                        
                        return (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">{item.itemName}</TableCell>
                            <TableCell>{item.itemDescription || '-'}</TableCell>
                            <TableCell className="text-right">{parseFloat(item.currentQuantity).toLocaleString()}</TableCell>
                            <TableCell className="text-right">{parseFloat(item.availableQuantity).toLocaleString()}</TableCell>
                            <TableCell>{item.unit}</TableCell>
                            <TableCell className="text-right">₹{parseFloat(item.avgPurchaseRate || '0').toLocaleString('en-IN')}</TableCell>
                            <TableCell className="text-right">₹{stockValue.toLocaleString('en-IN')}</TableCell>
                            <TableCell>
                              {isLowStock ? (
                                <Badge variant="destructive">Low Stock</Badge>
                              ) : (
                                <Badge variant="secondary">Good</Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="movements">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Stock Movements</CardTitle>
                  <CardDescription>Track all inventory transactions and changes</CardDescription>
                </div>
                <Button onClick={downloadMovementsCSV} disabled={movements.length === 0}>
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {movementsLoading ? (
                <div className="text-center py-4">Loading movements...</div>
              ) : movements.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No stock movements found for the selected criteria
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date & Time</TableHead>
                        <TableHead>Item Name</TableHead>
                        <TableHead>Movement Type</TableHead>
                        <TableHead className="text-right">Quantity Change</TableHead>
                        <TableHead className="text-right">Balance After</TableHead>
                        <TableHead className="text-right">Rate</TableHead>
                        <TableHead className="text-right">Total Value</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {movements.map((movement) => {
                        const isInbound = parseFloat(movement.quantityChange) > 0;
                        
                        return (
                          <TableRow key={movement.id}>
                            <TableCell>{format(new Date(movement.createdAt), 'dd/MM/yyyy HH:mm')}</TableCell>
                            <TableCell className="font-medium">{movement.itemName || 'Unknown'}</TableCell>
                            <TableCell>
                              <Badge variant={isInbound ? "secondary" : "outline"}>
                                {isInbound ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                                {movement.movementType}
                              </Badge>
                            </TableCell>
                            <TableCell className={`text-right ${isInbound ? 'text-green-600' : 'text-red-600'}`}>
                              {isInbound ? '+' : ''}{parseFloat(movement.quantityChange).toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right">{parseFloat(movement.balanceAfter).toLocaleString()}</TableCell>
                            <TableCell className="text-right">₹{parseFloat(movement.ratePerUnit || '0').toLocaleString('en-IN')}</TableCell>
                            <TableCell className="text-right">₹{parseFloat(movement.totalValue || '0').toLocaleString('en-IN')}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}