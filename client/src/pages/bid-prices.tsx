import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Navigation } from "@/components/navigation";
import { UnifiedInput } from "@/components/ui/unified-input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { 
  Camera, 
  Plus, 
  Edit, 
  Trash2, 
  PlusCircle,
  IndianRupee,
  Calendar,
  MapPin,
  Phone,
  Users,
  Package
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { BackToDashboard } from "@/components/back-to-dashboard";

interface DalalLotSummary {
  dalalName: string;
  dalalContact: string;
  dalalAddress: string;
  lots: Array<{
    id: number;
    lotNumber: string;
    bidPrice: string;
    buyerName: string;
    bidDate: string;
    chiliPhotos: any[];
    notes: string;
  }>;
  totalLots: number;
}

interface BidForm {
  dalalName: string;
  lotNumber: string;
  bidPrice: string;
  notes: string;
  chiliPhotos: string[];
}

export default function BidPrices() {
  const { toast } = useToast();
  const [bidDialog, setBidDialog] = useState(false);
  const [editingBid, setEditingBid] = useState<any>(null);
  const [selectedDalal, setSelectedDalal] = useState<string>("");
  const [searchDalal, setSearchDalal] = useState("");
  const [showDalalForm, setShowDalalForm] = useState(false);
  const [newDalalForm, setNewDalalForm] = useState({
    name: "",
    mobile: "",
    address: "",
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  
  const [bidForm, setBidForm] = useState<BidForm>({
    dalalName: "",
    lotNumber: "",
    bidPrice: "",
    notes: "",
    chiliPhotos: [],
  });



  // Fetch all dalals with their lots
  const { data: dalalLots = [], isLoading: loadingDalals } = useQuery({
    queryKey: ["/api/bid-dalals"],
  });

  // Fetch dalal suggestions from suppliers
  const { data: dalalSuggestions = [] } = useQuery({
    queryKey: ["/api/suppliers", searchDalal],
    enabled: searchDalal.length > 0,
  });

  // Create bid price mutation
  const createBidMutation = useMutation({
    mutationFn: async (data: BidForm) => {
      const endpoint = editingBid ? `/api/bid-prices/${editingBid.id}` : "/api/bid-prices";
      const method = editingBid ? "PUT" : "POST";
      return await apiRequest(method, endpoint, data);
    },
    onSuccess: () => {
      toast({
        title: editingBid ? "Bid Updated" : "Bid Created",
        description: `Bid for ${bidForm.dalalName} - Lot ${bidForm.lotNumber} has been ${editingBid ? 'updated' : 'created'} successfully.`,
      });
      setBidDialog(false);
      setEditingBid(null);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["/api/bid-dalals"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || `Failed to ${editingBid ? 'update' : 'create'} bid price.`,
        variant: "destructive",
      });
    },
  });

  // Delete bid mutation
  const deleteBidMutation = useMutation({
    mutationFn: async (bidId: number) => {
      return await apiRequest("DELETE", `/api/bid-prices/${bidId}`);
    },
    onSuccess: () => {
      toast({
        title: "Bid Deleted",
        description: "Bid price has been deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/bid-dalals"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete bid price.",
        variant: "destructive",
      });
    },
  });

  // Create new dalal mutation
  const createDalalMutation = useMutation({
    mutationFn: async (dalalData: any) => {
      return await apiRequest("POST", "/api/suppliers", dalalData);
    },
    onSuccess: (newDalal) => {
      toast({
        title: "Dalal Created",
        description: `${newDalal.name} has been added successfully.`,
      });
      setBidForm(prev => ({ ...prev, dalalName: newDalal.name }));
      setNewDalalForm({ name: "", mobile: "", address: "" });
      setShowDalalForm(false);
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create dalal.",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setBidForm({
      dalalName: "",
      lotNumber: "",
      bidPrice: "",
      notes: "",
      chiliPhotos: [],
    });
    setSearchDalal("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!bidForm.dalalName || !bidForm.lotNumber || !bidForm.bidPrice) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    createBidMutation.mutate(bidForm);
  };

  const handleEdit = (bid: any) => {
    setEditingBid(bid);
    setBidForm({
      dalalName: bid.dalalName,
      lotNumber: bid.lotNumber,
      bidPrice: bid.bidPrice,
      notes: bid.notes || "",
      chiliPhotos: bid.chiliPhotos || [],
    });
    setBidDialog(true);
  };

  const handleFileUpload = (files: FileList | null) => {
    if (!files) return;
    
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target?.result as string;
        setBidForm(prev => ({
          ...prev,
          chiliPhotos: [...prev.chiliPhotos, base64]
        }));
      };
      reader.readAsDataURL(file);
    });
  };

  const handleCameraCapture = () => {
    if (cameraInputRef.current) {
      cameraInputRef.current.click();
    }
  };

  const removePhoto = (index: number) => {
    setBidForm(prev => ({
      ...prev,
      chiliPhotos: prev.chiliPhotos.filter((_, i) => i !== index)
    }));
  };

  const handleDalalSuggestionSelect = (dalal: any) => {
    setBidForm(prev => ({
      ...prev,
      dalalName: dalal.name
    }));
    setSearchDalal("");
  };

  const handleCreateDalal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDalalForm.name || !newDalalForm.mobile) {
      toast({
        title: "Validation Error",
        description: "Please fill in dalal name and mobile number.",
        variant: "destructive",
      });
      return;
    }
    createDalalMutation.mutate(newDalalForm);
  };

  const handleNewDalalClick = () => {
    setNewDalalForm({ name: searchDalal, mobile: "", address: "" });
    setShowDalalForm(true);
  };

  // Filter dalals based on search
  const filteredDalals = selectedDalal 
    ? dalalLots.filter((dalal: DalalLotSummary) => dalal.dalalName === selectedDalal)
    : dalalLots;

  if (loadingDalals) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="p-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-32 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Bid Prices - Dalal Shops</h1>
            <p className="text-gray-600">Manage your chili bids at various dalal shops</p>
          </div>
          <div className="flex items-center gap-3">
            <BackToDashboard />
            <Dialog open={bidDialog} onOpenChange={setBidDialog}>
              <DialogTrigger asChild>
                <Button onClick={() => { resetForm(); setEditingBid(null); }}>
                  <PlusCircle className="h-4 w-4 mr-2" />
                  New Bid
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingBid ? "Edit Bid Price" : "Create New Bid Price"}
                  </DialogTitle>
                </DialogHeader>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Dalal Name with Suggestions */}
                  <div className="space-y-2">
                    <Label htmlFor="dalalName">Dalal Name *</Label>
                    <div className="relative">
                      <UnifiedInput
                        id="dalalName"
                        placeholder="Enter or search dalal name"
                        value={bidForm.dalalName}
                        onChange={(value) => {
                          setBidForm(prev => ({ ...prev, dalalName: value }));
                          setSearchDalal(value);
                        }}
                        required
                      />
                      {searchDalal && (
                        <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-md shadow-lg z-10 max-h-48 overflow-y-auto">
                          {dalalSuggestions.length > 0 ? (
                            dalalSuggestions.map((dalal: any, index: number) => (
                              <div
                                key={index}
                                className="p-3 hover:bg-gray-50 cursor-pointer border-b"
                                onClick={() => handleDalalSuggestionSelect(dalal)}
                              >
                                <div className="font-medium">{dalal.name}</div>
                                {dalal.mobile && (
                                  <div className="text-sm text-gray-500">{dalal.mobile}</div>
                                )}
                              </div>
                            ))
                          ) : (
                            <div className="p-3">
                              <div className="text-sm text-gray-500 mb-2">No dalal found with "{searchDalal}"</div>
                              <Button
                                type="button"
                                size="sm"
                                onClick={handleNewDalalClick}
                                className="w-full"
                              >
                                <Plus className="h-4 w-4 mr-2" />
                                Create New Dalal: {searchDalal}
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Lot Number and Bid Price */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="lotNumber">Lot Number *</Label>
                      <UnifiedInput
                        id="lotNumber"
                        placeholder="Enter lot number"
                        value={bidForm.lotNumber}
                        onChange={(value) => setBidForm(prev => ({ ...prev, lotNumber: value }))}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="bidPrice">Bid Price (₹) *</Label>
                      <UnifiedInput
                        id="bidPrice"
                        type="number"
                        step="0.01"
                        placeholder="Enter bid price"
                        value={bidForm.bidPrice}
                        onChange={(value) => setBidForm(prev => ({ ...prev, bidPrice: value }))}
                        required
                      />
                    </div>
                  </div>

                  {/* New Dalal Creation Form */}
                  {showDalalForm && (
                    <div className="border rounded-lg p-4 bg-blue-50 border-blue-200">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-blue-900">Create New Dalal</h4>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowDalalForm(false)}
                        >
                          ×
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <Label htmlFor="newDalalName">Dalal Name *</Label>
                          <UnifiedInput
                            id="newDalalName"
                            placeholder="Enter dalal name"
                            value={newDalalForm.name}
                            onChange={(value) => setNewDalalForm(prev => ({ ...prev, name: value }))}
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="newDalalMobile">Mobile *</Label>
                          <UnifiedInput
                            id="newDalalMobile"
                            placeholder="Enter mobile number"
                            value={newDalalForm.mobile}
                            onChange={(value) => setNewDalalForm(prev => ({ ...prev, mobile: value }))}
                            required
                          />
                        </div>
                      </div>
                      <div className="mt-3">
                        <Label htmlFor="newDalalAddress">Address</Label>
                        <UnifiedInput
                          id="newDalalAddress"
                          placeholder="Enter address"
                          value={newDalalForm.address}
                          onChange={(value) => setNewDalalForm(prev => ({ ...prev, address: value }))}
                        />
                      </div>
                      <div className="flex justify-end gap-2 mt-3">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setShowDalalForm(false)}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          onClick={handleCreateDalal}
                          disabled={createDalalMutation.isPending}
                        >
                          {createDalalMutation.isPending ? "Creating..." : "Create Dalal"}
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  <div>
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      placeholder="Enter any additional notes"
                      value={bidForm.notes}
                      onChange={(e) => setBidForm(prev => ({ ...prev, notes: e.target.value }))}
                      rows={3}
                    />
                  </div>

                  {/* Photo Capture */}
                  <div className="space-y-2">
                    <Label>Chili Photos</Label>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleCameraCapture}
                      >
                        <Camera className="h-4 w-4 mr-2" />
                        Take Photo
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Upload
                      </Button>
                    </div>
                    
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) => handleFileUpload(e.target.files)}
                    />
                    
                    <input
                      ref={cameraInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={(e) => handleFileUpload(e.target.files)}
                    />

                    {/* Photo Preview */}
                    {bidForm.chiliPhotos.length > 0 && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {bidForm.chiliPhotos.map((photo, index) => (
                          <div key={index} className="relative">
                            <img
                              src={photo}
                              alt={`Chili photo ${index + 1}`}
                              className="w-full h-24 object-cover rounded border"
                            />
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              className="absolute top-1 right-1 h-6 w-6 p-0"
                              onClick={() => removePhoto(index)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Submit Button */}
                  <div className="flex justify-end gap-3 pt-4">
                    <Button type="button" variant="outline" onClick={() => setBidDialog(false)}>
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={createBidMutation.isPending}
                    >
                      {createBidMutation.isPending ? "Saving..." : (editingBid ? "Update Bid" : "Create Bid")}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Dalal Filter */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Label htmlFor="dalalFilter">Filter by Dalal</Label>
                <select
                  id="dalalFilter"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={selectedDalal}
                  onChange={(e) => setSelectedDalal(e.target.value)}
                >
                  <option value="">All Dalals</option>
                  {dalalLots.map((dalal: DalalLotSummary) => (
                    <option key={dalal.dalalName} value={dalal.dalalName}>
                      {dalal.dalalName} ({dalal.totalLots} lots)
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Users className="h-4 w-4" />
                <span>{dalalLots.length} dalals</span>
                <Package className="h-4 w-4 ml-2" />
                <span>{dalalLots.reduce((total: number, dalal: DalalLotSummary) => total + dalal.totalLots, 0)} total lots</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Dalals and Lots Display */}
        <div className="space-y-6">
          {filteredDalals.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Package className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Dalals Found</h3>
                <p className="text-gray-500 mb-4">Start by creating your first bid at a dalal shop.</p>
                <Button onClick={() => setBidDialog(true)}>
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Create First Bid
                </Button>
              </CardContent>
            </Card>
          ) : (
            filteredDalals.map((dalal: DalalLotSummary) => (
              <Card key={dalal.dalalName}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <MapPin className="h-5 w-5" />
                        {dalal.dalalName}
                      </CardTitle>
                      <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                        {dalal.dalalContact && (
                          <div className="flex items-center gap-1">
                            <Phone className="h-4 w-4" />
                            {dalal.dalalContact}
                          </div>
                        )}
                        <Badge variant="secondary">
                          {dalal.totalLots} lots
                        </Badge>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setBidForm(prev => ({ ...prev, dalalName: dalal.dalalName }));
                        setBidDialog(true);
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Lot
                    </Button>
                  </div>
                </CardHeader>

                {dalal.lots.length > 0 && (
                  <CardContent>
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Lot Number</TableHead>
                            <TableHead>Buyer</TableHead>
                            <TableHead>Bid Price</TableHead>
                            <TableHead>Bid Date</TableHead>
                            <TableHead>Photos</TableHead>
                            <TableHead>Notes</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {dalal.lots.map((lot) => (
                            <TableRow key={lot.id}>
                              <TableCell className="font-medium">{lot.lotNumber}</TableCell>
                              <TableCell>{lot.buyerName}</TableCell>
                              <TableCell>
                                <div className="flex items-center">
                                  <IndianRupee className="h-4 w-4 mr-1" />
                                  {parseFloat(lot.bidPrice).toLocaleString('en-IN')}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center text-sm text-gray-600">
                                  <Calendar className="h-4 w-4 mr-1" />
                                  {new Date(lot.bidDate).toLocaleDateString()}
                                </div>
                              </TableCell>
                              <TableCell>
                                {lot.chiliPhotos && lot.chiliPhotos.length > 0 ? (
                                  <Badge variant="outline">
                                    {lot.chiliPhotos.length} photo{lot.chiliPhotos.length > 1 ? 's' : ''}
                                  </Badge>
                                ) : (
                                  <span className="text-gray-400">No photos</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {lot.notes ? (
                                  <span className="text-sm">{lot.notes.substring(0, 30)}{lot.notes.length > 30 ? '...' : ''}</span>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleEdit(lot)}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => deleteBidMutation.mutate(lot.id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                )}
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}