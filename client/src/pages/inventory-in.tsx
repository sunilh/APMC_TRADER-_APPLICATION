import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Navigation } from "@/components/navigation";
import { UnifiedInput } from "@/components/ui/unified-input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Camera, 
  Upload, 
  Plus, 
  Trash2, 
  Save, 
  Eye, 
  Loader2 
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { BackToDashboard } from "@/components/back-to-dashboard";
import type { Buyer, Supplier } from "@shared/schema";

interface InvoiceItem {
  itemName: string;
  itemDescription?: string;
  quantity: string;
  unit: string;
  ratePerUnit: string;
  amount: string;
  hsnCode?: string;
}

interface InvoiceForm {
  invoiceNumber: string;
  invoiceDate: string;
  dalalSupplierName: string;
  dalalContact?: string;
  dalalAddress?: string;
  totalAmount: string;
  taxAmount: string;
  netAmount: string;
  notes?: string;
  buyerId: string;
  items: InvoiceItem[];
}

export default function InventoryIn() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [form, setForm] = useState<InvoiceForm>({
    invoiceNumber: "",
    invoiceDate: new Date().toISOString().split('T')[0],
    dalalSupplierName: "",
    dalalContact: "",
    dalalAddress: "",
    totalAmount: "",
    taxAmount: "0",
    netAmount: "",
    notes: "",
    buyerId: "",
    items: []
  });

  const [ocrProcessing, setOcrProcessing] = useState(false);
  const [showOcrResults, setShowOcrResults] = useState(false);
  const [extractedData, setExtractedData] = useState<any>(null);

  // Queries
  const { data: buyers = [] } = useQuery<Buyer[]>({
    queryKey: ["/api/buyers"]
  });

  const { data: suppliers = [] } = useQuery<Supplier[]>({
    queryKey: ["/api/suppliers"],
    enabled: !!form.buyerId
  });

  // Mutations
  const ocrMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('buyerId', form.buyerId);
      
      const response = await fetch('/api/ocr/process-invoice', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) throw new Error('OCR processing failed');
      return await response.json();
    },
    onSuccess: (data) => {
      setExtractedData(data);
      populateFormFromOCR(data.extractedData);
      setShowOcrResults(true);
      toast({ 
        title: "OCR Complete", 
        description: `Text extracted with ${Math.round(data.confidence)}% confidence` 
      });
    },
    onError: (error: Error) => {
      toast({ 
        title: "OCR Failed", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  const saveInvoiceMutation = useMutation({
    mutationFn: async (invoiceData: any) => {
      return await apiRequest("POST", "/api/purchase-invoices", invoiceData);
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Invoice saved and stock updated" });
      queryClient.invalidateQueries({ queryKey: ["/api/purchase-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stock-inventory"] });
      resetForm();
    },
    onError: (error: Error) => {
      toast({ 
        title: "Error", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  const populateFormFromOCR = (data: any) => {
    setForm(prev => ({
      ...prev,
      invoiceNumber: data.invoiceNumber || prev.invoiceNumber,
      invoiceDate: data.invoiceDate || prev.invoiceDate,
      dalalSupplierName: data.dalalSupplierName || prev.dalalSupplierName,
      dalalContact: data.dalalContact || prev.dalalContact,
      dalalAddress: data.dalalAddress || prev.dalalAddress,
      totalAmount: data.totalAmount || prev.totalAmount,
      taxAmount: data.taxAmount || prev.taxAmount,
      netAmount: data.netAmount || prev.netAmount,
      items: data.items || prev.items
    }));
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && form.buyerId) {
      setOcrProcessing(true);
      ocrMutation.mutate(file);
      setOcrProcessing(false);
    } else if (!form.buyerId) {
      toast({ 
        title: "Select Buyer", 
        description: "Please select a buyer before uploading invoice",
        variant: "destructive" 
      });
    }
  };

  const addItem = () => {
    setForm(prev => ({
      ...prev,
      items: [...prev.items, {
        itemName: "",
        itemDescription: "",
        quantity: "",
        unit: "Kg",
        ratePerUnit: "",
        amount: "",
        hsnCode: ""
      }]
    }));
  };

  const updateItem = (index: number, field: keyof InvoiceItem, value: string) => {
    setForm(prev => {
      const newItems = [...prev.items];
      newItems[index] = { ...newItems[index], [field]: value };
      
      // Auto-calculate amount
      if (field === 'quantity' || field === 'ratePerUnit') {
        const qty = parseFloat(newItems[index].quantity || '0');
        const rate = parseFloat(newItems[index].ratePerUnit || '0');
        newItems[index].amount = (qty * rate).toFixed(2);
      }
      
      return { ...prev, items: newItems };
    });
  };

  const removeItem = (index: number) => {
    setForm(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const calculateTotals = () => {
    const itemsTotal = form.items.reduce((sum, item) => sum + parseFloat(item.amount || '0'), 0);
    const tax = parseFloat(form.taxAmount || '0');
    return {
      itemsTotal: itemsTotal.toFixed(2),
      netTotal: (itemsTotal + tax).toFixed(2)
    };
  };

  const resetForm = () => {
    setForm({
      invoiceNumber: "",
      invoiceDate: new Date().toISOString().split('T')[0],
      dalalSupplierName: "",
      dalalContact: "",
      dalalAddress: "",
      totalAmount: "",
      taxAmount: "0",
      netAmount: "",
      notes: "",
      buyerId: "",
      items: []
    });
    setShowOcrResults(false);
    setExtractedData(null);
  };

  const handleSave = () => {
    if (!form.buyerId || !form.invoiceNumber || form.items.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please fill buyer, invoice number, and add at least one item",
        variant: "destructive"
      });
      return;
    }

    const totals = calculateTotals();
    const invoiceData = {
      ...form,
      totalAmount: form.totalAmount || totals.itemsTotal,
      netAmount: form.netAmount || totals.netTotal,
      tenantId: 10 // This will be set from auth context
    };

    saveInvoiceMutation.mutate(invoiceData);
  };

  const totals = calculateTotals();

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Inventory In - Purchase Invoice</h1>
            <p className="text-muted-foreground mt-2">
              Add purchase invoices manually or scan with OCR
            </p>
          </div>
          <BackToDashboard />
        </div>

        {/* OCR Upload Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Invoice OCR Scanner
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Select Buyer First</Label>
                <Select 
                  value={form.buyerId} 
                  onValueChange={(value) => setForm(prev => ({ ...prev, buyerId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose buyer" />
                  </SelectTrigger>
                  <SelectContent>
                    {buyers.map(buyer => (
                      <SelectItem key={buyer.id} value={buyer.id.toString()}>
                        {buyer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-4">
              <Button
                onClick={() => cameraInputRef.current?.click()}
                disabled={!form.buyerId || ocrProcessing}
                variant="outline"
                className="flex-1"
              >
                {ocrProcessing ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Camera className="h-4 w-4 mr-2" />
                )}
                Take Photo
              </Button>

              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={!form.buyerId || ocrProcessing}
                variant="outline"
                className="flex-1"
              >
                {ocrProcessing ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                Upload Image
              </Button>
            </div>

            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileUpload}
              className="hidden"
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />

            {showOcrResults && extractedData && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-800">
                  ✅ OCR completed with {Math.round(extractedData.confidence)}% confidence.
                  Review and edit the extracted data below.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Manual Invoice Form */}
        <Card>
          <CardHeader>
            <CardTitle>Invoice Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Invoice Header */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Invoice Number *</Label>
                <UnifiedInput
                  type="text"
                  value={form.invoiceNumber}
                  onChange={(value) => setForm(prev => ({ ...prev, invoiceNumber: value }))}
                  placeholder="Enter invoice number"
                />
              </div>

              <div>
                <Label>Invoice Date</Label>
                <Input
                  type="date"
                  value={form.invoiceDate}
                  onChange={(e) => setForm(prev => ({ ...prev, invoiceDate: e.target.value }))}
                />
              </div>

              <div>
                <Label>Buyer</Label>
                <Select 
                  value={form.buyerId} 
                  onValueChange={(value) => setForm(prev => ({ ...prev, buyerId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select buyer" />
                  </SelectTrigger>
                  <SelectContent>
                    {buyers.map(buyer => (
                      <SelectItem key={buyer.id} value={buyer.id.toString()}>
                        {buyer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Supplier Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Dalal/Supplier Name *</Label>
                <UnifiedInput
                  type="text"
                  value={form.dalalSupplierName}
                  onChange={(value) => setForm(prev => ({ ...prev, dalalSupplierName: value }))}
                  placeholder="Enter supplier name"
                />
              </div>

              <div>
                <Label>Contact Number</Label>
                <UnifiedInput
                  type="tel"
                  value={form.dalalContact || ""}
                  onChange={(value) => setForm(prev => ({ ...prev, dalalContact: value }))}
                  placeholder="Enter contact number"
                />
              </div>
            </div>

            <div>
              <Label>Supplier Address</Label>
              <Textarea
                value={form.dalalAddress || ""}
                onChange={(e) => setForm(prev => ({ ...prev, dalalAddress: e.target.value }))}
                placeholder="Enter supplier address"
                rows={2}
              />
            </div>

            {/* Items Table */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <Label className="text-lg font-semibold">Invoice Items</Label>
                <Button onClick={addItem} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item Name</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead>Rate</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {form.items.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <UnifiedInput
                            type="text"
                            value={item.itemName}
                            onChange={(value) => updateItem(index, 'itemName', value)}
                            placeholder="Item name"
                          />
                        </TableCell>
                        <TableCell>
                          <UnifiedInput
                            type="number"
                            value={item.quantity}
                            onChange={(value) => updateItem(index, 'quantity', value)}
                            placeholder="0"
                          />
                        </TableCell>
                        <TableCell>
                          <Select 
                            value={item.unit} 
                            onValueChange={(value) => updateItem(index, 'unit', value)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Kg">Kg</SelectItem>
                              <SelectItem value="Quintal">Quintal</SelectItem>
                              <SelectItem value="Bags">Bags</SelectItem>
                              <SelectItem value="Pieces">Pieces</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <UnifiedInput
                            type="number"
                            value={item.ratePerUnit}
                            onChange={(value) => updateItem(index, 'ratePerUnit', value)}
                            placeholder="0.00"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={item.amount}
                            readOnly
                            className="bg-gray-50"
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            onClick={() => removeItem(index)}
                            size="sm"
                            variant="destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Totals */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Items Total</Label>
                <Input value={`₹${totals.itemsTotal}`} readOnly className="bg-gray-50" />
              </div>

              <div>
                <Label>Tax Amount</Label>
                <UnifiedInput
                  type="number"
                  value={form.taxAmount}
                  onChange={(value) => setForm(prev => ({ ...prev, taxAmount: value }))}
                  placeholder="0.00"
                />
              </div>

              <div>
                <Label>Net Amount</Label>
                <Input value={`₹${totals.netTotal}`} readOnly className="bg-gray-50" />
              </div>
            </div>

            <div>
              <Label>Notes</Label>
              <Textarea
                value={form.notes || ""}
                onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Additional notes"
                rows={2}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <Button 
                onClick={handleSave}
                disabled={saveInvoiceMutation.isPending}
                className="flex-1"
              >
                {saveInvoiceMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Invoice & Update Stock
              </Button>

              <Button 
                onClick={resetForm}
                variant="outline"
              >
                Clear Form
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}