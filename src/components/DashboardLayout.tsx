import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, 
  Ticket, 
  Package, 
  LogOut, 
  Menu, 
  X, 
  Users, 
  FileBarChart, 
  Monitor, 
  Code, 
  Key, 
  Cloud, 
  Video, 
  Building2, 
  Briefcase,
  Wrench,
  Truck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import oricolLogo from "@/assets/oricol-logo.png";
import zerobitOneLogo from "@/assets/zerobitone-logo.png";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const location = useLocation();
  const { toast } = useToast();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isCEO, setIsCEO] = useState(false);
  const [isSupportStaff, setIsSupportStaff] = useState(false);

  useEffect(() => {
    checkUserRoles();
  }, []);

  const checkUserRoles = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .in("role", ["admin", "ceo", "support_staff"]);

    if (data) {
      const roles = data.map(r => r.role);
      setIsAdmin(roles.includes('admin'));
      setIsCEO(roles.includes('ceo'));
      setIsSupportStaff(roles.includes('support_staff'));
    }
  };

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "Error",
        description: "Failed to sign out",
        variant: "destructive",
      });
    }
  };

  const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Tickets", href: "/tickets", icon: Ticket },
    { name: "Jobs", href: "/jobs", icon: Briefcase },
    { name: "Maintenance", href: "/maintenance", icon: Wrench },
    { name: "Logistics", href: "/logistics", icon: Truck },
    { name: "Assets", href: "/assets", icon: Package },
    ...(isAdmin || isCEO ? [
      { name: "Branches", href: "/branches", icon: Building2 },
      { name: "Microsoft 365", href: "/microsoft-365", icon: Cloud },
      { name: "Hardware", href: "/hardware", icon: Monitor },
      { name: "Software", href: "/software", icon: Code },
      { name: "Licenses", href: "/licenses", icon: Key },
      { name: "Provider Emails", href: "/provider-emails", icon: FileBarChart },
    ] : []),
    ...(isAdmin || isCEO || isSupportStaff ? [
      { name: "Remote Support", href: "/remote-support", icon: Video },
      { name: "VPN", href: "/vpn", icon: Key },
      { name: "RDP", href: "/rdp", icon: Monitor },
      { name: "Reports", href: "/reports", icon: FileBarChart },
    ] : []),
    ...(isAdmin || isCEO || isSupportStaff ? [
      { name: "Users", href: "/users", icon: Users }
    ] : []),
  ];

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex md:flex-col md:w-64 bg-sidebar border-r border-sidebar-border">
        <div className="flex items-center justify-between gap-3 h-20 px-4 border-b border-sidebar-border">
          <img src={oricolLogo} alt="Oricol Environmental Services" className="h-10 w-auto object-contain" />
          <img src={zerobitOneLogo} alt="Zero Bit One" className="h-10 w-auto object-contain" />
        </div>
        <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-1">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center px-4 py-3 rounded-lg transition-colors ${
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                }`}
              >
                <item.icon className="w-5 h-5 mr-3" />
                {item.name}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-sidebar-border">
          <Button
            variant="ghost"
            className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent/50"
            onClick={handleSignOut}
          >
            <LogOut className="w-5 h-5 mr-3" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="fixed inset-0 bg-background/80" onClick={() => setMobileMenuOpen(false)} />
          <aside className="fixed top-0 left-0 bottom-0 w-64 bg-sidebar border-r border-sidebar-border flex flex-col">
            <div className="flex items-center justify-between h-20 px-4 border-b border-sidebar-border">
              <div className="flex items-center gap-2 flex-1">
                <img src={oricolLogo} alt="Oricol Environmental Services" className="h-8 w-auto object-contain" />
                <img src={zerobitOneLogo} alt="Zero Bit One" className="h-8 w-auto object-contain" />
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileMenuOpen(false)}
                className="text-sidebar-foreground"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
            <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-1">
              {navigation.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center px-4 py-3 rounded-lg transition-colors ${
                      isActive
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                    }`}
                  >
                    <item.icon className="w-5 h-5 mr-3" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
            <div className="p-4 border-t border-sidebar-border">
              <Button
                variant="ghost"
                className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent/50"
                onClick={handleSignOut}
              >
                <LogOut className="w-5 h-5 mr-3" />
                Sign Out
              </Button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between h-16 px-4 border-b border-border bg-card">
          <div className="flex items-center gap-2">
            <img src={oricolLogo} alt="Oricol" className="h-7 w-auto object-contain" />
            <img src={zerobitOneLogo} alt="Zero Bit One" className="h-7 w-auto object-contain" />
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </Button>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
