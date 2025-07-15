import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Navigation } from "@/components/navigation";

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
  Package,
  Loader2,
  Image,
  ChevronLeft,
  ChevronRight,
  X,
  ZoomIn,
  ZoomOut,
  RotateCcw
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { BackToDashboard } from "@/components/back-to-dashboard";

interface DalalLotSummary {
  dalalName: string;
  dalalContact: string;
  dalalAddress: string;
  apmcCode: string;
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
  const [createDalalOpen, setCreateDalalOpen] = useState(false);
  const [dalalForm, setDalalForm] = useState({
    name: "",
    contactPerson: "",
    mobile: "",
    address: "",
    apmcCode: ""
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  
  // Initialize form with localStorage data if available
  const [bidForm, setBidForm] = useState<BidForm>(() => {
    try {
      const saved = localStorage.getItem('bidForm');
      if (saved) {
        const parsed = JSON.parse(saved);
        console.log("Restored form data from localStorage:", parsed);
        return parsed;
      }
    } catch (error) {
      console.error("Error restoring form data:", error);
    }
    return {
      dalalName: "",
      lotNumber: "",
      bidPrice: "",
      notes: "",
      chiliPhotos: [],
    };
  });
  
  // Photo viewer state
  const [photoViewer, setPhotoViewer] = useState({
    open: false,
    photos: [] as any[],
    currentIndex: 0,
    lotInfo: { dalalName: "", lotNumber: "" },
    zoom: 1,
    panX: 0,
    panY: 0
  });



  // Fetch all dalals with their lots
  const { data: dalalLots = [], isLoading: loadingDalals } = useQuery({
    queryKey: ["/api/bid-dalals"],
  });

  // Fetch all suppliers for dalal suggestions
  const { data: allSuppliers = [] } = useQuery({
    queryKey: ["/api/suppliers"],
  });

  // Filter suppliers based on search term with enhanced matching
  const dalalSuggestions = searchDalal.length > 0 
    ? allSuppliers.filter((supplier: any) => {
        const searchTerm = searchDalal.toLowerCase();
        return (
          (supplier.name && supplier.name.toLowerCase().includes(searchTerm)) ||
          (supplier.mobile && supplier.mobile.includes(searchTerm)) ||
          (supplier.address && supplier.address.toLowerCase().includes(searchTerm))
        );
      }).slice(0, 5) // Limit to 5 suggestions
    : [];

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
        description: `Bid for ${String(bidForm.dalalName)} - Lot ${String(bidForm.lotNumber)} has been ${editingBid ? 'updated' : 'created'} successfully.`,
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

  // Create dalal mutation
  const createDalalMutation = useMutation({
    mutationFn: async (dalalData: any) => {
      // Remove empty fields that could cause database errors
      const cleanData = {
        name: dalalData.name,
        apmcCode: dalalData.apmcCode || null,
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
    onSuccess: (newSupplier: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
      setCreateDalalOpen(false);
      setDalalForm({
        name: "",
        contactPerson: "",
        mobile: "",
        address: "",
        apmcCode: ""
      });
      // Auto-select the new dalal in the form
      const newDalalName = String(newSupplier.name || "");
      setBidForm(prev => ({ 
        ...prev, 
        dalalName: newDalalName
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

  // Save form data to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('bidForm', JSON.stringify(bidForm));
    } catch (error) {
      console.error("Error saving form data:", error);
    }
  }, [bidForm]);

  const resetForm = () => {
    const emptyForm = {
      dalalName: "",
      lotNumber: "",
      bidPrice: "",
      notes: "",
      chiliPhotos: [],
    };
    setBidForm(emptyForm);
    setSearchDalal("");
    setEditingBid(null);
    // Clear localStorage
    try {
      localStorage.removeItem('bidForm');
      console.log("Form data cleared from localStorage");
    } catch (error) {
      console.error("Error clearing form data:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Prevent multiple submissions
    if (createBidMutation.isPending) {
      console.log("Form submission blocked - mutation in progress");
      return;
    }
    
    // Validate required fields
    if (!bidForm.dalalName || !bidForm.lotNumber || !bidForm.bidPrice) {
      console.log("Form validation failed:", {
        dalalName: bidForm.dalalName,
        lotNumber: bidForm.lotNumber,
        bidPrice: bidForm.bidPrice
      });
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields: Dalal Name, Lot Number, and Bid Price.",
        variant: "destructive",
      });
      return;
    }

    // Validate bid price is a valid number
    const priceNumber = parseFloat(bidForm.bidPrice);
    if (isNaN(priceNumber) || priceNumber <= 0) {
      console.log("Price validation failed:", bidForm.bidPrice);
      toast({
        title: "Validation Error",
        description: "Bid price must be a valid positive number.",
        variant: "destructive",
      });
      return;
    }

    console.log("Submitting bid price with photos:", {
      dalalName: bidForm.dalalName,
      lotNumber: bidForm.lotNumber,
      bidPrice: bidForm.bidPrice,
      notes: bidForm.notes,
      photosCount: bidForm.chiliPhotos.length
    });

    createBidMutation.mutate(bidForm);
  };

  const handleEdit = (bid: any) => {
    setEditingBid(bid);
    setBidForm({
      dalalName: typeof bid.dalalName === 'string' ? bid.dalalName : String(bid.dalalName || ""),
      lotNumber: typeof bid.lotNumber === 'string' ? bid.lotNumber : String(bid.lotNumber || ""),
      bidPrice: typeof bid.bidPrice === 'string' ? bid.bidPrice : String(bid.bidPrice || ""),
      notes: typeof bid.notes === 'string' ? bid.notes : String(bid.notes || ""),
      chiliPhotos: Array.isArray(bid.chiliPhotos) ? bid.chiliPhotos : [],
    });
    setBidDialog(true);
  };

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const img = new Image();
      
      img.onload = () => {
        // Calculate new dimensions to keep under 1MB
        const maxWidth = 1024;
        const maxHeight = 1024;
        let { width, height } = img;
        
        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height);
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7); // 70% quality
        resolve(compressedBase64);
      };
      
      img.src = URL.createObjectURL(file);
    });
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files) return;
    
    // Validate that dalal name and lot number are provided before upload
    if (!bidForm.dalalName || !bidForm.lotNumber) {
      toast({
        title: "Information Required",
        description: "Please enter Dalal name and Lot number before uploading photos.",
        variant: "destructive",
      });
      return;
    }
    
    console.log("Photo upload starting with:", {
      dalalName: bidForm.dalalName,
      lotNumber: bidForm.lotNumber,
      files: files.length
    });
    
    try {
      const formData = new FormData();
      Array.from(files).forEach(file => {
        formData.append('photos', file);
      });
      
      // Add metadata for photo organization
      formData.append('dalalName', bidForm.dalalName);
      formData.append('lotNumber', bidForm.lotNumber);
      
      const response = await fetch('/api/bid-photos', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Upload failed');
      }
      
      const { photos } = await response.json();
      const photoUrlsWithMetadata = photos.map((photo: any) => ({
        url: photo.url,
        metadata: photo.metadata
      }));
      
      setBidForm(prev => ({
        ...prev,
        chiliPhotos: [...prev.chiliPhotos, ...photoUrlsWithMetadata]
      }));
      
      toast({
        title: "Success",
        description: `${photos.length} photo(s) uploaded for ${bidForm.dalalName} - Lot ${bidForm.lotNumber}. Form data saved automatically.`,
      });
      
      console.log("Photos uploaded successfully:", photos.length);
      console.log("Form data auto-saved to localStorage");
    } catch (error) {
      console.error("Photo upload error:", error);
      toast({
        title: "Upload Error",
        description: "Failed to upload photos. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleCameraCapture = () => {
    cameraInputRef.current?.click();
  };

  const handleCameraFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    e.stopPropagation();
    await handleFileUpload(e.target.files);
    // Clear the input value to allow same file to be selected again
    if (e.target) {
      e.target.value = '';
    }
  };

  const removePhoto = (index: number) => {
    setBidForm(prev => ({
      ...prev,
      chiliPhotos: prev.chiliPhotos.filter((_, i) => i !== index)
    }));
  };

  // Photo zoom and pan functions
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [lastTouchDistance, setLastTouchDistance] = useState(0);

  const handleZoomIn = () => {
    setPhotoViewer(prev => ({
      ...prev,
      zoom: Math.min(prev.zoom * 1.5, 5) // Max zoom 5x
    }));
  };

  const handleZoomOut = () => {
    setPhotoViewer(prev => ({
      ...prev,
      zoom: Math.max(prev.zoom / 1.5, 0.5) // Min zoom 0.5x
    }));
  };

  const resetZoom = () => {
    setPhotoViewer(prev => ({
      ...prev,
      zoom: 1,
      panX: 0,
      panY: 0
    }));
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.5, Math.min(5, photoViewer.zoom * delta));
    
    setPhotoViewer(prev => ({
      ...prev,
      zoom: newZoom
    }));
  };

  // Mouse events for desktop
  const handleMouseDown = (e: React.MouseEvent) => {
    if (photoViewer.zoom > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - photoViewer.panX, y: e.clientY - photoViewer.panY });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && photoViewer.zoom > 1) {
      setPhotoViewer(prev => ({
        ...prev,
        panX: e.clientX - dragStart.x,
        panY: e.clientY - dragStart.y
      }));
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch events for mobile
  const getTouchDistance = (touches: TouchList) => {
    if (touches.length < 2) return 0;
    const touch1 = touches[0];
    const touch2 = touches[1];
    return Math.sqrt(
      Math.pow(touch2.clientX - touch1.clientX, 2) + 
      Math.pow(touch2.clientY - touch1.clientY, 2)
    );
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      // Pinch to zoom start
      const distance = getTouchDistance(e.touches);
      setLastTouchDistance(distance);
    } else if (e.touches.length === 1 && photoViewer.zoom > 1) {
      // Single touch pan start
      setIsDragging(true);
      const touch = e.touches[0];
      setDragStart({ x: touch.clientX - photoViewer.panX, y: touch.clientY - photoViewer.panY });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    
    if (e.touches.length === 2) {
      // Pinch to zoom
      const distance = getTouchDistance(e.touches);
      if (lastTouchDistance > 0) {
        const scale = distance / lastTouchDistance;
        const newZoom = Math.max(0.5, Math.min(5, photoViewer.zoom * scale));
        setPhotoViewer(prev => ({
          ...prev,
          zoom: newZoom
        }));
      }
      setLastTouchDistance(distance);
    } else if (e.touches.length === 1 && isDragging && photoViewer.zoom > 1) {
      // Single touch pan
      const touch = e.touches[0];
      setPhotoViewer(prev => ({
        ...prev,
        panX: touch.clientX - dragStart.x,
        panY: touch.clientY - dragStart.y
      }));
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    setLastTouchDistance(0);
  };

  const handleDalalSuggestionSelect = (dalal: any) => {
    const dalalName = typeof dalal.name === 'string' ? dalal.name : String(dalal.name || "");
    console.log("Selecting dalal - name:", dalalName, "type:", typeof dalalName);
    setBidForm(prev => ({
      ...prev,
      dalalName: dalalName
    }));
    setSearchDalal("");
  };

  const handleCreateDalal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dalalForm.name) {
      toast({
        title: "Validation Error",
        description: "Please enter dalal name.",
        variant: "destructive",
      });
      return;
    }
    createDalalMutation.mutate(dalalForm);
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
            
            {/* Create Supplier Button */}
            <Button variant="outline" onClick={() => setCreateDalalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Supplier
            </Button>

            {/* New Bid Button */}
            <Dialog open={bidDialog} onOpenChange={setBidDialog}>
              <DialogTrigger asChild>
                <Button onClick={() => { 
                  resetForm(); 
                  setEditingBid(null);
                }}>
                  <PlusCircle className="h-4 w-4 mr-2" />
                  New Bid
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[95vw] max-w-2xl h-[95vh] max-h-[95vh] overflow-y-auto p-4">
                <DialogHeader>
                  <DialogTitle>
                    {editingBid ? "Edit Bid Price" : "Create New Bid Price"}
                  </DialogTitle>
                  {bidForm.dalalName || bidForm.lotNumber || bidForm.bidPrice ? (
                    <div className="text-sm text-green-600 bg-green-50 p-2 rounded">
                      💾 Form data auto-saved (survives page reload)
                    </div>
                  ) : null}
                </DialogHeader>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Simplified Dalal Name Selection */}
                  <div className="space-y-2">
                    <Label htmlFor="dalalName" className="text-base font-medium">Select Supplier/Dalal *</Label>
                    <div className="relative">
                      <Input
                        id="dalalName"
                        placeholder="Type to search suppliers..."
                        value={bidForm.dalalName}
                        onChange={(e) => {
                          const stringValue = e.target.value;
                          setBidForm(prev => ({ ...prev, dalalName: stringValue }));
                          setSearchDalal(stringValue);
                        }}
                        required
                        className="min-h-[44px] text-base"
                      />
                      {searchDalal && (
                        <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-md shadow-lg z-10 max-h-48 overflow-y-auto">
                          {dalalSuggestions.length > 0 ? (
                            dalalSuggestions.map((dalal: any, index: number) => (
                              <div
                                key={index}
                                className="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                                onClick={() => handleDalalSuggestionSelect(dalal)}
                              >
                                <div className="font-medium text-gray-900">{String(dalal.name || '')}</div>
                                {dalal.mobile && (
                                  <div className="text-sm text-gray-500">📱 {String(dalal.mobile)}</div>
                                )}
                                {dalal.address && (
                                  <div className="text-xs text-gray-400 mt-1">📍 {String(dalal.address)}</div>
                                )}
                              </div>
                            ))
                          ) : (
                            <div className="p-3 text-center text-gray-500">
                              <div className="text-sm">No suppliers found matching "{searchDalal}"</div>
                              <div className="text-xs mt-1">Use "Create Supplier" button to add new supplier</div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">
                      💡 Search by name, mobile, or address. Can't find? Use "Create Supplier" button above.
                    </p>
                  </div>

                  {/* Lot Number and Bid Price */}
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <Label htmlFor="lotNumber" className="text-base font-medium">Lot Number *</Label>
                      <Input
                        id="lotNumber"
                        placeholder="Enter lot number"
                        value={bidForm.lotNumber || ""}
                        onChange={(e) => setBidForm(prev => ({ ...prev, lotNumber: e.target.value }))}
                        required
                        className="min-h-[44px] text-base"
                      />
                    </div>
                    <div>
                      <Label htmlFor="bidPrice" className="text-base font-medium">Bid Price (₹) *</Label>
                      <Input
                        id="bidPrice"
                        type="number"
                        step="0.01"
                        placeholder="Enter bid price"
                        value={bidForm.bidPrice || ""}
                        onChange={(e) => setBidForm(prev => ({ ...prev, bidPrice: e.target.value }))}
                        required
                        className="min-h-[44px] text-base"
                      />
                    </div>
                  </div>



                  {/* Notes */}
                  <div>
                    <Label htmlFor="notes" className="text-base">Notes</Label>
                    <Textarea
                      id="notes"
                      placeholder="Enter any additional notes"
                      value={bidForm.notes || ""}
                      onChange={(e) => setBidForm(prev => ({ ...prev, notes: String(e.target.value) }))}
                      rows={3}
                      className="min-h-[44px] text-base resize-none"
                    />
                  </div>

                  {/* Photo Capture */}
                  <div className="space-y-2">
                    <Label className="text-base font-medium">Chili Photos</Label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleCameraCapture}
                        className="flex-1 sm:flex-none min-h-[44px]"
                      >
                        <Camera className="h-4 w-4 mr-2" />
                        Take Photo
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex-1 sm:flex-none min-h-[44px]"
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
                      onChange={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleFileUpload(e.target.files);
                        // Clear the input value to allow same file to be selected again
                        if (e.target) {
                          e.target.value = '';
                        }
                      }}
                    />
                    
                    <input
                      ref={cameraInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={handleCameraFiles}
                    />

                    {/* Photo Preview with Metadata */}
                    {bidForm.chiliPhotos.length > 0 && (
                      <div className="grid grid-cols-2 gap-3">
                        {bidForm.chiliPhotos.map((photo, index) => {
                          const photoUrl = typeof photo === 'string' ? photo : photo.url;
                          const metadata = typeof photo === 'object' ? photo.metadata : null;
                          
                          return (
                            <div key={index} className="relative border rounded-lg overflow-hidden">
                              <img
                                src={`/${photoUrl}`}
                                alt={`Chili photo ${index + 1}`}
                                className="w-full h-24 object-cover"
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
                              {metadata && (
                                <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-70 text-white text-xs p-1">
                                  <div>{metadata.supplierName}</div>
                                  <div>Lot: {metadata.lotNumber}</div>
                                  <div>{metadata.uploadDate}</div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Submit Button */}
                  <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setBidDialog(false)}
                      className="w-full sm:w-auto"
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={createBidMutation.isPending}
                      className="w-full sm:w-auto"
                    >
                      {createBidMutation.isPending ? "Saving..." : (editingBid ? "Update Bid" : "Create Bid")}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>

            {/* Create Dalal Dialog - Copied from Inventory Screen */}
            <Dialog open={createDalalOpen} onOpenChange={setCreateDalalOpen}>
              <DialogContent className="max-w-3xl max-h-[95vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create New Dalal/Supplier (Including APMC Code)</DialogTitle>
                </DialogHeader>
                
                <form onSubmit={handleCreateDalal} className="space-y-4">
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="dalalName">Dalal Name *</Label>
                        <Input
                          id="dalalName"
                          placeholder="Enter dalal name"
                          value={dalalForm.name || ""}
                          onChange={(e) => setDalalForm(prev => ({ ...prev, name: e.target.value }))}
                          required
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="apmcCode" className="text-blue-600 font-semibold">APMC Code *</Label>
                        <Input
                          id="apmcCode"
                          placeholder="Enter APMC code (Required)"
                          value={dalalForm.apmcCode || ""}
                          onChange={(e) => setDalalForm(prev => ({ ...prev, apmcCode: e.target.value }))}
                          className="border-blue-300 focus:border-blue-500"
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="contactPerson">Contact Person</Label>
                        <Input
                          id="contactPerson"
                          placeholder="Enter contact person name"
                          value={dalalForm.contactPerson || ""}
                          onChange={(e) => setDalalForm(prev => ({ ...prev, contactPerson: e.target.value }))}
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="mobile">Mobile Number</Label>
                        <Input
                          id="mobile"
                          placeholder="Enter mobile number"
                          value={dalalForm.mobile || ""}
                          onChange={(e) => setDalalForm(prev => ({ ...prev, mobile: e.target.value }))}
                        />
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="address">Address</Label>
                      <Input
                        id="address"
                        placeholder="Enter full address"
                        value={dalalForm.address || ""}
                        onChange={(e) => setDalalForm(prev => ({ ...prev, address: e.target.value }))}
                      />
                    </div>
                  </div>
                  
                  <div className="flex justify-end gap-2 mt-6">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setCreateDalalOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={createDalalMutation.isPending}
                    >
                      {createDalalMutation.isPending ? (
                        <>
                          <Package className="mr-2 h-4 w-4 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <Plus className="mr-2 h-4 w-4" />
                          Create Dalal
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
            
            {/* Photo Viewer Dialog */}
            <Dialog open={photoViewer.open} onOpenChange={(open) => setPhotoViewer(prev => ({ ...prev, open }))}>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
                <DialogHeader>
                  <DialogTitle className="flex items-center justify-between">
                    <span>Photos - {photoViewer.lotInfo.dalalName} (Lot {photoViewer.lotInfo.lotNumber})</span>
                    <span className="text-sm font-normal text-gray-500">
                      {photoViewer.currentIndex + 1} of {photoViewer.photos.length}
                    </span>
                  </DialogTitle>
                </DialogHeader>
                
                {photoViewer.photos.length > 0 && (
                  <div className="relative">
                    {/* Zoom Controls */}
                    <div className="absolute top-2 right-2 z-10 flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleZoomIn}
                        title="Zoom In"
                      >
                        <ZoomIn className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleZoomOut}
                        title="Zoom Out"
                      >
                        <ZoomOut className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={resetZoom}
                        title="Reset Zoom"
                      >
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                      <div className="bg-black bg-opacity-70 text-white px-2 py-1 rounded text-sm">
                        {Math.round(photoViewer.zoom * 100)}%
                      </div>
                    </div>

                    {/* Main Photo Display with Zoom and Pan */}
                    <div 
                      className={`flex items-center justify-center bg-gray-50 rounded-lg min-h-[400px] max-h-[400px] overflow-hidden ${
                        photoViewer.zoom > 1 ? 'cursor-grab active:cursor-grabbing' : 'cursor-zoom-in'
                      }`}
                      onWheel={handleWheel}
                      onMouseDown={handleMouseDown}
                      onMouseMove={handleMouseMove}
                      onMouseUp={handleMouseUp}
                      onMouseLeave={handleMouseUp}
                      onTouchStart={handleTouchStart}
                      onTouchMove={handleTouchMove}
                      onTouchEnd={handleTouchEnd}
                      style={{ touchAction: 'none' }}
                    >
                      <img
                        src={`/${photoViewer.photos[photoViewer.currentIndex]?.url || ''}`}
                        alt={`Photo ${photoViewer.currentIndex + 1}`}
                        className="rounded-lg select-none block"
                        style={{
                          transform: `scale(${photoViewer.zoom}) translate(${photoViewer.panX}px, ${photoViewer.panY}px)`,
                          transformOrigin: 'center center',
                          transition: isDragging ? 'none' : 'transform 0.2s ease',
                          maxWidth: '100%',
                          maxHeight: '400px',
                          objectFit: 'contain',
                          display: 'block',
                          margin: 'auto'
                        }}
                        onError={(e) => {
                          console.error('Image failed to load:', photoViewer.photos[photoViewer.currentIndex]?.url);
                          e.currentTarget.src = '/placeholder-image.png';
                        }}
                        onDoubleClick={() => {
                          if (photoViewer.zoom === 1) {
                            handleZoomIn();
                          } else {
                            resetZoom();
                          }
                        }}
                        draggable={false}
                      />
                    </div>
                    
                    {/* Zoom Instructions */}
                    <div className="absolute bottom-2 left-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded max-w-xs">
                      <div className="hidden md:block">
                        Scroll wheel to zoom • Double-click to zoom in/reset • Drag to pan when zoomed
                      </div>
                      <div className="block md:hidden">
                        Pinch to zoom • Double-tap to zoom • Touch and drag to pan when zoomed
                      </div>
                    </div>
                    
                    {/* Navigation Buttons */}
                    {photoViewer.photos.length > 1 && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          className="absolute left-2 top-1/2 transform -translate-y-1/2 z-10"
                          onClick={() => setPhotoViewer(prev => ({
                            ...prev,
                            currentIndex: prev.currentIndex > 0 ? prev.currentIndex - 1 : prev.photos.length - 1,
                            zoom: 1, // Reset zoom when changing photos
                            panX: 0,
                            panY: 0
                          }))}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          className="absolute right-2 top-1/2 transform -translate-y-1/2 z-10"
                          onClick={() => setPhotoViewer(prev => ({
                            ...prev,
                            currentIndex: prev.currentIndex < prev.photos.length - 1 ? prev.currentIndex + 1 : 0,
                            zoom: 1, // Reset zoom when changing photos
                            panX: 0,
                            panY: 0
                          }))}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                    
                    {/* Photo Metadata */}
                    {photoViewer.photos[photoViewer.currentIndex]?.metadata && (
                      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                          <div>
                            <span className="font-medium">Supplier:</span>
                            <br />
                            {photoViewer.photos[photoViewer.currentIndex].metadata.supplierName}
                          </div>
                          <div>
                            <span className="font-medium">Lot:</span>
                            <br />
                            {photoViewer.photos[photoViewer.currentIndex].metadata.lotNumber}
                          </div>
                          <div>
                            <span className="font-medium">Date:</span>
                            <br />
                            {photoViewer.photos[photoViewer.currentIndex].metadata.uploadDate}
                          </div>
                          <div>
                            <span className="font-medium">Size:</span>
                            <br />
                            {Math.round(photoViewer.photos[photoViewer.currentIndex].metadata.fileSize / 1024)} KB
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Thumbnail Navigation */}
                    {photoViewer.photos.length > 1 && (
                      <div className="flex gap-2 mt-4 justify-center overflow-x-auto pb-2">
                        {photoViewer.photos.map((photo, index) => (
                          <button
                            key={index}
                            onClick={() => setPhotoViewer(prev => ({ 
                              ...prev, 
                              currentIndex: index,
                              zoom: 1, // Reset zoom when changing photos
                              panX: 0,
                              panY: 0
                            }))}
                            className={`flex-shrink-0 w-16 h-16 rounded border-2 overflow-hidden ${
                              index === photoViewer.currentIndex ? 'border-blue-500' : 'border-gray-300'
                            }`}
                          >
                            <img
                              src={`/${photo.url}`}
                              alt={`Thumbnail ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
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
                    <option key={String(dalal.dalalName)} value={String(dalal.dalalName)}>
                      {String(dalal.dalalName)} ({dalal.totalLots} lots)
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
                        {String(dalal.dalalName || '')}
                        {dalal.apmcCode && dalal.apmcCode !== 'N/A' && (
                          <Badge variant="outline" className="ml-2">
                            APMC: {dalal.apmcCode}
                          </Badge>
                        )}
                      </CardTitle>
                      <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                        {dalal.dalalContact && (
                          <div className="flex items-center gap-1">
                            <Phone className="h-4 w-4" />
                            {String(dalal.dalalContact)}
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
                        setBidForm(prev => ({ ...prev, dalalName: String(dalal.dalalName || '') }));
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
                            <TableHead>Supplier/Dalal Name</TableHead>
                            <TableHead>APMC Code</TableHead>
                            <TableHead>Lot Number</TableHead>
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
                              <TableCell>{String(dalal.dalalName || 'No Dalal')}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-xs">
                                  {dalal.apmcCode && dalal.apmcCode !== 'N/A' ? dalal.apmcCode : 'No Code'}
                                </Badge>
                              </TableCell>
                              <TableCell className="font-medium">{String(lot.lotNumber || '')}</TableCell>
                              <TableCell>
                                <div className="flex items-center">
                                  <IndianRupee className="h-4 w-4 mr-1" />
                                  {parseFloat(String(lot.bidPrice || '0')).toLocaleString('en-IN')}
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
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPhotoViewer({
                                      open: true,
                                      photos: lot.chiliPhotos,
                                      currentIndex: 0,
                                      lotInfo: { dalalName: String(dalal.dalalName), lotNumber: String(lot.lotNumber) }
                                    })}
                                  >
                                    <Image className="h-4 w-4 mr-1" />
                                    {lot.chiliPhotos.length} photo{lot.chiliPhotos.length > 1 ? 's' : ''}
                                  </Button>
                                ) : (
                                  <span className="text-gray-400">No photos</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {lot.notes ? (
                                  <span className="text-sm">{String(lot.notes).substring(0, 30)}{String(lot.notes).length > 30 ? '...' : ''}</span>
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