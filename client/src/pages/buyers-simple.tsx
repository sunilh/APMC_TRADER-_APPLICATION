import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Navigation } from "@/components/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Buyer } from "@shared/schema";

export default function BuyersSimple() {
  const [name, setName] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [mobile, setMobile] = useState("");
  const [address, setAddress] = useState("");
  const { toast } = useToast();

  const { data: buyers = [], isLoading } = useQuery<Buyer[]>({
    queryKey: ["/api/buyers"],
  });

  const createBuyerMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/buyers", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/buyers"] });
      toast({ title: "Success", description: "Buyer created successfully" });
      setName("");
      setContactPerson("");
      setMobile("");
      setAddress("");
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const buyerData = {
      name,
      contactPerson,
      mobile,
      address,
    };
    
    createBuyerMutation.mutate(buyerData);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">Buyers Management (Simple)</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card>
            <CardHeader>
              <CardTitle>Add New Buyer</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Company Name *</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter company name"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="contactPerson">Contact Person</Label>
                  <Input
                    id="contactPerson"
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    placeholder="Enter contact person"
                  />
                </div>
                <div>
                  <Label htmlFor="mobile">Mobile</Label>
                  <Input
                    id="mobile"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    placeholder="Enter mobile number"
                  />
                </div>
                <div>
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Enter address"
                  />
                </div>
                <Button 
                  type="submit" 
                  disabled={createBuyerMutation.isPending || !name.trim()}
                  className="w-full"
                >
                  {createBuyerMutation.isPending ? "Creating..." : "Create Buyer"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Buyers List ({buyers.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div>Loading...</div>
              ) : buyers.length === 0 ? (
                <div className="text-gray-500">No buyers found</div>
              ) : (
                <div className="space-y-2">
                  {buyers.map((buyer) => (
                    <div key={buyer.id} className="p-3 border rounded">
                      <div className="font-medium">{buyer.name}</div>
                      {buyer.contactPerson && <div className="text-sm text-gray-600">Contact: {buyer.contactPerson}</div>}
                      {buyer.mobile && <div className="text-sm text-gray-600">Mobile: {buyer.mobile}</div>}
                      {buyer.address && <div className="text-sm text-gray-600">Address: {buyer.address}</div>}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}