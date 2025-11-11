import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Monitor, Video, Phone, Wifi, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import oricolLogo from "@/assets/oricol-logo.png";
import zerobitOneLogo from "@/assets/zerobitone-logo.png";

const RemoteClient = () => {
  const { toast } = useToast();
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [sessionCode, setSessionCode] = useState("");
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // Generate a random session code
    setSessionCode(Math.random().toString(36).substring(2, 8).toUpperCase());
  }, []);

  const getDeviceInfo = () => {
    return {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      screenResolution: `${window.screen.width}x${window.screen.height}`,
      timestamp: new Date().toISOString(),
    };
  };

  const startSession = async () => {
    if (!userName.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter your name",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from("remote_sessions")
        .insert({
          session_code: sessionCode,
          user_name: userName,
          user_email: userEmail || null,
          device_info: getDeviceInfo(),
          status: "pending",
        })
        .select()
        .single();

      if (error) throw error;

      setIsSessionActive(true);
      setConnected(true);
      
      toast({
        title: "Session Created",
        description: `Your session code is: ${sessionCode}`,
      });

      // Auto-prompt for screen share
      setTimeout(() => {
        startScreenShare();
      }, 1000);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create session",
        variant: "destructive",
      });
    }
  };

  const startScreenShare = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: "monitor",
        },
        audio: false,
      });

      setLocalStream(stream);
      setIsSharing(true);

      toast({
        title: "Screen Sharing",
        description: "Your screen is now being shared with support",
      });

      // Handle when user stops sharing
      stream.getVideoTracks()[0].onended = () => {
        stopScreenShare();
      };
    } catch (error: any) {
      toast({
        title: "Screen Share Failed",
        description: error.message || "Could not access screen",
        variant: "destructive",
      });
    }
  };

  const stopScreenShare = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
    setIsSharing(false);

    toast({
      title: "Screen Sharing Stopped",
      description: "Your screen is no longer being shared",
    });
  };

  const endSession = async () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }

    await supabase
      .from("remote_sessions")
      .update({ status: "completed", ended_at: new Date().toISOString() })
      .eq("session_code", sessionCode);

    setIsSessionActive(false);
    setIsSharing(false);
    setConnected(false);
    setLocalStream(null);

    toast({
      title: "Session Ended",
      description: "Thank you for using remote support",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-center gap-4 py-6">
          <img src={oricolLogo} alt="Oricol" className="h-12 w-auto object-contain" />
          <img src={zerobitOneLogo} alt="Zero Bit One" className="h-12 w-auto object-contain" />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Monitor className="w-6 h-6" />
              Remote Support Client
            </CardTitle>
            <CardDescription>
              Connect with our support team for remote assistance
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {!isSessionActive ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Your Name *</Label>
                  <Input
                    id="name"
                    placeholder="Enter your full name"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email (Optional)</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={userEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Session Code</Label>
                  <div className="p-3 bg-muted rounded-md">
                    <span className="font-mono font-bold text-2xl tracking-wider">
                      {sessionCode}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Share this code with the support technician
                  </p>
                </div>

                <Button onClick={startSession} className="w-full" size="lg">
                  <Wifi className="w-5 h-5 mr-2" />
                  Start Support Session
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div className="flex items-center gap-3">
                    {connected ? (
                      <>
                        <Wifi className="w-5 h-5 text-green-500" />
                        <span className="font-medium">Connected</span>
                      </>
                    ) : (
                      <>
                        <WifiOff className="w-5 h-5 text-muted-foreground" />
                        <span className="font-medium">Waiting for support...</span>
                      </>
                    )}
                  </div>
                  <Badge variant="default">Session: {sessionCode}</Badge>
                </div>

                {isSharing && localStream && (
                  <div className="space-y-2">
                    <Label>Your Screen (Preview)</Label>
                    <div className="bg-black rounded-lg aspect-video overflow-hidden">
                      <video
                        autoPlay
                        muted
                        playsInline
                        ref={(video) => {
                          if (video && localStream) {
                            video.srcObject = localStream;
                          }
                        }}
                        className="w-full h-full object-contain"
                      />
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  {!isSharing ? (
                    <Button onClick={startScreenShare} className="flex-1" size="lg">
                      <Video className="w-5 h-5 mr-2" />
                      Share Screen
                    </Button>
                  ) : (
                    <Button onClick={stopScreenShare} variant="secondary" className="flex-1" size="lg">
                      <Video className="w-5 h-5 mr-2" />
                      Stop Sharing
                    </Button>
                  )}
                  
                  <Button onClick={endSession} variant="destructive" size="lg">
                    <Phone className="w-5 h-5 mr-2" />
                    End Session
                  </Button>
                </div>

                <div className="p-4 bg-muted rounded-lg space-y-2 text-sm">
                  <p className="font-medium">Session Information:</p>
                  <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                    <div>User: {userName}</div>
                    <div>Code: {sessionCode}</div>
                    {userEmail && <div className="col-span-2">Email: {userEmail}</div>}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="text-center text-sm text-muted-foreground">
          <p>This is a secure remote support session.</p>
          <p>Your screen sharing will only be visible to support staff during the session.</p>
        </div>
      </div>
    </div>
  );
};

export default RemoteClient;
