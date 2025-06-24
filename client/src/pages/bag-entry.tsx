import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Navigation } from "@/components/navigation";
import { VoiceInput } from "@/components/voice-input";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Plus } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Lot, Bag, Buyer } from "@shared/schema";

interface LotWithDetails extends Lot {
  farmer: {
    name: string;
    mobile: string;
    place: string;
  };
  buyer?: {
    id: number;
    name: string;
    contactPerson?: string;
    mobile?: string;
    address?: string;
  };
}

interface BagEntryData {
  bagNumber: number;
  weight?: number;
  grade?: string;
  notes?: string;
  status: 'pending' | 'saved';
}

export default function BagEntry() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const lotId = parseInt(params.id as string);
  
  // State
  const [lotPrice, setLotPrice] = useState("");
  const [selectedBuyer, setSelectedBuyer] = useState("");
  const [bagData, setBagData] = useState<BagEntryData[]>([]);
  const [showInlineBuyerForm, setShowInlineBuyerForm] = useState(false);
  const [newBuyerName, setNewBuyerName] = useState("");

  // Queries - always called at top level
  const { data: lot, isLoading: lotLoading, error: lotError } = useQuery<LotWithDetails>({
    queryKey: [`/api/lots/${lotId}`],
    enabled: !isNaN(lotId),
  });



  const { data: existingBags } = useQuery<Bag[]>({
    queryKey: [`/api/lots/${lotId}/bags`],
    enabled: !isNaN(lotId),
  });

  // Debug logging
  console.log('Debug - lotId:', lotId, 'existingBags:', existingBags, 'bagData.length:', bagData.length);

  const { data: buyers = [] } = useQuery<Buyer[]>({
    queryKey: ["/api/buyers"],
  });

  // Mutations
  const createBagMutation = useMutation({
    mutationFn: async (bag: { bagNumber: number; weight?: number; grade?: string; notes?: string }) => {
      return await apiRequest("POST", `/api/lots/${lotId}/bags`, bag);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lots", lotId, "bags"] });
      toast({ title: "Success", description: "Bag saved successfully" });
    },
  });

  const updateBagMutation = useMutation({
    mutationFn: async ({ bagId, bag }: { bagId: number; bag: Partial<Bag> }) => {
      return await apiRequest("PUT", `/api/bags/${bagId}`, bag);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lots", lotId, "bags"] });
      toast({ title: "Success", description: "Bag updated successfully" });
    },
  });

  const createBuyerMutation = useMutation({
    mutationFn: async (buyerData: { name: string; contactPerson?: string }) => {
      return await apiRequest("POST", "/api/buyers", buyerData);
    },
    onSuccess: (buyer: Buyer) => {
      queryClient.invalidateQueries({ queryKey: ["/api/buyers"] });
      setSelectedBuyer(buyer.id.toString());
      setShowInlineBuyerForm(false);
      setNewBuyerName("");
      toast({ title: "Success", description: "Buyer created successfully" });
    },
  });

  const updateLotMutation = useMutation({
    mutationFn: async (updates: { lotPrice?: string; buyerId?: number }) => {
      return await apiRequest("PUT", `/api/lots/${lotId}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/lots/${lotId}`] });
      toast({ title: "Success", description: "Lot updated successfully" });
    },
  });

  // Initialize bag data when lot loads
  useEffect(() => {
    if (lot && lot.numberOfBags) {
      if (lot.lotPrice) setLotPrice(lot.lotPrice);
      if (lot.buyerId) setSelectedBuyer(lot.buyerId.toString());
      
      // Create initial bag structure
      const initialBags = Array.from({ length: lot.numberOfBags }, (_, i) => ({
        bagNumber: i + 1,
        status: 'pending' as const,
      }));

      // If we have existing bags data, merge it immediately
      if (existingBags && existingBags.length > 0) {
        console.log("Merging existing bags with initial structure:", existingBags);
        const mergedBags = initialBags.map(bag => {
          const existingBag = existingBags.find(eb => eb.bagNumber === bag.bagNumber);
          if (existingBag) {
            return {
              ...bag,
              weight: existingBag.weight ? parseFloat(existingBag.weight.toString()) : undefined,
              grade: existingBag.grade || undefined,
              notes: existingBag.notes || undefined,
              status: 'saved' as const,
            };
          }
          return bag;
        });
        setBagData(mergedBags);
        console.log("Set merged bag data:", mergedBags);
      } else {
        setBagData(initialBags);
        console.log("Set initial bag data:", initialBags);
      }
    }
  }, [lot, existingBags]);

  const handleBagUpdate = (bagNumber: number, field: string, value: any) => {
    setBagData(prev => prev.map(bag => 
      bag.bagNumber === bagNumber 
        ? { ...bag, [field]: value, status: 'pending' as const }
        : bag
    ));

    // Auto-save after a short delay
    setTimeout(() => {
      const bagToUpdate = bagData.find(b => b.bagNumber === bagNumber);
      if (bagToUpdate) {
        const existingBag = existingBags?.find(eb => eb.bagNumber === bagNumber);
        
        if (existingBag) {
          updateBagMutation.mutate({
            bagId: existingBag.id,
            bag: {
              weight: bagToUpdate.weight?.toString(),
              grade: bagToUpdate.grade,
              notes: bagToUpdate.notes,
            }
          });
        } else {
          createBagMutation.mutate({
            bagNumber,
            weight: bagToUpdate.weight,
            grade: bagToUpdate.grade,
            notes: bagToUpdate.notes,
          });
        }

        setBagData(prev => prev.map(bag => 
          bag.bagNumber === bagNumber 
            ? { ...bag, status: 'saved' as const }
            : bag
        ));
      }
    }, 1000);
  };

  const handleCreateBuyer = () => {
    if (newBuyerName.trim()) {
      createBuyerMutation.mutate({
        name: newBuyerName.trim(),
        contactPerson: "",
      });
    }
  };

  const handleLotPriceUpdate = () => {
    if (lotPrice && lot) {
      updateLotMutation.mutate({ lotPrice });
    }
  };

  const handleBuyerUpdate = (buyerId: string) => {
    setSelectedBuyer(buyerId);
    if (buyerId && lot) {
      updateLotMutation.mutate({ buyerId: parseInt(buyerId) });
    }
  };

  // Early returns
  if (isNaN(lotId)) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card>
            <CardContent className="p-8 text-center">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Invalid Lot ID</h2>
              <p className="text-gray-600 mb-4">The lot ID provided is not valid.</p>
              <Button onClick={() => setLocation("/lots")}>Back to Lots</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (lotLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div>Loading...</div>
        </div>
      </div>
    );
  }

  if (!lot || !lot.farmer) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card>
            <CardContent className="p-8 text-center">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Lot Not Found</h2>
              <p className="text-gray-600 mb-4">The requested lot could not be found or is missing farmer information.</p>
              <Button onClick={() => setLocation("/lots")}>Back to Lots</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Button 
            variant="ghost" 
            onClick={() => setLocation("/lots")}
            className="text-primary hover:text-primary/80 mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Lots
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">
            Bag Entry - {lot.lotNumber}
          </h1>
        </div>

        {/* Lot Information Header */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label className="text-sm font-medium text-gray-500">Farmer Name</Label>
                <p className="text-lg font-semibold text-gray-900">{lot.farmer.name}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-500">Mobile</Label>
                <p className="text-lg font-semibold text-gray-900">{lot.farmer.mobile}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-500">Place</Label>
                <p className="text-lg font-semibold text-gray-900">{lot.farmer.place}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-500">Number of Bags</Label>
                <p className="text-lg font-semibold text-gray-900">{lot.numberOfBags}</p>
              </div>
            </div>
            
            {/* Buyer Information */}
            {lot.buyer && (
              <div className="mt-4 pt-4 border-t">
                <Label className="text-sm font-medium text-gray-500">Buyer Information</Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                  <div>
                    <p className="font-medium">{lot.buyer.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Contact: {lot.buyer.contactPerson || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Mobile: {lot.buyer.mobile || "N/A"}</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Buyer Selection and Lot Price */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Select Buyer</Label>
                <div className="flex space-x-2">
                  <Select value={selectedBuyer} onValueChange={handleBuyerUpdate}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select buyer" />
                    </SelectTrigger>
                    <SelectContent>
                      {buyers.map((buyer) => (
                        <SelectItem key={buyer.id} value={buyer.id.toString()}>
                          {buyer.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowInlineBuyerForm(true)}
                    className="px-3"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                
                {showInlineBuyerForm && (
                  <div className="flex space-x-2 mt-2">
                    <Input
                      placeholder="New buyer name"
                      value={newBuyerName}
                      onChange={(e) => setNewBuyerName(e.target.value)}
                    />
                    <Button
                      size="sm"
                      onClick={handleCreateBuyer}
                      disabled={createBuyerMutation.isPending}
                    >
                      Add
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setShowInlineBuyerForm(false);
                        setNewBuyerName("");
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                )}
              </div>
              
              <div>
                <Label htmlFor="lot-price">Lot Price (₹)</Label>
                <div className="flex space-x-2">
                  <Input
                    id="lot-price"
                    type="number"
                    step="0.01"
                    placeholder="Enter lot price"
                    value={lotPrice}
                    onChange={(e) => setLotPrice(e.target.value)}
                    onBlur={handleLotPriceUpdate}
                  />
                  <VoiceInput
                    onResult={(text) => setLotPrice(text)}
                    placeholder="Price"
                    type="currency"
                    className="w-10"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bag Entry Form */}
        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold">Bag Entry</h3>
              <div className="text-sm text-gray-600">
                {bagData.filter(b => b.status === 'saved').length} of {bagData.length} bags saved
              </div>
            </div>
            
            <div className="space-y-6">
              {bagData.map((bag) => (
                <div key={bag.bagNumber} className={`border rounded-lg p-4 ${
                  bag.status === 'saved' ? 'border-green-200 bg-green-50' : 'border-gray-200'
                }`}>
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-lg font-medium">
                      Bag #{bag.bagNumber}
                      {bag.status === 'saved' && <span className="ml-2 text-green-600 text-sm">✓ Saved</span>}
                    </h4>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      bag.status === 'saved' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {bag.status === 'saved' ? 'Saved' : 'Pending'}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor={`weight-${bag.bagNumber}`}>Weight (kg)</Label>
                      <div className="flex space-x-2">
                        <Input
                          id={`weight-${bag.bagNumber}`}
                          type="number"
                          step="0.01"
                          placeholder="Enter weight"
                          value={bag.weight || ""}
                          onChange={(e) => handleBagUpdate(bag.bagNumber, 'weight', parseFloat(e.target.value) || 0)}
                          className={bag.status === 'saved' ? 'bg-green-50 border-green-200' : ''}
                        />
                        <VoiceInput
                          onResult={(result) => {
                            const numValue = parseFloat(result);
                            if (!isNaN(numValue)) {
                              handleBagUpdate(bag.bagNumber, 'weight', numValue);
                            }
                          }}
                          type="number"
                          placeholder="Voice input"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor={`grade-${bag.bagNumber}`}>Grade</Label>
                      <Input
                        id={`grade-${bag.bagNumber}`}
                        placeholder="Enter grade"
                        value={bag.grade || ""}
                        onChange={(e) => handleBagUpdate(bag.bagNumber, 'grade', e.target.value)}
                        className={bag.status === 'saved' ? 'bg-green-50 border-green-200' : ''}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor={`notes-${bag.bagNumber}`}>Notes</Label>
                      <Input
                        id={`notes-${bag.bagNumber}`}
                        placeholder="Enter notes"
                        value={bag.notes || ""}
                        onChange={(e) => handleBagUpdate(bag.bagNumber, 'notes', e.target.value)}
                        className={bag.status === 'saved' ? 'bg-green-50 border-green-200' : ''}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}