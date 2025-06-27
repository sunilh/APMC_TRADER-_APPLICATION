import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Navigation } from "@/components/navigation";
import { VoiceInput } from "@/components/voice-input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Search } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Buyer, InsertBuyer } from "@shared/schema";
import { insertBuyerSchema } from "@shared/schema";

export default function Buyers() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBuyer, setEditingBuyer] = useState<Buyer | null>(null);
  const { toast } = useToast();

  const { data: buyers = [], isLoading } = useQuery<Buyer[]>({
    queryKey: ["/api/buyers"],
    queryFn: async () => {
      const response = await fetch("/api/buyers", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch buyers");
      return response.json();
    },
  });

  const form = useForm<InsertBuyer>({
    resolver: zodResolver(insertBuyerSchema),
    defaultValues: {
      name: "",
      contactPerson: "",
      mobile: "",
      address: "",
      panNumber: "",
      gstNumber: "",
    },
    mode: "onChange",
  });

  // Debug form state
  console.log("Form state:", {
    isValid: form.formState.isValid,
    errors: form.formState.errors,
    values: form.getValues(),
  });

  const createBuyerMutation = useMutation({
    mutationFn: async (data: InsertBuyer) => {
      console.log("Creating buyer with data:", data);
      try {
        const result = await apiRequest("POST", "/api/buyers", data);
        console.log("Buyer creation result:", result);
        return result;
      } catch (error) {
        console.error("API request failed:", error);
        throw error;
      }
    },
    onSuccess: () => {
      console.log("Buyer creation successful, invalidating queries");
      queryClient.invalidateQueries({ queryKey: ["/api/buyers"] });
      toast({ title: "Success", description: "Buyer created successfully" });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      console.error("Buyer creation error:", error);
      toast({ 
        title: "Error", 
        description: `Failed to create buyer: ${error.message}`, 
        variant: "destructive" 
      });
    },
  });

  const updateBuyerMutation = useMutation({
    mutationFn: async (data: InsertBuyer) => {
      if (!editingBuyer) return;
      await apiRequest("PUT", `/api/buyers/${editingBuyer.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/buyers"] });
      toast({ title: "Success", description: "Buyer updated successfully" });
      setIsDialogOpen(false);
      setEditingBuyer(null);
      form.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteBuyerMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/buyers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/buyers"] });
      toast({ title: "Success", description: "Buyer deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleVoiceInput = (field: keyof InsertBuyer, value: string) => {
    form.setValue(field, value);
  };

  const onSubmit = (data: InsertBuyer) => {
    console.log("Form submission data:", data);
    console.log("Form validation errors:", form.formState.errors);
    
    if (editingBuyer) {
      updateBuyerMutation.mutate(data);
    } else {
      createBuyerMutation.mutate(data);
    }
  };

  const handleEdit = (buyer: Buyer) => {
    setEditingBuyer(buyer);
    form.reset({
      name: buyer.name,
      contactPerson: buyer.contactPerson || "",
      mobile: buyer.mobile || "",
      address: buyer.address || "",
      panNumber: buyer.panNumber || "",
      gstNumber: buyer.gstNumber || "",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this buyer?")) {
      deleteBuyerMutation.mutate(id);
    }
  };

  const handleNewBuyer = () => {
    setEditingBuyer(null);
    form.reset();
    setIsDialogOpen(true);
  };

  const filteredBuyers = buyers.filter(buyer =>
    buyer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (buyer.mobile && buyer.mobile.includes(searchTerm)) ||
    (buyer.address && buyer.address.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (buyer.contactPerson && buyer.contactPerson.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Buyers Management</h1>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={handleNewBuyer}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add New Buyer
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingBuyer ? "Edit Buyer" : "Add New Buyer"}
                  </DialogTitle>
                </DialogHeader>
                <Form {...form}>
                  <form 
                    onSubmit={(e) => {
                      console.log("Form onSubmit triggered");
                      e.preventDefault();
                      form.handleSubmit(onSubmit)(e);
                    }} 
                    className="space-y-4"
                  >
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Company/Business Name *</FormLabel>
                          <FormControl>
                            <div className="flex gap-2">
                              <Input placeholder="Enter company or business name" {...field} className="flex-1" />
                              <VoiceInput
                                onResult={(value) => handleVoiceInput('name', value)}
                                placeholder="Voice input"
                                type="text"
                              />
                            </div>
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
                            <div className="flex gap-2">
                              <Input placeholder="Enter contact person name" {...field} className="flex-1" />
                              <VoiceInput
                                onResult={(value) => handleVoiceInput('contactPerson', value)}
                                placeholder="Voice input"
                                type="text"
                              />
                            </div>
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
                            <div className="flex gap-2">
                              <Input placeholder="Enter mobile number" {...field} className="flex-1" />
                              <VoiceInput
                                onResult={(value) => handleVoiceInput('mobile', value)}
                                placeholder="Voice input"
                                type="tel"
                              />
                            </div>
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
                            <div className="flex gap-2">
                              <Input placeholder="Enter address" {...field} className="flex-1" />
                              <VoiceInput
                                onResult={(value) => handleVoiceInput('address', value)}
                                placeholder="Voice input"
                                type="text"
                              />
                            </div>
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
                            <div className="flex gap-2">
                              <Input placeholder="Enter PAN number" {...field} className="flex-1" />
                              <VoiceInput
                                onResult={(value) => handleVoiceInput('panNumber', value)}
                                placeholder="Voice input"
                                type="text"
                              />
                            </div>
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
                            <div className="flex gap-2">
                              <Input placeholder="Enter GST number" {...field} className="flex-1" />
                              <VoiceInput
                                onResult={(value) => handleVoiceInput('gstNumber', value)}
                                placeholder="Voice input"
                                type="text"
                              />
                            </div>
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
                          <FormLabel>HSN Code *</FormLabel>
                          <FormControl>
                            <div className="flex gap-2">
                              <Input placeholder="Enter HSN code (e.g., 09042110)" {...field} className="flex-1" />
                              <VoiceInput
                                onResult={(value) => handleVoiceInput('hsnCode', value)}
                                placeholder="Voice input"
                                type="text"
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex justify-end space-x-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setIsDialogOpen(false);
                          setEditingBuyer(null);
                          form.reset();
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={createBuyerMutation.isPending || updateBuyerMutation.isPending}
                        onClick={() => console.log("Submit button clicked")}
                      >
                        {editingBuyer ? "Update" : "Create"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="flex items-center space-x-4 mb-6">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search buyers by company, contact person, mobile, or address..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Badge variant="secondary" className="px-3 py-1">
              {filteredBuyers.length} buyer{filteredBuyers.length !== 1 ? 's' : ''}
            </Badge>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Buyers List</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">Loading buyers...</div>
            ) : filteredBuyers.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {searchTerm ? "No buyers found matching your search." : "No buyers found. Add your first buyer to get started."}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Company/Business</TableHead>
                    <TableHead>Contact Person</TableHead>
                    <TableHead>Mobile</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>PAN Number</TableHead>
                    <TableHead>GST Number</TableHead>
                    <TableHead>HSN Code</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBuyers.map((buyer) => (
                    <TableRow key={buyer.id}>
                      <TableCell className="font-medium">{buyer.name}</TableCell>
                      <TableCell>{buyer.contactPerson || "-"}</TableCell>
                      <TableCell>{buyer.mobile || "-"}</TableCell>
                      <TableCell>{buyer.address || "-"}</TableCell>
                      <TableCell>{buyer.panNumber || "-"}</TableCell>
                      <TableCell>{buyer.gstNumber || "-"}</TableCell>
                      <TableCell>{buyer.hsnCode || "-"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
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
                            onClick={() => handleDelete(buyer.id)}
                            className="text-red-600 hover:text-red-700"
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
      </div>
    </div>
  );
}