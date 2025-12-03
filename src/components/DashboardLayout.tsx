import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
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
  Truck,
  Network,
  FolderOpen,
  Settings,
  FolderTree,
  TrendingUp,
  Waves,
  Leaf,
  GitBranch
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import oricolLogo from "@/assets/oricol-logo.png";
import zerobitOneLogo from "@/assets/zerobitone-logo.png";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

interface ThemeSettings {
  navigationOrder?: string[];
  hiddenNavItems?: string[];
  logoUrl?: string;
  logoSize?: number;
  secondaryLogoUrl?: string;
  secondaryLogoSize?: number;
  logoPosition?: 'left' | 'center' | 'right';
  logoLayout?: 'horizontal' | 'stacked';
  showPrimaryLogo?: boolean;
  showSecondaryLogo?: boolean;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isCEO, setIsCEO] = useState(false);
  const [isSupportStaff, setIsSupportStaff] = useState(false);
  const [themeSettings, setThemeSettings] = useState<ThemeSettings>({});

  useEffect(() => {
    checkUserRoles();
    loadThemeSettings();
  }, []);

  const checkUserRoles = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    try {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .in("role", ["admin", "support_staff"]);

      if (error) {
        console.error("Error fetching user roles:", error);
        // Set default roles on error - users will have basic access
        setIsAdmin(false);
        setIsCEO(false);
        setIsSupportStaff(false);
        return;
      }

      if (data) {
        const roles = data.map(r => r.role as string);
        setIsAdmin(roles.includes('admin'));
        setIsCEO(roles.includes('admin')); // Using admin role for CEO check
        setIsSupportStaff(roles.includes('support_staff'));
      }
    } catch (err) {
      console.error("Unexpected error fetching user roles:", err);
      // Set default roles on error
      setIsAdmin(false);
      setIsCEO(false);
      setIsSupportStaff(false);
    }
  };

  const loadThemeSettings = () => {
    const savedTheme = localStorage.getItem('dashboardTheme');
    if (savedTheme) {
      try {
        const parsed = JSON.parse(savedTheme);
        setThemeSettings(parsed);
      } catch (error) {
        console.error('Error loading theme settings:', error);
      }
    }
  };

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("Sign out error:", error);
        toast({
          title: "Error",
          description: error.message || "Failed to sign out",
          variant: "destructive",
        });
      } else {
        // Clear any local state and redirect to auth page
        toast({
          title: "Signed out",
          description: "You have been successfully signed out",
        });
        navigate("/auth");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred";
      console.error("Unexpected sign out error:", err);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const allNavigation = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, requiredRoles: [] }, // Everyone
    { name: "Tickets", href: "/tickets", icon: Ticket, requiredRoles: ['admin'] }, // Admin only
    { name: "Oricol CRM", href: "/crm", icon: TrendingUp, requiredRoles: ['admin'] }, // Admin only
    { name: "Bluewave CRM", href: "/bluewave-crm", icon: Waves, requiredRoles: ['admin'] }, // Admin only
    { name: "Sage", href: "/sage", icon: Leaf, requiredRoles: ['admin'] }, // Admin only
    { name: "Remote Support", href: "/remote-support", icon: Video, requiredRoles: [] }, // Everyone
    { name: "Document Hub", href: "/document-hub", icon: FolderOpen, requiredRoles: ['admin'] }, // Admin only
    { name: "Shared Files", href: "/shared-files", icon: FolderTree, requiredRoles: ['admin'] }, // Admin only
    { name: "Migrations", href: "/migrations", icon: Code, requiredRoles: ['admin'] }, // Admin only
    { name: "Migration Tracker", href: "/migration-tracker", icon: GitBranch, requiredRoles: ['admin'] }, // Admin only
    { name: "Jobs", href: "/jobs", icon: Briefcase, requiredRoles: ['admin', 'ceo', 'support_staff'] },
    { name: "Maintenance", href: "/maintenance", icon: Wrench, requiredRoles: ['admin', 'ceo', 'support_staff'] },
    { name: "Logistics", href: "/logistics", icon: Truck, requiredRoles: ['admin', 'ceo', 'support_staff'] },
    { name: "Assets", href: "/assets", icon: Package, requiredRoles: ['admin', 'ceo', 'support_staff'] },
    { name: "Branches", href: "/branches", icon: Building2, requiredRoles: ['admin', 'ceo', 'support_staff'] },
    { name: "Microsoft 365", href: "/microsoft-365", icon: Cloud, requiredRoles: ['admin', 'ceo', 'support_staff'] },
    { name: "Hardware", href: "/hardware", icon: Monitor, requiredRoles: ['admin', 'ceo', 'support_staff'] },
    { name: "Software", href: "/software", icon: Code, requiredRoles: ['admin', 'ceo', 'support_staff'] },
    { name: "Licenses", href: "/licenses", icon: Key, requiredRoles: ['admin', 'ceo', 'support_staff'] },
    { name: "Provider Emails", href: "/provider-emails", icon: FileBarChart, requiredRoles: ['admin', 'ceo', 'support_staff'] },
    { name: "VPN", href: "/vpn", icon: Key, requiredRoles: ['admin', 'ceo', 'support_staff'] },
    { name: "RDP", href: "/rdp", icon: Monitor, requiredRoles: ['admin', 'ceo', 'support_staff'] },
    { name: "Nymbis RDP Cloud", href: "/nymbis-rdp-cloud", icon: Cloud, requiredRoles: ['admin', 'ceo', 'support_staff'] },
    { name: "Company Network", href: "/company-network", icon: Network, requiredRoles: ['admin', 'ceo', 'support_staff'] },
    { name: "Reports", href: "/reports", icon: FileBarChart, requiredRoles: ['admin', 'ceo', 'support_staff'] },
    { name: "Users", href: "/users", icon: Users, requiredRoles: ['admin'] }, // Admin only, not CEO
    { name: "Settings", href: "/settings", icon: Settings, requiredRoles: [] }, // Everyone
  ];

  // Filter and order navigation based on user roles and theme settings
  const getOrderedNavigation = () => {
    // First filter by roles
    const filteredByRoles = allNavigation.filter(item => {
      // If no roles required, show to everyone
      if (item.requiredRoles.length === 0) return true;
      
      // Check if user has any of the required roles
      if (item.requiredRoles.includes('admin') && isAdmin) return true;
      if (item.requiredRoles.includes('ceo') && isCEO) return true;
      if (item.requiredRoles.includes('support_staff') && isSupportStaff) return true;
      
      return false;
    });

    // Filter out hidden items
    const hiddenItems = themeSettings.hiddenNavItems || [];
    const visibleItems = filteredByRoles.filter(item => !hiddenItems.includes(item.href));

    // Apply custom order if set
    const customOrder = themeSettings.navigationOrder || [];
    if (customOrder.length > 0) {
      const orderedItems: typeof visibleItems = [];
      customOrder.forEach(href => {
        const item = visibleItems.find(i => i.href === href);
        if (item) orderedItems.push(item);
      });
      // Add any items not in the custom order
      visibleItems.forEach(item => {
        if (!orderedItems.find(i => i.href === item.href)) {
          orderedItems.push(item);
        }
      });
      return orderedItems;
    }

    return visibleItems;
  };

  const navigation = getOrderedNavigation();

  // Get logo URLs and sizes from theme settings or use defaults
  const primaryLogoUrl = themeSettings.logoUrl || oricolLogo;
  const primaryLogoSize = themeSettings.logoSize || 40;
  const secondaryLogoUrl = themeSettings.secondaryLogoUrl || zerobitOneLogo;
  const secondaryLogoSize = themeSettings.secondaryLogoSize || 40;
  const logoPosition = themeSettings.logoPosition || 'left';
  const logoLayout = themeSettings.logoLayout || 'horizontal';
  const showPrimaryLogo = themeSettings.showPrimaryLogo !== false && primaryLogoUrl;
  const showSecondaryLogo = themeSettings.showSecondaryLogo !== false && secondaryLogoUrl;

  // Helper function to get flex alignment based on position
  const getLogoContainerClasses = () => {
    const baseClasses = logoLayout === 'stacked' ? 'flex-col' : 'flex-row';
    const alignClasses = 
      logoPosition === 'center' ? 'justify-center' :
      logoPosition === 'right' ? 'justify-end' : 'justify-start';
    return `flex items-center gap-3 ${baseClasses} ${alignClasses}`;
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex md:flex-col md:w-64 bg-sidebar border-r border-sidebar-border">
        <div className={`${getLogoContainerClasses()} min-h-20 px-4 border-b border-sidebar-border py-3`}>
          {showPrimaryLogo && (
            <img src={primaryLogoUrl} alt="Oricol Environmental Services" style={{ height: `${primaryLogoSize}px`, maxHeight: '80px' }} className="w-auto object-contain" />
          )}
          {showSecondaryLogo && (
            <img src={secondaryLogoUrl} alt="Zero Bit One" style={{ height: `${secondaryLogoSize}px`, maxHeight: '80px' }} className="w-auto object-contain" />
          )}
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
              <div className={`${logoLayout === 'stacked' ? 'flex-col' : 'flex-row'} flex items-center gap-2 flex-1 ${logoPosition === 'center' ? 'justify-center' : logoPosition === 'right' ? 'justify-end' : 'justify-start'}`}>
                {showPrimaryLogo && (
                  <img src={primaryLogoUrl} alt="Oricol Environmental Services" style={{ height: `${Math.min(primaryLogoSize, 32)}px` }} className="w-auto object-contain" />
                )}
                {showSecondaryLogo && (
                  <img src={secondaryLogoUrl} alt="Zero Bit One" style={{ height: `${Math.min(secondaryLogoSize, 32)}px` }} className="w-auto object-contain" />
                )}
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
          <div className={`flex items-center gap-2 ${logoLayout === 'stacked' ? 'flex-col' : 'flex-row'}`}>
            {showPrimaryLogo && (
              <img src={primaryLogoUrl} alt="Oricol" style={{ height: `${Math.min(primaryLogoSize, 28)}px` }} className="w-auto object-contain" />
            )}
            {showSecondaryLogo && (
              <img src={secondaryLogoUrl} alt="Zero Bit One" style={{ height: `${Math.min(secondaryLogoSize, 28)}px` }} className="w-auto object-contain" />
            )}
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
