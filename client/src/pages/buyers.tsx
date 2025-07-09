import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Navigation } from "@/components/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit, Trash2, Search, Eye, CreditCard, AlertCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Buyer, InsertBuyer } from "@shared/schema";
import { insertBuyerSchema } from "@shared/schema";

interface BuyerSummary extends Buyer {
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

export default function Buyers() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBuyer, setEditingBuyer] = useState<Buyer | null>(null);
  const [selectedBuyer, setSelectedBuyer] = useState<BuyerSummary | null>(null);
  const [purchaseDialogOpen, setPurchaseDialogOpen] = useState(false);
  const [paymentDialog, setPaymentDialog] = useState<{ open: boolean; purchase: BuyerPurchase | null }>({
    open: false,
    purchase: null,
  });
  const [paymentForm, setPaymentForm] = useState({
    paymentStatus: 'pending',
    amountPaid: '',
    paymentDate: '',
  });
  const { toast } = useToast();

  // Fetch buyers with purchase summary
  const { data: buyerSummaries = [], isLoading, error } = useQuery({
    queryKey: ['/api/buyers/summary', searchTerm],
    retry: 3,
    retryDelay: 1000,
  });

  // Fetch detailed purchases for selected buyer
  const { data: purchases = [] } = useQuery({
    queryKey: ['/api/buyers', selectedBuyer?.id, 'purchases'],
    enabled: !!selectedBuyer,
  });

  // Payment update mutation
  const updatePaymentMutation = useMutation({
    mutationFn: async ({ lotId, data }: { lotId: number; data: any }) => {
      return apiRequest("PATCH", `/api/lots/${lotId}/payment`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/buyers', selectedBuyer?.id, 'purchases'] });
      queryClient.invalidateQueries({ queryKey: ['/api/buyers/summary'] });
      setPaymentDialog({ open: false, purchase: null });
      setPaymentForm({ paymentStatus: 'pending', amountPaid: '', paymentDate: '' });
      toast({ title: "Success", description: "Payment status updated successfully" });
    },
  });

  // Helper functions
  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return isNaN(num) ? '₹0' : `₹${num.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-IN');
  };

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'partial': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-red-100 text-red-800';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'active': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const form = useForm<InsertBuyer>({
    resolver: zodResolver(insertBuyerSchema.omit({ tenantId: true })),
    defaultValues: {
      name: "",
      contactPerson: "",
      mobile: "",
      address: "",
      panNumber: "",
      gstNumber: "",
      hsnCode: "1001", // Default HSN code for agricultural products
    },
    mode: "onChange",
  });

  // Update form when editing buyer changes
  useEffect(() => {
    if (editingBuyer) {
      console.log("useEffect: Updating form with buyer data:", editingBuyer);
      form.reset({
        name: editingBuyer.name,
        contactPerson: editingBuyer.contactPerson || "",
        mobile: editingBuyer.mobile || "",
        address: editingBuyer.address || "",
        panNumber: editingBuyer.panNumber || "",
        gstNumber: editingBuyer.gstNumber || "",
        hsnCode: editingBuyer.hsnCode || "1001",
      });
    }
  }, [editingBuyer, form]);

  const createMutation = useMutation({
    mutationFn: async (data: InsertBuyer) =>
      apiRequest("POST", "/api/buyers", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/buyers/summary"] });
      setIsDialogOpen(false);
      setEditingBuyer(null);
      form.reset();
      toast({ title: "Success", description: "Buyer created successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: InsertBuyer) =>
      apiRequest("PATCH", `/api/buyers/${editingBuyer?.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/buyers/summary"] });
      setIsDialogOpen(false);
      setEditingBuyer(null);
      form.reset();
      toast({ title: "Success", description: "Buyer updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) =>
      apiRequest("DELETE", `/api/buyers/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/buyers/summary"] });
      toast({ title: "Success", description: "Buyer deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const onSubmit = (data: InsertBuyer) => {
    if (editingBuyer) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (buyer: Buyer) => {
    console.log("Editing buyer:", buyer);
    console.log("PAN Number:", buyer.panNumber);
    console.log("GST Number:", buyer.gstNumber);
    setEditingBuyer(buyer);
    
    const formData = {
      name: buyer.name,
      contactPerson: buyer.contactPerson || "",
      mobile: buyer.mobile || "",
      address: buyer.address || "",
      panNumber: buyer.panNumber || "",
      gstNumber: buyer.gstNumber || "",
      hsnCode: buyer.hsnCode || "1001",
    };
    
    console.log("Form data being set:", formData);
    form.reset(formData);
    setIsDialogOpen(true);
  };

  const handleViewPurchases = (buyer: BuyerSummary) => {
    setSelectedBuyer(buyer);
    setPurchaseDialogOpen(true);
  };

  const handlePaymentUpdate = (purchase: BuyerPurchase) => {
    setPaymentDialog({ open: true, purchase });
    setPaymentForm({
      paymentStatus: purchase.paymentStatus,
      amountPaid: purchase.amountPaid,
      paymentDate: purchase.paymentDate || '',
    });
  };

  const handlePaymentSubmit = () => {
    if (!paymentDialog.purchase) return;
    
    updatePaymentMutation.mutate({
      lotId: paymentDialog.purchase.lotId,
      data: paymentForm,
    });
  };

  // Filter buyers based on search term
  const filteredBuyers = buyerSummaries.filter((buyer: any) =>
    buyer.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    buyer.contactPerson?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    buyer.mobile?.includes(searchTerm)
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Buyers Management & Purchase Tracking
            </CardTitle>
            <Button
              onClick={() => {
                setEditingBuyer(null);
                form.reset({
                  name: "",
                  contactPerson: "",
                  mobile: "",
                  address: "",
                  panNumber: "",
                  gstNumber: "",
                  hsnCode: "1001",
                });
                setIsDialogOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Buyer
            </Button>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingBuyer ? "Edit Buyer" : "Add New Buyer"}
                  </DialogTitle>
                </DialogHeader>
                <div className="max-h-[70vh] overflow-y-auto pr-2">
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Company Name</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="Enter company name"
                              type="text"
                              required
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="contactPerson"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contact Person</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="Enter contact person name"
                              type="text"
                              required
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="mobile"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Mobile Number</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="Enter mobile number"
                              type="tel"
                              required
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Address</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="Enter address"
                              type="text"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="panNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>PAN Number</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="Enter PAN number"
                              type="text"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="gstNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>GST Number</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="Enter GST number"
                              type="text"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="hsnCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>HSN Code</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="Enter HSN code"
                              type="text"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button 
                      type="submit" 
                      className="w-full"
                      disabled={createMutation.isPending || updateMutation.isPending}
                    >
                      {createMutation.isPending || updateMutation.isPending
                        ? "Saving..."
                        : editingBuyer
                        ? "Update Buyer"
                        : "Create Buyer"}
                    </Button>
                  </form>
                </Form>
                </div>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search buyers by name, contact person, or mobile..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

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
            ) : filteredBuyers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No buyers found
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Company Name</TableHead>
                    <TableHead>Contact Person</TableHead>
                    <TableHead>Mobile</TableHead>
                    <TableHead>Lots Purchased</TableHead>
                    <TableHead>Total Amount</TableHead>
                    <TableHead>Payment Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBuyers.map((buyer: any) => (
                    <TableRow key={buyer.id}>
                      <TableCell className="font-medium">{buyer.name}</TableCell>
                      <TableCell>{buyer.contactPerson}</TableCell>
                      <TableCell>{buyer.mobile}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Badge variant="outline">{buyer.totalLots} Total</Badge>
                          <Badge className="bg-green-100 text-green-800">
                            {buyer.completedLots} Completed
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="text-sm">Due: {formatCurrency(buyer.totalAmountDue)}</div>
                          <div className="text-sm text-green-600">Paid: {formatCurrency(buyer.totalAmountPaid)}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={buyer.pendingPayments > 0 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}>
                          {buyer.pendingPayments > 0 ? `${buyer.pendingPayments} Pending` : 'All Paid'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewPurchases(buyer)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View Purchases
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(buyer)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteMutation.mutate(buyer.id)}
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Purchase Details Dialog */}
        <Dialog open={purchaseDialogOpen} onOpenChange={setPurchaseDialogOpen}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>
                Purchase History - {selectedBuyer?.name}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {purchases.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No purchases found for this buyer
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Lot #</TableHead>
                      <TableHead>Farmer</TableHead>
                      <TableHead>Variety/Grade</TableHead>
                      <TableHead>Bags</TableHead>
                      <TableHead>Amount Due</TableHead>
                      <TableHead>Payment Status</TableHead>
                      <TableHead>Bill</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {purchases.map((purchase: any) => (
                      <TableRow key={purchase.lotId}>
                        <TableCell>{purchase.lotNumber}</TableCell>
                        <TableCell>{purchase.farmerName}</TableCell>
                        <TableCell>{purchase.varietyGrade} - {purchase.grade}</TableCell>
                        <TableCell>{purchase.numberOfBags}</TableCell>
                        <TableCell>{formatCurrency(purchase.amountDue)}</TableCell>
                        <TableCell>
                          <Badge className={getPaymentStatusBadge(purchase.paymentStatus)}>
                            {purchase.paymentStatus}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={purchase.billGenerated ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                            {purchase.billGenerated ? 'Generated' : 'Pending'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePaymentUpdate(purchase)}
                          >
                            <CreditCard className="h-4 w-4 mr-1" />
                            Update Payment
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Payment Update Dialog */}
        <Dialog open={paymentDialog.open} onOpenChange={(open) => setPaymentDialog({ open, purchase: null })}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Update Payment Status</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Payment Status</Label>
                <Select
                  value={paymentForm.paymentStatus}
                  onValueChange={(value) => setPaymentForm({ ...paymentForm, paymentStatus: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="partial">Partial Payment</SelectItem>
                    <SelectItem value="paid">Fully Paid</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Amount Paid</Label>
                <Input
                  value={paymentForm.amountPaid}
                  placeholder="Enter amount paid"
                  type="number"
                  onChange={(e) => setPaymentForm({ ...paymentForm, amountPaid: e.target.value })}
                />
              </div>

              <div>
                <Label>Payment Date</Label>
                <Input
                  type="date"
                  value={paymentForm.paymentDate}
                  onChange={(e) => setPaymentForm({ ...paymentForm, paymentDate: e.target.value })}
                />
              </div>

              <Button 
                onClick={handlePaymentSubmit}
                className="w-full"
                disabled={updatePaymentMutation.isPending}
              >
                {updatePaymentMutation.isPending ? "Updating..." : "Update Payment"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}