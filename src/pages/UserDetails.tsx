import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  User, 
  Monitor, 
  Key, 
  Building2,
  Calendar,
  Mail,
  Briefcase,
  History,
  Loader2,
  AlertCircle,
  IdCard
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface DirectoryUser {
  id: string;
  aad_id: string | null;
  display_name: string | null;
  email: string | null;
  user_principal_name: string | null;
  job_title: string | null;
  department: string | null;
  account_enabled: boolean | null;
  created_at: string;
  updated_at: string;
}

interface Device {
  id: string;
  device_name: string | null;
  device_type: string | null;
  manufacturer: string | null;
  model: string | null;
  serial_number: string | null;
  os: string | null;
  os_version: string | null;
  status: string | null;
  branch: string | null;
  m365_user_principal_name: string | null;
  assigned_to: string | null;
}

interface Credential {
  id: string;
  username: string;
  service_type: string;
  email: string | null;
  notes: string | null;
}

interface Ticket {
  id: string;
  title: string;
  status: string;
  priority: string;
  created_at: string;
}

interface Profile {
  branch: string | null;
  full_name: string | null;
}

const UserDetails = () => {
  const navigate = useNavigate();
  const { userId } = useParams<{ userId: string }>();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [user, setUser] = useState<DirectoryUser | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (isAdmin && userId) {
      fetchUserData();
    }
  }, [isAdmin, userId]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }

    // Check if user is admin
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roles) {
      navigate("/dashboard");
      return;
    }

    setIsAdmin(true);
  };

  const fetchUserData = async () => {
    if (!userId) return;

    try {
      setLoading(true);

      // Fetch directory user
      const { data: userData, error: userError } = await supabase
        .from("directory_users")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (userError) throw userError;
      setUser(userData);

      if (userData) {
        // Fetch devices associated with this user - using safe filtering approach
        let devicesData = [];
        
        if (userData.user_principal_name && userData.email) {
          const { data } = await supabase
            .from("hardware_inventory")
            .select("*")
            .or(`m365_user_principal_name.eq.${userData.user_principal_name},email.eq.${userData.email}`)
            .order("device_name");
          devicesData = data || [];
        } else if (userData.user_principal_name) {
          const { data } = await supabase
            .from("hardware_inventory")
            .select("*")
            .eq("m365_user_principal_name", userData.user_principal_name)
            .order("device_name");
          devicesData = data || [];
        } else if (userData.email) {
          const { data } = await supabase
            .from("hardware_inventory")
            .select("*")
            .eq("email", userData.email)
            .order("device_name");
          devicesData = data || [];
        }

        setDevices(devicesData);

        // Fetch VPN/RDP credentials for this user
        const { data: credentialsData } = await supabase
          .from("vpn_rdp_credentials")
          .select("id, username, service_type, email, notes")
          .eq("email", userData.email);

        setCredentials(credentialsData || []);

        // Fetch tickets created by or assigned to this user
        // First, find if there's a corresponding auth user
        const { data: authUserData } = await supabase
          .from("profiles")
          .select("user_id, branch, full_name")
          .eq("email", userData.email)
          .maybeSingle();

        if (authUserData) {
          setProfile({ branch: authUserData.branch, full_name: authUserData.full_name });

          const { data: ticketsData } = await supabase
            .from("tickets")
            .select("id, title, status, priority, created_at")
            .or(`created_by.eq.${authUserData.user_id},assigned_to.eq.${authUserData.user_id}`)
            .order("created_at", { ascending: false })
            .limit(20);

          setTickets(ticketsData || []);
        }
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      open: "bg-status-open",
      in_progress: "bg-status-in-progress",
      pending: "bg-status-pending",
      resolved: "bg-status-resolved",
      closed: "bg-status-closed",
      active: "bg-green-500",
      inactive: "bg-gray-500",
    };

    return (
      <Badge className={`${colors[status] || "bg-gray-500"} text-white`}>
        {status.replace("_", " ")}
      </Badge>
    );
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!user) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>User Not Found</AlertTitle>
            <AlertDescription>
              The requested user could not be found.
            </AlertDescription>
          </Alert>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="h-8 w-8 text-primary" />
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-bold">{user.display_name || "Unknown User"}</h1>
            <p className="text-muted-foreground">{user.email}</p>
          </div>
          {user.account_enabled !== null && (
            <Badge className={user.account_enabled ? "bg-green-500" : "bg-red-500"}>
              {user.account_enabled ? "Active" : "Disabled"}
            </Badge>
          )}
        </div>

        {/* Basic Info Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Job Title</CardTitle>
              <Briefcase className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-semibold">{user.job_title || "N/A"}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Department</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-semibold">{user.department || "N/A"}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Branch</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-semibold">{profile?.branch || "N/A"}</div>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Information Tabs */}
        <Tabs defaultValue="devices" className="w-full">
          <TabsList>
            <TabsTrigger value="devices">Devices ({devices.length})</TabsTrigger>
            <TabsTrigger value="credentials">Credentials ({credentials.length})</TabsTrigger>
            <TabsTrigger value="tickets">Tickets ({tickets.length})</TabsTrigger>
            <TabsTrigger value="info">User Info</TabsTrigger>
          </TabsList>

          <TabsContent value="devices" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Monitor className="h-5 w-5" />
                  Assigned Devices
                </CardTitle>
              </CardHeader>
              <CardContent>
                {devices.length === 0 ? (
                  <p className="text-muted-foreground">No devices found for this user</p>
                ) : (
                  <div className="space-y-4">
                    {devices.map((device) => (
                      <div
                        key={device.id}
                        className="p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="space-y-1 flex-1">
                            <h3 className="font-semibold text-lg">
                              {device.device_name || "Unnamed Device"}
                            </h3>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div>
                                <span className="text-muted-foreground">Type:</span>{" "}
                                {device.device_type || "N/A"}
                              </div>
                              <div>
                                <span className="text-muted-foreground">Serial:</span>{" "}
                                {device.serial_number || "N/A"}
                              </div>
                              <div>
                                <span className="text-muted-foreground">Manufacturer:</span>{" "}
                                {device.manufacturer || "N/A"}
                              </div>
                              <div>
                                <span className="text-muted-foreground">Model:</span>{" "}
                                {device.model || "N/A"}
                              </div>
                              <div>
                                <span className="text-muted-foreground">OS:</span>{" "}
                                {device.os ? `${device.os} ${device.os_version || ""}` : "N/A"}
                              </div>
                              <div>
                                <span className="text-muted-foreground">Branch:</span>{" "}
                                {device.branch || "N/A"}
                              </div>
                            </div>
                          </div>
                          {device.status && getStatusBadge(device.status)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="credentials" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5" />
                  VPN & RDP Credentials
                </CardTitle>
              </CardHeader>
              <CardContent>
                {credentials.length === 0 ? (
                  <p className="text-muted-foreground">No credentials found for this user</p>
                ) : (
                  <div className="space-y-4">
                    {credentials.map((cred) => (
                      <div
                        key={cred.id}
                        className="p-4 rounded-lg border border-border"
                      >
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="font-semibold">{cred.username}</div>
                            <div className="text-sm text-muted-foreground">
                              {cred.service_type}
                            </div>
                            {cred.notes && (
                              <div className="text-sm mt-2">{cred.notes}</div>
                            )}
                          </div>
                          <Badge variant="outline">{cred.service_type}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tickets" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Ticket History
                </CardTitle>
              </CardHeader>
              <CardContent>
                {tickets.length === 0 ? (
                  <p className="text-muted-foreground">No tickets found for this user</p>
                ) : (
                  <div className="space-y-4">
                    {tickets.map((ticket) => (
                      <div
                        key={ticket.id}
                        className="p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() => navigate("/tickets")}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h3 className="font-medium">{ticket.title}</h3>
                            <p className="text-sm text-muted-foreground">
                              {new Date(ticket.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            {getStatusBadge(ticket.status)}
                            <Badge variant="outline">{ticket.priority}</Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="info" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Microsoft 365 Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="text-sm text-muted-foreground">Email</div>
                      <div className="font-medium">{user.email || "N/A"}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="text-sm text-muted-foreground">User Principal Name</div>
                      <div className="font-medium">{user.user_principal_name || "N/A"}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <IdCard className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="text-sm text-muted-foreground">Azure AD ID</div>
                      <div className="font-mono text-sm">{user.aad_id || "N/A"}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="text-sm text-muted-foreground">Last Updated</div>
                      <div className="font-medium">
                        {new Date(user.updated_at).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default UserDetails;
