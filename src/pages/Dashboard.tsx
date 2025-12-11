import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { CopilotPrompt } from "@/components/CopilotPrompt";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Ticket, Package, AlertCircle, CheckCircle, Monitor, User as UserIcon, Users as UsersIcon, Wifi, Server, Computer } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";

interface DirectoryUser {
  id: string;
  display_name: string | null;
  email: string | null;
  job_title: string | null;
  account_enabled: boolean | null;
  user_principal_name: string | null;
}

interface DeviceInfo {
  serial_number: string | null;
  model: string | null;
  device_name: string | null;
}

interface CredentialInfo {
  username: string;
}

interface UserWithStats extends DirectoryUser {
  staffUser: boolean;
  vpnCount: number;
  rdpCount: number;
  deviceCount: number;
  devices: DeviceInfo[];
  vpnCredentials: CredentialInfo[];
  rdpCredentials: CredentialInfo[];
  inM365: boolean; // User exists in directory_users (M365)
  deviceType: 'thin_client' | 'full_pc' | 'unknown'; // Thin client (RDP only) or Full PC (M365 + RDP)
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalTickets: 0,
    openTickets: 0,
    totalAssets: 0,
    activeAssets: 0,
  });
  
  interface Ticket {
    id: string;
    title: string;
    status: string;
    created_at: string;
  }
  
  const [recentTickets, setRecentTickets] = useState<Ticket[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [directoryUsers, setDirectoryUsers] = useState<DirectoryUser[]>([]);
  const [usersWithStats, setUsersWithStats] = useState<UserWithStats[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [deviceTypeFilter, setDeviceTypeFilter] = useState<'all' | 'thin_client' | 'full_pc'>('all');
  const [activeTab, setActiveTab] = useState<string | undefined>(undefined);
  const [currentUserProfile, setCurrentUserProfile] = useState<UserWithStats | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const enrichUsersWithStats = useCallback(async (users: DirectoryUser[]): Promise<UserWithStats[]> => {
    try {
      // Fetch all staff users (profiles)
      const { data: profiles } = await supabase
        .from("profiles")
        .select("email");

      const staffEmails = new Set(profiles?.map(p => p.email?.toLowerCase()) || []);

      // Fetch VPN/RDP credentials including usernames for display
      // This table stores credentials from CSV imports and other sources
      const { data: credentials } = await supabase
        .from("vpn_rdp_credentials")
        .select("email, service_type, username");
      
      // Also fetch credentials from master_user_list (CSV imports)
      const { data: masterListUsers } = await supabase
        .from("master_user_list")
        .select("email, vpn_username, rdp_username")
        .eq("is_active", true);

      // Fetch device assignments from device_user_assignments (tracked assignments)
      // This includes both Intune devices and manually added devices
      const { data: deviceAssignments } = await supabase
        .from("device_user_assignments")
        .select("user_email, device_serial_number, device_name, device_model, is_current")
        .eq("is_current", true);
      
      // Also fetch hardware inventory for any devices not in assignments yet
      const { data: devices } = await supabase
        .from("hardware_inventory")
        .select("m365_user_principal_name, m365_user_email, serial_number, model, device_name");

      // Create maps for quick lookup with detailed data
      const vpnMap = new Map<string, CredentialInfo[]>();
      const rdpMap = new Map<string, CredentialInfo[]>();
      
      // Process credentials from vpn_rdp_credentials table
      credentials?.forEach(cred => {
        const email = cred.email?.toLowerCase();
        if (email) {
          const credInfo: CredentialInfo = {
            username: cred.username
          };
          if (cred.service_type === 'VPN') {
            const existing = vpnMap.get(email) || [];
            vpnMap.set(email, [...existing, credInfo]);
          } else if (cred.service_type === 'RDP') {
            const existing = rdpMap.get(email) || [];
            rdpMap.set(email, [...existing, credInfo]);
          }
        }
      });
      
      // Process credentials from master_user_list
      masterListUsers?.forEach(user => {
        const email = user.email?.toLowerCase();
        if (email) {
          // Add VPN credentials if present
          if (user.vpn_username) {
            const existing = vpnMap.get(email) || [];
            // Check if this username is already in the list to avoid duplicates
            if (!existing.some(cred => cred.username === user.vpn_username)) {
              vpnMap.set(email, [...existing, { username: user.vpn_username }]);
            }
          }
          // Add RDP credentials if present
          if (user.rdp_username) {
            const existing = rdpMap.get(email) || [];
            // Check if this username is already in the list to avoid duplicates
            if (!existing.some(cred => cred.username === user.rdp_username)) {
              rdpMap.set(email, [...existing, { username: user.rdp_username }]);
            }
          }
        }
      });

      const deviceMap = new Map<string, DeviceInfo[]>();
      
      // First, add devices from device_user_assignments (tracked assignments)
      deviceAssignments?.forEach(assignment => {
        const email = assignment.user_email?.toLowerCase();
        if (email) {
          const deviceInfo: DeviceInfo = {
            serial_number: assignment.device_serial_number,
            model: assignment.device_model,
            device_name: assignment.device_name
          };
          const existing = deviceMap.get(email) || [];
          deviceMap.set(email, [...existing, deviceInfo]);
        }
      });
      
      // Then add any devices from hardware_inventory that aren't already tracked
      // Match by both email and UPN
      // Use a Set for O(1) lookups instead of Array.some() for better performance
      const trackedSerials = new Set<string>();
      deviceMap.forEach(devices => {
        devices.forEach(d => {
          if (d.serial_number) trackedSerials.add(d.serial_number);
        });
      });
      
      devices?.forEach(device => {
        const email = device.m365_user_email?.toLowerCase();
        const upn = device.m365_user_principal_name?.toLowerCase();
        const userKey = email || upn;
        
        if (userKey && device.serial_number) {
          // Check if this serial number is already tracked (O(1) lookup)
          if (!trackedSerials.has(device.serial_number)) {
            const deviceInfo: DeviceInfo = {
              serial_number: device.serial_number,
              model: device.model,
              device_name: device.device_name
            };
            const existing = deviceMap.get(userKey) || [];
            deviceMap.set(userKey, [...existing, deviceInfo]);
            trackedSerials.add(device.serial_number);
          }
        }
      });

      // Deduplicate users by email local part (prefer @afripipes.co.za over other domains)
      const usersByLocalPart = new Map<string, DirectoryUser>();
      users.forEach(user => {
        const email = user.email?.toLowerCase() || '';
        if (!email || !email.includes('@')) return;
        
        const localPart = email.split('@')[0];
        const existing = usersByLocalPart.get(localPart);
        if (!existing) {
          usersByLocalPart.set(localPart, user);
        } else {
          // Prefer @afripipes.co.za domain over others
          const existingDomain = existing.email?.toLowerCase().split('@')[1] || '';
          const currentDomain = email.split('@')[1] || '';
          
          if (currentDomain === 'afripipes.co.za' && existingDomain !== 'afripipes.co.za') {
            usersByLocalPart.set(localPart, user);
          }
        }
      });
      
      const deduplicatedUsers = Array.from(usersByLocalPart.values());
      
      // Enrich users with counts and arrays of device/credential details
      const enrichedUsers: UserWithStats[] = deduplicatedUsers.map(user => {
        const email = user.email?.toLowerCase() || '';
        const upn = user.user_principal_name?.toLowerCase() || '';
        
        const userDevices = deviceMap.get(upn) || [];
        const userVpnCreds = vpnMap.get(email) || [];
        const userRdpCreds = rdpMap.get(email) || [];
        
        // User is in M365 if they came from directory_users table (have user_principal_name or id)
        const inM365 = !!user.user_principal_name || !!user.id;
        
        // Determine device type based on M365 presence and RDP credentials
        // Thin Client: Has RDP but NOT in M365
        // Full PC: Has RDP AND is in M365
        let deviceType: 'thin_client' | 'full_pc' | 'unknown' = 'unknown';
        if (userRdpCreds.length > 0) {
          deviceType = inM365 ? 'full_pc' : 'thin_client';
        } else if (inM365) {
          // User is in M365 but no RDP credentials - likely a full PC user
          deviceType = 'full_pc';
        }
        
        return {
          ...user,
          staffUser: staffEmails.has(email),
          vpnCount: userVpnCreds.length,
          rdpCount: userRdpCreds.length,
          deviceCount: userDevices.length,
          devices: userDevices,
          vpnCredentials: userVpnCreds,
          rdpCredentials: userRdpCreds,
          inM365,
          deviceType,
        };
      });

      setUsersWithStats(enrichedUsers);
      return enrichedUsers;
    } catch (error) {
      console.error("Error enriching users with stats:", error);
      return [];
    }
  }, []);

  const fetchDirectoryUsers = useCallback(async () => {
    try {
      // PRIMARY SOURCE: Fetch from master_user_list (fixed user list)
      // This is now the source of truth for who should be in the system
      const { data: masterListData, error: masterListError } = await supabase
        .from("master_user_list")
        .select("id, display_name, email, job_title, department, vpn_username, rdp_username, is_active, source")
        .eq("is_active", true)
        .order("display_name")
        .limit(500);

      if (masterListError) {
        console.error("Error fetching master user list:", masterListError);
      }

      // SECONDARY SOURCE: Fetch from directory_users (Intune/M365 sync) for enrichment
      // This provides additional data like account_enabled status and UPN
      const { data: intuneData, error: intuneError } = await supabase
        .from("directory_users")
        .select("id, display_name, email, job_title, account_enabled, user_principal_name, department")
        .order("display_name")
        .limit(500);

      if (intuneError) {
        console.error("Error fetching directory users:", intuneError);
      }

      // Build a map of Intune data for quick lookup
      const intuneMap = new Map<string, any>();
      if (intuneData) {
        intuneData.forEach(user => {
          const email = user.email?.toLowerCase() || '';
          if (email && !email.includes('onmicrosoft.com') && email.endsWith('@afripipes.co.za')) {
            intuneMap.set(email, user);
          }
        });
      }

      // Build final user list from master_user_list, enriched with Intune data
      const allUsers: DirectoryUser[] = [];
      
      if (masterListData) {
        masterListData.forEach(masterUser => {
          const email = masterUser.email?.toLowerCase() || '';
          
          // Include users with @afripipes.co.za domain OR placeholder emails from CSV import
          // Placeholder emails have format: {name}.placeholder@local.user
          const isAfripipesDomain = email.endsWith('@afripipes.co.za');
          const isPlaceholderEmail = email.includes('.placeholder@local.user');
          
          if (!isAfripipesDomain && !isPlaceholderEmail) {
            return;
          }

          // Check if user exists in Intune for additional data
          const intuneUser = intuneMap.get(email);
          
          // Create directory user with data from master list as primary source
          // Intune data supplements where master list is missing info
          const directoryUser: DirectoryUser = {
            id: masterUser.id,
            display_name: masterUser.display_name || intuneUser?.display_name || null,
            email: masterUser.email,
            job_title: masterUser.job_title || intuneUser?.job_title || null,
            account_enabled: intuneUser?.account_enabled ?? true, // From Intune if available, else assume active
            user_principal_name: intuneUser?.user_principal_name || masterUser.email, // Use Intune UPN if available
          };
          
          allUsers.push(directoryUser);
        });
      }

      // If master list is empty but Intune has users, show Intune users as fallback
      // This handles the case before CSV import has been done
      if (allUsers.length === 0 && intuneData && intuneData.length > 0) {
        intuneData.forEach(user => {
          const email = user.email?.toLowerCase() || '';
          const upn = user.user_principal_name?.toLowerCase() || '';
          
          // Exclude onmicrosoft.com domain
          if (email.includes('onmicrosoft.com') || upn.includes('onmicrosoft.com')) {
            return;
          }
          
          // Only include afripipes.co.za domain
          if (email.endsWith('@afripipes.co.za')) {
            allUsers.push(user);
          }
        });
      }
      
      setDirectoryUsers(allUsers);
      // Fetch additional stats for each user
      await enrichUsersWithStats(allUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  }, [enrichUsersWithStats]);

  const fetchCurrentUserProfile = useCallback(async (userId: string) => {
    try {
      // Get user's email from profiles
      const { data: profile } = await supabase
        .from("profiles")
        .select("email")
        .eq("user_id", userId)
        .maybeSingle();

      if (!profile?.email) {
        console.log("No profile found for user");
        return;
      }

      // Find the user in directory_users by email
      const { data: directoryUser } = await supabase
        .from("directory_users")
        .select("id, display_name, email, job_title, account_enabled, user_principal_name")
        .eq("email", profile.email)
        .maybeSingle();

      if (directoryUser) {
        // Enrich with stats
        const enriched = await enrichUsersWithStats([directoryUser]);
        if (enriched && enriched.length > 0) {
          setCurrentUserProfile(enriched[0]);
        }
      }
    } catch (error) {
      console.error("Error fetching current user profile:", error);
    }
  }, [enrichUsersWithStats]);

  const checkAdminRole = useCallback(async (userId: string) => {
    try {
      setCurrentUserId(userId);
      
      const { data: roles, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "admin")
        .maybeSingle();

      if (error) {
        console.error("Error checking admin role:", error);
        return;
      }

      const adminStatus = !!roles;
      setIsAdmin(adminStatus);
      
      // Set the active tab based on admin status
      setActiveTab(adminStatus ? "users" : "profile");

      if (adminStatus) {
        fetchDirectoryUsers();
      } else {
        // For regular users, fetch their own profile from directory_users
        fetchCurrentUserProfile(userId);
      }
    } catch (error) {
      console.error("Error checking admin role:", error);
    }
  }, [fetchDirectoryUsers]);

  const fetchDashboardData = useCallback(async () => {
    const { data: tickets } = await supabase
      .from("tickets")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(5);

    const { count: totalTickets } = await supabase
      .from("tickets")
      .select("*", { count: "exact", head: true });

    const { count: openTickets } = await supabase
      .from("tickets")
      .select("*", { count: "exact", head: true })
      .in("status", ["open", "in_progress"]);

    // Only fetch assets if admin
    let totalAssets = 0;
    let activeAssets = 0;
    
    if (isAdmin) {
      const { count: totalCount } = await supabase
        .from("assets")
        .select("*", { count: "exact", head: true });

      const { count: activeCount } = await supabase
        .from("assets")
        .select("*", { count: "exact", head: true })
        .eq("status", "active");

      totalAssets = totalCount || 0;
      activeAssets = activeCount || 0;
    }

    setStats({
      totalTickets: totalTickets || 0,
      openTickets: openTickets || 0,
      totalAssets,
      activeAssets,
    });

    setRecentTickets(tickets || []);
  }, [isAdmin]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        checkAdminRole(session.user.id);
      }
    });

    fetchDashboardData();
  }, [navigate, checkAdminRole, fetchDashboardData]);

  // Memoize the users list with stats to prevent unnecessary re-computations
  const displayUsers = useMemo(() => {
    if (usersWithStats.length > 0) {
      return usersWithStats;
    }
    // Provide default stats for users while enrichment is loading
    return directoryUsers.map(u => ({
      ...u,
      staffUser: false,
      vpnCount: 0,
      rdpCount: 0,
      deviceCount: 0,
      devices: [],
      vpnCredentials: [],
      rdpCredentials: [],
      inM365: true, // Assume true since they're in directoryUsers
      deviceType: 'unknown' as const
    }));
  }, [usersWithStats, directoryUsers]);

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      open: "bg-status-open",
      in_progress: "bg-status-in-progress",
      pending: "bg-status-pending",
      resolved: "bg-status-resolved",
      closed: "bg-status-closed",
    };

    return (
      <Badge className={`${colors[status]} text-white`}>
        {status.replace("_", " ")}
      </Badge>
    );
  };

  const getDeviceTypeBadge = (deviceType: 'thin_client' | 'full_pc' | 'unknown') => {
    if (deviceType === 'unknown') return null;
    
    const config = {
      full_pc: {
        icon: Computer,
        label: 'Full PC',
        variant: 'default' as const
      },
      thin_client: {
        icon: Monitor,
        label: 'Thin Client',
        variant: 'secondary' as const
      }
    };

    const { icon: Icon, label, variant } = config[deviceType];
    
    return (
      <div className="mt-2 flex justify-center">
        <Badge variant={variant} className="text-xs gap-1">
          <Icon className="h-3 w-3" />
          {label}
        </Badge>
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 space-y-6 w-full">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Welcome to Oricol Helpdesk</p>
        </div>

        <div className="grid gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 w-full">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Tickets</CardTitle>
              <Ticket className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalTickets}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Open Tickets</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.openTickets}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Assets</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalAssets}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Active Assets</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeAssets}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList>
            {isAdmin && (
              <TabsTrigger value="users">Users ({directoryUsers.length})</TabsTrigger>
            )}
            {!isAdmin && currentUserProfile && (
              <TabsTrigger value="profile">My Profile</TabsTrigger>
            )}
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="copilot">GitHub Copilot</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent Tickets</CardTitle>
              </CardHeader>
              <CardContent>
                {recentTickets.length === 0 ? (
                  <p className="text-muted-foreground">No tickets yet</p>
                ) : (
                  <div className="space-y-4">
                    {recentTickets.map((ticket) => (
                      <div
                        key={ticket.id}
                        className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() => navigate("/tickets")}
                      >
                        <div className="flex-1">
                          <h3 className="font-medium">{ticket.title}</h3>
                          <p className="text-sm text-muted-foreground">
                            {new Date(ticket.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        {getStatusBadge(ticket.status)}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {isAdmin && (
            <TabsContent value="users" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <UsersIcon className="h-5 w-5" />
                    Users Directory
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Click on a user to view their complete details including devices, credentials, and history
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="mb-4 space-y-3">
                    <Input
                      id="search-users"
                      name="search-users"
                      placeholder="Search users by name or email..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="max-w-md"
                    />
                    <div className="flex gap-2 items-center flex-wrap">
                      <span className="text-sm font-medium">Device Type:</span>
                      <Button
                        variant={deviceTypeFilter === 'all' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setDeviceTypeFilter('all')}
                      >
                        All Users
                      </Button>
                      <Button
                        variant={deviceTypeFilter === 'full_pc' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setDeviceTypeFilter('full_pc')}
                        className="gap-1"
                      >
                        <Computer className="h-3 w-3" />
                        Full PC
                      </Button>
                      <Button
                        variant={deviceTypeFilter === 'thin_client' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setDeviceTypeFilter('thin_client')}
                        className="gap-1"
                      >
                        <Monitor className="h-3 w-3" />
                        Thin Client
                      </Button>
                    </div>
                  </div>
                  {directoryUsers.length === 0 ? (
                    <p className="text-muted-foreground">No users found. Users can be synced from Microsoft 365 or imported via CSV.</p>
                  ) : (
                    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                      {displayUsers
                        .filter((user) => {
                          // Filter by search query
                          if (searchQuery) {
                            const query = searchQuery.toLowerCase();
                            const matchesSearch = 
                              user.display_name?.toLowerCase().includes(query) ||
                              user.email?.toLowerCase().includes(query) ||
                              user.job_title?.toLowerCase().includes(query);
                            if (!matchesSearch) return false;
                          }
                          
                          // Filter by device type
                          if (deviceTypeFilter !== 'all') {
                            if (user.deviceType !== deviceTypeFilter) {
                              return false;
                            }
                          }
                          
                          return true;
                        })
                        .map((user: UserWithStats) => {
                          // At this point, all users have stats (either real or default values)
                          return (
                            <div
                              key={user.id}
                              className="flex flex-col p-4 rounded-lg border border-border hover:bg-muted/50 hover:shadow-md transition-all cursor-pointer"
                              onClick={() => navigate(`/user-details/${user.id}`)}
                            >
                              <div className="flex flex-col items-center mb-3">
                                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-2 relative">
                                  <UserIcon className="h-8 w-8 text-primary" />
                                  {user.staffUser && (
                                    <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-blue-500 flex items-center justify-center" title="Staff User">
                                      <UsersIcon className="h-3 w-3 text-white" />
                                    </div>
                                  )}
                                </div>
                                <div className="text-center w-full">
                                  <h3 className="font-semibold text-sm line-clamp-1">
                                    {user.display_name || "Unknown"}
                                  </h3>
                                  <p className="text-xs text-muted-foreground line-clamp-1 mt-1">
                                    {user.email || "No email"}
                                  </p>
                                  {user.job_title && (
                                    <p className="text-xs text-muted-foreground line-clamp-1 mt-1">
                                      {user.job_title}
                                    </p>
                                  )}
                                  {/* Device Type Badge */}
                                  {getDeviceTypeBadge(user.deviceType)}
                                </div>
                              </div>

                              {/* Stats section */}
                              {(user.deviceCount > 0 || user.vpnCount > 0 || user.rdpCount > 0) && (
                                <div className="flex flex-wrap gap-1 justify-center mb-2">
                                  {user.deviceCount > 0 && (
                                    <Badge variant="outline" className="text-xs gap-1">
                                      <Computer className="h-3 w-3" />
                                      {user.deviceCount}
                                    </Badge>
                                  )}
                                  {user.vpnCount > 0 && (
                                    <Badge variant="outline" className="text-xs gap-1">
                                      <Wifi className="h-3 w-3" />
                                      {user.vpnCount}
                                    </Badge>
                                  )}
                                  {user.rdpCount > 0 && (
                                    <Badge variant="outline" className="text-xs gap-1">
                                      <Server className="h-3 w-3" />
                                      {user.rdpCount}
                                    </Badge>
                                  )}
                                </div>
                              )}

                              {/* Device Details */}
                              {user.devices.length > 0 && (
                                <div className="text-xs space-y-1 mb-2 text-left w-full">
                                  {user.devices.slice(0, 2).map((device, idx) => (
                                    <div key={device.serial_number || device.device_name || idx} className="border-t pt-1 border-border/50">
                                      {device.device_name && (
                                        <div className="font-medium text-muted-foreground truncate">
                                          {device.device_name}
                                        </div>
                                      )}
                                      {device.serial_number && (
                                        <div className="text-muted-foreground">
                                          <span className="font-semibold">SN:</span> {device.serial_number}
                                        </div>
                                      )}
                                      {device.model && (
                                        <div className="text-muted-foreground truncate">
                                          <span className="font-semibold">Model:</span> {device.model}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                  {user.devices.length > 2 && (
                                    <div className="text-center text-muted-foreground">
                                      +{user.devices.length - 2} more
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* VPN Credentials */}
                              {user.vpnCredentials.length > 0 && (
                                <div className="text-xs space-y-1 mb-2 text-left w-full border-t pt-1 border-border/50">
                                  <div className="font-semibold text-muted-foreground flex items-center gap-1">
                                    <Wifi className="h-3 w-3" /> VPN:
                                  </div>
                                  {user.vpnCredentials.slice(0, 2).map((cred, idx) => (
                                    <div key={`vpn-${cred.username}-${idx}`} className="text-muted-foreground truncate pl-4">
                                      {cred.username}
                                    </div>
                                  ))}
                                  {user.vpnCredentials.length > 2 && (
                                    <div className="text-center text-muted-foreground">
                                      +{user.vpnCredentials.length - 2} more
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* RDP Credentials */}
                              {user.rdpCredentials.length > 0 && (
                                <div className="text-xs space-y-1 mb-2 text-left w-full border-t pt-1 border-border/50">
                                  <div className="font-semibold text-muted-foreground flex items-center gap-1">
                                    <Server className="h-3 w-3" /> RDP:
                                  </div>
                                  {user.rdpCredentials.slice(0, 2).map((cred, idx) => (
                                    <div key={`rdp-${cred.username}-${idx}`} className="text-muted-foreground truncate pl-4">
                                      {cred.username}
                                    </div>
                                  ))}
                                  {user.rdpCredentials.length > 2 && (
                                    <div className="text-center text-muted-foreground">
                                      +{user.rdpCredentials.length - 2} more
                                    </div>
                                  )}
                                </div>
                              )}

                              {user.account_enabled !== null && (
                                <Badge
                                  className={`text-xs w-full justify-center ${
                                    user.account_enabled ? "bg-green-500" : "bg-gray-500"
                                  }`}
                                >
                                  {user.account_enabled ? "Active" : "Disabled"}
                                </Badge>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {!isAdmin && currentUserProfile && (
            <TabsContent value="profile" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <UserIcon className="h-5 w-5" />
                        My Profile
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        Your user information and resources
                      </p>
                    </div>
                    {currentUserProfile.id && (
                      <Button onClick={() => navigate(`/user-details/${currentUserProfile.id}`)}>
                        View Full Details
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col p-6 rounded-lg border border-border max-w-md mx-auto">
                    <div className="flex flex-col items-center mb-4">
                      <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                        <UserIcon className="h-12 w-12 text-primary" />
                      </div>
                      <div className="text-center w-full">
                        <h3 className="font-semibold text-xl mb-1">
                          {currentUserProfile.display_name || "Unknown"}
                        </h3>
                        <p className="text-sm text-muted-foreground mb-2">
                          {currentUserProfile.email || "No email"}
                        </p>
                        {currentUserProfile.job_title && (
                          <p className="text-sm text-muted-foreground mb-3">
                            {currentUserProfile.job_title}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Stats section */}
                    {(currentUserProfile.deviceCount > 0 || currentUserProfile.vpnCount > 0 || currentUserProfile.rdpCount > 0) && (
                      <div className="flex flex-wrap gap-2 justify-center mb-4">
                        {currentUserProfile.deviceCount > 0 && (
                          <Badge variant="outline" className="text-sm gap-1">
                            <Computer className="h-4 w-4" />
                            {currentUserProfile.deviceCount} {currentUserProfile.deviceCount === 1 ? 'Device' : 'Devices'}
                          </Badge>
                        )}
                        {currentUserProfile.vpnCount > 0 && (
                          <Badge variant="outline" className="text-sm gap-1">
                            <Wifi className="h-4 w-4" />
                            {currentUserProfile.vpnCount} VPN
                          </Badge>
                        )}
                        {currentUserProfile.rdpCount > 0 && (
                          <Badge variant="outline" className="text-sm gap-1">
                            <Server className="h-4 w-4" />
                            {currentUserProfile.rdpCount} RDP
                          </Badge>
                        )}
                      </div>
                    )}

                    {/* Device Details */}
                    {currentUserProfile.devices.length > 0 && (
                      <div className="text-sm space-y-2 mb-3 text-left w-full">
                        <div className="font-semibold text-muted-foreground mb-2">My Devices:</div>
                        {currentUserProfile.devices.map((device, idx) => (
                          <div key={device.serial_number || device.device_name || idx} className="border-t pt-2 border-border/50">
                            {device.device_name && (
                              <div className="font-medium">
                                {device.device_name}
                              </div>
                            )}
                            {device.serial_number && (
                              <div className="text-muted-foreground">
                                <span className="font-semibold">Serial:</span> {device.serial_number}
                              </div>
                            )}
                            {device.model && (
                              <div className="text-muted-foreground">
                                <span className="font-semibold">Model:</span> {device.model}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* VPN Credentials */}
                    {currentUserProfile.vpnCredentials.length > 0 && (
                      <div className="text-sm space-y-2 mb-3 text-left w-full border-t pt-2 border-border/50">
                        <div className="font-semibold text-muted-foreground flex items-center gap-1">
                          <Wifi className="h-4 w-4" /> VPN Accounts:
                        </div>
                        {currentUserProfile.vpnCredentials.map((cred, idx) => (
                          <div key={`vpn-${cred.username}-${idx}`} className="text-muted-foreground pl-6">
                            {cred.username}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* RDP Credentials */}
                    {currentUserProfile.rdpCredentials.length > 0 && (
                      <div className="text-sm space-y-2 mb-3 text-left w-full border-t pt-2 border-border/50">
                        <div className="font-semibold text-muted-foreground flex items-center gap-1">
                          <Server className="h-4 w-4" /> RDP Accounts:
                        </div>
                        {currentUserProfile.rdpCredentials.map((cred, idx) => (
                          <div key={`rdp-${cred.username}-${idx}`} className="text-muted-foreground pl-6">
                            {cred.username}
                          </div>
                        ))}
                      </div>
                    )}

                    {currentUserProfile.account_enabled !== null && (
                      <Badge
                        className={`text-sm w-full justify-center ${
                          currentUserProfile.account_enabled ? "bg-green-500" : "bg-gray-500"
                        }`}
                      >
                        {currentUserProfile.account_enabled ? "Account Active" : "Account Disabled"}
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          <TabsContent value="copilot" className="space-y-6">
            <CopilotPrompt />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
