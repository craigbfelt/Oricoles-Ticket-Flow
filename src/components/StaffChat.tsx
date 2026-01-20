import { useState, useEffect, useRef } from "react";
import { MessageSquare, X, Send, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";

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
  is_edited: boolean | null;
  is_deleted: boolean | null;
  sender?: Profile;
}

interface ChatRoom {
  id: string;
  room_type: string;
  room_name: string | null;
}

export const StaffChat = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [currentUser, setCurrentUser] = useState<{ id: string } | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [broadcastRoom, setBroadcastRoom] = useState<ChatRoom | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      initializeChat();
    }
    // initializeChat is not included in deps to avoid re-fetching on every render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

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
      console.error("Error loading broadcast room:", broadcastError);
    } else {
      setBroadcastRoom(broadcastData);
      setSelectedRoom(broadcastData); // Default to broadcast
    }
  };

  const fetchMessages = async (roomId: string) => {
    const { data, error } = await supabase
      .from("staff_chat_messages")
      .select(
        `
        *,
        sender:sender_id (
          id,
          user_id,
          full_name,
          email,
          role
        )
      `
      )
      .eq("staff_chat_messages.room_id", roomId)
      .eq("staff_chat_messages.is_deleted", false)
      .order("created_at", { ascending: true });

    if (error) {
      toast({
        title: "Error loading messages",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    // Transform the data to match our interface
    const transformedMessages = data.map((msg: {
      id: string;
      room_id: string;
      sender_id: string;
      message: string;
      created_at: string;
      is_edited: boolean | null;
      is_deleted: boolean | null;
      sender: Profile | Profile[];
    }) => ({
      ...msg,
      sender: Array.isArray(msg.sender) ? msg.sender[0] : msg.sender,
    }));

    setMessages(transformedMessages || []);
  };

  const subscribeToRoom = (roomId: string) => {
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
          // Fetch sender profile
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

  const selectUser = async (user: Profile) => {
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

  return (
    <>
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-20 right-6 h-14 w-14 rounded-full shadow-lg z-50"
          size="icon"
          variant="default"
        >
          <MessageSquare className="h-6 w-6" />
        </Button>
      )}

      {isOpen && (
        <Card className="fixed bottom-6 right-6 w-[800px] h-[600px] shadow-xl z-50 flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              IT Support Staff Chat
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="flex-1 flex p-0 overflow-hidden">
            <div className="w-64 border-r flex flex-col">
              <Tabs defaultValue="broadcast" className="flex-1 flex flex-col">
                <TabsList className="grid w-full grid-cols-2 mx-4 mt-2">
                  <TabsTrigger value="broadcast">Broadcast</TabsTrigger>
                  <TabsTrigger value="direct">Direct</TabsTrigger>
                </TabsList>
                <TabsContent value="broadcast" className="flex-1 mt-0">
                  <ScrollArea className="h-[470px]">
                    <div className="p-4 space-y-2">
                      <Button
                        variant={selectedRoom?.room_type === "broadcast" ? "secondary" : "ghost"}
                        className="w-full justify-start"
                        onClick={selectBroadcast}
                      >
                        <Users className="mr-2 h-4 w-4" />
                        Company Wide
                      </Button>
                    </div>
                  </ScrollArea>
                </TabsContent>
                <TabsContent value="direct" className="flex-1 mt-0">
                  <ScrollArea className="h-[470px]">
                    <div className="p-4 space-y-2">
                      {profiles.map((profile) => (
                        <Button
                          key={profile.id}
                          variant={selectedUser?.id === profile.id ? "secondary" : "ghost"}
                          className="w-full justify-start"
                          onClick={() => selectUser(profile)}
                        >
                          <Avatar className="h-6 w-6 mr-2">
                            <AvatarFallback className="text-xs">
                              {getInitials(profile.full_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 text-left truncate">
                            <div className="text-sm font-medium truncate">
                              {profile.full_name || profile.email}
                            </div>
                            {profile.role && (
                              <div className="text-xs text-muted-foreground truncate">
                                {profile.role}
                              </div>
                            )}
                          </div>
                        </Button>
                      ))}
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
                        onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
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
      )}
    </>
  );
};
