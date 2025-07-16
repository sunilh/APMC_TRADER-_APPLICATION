import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
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
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Save, Users, Package, Download } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { BackToDashboard } from "@/components/back-to-dashboard";
import type { Lot, Bag, Buyer } from "@shared/schema";
import jsPDF from "jspdf";

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

interface BagEntry {
  bagNumber: number;
  weight?: number;
  buyerId?: number;
  buyerName?: string;
}

interface BuyerAllocation {
  buyerId: number;
  buyerName: string;
  bagCount: number;
  startBag: number;
  endBag: number;
}

export default function BagEntryNew() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const lotId = parseInt(params.id as string);

  // State
  const [lotPrice, setLotPrice] = useState("");
  const [lotGrade, setLotGrade] = useState("");
  const [finalNotes, setFinalNotes] = useState("");
  
  // Buyer allocation state
  const [buyer1, setBuyer1] = useState("");
  const [buyer2, setBuyer2] = useState("");
  const [buyer3, setBuyer3] = useState("");
  const [buyer1Count, setBuyer1Count] = useState("");
  const [buyer2Count, setBuyer2Count] = useState("");
  
  // Bag data
  const [bagEntries, setBagEntries] = useState<BagEntry[]>([]);
  const [buyerAllocations, setBuyerAllocations] = useState<BuyerAllocation[]>([]);

  // Queries
  const {
    data: lot,
    isLoading: lotLoading,
  } = useQuery<LotWithDetails>({
    queryKey: [`/api/lots/${lotId}`],
    enabled: !isNaN(lotId),
  });

  const { data: buyers = [] } = useQuery<Buyer[]>({
    queryKey: ["/api/buyers"],
  });

  // Offline/Online state detection
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const storageKey = `bag-entry-${lotId}`;

  // Draft syncing queries and mutations for cross-device functionality
  const { data: draftResponse } = useQuery({
    queryKey: [`/api/bag-entry-draft/${lotId}`],
    enabled: !isNaN(lotId) && isOnline,
    retry: false,
  });

  const saveDraftMutation = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest("POST", `/api/bag-entry-draft/${lotId}`, { draftData: data });
    },
  });

  const deleteDraftMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/bag-entry-draft/${lotId}`);
    },
  });

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Auto-sync when coming back online
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try {
          const draft = JSON.parse(saved);
          saveDraftMutation.mutate(draft, {
            onSuccess: () => {
              toast({
                title: "Auto-Synced",
                description: "Your offline work has been synced to server",
              });
            },
          });
        } catch (e) {
          console.error("Failed to auto-sync:", e);
        }
      }
    };
    
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [storageKey, saveDraftMutation, toast]);

  // Save mutation
  const saveAllMutation = useMutation({
    mutationFn: async () => {
      // Mandatory validation
      if (!lotPrice) {
        throw new Error("Lot price is mandatory before saving bags");
      }

      if (!buyer1) {
        throw new Error("At least one buyer selection is mandatory before saving bags");
      }

      const validBags = bagEntries.filter(bag => bag.weight && bag.weight > 0);
      
      if (validBags.length === 0) {
        throw new Error("No bags with weight to save");
      }

      // Update lot with price and grade
      await apiRequest("PUT", `/api/lots/${lotId}`, {
        lotPrice: lotPrice, // Keep as string for schema validation
        grade: lotGrade,
      });

      // Save all bags
      const promises = validBags.map(bag =>
        apiRequest("POST", `/api/lots/${lotId}/bags`, {
          bagNumber: bag.bagNumber,
          weight: bag.weight?.toString(),
          buyerId: bag.buyerId,
        })
      );

      await Promise.all(promises);
    },
    onSuccess: () => {
      // Delete draft after successful save
      deleteDraftMutation.mutate();
      
      toast({
        title: "Success",
        description: "All bags saved successfully",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/lots/${lotId}/bags`] });
      setLocation("/lots");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save bags",
        variant: "destructive",
      });
    },
  });

  // Calculate buyer allocations when buyer selection changes
  useEffect(() => {
    if (!lot || !buyer1) return;

    const totalBags = lot.numberOfBags;
    const count1 = parseInt(buyer1Count) || 0;
    const count2 = parseInt(buyer2Count) || 0;
    const count3 = totalBags - count1 - count2;

    const allocations: BuyerAllocation[] = [];
    let currentBag = 1;

    if (buyer1 && count1 > 0) {
      const buyer1Data = buyers.find(b => b.id === parseInt(buyer1));
      if (buyer1Data) {
        allocations.push({
          buyerId: buyer1Data.id,
          buyerName: buyer1Data.name,
          bagCount: count1,
          startBag: currentBag,
          endBag: currentBag + count1 - 1,
        });
        currentBag += count1;
      }
    }

    if (buyer2 && count2 > 0) {
      const buyer2Data = buyers.find(b => b.id === parseInt(buyer2));
      if (buyer2Data) {
        allocations.push({
          buyerId: buyer2Data.id,
          buyerName: buyer2Data.name,
          bagCount: count2,
          startBag: currentBag,
          endBag: currentBag + count2 - 1,
        });
        currentBag += count2;
      }
    }

    if (buyer3 && count3 > 0) {
      const buyer3Data = buyers.find(b => b.id === parseInt(buyer3));
      if (buyer3Data) {
        allocations.push({
          buyerId: buyer3Data.id,
          buyerName: buyer3Data.name,
          bagCount: count3,
          startBag: currentBag,
          endBag: currentBag + count3 - 1,
        });
      }
    }

    setBuyerAllocations(allocations);
  }, [buyer1, buyer2, buyer3, buyer1Count, buyer2Count, lot, buyers]);

  // Initialize bag entries when lot loads or draft data is available
  useEffect(() => {
    if (!lot) return;

    // Priority 1: Load from server draft if online and available
    if (isOnline && draftResponse && (draftResponse as any).draftData) {
      try {
        const draft = (draftResponse as any).draftData;
        setBagEntries(draft.bagEntries || []);
        setLotPrice(draft.lotPrice || "");
        setLotGrade(draft.lotGrade || "");
        setFinalNotes(draft.finalNotes || "");
        setBuyer1(draft.buyer1 || "");
        setBuyer2(draft.buyer2 || "");
        setBuyer3(draft.buyer3 || "");
        setBuyer1Count(draft.buyer1Count || 0);
        setBuyer2Count(draft.buyer2Count || 0);
        return;
      } catch (e) {
        console.error("Failed to parse server draft data:", e);
      }
    }

    // Priority 2: Load from localStorage if offline or server draft not available
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const draft = JSON.parse(saved);
        setBagEntries(draft.bagEntries || []);
        setLotPrice(draft.lotPrice || "");
        setLotGrade(draft.lotGrade || "");
        setFinalNotes(draft.finalNotes || "");
        setBuyer1(draft.buyer1 || "");
        setBuyer2(draft.buyer2 || "");
        setBuyer3(draft.buyer3 || "");
        setBuyer1Count(draft.buyer1Count || "");
        setBuyer2Count(draft.buyer2Count || "");
        return;
      }
    } catch (e) {
      console.error("Failed to parse localStorage draft:", e);
    }

    // Initialize with empty bag entries if no draft
    const initialBags: BagEntry[] = [];
    for (let i = 1; i <= lot.numberOfBags; i++) {
      initialBags.push({
        bagNumber: i,
      });
    }
    setBagEntries(initialBags);
  }, [lot, draftResponse, isOnline, storageKey]);

  // Auto-save to localStorage for offline functionality
  useEffect(() => {
    if (bagEntries.length === 0) return;

    const dataToSave = {
      bagEntries,
      lotPrice,
      lotGrade,
      finalNotes,
      buyer1,
      buyer2,
      buyer3,
      buyer1Count,
      buyer2Count,
      timestamp: Date.now(),
    };

    // Always save to localStorage for offline capability
    localStorage.setItem(storageKey, JSON.stringify(dataToSave));
  }, [bagEntries, lotPrice, lotGrade, finalNotes, buyer1, buyer2, buyer3, buyer1Count, buyer2Count, storageKey]);

  // Sync to server when online
  const handleManualSave = () => {
    const dataToSave = {
      bagEntries,
      lotPrice,
      lotGrade,
      finalNotes,
      buyer1,
      buyer2,
      buyer3,
      buyer1Count,
      buyer2Count,
      timestamp: Date.now(),
    };

    // Always save to localStorage first
    localStorage.setItem(storageKey, JSON.stringify(dataToSave));

    if (isOnline) {
      // Try to sync to server if online
      saveDraftMutation.mutate(dataToSave, {
        onSuccess: () => {
          toast({
            title: "Draft Synced",
            description: "Your progress has been saved to server and will sync across devices",
          });
        },
        onError: () => {
          toast({
            title: "Sync Failed",
            description: "Saved locally but could not sync to server",
            variant: "destructive",
          });
        },
      });
    } else {
      toast({
        title: "Saved Offline",
        description: "Your progress is saved locally. Will sync when internet returns.",
      });
    }
  };

  // Get buyer for specific bag number
  const getBuyerForBag = (bagNumber: number): BuyerAllocation | undefined => {
    return buyerAllocations.find(
      allocation => bagNumber >= allocation.startBag && bagNumber <= allocation.endBag
    );
  };

  // Update bag entry
  const updateBagWeight = (bagNumber: number, weight: number | undefined) => {
    setBagEntries(prev => prev.map(bag => {
      if (bag.bagNumber === bagNumber) {
        const buyer = getBuyerForBag(bagNumber);
        return {
          ...bag,
          weight,
          buyerId: buyer?.buyerId,
          buyerName: buyer?.buyerName,
        };
      }
      return bag;
    }));
  };

  if (isNaN(lotId)) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card>
            <CardContent className="p-8 text-center">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Invalid Lot ID
              </h2>
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
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Lot Not Found
              </h2>
              <Button onClick={() => setLocation("/lots")}>Back to Lots</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const totalWeighedBags = bagEntries.filter(bag => bag.weight && bag.weight > 0).length;
  const totalWeight = bagEntries.reduce((sum, bag) => sum + (bag.weight || 0), 0);

  // Generate downloadable bag entry form
  const generateCompactBagForm = () => {
    const doc = new jsPDF();
    
    // Calculate optimal layout
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 10;
    const availableWidth = pageWidth - 2 * margin;
    const availableHeight = pageHeight - 50; // Reserve space for header and footer
    
    // Auto-scale based on bag count for single-page fit
    let cols: number;
    let fontSize: number;
    
    if (lot.numberOfBags <= 20) {
      cols = Math.min(5, lot.numberOfBags); // Large boxes for small lots
      fontSize = 10;
    } else if (lot.numberOfBags <= 100) {
      cols = 7; // Standard layout
      fontSize = 8;
    } else if (lot.numberOfBags <= 300) {
      cols = 10; // Compact layout
      fontSize = 7;
    } else {
      cols = Math.min(15, Math.ceil(Math.sqrt(lot.numberOfBags * 1.5))); // Very compact
      fontSize = 6;
    }
    
    const cellWidth = availableWidth / cols;
    const rows = Math.ceil(lot.numberOfBags / cols);
    const cellHeight = Math.min(cellWidth * 0.8, availableHeight / rows); // Maintain aspect ratio
    
    // Ensure minimum usable size
    const minCellSize = 8; // Minimum 8mm
    if (cellWidth < minCellSize || cellHeight < minCellSize) {
      // Recalculate with minimum constraints
      const maxCols = Math.floor(availableWidth / minCellSize);
      const maxRows = Math.floor(availableHeight / minCellSize);
      cols = Math.min(maxCols, Math.ceil(lot.numberOfBags / maxRows));
      fontSize = Math.max(4, fontSize - 1);
    }
    
    // Header
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("BAG ENTRY FORM", pageWidth / 2, 20, { align: "center" });
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Lot: ${lot.lotNumber}`, margin, 30);
    doc.text(`Farmer: ${lot.farmer.name}`, margin, 35);
    doc.text(`Total Bags: ${lot.numberOfBags}`, pageWidth - margin - 40, 30);
    doc.text(`Mobile: ${lot.farmer.mobile}`, pageWidth - margin - 40, 35);
    
    // Grid
    const startY = 45;
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const bagNum = row * cols + col + 1;
        if (bagNum > lot.numberOfBags) break;
        
        const x = margin + col * cellWidth;
        const y = startY + row * cellHeight;
        
        // Draw cell border
        doc.rect(x, y, cellWidth, cellHeight);
        
        // Empty cell - no bag numbers as requested
        
        // Weight line (scale with cell size)
        const lineY = y + cellHeight - 3;
        doc.line(x + 2, lineY, x + cellWidth - 2, lineY);
      }
    }
    
    // Footer
    const footerY = startY + rows * cellHeight + 10;
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text("Signature: ___________________", margin, footerY);
    doc.text("Date: ___________", pageWidth - margin - 30, footerY);
    
    // Grid info
    doc.setFontSize(6);
    doc.text(`Layout: ${cols} cols × ${rows} rows | Auto-scaled for ${lot.numberOfBags} bags`, margin, footerY + 6);
    
    // Download
    doc.save(`${lot.lotNumber}_BagEntry_Form.pdf`);
    
    toast({
      title: "Form Downloaded",
      description: `Downloadable bag entry form generated for ${lot.numberOfBags} bags`,
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-8">
        <BackToDashboard />
        <div className="mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-3 sm:mb-4">
            <Button
              variant="ghost"
              onClick={() => setLocation("/lots")}
              className="text-primary hover:text-primary/80 w-full sm:w-auto min-h-[44px]"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Lots
            </Button>
            <Button
              variant="outline"
              onClick={generateCompactBagForm}
              className="gap-2 w-full sm:w-auto min-h-[44px]"
            >
              <Download className="h-4 w-4" />
              Download Form
            </Button>
          </div>
          <h1 className="text-lg sm:text-2xl font-bold text-gray-900">
            Bag Entry - {lot.lotNumber}
          </h1>
        </div>

        {/* Lot Information */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Lot Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label className="text-sm font-medium text-gray-600">Farmer</Label>
                <p className="text-lg font-semibold">{lot.farmer.name}</p>
                <p className="text-sm text-gray-600">{lot.farmer.mobile}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-600">Total Bags</Label>
                <p className="text-lg font-semibold">{lot.numberOfBags}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-600">Progress</Label>
                <p className="text-lg font-semibold">
                  {totalWeighedBags} / {lot.numberOfBags} bags weighed
                </p>
                <p className="text-sm text-gray-600">Total: {totalWeight.toFixed(1)} kg</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Buyer Allocation - 3 Buyer Support */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Buyer Allocation (Up to 3 Buyers)
            </CardTitle>
            <p className="text-sm text-gray-600 mt-1">
              Allocate bags to different buyers. At least one buyer is mandatory.
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <Label htmlFor="buyer1">Buyer 1 *</Label>
                <Select value={buyer1} onValueChange={setBuyer1}>
                  <SelectTrigger className={!buyer1 ? "border-red-300" : ""}>
                    <SelectValue placeholder="Select buyer 1" />
                  </SelectTrigger>
                  <SelectContent>
                    {buyers.map(buyer => (
                      <SelectItem key={buyer.id} value={buyer.id.toString()}>
                        {buyer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!buyer1 && (
                  <p className="text-sm text-red-500 mt-1">At least one buyer is mandatory</p>
                )}
              </div>
              <div>
                <Label htmlFor="buyer1Count">Buyer 1 Bags</Label>
                <UnifiedInput
                  id="buyer1Count"
                  type="number"
                  voiceType="number"
                  min="0"
                  max={lot.numberOfBags}
                  value={buyer1Count}
                  onChange={(e) => setBuyer1Count(e.target.value)}
                  placeholder="Number of bags"
                />
              </div>
            </div>

            {/* Buyer 2 Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <Label htmlFor="buyer2">Buyer 2 (Optional)</Label>
                <Select value={buyer2} onValueChange={setBuyer2}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select buyer 2" />
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
              <div>
                <Label htmlFor="buyer2Count">Buyer 2 Bags</Label>
                <UnifiedInput
                  id="buyer2Count"
                  type="number"
                  voiceType="number"
                  min="0"
                  max={lot.numberOfBags}
                  value={buyer2Count}
                  onChange={(e) => setBuyer2Count(e.target.value)}
                  placeholder="Number of bags"
                />
              </div>
            </div>

            {/* Buyer 3 Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <Label htmlFor="buyer3">Buyer 3 (Optional)</Label>
                <Select value={buyer3} onValueChange={setBuyer3}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select buyer 3" />
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
              <div>
                <Label>Buyer 3 Bags (Auto)</Label>
                <Input
                  readOnly
                  value={lot.numberOfBags - (parseInt(buyer1Count) || 0) - (parseInt(buyer2Count) || 0)}
                  className="bg-gray-100"
                />
              </div>
            </div>

            {/* Split Preview */}
            {buyerAllocations.length > 0 && (
              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <h4 className="font-semibold mb-2">Bag Distribution Preview:</h4>
                {buyerAllocations.map((allocation, index) => (
                  <div key={index} className="text-sm">
                    • Bags {allocation.startBag}-{allocation.endBag}: {allocation.buyerName} ({allocation.bagCount} bags)
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Lot Settings */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="lotPrice">Lot Price (₹ per quintal) *</Label>
                <UnifiedInput
                  id="lotPrice"
                  type="number"
                  voiceType="currency"
                  step="0.01"
                  value={lotPrice}
                  onChange={(e) => setLotPrice(e.target.value)}
                  placeholder="Enter price per quintal"
                  className={!lotPrice ? "border-red-300" : ""}
                  required
                />
                {!lotPrice && (
                  <p className="text-sm text-red-500 mt-1">Lot price is mandatory</p>
                )}
              </div>
              <div>
                <Label htmlFor="lotGrade">Grade</Label>
                <UnifiedInput
                  id="lotGrade"
                  voiceType="text"
                  value={lotGrade}
                  onChange={(e) => setLotGrade(e.target.value)}
                  placeholder="Enter grade"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bag Entry Grid */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Bag Weight Entry</CardTitle>
              <Button
                onClick={() => saveAllMutation.mutate()}
                disabled={saveAllMutation.isPending || totalWeighedBags === 0}
                className="bg-green-600 hover:bg-green-700"
              >
                <Save className="h-4 w-4 mr-2" />
                {saveAllMutation.isPending ? "Saving..." : `Save All (${totalWeighedBags} bags)`}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {bagEntries.map(bag => {
                const buyer = getBuyerForBag(bag.bagNumber);
                return (
                  <div key={bag.bagNumber} className="border rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-semibold">Bag #{bag.bagNumber}</span>
                      {buyer && (
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          {buyer.buyerName}
                        </span>
                      )}
                    </div>
                    <UnifiedInput
                      type="number"
                      voiceType="number"
                      step="0.5"
                      min="0"
                      placeholder="Weight (kg)"
                      value={bag.weight || ""}
                      data-bag={bag.bagNumber}
                      onChange={(e) => {
                        const value = e.target.value;
                        updateBagWeight(
                          bag.bagNumber,
                          value === "" ? undefined : parseFloat(value)
                        );
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const value = (e.target as HTMLInputElement).value;
                          if (value) {
                            updateBagWeight(
                              bag.bagNumber,
                              value === "" ? undefined : parseFloat(value)
                            );
                          }
                        }
                      }}
                      className="w-full"
                    />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Notes for All Bag Weights */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Notes for Bag Weights</CardTitle>
            <p className="text-sm text-gray-600">Add any notes about the bag weights for this lot</p>
          </CardHeader>
          <CardContent>
            <UnifiedInput
              id="finalNotes"
              voiceType="text"
              value={finalNotes}
              onChange={(e) => setFinalNotes(e.target.value)}
              placeholder="Enter notes about bag weights, quality, or any observations..."
            />
          </CardContent>
        </Card>

        {/* Summary and Actions - Fixed Bottom Section */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4 z-50">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
              {/* Split Preview Summary */}
              <div>
                {buyerAllocations.length > 0 ? (
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <h4 className="font-semibold text-sm mb-1">Bag Distribution:</h4>
                    <div className="text-xs space-y-1">
                      {buyerAllocations.map((allocation, index) => (
                        <div key={index} className="flex justify-between">
                          <span>Bags {allocation.startBag}-{allocation.endBag}:</span>
                          <span className="font-medium">{allocation.buyerName} ({allocation.bagCount})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="bg-yellow-50 p-3 rounded-lg">
                    <p className="text-sm text-yellow-800">Configure buyer allocations above to see distribution</p>
                  </div>
                )}
              </div>

              {/* Progress and Save Actions */}
              <div className="flex items-center justify-between gap-4">
                <div className="text-center">
                  <div className="text-lg font-bold text-green-600">
                    {totalWeighedBags} / {lot.numberOfBags}
                  </div>
                  <div className="text-xs text-gray-600">Bags Weighed</div>
                  <div className="text-sm font-medium">{totalWeight.toFixed(1)} kg</div>
                </div>
                
                <div className="flex gap-3">
                  <Button
                    onClick={handleManualSave}
                    disabled={saveDraftMutation.isPending}
                    variant="outline"
                    className="px-6 py-3"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {saveDraftMutation.isPending 
                      ? "Saving..." 
                      : isOnline 
                        ? "Save & Sync" 
                        : "Save Offline"
                    }
                  </Button>
                  
                  <Button
                    onClick={() => saveAllMutation.mutate()}
                    disabled={saveAllMutation.isPending || totalWeighedBags === 0 || !lotPrice || !buyer1}
                    className={`px-8 py-6 text-lg font-semibold ${
                      !lotPrice || !buyer1 
                        ? "bg-gray-400 cursor-not-allowed" 
                        : "bg-green-600 hover:bg-green-700"
                    }`}
                    size="lg"
                  >
                    <Save className="h-5 w-5 mr-2" />
                    {saveAllMutation.isPending 
                      ? "Saving..." 
                      : !lotPrice 
                        ? "Enter Price First"
                        : !buyer1
                          ? "Select Buyer First"
                          : `Save All (${totalWeighedBags} bags)`
                    }
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Add padding to prevent content from being hidden behind fixed bottom */}
        <div className="h-32"></div>
      </div>
    </div>
  );
}