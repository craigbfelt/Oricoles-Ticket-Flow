import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, ArrowRightLeft, Trash2, Truck, List } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DataTable } from "@/components/DataTable";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info } from "lucide-react";

const Maintenance = () => {
  const [activeTab, setActiveTab] = useState("requests");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [requestType, setRequestType] = useState("");
  const { toast } = useToast();

  const { data: requests, refetch } = useQuery({
    queryKey: ["maintenance-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("maintenance_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const handleSubmitRequest = async (formData: any) => {
    const { error } = await supabase.from("maintenance_requests").insert({
      ...formData,
      request_type: requestType,
    });

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Request submitted",
      description: "Your maintenance request has been submitted successfully.",
    });

    setIsDialogOpen(false);
    refetch();
  };

  const columns = [
    {
      key: "request_type",
      label: "Type",
      render: (value: string) => (
        <Badge variant="outline">
          {value === "reassignment" && "PC Reassignment"}
          {value === "retirement" && "Device Retirement"}
          {value === "courier" && "Courier Request"}
          {value === "new_device" && "New Device"}
        </Badge>
      ),
    },
    {
      key: "title",
      label: "Title",
      render: (value: string) => <span className="font-medium">{value}</span>,
    },
    {
      key: "status",
      label: "Status",
      render: (value: string) => (
        <Badge
          variant={
            value === "completed"
              ? "default"
              : value === "in_progress"
              ? "secondary"
              : "outline"
          }
        >
          {value}
        </Badge>
      ),
    },
    {
      key: "priority",
      label: "Priority",
      render: (value: string) => (
        <Badge
          variant={
            value === "high"
              ? "destructive"
              : value === "medium"
              ? "default"
              : "secondary"
          }
        >
          {value}
        </Badge>
      ),
    },
    {
      key: "courier_tracking_number",
      label: "Tracking #",
      render: (value: string) => value || "-",
    },
    {
      key: "created_at",
      label: "Date",
      render: (value: string) => new Date(value).toLocaleDateString(),
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Maintenance & Logistics</h1>
            <p className="text-muted-foreground">
              Manage device reassignments, retirements, and courier bookings
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Request
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Maintenance Request</DialogTitle>
                <DialogDescription>
                  Select the type of request and fill in the details
                </DialogDescription>
              </DialogHeader>
              <RequestForm
                requestType={requestType}
                setRequestType={setRequestType}
                onSubmit={handleSubmitRequest}
              />
            </DialogContent>
          </Dialog>
        </div>

        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Courier Automation Recommendation</AlertTitle>
          <AlertDescription>
            For automated courier booking, I recommend using <strong>Zapier</strong> to connect with multiple courier platforms:
            <ul className="list-disc ml-6 mt-2 space-y-1">
              <li><strong>The Courier Guy</strong> - South African courier service</li>
              <li><strong>Aramex</strong> - International & local deliveries</li>
              <li><strong>DHL</strong> - Premium international shipping</li>
              <li><strong>Pargo</strong> - Collection points network</li>
            </ul>
            <p className="mt-2">
              Create a Zap that triggers when a courier request is created, then automatically books with your preferred courier service.
            </p>
          </AlertDescription>
        </Alert>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="requests" className="flex items-center gap-2">
              <List className="h-4 w-4" />
              All Requests
            </TabsTrigger>
            <TabsTrigger value="courier" className="flex items-center gap-2">
              <Truck className="h-4 w-4" />
              Courier Tracking
            </TabsTrigger>
          </TabsList>

          <TabsContent value="requests" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Maintenance Requests</CardTitle>
                <CardDescription>
                  View and manage all maintenance and logistics requests
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DataTable
                  data={requests || []}
                  columns={columns}
                  searchKeys={["title", "request_type", "status"]}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="courier" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Active Courier Shipments</CardTitle>
                <CardDescription>
                  Track courier bookings and deliveries
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DataTable
                  data={
                    requests?.filter((r) => r.request_type === "courier" && r.status !== "completed") || []
                  }
                  columns={columns}
                  searchKeys={["courier_tracking_number", "delivery_address"]}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

const RequestForm = ({ requestType, setRequestType, onSubmit }: any) => {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priority: "medium",
    device_serial: "",
    device_model: "",
    current_user_name: "",
    new_user_name: "",
    pickup_address: "",
    delivery_address: "",
    courier_platform: "",
    notes: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="requestType">Request Type *</Label>
        <Select value={requestType} onValueChange={setRequestType} required>
          <SelectTrigger>
            <SelectValue placeholder="Select request type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="reassignment">
              <div className="flex items-center gap-2">
                <ArrowRightLeft className="h-4 w-4" />
                PC Reassignment
              </div>
            </SelectItem>
            <SelectItem value="retirement">
              <div className="flex items-center gap-2">
                <Trash2 className="h-4 w-4" />
                Device Retirement
              </div>
            </SelectItem>
            <SelectItem value="courier">
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4" />
                Courier Request
              </div>
            </SelectItem>
            <SelectItem value="new_device">
              <div className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                New Device Setup
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="title">Title *</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="Brief description of the request"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) =>
            setFormData({ ...formData, description: e.target.value })
          }
          placeholder="Detailed information about the request"
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="priority">Priority</Label>
        <Select
          value={formData.priority}
          onValueChange={(value) =>
            setFormData({ ...formData, priority: value })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {(requestType === "reassignment" || requestType === "retirement") && (
        <>
          <div className="space-y-2">
            <Label htmlFor="device_serial">Device Serial Number</Label>
            <Input
              id="device_serial"
              value={formData.device_serial}
              onChange={(e) =>
                setFormData({ ...formData, device_serial: e.target.value })
              }
              placeholder="Serial number of the device"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="device_model">Device Model</Label>
            <Input
              id="device_model"
              value={formData.device_model}
              onChange={(e) =>
                setFormData({ ...formData, device_model: e.target.value })
              }
              placeholder="Model name/number"
            />
          </div>
        </>
      )}

      {requestType === "reassignment" && (
        <>
          <div className="space-y-2">
            <Label htmlFor="current_user">Current User</Label>
            <Input
              id="current_user"
              value={formData.current_user_name}
              onChange={(e) =>
                setFormData({ ...formData, current_user_name: e.target.value })
              }
              placeholder="Name of current user"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new_user">New User</Label>
            <Input
              id="new_user"
              value={formData.new_user_name}
              onChange={(e) =>
                setFormData({ ...formData, new_user_name: e.target.value })
              }
              placeholder="Name of new user"
            />
          </div>
        </>
      )}

      {(requestType === "courier" || requestType === "new_device") && (
        <>
          <div className="space-y-2">
            <Label htmlFor="courier_platform">Preferred Courier</Label>
            <Select
              value={formData.courier_platform}
              onValueChange={(value) =>
                setFormData({ ...formData, courier_platform: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select courier service" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="courier_guy">The Courier Guy</SelectItem>
                <SelectItem value="aramex">Aramex</SelectItem>
                <SelectItem value="dhl">DHL</SelectItem>
                <SelectItem value="pargo">Pargo</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="pickup_address">Pickup Address</Label>
            <Textarea
              id="pickup_address"
              value={formData.pickup_address}
              onChange={(e) =>
                setFormData({ ...formData, pickup_address: e.target.value })
              }
              placeholder="Full pickup address"
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="delivery_address">Delivery Address</Label>
            <Textarea
              id="delivery_address"
              value={formData.delivery_address}
              onChange={(e) =>
                setFormData({ ...formData, delivery_address: e.target.value })
              }
              placeholder="Full delivery address"
              rows={2}
            />
          </div>
        </>
      )}

      <div className="space-y-2">
        <Label htmlFor="notes">Additional Notes</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="Any additional information"
          rows={2}
        />
      </div>

      <Button type="submit" className="w-full">
        Submit Request
      </Button>
    </form>
  );
};

export default Maintenance;
