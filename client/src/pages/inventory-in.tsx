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
  Loader2,
  Search
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { BackToDashboard } from "@/components/back-to-dashboard";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { Buyer, Supplier, InsertSupplier } from "@shared/schema";

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
  buyerId?: number;
  invoiceNumber: string;
  invoiceDate: string;
  traderName: string;
  traderContact?: string;
  traderAddress?: string;
  totalAmount: string;
  taxAmount: string;
  netAmount: string;
  notes?: string;
  items: InvoiceItem[];
}

export default function InventoryIn() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  
  // Dialog states
  const [createDalalOpen, setCreateDalalOpen] = useState(false);
  const [dalalSearchTerm, setDalalSearchTerm] = useState("");
  
  // Create dalal form
  const [dalalForm, setDalalForm] = useState({
    name: "",
    contactPerson: "",
    mobile: "",
    address: ""
  });

  // Form state
  const [form, setForm] = useState<InvoiceForm>({
    buyerId: 10, // Default buyer ID for dalal invoices
    invoiceNumber: "",
    invoiceDate: new Date().toISOString().split('T')[0],
    traderName: "",
    traderContact: "",
    traderAddress: "",
    totalAmount: "",
    taxAmount: "0",
    netAmount: "",
    notes: "",
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
    queryKey: ["/api/suppliers"]
  });

  // Filter suppliers based on search term
  const filteredSuppliers = suppliers.filter(supplier => 
    supplier.name.toLowerCase().includes(dalalSearchTerm.toLowerCase()) ||
    supplier.mobile?.toLowerCase().includes(dalalSearchTerm.toLowerCase()) ||
    supplier.contactPerson?.toLowerCase().includes(dalalSearchTerm.toLowerCase())
  );

  // Mutations
  const ocrMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('image', file);
      // Remove buyerId requirement since it's not needed for OCR processing
      
      const response = await fetch('/api/ocr/process-invoice', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) throw new Error('OCR processing failed');
      return await response.json();
    },
    onSuccess: (data) => {
      console.log('OCR Response:', data);
      setExtractedData(data);
      populateFormFromOCR(data.extractedData);
      setShowOcrResults(true);
      toast({ 
        title: "OCR Complete", 
        description: `Text extracted with ${Math.round(data.extractedData?.confidence || data.confidence || 0)}% confidence` 
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

  // Create dalal mutation
  const createDalalMutation = useMutation({
    mutationFn: async (dalalData: any) => {
      // Remove empty fields that could cause database errors
      const cleanData = {
        name: dalalData.name,
        contactPerson: dalalData.contactPerson || null,
        mobile: dalalData.mobile || null,
        address: dalalData.address || null,
        email: dalalData.email || null,
        gstNumber: dalalData.gstNumber || null,
        panNumber: dalalData.panNumber || null,
        isActive: true
      };
      return await apiRequest("POST", "/api/suppliers", cleanData);
    },
    onSuccess: (newSupplier: Supplier) => {
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
      setCreateDalalOpen(false);
      setDalalForm({
        name: "",
        contactPerson: "",
        mobile: "",
        address: ""
      });
      // Auto-select the new dalal in the form
      setForm(prev => ({ 
        ...prev, 
        traderName: newSupplier.name,
        traderContact: newSupplier.mobile || '',
        traderAddress: newSupplier.address || ''
      }));
      toast({ 
        title: "Success", 
        description: "Dalal created successfully" 
      });
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
    console.log('OCR Data received:', data);
    
    setForm(prev => {
      // Convert date from DD/MM/YYYY to YYYY-MM-DD for HTML date input
      let formattedDate = prev.invoiceDate;
      if (data.invoiceDate) {
        try {
          const dateParts = data.invoiceDate.split('/');
          if (dateParts.length === 3) {
            // Convert DD/MM/YYYY to YYYY-MM-DD
            const day = dateParts[0].padStart(2, '0');
            const month = dateParts[1].padStart(2, '0');
            const year = dateParts[2].length === 2 ? '20' + dateParts[2] : dateParts[2];
            formattedDate = `${year}-${month}-${day}`;
          }
        } catch (e) {
          console.warn('Date parsing failed:', e);
        }
      }
      
      // Parse items array properly
      const parsedItems = data.items && Array.isArray(data.items) ? data.items.map((item: any) => ({
        itemName: item.itemName || '',
        itemDescription: item.itemDescription || item.itemName || '',
        quantity: item.quantity || '',
        unit: item.unit || 'Kg',
        ratePerUnit: item.ratePerUnit || '',
        amount: item.amount || '',
        hsnCode: item.hsnCode || ''
      })) : prev.items;
      
      const newFormData = {
        ...prev,
        invoiceNumber: data.invoiceNumber || prev.invoiceNumber,
        invoiceDate: formattedDate,
        traderName: data.traderName || prev.traderName,
        traderContact: data.traderContact || prev.traderContact,
        traderAddress: data.traderAddress || prev.traderAddress,
        totalAmount: data.totalAmount?.toString() || prev.totalAmount,
        taxAmount: data.taxAmount?.toString() || prev.taxAmount,
        netAmount: data.netAmount?.toString() || prev.netAmount,
        items: parsedItems
      };
      
      console.log('Updated form data:', newFormData);
      return newFormData;
    });
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && form.traderName) {
      setOcrProcessing(true);
      ocrMutation.mutate(file);
      setOcrProcessing(false);
    } else if (!form.traderName) {
      toast({ 
        title: "Select Dalal", 
        description: "Please select a dalal first to process their invoice",
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
    
    // Use the netAmount from OCR if available (from invoice), otherwise calculate
    const netTotal = form.netAmount && parseFloat(form.netAmount) > 0 
      ? parseFloat(form.netAmount) 
      : itemsTotal + tax;
    
    return {
      itemsTotal: itemsTotal.toFixed(2),
      netTotal: netTotal.toFixed(2)
    };
  };

  const resetForm = () => {
    setForm({
      buyerId: 10, // Default buyer ID for dalal invoices
      invoiceNumber: "",
      invoiceDate: new Date().toISOString().split('T')[0],
      traderName: "",
      traderContact: "",
      traderAddress: "",
      totalAmount: "",
      taxAmount: "0",
      netAmount: "",
      notes: "",
      items: []
    });
    setShowOcrResults(false);
    setExtractedData(null);
  };

  const handleSave = () => {
    // More relaxed validation - only check essential fields
    if (!form.invoiceNumber || !form.traderName || form.items.length === 0) {
      toast({
        title: "Validation Error", 
        description: "Please fill invoice number, trader name, and add at least one item",
        variant: "destructive"
      });
      return;
    }
    
    // Ensure buyerId is set to 10 if not already set (default buyer for dalal invoices)
    if (!form.buyerId) {
      setForm(prev => ({ ...prev, buyerId: 10 }));
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
            <h1 className="text-3xl font-bold">Dalal Invoice Management</h1>
            <p className="text-muted-foreground mt-2">
              Select Dalal → Scan their invoice → Process agricultural trading documents
            </p>
          </div>
          <BackToDashboard />
        </div>

        {/* OCR Upload Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Dalal Invoice Scanner & Inventory Management
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Step 1: Select Dalal/Trader */}
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h3 className="font-semibold text-blue-800 mb-3">Step 1: Select Dalal/Trader (Process their invoice)</h3>
              
              {/* Dalal Selection with Search and Create */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-blue-700">Select Dalal/Trader *</Label>
                  <Dialog open={createDalalOpen} onOpenChange={setCreateDalalOpen}>
                    <DialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="bg-green-50 hover:bg-green-100 border-green-300 text-green-700 font-medium"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add New Dalal
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>Add New Dalal/Trader</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label>Dalal Name *</Label>
                          <Input
                            type="text"
                            value={dalalForm.name}
                            onChange={(e) => setDalalForm(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="Enter dalal name"
                          />
                        </div>
                        
                        <div>
                          <Label>Contact Person</Label>
                          <Input
                            type="text"
                            value={dalalForm.contactPerson}
                            onChange={(e) => setDalalForm(prev => ({ ...prev, contactPerson: e.target.value }))}
                            placeholder="Enter contact person name"
                          />
                        </div>
                        
                        <div>
                          <Label>Mobile Number</Label>
                          <Input
                            type="text"
                            value={dalalForm.mobile}
                            onChange={(e) => setDalalForm(prev => ({ ...prev, mobile: e.target.value }))}
                            placeholder="Enter mobile number"
                          />
                        </div>
                        
                        <div>
                          <Label>Address</Label>
                          <Input
                            type="text"
                            value={dalalForm.address}
                            onChange={(e) => setDalalForm(prev => ({ ...prev, address: e.target.value }))}
                            placeholder="Enter address"
                          />
                        </div>
                        
                        <div className="flex gap-2">
                          <Button 
                            onClick={() => {
                              if (!dalalForm.name) {
                                toast({ title: "Error", description: "Dalal name is required", variant: "destructive" });
                                return;
                              }
                              
                              createDalalMutation.mutate(dalalForm);
                            }}
                            disabled={createDalalMutation.isPending}
                            className="flex-1"
                          >
                            {createDalalMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : null}
                            Add Dalal
                          </Button>
                          
                          <Button 
                            variant="outline" 
                            onClick={() => setCreateDalalOpen(false)}
                            className="flex-1"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
                
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search dalals by name, mobile, or contact person..."
                      value={dalalSearchTerm}
                      onChange={(e) => setDalalSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  
                  {dalalSearchTerm && filteredSuppliers.length > 0 && (
                    <div className="border rounded-md max-h-40 overflow-y-auto bg-background">
                      {filteredSuppliers.map(supplier => (
                        <div
                          key={supplier.id}
                          className="p-3 hover:bg-muted cursor-pointer border-b last:border-b-0"
                          onClick={() => {
                            setForm(prev => ({ 
                              ...prev, 
                              traderName: supplier.name,
                              traderContact: supplier.mobile || '',
                              traderAddress: supplier.address || ''
                            }));
                            setDalalSearchTerm("");
                          }}
                        >
                          <div className="font-medium">{supplier.name}</div>
                          {supplier.contactPerson && (
                            <div className="text-sm text-muted-foreground">
                              Contact: {supplier.contactPerson}
                            </div>
                          )}
                          {supplier.mobile && (
                            <div className="text-sm text-muted-foreground">
                              Mobile: {supplier.mobile}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {dalalSearchTerm && filteredSuppliers.length === 0 && (
                    <div className="text-center p-4 text-muted-foreground">
                      No dalals found. Click "Add New Dalal" to create one.
                    </div>
                  )}
                </div>
                
                <Input
                  type="text"
                  value={form.traderName}
                  onChange={(e) => setForm(prev => ({ ...prev, traderName: e.target.value }))}
                  placeholder="Selected dalal name will appear here"
                  className="bg-white"
                />
              </div>
            </div>

            {/* Step 2: Invoice Details */}
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <h3 className="font-semibold text-gray-800 mb-3">Step 2: Invoice Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Invoice Number</Label>
                  <Input
                    type="text"
                    value={form.invoiceNumber}
                    onChange={(e) => setForm(prev => ({ ...prev, invoiceNumber: e.target.value }))}
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
              </div>
            </div>

            {/* Step 3: Scan/Upload Dalal's Invoice */}
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <h3 className="font-semibold text-green-800 mb-3">Step 3: Scan/Upload Dalal's Invoice</h3>
              
              <div className="flex gap-4">
                <Button
                  onClick={() => cameraInputRef.current?.click()}
                  disabled={!form.traderName || ocrProcessing}
                  variant="outline"
                  className="flex-1 bg-white hover:bg-gray-50"
                >
                  {ocrProcessing ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Camera className="h-4 w-4 mr-2" />
                  )}
                  Scan Dalal's Invoice
                </Button>

                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={!form.traderName || ocrProcessing}
                  variant="outline"
                  className="flex-1 bg-white hover:bg-gray-50"
                >
                  {ocrProcessing ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Upload className="h-4 w-4 mr-2" />
                  )}
                  Upload Invoice (Image/PDF)
                </Button>
              </div>
              
              {(!form.traderName) && (
                <p className="text-sm text-green-700 mt-2">
                  ⚠️ Please select a dalal first to scan their invoice
                </p>
              )}
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
              accept="image/*,.pdf,application/pdf"
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
                <Input
                  type="text"
                  value={form.invoiceNumber}
                  onChange={(e) => setForm(prev => ({ ...prev, invoiceNumber: e.target.value }))}
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
                <Label>Seller</Label>
                <Input
                  type="text"
                  value={form.traderName}
                  onChange={(e) => setForm(prev => ({ ...prev, traderName: e.target.value }))}
                  placeholder="Seller name from invoice"
                  className="bg-gray-50"
                />
              </div>
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
                          <Input
                            type="text"
                            value={item.itemName}
                            onChange={(e) => updateItem(index, 'itemName', e.target.value)}
                            placeholder="Item name"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updateItem(index, 'quantity', e.target.value)}
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
                          <Input
                            type="number"
                            value={item.ratePerUnit}
                            onChange={(e) => updateItem(index, 'ratePerUnit', e.target.value)}
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
                <Input
                  type="number"
                  value={form.taxAmount}
                  onChange={(e) => setForm(prev => ({ ...prev, taxAmount: e.target.value }))}
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