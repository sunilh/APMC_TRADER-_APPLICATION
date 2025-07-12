import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { AlertCircle } from "lucide-react";
import { UnifiedInput } from "@/components/ui/unified-input";

// Schema for tenant onboarding form
const tenantOnboardingSchema = z.object({
  // Tenant details
  tenantName: z.string().min(1, "Business name is required"),
  apmcCode: z.string().min(1, "APMC code is required"),
  place: z.string().min(1, "Place is required"),
  mobileNumber: z.string().min(10, "Valid mobile number is required"),
  gstNumber: z.string().optional(),
  fssaiNumber: z.string().optional(),
  panNumber: z.string().min(1, "PAN card number is required"),
  address: z.string().optional(),
  // Bank details for receiving payments from buyers
  bankName: z.string().optional(),
  bankAccountNumber: z.string().optional(),
  ifscCode: z.string().optional(),
  accountHolderName: z.string().optional(),
  subscriptionPlan: z.enum(["basic", "gold", "diamond"]),
  
  // Admin user details
  adminUsername: z.string().min(1, "Username is required"),
  adminPassword: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.adminPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type TenantOnboardingForm = z.infer<typeof tenantOnboardingSchema>;

export default function TenantOnboarding() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>("");

  const form = useForm<TenantOnboardingForm>({
    resolver: zodResolver(tenantOnboardingSchema),
    defaultValues: {
      tenantName: "",
      apmcCode: "",
      place: "",
      mobileNumber: "",
      gstNumber: "",
      address: "",
      bankName: "",
      bankAccountNumber: "",
      ifscCode: "",
      accountHolderName: "",
      subscriptionPlan: "basic",
      adminUsername: "",
      adminPassword: "",
      confirmPassword: "",
    },
  });

  const createTenantMutation = useMutation({
    mutationFn: async (data: TenantOnboardingForm) => {
      const response = await fetch("/api/tenant/onboard", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tenant: {
            name: data.tenantName,
            apmcCode: data.apmcCode,
            place: data.place,
            mobileNumber: data.mobileNumber,
            gstNumber: data.gstNumber,
            fssaiNumber: data.fssaiNumber,
            panNumber: data.panNumber,
            address: data.address,
            bankName: data.bankName,
            bankAccountNumber: data.bankAccountNumber,
            ifscCode: data.ifscCode,
            accountHolderName: data.accountHolderName,
            subscriptionPlan: data.subscriptionPlan,
          },
          adminUser: {
            username: data.adminUsername,
            password: data.adminPassword,
            role: "admin",
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create tenant");
      }

      return await response.json();
    },
    onSuccess: (response) => {
      toast({
        title: "Success",
        description: `Tenant "${response.tenant.name}" created successfully with admin user "${response.user.username}"`,
      });
      form.reset();
      setErrorMessage("");
      queryClient.invalidateQueries({ queryKey: ["/api/tenants"] });
    },
    onError: (error: Error) => {
      setErrorMessage(error.message);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });



  const onSubmit = async (data: TenantOnboardingForm) => {
    setIsSubmitting(true);
    try {
      await createTenantMutation.mutateAsync(data);
    } catch (error) {
      console.error('Tenant creation failed:', error);
      // Error is already handled by the mutation's onError callback
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Create New Tenant</CardTitle>
            <CardDescription>
              Set up a new APMC trading business with admin user access
            </CardDescription>
          </CardHeader>
          <CardContent>
            {errorMessage && (
              <Alert variant="destructive" className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            )}
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Tenant Information Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">Tenant Information</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="tenantName">Business Name *</Label>
                    <UnifiedInput
                      id="tenantName"
                      placeholder="Type or speak business name..."
                      {...form.register("tenantName")}
                      voiceType="text"
                    />
                    {form.formState.errors.tenantName && (
                      <p className="text-sm text-red-600">{form.formState.errors.tenantName.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="apmcCode">APMC Code *</Label>
                    <UnifiedInput
                      id="apmcCode"
                      placeholder="Type or speak APMC code..."
                      {...form.register("apmcCode")}
                      voiceType="text"
                    />
                    {form.formState.errors.apmcCode && (
                      <p className="text-sm text-red-600">{form.formState.errors.apmcCode.message}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="place">Place *</Label>
                    <UnifiedInput
                      id="place"
                      placeholder="Type or speak place name..."
                      {...form.register("place")}
                      voiceType="text"
                    />
                    {form.formState.errors.place && (
                      <p className="text-sm text-red-600">{form.formState.errors.place.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="mobileNumber">Mobile Number *</Label>
                    <UnifiedInput
                      id="mobileNumber"
                      placeholder="Type or speak mobile number..."
                      {...form.register("mobileNumber")}
                      type="tel"
                      voiceType="tel"
                    />
                    {form.formState.errors.mobileNumber && (
                      <p className="text-sm text-red-600">{form.formState.errors.mobileNumber.message}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="gstNumber">GST Number</Label>
                    <UnifiedInput
                      id="gstNumber"
                      placeholder="Type or speak GST number..."
                      {...form.register("gstNumber")}
                      voiceType="text"
                    />
                    {form.formState.errors.gstNumber && (
                      <p className="text-sm text-red-600">{form.formState.errors.gstNumber.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="fssaiNumber">FSSAI Number</Label>
                    <UnifiedInput
                      id="fssaiNumber"
                      placeholder="Type or speak FSSAI number..."
                      {...form.register("fssaiNumber")}
                      voiceType="text"
                    />
                    {form.formState.errors.fssaiNumber && (
                      <p className="text-sm text-red-600">{form.formState.errors.fssaiNumber.message}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="panNumber">PAN Card Number *</Label>
                  <UnifiedInput
                    id="panNumber"
                    placeholder="Type or speak PAN number..."
                    {...form.register("panNumber")}
                    voiceType="text"
                  />
                  {form.formState.errors.panNumber && (
                    <p className="text-sm text-red-600">{form.formState.errors.panNumber.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Full Address</Label>
                  <UnifiedInput
                    id="address"
                    placeholder="Type or speak full address..."
                    {...form.register("address")}
                    voiceType="text"
                  />
                  {form.formState.errors.address && (
                    <p className="text-sm text-red-600">{form.formState.errors.address.message}</p>
                  )}
                </div>

                {/* Bank Information Section */}
                <div className="space-y-4 pt-4">
                  <h3 className="text-lg font-semibold border-b pb-2">Bank Information (For Receiving Payments)</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="bankName">Bank Name</Label>
                      <UnifiedInput
                        id="bankName"
                        placeholder="Type or speak bank name..."
                        {...form.register("bankName")}
                        voiceType="text"
                      />
                      {form.formState.errors.bankName && (
                        <p className="text-sm text-red-600">{form.formState.errors.bankName.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="accountHolderName">Account Holder Name</Label>
                      <UnifiedInput
                        id="accountHolderName"
                        placeholder="Type or speak account holder name..."
                        {...form.register("accountHolderName")}
                        voiceType="text"
                      />
                      {form.formState.errors.accountHolderName && (
                        <p className="text-sm text-red-600">{form.formState.errors.accountHolderName.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="bankAccountNumber">Account Number</Label>
                      <UnifiedInput
                        id="bankAccountNumber"
                        placeholder="Type or speak account number..."
                        {...form.register("bankAccountNumber")}
                        voiceType="number"
                      />
                      {form.formState.errors.bankAccountNumber && (
                        <p className="text-sm text-red-600">{form.formState.errors.bankAccountNumber.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="ifscCode">IFSC Code</Label>
                      <UnifiedInput
                        id="ifscCode"
                        placeholder="Type or speak IFSC code..."
                        {...form.register("ifscCode")}
                        voiceType="text"
                      />
                      {form.formState.errors.ifscCode && (
                        <p className="text-sm text-red-600">{form.formState.errors.ifscCode.message}</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subscriptionPlan">Subscription Plan *</Label>
                  <Select
                    value={form.watch("subscriptionPlan")}
                    onValueChange={(value) => form.setValue("subscriptionPlan", value as "basic" | "gold" | "diamond")}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select subscription plan" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="basic">Basic (Up to 5 users)</SelectItem>
                      <SelectItem value="gold">Gold (Up to 15 users)</SelectItem>
                      <SelectItem value="diamond">Diamond (Unlimited users)</SelectItem>
                    </SelectContent>
                  </Select>
                  {form.formState.errors.subscriptionPlan && (
                    <p className="text-sm text-red-600">{form.formState.errors.subscriptionPlan.message}</p>
                  )}
                </div>
              </div>

              {/* Admin User Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">Admin User Account</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="adminUsername">Admin Username *</Label>
                    <UnifiedInput
                      id="adminUsername"
                      placeholder="Type or speak admin username..."
                      {...form.register("adminUsername")}
                      voiceType="text"
                    />
                    {form.formState.errors.adminUsername && (
                      <p className="text-sm text-red-600">{form.formState.errors.adminUsername.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="adminPassword">Admin Password *</Label>
                    <UnifiedInput
                      id="adminPassword"
                      type="password"
                      placeholder="Type or speak password (min 6 characters)..."
                      {...form.register("adminPassword")}
                      voiceType="text"
                    />
                    {form.formState.errors.adminPassword && (
                      <p className="text-sm text-red-600">{form.formState.errors.adminPassword.message}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password *</Label>
                  <UnifiedInput
                    id="confirmPassword"
                    type="password"
                    placeholder="Type or speak password confirmation..."
                    {...form.register("confirmPassword")}
                    voiceType="text"
                  />
                  {form.formState.errors.confirmPassword && (
                    <p className="text-sm text-red-600">{form.formState.errors.confirmPassword.message}</p>
                  )}
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end space-x-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => form.reset()}
                  disabled={isSubmitting}
                >
                  Reset
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Creating..." : "Create Tenant"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}