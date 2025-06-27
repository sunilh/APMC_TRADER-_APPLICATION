import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Search, Eye, CreditCard, Receipt, AlertCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { VoiceInput } from "@/components/voice-input";

interface BuyerSummary {
  buyerId: number;
  buyerName: string;
  buyerMobile: string;
  buyerContact: string;
  totalLots: number;
  completedLots: number;
  billGeneratedLots: number;
  pendingBills: number;
  totalAmountDue: string;
  totalAmountPaid: string;
  pendingPayments: number;
}

interface BuyerPurchase {
  lotId: number;
  lotNumber: string;
  farmerName: string;
  numberOfBags: number;
  varietyGrade: string;
  grade: string;
  status: string;
  billGenerated: boolean;
  billGeneratedAt: string;
  paymentStatus: string;
  amountDue: string;
  amountPaid: string;
  paymentDate: string;
  createdAt: string;
}

export default function BuyerTracking() {
  const [search, setSearch] = useState("");
  const [selectedBuyer, setSelectedBuyer] = useState<BuyerSummary | null>(null);
  const [paymentDialog, setPaymentDialog] = useState<{ open: boolean; purchase: BuyerPurchase | null }>({
    open: false,
    purchase: null,
  });
  const [paymentForm, setPaymentForm] = useState({
    paymentStatus: 'pending',
    amountPaid: '',
    paymentDate: '',
  });

  const queryClient = useQueryClient();

  const { data: buyerSummaries = [], isLoading, error } = useQuery<BuyerSummary[]>({
    queryKey: ['/api/buyers/summary', search],
    queryFn: () => apiRequest(`/api/buyers/summary?search=${encodeURIComponent(search)}`),
    retry: 3,
    retryDelay: 1000,
  });

  const { data: purchases = [] } = useQuery<BuyerPurchase[]>({
    queryKey: ['/api/buyers', selectedBuyer?.buyerId, 'purchases'],
    queryFn: () => apiRequest(`/api/buyers/${selectedBuyer?.buyerId}/purchases`),
    enabled: !!selectedBuyer,
  });

  const updatePaymentMutation = useMutation({
    mutationFn: async ({ lotId, data }: { lotId: number; data: any }) =>
      apiRequest(`/api/lots/${lotId}/payment`, { method: 'PATCH', body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/buyers', selectedBuyer?.buyerId, 'purchases'] });
      queryClient.invalidateQueries({ queryKey: ['/api/buyers/summary'] });
      setPaymentDialog({ open: false, purchase: null });
      setPaymentForm({ paymentStatus: 'pending', amountPaid: '', paymentDate: '' });
    },
  });

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return isNaN(num) ? '₹0' : `₹${num.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-IN');
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      active: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getPaymentStatusBadge = (status: string) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      partial: 'bg-orange-100 text-orange-800',
      paid: 'bg-green-100 text-green-800',
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const handlePaymentUpdate = () => {
    if (!paymentDialog.purchase) return;

    updatePaymentMutation.mutate({
      lotId: paymentDialog.purchase.lotId,
      data: {
        paymentStatus: paymentForm.paymentStatus,
        amountPaid: paymentForm.amountPaid ? parseFloat(paymentForm.amountPaid) : 0,
        paymentDate: paymentForm.paymentDate || null,
      },
    });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Buyer Purchase Tracking</h1>
          <p className="text-muted-foreground">
            Track buyer purchases, bill generation, and payment status
          </p>
        </div>
      </div>

      {/* Search Section */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <Label htmlFor="search">Search Buyers</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="Search by name, mobile, or contact person..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <VoiceInput
                  onResult={setSearch}
                  placeholder="Search buyers..."
                  type="text"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Buyers Summary Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Buyers Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading buyers...</div>
          ) : error ? (
            <div className="text-center py-8">
              <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
              <div className="text-red-600 font-medium">Error loading buyer data</div>
              <div className="text-sm text-muted-foreground mt-1">
                Please check your connection and try again
              </div>
            </div>
          ) : buyerSummaries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No buyers found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Buyer Details</TableHead>
                  <TableHead className="text-center">Total Lots</TableHead>
                  <TableHead className="text-center">Completed</TableHead>
                  <TableHead className="text-center">Bills Generated</TableHead>
                  <TableHead className="text-center">Pending Bills</TableHead>
                  <TableHead className="text-right">Amount Due</TableHead>
                  <TableHead className="text-right">Amount Paid</TableHead>
                  <TableHead className="text-center">Pending Payments</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {buyerSummaries.map((buyer) => (
                  <TableRow key={buyer.buyerId}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{buyer.buyerName}</div>
                        <div className="text-sm text-muted-foreground">
                          📱 {buyer.buyerMobile}
                        </div>
                        {buyer.buyerContact && (
                          <div className="text-sm text-muted-foreground">
                            👤 {buyer.buyerContact}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline">{buyer.totalLots}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className="bg-green-100 text-green-800">
                        {buyer.completedLots}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className="bg-blue-100 text-blue-800">
                        {buyer.billGeneratedLots}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {buyer.pendingBills > 0 ? (
                        <Badge className="bg-yellow-100 text-yellow-800">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          {buyer.pendingBills}
                        </Badge>
                      ) : (
                        <Badge variant="outline">0</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(buyer.totalAmountDue)}
                    </TableCell>
                    <TableCell className="text-right font-medium text-green-600">
                      {formatCurrency(buyer.totalAmountPaid)}
                    </TableCell>
                    <TableCell className="text-center">
                      {buyer.pendingPayments > 0 ? (
                        <Badge className="bg-red-100 text-red-800">
                          <CreditCard className="h-3 w-3 mr-1" />
                          {buyer.pendingPayments}
                        </Badge>
                      ) : (
                        <Badge variant="outline">0</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedBuyer(buyer)}
                        className="flex items-center gap-1"
                      >
                        <Eye className="h-4 w-4" />
                        View Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Detailed Purchase History Dialog */}
      <Dialog open={!!selectedBuyer} onOpenChange={() => setSelectedBuyer(null)}>
        <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Purchase History - {selectedBuyer?.buyerName}
            </DialogTitle>
          </DialogHeader>
          
          {selectedBuyer && (
            <div className="space-y-4">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-2xl font-bold">{selectedBuyer.totalLots}</div>
                    <div className="text-sm text-muted-foreground">Total Lots</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-2xl font-bold text-green-600">
                      {formatCurrency(selectedBuyer.totalAmountDue)}
                    </div>
                    <div className="text-sm text-muted-foreground">Amount Due</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-2xl font-bold text-blue-600">
                      {formatCurrency(selectedBuyer.totalAmountPaid)}
                    </div>
                    <div className="text-sm text-muted-foreground">Amount Paid</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-2xl font-bold text-red-600">
                      {selectedBuyer.pendingPayments}
                    </div>
                    <div className="text-sm text-muted-foreground">Pending Payments</div>
                  </CardContent>
                </Card>
              </div>

              {/* Purchase Details Table */}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Lot Details</TableHead>
                    <TableHead>Farmer</TableHead>
                    <TableHead>Variety/Grade</TableHead>
                    <TableHead className="text-center">Bags</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-center">Bill Status</TableHead>
                    <TableHead className="text-center">Payment Status</TableHead>
                    <TableHead className="text-right">Amount Due</TableHead>
                    <TableHead className="text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {purchases.map((purchase) => (
                    <TableRow key={purchase.lotId}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{purchase.lotNumber}</div>
                          <div className="text-sm text-muted-foreground">
                            {formatDate(purchase.createdAt)}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{purchase.farmerName}</TableCell>
                      <TableCell>
                        <div>
                          <div>{purchase.varietyGrade}</div>
                          {purchase.grade && (
                            <div className="text-sm text-muted-foreground">
                              Grade: {purchase.grade}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">{purchase.numberOfBags}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className={getStatusBadge(purchase.status)}>
                          {purchase.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {purchase.billGenerated ? (
                          <Badge className="bg-green-100 text-green-800">
                            Generated
                          </Badge>
                        ) : (
                          <Badge className="bg-yellow-100 text-yellow-800">
                            Pending
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className={getPaymentStatusBadge(purchase.paymentStatus)}>
                          {purchase.paymentStatus}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(purchase.amountDue || 0)}
                      </TableCell>
                      <TableCell className="text-center">
                        {purchase.billGenerated && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setPaymentDialog({ open: true, purchase });
                              setPaymentForm({
                                paymentStatus: purchase.paymentStatus || 'pending',
                                amountPaid: purchase.amountPaid || '',
                                paymentDate: purchase.paymentDate ? 
                                  new Date(purchase.paymentDate).toISOString().split('T')[0] : '',
                              });
                            }}
                          >
                            <CreditCard className="h-4 w-4 mr-1" />
                            Payment
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Payment Update Dialog */}
      <Dialog open={paymentDialog.open} onOpenChange={(open) => setPaymentDialog({ open, purchase: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Payment Status</DialogTitle>
          </DialogHeader>
          
          {paymentDialog.purchase && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="font-medium">Lot: {paymentDialog.purchase.lotNumber}</div>
                <div className="text-sm text-muted-foreground">
                  Amount Due: {formatCurrency(paymentDialog.purchase.amountDue || 0)}
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="paymentStatus">Payment Status</Label>
                  <Select
                    value={paymentForm.paymentStatus}
                    onValueChange={(value) => setPaymentForm(prev => ({ ...prev, paymentStatus: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select payment status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="partial">Partial Payment</SelectItem>
                      <SelectItem value="paid">Fully Paid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="amountPaid">Amount Paid</Label>
                  <div className="flex gap-2">
                    <Input
                      id="amountPaid"
                      type="number"
                      placeholder="0.00"
                      value={paymentForm.amountPaid}
                      onChange={(e) => setPaymentForm(prev => ({ ...prev, amountPaid: e.target.value }))}
                    />
                    <VoiceInput
                      onResult={(value) => setPaymentForm(prev => ({ ...prev, amountPaid: value }))}
                      placeholder="Amount paid..."
                      type="currency"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="paymentDate">Payment Date</Label>
                  <Input
                    id="paymentDate"
                    type="date"
                    value={paymentForm.paymentDate}
                    onChange={(e) => setPaymentForm(prev => ({ ...prev, paymentDate: e.target.value }))}
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <Button
                    onClick={handlePaymentUpdate}
                    disabled={updatePaymentMutation.isPending}
                    className="flex-1"
                  >
                    {updatePaymentMutation.isPending ? 'Updating...' : 'Update Payment'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setPaymentDialog({ open: false, purchase: null })}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}