import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, Download, Eye, Filter } from "lucide-react";
import { format } from "date-fns";

interface PurchaseInvoice {
  id: number;
  invoiceNumber: string;
  invoiceDate: string;
  traderName: string;
  traderContact: string;
  itemsTotal: string;
  taxAmount: string;
  netAmount: string;
  buyerId: number;
  buyerName?: string;
  notes?: string;
  createdAt: string;
}

interface Buyer {
  id: number;
  companyName: string;
  contactPerson: string;
  mobile: string;
}

export default function InvoiceReports() {
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    buyerId: "all"
  });

  const [appliedFilters, setAppliedFilters] = useState(filters);

  // Get buyers for filter dropdown
  const { data: buyers = [] } = useQuery<Buyer[]>({
    queryKey: ["/api/buyers"],
  });

  // Get invoices with current filters
  const { data: invoices = [], isLoading } = useQuery<PurchaseInvoice[]>({
    queryKey: ["/api/purchase-invoices", appliedFilters.buyerId, appliedFilters.startDate, appliedFilters.endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (appliedFilters.buyerId && appliedFilters.buyerId !== "all") params.append('buyerId', appliedFilters.buyerId);
      if (appliedFilters.startDate) params.append('startDate', appliedFilters.startDate);
      if (appliedFilters.endDate) params.append('endDate', appliedFilters.endDate);
      
      const response = await fetch(`/api/purchase-invoices?${params}`);
      if (!response.ok) throw new Error('Failed to fetch invoices');
      return response.json();
    }
  });

  const applyFilters = () => {
    setAppliedFilters({ ...filters });
  };

  const clearFilters = () => {
    const emptyFilters = { startDate: "", endDate: "", buyerId: "all" };
    setFilters(emptyFilters);
    setAppliedFilters(emptyFilters);
  };

  const downloadCSV = () => {
    const headers = ['Invoice Number', 'Date', 'Trader Name', 'Contact', 'Items Total', 'Tax Amount', 'Net Amount', 'Notes'];
    const csvContent = [
      headers.join(','),
      ...invoices.map(inv => [
        inv.invoiceNumber,
        format(new Date(inv.invoiceDate), 'dd/MM/yyyy'),
        `"${inv.traderName}"`,
        inv.traderContact,
        inv.itemsTotal,
        inv.taxAmount,
        inv.netAmount,
        `"${inv.notes || ''}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoice-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const totalAmount = invoices.reduce((sum, inv) => sum + parseFloat(inv.netAmount || '0'), 0);
  const totalTax = invoices.reduce((sum, inv) => sum + parseFloat(inv.taxAmount || '0'), 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Invoice Reports</h1>
          <p className="text-muted-foreground">Track and analyze purchase invoices with date range filtering</p>
        </div>
        <Button onClick={downloadCSV} disabled={invoices.length === 0}>
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Filters Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
          <CardDescription>Filter invoices by date range and buyer</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                  <SelectItem value="all">All Buyers</SelectItem>
                  {buyers.map((buyer) => (
                    <SelectItem key={buyer.id} value={buyer.id.toString()}>
                      {buyer.companyName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end gap-2">
              <Button onClick={applyFilters} className="flex-1">
                Apply Filters
              </Button>
              <Button variant="outline" onClick={clearFilters}>
                Clear
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Invoices</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{invoices.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Tax Amount</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{totalTax.toLocaleString('en-IN')}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Net Amount</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{totalAmount.toLocaleString('en-IN')}</div>
          </CardContent>
        </Card>
      </div>

      {/* Invoices Table */}
      <Card>
        <CardHeader>
          <CardTitle>Purchase Invoices</CardTitle>
          <CardDescription>
            {appliedFilters.startDate || appliedFilters.endDate ? 
              `Showing invoices ${appliedFilters.startDate ? `from ${format(new Date(appliedFilters.startDate), 'dd/MM/yyyy')}` : ''} ${appliedFilters.endDate ? `to ${format(new Date(appliedFilters.endDate), 'dd/MM/yyyy')}` : ''}` :
              'Showing all invoices'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-4">Loading invoices...</div>
          ) : invoices.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No invoices found for the selected criteria
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice Number</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Trader Name</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead className="text-right">Items Total</TableHead>
                    <TableHead className="text-right">Tax Amount</TableHead>
                    <TableHead className="text-right">Net Amount</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                      <TableCell>{format(new Date(invoice.invoiceDate), 'dd/MM/yyyy')}</TableCell>
                      <TableCell>{invoice.traderName}</TableCell>
                      <TableCell>{invoice.traderContact}</TableCell>
                      <TableCell className="text-right">₹{parseFloat(invoice.itemsTotal).toLocaleString('en-IN')}</TableCell>
                      <TableCell className="text-right">₹{parseFloat(invoice.taxAmount).toLocaleString('en-IN')}</TableCell>
                      <TableCell className="text-right font-medium">₹{parseFloat(invoice.netAmount).toLocaleString('en-IN')}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}