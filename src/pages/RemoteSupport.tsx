import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { useToast } from "@/hooks/use-toast";
import { Monitor, Video, Phone, Eye, Copy, Check, Chrome, Tv, Network, Plus, Download } from "lucide-react";
import { DataTable, type Column } from "@/components/DataTable";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";

interface RemoteClient {
  id: string;
  registration_token: string;
  computer_name: string;
  username: string;
  os_version: string | null;
  ip_address: string | null;
  last_seen_at: string;
  registered_at: string;
  status: string;
}

const RegisteredClients = () => {
  const { data: clients, isLoading } = useQuery({
    queryKey: ['remote-clients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('remote_clients')
        .select('*')
        .order('last_seen_at', { ascending: false });
      
      if (error) throw error;
      return data as RemoteClient[];
    },
  });

  const clientColumns: Column<RemoteClient>[] = [
    {
      key: "computer_name",
      label: "Computer Name",
      sortable: true,
    },
    {
      key: "username",
      label: "Username",
      sortable: true,
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (client) => {
        const lastSeen = new Date(client.last_seen_at);
        const minutesAgo = (Date.now() - lastSeen.getTime()) / 1000 / 60;
        
        const actualStatus = minutesAgo > 10 ? 'offline' : client.status;
        
        return (
          <Badge variant={actualStatus === 'online' ? 'default' : 'secondary'}>
            {actualStatus}
          </Badge>
        );
      },
    },
    {
      key: "ip_address",
      label: "IP Address",
      sortable: true,
    },
    {
      key: "os_version",
      label: "OS Version",
      sortable: true,
    },
    {
      key: "last_seen_at",
      label: "Last Seen",
      sortable: true,
      render: (client) => {
        if (!client.last_seen_at) return "Never";
        return formatDistanceToNow(new Date(client.last_seen_at), { addSuffix: true });
      },
    },
  ];

  if (isLoading) {
    return <div>Loading clients...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Monitor className="h-5 w-5" />
          <CardTitle>Registered Clients</CardTitle>
        </div>
        <CardDescription>
          Computers that have installed the remote support client
        </CardDescription>
      </CardHeader>
      <CardContent>
        <DataTable columns={clientColumns} data={clients || []} searchKeys={["computer_name", "username", "ip_address"]} />
      </CardContent>
    </Card>
  );
};

interface RemoteSession {
  id: string;
  ticket_id: string | null;
  session_code: string;
  user_name: string;
  user_email: string | null;
  device_info: any;
  status: string;
  support_staff_id: string | null;
  started_at: string;
  ended_at: string | null;
  created_at: string;
  connection_type: string;
  connection_details: any;
}

