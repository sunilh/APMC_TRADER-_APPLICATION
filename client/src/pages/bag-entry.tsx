import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Navigation } from "@/components/navigation";
import { VoiceInput } from "@/components/voice-input";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Plus, Trash2, Download } from "lucide-react";
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

interface BagEntryData {
  bagNumber: number;
  weight?: number;
  grade?: string;
  notes?: string;
  buyerId?: number;
  buyerName?: string;
  status: "pending" | "saved";
}

interface BuyerAllocation {
  buyerId: number;
  buyerName: string;
  bagCount: number;
}

export default function BagEntry() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const lotId = parseInt(params.id as string);

  // State
  const [lotPrice, setLotPrice] = useState("");
  const [lotGrade, setLotGrade] = useState("");
  const [selectedBuyer, setSelectedBuyer] = useState("");
  const [newBuyerName, setNewBuyerName] = useState("");
  const [showInlineBuyerForm, setShowInlineBuyerForm] = useState(false);
  const [bagData, setBagData] = useState<BagEntryData[]>([]);
  const [buyerAllocations, setBuyerAllocations] = useState<BuyerAllocation[]>([]);
  const [finalNotes, setFinalNotes] = useState("");
  
  // Buyer allocation state
  const [buyer1, setBuyer1] = useState("");
  const [buyer2, setBuyer2] = useState("");
  const [buyer3, setBuyer3] = useState("");
  const [buyer1Count, setBuyer1Count] = useState("");
  const [buyer2Count, setBuyer2Count] = useState("");

  // Queries - always called at top level
  const {
    data: lot,
    isLoading: lotLoading,
    error: lotError,
  } = useQuery<LotWithDetails>({
    queryKey: [`/api/lots/${lotId}`],
    enabled: !isNaN(lotId),
  });

  const { data: existingBags } = useQuery<Bag[]>({
    queryKey: [`/api/lots/${lotId}/bags`],
    enabled: !isNaN(lotId),
  });

  const { data: buyers = [] } = useQuery<Buyer[]>({
    queryKey: ["/api/buyers"],
  });

  // Mutations
  const createBagMutation = useMutation({
    mutationFn: async (bag: {
      bagNumber: number;
      weight?: string;
      notes?: string;
    }) => {
      return await apiRequest("POST", `/api/lots/${lotId}/bags`, bag);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [`/api/lots/${lotId}/bags`] });

      // Update local state to mark as saved
      setBagData((prev) =>
        prev.map((bag) =>
          bag.bagNumber === variables.bagNumber
            ? { ...bag, status: "saved" as const }
            : bag,
        ),
      );

      toast({ title: "Success", description: "Bag saved successfully" });
    },
  });

  const updateBagMutation = useMutation({
    mutationFn: async ({
      bagId,
      bag,
    }: {
      bagId: number;
      bag: Partial<Bag>;
    }) => {
      return await apiRequest("PUT", `/api/bags/${bagId}`, bag);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [`/api/lots/${lotId}/bags`] });

      // Find the bag number from existing bags and update status
      const existingBag = existingBags?.find((eb) => eb.id === variables.bagId);
      if (existingBag) {
        setBagData((prev) =>
          prev.map((bag) =>
            bag.bagNumber === existingBag.bagNumber
              ? { ...bag, status: "saved" as const }
              : bag,
          ),
        );
      }

      toast({ title: "Success", description: "Bag updated successfully" });
    },
  });

  const createBuyerMutation = useMutation({
    mutationFn: async (buyerData: { name: string; contactPerson?: string }) => {
      const response = await apiRequest("POST", "/api/buyers", buyerData);
      return response as any;
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

  const saveAllMutation = useMutation({
    mutationFn: async () => {
      const pendingBags = bagData.filter(
        (bag) =>
          bag.status === "pending" && (bag.weight || bag.grade || bag.notes),
      );

      const savePromises = pendingBags.map((bag) => {
        const existingBag = existingBags?.find(
          (eb) => eb.bagNumber === bag.bagNumber,
        );

        if (existingBag) {
          // Update existing bag
          return apiRequest("PUT", `/api/bags/${existingBag.id}`, {
            weight: bag.weight,
            grade: bag.grade,
            notes: bag.notes,
          });
        } else {
          // Create new bag
          return apiRequest("POST", `/api/lots/${lotId}/bags`, {
            bagNumber: bag.bagNumber,
            weight: bag.weight,
            grade: bag.grade,
            notes: bag.notes,
          });
        }
      });

      return await Promise.all(savePromises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/lots/${lotId}/bags`] });

      // Update local state to mark all as saved
      setBagData((prev) =>
        prev.map((bag) =>
          bag.status === "pending" && (bag.weight || bag.grade || bag.notes)
            ? { ...bag, status: "saved" as const }
            : bag,
        ),
      );

      toast({
        title: "Success",
        description: "All bags saved successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Initialize bag data when lot loads
  useEffect(() => {
    if (lot && lot.numberOfBags) {
      if (lot.lotPrice) setLotPrice(lot.lotPrice);
      if (lot.buyerId) setSelectedBuyer(lot.buyerId.toString());
      if (lot.grade) setLotGrade(lot.grade);

      // Create initial bag structure
      const initialBags = Array.from({ length: lot.numberOfBags }, (_, i) => ({
        bagNumber: i + 1,
        status: "pending" as const,
      }));

      // If we have existing bags data, merge it immediately
      if (existingBags && existingBags.length > 0) {
        const mergedBags = initialBags.map((bag) => {
          const existingBag = existingBags.find(
            (eb) => eb.bagNumber === bag.bagNumber,
          );
          if (existingBag) {
            return {
              ...bag,
              weight: existingBag.weight
                ? parseFloat(existingBag.weight.toString())
                : undefined,
              notes: existingBag.notes || undefined,
              status: "saved" as const,
            };
          }
          return bag;
        });
        setBagData(mergedBags);
      } else {
        setBagData(initialBags);
      }
    }
  }, [lot, existingBags]);

  const handleBagUpdate = (bagNumber: number, field: string, value: any) => {
    setBagData((prev) => {
      const updatedBags = prev.map((bag) =>
        bag.bagNumber === bagNumber
          ? { ...bag, [field]: value, status: "pending" as const }
          : bag,
      );

      // Auto-save after a short delay using the updated data
      setTimeout(() => {
        const bagToUpdate = updatedBags.find((b) => b.bagNumber === bagNumber);
        if (bagToUpdate && (bagToUpdate.weight || bagToUpdate.notes)) {
          const existingBag = existingBags?.find(
            (eb) => eb.bagNumber === bagNumber,
          );

          if (existingBag) {
            updateBagMutation.mutate({
              bagId: existingBag.id,
              bag: {
                weight: bagToUpdate.weight?.toString(),
                notes: bagToUpdate.notes,
              },
            });
          } else {
            createBagMutation.mutate({
              bagNumber,
              weight: bagToUpdate.weight?.toString(),
              notes: bagToUpdate.notes,
            });
          }
        }
      }, 1000);

      return updatedBags;
    });
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
      updateLotMutation.mutate({
        lotPrice,
        buyerId: selectedBuyer ? parseInt(selectedBuyer) : undefined,
        // grade: lotGrade || undefined, // Remove grade from lot updates
      });
    }
  };

  // Download auto-scaling bag entry form that fits on single page
  const generateCompactBagForm = () => {
    if (!lot) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    
    // Header
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("BAG ENTRY FORM", pageWidth / 2, 20, { align: "center" });
    
    // Lot details - compact
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    let yPos = 35;
    
    const details = [
      `Lot: ${lot.lotNumber}`,
      `Farmer: ${lot.farmer.name}`,
      `Mobile: ${lot.farmer.mobile}`,
      `Bags: ${lot.numberOfBags}`,
      `Date: ${new Date().toLocaleDateString()}`
    ];
    
    doc.text(details.join("  |  "), margin, yPos);
    
    // Calculate auto-scaling dimensions
    yPos = 55;
    const footerHeight = 25; // Space for signature
    const availableWidth = pageWidth - (margin * 2);
    const availableHeight = pageHeight - yPos - footerHeight - margin;
    
    // Auto-scale based on number of bags
    let cols, rows, cellWidth, cellHeight;
    
    if (lot.numberOfBags <= 20) {
      // Small lots: bigger boxes (4-5 columns)
      cols = Math.min(5, lot.numberOfBags);
      rows = Math.ceil(lot.numberOfBags / cols);
      cellWidth = availableWidth / cols;
      cellHeight = Math.min(availableHeight / rows, 25); // Max 25mm height
    } else if (lot.numberOfBags <= 100) {
      // Medium lots: standard size (6-8 columns)
      cols = 7;
      rows = Math.ceil(lot.numberOfBags / cols);
      cellWidth = availableWidth / cols;
      cellHeight = availableHeight / rows;
    } else if (lot.numberOfBags <= 300) {
      // Large lots: smaller boxes (8-10 columns)
      cols = 10;
      rows = Math.ceil(lot.numberOfBags / cols);
      cellWidth = availableWidth / cols;
      cellHeight = availableHeight / rows;
    } else {
      // Very large lots: tiny boxes (12+ columns)
      cols = Math.min(15, Math.ceil(Math.sqrt(lot.numberOfBags * 1.5)));
      rows = Math.ceil(lot.numberOfBags / cols);
      cellWidth = availableWidth / cols;
      cellHeight = availableHeight / rows;
    }
    
    // Ensure minimum readable size
    cellWidth = Math.max(cellWidth, 12); // Min 12mm width
    cellHeight = Math.max(cellHeight, 8); // Min 8mm height
    
    // If still doesn't fit, recalculate with minimum sizes
    if (rows * cellHeight > availableHeight) {
      cellHeight = availableHeight / rows;
      if (cellHeight < 6) {
        // If too small, increase columns
        cols = Math.ceil(Math.sqrt(lot.numberOfBags * 2));
        rows = Math.ceil(lot.numberOfBags / cols);
        cellWidth = availableWidth / cols;
        cellHeight = availableHeight / rows;
      }
    }
    
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("WEIGHT ENTRY (KG):", margin, yPos - 5);
    
    // Draw auto-scaled grid
    const fontSize = Math.max(4, Math.min(8, cellHeight / 3)); // Scale font with cell size
    doc.setFontSize(fontSize);
    
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const bagNum = row * cols + col + 1;
        if (bagNum > lot.numberOfBags) break;
        
        const x = margin + col * cellWidth;
        const y = yPos + row * cellHeight;
        
        // Draw cell border
        doc.rect(x, y, cellWidth, cellHeight);
        
        // Add bag indicator (scale with cell size)
        if (cellWidth > 15) {
          // For larger cells, add bag number
          doc.setFontSize(Math.max(4, fontSize - 1));
          doc.text(bagNum.toString(), x + 1, y + fontSize + 2);
        } else {
          // For smaller cells, just a dot
          doc.setFontSize(Math.max(3, fontSize - 2));
          doc.text("•", x + 1, y + fontSize + 1);
        }
        
        // Weight line (scale with cell size)
        const lineY = y + cellHeight - 3;
        doc.line(x + 2, lineY, x + cellWidth - 2, lineY);
      }
    }
    
    // Footer with signature
    const footerY = yPos + rows * cellHeight + 10;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("Signature: ___________________", margin, footerY);
    doc.text("Date: ___________", pageWidth - margin - 40, footerY);
    
    // Add scaling info
    doc.setFontSize(7);
    doc.text(`Grid: ${cols} cols × ${rows} rows | Total: ${lot.numberOfBags} bags`, margin, footerY + 8);
    
    // Download
    doc.save(`${lot.lotNumber}_BagEntry_Form.pdf`);
    
    toast({
      title: "Downloaded",
      description: `Auto-scaled form: ${cols}×${rows} grid for ${lot.numberOfBags} bags`,
    });
  };

  const handleLotGradeUpdate = (grade: string) => {
    updateLotMutation.mutate({
      lotPrice: lotPrice || undefined,
      buyerId: selectedBuyer ? parseInt(selectedBuyer) : undefined,
      // grade: grade || undefined, // Remove grade from lot updates
    });
  };

  const handleBuyerUpdate = (buyerId: string) => {
    setSelectedBuyer(buyerId);
    if (buyerId && lot) {
      updateLotMutation.mutate({
        buyerId: parseInt(buyerId),
        lotPrice: lotPrice || undefined,
        // grade: lotGrade || undefined, // Remove grade from lot updates
      });
    }
  };

  const handleSaveAll = () => {
    saveAllMutation.mutate();
  };

  const handleAddExtraBag = () => {
    const nextBagNumber = Math.max(...bagData.map((b) => b.bagNumber)) + 1;
    setBagData((prev) => [
      ...prev,
      {
        bagNumber: nextBagNumber,
        status: "pending" as const,
      },
    ]);
  };

  const handleRemoveBag = (bagNumber: number) => {
    if (bagData.length > 1) {
      setBagData((prev) => prev.filter((bag) => bag.bagNumber !== bagNumber));
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
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Invalid Lot ID
              </h2>
              <p className="text-gray-600 mb-4">
                The lot ID provided is not valid.
              </p>
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
              <p className="text-gray-600 mb-4">
                The requested lot could not be found or is missing farmer
                information.
              </p>
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
        <BackToDashboard />
        <div className="mb-6 flex items-start justify-between">
          <div>
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
          <Button
            variant="outline"
            onClick={generateCompactBagForm}
            className="gap-2 mt-8"
          >
            <Download className="h-4 w-4" />
            Download Form
          </Button>
        </div>

        {/* Lot Information Header */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label className="text-sm font-medium text-gray-500">
                  Farmer Name
                </Label>
                <p className="text-lg font-semibold text-gray-900">
                  {lot.farmer.name}
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-500">
                  Mobile
                </Label>
                <p className="text-lg font-semibold text-gray-900">
                  {lot.farmer.mobile}
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-500">
                  Place
                </Label>
                <p className="text-lg font-semibold text-gray-900">
                  {lot.farmer.place}
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-500">
                  Number of Bags
                </Label>
                <p className="text-lg font-semibold text-gray-900">
                  {lot.numberOfBags}
                </p>
              </div>
            </div>

            {/* Buyer Information */}
            {lot.buyer && (
              <div className="mt-4 pt-4 border-t">
                <Label className="text-sm font-medium text-gray-500">
                  Buyer Information
                </Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                  <div>
                    <p className="font-medium">{lot.buyer.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">
                      Contact: {lot.buyer.contactPerson || "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">
                      Mobile: {lot.buyer.mobile || "N/A"}
                    </p>
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
                  <Select
                    value={selectedBuyer}
                    onValueChange={handleBuyerUpdate}
                  >
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

              <div>
                <Label htmlFor="grade">Grade</Label>
                <div className="flex space-x-2">
                  <Input
                    id="grade"
                    placeholder="Enter grade (e.g., A, B, C)"
                    value={lotGrade}
                    onChange={(e) => setLotGrade(e.target.value)}
                    onBlur={() => handleLotGradeUpdate(lotGrade)}
                  />
                  <VoiceInput
                    onResult={(text) => {
                      setLotGrade(text);
                      handleLotGradeUpdate(text);
                    }}
                    placeholder="Grade"
                    type="text"
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
              <div className="flex items-center space-x-4">
                <div className="text-sm text-gray-600">
                  {bagData.filter((b) => b.status === "saved").length} of{" "}
                  {bagData.length} bags saved
                </div>
                <Button
                  onClick={handleSaveAll}
                  disabled={
                    saveAllMutation.isPending ||
                    bagData.filter(
                      (b) =>
                        b.status === "pending" &&
                        (b.weight || b.grade || b.notes),
                    ).length === 0
                  }
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {saveAllMutation.isPending ? "Saving..." : "Save All"}
                </Button>
              </div>
            </div>

            <div className="space-y-6">
              {bagData.map((bag) => (
                <div
                  key={bag.bagNumber}
                  className={`border rounded-lg p-4 ${
                    bag.status === "saved"
                      ? "border-green-200 bg-green-50"
                      : "border-gray-200"
                  }`}
                >
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-lg font-medium">
                      Bag #{bag.bagNumber}
                      {bag.status === "saved" && (
                        <span className="ml-2 text-green-600 text-sm">
                          ✓ Saved
                        </span>
                      )}
                    </h4>
                    <div className="flex items-center space-x-2">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          bag.status === "saved"
                            ? "bg-green-100 text-green-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {bag.status === "saved" ? "Saved" : "Pending"}
                      </span>
                      {bagData.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveBag(bag.bagNumber)}
                          className="text-red-600 hover:text-red-800 hover:bg-red-50 p-1"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor={`weight-${bag.bagNumber}`}>
                        Weight (kg)
                      </Label>
                      <div className="flex space-x-2">
                        <Input
                          id={`weight-${bag.bagNumber}`}
                          type="number"
                          step="0.5"
                          min="0"
                          placeholder="Enter weight (e.g., 36.5)"
                          value={bag.weight || ""}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value === "") {
                              handleBagUpdate(
                                bag.bagNumber,
                                "weight",
                                undefined,
                              );
                            } else {
                              const numValue = parseFloat(value);
                              if (!isNaN(numValue)) {
                                handleBagUpdate(
                                  bag.bagNumber,
                                  "weight",
                                  numValue,
                                );
                              }
                            }
                          }}
                          className={
                            bag.status === "saved"
                              ? "bg-green-50 border-green-200"
                              : ""
                          }
                        />
                        <VoiceInput
                          onResult={(result) => {
                            const numValue = parseFloat(result);
                            if (!isNaN(numValue)) {
                              handleBagUpdate(
                                bag.bagNumber,
                                "weight",
                                numValue,
                              );
                            }
                          }}
                          type="number"
                          placeholder="Voice input"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor={`notes-${bag.bagNumber}`}>Notes</Label>
                      <div className="flex gap-2">
                        <Input
                          id={`notes-${bag.bagNumber}`}
                          placeholder="Enter notes"
                          value={bag.notes || ""}
                          onChange={(e) =>
                            handleBagUpdate(
                              bag.bagNumber,
                              "notes",
                              e.target.value,
                            )
                          }
                          className={`flex-1 ${
                            bag.status === "saved"
                              ? "bg-green-50 border-green-200"
                              : ""
                          }`}
                        />
                        <VoiceInput
                          onResult={(text) =>
                            handleBagUpdate(
                              bag.bagNumber,
                              "notes",
                              text,
                            )
                          }
                          type="text"
                          placeholder="Voice input"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Summary Statistics */}
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <Label className="text-sm font-medium text-blue-600">
                    Total Bags
                  </Label>
                  <p className="text-2xl font-bold text-blue-800">
                    {bagData.length}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-blue-600">
                    Bags with Weight
                  </Label>
                  <p className="text-2xl font-bold text-blue-800">
                    {
                      bagData.filter((bag) => bag.weight && bag.weight > 0)
                        .length
                    }
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-blue-600">
                    Total Weight
                  </Label>
                  <p className="text-2xl font-bold text-blue-800">
                    {bagData
                      .filter((bag) => bag.weight && bag.weight > 0)
                      .reduce((sum, bag) => sum + (bag.weight || 0), 0)
                      .toFixed(1)}{" "}
                    kg
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-blue-600">
                    Average Weight
                  </Label>
                  <p className="text-2xl font-bold text-blue-800">
                    {(() => {
                      const bagsWithWeight = bagData.filter(
                        (bag) => bag.weight && bag.weight > 0,
                      );
                      const totalWeight = bagsWithWeight.reduce(
                        (sum, bag) => sum + (bag.weight || 0),
                        0,
                      );
                      return bagsWithWeight.length > 0
                        ? (totalWeight / bagsWithWeight.length).toFixed(1)
                        : "0.0";
                    })()}{" "}
                    kg
                  </p>
                </div>
              </div>
            </div>

            {/* Bottom Action Buttons */}
            <div className="flex justify-between items-center mt-6 pt-4 border-t">
              <div className="flex space-x-3">
                <Button
                  onClick={handleAddExtraBag}
                  variant="outline"
                  className="bg-green-50 hover:bg-green-100 border-green-200"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Extra Bag
                </Button>

                <Button
                  onClick={() => setLocation("/lots")}
                  variant="outline"
                  className="flex items-center space-x-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Go to Lots
                </Button>
              </div>

              <Button
                onClick={handleSaveAll}
                disabled={
                  saveAllMutation.isPending ||
                  bagData.filter(
                    (b) => b.status === "pending" && (b.weight || b.notes),
                  ).length === 0
                }
                className="bg-blue-600 hover:bg-blue-700"
              >
                {saveAllMutation.isPending ? "Saving..." : "Save All"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
