import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { useToast } from "@/hooks/use-toast";
import { Monitor, Video, Phone, Eye, Copy, Check } from "lucide-react";
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

    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .in("role", ["admin", "support_staff"])
      .maybeSingle();

    if (!data) {
      toast({
        title: "Access Denied",
        description: "You must be an admin or support staff to access this page",
        variant: "destructive",
      });
      navigate("/dashboard");
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

  const columns: Column<RemoteSession>[] = [
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
              Remote Support
            </h1>
            <p className="text-muted-foreground">Manage remote assistance sessions</p>
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

        {loading ? (
          <p>Loading sessions...</p>
        ) : (
          <DataTable
            data={sessions}
            columns={columns}
            searchKeys={["session_code", "user_name", "user_email"]}
          />
        )}

        <Dialog open={viewerOpen} onOpenChange={setViewerOpen}>
          <DialogContent className="max-w-5xl">
            <DialogHeader>
              <DialogTitle>Remote Screen Viewer</DialogTitle>
              <DialogDescription>
                Viewing {selectedSession?.user_name}'s screen
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              {selectedSession && (
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
              )}

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
                    <p className="text-sm mt-2">
                      The user needs to click "Share Screen" on their end
                    </p>
                  </div>
                )}
              </div>

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
      </div>
    </DashboardLayout>
  );
};

export default RemoteSupport;
