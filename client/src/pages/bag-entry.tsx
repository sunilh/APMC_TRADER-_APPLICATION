import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Navigation } from "@/components/navigation";
import { VoiceInput } from "@/components/voice-input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, Save, Check, Clock, Printer, Plus } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Lot, Bag, Buyer } from "@shared/schema";

interface LotWithDetails extends Lot {
  farmer: {
    name: string;
    mobile: string;
    place: string;
  };
  buyer?: Buyer;
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
  
  // Redirect if invalid lot ID
  if (isNaN(lotId)) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card>
            <CardContent className="p-8 text-center">
              <h3 className="text-lg font-medium text-gray-900">Invalid Lot ID</h3>
              <p className="text-gray-500 mt-2">The lot ID is missing or invalid.</p>
              <Button 
                onClick={() => setLocation("/lots")}
                className="mt-4"
              >
                Back to Lots
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const [lotPrice, setLotPrice] = useState("");
  const [selectedBuyer, setSelectedBuyer] = useState("");
  const [totalBags, setTotalBags] = useState(0);
  const [bagData, setBagData] = useState<BagEntryData[]>([]);
  const [notes, setNotes] = useState("");
  const [showInlineBuyerForm, setShowInlineBuyerForm] = useState(false);
  const [newBuyerName, setNewBuyerName] = useState("");

