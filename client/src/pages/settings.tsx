import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Navigation } from "@/components/navigation";
import { BackToDashboard } from "@/components/back-to-dashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Settings as SettingsIcon, Receipt, Globe } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

const gstSettingsSchema = z.object({
  sgst: z.number().min(0).max(100),
  cgst: z.number().min(0).max(100),
  cess: z.number().min(0).max(100),
  unloadHamali: z.number().min(0),
  packaging: z.number().min(0),
  packagingWeight: z.number().min(0),
  weighingFee: z.number().min(0),
  apmcCommission: z.number().min(0).max(100),
});

type GSTSettings = z.infer<typeof gstSettingsSchema>;

interface TenantSettings {
  gstSettings: {
    sgst: number;
    cgst: number;
    cess: number;
    unloadHamali: number;
    packaging: number;
    packagingWeight: number;
    weighingFee: number;
    apmcCommission: number;
  };
  maxUsers: number;
  subscriptionPlan: string;
}

export default function Settings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("gst");

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <BackToDashboard />
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <SettingsIcon className="h-8 w-8 mr-3 text-primary" />
              Settings
            </h1>
            <p className="mt-2 text-gray-600">Configure your APMC trading settings</p>
          </div>

          <SettingsContent />
        </div>
      </div>
    </div>
  );
}

function SettingsContent() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("gst");
  
  const { data: user } = useQuery({
    queryKey: ["/api/user"],
    retry: false,
  });

  // Initialize form hook at the top level - never conditionally
  const gstForm = useForm<GSTSettings>({
    resolver: zodResolver(gstSettingsSchema),
    defaultValues: {
      sgst: 2.5,
      cgst: 2.5,
      cess: 0.6,
      unloadHamali: 3,
      packaging: 5,
      weighingFee: 2,
      apmcCommission: 2,
    },
  });

  const { data: settings, isLoading, error } = useQuery<TenantSettings>({
    queryKey: ["/api/settings"],
    retry: 1,
    queryFn: async () => {
      const response = await fetch("/api/settings", { credentials: "include" });
      if (!response.ok) {
        throw new Error(`Failed to fetch settings: ${response.status}`);
      }
      return response.json();
    },
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (data: Partial<TenantSettings>) => {
      await apiRequest("PUT", "/api/settings", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({
        title: "Success",
        description: "Settings updated successfully",
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

  // Update form when settings data loads - MUST be before any early returns
  useEffect(() => {
    if (settings) {
      gstForm.reset({
        sgst: settings.gstSettings.sgst,
        cgst: settings.gstSettings.cgst,
        cess: settings.gstSettings.cess,
        unloadHamali: settings.gstSettings.unloadHamali,
        packaging: settings.gstSettings.packaging || 5,
        packagingWeight: settings.gstSettings.packagingWeight || 0,
        weighingFee: settings.gstSettings.weighingFee || 2,
        apmcCommission: settings.gstSettings.apmcCommission || 2,
      });
    }
  }, [settings, gstForm]);

  const onGSTSubmit = (data: GSTSettings) => {
    updateSettingsMutation.mutate({
      gstSettings: data,
    });
  };

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading settings...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="text-red-600">Authentication Required</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">Please log in to access settings.</p>
          <Button 
            onClick={() => window.location.href = '/auth'} 
            className="mt-4 w-full"
          >
            Go to Login
          </Button>
        </CardContent>
      </Card>
    );
  }



  // Only show settings if user is admin or super admin
  if (user?.role !== 'admin' && user?.role !== 'super_admin') {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card className="text-center py-12">
            <CardContent>
              <h3 className="text-lg font-medium text-gray-900">Access Denied</h3>
              <p className="text-gray-500 mt-1">
                You don't have permission to access settings.
              </p>
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
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Settings</h1>
          <p className="text-gray-600">Manage your APMC configuration and preferences</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-8">
            <TabsTrigger value="gst" className="flex items-center space-x-2">
              <Receipt className="h-4 w-4" />
              <span>GST & Charges</span>
            </TabsTrigger>
            <TabsTrigger value="general" className="flex items-center space-x-2">
              <SettingsIcon className="h-4 w-4" />
              <span>General</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="gst">
            <Card>
              <CardHeader>
                <CardTitle>GST & Charges Configuration</CardTitle>
                <p className="text-sm text-gray-600">
                  Configure tax rates and charges that will be automatically calculated
                </p>
              </CardHeader>
              <CardContent>
                <form onSubmit={gstForm.handleSubmit(onGSTSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="sgst">SGST Rate (%)</Label>
                      <Input
                        id="sgst"
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        {...gstForm.register("sgst", { valueAsNumber: true })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="cgst">CGST Rate (%)</Label>
                      <Input
                        id="cgst"
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        {...gstForm.register("cgst", { valueAsNumber: true })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="cess">CESS Rate (%)</Label>
                      <Input
                        id="cess"
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        {...gstForm.register("cess", { valueAsNumber: true })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="unloadHamali">Unload Hamali (₹ per bag)</Label>
                      <Input
                        id="unloadHamali"
                        type="number"
                        step="0.01"
                        min="0"
                        {...gstForm.register("unloadHamali", { valueAsNumber: true })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="packaging">Packaging (₹ per bag)</Label>
                      <Input
                        id="packaging"
                        type="number"
                        step="0.01"
                        min="0"
                        {...gstForm.register("packaging", { valueAsNumber: true })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="weighingFee">Weighing Fee (₹ per bag)</Label>
                      <Input
                        id="weighingFee"
                        type="number"
                        step="0.01"
                        min="0"
                        {...gstForm.register("weighingFee", { valueAsNumber: true })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="apmcCommission">APMC Commission (%)</Label>
                      <Input
                        id="apmcCommission"
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        {...gstForm.register("apmcCommission", { valueAsNumber: true })}
                      />
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    disabled={updateSettingsMutation.isPending}
                    className="w-full"
                  >
                    {updateSettingsMutation.isPending ? "Saving..." : "Save Settings"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="general">
            <Card>
              <CardHeader>
                <CardTitle>General Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">General settings will be available here.</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}