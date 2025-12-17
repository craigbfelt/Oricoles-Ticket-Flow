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
  IdCard,
  Plus,
  ArrowLeft
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FaultTypeSelector } from "@/components/FaultTypeSelector";
import { useToast } from "@/hooks/use-toast";
import { ticketSchema } from "@/lib/validations";

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
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [user, setUser] = useState<DirectoryUser | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [currentUserProfileId, setCurrentUserProfileId] = useState<string | null>(null);
  
  // Ticket creation dialog state
  const [ticketDialogOpen, setTicketDialogOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [faultType, setFaultType] = useState("");
  const [priority, setPriority] = useState("medium");
  const [category, setCategory] = useState("");
  const [errorCode, setErrorCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (userId) {
      fetchUserData();
    }
  }, [isAdmin, userId]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }

    // Get current user's profile ID and email
    const { data: profileData } = await supabase
      .from("profiles")
      .select("id, email")
      .eq("user_id", session.user.id)
      .maybeSingle();

    if (profileData) {
      setCurrentUserProfileId(profileData.id);
    }

    // Check if user is admin
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .eq("role", "admin")
      .maybeSingle();

    const adminStatus = !!roles;
    setIsAdmin(adminStatus);

    // If not admin, check if they're trying to access their own profile
    if (!adminStatus && userId && profileData) {
      // Get the directory user being viewed
      const { data: viewedUser } = await supabase
        .from("directory_users")
        .select("email")
        .eq("id", userId)
        .maybeSingle();

      // If not their own profile, redirect to dashboard
      if (!viewedUser || viewedUser.email?.toLowerCase() !== profileData.email?.toLowerCase()) {
        navigate("/dashboard");
        return;
      }
    }
  };

  const fetchUserData = async () => {
    if (!userId) return;

    try {
      setLoading(true);

      // Try to fetch from master_user_list first (Dashboard uses this)
      const { data: masterUser, error: masterError } = await supabase
        .from("master_user_list")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      let userData: DirectoryUser | null = null;

      if (masterUser) {
        // Found in master_user_list - convert to DirectoryUser format
        // Try to enrich with directory_users data if available
        let directoryData = null;
        if (masterUser.email) {
          const { data: dirData } = await supabase
            .from("directory_users")
            .select("*")
            .eq("email", masterUser.email)
            .maybeSingle();
          directoryData = dirData;
        }

        // Combine master_user_list data with directory_users data
        userData = {
          id: masterUser.id,
          aad_id: directoryData?.aad_id || null,
          display_name: masterUser.display_name || directoryData?.display_name || null,
          email: masterUser.email,
          user_principal_name: directoryData?.user_principal_name || masterUser.email || null,
          job_title: masterUser.job_title || directoryData?.job_title || null,
          department: masterUser.department || directoryData?.department || null,
          account_enabled: directoryData?.account_enabled ?? masterUser.is_active ?? true,
          created_at: masterUser.created_at,
          updated_at: masterUser.updated_at,
        };
      } else {
        // Not in master_user_list, try directory_users (backward compatibility)
        const { data: dirUser, error: userError } = await supabase
          .from("directory_users")
          .select("*")
          .eq("id", userId)
          .maybeSingle();

        if (userError && userError.code !== 'PGRST116') throw userError;
        userData = dirUser;
      }

      setUser(userData);

      if (userData) {
        // Fetch devices associated with this user using parameterized queries
        let devicesData: Device[] = [];
        
        // Try to fetch by UPN first (for M365 users)
        if (userData.user_principal_name) {
          const { data } = await supabase
            .from("hardware_inventory")
            .select("*")
            .eq("m365_user_principal_name", userData.user_principal_name)
            .order("device_name");
          devicesData = data || [];
        }

        // Also fetch from device_user_assignments (for CSV-imported users)
        if (userData.email) {
          const { data: assignedDevices } = await supabase
            .from("device_user_assignments")
            .select("*")
            .eq("user_email", userData.email)
            .eq("is_current", true);

          // Track serials to avoid duplicates across all device sources
          const existingSerials = new Set(devicesData.map(d => d.serial_number).filter(Boolean));

          // Add assigned devices to the list (avoid duplicates by serial number)
          if (assignedDevices && assignedDevices.length > 0) {
            assignedDevices.forEach(assignment => {
              if (assignment.device_serial_number && !existingSerials.has(assignment.device_serial_number)) {
                // Convert device assignment to Device format
                devicesData.push({
                  id: assignment.id,
                  device_name: assignment.device_name,
                  device_type: null,
                  manufacturer: null,
                  model: assignment.device_model,
                  serial_number: assignment.device_serial_number,
                  os: null,
                  os_version: null,
                  status: 'active',
                  branch: null,
                  m365_user_principal_name: null,
                  assigned_to: assignment.user_email,
                });
                // Add to Set to track new serials as we process them
                existingSerials.add(assignment.device_serial_number);
              }
            });
          }

          // Also fetch thin clients and manually tracked devices from manual_devices table
          const { data: manualDevices } = await supabase
            .from("manual_devices")
            .select("*")
            .eq("assigned_user_email", userData.email)
            .eq("is_active", true);

          if (manualDevices && manualDevices.length > 0) {
            manualDevices.forEach(device => {
              if (device.device_serial_number && !existingSerials.has(device.device_serial_number)) {
                devicesData.push({
                  id: device.id,
                  device_name: device.device_name,
                  device_type: device.device_type,
                  manufacturer: null,
                  model: device.device_model,
                  serial_number: device.device_serial_number,
                  os: null,
                  os_version: null,
                  status: device.is_active ? 'active' : 'inactive',
                  branch: null,
                  m365_user_principal_name: null,
                  assigned_to: device.assigned_user_email,
                });
                existingSerials.add(device.device_serial_number);
              }
            });
          }
        }

        setDevices(devicesData);

        // Fetch VPN/RDP credentials for this user
        if (userData.email) {
          const { data: credentialsData } = await supabase
            .from("vpn_rdp_credentials")
            .select("id, username, service_type, email, notes")
            .eq("email", userData.email);

          setCredentials(credentialsData || []);
        }

        // Fetch tickets created by or assigned to this user
        // First, find if there's a corresponding auth user
        if (userData.email) {
          const { data: authUserData } = await supabase
            .from("profiles")
            .select("user_id, branch_id, branches:branch_id(name), full_name")
            .eq("email", userData.email)
            .maybeSingle();

          if (authUserData) {
            // Extract branch name from the joined branches table, default to "NA" if not found
            const branchName = (authUserData.branches as { name: string } | null)?.name || "NA";
            setProfile({ branch: branchName, full_name: authUserData.full_name });

            // Fetch tickets using safe parameterized approach
            const { data: createdTickets } = await supabase
              .from("tickets")
              .select("id, title, status, priority, created_at")
              .eq("created_by", authUserData.user_id)
              .order("created_at", { ascending: false })
              .limit(10);

            const { data: assignedTickets } = await supabase
              .from("tickets")
              .select("id, title, status, priority, created_at")
              .eq("assigned_to", authUserData.user_id)
              .order("created_at", { ascending: false })
              .limit(10);

            // Combine and deduplicate tickets
            const allTickets = [...(createdTickets || []), ...(assignedTickets || [])];
            const uniqueTickets = Array.from(
              new Map(allTickets.map(ticket => [ticket.id, ticket])).values()
            ).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
             .slice(0, 20);

            setTickets(uniqueTickets);
          }
        }
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentUserProfileId || !user) {
      toast({
        title: "Error",
        description: "Unable to create ticket. Missing user information.",
        variant: "destructive",
      });
      return;
    }

    // Get the profile ID for the user we're creating a ticket for
    let targetProfileId = null;
    if (user.email) {
      const { data: targetProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", user.email)
        .maybeSingle();
      
      if (targetProfile) {
        targetProfileId = targetProfile.id;
      }
    }

    // Validate form data
    const formData = {
      title,
      description,
      priority,
      category: category || null,
      branch: profile?.branch || null,
      fault_type: faultType || null,
      user_email: user.email || null,
      error_code: errorCode || null,
    };

    const validationResult = ticketSchema.safeParse(formData);
    if (!validationResult.success) {
      const errors = validationResult.error.errors.map(err => err.message).join(", ");
      toast({
        title: "Validation Error",
        description: errors,
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    const { data: ticketData, error } = await supabase
      .from("tickets")
      .insert([
        {
          title: validationResult.data.title,
          description: validationResult.data.description,
          priority: validationResult.data.priority,
          category: validationResult.data.category,
          branch: validationResult.data.branch,
          fault_type: validationResult.data.fault_type,
          user_email: validationResult.data.user_email,
          error_code: validationResult.data.error_code,
          created_by: targetProfileId || currentUserProfileId,
          status: "open",
          last_activity_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }

    // Route email to IT support
    if (ticketData) {
      try {
        await supabase.functions.invoke("route-ticket-email", {
          body: {
            ticketId: ticketData.id,
            title,
            description,
            faultType,
            branch: profile?.branch || "",
            userEmail: user.email || "",
            errorCode,
            priority,
          },
        });
      } catch (emailError) {
        console.error("Email routing error:", emailError);
      }
    }

    toast({
      title: "Success",
      description: "Ticket created successfully",
    });

    setTicketDialogOpen(false);
    setTitle("");
    setDescription("");
    setFaultType("");
    setPriority("medium");
    setCategory("");
    setErrorCode("");
    setIsSubmitting(false);
    
    // Refresh tickets list
    fetchUserData();
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
        {/* Back Navigation */}
        <div>
          <Button variant="ghost" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>

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
          <Button onClick={() => setTicketDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Ticket
          </Button>
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
                        onClick={() => navigate(`/tickets?id=${ticket.id}`)}
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

        {/* Create Ticket Dialog */}
        <Dialog open={ticketDialogOpen} onOpenChange={setTicketDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Ticket for {user.display_name || user.email}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateTicket} className="space-y-4">
              <div className="space-y-2">
                <Label>User Email</Label>
                <Input value={user.email || ""} disabled />
                <p className="text-xs text-muted-foreground">
                  User details are automatically populated
                </p>
              </div>

              {profile?.branch && (
                <div className="space-y-2">
                  <Label>Branch</Label>
                  <Input value={profile.branch} disabled />
                </div>
              )}

              <FaultTypeSelector value={faultType} onChange={setFaultType} required />

              <div className="space-y-2">
                <Label htmlFor="title">Fault Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Brief description of the issue"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Fault Description / Error Message</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the issue in detail or paste any error messages"
                  rows={4}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="errorCode">Error Code (Optional)</Label>
                <Input
                  id="errorCode"
                  value={errorCode}
                  onChange={(e) => setErrorCode(e.target.value)}
                  placeholder="e.g., 0x80070005"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category (Optional)</Label>
                <Input
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="e.g., Hardware, Software, Network"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "Creating..." : "Create Ticket"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default UserDetails;
