import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
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
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
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
          <Route path="/microsoft365" element={<Microsoft365Dashboard />} />
          <Route path="/vpn" element={<Vpn />} />
          <Route path="/rdp" element={<Rdp />} />
          <Route path="/remote-support" element={<RemoteSupport />} />
          <Route path="/remote-client" element={<RemoteClient />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
