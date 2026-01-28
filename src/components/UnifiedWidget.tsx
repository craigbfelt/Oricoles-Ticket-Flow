import { useState, useEffect, useRef } from "react";
import { MessageCircle, Sparkles, MessageSquare, X, Send, Minimize2, Users, Search, Mic, MicOff, Volume2, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/contexts/PermissionsContext";
import { toast as sonnerToast } from "sonner";
import { chatMessageSchema } from "@/lib/validations";
import { FileText, Network, Ticket, LucideIcon } from "lucide-react";

// Type definitions for Web Speech API
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognition;
    webkitSpeechRecognition?: new () => SpeechRecognition;
  }
}

// Copilot Types
interface CopilotTask {
  id: string;
  prompt: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  progress: number;
  action?: string;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  response?: string;
}

interface CopilotAction {
  name: string;
  keywords: string[];
  requiredPermission: string;
  icon: LucideIcon;
  execute: (prompt: string) => Promise<{ success: boolean; message: string }>;
}

// Chat Types
interface ChatMessage {
  id: string;
  user_name: string;
  message: string;
  is_support_reply: boolean;
  created_at: string;
}

// Staff Chat Types
interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  role: string | null;
}

interface StaffChatMessage {
  id: string;
  room_id: string;
  sender_id: string;
  message: string;
  created_at: string;
  is_edited: boolean | null;
  is_deleted: boolean | null;
  sender?: Profile;
}

interface ChatRoom {
  id: string;
  room_type: string;
  room_name: string | null;
}

