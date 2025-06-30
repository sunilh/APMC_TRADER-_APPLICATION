import { useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { UnifiedInput } from "@/components/ui/unified-input";
import { insertFarmerSchema, type Farmer, type InsertFarmer } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/lib/i18n";

interface FarmerFormProps {
  farmer?: Farmer | null;
  onSuccess?: () => void;
}

export function FarmerForm({ farmer, onSuccess }: FarmerFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useI18n();

  const form = useForm<InsertFarmer>({
    resolver: zodResolver(insertFarmerSchema.omit({ tenantId: true })),
    defaultValues: {
      name: "",
      nameAsInBank: "",
      mobile: "",
      place: "",
      bankName: "",
      bankAccountNumber: "",
      ifscCode: "",
    },
  });

  // Update form when farmer prop changes
  useEffect(() => {
    if (farmer) {
      form.reset({
        name: farmer.name,
        nameAsInBank: farmer.nameAsInBank || "",
        mobile: farmer.mobile,
        place: farmer.place,
        bankName: farmer.bankName || "",
        bankAccountNumber: farmer.bankAccountNumber || "",
        ifscCode: farmer.ifscCode || "",
      });
    }
  }, [farmer, form]);

  const createMutation = useMutation({
    mutationFn: async (data: InsertFarmer) => {
      const response = await apiRequest("POST", "/api/farmers", {
        ...data,
        tenantId: user?.tenantId,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/farmers"] });
      toast({
        title: t('messages.success'),
        description: t('farmer.created'),
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

  const updateMutation = useMutation({
    mutationFn: async (data: InsertFarmer) => {
      const response = await apiRequest("PUT", `/api/farmers/${farmer!.id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/farmers"] });
      toast({
        title: t('messages.success'),
        description: t('farmer.updated'),
      });
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

  const onSubmit = (data: InsertFarmer) => {
    if (farmer) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const handleVoiceInput = (field: keyof InsertFarmer, value: string) => {
    if (field === 'mobile') {
      // Clean and validate mobile number
      const cleanNumber = value.replace(/\D/g, '').slice(0, 10);
      form.setValue(field, cleanNumber);
    } else {
      form.setValue(field, value);
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="name">{t('farmer.name')} *</Label>
          <UnifiedInput
            id="name"
            {...form.register("name")}
            placeholder={t('farmer.namePlaceholder')}
            type="text"
            required
          />
          {form.formState.errors.name && (
            <p className="text-sm text-destructive">
              {form.formState.errors.name.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="mobile">{t('farmer.mobile')} *</Label>
          <div className="flex space-x-2">
            <Input
              id="mobile"
              {...form.register("mobile")}
              placeholder="10-digit mobile number"
              maxLength={10}
              pattern="[0-9]{10}"
              className="flex-1"
            />
            <VoiceInput
              onResult={(value) => handleVoiceInput('mobile', value)}
              placeholder={t('farmer.mobile')}
              type="tel"
            />
          </div>
          <p className="text-xs text-gray-500">{t('farmer.mobileNote')}</p>
          {form.formState.errors.mobile && (
            <p className="text-sm text-destructive">
              {form.formState.errors.mobile.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="place">{t('farmer.place')} *</Label>
          <div className="flex space-x-2">
            <Input
              id="place"
              {...form.register("place")}
              placeholder={t('farmer.placePlaceholder')}
              className="flex-1"
            />
            <VoiceInput
              onResult={(value) => handleVoiceInput('place', value)}
              placeholder={t('farmer.place')}
            />
          </div>
          {form.formState.errors.place && (
            <p className="text-sm text-destructive">
              {form.formState.errors.place.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="nameAsInBank">{t('farmer.nameAsInBank')}</Label>
          <div className="flex space-x-2">
            <Input
              id="nameAsInBank"
              {...form.register("nameAsInBank")}
              placeholder={t('farmer.nameAsInBankPlaceholder')}
              className="flex-1"
            />
            <VoiceInput
              onResult={(value) => handleVoiceInput('nameAsInBank', value)}
              placeholder={t('farmer.nameAsInBank')}
            />
          </div>
          {form.formState.errors.nameAsInBank && (
            <p className="text-sm text-destructive">
              {form.formState.errors.nameAsInBank.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="bankName">{t('farmer.bankName')}</Label>
          <div className="flex space-x-2">
            <Input
              id="bankName"
              {...form.register("bankName")}
              placeholder={t('farmer.bankNamePlaceholder')}
              className="flex-1"
            />
            <VoiceInput
              onResult={(value) => handleVoiceInput('bankName', value)}
              placeholder={t('farmer.bankName')}
            />
          </div>
          {form.formState.errors.bankName && (
            <p className="text-sm text-destructive">
              {form.formState.errors.bankName.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="bankAccountNumber">{t('farmer.bankAccount')}</Label>
          <div className="flex space-x-2">
            <Input
              id="bankAccountNumber"
              {...form.register("bankAccountNumber")}
              placeholder={t('farmer.bankAccountPlaceholder')}
              className="flex-1"
            />
            <VoiceInput
              onResult={(value) => handleVoiceInput('bankAccountNumber', value)}
              placeholder={t('farmer.bankAccount')}
              type="number"
            />
          </div>
          {form.formState.errors.bankAccountNumber && (
            <p className="text-sm text-destructive">
              {form.formState.errors.bankAccountNumber.message}
            </p>
          )}
        </div>

        <div className="md:col-span-2">
          <div className="space-y-2">
            <Label htmlFor="ifscCode">{t('farmer.ifscCode')}</Label>
            <div className="flex space-x-2">
              <Input
                id="ifscCode"
                {...form.register("ifscCode")}
                placeholder={t('farmer.ifscCodePlaceholder')}
                className="uppercase flex-1"
                onChange={(e) => {
                  e.target.value = e.target.value.toUpperCase();
                  form.setValue("ifscCode", e.target.value);
                }}
              />
              <VoiceInput
                onResult={(value) => handleVoiceInput('ifscCode', value.toUpperCase())}
                placeholder={t('farmer.ifscCode')}
              />
            </div>
            {form.formState.errors.ifscCode && (
              <p className="text-sm text-destructive">
                {form.formState.errors.ifscCode.message}
              </p>
            )}
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
          disabled={createMutation.isPending || updateMutation.isPending}
          className="bg-primary hover:bg-primary/90"
        >
          {createMutation.isPending || updateMutation.isPending
            ? t('common.saving')
            : farmer
            ? t('farmer.update')
            : t('farmer.create')
          }
        </Button>
      </div>
    </form>
  );
}
