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

// Schema for tenant onboarding form
const tenantOnboardingSchema = z.object({
  // Tenant details
  tenantName: z.string().min(1, "Business name is required"),
  apmcCode: z.string().min(1, "APMC code is required"),
  place: z.string().min(1, "Place is required"),
  mobileNumber: z.string().min(10, "Valid mobile number is required"),
  address: z.string().optional(),
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
      address: "",
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
            address: data.address,
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
                    <Input
                      id="tenantName"
                      placeholder="e.g., ABC Traders"
                      {...form.register("tenantName")}
                    />
                    {form.formState.errors.tenantName && (
                      <p className="text-sm text-red-600">{form.formState.errors.tenantName.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="apmcCode">APMC Code *</Label>
                    <Input
                      id="apmcCode"
                      placeholder="e.g., TC001"
                      {...form.register("apmcCode")}
                    />
                    {form.formState.errors.apmcCode && (
                      <p className="text-sm text-red-600">{form.formState.errors.apmcCode.message}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="place">Place *</Label>
                    <Input
                      id="place"
                      placeholder="e.g., Byadagi"
                      {...form.register("place")}
                    />
                    {form.formState.errors.place && (
                      <p className="text-sm text-red-600">{form.formState.errors.place.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="mobileNumber">Mobile Number *</Label>
                    <Input
                      id="mobileNumber"
                      placeholder="e.g., 9876543210"
                      {...form.register("mobileNumber")}
                    />
                    {form.formState.errors.mobileNumber && (
                      <p className="text-sm text-red-600">{form.formState.errors.mobileNumber.message}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Full Address</Label>
                  <Input
                    id="address"
                    placeholder="e.g., Main Market, Byadagi, Haveri District, Karnataka"
                    {...form.register("address")}
                  />
                  {form.formState.errors.address && (
                    <p className="text-sm text-red-600">{form.formState.errors.address.message}</p>
                  )}
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
                    <Input
                      id="adminUsername"
                      placeholder="e.g., admin"
                      {...form.register("adminUsername")}
                    />
                    {form.formState.errors.adminUsername && (
                      <p className="text-sm text-red-600">{form.formState.errors.adminUsername.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="adminPassword">Admin Password *</Label>
                    <Input
                      id="adminPassword"
                      type="password"
                      placeholder="Minimum 6 characters"
                      {...form.register("adminPassword")}
                    />
                    {form.formState.errors.adminPassword && (
                      <p className="text-sm text-red-600">{form.formState.errors.adminPassword.message}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password *</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Re-enter password"
                    {...form.register("confirmPassword")}
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