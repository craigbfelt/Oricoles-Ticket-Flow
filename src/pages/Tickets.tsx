import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, CheckCircle, RotateCcw, Edit, Clock, AlertCircle, Ticket, TrendingUp, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FaultTypeSelector } from "@/components/FaultTypeSelector";
import { ticketSchema, ticketUpdateSchema } from "@/lib/validations";

const Tickets = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [tickets, setTickets] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [category, setCategory] = useState("");
  const [branch, setBranch] = useState("");
  const [faultType, setFaultType] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [errorCode, setErrorCode] = useState("");
  const [startJobDialogOpen, setStartJobDialogOpen] = useState(false);
  const [ticketToStart, setTicketToStart] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentProfileId, setCurrentProfileId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [ticketToDelete, setTicketToDelete] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPriority, setEditPriority] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editBranch, setEditBranch] = useState("");
  const [editFaultType, setEditFaultType] = useState("");
  const [editUserEmail, setEditUserEmail] = useState("");
  const [editErrorCode, setEditErrorCode] = useState("");
  const [currentUserEmail, setCurrentUserEmail] = useState("");
  const [currentUserName, setCurrentUserName] = useState("");
  const [isSupportStaff, setIsSupportStaff] = useState(false);
  const [timeLogDialogOpen, setTimeLogDialogOpen] = useState(false);
  const [timeLogMinutes, setTimeLogMinutes] = useState("");
  const [timeLogNotes, setTimeLogNotes] = useState("");
  const [timeLogs, setTimeLogs] = useState<any[]>([]);
  const [closeAfterTimeLog, setCloseAfterTimeLog] = useState(false);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        fetchUserProfile(session.user.id);
      }
    });
  }, [navigate]);

  // Refetch tickets when role states change
  useEffect(() => {
    if (currentProfileId) {
      fetchTickets();
    }
  }, [isAdmin, isSupportStaff, currentProfileId]);

  // Fetch all users when admin status is determined
  useEffect(() => {
    if (isAdmin) {
      fetchAllUsers();
    }
  }, [isAdmin]);

  const fetchUserProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, email, full_name, user_id, branch_id, branches:branch_id(name)")
      .eq("user_id", userId)
      .single();

    // If profile doesn't exist, try to create it
    if (error && error.code === 'PGRST116') {
      console.log("Profile not found, creating profile for user:", userId);
      
      // Get user details from auth
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { error: insertError } = await supabase
          .from("profiles")
          .insert({
            user_id: userId,
            email: user.email,
            full_name: user.user_metadata?.full_name || "",
          });
        
        if (insertError) {
          console.error("Error creating profile:", insertError);
          toast({
            title: "Profile Error",
            description: "Unable to create user profile. Please contact support.",
            variant: "destructive",
          });
          return;
        }
        
        // Retry fetching the profile
        const { data: newData } = await supabase
          .from("profiles")
          .select("id, email, full_name, user_id, branch_id, branches:branch_id(name)")
          .eq("user_id", userId)
          .single();
        
        if (newData) {
          toast({
            title: "Profile Created",
            description: "Your profile has been set up successfully.",
          });
          // Continue with the profile setup below
          setupProfile(newData, userId);
        }
      }
    } else if (data) {
      setupProfile(data, userId);
    } else if (error) {
      console.error("Error fetching profile:", error);
      console.error("Error details:", {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });
      toast({
        title: "Error",
        description: `Unable to load user profile: ${error.message}. Please try refreshing the page.`,
        variant: "destructive",
      });
    }
  };

  const setupProfile = async (data: any, userId: string) => {
    // Store both profile.id (for ticket references) and user_id (for auth checks)
    setCurrentProfileId(data.id); // Profile ID for foreign key references
    setCurrentUserId(userId); // Auth user ID for role checks
    setCurrentUserEmail(data.email || "");
    setCurrentUserName(data.full_name || "");

    // Auto-fill user email and branch in ticket form for regular users
    setUserEmail(data.email || "");
    
    // Prepopulate branch if available
    if (data.branches && data.branches.name) {
      setBranch(data.branches.name);
    }

    await checkAdminRole(userId);
    await checkSupportRole(userId);
    // Tickets will be fetched by useEffect when roles are set
  };

  const checkAdminRole = async (userId: string) => {
    // Check if user has admin role
    try {
      const { data: roles, error } = await supabase.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin");
      if (error) {
        console.error("Error checking admin role:", error);
        setIsAdmin(false);
        return;
      }
      setIsAdmin(roles && roles.length > 0);
    } catch (err) {
      console.error("Unexpected error checking admin role:", err);
      setIsAdmin(false);
    }
  };

  const checkSupportRole = async (userId: string) => {
    try {
      const { data: roles, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "support_staff");

      if (error) {
        console.error("Error checking support role:", error);
        setIsSupportStaff(false);
        return;
      }
      setIsSupportStaff(roles && roles.length > 0);
    } catch (err) {
      console.error("Unexpected error checking support role:", err);
      setIsSupportStaff(false);
    }
  };

  const fetchAllUsers = async () => {
    try {
      // Fetch all profiles for the dropdown
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("id, user_id, email, full_name, branch_id, branches:branch_id(name)")
        .order("full_name");

      if (error) {
        console.error("Error fetching users:", error);
        return;
      }

      setAllUsers(profiles || []);
    } catch (err) {
      console.error("Error fetching all users:", err);
    }
  };

  const handleUserSelection = (userId: string) => {
    setSelectedUserId(userId);
    if (!userId) {
      // Reset to current user's info if clearing selection
      setUserEmail(currentUserEmail);
      return;
    }
    const selectedUser = allUsers.find(u => u.id === userId);
    if (selectedUser) {
      setUserEmail(selectedUser.email || "");
      if (selectedUser.branches && selectedUser.branches.name) {
        setBranch(selectedUser.branches.name);
      } else {
        setBranch("");
      }
    }
  };

  const handleOpenTicketDialog = () => {
    // Reset form to defaults when opening dialog
    setSelectedUserId("");
    setUserEmail(currentUserEmail);
    setTitle("");
    setDescription("");
    setPriority("medium");
    setCategory("");
    setFaultType("");
    setErrorCode("");
    setOpen(true);
  };

  const fetchTickets = async () => {
    // Admin and support staff see all tickets, regular users see only their own
    let query = supabase.from("tickets").select("*");
    
    if (!isAdmin && !isSupportStaff && currentProfileId) {
      // Regular users only see their own tickets
      query = query.eq("created_by", currentProfileId);
    }
    
    const { data } = await query.order("created_at", { ascending: false });

    setTickets(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentProfileId) {
      toast({
        title: "Error",
        description: "User profile not found",
        variant: "destructive",
      });
      return;
    }

    // Generate title and description from fault type if not provided
    const autoTitle = title || `${faultType} Issue - ${branch}`;
    const autoDescription = description || `User reported ${faultType} issue from ${branch} branch.`;

    // Validate form data
    const formData = {
      title: autoTitle,
      description: autoDescription,
      priority,
      category: faultType, // Use fault type as category
      branch: branch || null,
      fault_type: faultType || null,
      user_email: userEmail || null,
      error_code: null, // No longer collecting this
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

    // Auto-assign to current user if they're support staff
    const assignedTo = isSupportStaff ? currentProfileId : null;

    const { data: ticketData, error } = await supabase
      .from("tickets")
      .insert([
        {
          ...validationResult.data as any,
          created_by: currentProfileId, // Use profile.id for foreign key
          assigned_to: assignedTo, // Use profile.id for foreign key
          status: "open" as any,
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

    // Send email notification if auto-assigned
    if (ticketData && assignedTo && currentUserEmail) {
      try {
        await supabase.functions.invoke("notify-ticket-assignment", {
          body: {
            assigneeEmail: currentUserEmail,
            assigneeName: currentUserName || "Support Staff",
            ticketId: ticketData.id,
            ticketCode: ticketData.ticket_code,
            ticketTitle: autoTitle,
            ticketDescription: autoDescription,
            priority,
            branch,
            faultType,
            userEmail,
          },
        });
      } catch (emailError) {
        console.error("Email notification error:", emailError);
        // Don't fail the ticket creation if email fails
      }
    }

    // Route email to IT support email (existing functionality)
    if (ticketData) {
      try {
        await supabase.functions.invoke("route-ticket-email", {
          body: {
            ticketId: ticketData.id,
            ticketCode: ticketData.ticket_code,
            title: autoTitle,
            description: autoDescription,
            faultType,
            branch,
            userEmail,
            errorCode: null,
            priority,
          },
        });
      } catch (emailError) {
        console.error("Email routing error:", emailError);
      }
    }

    toast({
      title: "Success",
      description: isSupportStaff
        ? "Ticket created and assigned to you. Email notification sent."
        : "Ticket created successfully",
    });

    setOpen(false);
    setTitle("");
    setDescription("");
    setPriority("medium");
    setCategory("");
    setBranch("");
    setFaultType("");
    setUserEmail("");
    setErrorCode("");
    setSelectedUserId("");
    setIsSubmitting(false);
    fetchTickets();
  };

  const handleCloseTicket = async (ticketId: string) => {
    // If support staff, prompt for time logging first
    if (isSupportStaff && selectedTicket?.id === ticketId) {
      setCloseAfterTimeLog(true);
      setTimeLogDialogOpen(true);
      return;
    }

    const { error } = await supabase
      .from("tickets")
      .update({ status: "closed" as any, resolved_at: new Date().toISOString() })
      .eq("id", ticketId);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Ticket closed successfully",
      });
      fetchTickets();
      if (selectedTicket?.id === ticketId) {
        setSheetOpen(false);
        setSelectedTicket(null);
      }
    }
  };

  const handleReopenTicket = async (ticketId: string) => {
    const { error } = await supabase
      .from("tickets")
      .update({ status: "open" as any, resolved_at: null })
      .eq("id", ticketId);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Ticket reopened successfully",
      });
      fetchTickets();
      if (selectedTicket?.id === ticketId) {
        const updatedTicket = { ...selectedTicket, status: "open", resolved_at: null };
        setSelectedTicket(updatedTicket);
        setEditStatus("open");
      }
    }
  };

  const handleTicketClick = (ticket: any) => {
    setSelectedTicket(ticket);
    setEditTitle(ticket.title);
    setEditDescription(ticket.description || "");
    setEditPriority(ticket.priority);
    setEditStatus(ticket.status);
    setEditCategory(ticket.category || "");
    setEditBranch(ticket.branch || "");
    setEditFaultType(ticket.fault_type || "");
    setEditUserEmail(ticket.user_email || "");
    setEditErrorCode(ticket.error_code || "");
    setEditMode(false);
    setSheetOpen(true);
    fetchTimeLogs(ticket.id);
  };

  const fetchTimeLogs = async (ticketId: string) => {
    const { data } = await supabase
      .from("ticket_time_logs")
      .select("*")
      .eq("ticket_id", ticketId)
      .order("logged_at", { ascending: false });

    setTimeLogs(data || []);
  };

  const handleLogTime = async () => {
    if (!selectedTicket || !timeLogMinutes || !isSupportStaff) return;

    const minutes = parseInt(timeLogMinutes);
    if (isNaN(minutes) || minutes <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid number of minutes",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase.from("ticket_time_logs").insert({
      ticket_id: selectedTicket.id,
      user_id: currentUserId,
      minutes,
      notes: timeLogNotes || null,
    });

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    // Update ticket's total time
    const newTotalTime = (selectedTicket.time_spent_minutes || 0) + minutes;
    await supabase.from("tickets").update({ time_spent_minutes: newTotalTime }).eq("id", selectedTicket.id);

    // If closing ticket after time log, close it now
    if (closeAfterTimeLog) {
      await supabase
        .from("tickets")
        .update({ status: "closed" as any, resolved_at: new Date().toISOString() })
        .eq("id", selectedTicket.id);
      
      toast({
        title: "Success",
        description: `Logged ${minutes} minutes and closed ticket`,
      });
      
      setSheetOpen(false);
      setSelectedTicket(null);
    } else {
      toast({
        title: "Success",
        description: `Logged ${minutes} minutes`,
      });
      
      // Update selected ticket
      const updatedTicket = { ...selectedTicket, time_spent_minutes: newTotalTime };
      setSelectedTicket(updatedTicket);
    }

    setTimeLogDialogOpen(false);
    setTimeLogMinutes("");
    setTimeLogNotes("");
    setCloseAfterTimeLog(false);
    fetchTimeLogs(selectedTicket.id);
    fetchTickets();
  };

  const handleSendReminders = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("send-ticket-reminders");

      if (error) throw error;

      toast({
        title: "Reminders Sent",
        description: `Sent ${data?.remindersSent || 0} reminder(s) for open tickets`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  };

  const getTimeElapsed = (createdAt: string) => {
    const now = new Date();
    const created = new Date(createdAt);
    const diffMs = now.getTime() - created.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    
    if (diffHours === 0) return `${mins}m`;
    if (mins === 0) return `${diffHours}h`;
    return `${diffHours}h ${mins}m`;
  };

  const isOverdue = (requiredBy: string | null) => {
    if (!requiredBy) return false;
    return new Date() > new Date(requiredBy);
  };

  const isTimeLogFormValid = () => {
    if (!timeLogMinutes) return false;
    if (closeAfterTimeLog && !timeLogNotes) return false;
    return true;
  };

  const handleSaveChanges = async () => {
    if (!selectedTicket) return;

    // Validate update data
    const updateData = {
      title: editTitle,
      description: editDescription,
      priority: editPriority,
      status: editStatus,
      category: editCategory || null,
      branch: editBranch || null,
      fault_type: editFaultType || null,
      user_email: editUserEmail || null,
      error_code: editErrorCode || null,
    };

    const validationResult = ticketUpdateSchema.safeParse(updateData);
    if (!validationResult.success) {
      const errors = validationResult.error.errors.map(err => err.message).join(", ");
      toast({
        title: "Validation Error",
        description: errors,
        variant: "destructive",
      });
      return;
    }

    const updates: any = {
      ...validationResult.data,
    };

    if (editStatus === "closed" && selectedTicket.status !== "closed") {
      updates.resolved_at = new Date().toISOString();
    } else if (editStatus !== "closed" && selectedTicket.status === "closed") {
      updates.resolved_at = null;
    }

    const { error } = await supabase.from("tickets").update(updates).eq("id", selectedTicket.id);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Ticket updated successfully",
      });
      fetchTickets();
      setEditMode(false);
      setSheetOpen(false);
      setSelectedTicket(null);
    }
  };

  const handleDeleteTicket = async () => {
    if (!ticketToDelete) return;

    const { error } = await supabase.from("tickets").delete().eq("id", ticketToDelete);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Ticket deleted successfully",
      });
      fetchTickets();
    }
    setDeleteDialogOpen(false);
    setTicketToDelete(null);
  };

  const handleStartJob = async () => {
    if (!ticketToStart) return;

    const { error } = await supabase
      .from("tickets")
      .update({
        started_at: new Date().toISOString(),
        status: "in_progress" as any,
      })
      .eq("id", ticketToStart);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Job Started",
        description: "Ticket status updated to In Progress",
      });
      fetchTickets();
      if (selectedTicket?.id === ticketToStart) {
        const updatedTicket = {
          ...selectedTicket,
          started_at: new Date().toISOString(),
          status: "in_progress",
        };
        setSelectedTicket(updatedTicket);
      }
    }
    setStartJobDialogOpen(false);
    setTicketToStart(null);
  };

  const handleEscalateTicket = async (ticketId: string) => {
    const { error } = await supabase
      .from("tickets")
      .update({
        escalated: true,
        escalated_at: new Date().toISOString(),
      })
      .eq("id", ticketId);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Ticket Escalated",
        description: "The ticket has been escalated for urgent attention",
      });
      fetchTickets();
      if (selectedTicket?.id === ticketId) {
        const updatedTicket = {
          ...selectedTicket,
          escalated: true,
          escalated_at: new Date().toISOString(),
        };
        setSelectedTicket(updatedTicket);
      }
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      open: "bg-status-open",
      in_progress: "bg-status-in-progress",
      pending: "bg-status-pending",
      resolved: "bg-status-resolved",
      closed: "bg-status-closed",
    };

    return <Badge className={`${colors[status]} text-white`}>{status.replace("_", " ")}</Badge>;
  };

  const getPriorityBadge = (priority: string) => {
    const colors: Record<string, string> = {
      low: "bg-priority-low",
      medium: "bg-priority-medium",
      high: "bg-priority-high",
      urgent: "bg-priority-urgent",
    };

    return (
      <Badge variant="outline" className={`${colors[priority]} text-white border-0`}>
        {priority}
      </Badge>
    );
  };

  const openTickets = tickets.filter((t) => t.status === "open" || t.status === "in_progress");
  const closedTickets = tickets.filter((t) => t.status === "closed");
  const resolvedTickets = tickets.filter((t) => t.status === "resolved");
  const pendingTickets = tickets.filter((t) => t.status === "pending");

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Back Navigation */}
        <div>
          <Button variant="ghost" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Ticket className="w-8 h-8" />
              Tickets
            </h1>
            <p className="text-muted-foreground">Manage support tickets</p>
          </div>
          <div className="flex gap-2">
            {isSupportStaff && (
              <Button variant="outline" onClick={handleSendReminders}>
                <Clock className="mr-2 h-4 w-4" />
                Send Reminders
              </Button>
            )}
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button onClick={handleOpenTicketDialog}>
                  <Plus className="mr-2 h-4 w-4" />
                  New Ticket
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create New Ticket</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {isAdmin && allUsers.length > 0 && (
                    <div className="space-y-2">
                      <Label htmlFor="userSelect">Select User (Admin Only)</Label>
                      <Select value={selectedUserId} onValueChange={handleUserSelection}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a user (optional - defaults to you)" />
                        </SelectTrigger>
                        <SelectContent>
                          {allUsers.map((user) => (
                            <SelectItem key={user.id} value={user.id}>
                              {user.full_name ? `${user.full_name} (${user.email})` : user.email}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-blue-900">Auto-filled Information</p>
                        <p className="text-sm text-blue-700 mt-1">
                          <strong>User:</strong> {userEmail}
                        </p>
                        <p className="text-sm text-blue-700">
                          <strong>Branch:</strong> {branch || "Not set - please update your profile"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <FaultTypeSelector value={faultType} onChange={setFaultType} required />

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
                        <SelectItem value="urgent">Urgent - Response within 2 hours</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="title">Brief Issue Summary (Optional)</Label>
                    <Input
                      id="title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g., Cannot connect to RDP"
                    />
                  </div>

                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <Clock className="h-5 w-5 text-amber-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-amber-900">Response Time Commitment</p>
                        <p className="text-sm text-amber-700 mt-1">
                          • Standard tickets: Response within 15 minutes<br />
                          • Urgent tickets: Resolution within 2 hours
                        </p>
                      </div>
                    </div>
                  </div>

                  <Button type="submit" className="w-full" disabled={isSubmitting || !faultType}>
                    {isSubmitting ? "Creating..." : "Submit Ticket"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Tickets</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{tickets.length}</div>
              <p className="text-xs text-muted-foreground mt-1">All time</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Open Tickets</CardTitle>
              <AlertCircle className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{openTickets.length}</div>
              <p className="text-xs text-muted-foreground mt-1">In progress & open</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Resolved</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{resolvedTickets.length}</div>
              <p className="text-xs text-muted-foreground mt-1">Resolved tickets</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Closed</CardTitle>
              <CheckCircle className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-600">{closedTickets.length}</div>
              <p className="text-xs text-muted-foreground mt-1">Closed tickets</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabbed View */}
        <Tabs defaultValue="open" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="open">Open ({openTickets.length})</TabsTrigger>
            <TabsTrigger value="pending">Pending ({pendingTickets.length})</TabsTrigger>
            <TabsTrigger value="resolved">Resolved ({resolvedTickets.length})</TabsTrigger>
            <TabsTrigger value="closed">Closed ({closedTickets.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="open">
            <Card>
              <CardHeader>
                <CardTitle>Open Tickets</CardTitle>
                <CardDescription>Currently active tickets requiring attention</CardDescription>
              </CardHeader>
              <CardContent>
                {openTickets.length === 0 ? (
                  <p className="text-muted-foreground">No open tickets.</p>
                ) : (
                  <div className="space-y-4">
                    {openTickets.map((ticket) => {
                      const timeElapsed = getTimeElapsed(ticket.created_at);
                      const responseOverdue = isOverdue(ticket.response_required_by);
                      const resolutionOverdue = isOverdue(ticket.resolution_required_by);
                      
                      return (
                        <div
                          key={ticket.id}
                          className={`flex flex-col md:flex-row md:items-center justify-between p-4 rounded-lg border transition-colors gap-4 cursor-pointer ${
                            ticket.escalated ? 'border-red-500 bg-red-50/50' : 
                            responseOverdue ? 'border-orange-500 bg-orange-50/50' : 
                            'border-border hover:bg-muted/50'
                          }`}
                          onClick={() => handleTicketClick(ticket)}
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              {ticket.ticket_code && (
                                <Badge variant="outline" className="bg-gray-100 text-gray-800 font-mono text-xs">
                                  {ticket.ticket_code}
                                </Badge>
                              )}
                              {ticket.escalated && (
                                <Badge variant="destructive" className="text-xs">
                                  ⚠️ ESCALATED
                                </Badge>
                              )}
                            </div>
                            <h3 className="font-medium">{ticket.title}</h3>
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{ticket.description}</p>
                            <div className="flex flex-wrap gap-2 mt-2">
                              <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20">
                                <Clock className="h-3 w-3 mr-1" />
                                {timeElapsed} elapsed
                              </Badge>
                              {ticket.branch && (
                                <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20">
                                  📍 {ticket.branch}
                                </Badge>
                              )}
                              {ticket.fault_type && (
                                <Badge
                                  variant="outline"
                                  className="bg-orange-500/10 text-orange-600 border-orange-500/20"
                                >
                                  🔧 {ticket.fault_type}
                                </Badge>
                              )}
                              {ticket.user_email && (
                                <span className="text-xs text-muted-foreground">👤 {ticket.user_email}</span>
                              )}
                              {responseOverdue && !ticket.started_at && (
                                <Badge variant="destructive" className="text-xs">
                                  ⏰ Response Overdue
                                </Badge>
                              )}
                              {resolutionOverdue && ticket.priority === 'urgent' && (
                                <Badge variant="destructive" className="text-xs">
                                  ⏰ Resolution Overdue
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2 flex-wrap" onClick={(e) => e.stopPropagation()}>
                            {getPriorityBadge(ticket.priority)}
                            {getStatusBadge(ticket.status)}
                            {isSupportStaff && !ticket.started_at && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setTicketToStart(ticket.id);
                                  setStartJobDialogOpen(true);
                                }}
                              >
                                Start Job
                              </Button>
                            )}
                            {isSupportStaff && !ticket.escalated && responseOverdue && (
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEscalateTicket(ticket.id);
                                }}
                              >
                                Escalate
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pending">
            <Card>
              <CardHeader>
                <CardTitle>Pending Tickets</CardTitle>
                <CardDescription>Tickets waiting for action or response</CardDescription>
              </CardHeader>
              <CardContent>
                {pendingTickets.length === 0 ? (
                  <p className="text-muted-foreground">No pending tickets.</p>
                ) : (
                  <div className="space-y-4">
                    {pendingTickets.map((ticket) => (
                      <div
                        key={ticket.id}
                        className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors gap-4 cursor-pointer"
                        onClick={() => handleTicketClick(ticket)}
                      >
                        <div className="flex-1">
                          <h3 className="font-medium">{ticket.title}</h3>
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{ticket.description}</p>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {ticket.branch && (
                              <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20">
                                📍 {ticket.branch}
                              </Badge>
                            )}
                            {ticket.fault_type && (
                              <Badge
                                variant="outline"
                                className="bg-orange-500/10 text-orange-600 border-orange-500/20"
                              >
                                🔧 {ticket.fault_type}
                              </Badge>
                            )}
                            <span className="text-xs text-muted-foreground">
                              📅 {new Date(ticket.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2 flex-wrap" onClick={(e) => e.stopPropagation()}>
                          {getPriorityBadge(ticket.priority)}
                          {getStatusBadge(ticket.status)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="resolved">
            <Card>
              <CardHeader>
                <CardTitle>Resolved Tickets</CardTitle>
                <CardDescription>Tickets that have been resolved</CardDescription>
              </CardHeader>
              <CardContent>
                {resolvedTickets.length === 0 ? (
                  <p className="text-muted-foreground">No resolved tickets.</p>
                ) : (
                  <div className="space-y-4">
                    {resolvedTickets.map((ticket) => (
                      <div
                        key={ticket.id}
                        className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors gap-4 cursor-pointer"
                        onClick={() => handleTicketClick(ticket)}
                      >
                        <div className="flex-1">
                          <h3 className="font-medium">{ticket.title}</h3>
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{ticket.description}</p>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {ticket.branch && (
                              <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20">
                                📍 {ticket.branch}
                              </Badge>
                            )}
                            {ticket.resolved_at && (
                              <span className="text-xs text-muted-foreground">
                                ✅ Resolved {new Date(ticket.resolved_at).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2 flex-wrap" onClick={(e) => e.stopPropagation()}>
                          {getPriorityBadge(ticket.priority)}
                          {getStatusBadge(ticket.status)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="closed">
            <Card>
              <CardHeader>
                <CardTitle>Closed Tickets</CardTitle>
                <CardDescription>Completed and archived tickets</CardDescription>
              </CardHeader>
              <CardContent>
                {closedTickets.length === 0 ? (
                  <p className="text-muted-foreground">No closed tickets.</p>
                ) : (
                  <div className="space-y-4">
                    {closedTickets.map((ticket) => (
                      <div
                        key={ticket.id}
                        className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors gap-4 cursor-pointer"
                        onClick={() => handleTicketClick(ticket)}
                      >
                        <div className="flex-1">
                          <h3 className="font-medium">{ticket.title}</h3>
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{ticket.description}</p>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {ticket.branch && (
                              <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20">
                                📍 {ticket.branch}
                              </Badge>
                            )}
                            {ticket.resolved_at && (
                              <span className="text-xs text-muted-foreground">
                                🔒 Closed {new Date(ticket.resolved_at).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2 flex-wrap" onClick={(e) => e.stopPropagation()}>
                          {getPriorityBadge(ticket.priority)}
                          {getStatusBadge(ticket.status)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Ticket</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this ticket? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteTicket}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
            {selectedTicket && (
              <>
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2">
                    {editMode ? "Edit Ticket" : "Ticket Details"}
                    {!editMode && (
                      <Button size="sm" variant="ghost" onClick={() => setEditMode(true)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}
                  </SheetTitle>
                  <SheetDescription>
                    {selectedTicket.ticket_code && (
                      <span className="font-mono font-semibold">{selectedTicket.ticket_code}</span>
                    )}
                    {!selectedTicket.ticket_code && `Ticket #${selectedTicket.id.slice(0, 8)}`}
                  </SheetDescription>
                </SheetHeader>

                <div className="space-y-6 mt-6">
                  {!editMode ? (
                    <>
                      <div className="flex items-center gap-2 flex-wrap">
                        {getPriorityBadge(selectedTicket.priority)}
                        {getStatusBadge(selectedTicket.status)}
                        {selectedTicket.escalated && (
                          <Badge variant="destructive">⚠️ ESCALATED</Badge>
                        )}
                      </div>

                      <div>
                        <h3 className="text-lg font-semibold">{selectedTicket.title}</h3>
                        <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">
                          {selectedTicket.description}
                        </p>
                      </div>

                      <Separator />

                      {/* Time Tracking Info */}
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-blue-900">Time Elapsed Since Creation</Label>
                            <Badge variant="outline" className="bg-blue-100 text-blue-900">
                              <Clock className="h-3 w-3 mr-1" />
                              {getTimeElapsed(selectedTicket.created_at)}
                            </Badge>
                          </div>
                          
                          {selectedTicket.started_at && (
                            <div className="flex items-center justify-between">
                              <Label className="text-blue-900">Work Duration</Label>
                              <Badge variant="outline" className="bg-blue-100 text-blue-900">
                                <Clock className="h-3 w-3 mr-1" />
                                {getTimeElapsed(selectedTicket.started_at)}
                              </Badge>
                            </div>
                          )}

                          {selectedTicket.response_required_by && (
                            <div className="flex items-center justify-between">
                              <Label className={isOverdue(selectedTicket.response_required_by) ? "text-red-900" : "text-blue-900"}>
                                Response Required By
                              </Label>
                              <span className={`text-sm ${isOverdue(selectedTicket.response_required_by) ? "text-red-900 font-semibold" : "text-blue-700"}`}>
                                {new Date(selectedTicket.response_required_by).toLocaleString()}
                                {isOverdue(selectedTicket.response_required_by) && " (OVERDUE)"}
                              </span>
                            </div>
                          )}

                          {selectedTicket.resolution_required_by && selectedTicket.priority === 'urgent' && (
                            <div className="flex items-center justify-between">
                              <Label className={isOverdue(selectedTicket.resolution_required_by) ? "text-red-900" : "text-blue-900"}>
                                Resolution Required By
                              </Label>
                              <span className={`text-sm ${isOverdue(selectedTicket.resolution_required_by) ? "text-red-900 font-semibold" : "text-blue-700"}`}>
                                {new Date(selectedTicket.resolution_required_by).toLocaleString()}
                                {isOverdue(selectedTicket.resolution_required_by) && " (OVERDUE)"}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      <Separator />

                      <div className="grid gap-4">
                        {selectedTicket.user_email && (
                          <div>
                            <Label className="text-muted-foreground">User Email</Label>
                            <p className="text-sm mt-1">{selectedTicket.user_email}</p>
                          </div>
                        )}

                        {selectedTicket.branch && (
                          <div>
                            <Label className="text-muted-foreground">Branch</Label>
                            <p className="text-sm mt-1">{selectedTicket.branch}</p>
                          </div>
                        )}

                        {selectedTicket.fault_type && (
                          <div>
                            <Label className="text-muted-foreground">Fault Type</Label>
                            <p className="text-sm mt-1">{selectedTicket.fault_type}</p>
                          </div>
                        )}

                        {selectedTicket.error_code && (
                          <div>
                            <Label className="text-muted-foreground">Error Code</Label>
                            <p className="text-sm mt-1 font-mono">{selectedTicket.error_code}</p>
                          </div>
                        )}

                        {selectedTicket.category && (
                          <div>
                            <Label className="text-muted-foreground">Category</Label>
                            <p className="text-sm mt-1">{selectedTicket.category}</p>
                          </div>
                        )}

                        <div>
                          <Label className="text-muted-foreground">Created</Label>
                          <p className="text-sm mt-1 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(selectedTicket.created_at).toLocaleString()}
                          </p>
                        </div>

                        {selectedTicket.resolved_at && (
                          <div>
                            <Label className="text-muted-foreground">Resolved</Label>
                            <p className="text-sm mt-1 flex items-center gap-1">
                              <CheckCircle className="h-3 w-3" />
                              {new Date(selectedTicket.resolved_at).toLocaleString()}
                            </p>
                          </div>
                        )}
                      </div>

                      <Separator />

                      {isSupportStaff && (
                        <>
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <Label className="text-base font-semibold">Time Tracking</Label>
                                <p className="text-sm text-muted-foreground mt-1">
                                  Total time: {formatDuration(selectedTicket.time_spent_minutes || 0)}
                                </p>
                              </div>
                              <Button size="sm" onClick={() => setTimeLogDialogOpen(true)}>
                                <Clock className="h-4 w-4 mr-2" />
                                Log Time
                              </Button>
                            </div>

                            {timeLogs.length > 0 && (
                              <div className="space-y-2">
                                <Label className="text-sm text-muted-foreground">Recent Time Logs</Label>
                                <div className="space-y-2 max-h-48 overflow-y-auto">
                                  {timeLogs.slice(0, 5).map((log) => (
                                    <div key={log.id} className="p-3 bg-muted/50 rounded-lg border">
                                      <div className="flex items-center justify-between">
                                        <span className="font-medium">{formatDuration(log.minutes)}</span>
                                        <span className="text-xs text-muted-foreground">
                                          {new Date(log.logged_at).toLocaleDateString()}
                                        </span>
                                      </div>
                                      {log.notes && <p className="text-sm text-muted-foreground mt-1">{log.notes}</p>}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>

                          <Separator />
                        </>
                      )}

                      <div className="flex flex-wrap gap-2">
                        {isSupportStaff && !selectedTicket.started_at && selectedTicket.status !== "closed" && (
                          <Button
                            onClick={() => {
                              setTicketToStart(selectedTicket.id);
                              setStartJobDialogOpen(true);
                            }}
                            variant="default"
                            className="flex-1"
                          >
                            <Clock className="h-4 w-4 mr-2" />
                            Start Job
                          </Button>
                        )}
                        
                        {selectedTicket.status === "closed" ? (
                          <Button onClick={() => handleReopenTicket(selectedTicket.id)} className="flex-1">
                            <RotateCcw className="h-4 w-4 mr-2" />
                            Reopen Ticket
                          </Button>
                        ) : (
                          <Button
                            onClick={() => handleCloseTicket(selectedTicket.id)}
                            variant="outline"
                            className="flex-1"
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Close Ticket
                          </Button>
                        )}
                        
                        {isSupportStaff && !selectedTicket.escalated && selectedTicket.status !== "closed" && (
                          <Button
                            onClick={() => handleEscalateTicket(selectedTicket.id)}
                            variant="destructive"
                          >
                            <AlertCircle className="h-4 w-4 mr-2" />
                            Escalate
                          </Button>
                        )}
                        
                        {isAdmin && (
                          <Button
                            variant="destructive"
                            onClick={() => {
                              setTicketToDelete(selectedTicket.id);
                              setDeleteDialogOpen(true);
                              setSheetOpen(false);
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </Button>
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="editStatus">Status</Label>
                          <Select value={editStatus} onValueChange={setEditStatus}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="open">Open</SelectItem>
                              <SelectItem value="in_progress">In Progress</SelectItem>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="resolved">Resolved</SelectItem>
                              <SelectItem value="closed">Closed</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="editPriority">Priority</Label>
                          <Select value={editPriority} onValueChange={setEditPriority}>
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

                        <div className="space-y-2">
                          <Label htmlFor="editTitle">Title</Label>
                          <Input id="editTitle" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="editDescription">Description</Label>
                          <Textarea
                            id="editDescription"
                            value={editDescription}
                            onChange={(e) => setEditDescription(e.target.value)}
                            rows={4}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="editUserEmail">User Email</Label>
                          <Input
                            id="editUserEmail"
                            type="email"
                            value={editUserEmail}
                            onChange={(e) => setEditUserEmail(e.target.value)}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="editBranch">Branch</Label>
                          <Select value={editBranch} onValueChange={setEditBranch}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select branch" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="DBN">Durban (DBN)</SelectItem>
                              <SelectItem value="CPT">Cape Town (CPT)</SelectItem>
                              <SelectItem value="PE">Port Elizabeth (PE)</SelectItem>
                              <SelectItem value="JHB">Johannesburg (JHB)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="editFaultType">Fault Type</Label>
                          <Select value={editFaultType} onValueChange={setEditFaultType}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select fault type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="RDP">RDP Server</SelectItem>
                              <SelectItem value="CDrive">C Drive (My PC)</SelectItem>
                              <SelectItem value="VPN">VPN</SelectItem>
                              <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="editErrorCode">Error Code</Label>
                          <Input
                            id="editErrorCode"
                            value={editErrorCode}
                            onChange={(e) => setEditErrorCode(e.target.value)}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="editCategory">Category</Label>
                          <Input
                            id="editCategory"
                            value={editCategory}
                            onChange={(e) => setEditCategory(e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button onClick={handleSaveChanges} className="flex-1">
                          Save Changes
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setEditMode(false);
                            setEditTitle(selectedTicket.title);
                            setEditDescription(selectedTicket.description || "");
                            setEditPriority(selectedTicket.priority);
                            setEditStatus(selectedTicket.status);
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </>
            )}
          </SheetContent>
        </Sheet>

        <Dialog open={timeLogDialogOpen} onOpenChange={setTimeLogDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{closeAfterTimeLog ? "Log Time and Close Ticket" : "Log Time"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              {closeAfterTimeLog && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <p className="text-sm text-amber-900">
                    <strong>Note:</strong> Please log your resolution time. The ticket will be closed after you submit.
                  </p>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="timeLogMinutes">Time Spent (minutes) *</Label>
                <Input
                  id="timeLogMinutes"
                  type="number"
                  min="1"
                  value={timeLogMinutes}
                  onChange={(e) => setTimeLogMinutes(e.target.value)}
                  placeholder="e.g., 30"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="timeLogNotes">Resolution Notes {closeAfterTimeLog ? "*" : "(Optional)"}</Label>
                <Textarea
                  id="timeLogNotes"
                  value={timeLogNotes}
                  onChange={(e) => setTimeLogNotes(e.target.value)}
                  placeholder={closeAfterTimeLog ? "Describe how you resolved the issue" : "What did you work on?"}
                  rows={3}
                  required={closeAfterTimeLog}
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleLogTime} className="flex-1" disabled={!isTimeLogFormValid()}>
                  {closeAfterTimeLog ? "Log Time & Close" : "Log Time"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setTimeLogDialogOpen(false);
                    setTimeLogMinutes("");
                    setTimeLogNotes("");
                    setCloseAfterTimeLog(false);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <AlertDialog open={startJobDialogOpen} onOpenChange={setStartJobDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Start Job</AlertDialogTitle>
              <AlertDialogDescription>
                This will mark the ticket as "In Progress" and start tracking the resolution time. 
                You should only start the job when you're actively working on it.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setTicketToStart(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleStartJob}>Start Job</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
};

export default Tickets;
