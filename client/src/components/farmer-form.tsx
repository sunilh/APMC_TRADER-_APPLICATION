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
  farmer?: Farmer;
  onSuccess?: () => void;
}

export function FarmerForm({ farmer, onSuccess }: FarmerFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useI18n();

  const form = useForm<InsertFarmer>({
    resolver: zodResolver(insertFarmerSchema),
    defaultValues: {
      name: "",
      mobile: "",
      place: "",
      bankAccountNumber: "",
      ifscCode: "",
      bankName: "",
      accountHolderName: "",
      tenantId: user?.tenantId || 0,
      ...farmer,
    },
  });

  // Update form when farmer prop changes
  useEffect(() => {
    if (farmer) {
      form.reset(farmer);
    }
  }, [farmer, form]);

  const mutation = useMutation({
    mutationFn: async (data: InsertFarmer) => {
      if (farmer) {
        return apiRequest("PATCH", `/api/farmers/${farmer.id}`, data);
      } else {
        return apiRequest("POST", "/api/farmers", data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/farmers"] });
      toast({
        title: t('farmer.success'),
        description: farmer ? t('farmer.updated') : t('farmer.created'),
      });
      if (!farmer) {
        form.reset();
      }
      onSuccess?.();
    },
    onError: (error: any) => {
      toast({
        title: t('error.title'),
        description: error.message || t('error.generic'),
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertFarmer) => {
    mutation.mutate(data);
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Farmer Name */}
        <div className="space-y-2">
          <Label htmlFor="name">{t('farmer.name')} *</Label>
          <UnifiedInput
            {...form.register("name")}
            placeholder={t('farmer.namePlaceholder')}
            type="text"
            voiceType="text"
            required
          />
          {form.formState.errors.name && (
            <p className="text-sm text-destructive">
              {form.formState.errors.name.message}
            </p>
          )}
        </div>

        {/* Mobile Number */}
        <div className="space-y-2">
          <Label htmlFor="mobile">{t('farmer.mobile')} *</Label>
          <UnifiedInput
            {...form.register("mobile")}
            placeholder={t('farmer.mobilePlaceholder')}
            type="tel"
            voiceType="tel"
            required
          />
          {form.formState.errors.mobile && (
            <p className="text-sm text-destructive">
              {form.formState.errors.mobile.message}
            </p>
          )}
        </div>

        {/* Place */}
        <div className="space-y-2">
          <Label htmlFor="place">{t('farmer.place')}</Label>
          <UnifiedInput
            {...form.register("place")}
            placeholder={t('farmer.placePlaceholder')}
            type="text"
            voiceType="text"
          />
          {form.formState.errors.place && (
            <p className="text-sm text-destructive">
              {form.formState.errors.place.message}
            </p>
          )}
        </div>

        {/* Bank Account Number */}
        <div className="space-y-2">
          <Label htmlFor="bankAccountNumber">{t('farmer.bankAccount')}</Label>
          <UnifiedInput
            {...form.register("bankAccountNumber")}
            placeholder={t('farmer.bankAccountPlaceholder')}
            type="text"
            voiceType="number"
          />
          {form.formState.errors.bankAccountNumber && (
            <p className="text-sm text-destructive">
              {form.formState.errors.bankAccountNumber.message}
            </p>
          )}
        </div>

        {/* IFSC Code */}
        <div className="space-y-2">
          <Label htmlFor="ifscCode">{t('farmer.ifscCode')}</Label>
          <UnifiedInput
            {...form.register("ifscCode")}
            placeholder={t('farmer.ifscCodePlaceholder')}
            type="text"
            voiceType="text"
          />
          {form.formState.errors.ifscCode && (
            <p className="text-sm text-destructive">
              {form.formState.errors.ifscCode.message}
            </p>
          )}
        </div>

        {/* Bank Name */}
        <div className="space-y-2">
          <Label htmlFor="bankName">{t('farmer.bankName')}</Label>
          <UnifiedInput
            {...form.register("bankName")}
            placeholder={t('farmer.bankNamePlaceholder')}
            type="text"
            voiceType="text"
          />
          {form.formState.errors.bankName && (
            <p className="text-sm text-destructive">
              {form.formState.errors.bankName.message}
            </p>
          )}
        </div>

        {/* Account Holder Name */}
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="accountHolderName">{t('farmer.accountHolderName')}</Label>
          <UnifiedInput
            {...form.register("accountHolderName")}
            placeholder={t('farmer.accountHolderNamePlaceholder')}
            type="text"
            voiceType="text"
          />
          {form.formState.errors.accountHolderName && (
            <p className="text-sm text-destructive">
              {form.formState.errors.accountHolderName.message}
            </p>
          )}
        </div>
      </div>

      <Button 
        type="submit" 
        disabled={mutation.isPending}
        className="w-full"
      >
        {mutation.isPending 
          ? t('farmer.saving') 
          : farmer 
            ? t('farmer.update') 
            : t('farmer.create')
        }
      </Button>
    </form>
  );
}