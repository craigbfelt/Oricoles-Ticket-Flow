import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, CheckCircle, RotateCcw, Edit, Clock, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";

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
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
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

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        fetchUserProfile(session.user.id);
      }
    });

    fetchTickets();
  }, [navigate]);

  const fetchUserProfile = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("id")
      .eq("user_id", userId)
      .single();

    if (data) {
      setCurrentUserId(data.id);
      checkAdminRole(userId);
    }
  };

  const checkAdminRole = async (userId: string) => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();

    setIsAdmin(!!data);
  };

  const fetchTickets = async () => {
    const { data } = await supabase
      .from("tickets")
      .select("*")
      .order("created_at", { ascending: false });

    setTickets(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentUserId) {
      toast({
        title: "Error",
        description: "User profile not found",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    const { data: ticketData, error } = await supabase.from("tickets").insert([{
      title,
      description,
      priority: priority as any,
      category: category || null,
      branch: branch || null,
      fault_type: faultType || null,
      user_email: userEmail || null,
      error_code: errorCode || null,
      created_by: currentUserId,
      status: "open" as any,
    }]).select().single();

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }

    // Route email if ticket created successfully
    if (ticketData) {
      try {
        await supabase.functions.invoke("route-ticket-email", {
          body: {
            ticketId: ticketData.id,
            title,
            description,
            faultType,
            branch,
            userEmail,
            errorCode,
            priority,
          },
        });
      } catch (emailError) {
        console.error("Email routing error:", emailError);
        // Don't fail the ticket creation if email fails
      }
    }

    toast({
      title: "Success",
      description: "Ticket created successfully",
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
    setIsSubmitting(false);
    fetchTickets();
  };

  const handleCloseTicket = async (ticketId: string) => {
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
  };

  const handleSaveChanges = async () => {
    if (!selectedTicket) return;

    const updates: any = {
      title: editTitle,
      description: editDescription,
      priority: editPriority as any,
      status: editStatus as any,
      category: editCategory || null,
      branch: editBranch || null,
      fault_type: editFaultType || null,
      user_email: editUserEmail || null,
      error_code: editErrorCode || null,
    };

    if (editStatus === "closed" && selectedTicket.status !== "closed") {
      updates.resolved_at = new Date().toISOString();
    } else if (editStatus !== "closed" && selectedTicket.status === "closed") {
      updates.resolved_at = null;
    }

    const { error } = await supabase
      .from("tickets")
      .update(updates)
      .eq("id", selectedTicket.id);

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

    const { error } = await supabase
      .from("tickets")
      .delete()
      .eq("id", ticketToDelete);

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

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Tickets</h1>
            <p className="text-muted-foreground">Manage support tickets</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Ticket
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Ticket</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="userEmail">Your Email</Label>
                  <Input
                    id="userEmail"
                    type="email"
                    value={userEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                    placeholder="your.email@oricol.co.za"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="branch">Branch</Label>
                  <Select value={branch} onValueChange={setBranch} required>
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
                  <Label htmlFor="faultType">Fault Type</Label>
                  <Select value={faultType} onValueChange={setFaultType} required>
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

        <Card>
          <CardHeader>
            <CardTitle>All Tickets</CardTitle>
          </CardHeader>
          <CardContent>
            {tickets.length === 0 ? (
              <p className="text-muted-foreground">No tickets yet. Create your first ticket to get started.</p>
            ) : (
              <div className="space-y-4">
                {tickets.map((ticket) => (
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
                          <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-500/20">
                            🔧 {ticket.fault_type}
                          </Badge>
                        )}
                        {ticket.category && (
                          <Badge variant="secondary">{ticket.category}</Badge>
                        )}
                        {ticket.user_email && (
                          <span className="text-xs text-muted-foreground">
                            👤 {ticket.user_email}
                          </span>
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
                    Ticket #{selectedTicket.id.slice(0, 8)}
                  </SheetDescription>
                </SheetHeader>

                <div className="space-y-6 mt-6">
                  {!editMode ? (
                    <>
                      <div className="flex items-center gap-2">
                        {getPriorityBadge(selectedTicket.priority)}
                        {getStatusBadge(selectedTicket.status)}
                      </div>

                      <div>
                        <h3 className="text-lg font-semibold">{selectedTicket.title}</h3>
                        <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">
                          {selectedTicket.description}
                        </p>
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

                      <div className="flex flex-wrap gap-2">
                        {selectedTicket.status === "closed" ? (
                          <Button onClick={() => handleReopenTicket(selectedTicket.id)} className="flex-1">
                            <RotateCcw className="h-4 w-4 mr-2" />
                            Reopen Ticket
                          </Button>
                        ) : (
                          <Button onClick={() => handleCloseTicket(selectedTicket.id)} variant="outline" className="flex-1">
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Close Ticket
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
                          <Input
                            id="editTitle"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                          />
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
      </div>
    </DashboardLayout>
  );
};

export default Tickets;
