import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Monitor, Search, User, Building2, Calendar, Edit } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Device {
  id: string;
  name: string;
  asset_tag: string | null;
  category: string | null;
  model: string | null;
  serial_number: string | null;
  status: string | null;
  assigned_to: string | null;
  location: string | null;
  purchase_date: string | null;
  warranty_expiry: string | null;
  created_at: string;
  updated_at: string;
  // User profile info
  user_full_name?: string | null;
  user_email?: string | null;
  // Branch info
  branch_name?: string | null;
}

interface Ticket {
  id: string;
  title: string;
  status: string;
  priority: string;
  created_at: string;
}

const Devices = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [devices, setDevices] = useState<Device[]>([]);
  const [filteredDevices, setFilteredDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [relatedTickets, setRelatedTickets] = useState<Ticket[]>([]);
  const [editMode, setEditMode] = useState(false);

  // Edit form state
  const [editName, setEditName] = useState("");
  const [editModel, setEditModel] = useState("");
  const [editSerialNumber, setEditSerialNumber] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [editLocation, setEditLocation] = useState("");

  useEffect(() => {
    checkAuth();
  }, [navigate]);

  useEffect(() => {
    if (devices.length > 0) {
      filterDevices();
    }
  }, [searchQuery, devices]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }

    // Check if user has admin, ceo, or support_staff role
    const { data: rolesData, error: rolesError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .in("role", ["admin", "ceo", "support_staff"]);

    if (rolesError) {
      console.error("Error checking user roles:", rolesError);
      toast({
        title: "Access Check Failed",
        description: "Unable to verify your access permissions. Please contact your administrator if you should have access to this page.",
        variant: "destructive",
      });
      navigate("/dashboard");
      return;
    }

    if (!rolesData || rolesData.length === 0) {
      toast({
        title: "Access Denied",
        description: "You need admin, CEO, or support staff privileges to view this page. Please contact your administrator to request access.",
        variant: "destructive",
      });
      navigate("/dashboard");
      return;
    }

    // Set isAdmin true for any of these roles to enable editing
    setIsAdmin(true);
    fetchDevices();
  };

  const fetchDevices = async () => {
    setLoading(true);
    
    // Fetch assets with user and branch information
    const { data, error } = await supabase
      .from("assets")
      .select(`
        *,
        profiles:assigned_to (
          full_name,
          email,
          branches:branch_id (
            name
          )
        )
      `)
      .order("name", { ascending: true });

    if (error) {
      console.error("Error fetching devices:", error);
      toast({
        title: "Error",
        description: "Failed to load devices",
        variant: "destructive",
      });
    } else {
      const mappedDevices = (data || []).map((device: any) => ({
        ...device,
        user_full_name: device.profiles?.full_name,
        user_email: device.profiles?.email,
        branch_name: device.profiles?.branches?.name,
      }));
      setDevices(mappedDevices);
      setFilteredDevices(mappedDevices);
    }
    setLoading(false);
  };

  const filterDevices = () => {
    if (!searchQuery.trim()) {
      setFilteredDevices(devices);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = devices.filter((device) => {
      return (
        device.name?.toLowerCase().includes(query) ||
        device.asset_tag?.toLowerCase().includes(query) ||
        device.model?.toLowerCase().includes(query) ||
        device.serial_number?.toLowerCase().includes(query) ||
        device.user_full_name?.toLowerCase().includes(query) ||
        device.user_email?.toLowerCase().includes(query) ||
        device.branch_name?.toLowerCase().includes(query)
      );
    });

    setFilteredDevices(filtered);
  };

  const handleDeviceClick = async (device: Device) => {
    setSelectedDevice(device);
    setEditName(device.name);
    setEditModel(device.model || "");
    setEditSerialNumber(device.serial_number || "");
    setEditStatus(device.status || "");
    setEditLocation(device.location || "");
    setEditMode(false);
    
    // Fetch related tickets for this device/user
    if (device.assigned_to) {
      const { data: ticketsData } = await supabase
        .from("tickets")
        .select("id, title, status, priority, created_at")
        .eq("created_by", device.assigned_to)
        .order("created_at", { ascending: false })
        .limit(10);
      
      setRelatedTickets(ticketsData || []);
    } else {
      setRelatedTickets([]);
    }
    
    setSheetOpen(true);
  };

  const handleSaveDevice = async () => {
    if (!selectedDevice) return;

    const { error } = await supabase
      .from("assets")
      .update({
        name: editName,
        model: editModel || null,
        serial_number: editSerialNumber || null,
        status: editStatus || null,
        location: editLocation || null,
      })
      .eq("id", selectedDevice.id);

    if (error) {
      console.error("Error updating device:", error);
      toast({
        title: "Error",
        description: "Failed to update device",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Device updated successfully",
      });
      setEditMode(false);
      fetchDevices();
      
      // Update the selected device with new values
      setSelectedDevice({
        ...selectedDevice,
        name: editName,
        model: editModel || null,
        serial_number: editSerialNumber || null,
        status: editStatus || null,
        location: editLocation || null,
      });
    }
  };

  const getStatusColor = (status: string | null) => {
    switch (status?.toLowerCase()) {
      case "active":
        return "bg-green-500";
      case "inactive":
        return "bg-gray-500";
      case "maintenance":
        return "bg-yellow-500";
      case "retired":
        return "bg-red-500";
      default:
        return "bg-blue-500";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case "high":
        return "bg-red-500";
      case "medium":
        return "bg-yellow-500";
      case "low":
        return "bg-blue-500";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-[#C41E3A]">Devices / PCs</h1>
          <p className="text-muted-foreground mt-1">Manage all devices and computers in the organization</p>
        </div>

        <div className="flex items-center space-x-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search devices, users, or branches..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Badge variant="outline" className="text-sm">
            {filteredDevices.length} devices
          </Badge>
        </div>

        {loading ? (
          <div className="text-center py-8">Loading devices...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredDevices.map((device) => (
              <Card
                key={device.id}
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => handleDeviceClick(device)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-[#C41E3A]/10 rounded-lg">
                        <Monitor className="h-6 w-6 text-[#C41E3A]" />
                      </div>
                      <div>
                        <CardTitle className="text-base text-[#C41E3A]">{device.name}</CardTitle>
                        {device.asset_tag && (
                          <p className="text-xs text-muted-foreground">#{device.asset_tag}</p>
                        )}
                      </div>
                    </div>
                    {device.status && (
                      <Badge className={`${getStatusColor(device.status)} text-white text-xs`}>
                        {device.status}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {device.model && (
                    <p className="text-sm text-muted-foreground">{device.model}</p>
                  )}
                  {device.user_full_name && (
                    <div className="flex items-center space-x-2 text-sm">
                      <User className="h-3 w-3 text-muted-foreground" />
                      <span className="truncate">{device.user_full_name}</span>
                    </div>
                  )}
                  {device.user_email && (
                    <p className="text-xs text-muted-foreground truncate">{device.user_email}</p>
                  )}
                  {device.branch_name && (
                    <div className="flex items-center space-x-2 text-sm">
                      <Building2 className="h-3 w-3 text-muted-foreground" />
                      <span className="truncate">{device.branch_name}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!loading && filteredDevices.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center">
              <Monitor className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {searchQuery ? "No devices found matching your search" : "No devices found"}
              </p>
            </CardContent>
          </Card>
        )}

        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetContent className="sm:max-w-xl overflow-y-auto">
            {selectedDevice && (
              <>
                <SheetHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-3 bg-[#C41E3A]/10 rounded-lg">
                        <Monitor className="h-8 w-8 text-[#C41E3A]" />
                      </div>
                      <div>
                        <SheetTitle className="text-[#C41E3A]">{selectedDevice.name}</SheetTitle>
                        {selectedDevice.asset_tag && (
                          <SheetDescription>Asset Tag: {selectedDevice.asset_tag}</SheetDescription>
                        )}
                      </div>
                    </div>
                    {!editMode && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditMode(true)}
                        className="text-[#C41E3A]"
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                    )}
                  </div>
                </SheetHeader>

                <Tabs defaultValue="details" className="mt-6">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="details">Device Details</TabsTrigger>
                    <TabsTrigger value="tickets">Related Tickets</TabsTrigger>
                  </TabsList>

                  <TabsContent value="details" className="space-y-4 mt-4">
                    {editMode ? (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="edit-name">Device Name</Label>
                          <Input
                            id="edit-name"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="edit-model">Model</Label>
                          <Input
                            id="edit-model"
                            value={editModel}
                            onChange={(e) => setEditModel(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="edit-serial">Serial Number</Label>
                          <Input
                            id="edit-serial"
                            value={editSerialNumber}
                            onChange={(e) => setEditSerialNumber(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="edit-status">Status</Label>
                          <Input
                            id="edit-status"
                            value={editStatus}
                            onChange={(e) => setEditStatus(e.target.value)}
                            placeholder="active, inactive, maintenance, retired"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="edit-location">Location</Label>
                          <Input
                            id="edit-location"
                            value={editLocation}
                            onChange={(e) => setEditLocation(e.target.value)}
                          />
                        </div>
                        <div className="flex space-x-2">
                          <Button onClick={handleSaveDevice} className="bg-[#C41E3A] hover:bg-[#A01830]">
                            Save Changes
                          </Button>
                          <Button variant="outline" onClick={() => setEditMode(false)}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div>
                          <Label className="text-muted-foreground">Category</Label>
                          <p className="text-sm font-medium">{selectedDevice.category || "N/A"}</p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">Model</Label>
                          <p className="text-sm font-medium">{selectedDevice.model || "N/A"}</p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">Serial Number</Label>
                          <p className="text-sm font-medium">{selectedDevice.serial_number || "N/A"}</p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">Status</Label>
                          {selectedDevice.status ? (
                            <Badge className={`${getStatusColor(selectedDevice.status)} text-white mt-1`}>
                              {selectedDevice.status}
                            </Badge>
                          ) : (
                            <p className="text-sm font-medium">N/A</p>
                          )}
                        </div>
                        <div>
                          <Label className="text-muted-foreground">Location</Label>
                          <p className="text-sm font-medium">{selectedDevice.location || "N/A"}</p>
                        </div>
                        {selectedDevice.user_full_name && (
                          <>
                            <div>
                              <Label className="text-muted-foreground">Assigned User</Label>
                              <p className="text-sm font-medium">{selectedDevice.user_full_name}</p>
                            </div>
                            <div>
                              <Label className="text-muted-foreground">User Email</Label>
                              <p className="text-sm font-medium">{selectedDevice.user_email || "N/A"}</p>
                            </div>
                          </>
                        )}
                        {selectedDevice.branch_name && (
                          <div>
                            <Label className="text-muted-foreground">Branch</Label>
                            <p className="text-sm font-medium">{selectedDevice.branch_name}</p>
                          </div>
                        )}
                        {selectedDevice.purchase_date && (
                          <div>
                            <Label className="text-muted-foreground">Purchase Date</Label>
                            <p className="text-sm font-medium">
                              {new Date(selectedDevice.purchase_date).toLocaleDateString()}
                            </p>
                          </div>
                        )}
                        {selectedDevice.warranty_expiry && (
                          <div>
                            <Label className="text-muted-foreground">Warranty Expiry</Label>
                            <p className="text-sm font-medium">
                              {new Date(selectedDevice.warranty_expiry).toLocaleDateString()}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="tickets" className="space-y-3 mt-4">
                    {relatedTickets.length > 0 ? (
                      relatedTickets.map((ticket) => (
                        <Card key={ticket.id} className="cursor-pointer hover:shadow-md transition-shadow">
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <h4 className="font-medium text-sm">{ticket.title}</h4>
                                <p className="text-xs text-muted-foreground mt-1">
                                  Created {new Date(ticket.created_at).toLocaleDateString()}
                                </p>
                              </div>
                              <div className="flex flex-col items-end space-y-1">
                                <Badge className="text-xs">{ticket.status}</Badge>
                                <Badge className={`${getPriorityColor(ticket.priority)} text-white text-xs`}>
                                  {ticket.priority}
                                </Badge>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-muted-foreground">No related tickets found</p>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </DashboardLayout>
  );
};

export default Devices;