const RemoteSupport = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [sessions, setSessions] = useState<RemoteSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<RemoteSession | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [supportUrl, setSupportUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [newSessionDialogOpen, setNewSessionDialogOpen] = useState(false);
  const [newSessionType, setNewSessionType] = useState<string>("chrome_remote");
  const [newSessionData, setNewSessionData] = useState({
    userName: "",
    userEmail: "",
    ticketId: "",
    chromeCode: "",
    rdpHostname: "",
    rdpUsername: "",
    rdpPassword: "",
    vncHostname: "",
    vncPort: "5900",
    vncPassword: "",
    notes: "",
  });

  useEffect(() => {
    checkAccess();
    fetchSessions();
    generateSupportUrl();
    
    // Set up realtime subscription
    const channel = supabase
      .channel('remote_sessions_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'remote_sessions'
        },
        () => {
          fetchSessions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [navigate]);

  const checkAccess = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }
  };

  const fetchSessions = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("remote_sessions")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch remote sessions",
        variant: "destructive",
      });
    } else {
      setSessions(data || []);
    }
    setLoading(false);
  };

  const generateSupportUrl = () => {
    const baseUrl = window.location.origin;
    setSupportUrl(`${baseUrl}/remote-client`);
  };

  const handleCopyUrl = async () => {
    await navigator.clipboard.writeText(supportUrl);
    setCopied(true);
    toast({
      title: "Copied!",
      description: "Support URL copied to clipboard",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleJoinSession = async (session: RemoteSession) => {
    setSelectedSession(session);
    
    // Update session status
    await supabase
      .from("remote_sessions")
      .update({ 
        status: "active",
        support_staff_id: (await supabase.auth.getUser()).data.user?.id 
      })
      .eq("id", session.id);

    setViewerOpen(true);
  };

  const handleEndSession = async (sessionId: string) => {
    await supabase
      .from("remote_sessions")
      .update({ 
        status: "completed",
        ended_at: new Date().toISOString()
      })
      .eq("id", sessionId);

    if (remoteStream) {
      remoteStream.getTracks().forEach(track => track.stop());
      setRemoteStream(null);
    }
    
    setViewerOpen(false);
    setSelectedSession(null);
    
    toast({
      title: "Session Ended",
      description: "Remote support session has been closed",
    });
  };

  const handleCreateSession = async () => {
    if (!newSessionData.userName.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter the user's name",
        variant: "destructive",
      });
      return;
    }

    let connectionDetails: any = {};
    
    switch (newSessionType) {
      case "chrome_remote":
        if (!newSessionData.chromeCode.trim()) {
          toast({
            title: "Code Required",
            description: "Please enter Chrome Remote Desktop code",
            variant: "destructive",
          });
          return;
        }
        connectionDetails = { access_code: newSessionData.chromeCode };
        break;
      case "rdp":
        if (!newSessionData.rdpHostname.trim() || !newSessionData.rdpUsername.trim()) {
          toast({
            title: "Details Required",
            description: "Please enter RDP hostname and username",
            variant: "destructive",
          });
          return;
        }
        connectionDetails = {
          hostname: newSessionData.rdpHostname,
          username: newSessionData.rdpUsername,
          password: newSessionData.rdpPassword,
        };
        break;
      case "vnc":
        if (!newSessionData.vncHostname.trim()) {
          toast({
            title: "Hostname Required",
            description: "Please enter VNC hostname",
            variant: "destructive",
          });
          return;
        }
        connectionDetails = {
          hostname: newSessionData.vncHostname,
          port: newSessionData.vncPort,
          password: newSessionData.vncPassword,
        };
        break;
    }

    try {
      const sessionCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      
      const { error } = await supabase
        .from("remote_sessions")
        .insert({
          session_code: sessionCode,
          user_name: newSessionData.userName,
          user_email: newSessionData.userEmail || null,
          ticket_id: newSessionData.ticketId || null,
          connection_type: newSessionType,
          connection_details: { ...connectionDetails, notes: newSessionData.notes },
          status: "pending",
        });

      if (error) throw error;

      toast({
        title: "Session Created",
        description: `Session ${sessionCode} created successfully`,
      });

      setNewSessionDialogOpen(false);
      setNewSessionData({
        userName: "",
        userEmail: "",
        ticketId: "",
        chromeCode: "",
        rdpHostname: "",
        rdpUsername: "",
        rdpPassword: "",
        vncHostname: "",
        vncPort: "5900",
        vncPassword: "",
        notes: "",
      });
      
      fetchSessions();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create session",
        variant: "destructive",
      });
    }
  };

  const getConnectionIcon = (type: string) => {
    switch (type) {
      case "chrome_remote":
        return <Chrome className="w-4 h-4" />;
      case "rdp":
        return <Tv className="w-4 h-4" />;
      case "vnc":
        return <Network className="w-4 h-4" />;
      default:
        return <Video className="w-4 h-4" />;
    }
  };

  const getLaunchInstructions = (session: RemoteSession) => {
    switch (session.connection_type) {
      case "chrome_remote":
        return (
          <div className="space-y-2">
            <p className="font-medium">Chrome Remote Desktop Instructions:</p>
            <ol className="list-decimal list-inside space-y-1 text-sm">
              <li>Open Chrome browser</li>
              <li>Go to <a href="https://remotedesktop.google.com/access" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">remotedesktop.google.com/access</a></li>
              <li>Enter access code: <span className="font-mono font-bold">{session.connection_details?.access_code}</span></li>
              <li>Click Connect</li>
            </ol>
          </div>
        );
      case "rdp":
        return (
          <div className="space-y-2">
            <p className="font-medium">RDP Connection Details:</p>
            <div className="bg-muted p-3 rounded-md space-y-1 text-sm font-mono">
              <div><span className="font-semibold">Hostname:</span> {session.connection_details?.hostname}</div>
              <div><span className="font-semibold">Username:</span> {session.connection_details?.username}</div>
              <div><span className="font-semibold">Password:</span> {session.connection_details?.password || "Not provided"}</div>
            </div>
            <p className="text-sm text-muted-foreground">Use Windows Remote Desktop Connection (mstsc.exe)</p>
          </div>
        );
      case "vnc":
        return (
          <div className="space-y-2">
            <p className="font-medium">VNC Connection Details:</p>
            <div className="bg-muted p-3 rounded-md space-y-1 text-sm font-mono">
              <div><span className="font-semibold">Host:</span> {session.connection_details?.hostname}:{session.connection_details?.port}</div>
              <div><span className="font-semibold">Password:</span> {session.connection_details?.password || "Not provided"}</div>
            </div>
            <p className="text-sm text-muted-foreground">Use VNC Viewer (TightVNC, RealVNC, etc.)</p>
          </div>
        );
      default:
        return <p className="text-sm">Screen sharing session - view only</p>;
    }
  };

  const columns: Column<RemoteSession>[] = [
    {
      key: "connection_type",
      label: "Type",
      sortable: true,
      render: (session) => (
        <div className="flex items-center gap-2">
          {getConnectionIcon(session.connection_type)}
          <span className="capitalize">{session.connection_type.replace("_", " ")}</span>
        </div>
      ),
    },
    {
      key: "session_code",
      label: "Session Code",
      sortable: true,
      render: (session) => (
        <span className="font-mono font-semibold">{session.session_code}</span>
      ),
    },
    {
      key: "user_name",
      label: "User",
      sortable: true,
    },
    {
      key: "user_email",
      label: "Email",
      sortable: true,
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (session) => {
        const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
          pending: "secondary",
          active: "default",
          completed: "outline",
        };
        return (
          <Badge variant={variants[session.status] || "outline"}>
            {session.status}
          </Badge>
        );
      },
    },
    {
      key: "started_at",
      label: "Started",
      sortable: true,
      render: (session) => new Date(session.started_at).toLocaleString(),
    },
    {
      key: "id",
      label: "Actions",
      render: (session) => (
        session.status === "pending" ? (
          <Button
            size="sm"
            onClick={() => handleJoinSession(session)}
          >
            <Eye className="w-4 h-4 mr-2" />
            Join Session
          </Button>
        ) : session.status === "active" ? (
          <Button
            size="sm"
            variant="destructive"
            onClick={() => handleEndSession(session.id)}
          >
            <Phone className="w-4 h-4 mr-2" />
            End Session
          </Button>
        ) : null
      ),
    },
  ];

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Monitor className="w-8 h-8" />
              Remote Support Portal
            </h1>
            <p className="text-muted-foreground">Unified access for Chrome Remote Desktop, RDP, and VNC</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/remote-client-setup')}>
              <Download className="w-4 h-4 mr-2" />
              Client Setup
            </Button>
            <Button onClick={() => setNewSessionDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              New Session
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Support Client URL</CardTitle>
            <CardDescription>Share this URL with users who need remote support</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <div className="flex-1 p-3 bg-muted rounded-md font-mono text-sm">
                {supportUrl}
              </div>
              <Button onClick={handleCopyUrl}>
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="sessions" className="space-y-4">
          <TabsList>
            <TabsTrigger value="sessions">Sessions</TabsTrigger>
            <TabsTrigger value="clients">Registered Clients</TabsTrigger>
          </TabsList>

          <TabsContent value="sessions">
            {loading ? (
              <p>Loading sessions...</p>
            ) : (
              <DataTable
                data={sessions}
                columns={columns}
                searchKeys={["session_code", "user_name", "user_email"]}
              />
            )}
          </TabsContent>

          <TabsContent value="clients">
            <RegisteredClients />
          </TabsContent>
        </Tabs>

        <Dialog open={viewerOpen} onOpenChange={setViewerOpen}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {selectedSession && getConnectionIcon(selectedSession.connection_type)}
                Remote Session Details
              </DialogTitle>
              <DialogDescription>
                Session with {selectedSession?.user_name}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6">
              {selectedSession && (
                <>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">User:</span> {selectedSession.user_name}
                    </div>
                    <div>
                      <span className="font-medium">Session Code:</span>{" "}
                      <span className="font-mono">{selectedSession.session_code}</span>
                    </div>
                    <div>
                      <span className="font-medium">Email:</span> {selectedSession.user_email || "N/A"}
                    </div>
                    <div>
                      <span className="font-medium">Status:</span>{" "}
                      <Badge>{selectedSession.status}</Badge>
                    </div>
                  </div>

                  <div className="border rounded-lg p-4">
                    {getLaunchInstructions(selectedSession)}
                    {selectedSession.connection_details?.notes && (
                      <div className="mt-4 pt-4 border-t">
                        <p className="font-medium text-sm">Notes:</p>
                        <p className="text-sm text-muted-foreground">{selectedSession.connection_details.notes}</p>
                      </div>
                    )}
                  </div>

                  {selectedSession.connection_type === "screen_share" && (
                    <div className="bg-black rounded-lg aspect-video flex items-center justify-center">
                      {remoteStream ? (
                        <video
                          autoPlay
                          playsInline
                          ref={(video) => {
                            if (video && remoteStream) {
                              video.srcObject = remoteStream;
                            }
                          }}
                          className="w-full h-full"
                        />
                      ) : (
                        <div className="text-center text-muted-foreground">
                          <Video className="w-16 h-16 mx-auto mb-4 opacity-50" />
                          <p>Waiting for user to share their screen...</p>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              <div className="flex justify-end gap-2">
                <Button
                  variant="destructive"
                  onClick={() => selectedSession && handleEndSession(selectedSession.id)}
                >
                  <Phone className="w-4 h-4 mr-2" />
                  End Session
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={newSessionDialogOpen} onOpenChange={setNewSessionDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Remote Session</DialogTitle>
              <DialogDescription>
                Set up a new remote support session with connection details
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="sessionType">Connection Type *</Label>
                <Select value={newSessionType} onValueChange={setNewSessionType}>
                  <SelectTrigger id="sessionType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="chrome_remote">
                      <div className="flex items-center gap-2">
                        <Chrome className="w-4 h-4" />
                        Chrome Remote Desktop
                      </div>
                    </SelectItem>
                    <SelectItem value="rdp">
                      <div className="flex items-center gap-2">
                        <Tv className="w-4 h-4" />
                        RDP (Remote Desktop)
                      </div>
                    </SelectItem>
                    <SelectItem value="vnc">
                      <div className="flex items-center gap-2">
                        <Network className="w-4 h-4" />
                        VNC
                      </div>
                    </SelectItem>
                    <SelectItem value="screen_share">
                      <div className="flex items-center gap-2">
                        <Video className="w-4 h-4" />
                        Screen Share (Web)
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="userName">User Name *</Label>
                  <Input
                    id="userName"
                    placeholder="John Doe"
                    value={newSessionData.userName}
                    onChange={(e) => setNewSessionData({ ...newSessionData, userName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="userEmail">Email (Optional)</Label>
                  <Input
                    id="userEmail"
                    type="email"
                    placeholder="john@example.com"
                    value={newSessionData.userEmail}
                    onChange={(e) => setNewSessionData({ ...newSessionData, userEmail: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ticketId">Ticket ID (Optional)</Label>
                <Input
                  id="ticketId"
                  placeholder="Link to existing ticket"
                  value={newSessionData.ticketId}
                  onChange={(e) => setNewSessionData({ ...newSessionData, ticketId: e.target.value })}
                />
              </div>

              {newSessionType === "chrome_remote" && (
                <div className="space-y-2">
                  <Label htmlFor="chromeCode">Chrome Remote Desktop Code *</Label>
                  <Input
                    id="chromeCode"
                    placeholder="12-digit access code"
                    value={newSessionData.chromeCode}
                    onChange={(e) => setNewSessionData({ ...newSessionData, chromeCode: e.target.value })}
                  />
                  <p className="text-sm text-muted-foreground">
                    Ask the user to generate a code at remotedesktop.google.com/support
                  </p>
                </div>
              )}

              {newSessionType === "rdp" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="rdpHostname">Hostname/IP Address *</Label>
                    <Input
                      id="rdpHostname"
                      placeholder="192.168.1.100 or computer.domain.com"
                      value={newSessionData.rdpHostname}
                      onChange={(e) => setNewSessionData({ ...newSessionData, rdpHostname: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="rdpUsername">Username *</Label>
                      <Input
                        id="rdpUsername"
                        placeholder="DOMAIN\\username"
                        value={newSessionData.rdpUsername}
                        onChange={(e) => setNewSessionData({ ...newSessionData, rdpUsername: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="rdpPassword">Password (Optional)</Label>
                      <Input
                        id="rdpPassword"
                        type="password"
                        placeholder="••••••••"
                        value={newSessionData.rdpPassword}
                        onChange={(e) => setNewSessionData({ ...newSessionData, rdpPassword: e.target.value })}
                      />
                    </div>
                  </div>
                </>
              )}

              {newSessionType === "vnc" && (
                <>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-2 space-y-2">
                      <Label htmlFor="vncHostname">Hostname/IP Address *</Label>
                      <Input
                        id="vncHostname"
                        placeholder="192.168.1.100"
                        value={newSessionData.vncHostname}
                        onChange={(e) => setNewSessionData({ ...newSessionData, vncHostname: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="vncPort">Port</Label>
                      <Input
                        id="vncPort"
                        placeholder="5900"
                        value={newSessionData.vncPort}
                        onChange={(e) => setNewSessionData({ ...newSessionData, vncPort: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vncPassword">VNC Password (Optional)</Label>
                    <Input
                      id="vncPassword"
                      type="password"
                      placeholder="••••••••"
                      value={newSessionData.vncPassword}
                      onChange={(e) => setNewSessionData({ ...newSessionData, vncPassword: e.target.value })}
                    />
                  </div>
                </>
              )}

              {newSessionType === "screen_share" && (
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm">
                    For web-based screen sharing, send the user to: <br />
                    <span className="font-mono font-semibold">{supportUrl}</span>
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Additional information about this session..."
                  value={newSessionData.notes}
                  onChange={(e) => setNewSessionData({ ...newSessionData, notes: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setNewSessionDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateSession}>
                  Create Session
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default RemoteSupport;