export const UnifiedWidget = () => {
  const [isMinimized, setIsMinimized] = useState(true);
  const [activeTab, setActiveTab] = useState<"copilot" | "support" | "staff">("copilot");
  
  // Copilot state
  const [copilotPrompt, setCopilotPrompt] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentTask, setCurrentTask] = useState<CopilotTask | null>(null);
  const [taskHistory, setTaskHistory] = useState<CopilotTask[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const { permissions, isAdmin, hasPermission } = usePermissions();

  // Support Chat state
  const [supportMessages, setSupportMessages] = useState<ChatMessage[]>([]);
  const [supportNewMessage, setSupportNewMessage] = useState("");
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [isNameSet, setIsNameSet] = useState(false);

  // Staff Chat state
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [currentUser, setCurrentUser] = useState<{ id: string } | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [staffMessages, setStaffMessages] = useState<StaffChatMessage[]>([]);
  const [staffNewMessage, setStaffNewMessage] = useState("");
  const [broadcastRoom, setBroadcastRoom] = useState<ChatRoom | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const supportScrollRef = useRef<HTMLDivElement>(null);
  const staffScrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Copilot Actions
  const actions: CopilotAction[] = [
    {
      name: "Import Document",
      keywords: ["import document", "upload document", "import file", "add document"],
      requiredPermission: "document_hub",
      icon: FileText,
      execute: async (prompt: string) => {
        return { 
          success: true, 
          message: "Document import dialog opened. Please select a file to import." 
        };
      }
    },
    {
      name: "Convert Document",
      keywords: ["convert document", "transform document", "convert file"],
      requiredPermission: "document_hub",
      icon: FileText,
      execute: async (prompt: string) => {
        return { 
          success: true, 
          message: "Document conversion initiated. Processing your file..." 
        };
      }
    },
    {
      name: "Import CSV Users",
      keywords: ["import users", "import csv", "add users", "user import"],
      requiredPermission: "users_management",
      icon: Users,
      execute: async (prompt: string) => {
        return { 
          success: true, 
          message: "CSV user import dialog opened. Please select a CSV file." 
        };
      }
    },
    {
      name: "Import Network Data",
      keywords: ["import network", "network diagram", "import topology"],
      requiredPermission: "network_diagrams",
      icon: Network,
      execute: async (prompt: string) => {
        return { 
          success: true, 
          message: "Network data import initiated. Processing network information..." 
        };
      }
    },
    {
      name: "Create Ticket",
      keywords: ["create ticket", "new ticket", "open ticket", "ticket"],
      requiredPermission: "create_tickets",
      icon: Ticket,
      execute: async (prompt: string) => {
        return { 
          success: true, 
          message: "Ticket creation form opened. Please fill in the ticket details." 
        };
      }
    }
  ];

  // Initialize speech recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      setSpeechSupported(true);
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = Array.from(event.results)
          .map((result) => result[0].transcript)
          .join('');
        setCopilotPrompt(transcript);
      };

      recognitionRef.current.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        if (event.error === 'not-allowed') {
          sonnerToast.error("Microphone access denied", {
            description: "Please allow microphone access to use voice input"
          });
        }
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  // Initialize chats when widget is opened
  useEffect(() => {
    if (!isMinimized) {
      if (activeTab === "support") {
        fetchSupportMessages();
        const cleanup = subscribeToSupportMessages();
        return cleanup;
      } else if (activeTab === "staff") {
        initializeStaffChat();
      }
    }
  }, [isMinimized, activeTab]);

  // Auto-scroll support chat
  useEffect(() => {
    if (supportScrollRef.current) {
      supportScrollRef.current.scrollTop = supportScrollRef.current.scrollHeight;
    }
  }, [supportMessages]);

  // Auto-scroll staff chat
  useEffect(() => {
    if (staffScrollRef.current) {
      staffScrollRef.current.scrollTop = staffScrollRef.current.scrollHeight;
    }
  }, [staffMessages]);

  // Subscribe to staff room messages
  useEffect(() => {
    if (selectedRoom && activeTab === "staff") {
      fetchStaffMessages(selectedRoom.id);
      const cleanup = subscribeToStaffRoom(selectedRoom.id);
      return cleanup;
    }
  }, [selectedRoom, activeTab]);

  // Copilot task progress simulation
  useEffect(() => {
    if (currentTask && currentTask.status === 'in_progress') {
      const interval = setInterval(() => {
        setCurrentTask(prev => {
          if (!prev || prev.progress >= 100) {
            clearInterval(interval);
            return prev;
          }
          
          const newProgress = Math.min(prev.progress + 10, 100);
          const updatedTask: CopilotTask = {
            ...prev,
            progress: newProgress,
            status: newProgress >= 100 ? 'completed' : prev.status,
            completedAt: newProgress >= 100 ? new Date().toISOString() : prev.completedAt
          };

          if (newProgress >= 100) {
            sonnerToast.success("Copilot task completed!", {
              description: updatedTask.response || "Task processed successfully"
            });
            setTaskHistory(prev => [updatedTask, ...prev.slice(0, 4)]);
          }

          return updatedTask;
        });
      }, 500);

      return () => clearInterval(interval);
    }
  }, [currentTask?.status, currentTask?.progress]);

  // Copilot Functions
  const toggleVoiceInput = () => {
    if (!speechSupported || !recognitionRef.current) {
      sonnerToast.error("Voice input not supported", {
        description: "Your browser doesn't support speech recognition"
      });
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
        sonnerToast.info("Listening...", {
          description: "Speak your command clearly"
        });
      } catch (error) {
        console.error('Failed to start speech recognition:', error);
        sonnerToast.error("Failed to start voice input");
      }
    }
  };

  const findMatchingAction = (prompt: string): CopilotAction | null => {
    const lowerPrompt = prompt.toLowerCase();
    
    for (const action of actions) {
      for (const keyword of action.keywords) {
        if (lowerPrompt.includes(keyword)) {
          return action;
        }
      }
    }
    
    return null;
  };

  const checkPermissionForAction = (action: CopilotAction): boolean => {
    if (isAdmin) return true;
    return hasPermission(action.requiredPermission as keyof typeof permissions);
  };

  const handleCopilotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!copilotPrompt.trim()) {
      sonnerToast.error("Please enter a command");
      return;
    }

    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }

    setIsSubmitting(true);

    const matchingAction = findMatchingAction(copilotPrompt);
    
    if (!matchingAction) {
      sonnerToast.error("Command not recognized", {
        description: "Please try rephrasing your command or use supported actions like 'import document', 'create ticket', etc."
      });
      setIsSubmitting(false);
      return;
    }

    if (!checkPermissionForAction(matchingAction)) {
      sonnerToast.error("Permission denied", {
        description: `You don't have permission to ${matchingAction.name.toLowerCase()}. Contact your administrator.`
      });
      setIsSubmitting(false);
      return;
    }

    const newTask: CopilotTask = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      prompt: copilotPrompt,
      action: matchingAction.name,
      status: 'in_progress',
      progress: 0,
      startedAt: new Date().toISOString()
    };

    setCurrentTask(newTask);
    
    try {
      const result = await matchingAction.execute(copilotPrompt);
      newTask.response = result.message;
      
      if (!result.success) {
        newTask.status = 'failed';
        newTask.error = result.message;
        sonnerToast.error("Task failed", { description: result.message });
      }
    } catch (error) {
      console.error("Error executing action:", error);
      newTask.status = 'failed';
      newTask.error = error instanceof Error ? error.message : "Unknown error occurred";
      sonnerToast.error("Task failed", { description: newTask.error });
    }

    setCopilotPrompt("");
    setIsSubmitting(false);

    sonnerToast.info("Copilot processing", {
      description: `Executing: ${matchingAction.name}`
    });
  };

  const getAvailableActions = () => {
    return actions.filter(action => checkPermissionForAction(action));
  };

  const getStatusIcon = (status: CopilotTask['status']) => {
    switch (status) {
      case 'pending':
        return <AlertCircle className="h-4 w-4" />;
      case 'in_progress':
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
    }
  };

  // Support Chat Functions
  const fetchSupportMessages = async () => {
    const { data, error } = await supabase
      .from("chat_messages")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      toast({
        title: "Error loading messages",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    setSupportMessages(data || []);
  };

  const subscribeToSupportMessages = () => {
    const channel = supabase
      .channel("chat-messages")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
        },
        (payload) => {
          setSupportMessages((prev) => [...prev, payload.new as ChatMessage]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleSetName = () => {
    if (!userName.trim()) return;

    const validationResult = chatMessageSchema.pick({ user_name: true, user_email: true }).safeParse({
      user_name: userName,
      user_email: userEmail || null,
    });

    if (!validationResult.success) {
      const errors = validationResult.error.errors.map(err => err.message).join(", ");
      toast({
        title: "Validation Error",
        description: errors,
        variant: "destructive",
      });
      return;
    }

    setIsNameSet(true);
  };

  const handleSendSupportMessage = async () => {
    if (!supportNewMessage.trim()) return;

    const messageData = {
      user_name: userName,
      user_email: userEmail || null,
      message: supportNewMessage,
      is_support_reply: false,
    };

    const validationResult = chatMessageSchema.safeParse(messageData);
    if (!validationResult.success) {
      const errors = validationResult.error.errors.map(err => err.message).join(", ");
      toast({
        title: "Validation Error",
        description: errors,
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase.from("chat_messages").insert([{
      user_name: validationResult.data.user_name,
      user_email: validationResult.data.user_email,
      message: validationResult.data.message,
      is_support_reply: validationResult.data.is_support_reply ?? false,
    }]);

    if (error) {
      toast({
        title: "Error sending message",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    setSupportNewMessage("");
  };

  // Staff Chat Functions
  const initializeStaffChat = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    setCurrentUser(user);

    const { data: profilesData, error: profilesError } = await supabase
      .from("profiles")
      .select("*")
      .neq("user_id", user.id)
      .order("full_name");

    if (profilesError) {
      toast({
        title: "Error loading staff",
        description: profilesError.message,
        variant: "destructive",
      });
      return;
    }

    setProfiles(profilesData || []);

    const { data: broadcastData, error: broadcastError } = await supabase
      .from("staff_chat_rooms")
      .select("*")
      .eq("room_type", "broadcast")
      .single();

    if (broadcastError) {
      console.error("Error loading broadcast room:", broadcastError);
    } else {
      setBroadcastRoom(broadcastData);
      setSelectedRoom(broadcastData);
    }
  };

  const fetchStaffMessages = async (roomId: string) => {
    const { data, error } = await supabase
      .from("staff_chat_messages")
      .select(
        `
        id,
        room_id,
        sender_id,
        message,
        created_at,
        is_edited,
        is_deleted,
        sender:profiles!staff_chat_messages_sender_id_fkey(*)
      `
      )
      .eq("room_id", roomId)
      .eq("is_deleted", false)
      .order("created_at", { ascending: true });

    if (error) {
      toast({
        title: "Error loading messages",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    setStaffMessages(data || []);
  };

  const subscribeToStaffRoom = (roomId: string) => {
    const channel = supabase
      .channel(`room-${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "staff_chat_messages",
          filter: `room_id=eq.${roomId}`,
        },
        async (payload) => {
          const { data: senderData } = await supabase
            .from("profiles")
            .select("*")
            .eq("user_id", payload.new.sender_id)
            .single();

          const newMsg = {
            ...payload.new,
            sender: senderData,
          } as StaffChatMessage;

          setStaffMessages((prev) => [...prev, newMsg]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const selectUser = async (user: Profile) => {
    if (!currentUser) return;

    setSelectedUser(user);

    const { data, error } = await supabase.rpc("get_or_create_direct_chat_room", {
      user_id_1: currentUser.id,
      user_id_2: user.user_id,
    });

    if (error) {
      toast({
        title: "Error opening chat",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    const { data: roomData, error: roomError } = await supabase
      .from("staff_chat_rooms")
      .select("*")
      .eq("id", data)
      .single();

    if (roomError) {
      toast({
        title: "Error loading chat room",
        description: roomError.message,
        variant: "destructive",
      });
      return;
    }

    setSelectedRoom(roomData);
  };

  const selectBroadcast = () => {
    if (broadcastRoom) {
      setSelectedRoom(broadcastRoom);
      setSelectedUser(null);
    }
  };

  const handleSendStaffMessage = async () => {
    if (!staffNewMessage.trim() || !selectedRoom || !currentUser) return;

    const { error } = await supabase.from("staff_chat_messages").insert([
      {
        room_id: selectedRoom.id,
        sender_id: currentUser.id,
        message: staffNewMessage.trim(),
      },
    ]);

    if (error) {
      toast({
        title: "Error sending message",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    setStaffNewMessage("");
  };

  const getInitials = (name: string | null) => {
    if (!name) return "??";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const filteredProfiles = profiles.filter((profile) => {
    const searchLower = searchQuery.toLowerCase();
    const fullName = profile.full_name?.toLowerCase() || "";
    const email = profile.email?.toLowerCase() || "";
    const role = profile.role?.toLowerCase() || "";
    return fullName.includes(searchLower) || email.includes(searchLower) || role.includes(searchLower);
  });

  return (
    <div className="fixed bottom-6 right-6 z-40">
      {isMinimized ? (
        <Button
          onClick={() => setIsMinimized(false)}
          className="h-14 w-14 rounded-full shadow-lg bg-primary hover:bg-primary/90"
          size="icon"
        >
          <Sparkles className="h-6 w-6" />
        </Button>
      ) : (
        <Card className="w-[420px] h-[600px] shadow-2xl border-2 border-primary/20 flex flex-col">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Assistant Hub
                {isAdmin && <Badge variant="secondary" className="text-xs">Admin</Badge>}
              </CardTitle>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setIsMinimized(true)}
                >
                  <Minimize2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setIsMinimized(true)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <CardDescription className="text-xs">
              AI assistance, support chat, and team communication
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="flex-1 flex flex-col">
              <TabsList className="grid w-full grid-cols-3 mx-4">
                <TabsTrigger value="copilot" className="text-xs">
                  <Sparkles className="h-3 w-3 mr-1" />
                  AI Copilot
                </TabsTrigger>
                <TabsTrigger value="support" className="text-xs">
                  <MessageCircle className="h-3 w-3 mr-1" />
                  Support
                </TabsTrigger>
                <TabsTrigger value="staff" className="text-xs">
                  <MessageSquare className="h-3 w-3 mr-1" />
                  Staff Chat
                </TabsTrigger>
              </TabsList>

              {/* AI Copilot Tab */}
              <TabsContent value="copilot" className="flex-1 flex flex-col mt-0 p-4 overflow-hidden">
                <div className="flex-1 flex flex-col overflow-hidden space-y-3">
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">Available Actions:</p>
                    <div className="flex flex-wrap gap-1">
                      {getAvailableActions().map((action) => (
                        <Badge 
                          key={action.name} 
                          variant="outline" 
                          className="text-xs cursor-pointer hover:bg-accent"
                          onClick={() => setCopilotPrompt(action.keywords[0])}
                        >
                          <action.icon className="h-3 w-3 mr-1" />
                          {action.name}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <form onSubmit={handleCopilotSubmit} className="space-y-3">
                    <div className="relative">
                      <Textarea
                        value={copilotPrompt}
                        onChange={(e) => setCopilotPrompt(e.target.value)}
                        placeholder="Tell me what to do... (e.g., 'import document')"
                        rows={3}
                        disabled={isSubmitting || (currentTask?.status === 'in_progress')}
                        className="pr-12 text-sm resize-none"
                      />
                      {speechSupported && (
                        <Button
                          type="button"
                          size="sm"
                          variant={isListening ? "destructive" : "ghost"}
                          className="absolute right-2 top-2 h-7 w-7"
                          onClick={toggleVoiceInput}
                          disabled={isSubmitting || (currentTask?.status === 'in_progress')}
                        >
                          {isListening ? <MicOff className="h-3 w-3" /> : <Mic className="h-3 w-3" />}
                        </Button>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {isListening && (
                          <Badge variant="destructive" className="animate-pulse text-xs">
                            <Volume2 className="h-3 w-3 mr-1" />
                            Listening
                          </Badge>
                        )}
                      </div>
                      <Button 
                        type="submit" 
                        size="sm"
                        disabled={isSubmitting || !copilotPrompt.trim() || (currentTask?.status === 'in_progress')}
                      >
                        {isSubmitting ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                      </Button>
                    </div>

                    {currentTask && currentTask.status === 'in_progress' && (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">{currentTask.action}</span>
                          <span className="font-medium">{currentTask.progress}%</span>
                        </div>
                        <Progress value={currentTask.progress} className="h-1" />
                      </div>
                    )}

                    {currentTask && currentTask.status === 'completed' && currentTask.response && (
                      <Alert className="py-2">
                        <CheckCircle className="h-3 w-3 text-green-500" />
                        <AlertDescription className="text-xs">{currentTask.response}</AlertDescription>
                      </Alert>
                    )}

                    {currentTask && currentTask.status === 'failed' && currentTask.error && (
                      <Alert variant="destructive" className="py-2">
                        <AlertCircle className="h-3 w-3" />
                        <AlertDescription className="text-xs">{currentTask.error}</AlertDescription>
                      </Alert>
                    )}
                  </form>

                  {taskHistory.length > 0 && (
                    <div className="space-y-1 pt-2 border-t">
                      <p className="text-xs font-medium text-muted-foreground">Recent:</p>
                      <ScrollArea className="h-32">
                        <div className="space-y-1">
                          {taskHistory.map((task) => (
                            <div
                              key={task.id}
                              className="flex items-center gap-2 p-2 rounded text-xs bg-accent/50"
                            >
                              {getStatusIcon(task.status)}
                              <span className="flex-1 truncate">{task.action || task.prompt}</span>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* Support Chat Tab */}
              <TabsContent value="support" className="flex-1 flex flex-col mt-0 p-4 overflow-hidden">
                {!isNameSet ? (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Please enter your name to start chatting
                    </p>
                    <Input
                      placeholder="Your name"
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && handleSetName()}
                    />
                    <Input
                      placeholder="Email (optional)"
                      type="email"
                      value={userEmail}
                      onChange={(e) => setUserEmail(e.target.value)}
                    />
                    <Button onClick={handleSetName} className="w-full">
                      Start Chat
                    </Button>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col overflow-hidden">
                    <ScrollArea className="flex-1 pr-4" ref={supportScrollRef}>
                      <div className="space-y-4">
                        {supportMessages.map((msg) => (
                          <div
                            key={msg.id}
                            className={`flex ${
                              msg.is_support_reply
                                ? "justify-start"
                                : "justify-end"
                            }`}
                          >
                            <div
                              className={`max-w-[80%] rounded-lg px-4 py-2 ${
                                msg.is_support_reply
                                  ? "bg-muted"
                                  : "bg-primary text-primary-foreground"
                              }`}
                            >
                              <p className="text-xs font-semibold mb-1">
                                {msg.user_name}
                              </p>
                              <p className="text-sm">{msg.message}</p>
                              <p className="text-xs opacity-70 mt-1">
                                {new Date(msg.created_at).toLocaleTimeString()}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>

                    <div className="flex gap-2 mt-4">
                      <Input
                        placeholder="Type your message..."
                        value={supportNewMessage}
                        onChange={(e) => setSupportNewMessage(e.target.value)}
                        onKeyPress={(e) => e.key === "Enter" && handleSendSupportMessage()}
                      />
                      <Button onClick={handleSendSupportMessage} size="icon">
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* Staff Chat Tab */}
              <TabsContent value="staff" className="flex-1 flex mt-0 overflow-hidden">
                <div className="w-48 border-r flex flex-col">
                  <Tabs defaultValue="broadcast" className="flex-1 flex flex-col">
                    <TabsList className="grid w-full grid-cols-2 mx-2 mt-2">
                      <TabsTrigger value="broadcast" className="text-xs">Broadcast</TabsTrigger>
                      <TabsTrigger value="direct" className="text-xs">Direct</TabsTrigger>
                    </TabsList>
                    <TabsContent value="broadcast" className="flex-1 mt-0">
                      <ScrollArea className="h-[450px]">
                        <div className="p-2 space-y-2">
                          <Button
                            variant={selectedRoom?.room_type === "broadcast" ? "secondary" : "ghost"}
                            className="w-full justify-start text-xs"
                            onClick={selectBroadcast}
                            size="sm"
                          >
                            <Users className="mr-2 h-3 w-3" />
                            Company Wide
                          </Button>
                        </div>
                      </ScrollArea>
                    </TabsContent>
                    <TabsContent value="direct" className="flex-1 mt-0 flex flex-col">
                      <div className="px-2 pt-2 pb-2">
                        <div className="relative">
                          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                          <Input
                            placeholder="Search..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-7 text-xs h-8"
                            aria-label="Search users"
                          />
                        </div>
                      </div>
                      <ScrollArea className="h-[400px]">
                        <div className="px-2 pb-2 space-y-1">
                          {filteredProfiles.length === 0 ? (
                            <p className="text-xs text-muted-foreground text-center py-4">
                              {searchQuery ? "No users found" : "No users available"}
                            </p>
                          ) : (
                            filteredProfiles.map((profile) => (
                            <Button
                              key={profile.id}
                              variant={selectedUser?.id === profile.id ? "secondary" : "ghost"}
                              className="w-full justify-start text-xs h-auto py-2"
                              onClick={() => selectUser(profile)}
                              size="sm"
                            >
                              <Avatar className="h-5 w-5 mr-2">
                                <AvatarFallback className="text-xs">
                                  {getInitials(profile.full_name)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 text-left truncate">
                                <div className="text-xs font-medium truncate">
                                  {profile.full_name || profile.email}
                                </div>
                                {profile.role && (
                                  <div className="text-[10px] text-muted-foreground truncate">
                                    {profile.role}
                                  </div>
                                )}
                              </div>
                            </Button>
                            ))
                          )}
                        </div>
                      </ScrollArea>
                    </TabsContent>
                  </Tabs>
                </div>

                <div className="flex-1 flex flex-col">
                  {selectedRoom ? (
                    <>
                      <div className="p-3 border-b">
                        <h3 className="text-sm font-semibold">
                          {selectedRoom.room_type === "broadcast"
                            ? selectedRoom.room_name || "Company Wide"
                            : selectedUser
                            ? selectedUser.full_name || selectedUser.email
                            : "Select a user"}
                        </h3>
                        {selectedUser && selectedUser.role && (
                          <p className="text-xs text-muted-foreground">{selectedUser.role}</p>
                        )}
                      </div>

                      <ScrollArea className="flex-1 p-3" ref={staffScrollRef}>
                        <div className="space-y-3">
                          {staffMessages.map((msg) => {
                            const isOwnMessage = msg.sender_id === currentUser?.id;
                            return (
                              <div
                                key={msg.id}
                                className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}
                              >
                                <div
                                  className={`max-w-[70%] rounded-lg px-3 py-2 ${
                                    isOwnMessage
                                      ? "bg-primary text-primary-foreground"
                                      : "bg-muted"
                                  }`}
                                >
                                  {!isOwnMessage && (
                                    <p className="text-xs font-semibold mb-1">
                                      {msg.sender?.full_name || msg.sender?.email || "Unknown"}
                                    </p>
                                  )}
                                  <p className="text-sm break-words">{msg.message}</p>
                                  <p className="text-xs opacity-70 mt-1">
                                    {new Date(msg.created_at).toLocaleTimeString([], {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </ScrollArea>

                      <Separator />

                      <div className="p-3">
                        <div className="flex gap-2">
                          <Input
                            placeholder="Type your message..."
                            value={staffNewMessage}
                            onChange={(e) => setStaffNewMessage(e.target.value)}
                            onKeyPress={(e) => e.key === "Enter" && handleSendStaffMessage()}
                            className="text-sm"
                          />
                          <Button onClick={handleSendStaffMessage} size="icon">
                            <Send className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
                      Select a chat to start messaging
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
