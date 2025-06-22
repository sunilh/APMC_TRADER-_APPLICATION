import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Navigation } from "@/components/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Settings as SettingsIcon, Users, Receipt, Globe } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

const gstSettingsSchema = z.object({
  sgst: z.number().min(0).max(100),
  cgst: z.number().min(0).max(100),
  cess: z.number().min(0).max(100),
  unloadHamali: z.number().min(0),
});

const userLimitSchema = z.object({
  maxUsers: z.number().min(1),
});

type GSTSettings = z.infer<typeof gstSettingsSchema>;
type UserLimitSettings = z.infer<typeof userLimitSchema>;

interface TenantSettings {
  gstSettings: {
    sgst: number;
    cgst: number;
    cess: number;
    unloadHamali: number;
  };
  maxUsers: number;
  subscriptionPlan: string;
}

export default function Settings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("gst");

  const { data: settings, isLoading } = useQuery<TenantSettings>({
    queryKey: ["/api/settings"],
    queryFn: async () => {
      const response = await fetch("/api/settings", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch settings");
      return response.json();
    },
  });

  const gstForm = useForm<GSTSettings>({
    resolver: zodResolver(gstSettingsSchema),
    defaultValues: {
      sgst: settings?.gstSettings.sgst || 9,
      cgst: settings?.gstSettings.cgst || 9,
      cess: settings?.gstSettings.cess || 0,
      unloadHamali: settings?.gstSettings.unloadHamali || 50,
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

  const onGSTSubmit = (data: GSTSettings) => {
    updateSettingsMutation.mutate({
      gstSettings: data,
    });
  };

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
            <TabsTrigger value="users" className="flex items-center space-x-2">
              <Users className="h-4 w-4" />
              <span>User Management</span>
            </TabsTrigger>
            <TabsTrigger value="language" className="flex items-center space-x-2">
              <Globe className="h-4 w-4" />
              <span>Language & Voice</span>
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
                      {gstForm.formState.errors.sgst && (
                        <p className="text-sm text-destructive">
                          {gstForm.formState.errors.sgst.message}
                        </p>
                      )}
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
                      {gstForm.formState.errors.cgst && (
                        <p className="text-sm text-destructive">
                          {gstForm.formState.errors.cgst.message}
                        </p>
                      )}
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
                      {gstForm.formState.errors.cess && (
                        <p className="text-sm text-destructive">
                          {gstForm.formState.errors.cess.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="unloadHamali">Unload Hamali Rate (₹)</Label>
                      <Input
                        id="unloadHamali"
                        type="number"
                        step="0.01"
                        min="0"
                        {...gstForm.register("unloadHamali", { valueAsNumber: true })}
                      />
                      {gstForm.formState.errors.unloadHamali && (
                        <p className="text-sm text-destructive">
                          {gstForm.formState.errors.unloadHamali.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-2">Preview Calculation</h4>
                    <p className="text-sm text-blue-800">
                      For a ₹1000 transaction: SGST: ₹{((gstForm.watch("sgst") || 0) * 10).toFixed(2)}, 
                      CGST: ₹{((gstForm.watch("cgst") || 0) * 10).toFixed(2)}, 
                      CESS: ₹{((gstForm.watch("cess") || 0) * 10).toFixed(2)}
                    </p>
                    <p className="text-sm text-blue-800 mt-1">
                      Total Tax: ₹{(((gstForm.watch("sgst") || 0) + (gstForm.watch("cgst") || 0) + (gstForm.watch("cess") || 0)) * 10).toFixed(2)}
                    </p>
                  </div>

                  <Button
                    type="submit"
                    disabled={updateSettingsMutation.isPending}
                    className="bg-primary hover:bg-primary/90"
                  >
                    {updateSettingsMutation.isPending ? "Updating..." : "Update GST Settings"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>User Management</CardTitle>
                <p className="text-sm text-gray-600">
                  Manage user limits and permissions for your organization
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-medium text-gray-900">Current Plan</h4>
                      <p className="text-2xl font-bold text-primary mt-1">
                        {settings?.subscriptionPlan?.toUpperCase() || "BASIC"}
                      </p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-medium text-gray-900">User Limit</h4>
                      <p className="text-2xl font-bold text-gray-900 mt-1">
                        {settings?.maxUsers || 1}
                      </p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-medium text-gray-900">Active Users</h4>
                      <p className="text-2xl font-bold text-success mt-1">
                        0 {/* This would come from actual user count */}
                      </p>
                    </div>
                  </div>

                  <div className="border-t pt-6">
                    <h4 className="font-medium text-gray-900 mb-4">Subscription Plans</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="border rounded-lg p-4">
                        <h5 className="font-medium">Basic</h5>
                        <p className="text-sm text-gray-600">1-2 Users</p>
                        <p className="text-lg font-bold mt-2">₹999/month</p>
                      </div>
                      <div className="border rounded-lg p-4 border-primary">
                        <h5 className="font-medium">Gold</h5>
                        <p className="text-sm text-gray-600">Up to 10 Users</p>
                        <p className="text-lg font-bold mt-2">₹2999/month</p>
                      </div>
                      <div className="border rounded-lg p-4">
                        <h5 className="font-medium">Diamond</h5>
                        <p className="text-sm text-gray-600">10+ Users</p>
                        <p className="text-lg font-bold mt-2">₹4999/month</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="language">
            <Card>
              <CardHeader>
                <CardTitle>Language & Voice Settings</CardTitle>
                <p className="text-sm text-gray-600">
                  Configure language preferences and voice input settings
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="space-y-4">
                    <div>
                      <Label className="text-base font-medium">Default Language</Label>
                      <p className="text-sm text-gray-600 mb-3">
                        Select the default language for the application interface
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <label className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                          <input type="radio" name="language" value="en" defaultChecked />
                          <span>🇺🇸 English</span>
                        </label>
                        <label className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                          <input type="radio" name="language" value="hi" />
                          <span>🇮🇳 हिंदी (Hindi)</span>
                        </label>
                        <label className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                          <input type="radio" name="language" value="kn" />
                          <span>🇮🇳 ಕನ್ನಡ (Kannada)</span>
                        </label>
                      </div>
                    </div>

                    <div className="border-t pt-6">
                      <Label className="text-base font-medium">Voice Input Settings</Label>
                      <p className="text-sm text-gray-600 mb-4">
                        Configure voice input for numeric fields
                      </p>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <Label>Enable Voice Input</Label>
                            <p className="text-sm text-gray-600">Allow voice input for weight and rate fields</p>
                          </div>
                          <Switch defaultChecked />
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <Label>Voice Recognition Language</Label>
                            <p className="text-sm text-gray-600">Language for voice recognition</p>
                          </div>
                          <select className="border rounded px-3 py-2">
                            <option value="en-IN">English (India)</option>
                            <option value="hi-IN">Hindi (India)</option>
                            <option value="kn-IN">Kannada (India)</option>
                          </select>
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <Label>Auto-Submit on Voice Input</Label>
                            <p className="text-sm text-gray-600">Automatically save when voice input is complete</p>
                          </div>
                          <Switch defaultChecked />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="general">
            <Card>
              <CardHeader>
                <CardTitle>General Settings</CardTitle>
                <p className="text-sm text-gray-600">
                  General application preferences and configurations
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Auto-save Enabled</Label>
                        <p className="text-sm text-gray-600">Automatically save bag entries as you type</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Print Preview</Label>
                        <p className="text-sm text-gray-600">Show preview before printing APMC format</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Mobile Notifications</Label>
                        <p className="text-sm text-gray-600">Receive notifications on mobile devices</p>
                      </div>
                      <Switch />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Dark Mode</Label>
                        <p className="text-sm text-gray-600">Use dark theme for the application</p>
                      </div>
                      <Switch />
                    </div>
                  </div>

                  <div className="border-t pt-6">
                    <Label className="text-base font-medium">Data Export</Label>
                    <p className="text-sm text-gray-600 mb-4">
                      Export your data in various formats
                    </p>
                    <div className="space-x-3">
                      <Button variant="outline">Export Farmers (CSV)</Button>
                      <Button variant="outline">Export Lots (Excel)</Button>
                      <Button variant="outline">Export Reports (PDF)</Button>
                    </div>
                  </div>

                  <div className="border-t pt-6">
                    <Label className="text-base font-medium">System Information</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                      <div className="bg-gray-50 p-3 rounded">
                        <p className="text-sm font-medium">Version</p>
                        <p className="text-sm text-gray-600">1.0.0</p>
                      </div>
                      <div className="bg-gray-50 p-3 rounded">
                        <p className="text-sm font-medium">Last Updated</p>
                        <p className="text-sm text-gray-600">December 2024</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
