import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LiveChat } from "@/components/LiveChat";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useThemeInitializer } from "@/hooks/use-theme-initializer";
import { isSupabaseConfigured } from "@/integrations/supabase/client";
import ConfigurationError from "@/components/ConfigurationError";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Tickets from "./pages/Tickets";
import Assets from "./pages/Assets";
import Users from "./pages/Users";
import Reports from "./pages/Reports";
import HardwareInventory from "./pages/HardwareInventory";
import SoftwareInventory from "./pages/SoftwareInventory";
import Licenses from "./pages/Licenses";
import Microsoft365Dashboard from "./pages/Microsoft365Dashboard";
import Vpn from "./pages/Vpn";
import Rdp from "./pages/Rdp";
import RemoteSupport from "./pages/RemoteSupport";
import RemoteClient from "./pages/RemoteClient";
import RemoteClientSetup from "./pages/RemoteClientSetup";
import Branches from "./pages/Branches";
import BranchDetails from "./pages/BranchDetails";
import ProviderEmails from "./pages/ProviderEmails";
import ProviderConfirm from "./pages/ProviderConfirm";
import Jobs from "./pages/Jobs";
import Maintenance from "./pages/Maintenance";
import Logistics from "./pages/Logistics";
import NymbisRdpCloud from "./pages/NymbisRdpCloud";
import CompanyNetworkDiagram from "./pages/CompanyNetworkDiagram";
import DocumentHub from "./pages/DocumentHub";
import SharedFiles from "./pages/SharedFiles";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import CRM from "./pages/CRM";
import BluewaveCRM from "./pages/BluewaveCRM";
import Sage from "./pages/Sage";
import Migrations from "./pages/Migrations";
import MigrationTrackerPage from "./pages/MigrationTrackerPage";
import ITSuppliers from "./pages/ITSuppliers";

const queryClient = new QueryClient();

const App = () => {
  // Initialize theme from localStorage on app mount
  useThemeInitializer();

  // Show configuration error if Supabase is not properly configured
  if (!isSupabaseConfigured) {
    return <ConfigurationError />;
  }

  return (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Auth />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/tickets" element={<Tickets />} />
          <Route path="/assets" element={<Assets />} />
          <Route path="/users" element={<Users />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/hardware" element={<HardwareInventory />} />
          <Route path="/software" element={<SoftwareInventory />} />
          <Route path="/licenses" element={<Licenses />} />
          <Route path="/microsoft-365" element={<Microsoft365Dashboard />} />
          <Route path="/vpn" element={<Vpn />} />
          <Route path="/rdp" element={<Rdp />} />
          <Route path="/remote-support" element={<RemoteSupport />} />
          <Route path="/remote-client" element={<RemoteClient />} />
          <Route path="/remote-client-setup" element={<RemoteClientSetup />} />
          <Route path="/branches" element={<Branches />} />
          <Route path="/branches/:branchId" element={<BranchDetails />} />
          <Route path="/provider-emails" element={<ProviderEmails />} />
          <Route path="/provider-confirm" element={<ProviderConfirm />} />
          <Route path="/jobs" element={<Jobs />} />
          <Route path="/maintenance" element={<Maintenance />} />
          <Route path="/logistics" element={<Logistics />} />
          <Route path="/nymbis-rdp-cloud" element={<NymbisRdpCloud />} />
          <Route path="/company-network" element={<CompanyNetworkDiagram />} />
          <Route path="/document-hub" element={<DocumentHub />} />
          <Route path="/shared-files" element={<SharedFiles />} />
          <Route path="/crm" element={<CRM />} />
          <Route path="/bluewave-crm" element={<BluewaveCRM />} />
          <Route path="/sage" element={<Sage />} />
          <Route path="/migrations" element={<Migrations />} />
          <Route path="/migration-tracker" element={<MigrationTrackerPage />} />
          <Route path="/it-suppliers" element={<ITSuppliers />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
      <LiveChat />
    </TooltipProvider>
  </QueryClientProvider>
  );
};

export default App;
