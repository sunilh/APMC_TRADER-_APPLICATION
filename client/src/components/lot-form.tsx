import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { VoiceInput } from "@/components/voice-input";
import { insertLotSchema, type Farmer, type InsertLot } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/lib/i18n";
import { Search } from "lucide-react";

interface LotFormProps {
  onSuccess?: () => void;
}

export function LotForm({ onSuccess }: LotFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useI18n();
  const [farmerSearch, setFarmerSearch] = useState("");

  const form = useForm<Omit<InsertLot, 'lotNumber' | 'tenantId'>>({
    resolver: zodResolver(insertLotSchema.omit({ lotNumber: true, tenantId: true })),
    defaultValues: {
      farmerId: 0,
      numberOfBags: 1,
      vehicleRent: "0",
      advance: "0",
      varietyGrade: "",
      unloadHamali: "0",
      lotPrice: "",
    },
  });

  const { data: farmers } = useQuery<Farmer[]>({
    queryKey: ["/api/farmers", farmerSearch],
    queryFn: async () => {
      const url = farmerSearch 
        ? `/api/farmers?search=${encodeURIComponent(farmerSearch)}`
        : "/api/farmers";
      const response = await fetch(url, { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch farmers");
      return response.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: Omit<InsertLot, 'lotNumber' | 'tenantId'>) => {
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
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast({
        title: t('messages.error'),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: Omit<InsertLot, 'lotNumber' | 'tenantId'>) => {
    createMutation.mutate(data);
  };

  const handleVoiceInput = (field: keyof InsertLot, value: string) => {
    if (['vehicleRent', 'advance', 'unloadHamali', 'lotPrice'].includes(field)) {
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
    { value: "arabica-a", label: "Arabica A" },
    { value: "arabica-b", label: "Arabica B" },
    { value: "robusta-a", label: "Robusta A" },
    { value: "robusta-b", label: "Robusta B" },
    { value: "coffee-cherry", label: "Coffee Cherry" },
    { value: "parchment", label: "Parchment" },
  ];

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="farmerId">{t('lot.farmer')} *</Label>
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder={t('lot.searchFarmer')}
                value={farmerSearch}
                onChange={(e) => setFarmerSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select
              value={form.watch("farmerId")?.toString() || ""}
              onValueChange={(value) => form.setValue("farmerId", parseInt(value))}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('lot.selectFarmer')} />
              </SelectTrigger>
              <SelectContent>
                {farmers?.map((farmer) => (
                  <SelectItem key={farmer.id} value={farmer.id.toString()}>
                    <div className="flex flex-col">
                      <span className="font-medium">{farmer.name}</span>
                      <span className="text-sm text-gray-500">
                        {farmer.mobile} • {farmer.place}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {form.formState.errors.farmerId && (
            <p className="text-sm text-destructive">
              {t('lot.farmerRequired')}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="numberOfBags">{t('lot.numberOfBags')} *</Label>
          <div className="flex space-x-2">
            <Input
              id="numberOfBags"
              type="number"
              min="1"
              {...form.register("numberOfBags", { valueAsNumber: true })}
              placeholder={t('lot.numberOfBagsPlaceholder')}
              className="flex-1"
            />
            <VoiceInput
              onResult={(value) => handleVoiceInput('numberOfBags', value)}
              placeholder={t('lot.numberOfBags')}
              type="number"
            />
          </div>
          {form.formState.errors.numberOfBags && (
            <p className="text-sm text-destructive">
              {form.formState.errors.numberOfBags.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="vehicleRent">{t('lot.vehicleRent')} *</Label>
          <div className="flex space-x-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₹</span>
              <Input
                id="vehicleRent"
                type="number"
                step="0.01"
                min="0"
                {...form.register("vehicleRent")}
                placeholder="0.00"
                className="pl-8"
              />
            </div>
            <VoiceInput
              onResult={(value) => handleVoiceInput('vehicleRent', value)}
              placeholder={t('lot.vehicleRent')}
              type="currency"
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
          <div className="flex space-x-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₹</span>
              <Input
                id="advance"
                type="number"
                step="0.01"
                min="0"
                {...form.register("advance")}
                placeholder="0.00"
                className="pl-8"
              />
            </div>
            <VoiceInput
              onResult={(value) => handleVoiceInput('advance', value)}
              placeholder={t('lot.advance')}
              type="currency"
            />
          </div>
          {form.formState.errors.advance && (
            <p className="text-sm text-destructive">
              {form.formState.errors.advance.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="varietyGrade">{t('lot.varietyGrade')} *</Label>
          <div className="flex space-x-2">
            <Select
              value={form.watch("varietyGrade")}
              onValueChange={(value) => form.setValue("varietyGrade", value)}
            >
              <SelectTrigger className="flex-1">
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
            <VoiceInput
              onResult={(value) => {
                // Match voice input to variety options
                const lowerValue = value.toLowerCase();
                const matchedOption = varietyOptions.find(option => 
                  option.label.toLowerCase().includes(lowerValue) ||
                  option.value.toLowerCase().includes(lowerValue)
                );
                if (matchedOption) {
                  form.setValue("varietyGrade", matchedOption.value);
                } else {
                  form.setValue("varietyGrade", value);
                }
              }}
              placeholder={t('lot.varietyGrade')}
            />
          </div>
          {form.formState.errors.varietyGrade && (
            <p className="text-sm text-destructive">
              {form.formState.errors.varietyGrade.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="lotPrice">{t('lot.lotPrice')} *</Label>
          <div className="flex space-x-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₹</span>
              <Input
                id="lotPrice"
                type="number"
                step="0.01"
                min="0.01"
                {...form.register("lotPrice")}
                placeholder="0.00"
                className="pl-8"
                required
              />
            </div>
            <VoiceInput
              onResult={(value) => handleVoiceInput('lotPrice', value)}
              placeholder={t('lot.lotPrice')}
              type="currency"
            />
          </div>
          <p className="text-xs text-gray-500">{t('lot.lotPriceNote')}</p>
          {form.formState.errors.lotPrice && (
            <p className="text-sm text-destructive">
              {form.formState.errors.lotPrice.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="unloadHamali">{t('lot.unloadHamali')} *</Label>
          <div className="flex space-x-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₹</span>
              <Input
                id="unloadHamali"
                type="number"
                step="0.01"
                min="0"
                {...form.register("unloadHamali")}
                placeholder="0.00"
                className="pl-8"
              />
            </div>
            <VoiceInput
              onResult={(value) => handleVoiceInput('unloadHamali', value)}
              placeholder={t('lot.unloadHamali')}
              type="currency"
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
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-sm text-blue-800">
          <div>
            <span className="font-medium">{t('lot.bags')}:</span>
            <span className="ml-1">{form.watch("numberOfBags") || 0}</span>
          </div>
          <div>
            <span className="font-medium">{t('lot.price')}:</span>
            <span className="ml-1">₹{form.watch("lotPrice") || "0"}</span>
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
