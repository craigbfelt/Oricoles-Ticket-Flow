import { useState, useEffect, useRef, useMemo } from "react";
import { MessageSquare, Send, Users, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import DashboardLayout from "@/components/DashboardLayout";

interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  role: string | null;
}

interface ChatMessage {
  id: string;
  room_id: string;
  sender_id: string;
  message: string;
  created_at: string;
  updated_at: string;
  is_edited: boolean | null;
  is_deleted: boolean | null;
  sender?: Profile;
}

interface ChatRoom {
  id: string;
  room_type: string;
  room_name: string | null;
}

const Chat = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [currentUser, setCurrentUser] = useState<{ id: string } | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [broadcastRoom, setBroadcastRoom] = useState<ChatRoom | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    initializeChat();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (selectedRoom) {
      fetchMessages(selectedRoom.id);
      const cleanup = subscribeToRoom(selectedRoom.id);
      return cleanup;
    }
    // fetchMessages is not included in deps to avoid re-fetching on every render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRoom]);

  const initializeChat = async () => {
    // Check if Supabase is configured
    if (!isSupabaseConfigured) {
      toast({
        title: "Supabase Not Configured",
        description: "Please configure your Supabase credentials in the .env file. See .env.example for details.",
        variant: "destructive",
      });
      return;
    }

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    setCurrentUser(user);

    // Fetch all staff profiles
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

    // Fetch broadcast room
    const { data: broadcastData, error: broadcastError } = await supabase
      .from("staff_chat_rooms")
      .select("*")
      .eq("room_type", "broadcast")
      .single();

    if (broadcastError) {
      toast({
        title: "Error loading broadcast room",
        description: broadcastError.message,
        variant: "destructive",
      });
    } else {
      setBroadcastRoom(broadcastData);
      setSelectedRoom(broadcastData);
    }
  };

  const fetchMessages = async (roomId: string) => {
    const { data, error } = await supabase
      .from("staff_chat_messages")
      .select(
        `
        id,
        room_id,
        sender_id,
        message,
        created_at,
        updated_at,
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

    setMessages(data || []);
  };

  const subscribeToRoom = (roomId: string) => {
    const channel = supabase
      .channel(`room:${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "staff_chat_messages",
          filter: `room_id=eq.${roomId}`,
        },
        async (payload) => {
          // Fetch the sender profile for the new message
          const { data: senderData } = await supabase
            .from("profiles")
            .select("*")
            .eq("user_id", payload.new.sender_id)
            .single();

          const newMsg = {
            ...payload.new,
            sender: senderData,
          } as ChatMessage;

          setMessages((prev) => [...prev, newMsg]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const openDirectChat = async (user: Profile) => {
    if (!currentUser) return;

    setSelectedUser(user);

    // Get or create direct chat room
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

    // Fetch the room details
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

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedRoom || !currentUser) return;

    const { error } = await supabase.from("staff_chat_messages").insert([
      {
        room_id: selectedRoom.id,
        sender_id: currentUser.id,
        message: newMessage.trim(),
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

    setNewMessage("");
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

  const filteredProfiles = useMemo(() => {
    return profiles.filter((profile) => {
      const searchLower = searchQuery.toLowerCase();
      const fullName = profile.full_name?.toLowerCase() || "";
      const email = profile.email?.toLowerCase() || "";
      const role = profile.role?.toLowerCase() || "";
      return fullName.includes(searchLower) || email.includes(searchLower) || role.includes(searchLower);
    });
  }, [profiles, searchQuery]);

  return (
    <DashboardLayout>
      <div className="p-8 h-full">
        <Card className="h-full flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-xl flex items-center gap-2">
              <MessageSquare className="h-6 w-6" />
              IT Support Staff Chat
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex p-0 overflow-hidden">
            <div className="w-64 border-r flex flex-col">
              <Tabs defaultValue="broadcast" className="flex-1 flex flex-col">
                <TabsList className="mx-4 mt-4">
                  <TabsTrigger value="broadcast" className="flex-1">
                    Broadcast
                  </TabsTrigger>
                  <TabsTrigger value="direct" className="flex-1">
                    Direct
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="broadcast" className="flex-1 mt-0">
                  <ScrollArea className="h-full">
                    <div className="p-4">
                      <Button
                        variant="ghost"
                        className="w-full justify-start"
                        onClick={selectBroadcast}
                      >
                        <Users className="mr-2 h-4 w-4" />
                        Company Wide - IT Support
                      </Button>
                    </div>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="direct" className="flex-1 mt-0 flex flex-col">
                  <div className="p-4 pb-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search users..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9"
                        aria-label="Search users"
                      />
                    </div>
                  </div>
                  <ScrollArea className="flex-1">
                    <div className="px-4 pb-4 space-y-2">
                      {filteredProfiles.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          No users found
                        </p>
                      ) : (
                        filteredProfiles.map((profile) => (
                        <Button
                          key={profile.id}
                          variant="ghost"
                          className="w-full justify-start"
                          onClick={() => openDirectChat(profile)}
                        >
                          <Avatar className="h-8 w-8 mr-2">
                            <AvatarFallback>
                              {getInitials(profile.full_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 text-left">
                            <p className="text-sm font-medium">
                              {profile.full_name || profile.email}
                            </p>
                            {profile.role && (
                              <p className="text-xs text-muted-foreground">
                                {profile.role}
                              </p>
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
                  <div className="p-4 border-b">
                    <h3 className="font-semibold">
                      {selectedRoom.room_type === "broadcast"
                        ? selectedRoom.room_name || "Company Wide"
                        : selectedUser
                        ? selectedUser.full_name || selectedUser.email
                        : "Select a user"}
                    </h3>
                    {selectedUser && selectedUser.role && (
                      <p className="text-sm text-muted-foreground">{selectedUser.role}</p>
                    )}
                  </div>

                  <ScrollArea className="flex-1 p-4" ref={scrollRef}>
                    <div className="space-y-4">
                      {messages.map((msg) => {
                        const isOwnMessage = msg.sender_id === currentUser?.id;
                        return (
                          <div
                            key={msg.id}
                            className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}
                          >
                            <div
                              className={`max-w-[70%] rounded-lg px-4 py-2 ${
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

                  <div className="p-4">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Type your message..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                      />
                      <Button onClick={handleSendMessage} size="icon">
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-muted-foreground">
                  Select a chat to start messaging
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Chat;
