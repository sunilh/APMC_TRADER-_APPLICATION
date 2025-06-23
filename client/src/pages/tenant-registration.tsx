import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

const tenantRegistrationSchema = z.object({
  // Tenant data
  name: z.string().min(1, "APMC name is required"),
  apmcCode: z.string().min(1, "APMC code is required"),
  mobileNumber: z.string().min(10, "Valid mobile number is required"),
  subscriptionPlan: z.enum(["basic", "gold", "premium"]),
  
  // Admin user data
  adminUsername: z.string().min(3, "Username must be at least 3 characters"),
  adminPassword: z.string().min(6, "Password must be at least 6 characters"),
  adminName: z.string().min(1, "Admin name is required"),
  adminEmail: z.string().email("Valid email is required"),
});

type TenantRegistrationForm = z.infer<typeof tenantRegistrationSchema>;

export default function TenantRegistration() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isCreated, setIsCreated] = useState(false);

  const form = useForm<TenantRegistrationForm>({
    resolver: zodResolver(tenantRegistrationSchema),
    defaultValues: {
      name: "",
      apmcCode: "",
      mobileNumber: "",
      subscriptionPlan: "basic",
      adminUsername: "",
      adminPassword: "",
      adminName: "",
      adminEmail: "",
    },
  });

  const createTenantMutation = useMutation({
    mutationFn: async (data: TenantRegistrationForm) => {
      const payload = {
        name: data.name,
        apmcCode: data.apmcCode,
        mobileNumber: data.mobileNumber,
        subscriptionPlan: data.subscriptionPlan,
        adminUser: {
          username: data.adminUsername,
          password: data.adminPassword,
          name: data.adminName,
          email: data.adminEmail,
        },
      };
      
      const res = await apiRequest("POST", "/api/tenants", payload);
      return await res.json();
    },
    onSuccess: (tenant) => {
      setIsCreated(true);
      toast({
        title: "Tenant Created Successfully",
        description: `${tenant.name} has been set up with admin user.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Tenant Creation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const { data: tenants } = useQuery({
    queryKey: ["/api/tenants"],
    enabled: user?.role === "super_admin",
  });

  const onSubmit = (data: TenantRegistrationForm) => {
    createTenantMutation.mutate(data);
  };

  if (user?.role !== "super_admin") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center text-red-600">Access Denied</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p>Only super admins can create new tenants.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isCreated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center text-green-600">Tenant Created</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p>New tenant has been created successfully with admin user.</p>
            <div className="space-y-2">
              <Button 
                onClick={() => setIsCreated(false)}
                variant="outline"
                className="w-full"
              >
                Create Another Tenant
              </Button>
              <Button 
                onClick={() => window.location.href = "/"}
                className="w-full"
              >
                Back to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-center">New Tenant Registration</CardTitle>
            <p className="text-sm text-gray-600 text-center">
              Create a new APMC tenant with admin user
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              
              {/* Tenant Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">APMC Information</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">APMC Name</Label>
                    <Input
                      id="name"
                      {...form.register("name")}
                      placeholder="Enter APMC name"
                    />
                    {form.formState.errors.name && (
                      <p className="text-sm text-destructive">
                        {form.formState.errors.name.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="apmcCode">APMC Code</Label>
                    <Input
                      id="apmcCode"
                      {...form.register("apmcCode")}
                      placeholder="Enter unique APMC code"
                    />
                    {form.formState.errors.apmcCode && (
                      <p className="text-sm text-destructive">
                        {form.formState.errors.apmcCode.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="mobileNumber">Mobile Number</Label>
                    <Input
                      id="mobileNumber"
                      {...form.register("mobileNumber")}
                      placeholder="Enter mobile number"
                    />
                    {form.formState.errors.mobileNumber && (
                      <p className="text-sm text-destructive">
                        {form.formState.errors.mobileNumber.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="subscriptionPlan">Subscription Plan</Label>
                    <Select 
                      onValueChange={(value) => form.setValue("subscriptionPlan", value as any)}
                      defaultValue="basic"
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select plan" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="basic">Basic (2 users)</SelectItem>
                        <SelectItem value="gold">Gold (10 users)</SelectItem>
                        <SelectItem value="premium">Premium (50 users)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Admin User Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">Admin User Information</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="adminName">Admin Full Name</Label>
                    <Input
                      id="adminName"
                      {...form.register("adminName")}
                      placeholder="Enter admin full name"
                    />
                    {form.formState.errors.adminName && (
                      <p className="text-sm text-destructive">
                        {form.formState.errors.adminName.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="adminEmail">Admin Email</Label>
                    <Input
                      id="adminEmail"
                      type="email"
                      {...form.register("adminEmail")}
                      placeholder="Enter admin email"
                    />
                    {form.formState.errors.adminEmail && (
                      <p className="text-sm text-destructive">
                        {form.formState.errors.adminEmail.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="adminUsername">Admin Username</Label>
                    <Input
                      id="adminUsername"
                      {...form.register("adminUsername")}
                      placeholder="Enter admin username"
                    />
                    {form.formState.errors.adminUsername && (
                      <p className="text-sm text-destructive">
                        {form.formState.errors.adminUsername.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="adminPassword">Admin Password</Label>
                    <Input
                      id="adminPassword"
                      type="password"
                      {...form.register("adminPassword")}
                      placeholder="Enter admin password"
                    />
                    {form.formState.errors.adminPassword && (
                      <p className="text-sm text-destructive">
                        {form.formState.errors.adminPassword.message}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={createTenantMutation.isPending}
              >
                {createTenantMutation.isPending ? "Creating Tenant..." : "Create Tenant"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Existing Tenants */}
        {tenants && tenants.length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Existing Tenants</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {tenants.map((tenant: any) => (
                  <div key={tenant.id} className="flex justify-between items-center p-3 border rounded-lg">
                    <div>
                      <h4 className="font-semibold">{tenant.name}</h4>
                      <p className="text-sm text-gray-600">Code: {tenant.apmcCode}</p>
                      <p className="text-sm text-gray-600">Plan: {tenant.subscriptionPlan}</p>
                    </div>
                    <div className="text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        tenant.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {tenant.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}