  const { data: lot, isLoading: lotLoading } = useQuery<LotWithDetails>({
    queryKey: ["/api/lots", lotId],
    queryFn: async () => {
      const response = await fetch(`/api/lots/${lotId}`, { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch lot");
      return response.json();
    },
    enabled: !isNaN(lotId),
  });



  const { data: buyers = [] } = useQuery<Buyer[]>({
    queryKey: ["/api/buyers"],
    queryFn: async () => {
      const response = await fetch("/api/buyers", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch buyers");
      return response.json();
    },
  });

  const { data: existingBags } = useQuery<Bag[]>({
    queryKey: ["/api/lots", lotId, "bags"],
    queryFn: async () => {
      const response = await fetch(`/api/lots/${lotId}/bags`, { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch bags");
      return response.json();
    },
    enabled: !isNaN(lotId),
  });

  const createBagMutation = useMutation({
    mutationFn: async (bag: { bagNumber: number; weight?: number; grade?: string; notes?: string }) => {
      await apiRequest("POST", `/api/lots/${lotId}/bags`, bag);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lots", lotId, "bags"] });
    },
  });

  const updateBagMutation = useMutation({
    mutationFn: async ({ bagId, bag }: { bagId: number; bag: Partial<Bag> }) => {
      await apiRequest("PUT", `/api/bags/${bagId}`, bag);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lots", lotId, "bags"] });
    },
  });

  const createBuyerMutation = useMutation({
    mutationFn: async (buyer: { name: string }) => {
      const response = await apiRequest("POST", "/api/buyers", buyer);
      return response.json();
    },
    onSuccess: (buyer: Buyer) => {
      queryClient.invalidateQueries({ queryKey: ["/api/buyers"] });
      setSelectedBuyer(buyer.id.toString());
      setShowInlineBuyerForm(false);
      setNewBuyerName("");
      toast({
        title: "Success",
        description: "Buyer created successfully",
      });
    },
  });

  // Initialize bag data when lot loads
  useEffect(() => {
    if (lot && !bagData.length) {
      setTotalBags(lot.numberOfBags);
      if (lot.lotPrice) setLotPrice(lot.lotPrice);
      if (lot.buyerId) setSelectedBuyer(lot.buyerId.toString());
      
      const initialBags = Array.from({ length: lot.numberOfBags }, (_, i) => ({
        bagNumber: i + 1,
        status: 'pending' as const,
      }));
      setBagData(initialBags);
    }
  }, [lot, bagData.length]);

  // Immediately load existing bag data when available
  useEffect(() => {
    if (existingBags && bagData.length) {
      const updatedBagData = bagData.map(bag => {
        const existingBag = existingBags.find(eb => eb.bagNumber === bag.bagNumber);
        if (existingBag) {
          return {
            ...bag,
            weight: existingBag.weight ? parseFloat(existingBag.weight) : undefined,
            grade: existingBag.grade || undefined,
            notes: existingBag.notes || undefined,
            status: 'saved' as const,
          };
        }
        return bag;
      });
      setBagData(updatedBagData);
      console.log("Loaded existing bag data immediately:", updatedBagData);
    }
  }, [existingBags, bagData.length]);

  // Force refresh of lot data when component mounts
  useEffect(() => {
    if (!isNaN(lotId)) {
      queryClient.invalidateQueries({ queryKey: ["/api/lots", lotId] });
      queryClient.invalidateQueries({ queryKey: ["/api/lots", lotId, "bags"] });
    }
  }, [lotId]);

  const [lastActivity, setLastActivity] = useState<number>(Date.now());
  const [idleTimeout, setIdleTimeout] = useState<NodeJS.Timeout | null>(null);

  const handleBagUpdate = (bagNumber: number, field: string, value: any) => {
    setBagData(prev => prev.map(bag => 
      bag.bagNumber === bagNumber 
        ? { ...bag, [field]: value, status: 'pending' }
        : bag
    ));
    
    // Update last activity time
    setLastActivity(Date.now());
  };

  // Idle timeout management
  useEffect(() => {
    const checkIdle = () => {
      const now = Date.now();
      if (now - lastActivity >= 60000) { // 1 minute
        handleSaveAll();
      }
    };

    if (idleTimeout) {
      clearTimeout(idleTimeout);
    }

    const timeout = setTimeout(checkIdle, 60000); // Check every minute
    setIdleTimeout(timeout);

    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [lastActivity]);

  const saveBagData = async (bagNumber: number) => {
    const bagToUpdate = bagData.find(b => b.bagNumber === bagNumber);
    if (bagToUpdate && (bagToUpdate.weight || bagToUpdate.grade || bagToUpdate.notes)) {
      const existingBag = existingBags?.find(eb => eb.bagNumber === bagNumber);
      
      try {
        if (existingBag) {
          await updateBagMutation.mutateAsync({
            bagId: existingBag.id,
            bag: {
              weight: bagToUpdate.weight?.toString(),
              grade: bagToUpdate.grade,
              notes: bagToUpdate.notes,
            }
          });
        } else {
          await createBagMutation.mutateAsync({
            bagNumber,
            weight: bagToUpdate.weight,
            grade: bagToUpdate.grade,
            notes: bagToUpdate.notes,
          });
        }

        setBagData(prev => prev.map(bag => 
          bag.bagNumber === bagNumber 
            ? { ...bag, status: 'saved' }
            : bag
        ));
      } catch (error) {
        console.error(`Failed to save bag ${bagNumber}:`, error);
      }
    }
  };

  const handleVoiceInput = (bagNumber: number, value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      handleBagUpdate(bagNumber, 'weight', numValue);
    }
  };

  const handleSaveAll = async () => {
    try {
      const pendingBags = bagData.filter(bag => 
        bag.status === 'pending' && (bag.weight || bag.grade || bag.notes)
      );
      
      for (const bag of pendingBags) {
        await saveBagData(bag.bagNumber);
      }
      
      toast({
        title: "Success",
        description: `All ${pendingBags.length} pending bag entries saved successfully`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save some bag entries",
        variant: "destructive"
      });
    }
  };

  const updateLotMutation = useMutation({
    mutationFn: async (data: { lotPrice?: string; buyerId?: number }) => {
      return await apiRequest("PUT", `/api/lots/${lotId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lots", lotId] });
      toast({ title: "Success", description: "Lot information updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateLotInfo = () => {
    const data: { lotPrice?: string; buyerId?: number } = {};
    if (lotPrice) data.lotPrice = lotPrice;
    if (selectedBuyer && selectedBuyer !== "placeholder") {
      data.buyerId = parseInt(selectedBuyer);
    }
    updateLotMutation.mutate(data);
  };

  const handleCreateBuyer = () => {
    if (newBuyerName.trim()) {
      createBuyerMutation.mutate({ name: newBuyerName.trim() });
    }
  };

  const calculateSummary = () => {
    const filledBags = bagData.filter(bag => bag.weight && bag.weight > 0);
    const totalWeight = filledBags.reduce((sum, bag) => sum + (bag.weight || 0), 0);
    const avgWeight = filledBags.length > 0 ? totalWeight / filledBags.length : 0;
    const completion = Math.round((filledBags.length / bagData.length) * 100);

    return {
      totalBags: bagData.length,
      totalWeight: totalWeight.toFixed(1),
      avgWeight: avgWeight.toFixed(1),
      completion: `${completion}%`,
    };
  };

  if (lotLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">Loading lot data...</div>
        </div>
      </div>
    );
  }

  if (!lot) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card>
            <CardContent className="p-8 text-center">
              <h3 className="text-lg font-medium text-gray-900">Lot Not Found</h3>
              <p className="text-gray-500 mt-2">The requested lot could not be found.</p>
              <Button 
                onClick={() => setLocation("/lots")}
                className="mt-4"
              >
                Back to Lots
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const summary = calculateSummary();

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-4 sm:py-8">

        <div className="mb-6">
          <Button 
            variant="ghost" 
            onClick={() => setLocation("/lots")}
            className="text-primary hover:text-primary/80 mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Lots
          </Button>
          <h1 className="text-lg sm:text-2xl font-bold text-gray-900">
            Bag Entry - {lot.lotNumber}
          </h1>
        </div>

        {/* Lot Information Header */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-4">
              <div>
                <Label className="text-xs sm:text-sm font-medium text-gray-500">Lot Number</Label>
                <p className="text-sm sm:text-lg font-semibold text-gray-900">{lot.lotNumber}</p>
              </div>
              <div>
                <Label className="text-xs sm:text-sm font-medium text-gray-500">Farmer</Label>
                <p className="text-sm sm:text-lg font-semibold text-gray-900 truncate">{lot.farmer.name}</p>
              </div>
              <div>
                <Label className="text-xs sm:text-sm font-medium text-gray-500">Mobile</Label>
                <p className="text-sm sm:text-lg font-semibold text-gray-900">{lot.farmer.mobile}</p>
              </div>
              <div>
                <Label className="text-xs sm:text-sm font-medium text-gray-500">Place</Label>
                <p className="text-sm sm:text-lg font-semibold text-gray-900 truncate">{lot.farmer.place}</p>
              </div>
              <div>
                <Label className="text-xs sm:text-sm font-medium text-gray-500">Bags</Label>
                <p className="text-sm sm:text-lg font-semibold text-gray-900">{lot.numberOfBags}</p>
              </div>
              <div>
                <Label className="text-xs sm:text-sm font-medium text-gray-500">Price</Label>
                <p className="text-sm sm:text-lg font-semibold text-gray-900">
                  {lot.lotPrice ? `₹${parseFloat(lot.lotPrice).toFixed(0)}` : "Not set"}
                </p>
              </div>
            </div>
            {lot.buyer && (
              <div className="mt-4 pt-4 border-t grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-500">Buyer Contact</Label>
                  <p className="text-sm text-gray-900">{lot.buyer.contactPerson || "N/A"}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Buyer Mobile</Label>
                  <p className="text-sm text-gray-900">{lot.buyer.mobile || "N/A"}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Buyer Address</Label>
                  <p className="text-sm text-gray-900">{lot.buyer.address || "N/A"}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bag Entry Form */}
        <Card>
          <CardContent className="p-6">
            {(!lot.lotPrice || !lot.buyer) && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <h3 className="font-medium text-yellow-800 mb-3">Complete Lot Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="lot-price">Lot Price *</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₹</span>
                      <Input
                        id="lot-price"
                        type="number"
                        step="0.01"
                        value={lotPrice}
                        onChange={(e) => setLotPrice(e.target.value)}
                        className="pl-8"
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="buyer">Buyer *</Label>
                    <div className="flex space-x-2">
                      <Select value={selectedBuyer} onValueChange={setSelectedBuyer}>
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Select buyer" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="placeholder">Select a buyer</SelectItem>
                          {Array.isArray(buyers) && buyers.map((buyer) => (
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
                </div>
                <Button 
                  onClick={() => updateLotInfo()} 
                  className="mt-4"
                  disabled={!lotPrice || !selectedBuyer || selectedBuyer === "placeholder"}
                >
                  Update Lot Information
                </Button>
              </div>
            )}

            {/* Bag Grid */}
            <div className="mb-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900">Bag Details</h3>
                <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                  <div className="text-xs sm:text-sm text-gray-600">
                    Idle save: <span className="text-blue-600">1 minute</span>
                  </div>
                  <Button onClick={handleSaveAll} className="bg-primary hover:bg-primary/90 text-sm">
                    <Save className="h-4 w-4 mr-2" />
                    Save All Now
                  </Button>
                </div>
              </div>

              <Card className="border border-gray-200">
                <ScrollArea className="h-96 custom-scrollbar">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-2 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Bag #
                        </th>
                        <th className="px-2 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Weight
                        </th>
                        <th className="px-2 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Grade
                        </th>
                        <th className="px-2 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                          Notes
                        </th>
                        <th className="px-2 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {bagData.map((bag) => (
                        <tr key={bag.bagNumber} className="hover:bg-gray-50">
                          <td className="px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm font-medium text-gray-900">
                            {bag.bagNumber}
                          </td>
                          <td className="px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap">
                            <div className="flex items-center space-x-1 sm:space-x-2">
                              <Input
                                type="number"
                                step="0.1"
                                min="0"
                                value={bag.weight || ""}
                                onChange={(e) => handleBagUpdate(bag.bagNumber, 'weight', parseFloat(e.target.value) || undefined)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' || e.key === 'Tab') {
                                    const nextBag = bagData.find(b => b.bagNumber === bag.bagNumber + 1);
                                    if (nextBag) {
                                      setTimeout(() => {
                                        const nextInput = document.querySelector(`#weight-${nextBag.bagNumber}`) as HTMLInputElement;
                                        if (nextInput) nextInput.focus();
                                      }, 100);
                                    }
                                  }
                                }}
                                id={`weight-${bag.bagNumber}`}
                                className="w-20 sm:w-24 text-sm"
                                placeholder="0.0"
                              />
                              <VoiceInput
                                onResult={(value) => handleVoiceInput(bag.bagNumber, value)}
                                placeholder="Weight"
                              />
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Select
                              value={bag.grade || "none"}
                              onValueChange={(value) => handleBagUpdate(bag.bagNumber, 'grade', value === "none" ? "" : value)}
                            >
                              <SelectTrigger className="w-20 text-sm">
                                <SelectValue placeholder="-" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">-</SelectItem>
                                <SelectItem value="A">A</SelectItem>
                                <SelectItem value="B">B</SelectItem>
                                <SelectItem value="C">C</SelectItem>
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Input
                              type="text"
                              value={bag.notes || ""}
                              onChange={(e) => handleBagUpdate(bag.bagNumber, 'notes', e.target.value)}
                              onFocus={() => handleBagFocus(bag.bagNumber)}
                              className="w-32 text-sm"
                              placeholder="Optional notes"
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Badge
                              className={`save-indicator ${
                                bag.status === 'saved' 
                                  ? 'bg-success text-white' 
                                  : 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {bag.status === 'saved' ? (
                                <>
                                  <Check className="h-3 w-3 mr-1" />
                                  Saved
                                </>
                              ) : (
                                <>
                                  <Clock className="h-3 w-3 mr-1" />
                                  Modified
                                </>
                              )}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </ScrollArea>
              </Card>

              {/* Summary Footer */}
              <Card className="mt-4 bg-gray-50">
                <CardContent className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-700">Total Bags:</span>
                      <span className="ml-2 text-gray-900">{summary.totalBags}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Total Weight:</span>
                      <span className="ml-2 text-gray-900">{summary.totalWeight} kg</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Average Weight:</span>
                      <span className="ml-2 text-gray-900">{summary.avgWeight} kg</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Completion:</span>
                      <span className="ml-2 text-gray-900">{summary.completion}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Additional Notes */}
            <div className="mb-6">
              <Label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
                Additional Notes
              </Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Enter any additional notes about this lot..."
              />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => setLocation("/lots")}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Lots
              </Button>
              <div className="space-x-3">
                <Button className="bg-secondary hover:bg-secondary/90">
                  <Printer className="h-4 w-4 mr-2" />
                  Print APMC Format
                </Button>
                <Button className="bg-primary hover:bg-primary/90">
                  <Check className="h-4 w-4 mr-2" />
                  Complete Entry
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
