import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import { I18nProvider } from "@/lib/i18n";
import { ProtectedRoute } from "./lib/protected-route";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import AuthPage from "@/pages/auth-page";
import Farmers from "@/pages/farmers";
import Lots from "@/pages/lots";
import BagEntryNew from "@/pages/bag-entry-new";
import Buyers from "@/pages/buyers";

import TaxInvoice from "@/pages/tax-invoice";
import FarmerBill from "@/pages/farmer-bill";
import CessReports from "@/pages/cess-reports";
import GstReports from "@/pages/gst-reports";
import FinalAccounts from "@/pages/final-accounts";
import InventoryIn from "@/pages/inventory-in";

import Settings from "@/pages/settings";
import TenantOnboarding from "@/pages/tenant-onboarding";
import StaffManagement from "@/pages/staff-management";

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      <ProtectedRoute path="/" component={Dashboard} />
      <ProtectedRoute path="/farmers" component={Farmers} />
      <ProtectedRoute path="/lots" component={Lots} />
      <ProtectedRoute path="/lots/:id/bags" component={BagEntryNew} />
      <ProtectedRoute path="/buyers" component={Buyers} />
      <ProtectedRoute path="/staff" component={StaffManagement} />
      <ProtectedRoute path="/tax-invoice" component={TaxInvoice} />
      <ProtectedRoute path="/farmer-bill" component={FarmerBill} />
      <ProtectedRoute path="/cess-reports" component={CessReports} />
      <ProtectedRoute path="/gst-reports" component={GstReports} />
      <ProtectedRoute path="/settings" component={Settings} />
      <ProtectedRoute path="/final-accounts" component={FinalAccounts} />
      <ProtectedRoute path="/inventory-in" component={InventoryIn} />
      <ProtectedRoute path="/tenant-onboarding" component={TenantOnboarding} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </AuthProvider>
      </I18nProvider>
    </QueryClientProvider>
  );
}

export default App;
