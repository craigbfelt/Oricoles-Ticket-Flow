import { useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Truck, List, MapPin, Info, ArrowLeft } from "lucide-react";
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

const Logistics = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("courier");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  const { data: courierRequests, refetch } = useQuery({
    queryKey: ["courier-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("maintenance_requests")
        .select("*")
        .in("request_type", ["courier", "new_device"])
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const handleSubmitCourierRequest = async (formData: any) => {
    const { error } = await supabase.from("maintenance_requests").insert({
      ...formData,
      request_type: "courier",
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
      title: "Courier request submitted",
      description: "Your courier booking request has been created successfully.",
    });

    setIsDialogOpen(false);
    refetch();
  };

  const courierColumns = [
    {
      key: "title",
      label: "Description",
      render: (value: string) => <span className="font-medium">{value}</span>,
    },
    {
      key: "courier_platform",
      label: "Courier",
      render: (value: string) => {
        const courierNames: Record<string, string> = {
          courier_guy: "The Courier Guy",
          aramex: "Aramex",
          dhl: "DHL",
          pargo: "Pargo",
          other: "Other",
        };
        return <Badge variant="outline">{courierNames[value] || value || "-"}</Badge>;
      },
    },
    {
      key: "courier_tracking_number",
      label: "Tracking #",
      render: (value: string) => value || "-",
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
      key: "courier_status",
      label: "Courier Status",
      render: (value: string) => value || "Pending",
    },
    {
      key: "pickup_address",
      label: "Pickup",
      render: (value: string) => (
        <span className="text-sm truncate max-w-[200px] block">
          {value || "-"}
        </span>
      ),
    },
    {
      key: "delivery_address",
      label: "Delivery",
      render: (value: string) => (
        <span className="text-sm truncate max-w-[200px] block">
          {value || "-"}
        </span>
      ),
    },
    {
      key: "created_at",
      label: "Created",
      render: (value: string) => new Date(value).toLocaleDateString(),
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        {/* Back Navigation */}
        <div>
          <Button variant="ghost" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Logistics & Courier Management</h1>
            <p className="text-muted-foreground">
              Manage courier bookings, shipments, and device deliveries
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Courier Request
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Courier Request</DialogTitle>
                <DialogDescription>
                  Book a courier for device delivery or pickup
                </DialogDescription>
              </DialogHeader>
              <CourierRequestForm onSubmit={handleSubmitCourierRequest} />
            </DialogContent>
          </Dialog>
        </div>

        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Courier Automation with Zapier</AlertTitle>
          <AlertDescription>
            <p className="mb-2">
              Automate courier bookings by connecting to these South African courier platforms:
            </p>
            <ul className="list-disc ml-6 space-y-1">
              <li><strong>The Courier Guy</strong> - Reliable local courier service with competitive rates</li>
              <li><strong>Aramex</strong> - International & domestic deliveries</li>
              <li><strong>DHL</strong> - Premium international shipping</li>
              <li><strong>Pargo</strong> - Collection points network across SA</li>
            </ul>
            <p className="mt-2 text-sm">
              💡 Tip: Create a Zap that automatically books with your preferred courier when a request is created.
            </p>
          </AlertDescription>
        </Alert>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="courier" className="flex items-center gap-2">
              <Truck className="h-4 w-4" />
              Active Shipments
            </TabsTrigger>
            <TabsTrigger value="completed" className="flex items-center gap-2">
              <List className="h-4 w-4" />
              Completed
            </TabsTrigger>
            <TabsTrigger value="all" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              All Requests
            </TabsTrigger>
          </TabsList>

          <TabsContent value="courier" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Active Courier Shipments</CardTitle>
                <CardDescription>
                  Track ongoing courier deliveries and pickups
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DataTable
                  data={
                    courierRequests?.filter(
                      (r) => r.status !== "completed" && r.status !== "cancelled"
                    ) || []
                  }
                  columns={courierColumns}
                  searchKeys={["title", "courier_tracking_number", "delivery_address"]}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="completed" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Completed Shipments</CardTitle>
                <CardDescription>
                  View completed and cancelled courier requests
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DataTable
                  data={
                    courierRequests?.filter(
                      (r) => r.status === "completed" || r.status === "cancelled"
                    ) || []
                  }
                  columns={courierColumns}
                  searchKeys={["title", "courier_tracking_number", "delivery_address"]}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="all" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>All Courier Requests</CardTitle>
                <CardDescription>
                  Complete history of all courier and logistics requests
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DataTable
                  data={courierRequests || []}
                  columns={courierColumns}
                  searchKeys={["title", "courier_tracking_number", "delivery_address", "pickup_address"]}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

const CourierRequestForm = ({ onSubmit }: any) => {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priority: "medium",
    courier_platform: "",
    pickup_address: "",
    delivery_address: "",
    notes: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">Request Title *</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="e.g., Device delivery to new staff member"
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
          placeholder="Details about the shipment"
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="courier_platform">Preferred Courier *</Label>
        <Select
          value={formData.courier_platform}
          onValueChange={(value) =>
            setFormData({ ...formData, courier_platform: value })
          }
          required
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
        <Label htmlFor="pickup_address">Pickup Address *</Label>
        <Textarea
          id="pickup_address"
          value={formData.pickup_address}
          onChange={(e) =>
            setFormData({ ...formData, pickup_address: e.target.value })
          }
          placeholder="Full pickup address including postal code"
          rows={2}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="delivery_address">Delivery Address *</Label>
        <Textarea
          id="delivery_address"
          value={formData.delivery_address}
          onChange={(e) =>
            setFormData({ ...formData, delivery_address: e.target.value })
          }
          placeholder="Full delivery address including postal code"
          rows={2}
          required
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
            <SelectItem value="high">High - Urgent</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Additional Notes</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="Special instructions, package contents, etc."
          rows={2}
        />
      </div>

      <Button type="submit" className="w-full">
        Submit Courier Request
      </Button>
    </form>
  );
};

export default Logistics;
