import { useState, useEffect, useMemo, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UnifiedInput } from "@/components/ui/unified-input";
import { insertLotSchema, type Farmer, type InsertLot } from "@shared/schema";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/lib/i18n";
import { Search, Check } from "lucide-react";

interface LotFormProps {
  onSuccess?: () => void;
}

export function LotForm({ onSuccess }: LotFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useI18n();
  const [farmerSearch, setFarmerSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedFarmer, setSelectedFarmer] = useState<Farmer | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const form = useForm<Omit<InsertLot, 'lotNumber' | 'tenantId' | 'lotPrice'>>({
    resolver: zodResolver(insertLotSchema.omit({ lotNumber: true, tenantId: true, lotPrice: true }).extend({
      farmerId: z.number().min(1, "Please select a farmer"),
      varietyGrade: z.string().optional(),
    })),
    defaultValues: {
      farmerId: undefined as any,
      numberOfBags: 1,
      vehicleRent: "0",
      advance: "0",
      varietyGrade: "",
      unloadHamali: "0",
    },
  });

  // Debounced farmer search query
  const [debouncedFarmerSearch, setDebouncedFarmerSearch] = useState("");
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedFarmerSearch(farmerSearch);
    }, 300);
    
    return () => clearTimeout(timer);
  }, [farmerSearch]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
          searchInputRef.current && !searchInputRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const { data: farmers, isLoading: farmersLoading } = useQuery<Farmer[]>({
    queryKey: ["/api/farmers", debouncedFarmerSearch],
    queryFn: async () => {
      const url = debouncedFarmerSearch && debouncedFarmerSearch.trim()
        ? `/api/farmers?search=${encodeURIComponent(debouncedFarmerSearch.trim())}`
        : "/api/farmers";
      const response = await fetch(url, { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch farmers");
      return response.json();
    },
    staleTime: 30000, // Cache for 30 seconds
    enabled: debouncedFarmerSearch.length === 0 || debouncedFarmerSearch.length >= 2, // Only search when 2+ chars or show all
  });

  const handleFarmerSelect = (farmer: Farmer) => {
    setSelectedFarmer(farmer);
    setFarmerSearch(farmer.name);
    setShowDropdown(false);
    form.setValue("farmerId", farmer.id);
  };

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFarmerSearch(value);
    setShowDropdown(value.length >= 2);
    if (value !== selectedFarmer?.name) {
      setSelectedFarmer(null);
      form.setValue("farmerId", undefined as any);
    }
  };

  const createMutation = useMutation({
    mutationFn: async (data: Omit<InsertLot, 'lotNumber' | 'tenantId' | 'lotPrice'>) => {
      console.log("Creating lot with data:", data); // Debug log
      const response = await apiRequest("POST", "/api/lots", {
        ...data,
        tenantId: user?.tenantId,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lots"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: t('messages.success'),
        description: t('lot.created'),
      });
      form.reset();
      setSelectedFarmer(null);
      setFarmerSearch("");
      setShowDropdown(false);
      onSuccess?.();
    },
    onError: (error: Error) => {
      console.error("Lot creation error:", error); // Debug log
      toast({
        title: t('messages.error'),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: Omit<InsertLot, 'lotNumber' | 'tenantId' | 'lotPrice'>) => {
    if (!data.farmerId || data.farmerId === 0) {
      toast({
        title: t('messages.error'),
        description: "Please select a farmer",
        variant: "destructive",
      });
      return;
    }

    createMutation.mutate(data);
  };

  const handleVoiceInput = (field: keyof InsertLot, value: string) => {
    if (['vehicleRent', 'advance', 'unloadHamali'].includes(field)) {
      // Clean and format monetary values
      const numValue = parseFloat(value.replace(/[^\d.]/g, ''));
      if (!isNaN(numValue)) {
        form.setValue(field as any, numValue.toString());
      }
    } else if (field === 'numberOfBags') {
      const numValue = parseInt(value.replace(/\D/g, ''));
      if (!isNaN(numValue) && numValue > 0) {
        form.setValue(field, numValue);
      }
    }
  };

  const varietyOptions = [
    { value: "premium", label: "Premium Grade" },
    { value: "super", label: "Super Grade" },
    { value: "grade-a", label: "Grade A" },
    { value: "grade-b", label: "Grade B" },
    { value: "grade-c", label: "Grade C" },
    { value: "export-quality", label: "Export Quality" },
    { value: "local-market", label: "Local Market" },
    { value: "machine-clean", label: "Machine Clean" },
    { value: "hand-picked", label: "Hand Picked" },
    { value: "mixed-grade", label: "Mixed Grade" },
  ];

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="farmerId">{t('lot.farmer')} *</Label>
          <div className="relative">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                ref={searchInputRef}
                placeholder="Search farmers by name, mobile, or place..."
                value={farmerSearch}
                onChange={handleSearchInputChange}
                onFocus={() => farmerSearch.length >= 2 && setShowDropdown(true)}
                className={`pl-10 pr-10 ${selectedFarmer ? 'border-green-500' : ''}`}
              />
              {selectedFarmer && (
                <Check className="absolute right-3 top-1/2 transform -translate-y-1/2 text-green-500 h-4 w-4" />
              )}
            </div>
            
            {showDropdown && farmerSearch.length >= 2 && (
              <div
                ref={dropdownRef}
                className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto"
              >
                {farmersLoading ? (
                  <div className="p-3 text-center text-gray-500">
                    <div className="animate-spin inline-block w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full mr-2"></div>
                    Loading farmers...
                  </div>
                ) : farmers && farmers.length > 0 ? (
                  farmers.map((farmer) => (
                    <div
                      key={farmer.id}
                      onClick={() => handleFarmerSelect(farmer)}
                      className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-medium text-gray-900">{farmer.name}</div>
                          <div className="text-sm text-gray-500">
                            {farmer.mobile} • {farmer.place}
                          </div>
                          {farmer.bankName && (
                            <div className="text-xs text-gray-400">
                              Bank: {farmer.bankName}
                            </div>
                          )}
                        </div>
                        {selectedFarmer?.id === farmer.id && (
                          <Check className="h-4 w-4 text-green-500" />
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-3 text-center text-gray-500">
                    No farmers found for "{farmerSearch}"
                  </div>
                )}
              </div>
            )}
          </div>
          
          {selectedFarmer && (
            <div className="p-2 bg-green-50 border border-green-200 rounded text-sm">
              <span className="text-green-800 font-medium">Selected: </span>
              <span className="text-green-700">{selectedFarmer.name} ({selectedFarmer.mobile})</span>
            </div>
          )}
          
          {form.formState.errors.farmerId && (
            <p className="text-sm text-destructive">
              Please select a farmer from the dropdown
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="numberOfBags">{t('lot.numberOfBags')} *</Label>
          <UnifiedInput
            {...form.register("numberOfBags", { valueAsNumber: true })}
            type="number"
            voiceType="number"
            min="1"
            placeholder={t('lot.numberOfBagsPlaceholder')}
            required
          />
          {form.formState.errors.numberOfBags && (
            <p className="text-sm text-destructive">
              {form.formState.errors.numberOfBags.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="vehicleRent">{t('lot.vehicleRent')}</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 z-10">₹</span>
            <UnifiedInput
              {...form.register("vehicleRent")}
              type="number"
              voiceType="currency"
              step="0.01"
              min="0"
              placeholder="0.00"
              className="pl-8"
            />
          </div>
          {form.formState.errors.vehicleRent && (
            <p className="text-sm text-destructive">
              {form.formState.errors.vehicleRent.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="advance">{t('lot.advance')}</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 z-10">₹</span>
            <UnifiedInput
              {...form.register("advance")}
              type="number"
              voiceType="currency"
              step="0.01"
              min="0"
              placeholder="0.00"
              className="pl-8"
            />
          </div>
          {form.formState.errors.advance && (
            <p className="text-sm text-destructive">
              {form.formState.errors.advance.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="varietyGrade">{t('lot.varietyGrade')}</Label>
          <Select
            value={form.watch("varietyGrade")}
            onValueChange={(value) => form.setValue("varietyGrade", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder={t('lot.selectVariety')} />
            </SelectTrigger>
            <SelectContent>
              {varietyOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {form.formState.errors.varietyGrade && (
            <p className="text-sm text-destructive">
              {form.formState.errors.varietyGrade.message}
            </p>
          )}
        </div>



        <div className="space-y-2">
          <Label htmlFor="unloadHamali">{t('lot.unloadHamali')}</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 z-10">₹</span>
            <UnifiedInput
              {...form.register("unloadHamali")}
              type="number"
              voiceType="currency"
              step="0.01"
              min="0"
              placeholder="0.00"
              className="pl-8"
            />
          </div>
          <p className="text-xs text-gray-500">{t('lot.unloadHamaliNote')}</p>
          {form.formState.errors.unloadHamali && (
            <p className="text-sm text-destructive">
              {form.formState.errors.unloadHamali.message}
            </p>
          )}
        </div>
      </div>

      <div className="bg-blue-50 p-4 rounded-lg">
        <h4 className="font-medium text-blue-900 mb-2">{t('lot.summary')}</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-blue-800">
          <div>
            <span className="font-medium">{t('lot.bags')}:</span>
            <span className="ml-1">{form.watch("numberOfBags") || 0}</span>
          </div>
          <div>
            <span className="font-medium">{t('lot.vehicleRent')}:</span>
            <span className="ml-1">₹{form.watch("vehicleRent") || "0"}</span>
          </div>
          <div>
            <span className="font-medium">{t('lot.advance')}:</span>
            <span className="ml-1">₹{form.watch("advance") || "0"}</span>
          </div>
          <div>
            <span className="font-medium">{t('lot.hamali')}:</span>
            <span className="ml-1">₹{form.watch("unloadHamali") || "0"}</span>
          </div>
        </div>
      </div>

      <div className="flex justify-end space-x-3 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => onSuccess?.()}
        >
          {t('common.cancel')}
        </Button>
        <Button
          type="submit"
          disabled={createMutation.isPending}
          className="bg-primary hover:bg-primary/90"
        >
          {createMutation.isPending ? t('common.creating') : t('lot.create')}
        </Button>
      </div>
    </form>
  );
}
