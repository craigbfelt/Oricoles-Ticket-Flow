import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { CopilotPrompt } from "@/components/CopilotPrompt";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Ticket, Package, AlertCircle, CheckCircle, Monitor, User as UserIcon, Users as UsersIcon, Wifi, Server, Computer } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
      const { data: credentials } = await supabase
        .from("vpn_rdp_credentials")
        .select("email, service_type, username");

      // Fetch hardware inventory including serial numbers, models, and device names
      const { data: devices } = await supabase
        .from("hardware_inventory")
        .select("m365_user_principal_name, serial_number, model, device_name");

      // Create maps for quick lookup with detailed data
      const vpnMap = new Map<string, CredentialInfo[]>();
      const rdpMap = new Map<string, CredentialInfo[]>();
      
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

      const deviceMap = new Map<string, DeviceInfo[]>();
      devices?.forEach(device => {
        const upn = device.m365_user_principal_name?.toLowerCase();
        if (upn) {
          const deviceInfo: DeviceInfo = {
            serial_number: device.serial_number,
            model: device.model,
            device_name: device.device_name
          };
          const existing = deviceMap.get(upn) || [];
          deviceMap.set(upn, [...existing, deviceInfo]);
        }
      });

      // Enrich users with counts and arrays of device/credential details
      const enrichedUsers: UserWithStats[] = users.map(user => {
        const email = user.email?.toLowerCase() || '';
        const upn = user.user_principal_name?.toLowerCase() || '';
        
        const userDevices = deviceMap.get(upn) || [];
        const userVpnCreds = vpnMap.get(email) || [];
        const userRdpCreds = rdpMap.get(email) || [];
        
        return {
          ...user,
          staffUser: staffEmails.has(email),
          vpnCount: userVpnCreds.length,
          rdpCount: userRdpCreds.length,
          deviceCount: userDevices.length,
          devices: userDevices,
          vpnCredentials: userVpnCreds,
          rdpCredentials: userRdpCreds,
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
      const { data, error } = await supabase
        .from("directory_users")
        .select("id, display_name, email, job_title, account_enabled, user_principal_name")
        .order("display_name")
        .limit(500); // Add reasonable limit for performance

      if (error) {
        console.error("Error fetching directory users:", error);
        return;
      }

      if (data) {
        setDirectoryUsers(data);
        // Fetch additional stats for each user
        await enrichUsersWithStats(data);
      }
    } catch (error) {
      console.error("Error fetching directory users:", error);
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
      rdpCredentials: []
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
                  <div className="mb-4">
                    <Input
                      id="search-users"
                      name="search-users"
                      placeholder="Search users by name or email..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="max-w-md"
                    />
                  </div>
                  {directoryUsers.length === 0 ? (
                    <p className="text-muted-foreground">No users synced from Intune yet</p>
                  ) : (
                    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                      {displayUsers
                        .filter((user) => {
                          if (!searchQuery) return true;
                          const query = searchQuery.toLowerCase();
                          return (
                            user.display_name?.toLowerCase().includes(query) ||
                            user.email?.toLowerCase().includes(query) ||
                            user.job_title?.toLowerCase().includes(query)
                          );
                        })
                        .map((user) => {
                          // At this point, all users have stats (either real or default values)
                          const userWithStats = user as UserWithStats;
                          return (
                            <div
                              key={user.id}
                              className="flex flex-col p-4 rounded-lg border border-border hover:bg-muted/50 hover:shadow-md transition-all cursor-pointer"
                              onClick={() => navigate(`/user-details/${user.id}`)}
                            >
                              <div className="flex flex-col items-center mb-3">
                                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-2 relative">
                                  <UserIcon className="h-8 w-8 text-primary" />
                                  {userWithStats.staffUser && (
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
                                </div>
                              </div>

                              {/* Stats section */}
                              {(userWithStats.deviceCount > 0 || userWithStats.vpnCount > 0 || userWithStats.rdpCount > 0) && (
                                <div className="flex flex-wrap gap-1 justify-center mb-2">
                                  {userWithStats.deviceCount > 0 && (
                                    <Badge variant="outline" className="text-xs gap-1">
                                      <Computer className="h-3 w-3" />
                                      {userWithStats.deviceCount}
                                    </Badge>
                                  )}
                                  {userWithStats.vpnCount > 0 && (
                                    <Badge variant="outline" className="text-xs gap-1">
                                      <Wifi className="h-3 w-3" />
                                      {userWithStats.vpnCount}
                                    </Badge>
                                  )}
                                  {userWithStats.rdpCount > 0 && (
                                    <Badge variant="outline" className="text-xs gap-1">
                                      <Server className="h-3 w-3" />
                                      {userWithStats.rdpCount}
                                    </Badge>
                                  )}
                                </div>
                              )}

                              {/* Device Details */}
                              {userWithStats.devices.length > 0 && (
                                <div className="text-xs space-y-1 mb-2 text-left w-full">
                                  {userWithStats.devices.slice(0, 2).map((device, idx) => (
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
                                  {userWithStats.devices.length > 2 && (
                                    <div className="text-center text-muted-foreground">
                                      +{userWithStats.devices.length - 2} more
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* VPN Credentials */}
                              {userWithStats.vpnCredentials.length > 0 && (
                                <div className="text-xs space-y-1 mb-2 text-left w-full border-t pt-1 border-border/50">
                                  <div className="font-semibold text-muted-foreground flex items-center gap-1">
                                    <Wifi className="h-3 w-3" /> VPN:
                                  </div>
                                  {userWithStats.vpnCredentials.slice(0, 2).map((cred, idx) => (
                                    <div key={`vpn-${cred.username}-${idx}`} className="text-muted-foreground truncate pl-4">
                                      {cred.username}
                                    </div>
                                  ))}
                                  {userWithStats.vpnCredentials.length > 2 && (
                                    <div className="text-center text-muted-foreground">
                                      +{userWithStats.vpnCredentials.length - 2} more
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* RDP Credentials */}
                              {userWithStats.rdpCredentials.length > 0 && (
                                <div className="text-xs space-y-1 mb-2 text-left w-full border-t pt-1 border-border/50">
                                  <div className="font-semibold text-muted-foreground flex items-center gap-1">
                                    <Server className="h-3 w-3" /> RDP:
                                  </div>
                                  {userWithStats.rdpCredentials.slice(0, 2).map((cred, idx) => (
                                    <div key={`rdp-${cred.username}-${idx}`} className="text-muted-foreground truncate pl-4">
                                      {cred.username}
                                    </div>
                                  ))}
                                  {userWithStats.rdpCredentials.length > 2 && (
                                    <div className="text-center text-muted-foreground">
                                      +{userWithStats.rdpCredentials.length - 2} more
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
