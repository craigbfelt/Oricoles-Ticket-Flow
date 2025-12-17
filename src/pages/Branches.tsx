import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Building2, MapPin, Phone, Mail, Upload, Download, Users as UsersIcon, Monitor, Network, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { branchSchema } from "@/lib/validations";

const Branches = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const usersFileInputRef = useRef<HTMLInputElement>(null);
  const devicesFileInputRef = useRef<HTMLInputElement>(null);
  const networkDevicesFileInputRef = useRef<HTMLInputElement>(null);
  const internetFileInputRef = useRef<HTMLInputElement>(null);
  const diagramFileInputRef = useRef<HTMLInputElement>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    city: "",
    state: "",
    postal_code: "",
    country: "",
    phone: "",
    email: "",
    notes: "",
  });

  const { data: branches, isLoading } = useQuery({
    queryKey: ["branches"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("branches")
        .select("*")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch statistics for all branches
  const { data: branchStats } = useQuery({
    queryKey: ["branch-statistics"],
    queryFn: async () => {
      if (!branches) return {};

      const stats: Record<string, { 
        users: number; 
        masterUsers: number;
        devices: number; 
        networkDevices: number;
        tickets: number;
        jobs: number;
      }> = {};

      for (const branch of branches) {
        // Count directory users (department field matches branch name)
        const { count: userCount } = await supabase
          .from("directory_users")
          .select("*", { count: "exact", head: true })
          .eq("department", branch.name);

        // Count master users (branch_id matches)
        const { count: masterUserCount } = await supabase
          .from("master_user_list")
          .select("*", { count: "exact", head: true })
          .eq("branch_id", branch.id);

        // Count hardware devices (branch field matches branch name)
        const { count: deviceCount } = await supabase
          .from("hardware_inventory")
          .select("*", { count: "exact", head: true })
          .eq("branch", branch.name);

        // Count network devices (branch_id matches)
        const { count: networkDeviceCount } = await supabase
          .from("network_devices")
          .select("*", { count: "exact", head: true })
          .eq("branch_id", branch.id);

        // Count tickets (branch field matches branch name)
        const { count: ticketCount } = await supabase
          .from("tickets")
          .select("*", { count: "exact", head: true })
          .eq("branch", branch.name);

        // Count jobs (branch_id matches)
        const { count: jobCount } = await supabase
          .from("jobs")
          .select("*", { count: "exact", head: true })
          .eq("branch_id", branch.id);

        stats[branch.id] = {
          users: userCount || 0,
          masterUsers: masterUserCount || 0,
          devices: deviceCount || 0,
          networkDevices: networkDeviceCount || 0,
          tickets: ticketCount || 0,
          jobs: jobCount || 0,
        };
      }

      return stats;
    },
    enabled: !!branches && branches.length > 0,
  });

  const createBranch = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from("branches").insert([data]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branches"] });
      setIsDialogOpen(false);
      setFormData({
        name: "",
        address: "",
        city: "",
        state: "",
        postal_code: "",
        country: "",
        phone: "",
        email: "",
        notes: "",
      });
      toast({
        title: "Success",
        description: "Branch created successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create branch",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form data
    const validationResult = branchSchema.safeParse(formData);
    if (!validationResult.success) {
      const errors = validationResult.error.errors.map(err => err.message).join(", ");
      toast({
        title: "Validation Error",
        description: errors,
        variant: "destructive",
      });
      return;
    }

    createBranch.mutate(validationResult.data as any);
  };

  const downloadCSVTemplate = () => {
    const headers = ["name", "address", "city", "state", "postal_code", "country", "phone", "email", "notes"];
    const example = ["Branch Name", "123 Main St", "City", "State", "12345", "Country", "+27 123 456 7890", "branch@company.com", "Notes"];
    const csv = [headers.join(","), example.join(",")].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "branches_template.csv";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const downloadUsersTemplate = () => {
    const headers = ["branch_name", "display_name", "email", "user_principal_name", "job_title", "department", "account_enabled"];
    const example = ["Durban", "John Doe", "john.doe@company.com", "john.doe@company.com", "Manager", "IT", "true"];
    const csv = [headers.join(","), example.join(",")].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "users_template.csv";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const downloadDevicesTemplate = () => {
    const headers = ["branch_name", "device_name", "device_type", "manufacturer", "model", "serial_number", "os", "os_version", "processor", "ram_gb", "storage_gb", "location", "status"];
    const example = ["Durban", "Laptop-001", "Laptop", "Dell", "Latitude 5520", "SN789456", "Windows 11", "23H2", "Intel Core i7", "16", "512", "Office", "active"];
    const csv = [headers.join(","), example.join(",")].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "devices_template.csv";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const downloadNetworkDevicesTemplate = () => {
    const headers = ["branch_name", "device_name", "device_type", "manufacturer", "model", "serial_number", "ip_address", "mac_address", "location", "status", "notes"];
    const example = ["Durban", "Office Printer 1", "printer", "HP", "LaserJet Pro", "SN123456", "192.168.1.100", "00:1A:2B:3C:4D:5E", "Floor 1", "active", "Main printer"];
    const csv = [headers.join(","), example.join(",")].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "network_devices_template.csv";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const downloadInternetTemplate = () => {
    const headers = ["branch_name", "isp", "connection_type", "bandwidth_mbps", "static_ip", "account_number", "support_contact", "support_phone", "support_email", "router_model", "router_serial", "monthly_cost", "notes"];
    const example = ["Durban", "VOX", "Fiber", "100/100", "192.168.1.1", "VOX123456", "VOX Support", "+27 11 123 4567", "support@vox.co.za", "MikroTik RB4011", "SN123456789", "1500", "Main connection"];
    const csv = [headers.join(","), example.join(",")].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "internet_connectivity_template.csv";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleCSVImport = async () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) return;

    const text = await file.text();
    const lines = text.split("\n").filter((line) => line.trim());
    const headers = lines[0].split(",").map((h) => h.trim());
    const rows = lines.slice(1);

    const data = rows.map((row) => {
      const values = row.split(",").map((v) => v.trim());
      const obj: any = {};
      headers.forEach((header, i) => {
        obj[header] = values[i] || null;
      });
      return obj;
    });

    try {
      const { error } = await supabase.from("branches").insert(data);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["branches"] });
      toast({
        title: "Success",
        description: `${data.length} branches imported successfully`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to import CSV",
        variant: "destructive",
      });
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleUsersImport = async () => {
    const file = usersFileInputRef.current?.files?.[0];
    if (!file) return;

    const text = await file.text();
    const lines = text.split("\n").filter((line) => line.trim());
    const headers = lines[0].split(",").map((h) => h.trim());
    const rows = lines.slice(1);

    const data = rows.map((row) => {
      const values = row.split(",").map((v) => v.trim());
      const obj: any = {};
      headers.forEach((header, i) => {
        if (header === "account_enabled") {
          obj[header] = values[i]?.toLowerCase() === "true";
        } else {
          obj[header] = values[i] || null;
        }
      });
      return obj;
    });

    try {
      // Remove branch_name from the data and use department field instead
      const usersData = data.map(({ branch_name, ...rest }) => ({
        ...rest,
        department: branch_name,
      }));

      const { error } = await supabase.from("directory_users").insert(usersData);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["directory_users"] });
      toast({
        title: "Success",
        description: `${data.length} users imported and assigned to branches successfully`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to import users CSV",
        variant: "destructive",
      });
    }

    if (usersFileInputRef.current) {
      usersFileInputRef.current.value = "";
    }
  };

  const handleDevicesImport = async () => {
    const file = devicesFileInputRef.current?.files?.[0];
    if (!file) return;

    const text = await file.text();
    const lines = text.split("\n").filter((line) => line.trim());
    const headers = lines[0].split(",").map((h) => h.trim());
    const rows = lines.slice(1);

    const data = rows.map((row) => {
      const values = row.split(",").map((v) => v.trim());
      const obj: any = {};
      headers.forEach((header, i) => {
        if (header === "ram_gb" || header === "storage_gb") {
          obj[header] = values[i] ? parseInt(values[i]) : null;
        } else {
          obj[header] = values[i] || null;
        }
      });
      return obj;
    });

    try {
      // Remove branch_name from the data and use branch field instead
      const devicesData = data.map(({ branch_name, ...rest }) => ({
        ...rest,
        branch: branch_name,
      }));

      const { error } = await supabase.from("hardware_inventory").insert(devicesData);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["hardware"] });
      toast({
        title: "Success",
        description: `${data.length} devices imported and assigned to branches successfully`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to import devices CSV",
        variant: "destructive",
      });
    }

    if (devicesFileInputRef.current) {
      devicesFileInputRef.current.value = "";
    }
  };

  const handleNetworkDevicesImport = async () => {
    const file = networkDevicesFileInputRef.current?.files?.[0];
    if (!file) return;

    const text = await file.text();
    const lines = text.split("\n").filter((line) => line.trim());
    const headers = lines[0].split(",").map((h) => h.trim());
    const rows = lines.slice(1);

    const branchMap = new Map(branches?.map(b => [b.name, b.id]) || []);

    const data = rows.map((row) => {
      const values = row.split(",").map((v) => v.trim());
      const obj: any = {};
      headers.forEach((header, i) => {
        obj[header] = values[i] || null;
      });
      return obj;
    });

    try {
      // Map branch_name to branch_id
      const networkDevicesData = data
        .map(({ branch_name, ...rest }) => {
          const branchId = branchMap.get(branch_name);
          if (!branchId) {
            console.warn(`Branch "${branch_name}" not found, skipping device`);
            return null;
          }
          return {
            ...rest,
            branch_id: branchId,
          };
        })
        .filter(item => item !== null);

      if (networkDevicesData.length === 0) {
        throw new Error("No valid devices to import. Please check branch names.");
      }

      const { error } = await supabase.from("network_devices").insert(networkDevicesData);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["network_devices"] });
      toast({
        title: "Success",
        description: `${networkDevicesData.length} network devices imported and assigned to branches successfully`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to import network devices CSV",
        variant: "destructive",
      });
    }

    if (networkDevicesFileInputRef.current) {
      networkDevicesFileInputRef.current.value = "";
    }
  };

  const handleInternetImport = async () => {
    const file = internetFileInputRef.current?.files?.[0];
    if (!file) return;

    const text = await file.text();
    const lines = text.split("\n").filter((line) => line.trim());
    const headers = lines[0].split(",").map((h) => h.trim());
    const rows = lines.slice(1);

    const branchMap = new Map(branches?.map(b => [b.name, b.id]) || []);

    const data = rows.map((row) => {
      const values = row.split(",").map((v) => v.trim());
      const obj: any = {};
      headers.forEach((header, i) => {
        if (header === "monthly_cost") {
          obj[header] = values[i] ? parseFloat(values[i]) : null;
        } else {
          obj[header] = values[i] || null;
        }
      });
      return obj;
    });

    try {
      // Map branch_name to branch_id
      const internetData = data
        .map(({ branch_name, ...rest }) => {
          const branchId = branchMap.get(branch_name);
          if (!branchId) {
            console.warn(`Branch "${branch_name}" not found, skipping internet connection`);
            return null;
          }
          return {
            ...rest,
            branch_id: branchId,
          };
        })
        .filter(item => item !== null);

      if (internetData.length === 0) {
        throw new Error("No valid internet connections to import. Please check branch names.");
      }

      const { error } = await supabase.from("internet_connectivity").insert(internetData);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["internet_connectivity"] });
      toast({
        title: "Success",
        description: `${internetData.length} internet connections imported and assigned to branches successfully`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to import internet connectivity CSV",
        variant: "destructive",
      });
    }

    if (internetFileInputRef.current) {
      internetFileInputRef.current.value = "";
    }
  };

  const handleDiagramImport = async () => {
    const file = diagramFileInputRef.current?.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const lines = text.split("\n").filter((line) => line.trim());
      const headers = lines[0].split(",").map((h) => h.trim());
      const rows = lines.slice(1);

      const branchMap = new Map(branches?.map(b => [b.name, b.id]) || []);

      const data = rows.map((row) => {
        const values = row.split(",").map((v) => v.trim());
        const obj: any = {};
        headers.forEach((header, i) => {
          obj[header] = values[i] || null;
        });
        return obj;
      });

      const { data: { user } } = await supabase.auth.getUser();
      const diagrams = data
        .map(({ branch_name, diagram_name, description, ...rest }) => {
          const branchId = branchMap.get(branch_name);
          if (!branchId) {
            console.warn(`Branch "${branch_name}" not found, skipping diagram`);
            return null;
          }
          return {
            branch_id: branchId,
            name: diagram_name,
            description: description || null,
            diagram_json: rest,
            is_company_wide: false,
            created_by: user?.id,
          };
        })
        .filter(item => item !== null);

      if (diagrams.length === 0) {
        throw new Error("No valid diagrams to import. Please check branch names.");
      }

      const { error } = await (supabase as any).from("network_diagrams").insert(diagrams);
      if (error) throw error;

      toast({
        title: "Success",
        description: `${diagrams.length} network diagrams imported successfully`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to import network diagrams",
        variant: "destructive",
      });
    }

    if (diagramFileInputRef.current) {
      diagramFileInputRef.current.value = "";
    }
  };

  const downloadDiagramTemplate = () => {
    const headers = ["branch_name", "diagram_name", "description"];
    const example = ["Durban", "Main Office Network", "Network topology for main office"];
    const csv = [headers.join(","), example.join(",")].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "network_diagrams_template.csv";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const exportToCSV = () => {
    if (!branches || branches.length === 0) {
      toast({
        title: "No data",
        description: "No branches to export",
        variant: "destructive",
      });
      return;
    }

    const headers = ["name", "address", "city", "state", "postal_code", "country", "phone", "email", "notes"];
    const csv = [
      headers.join(","),
      ...branches.map((branch) => 
        headers.map((header) => branch[header as keyof typeof branch] || "").join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "branches.csv";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <DashboardLayout>
      <div className="p-6">
        {/* Back Navigation */}
        <div className="mb-4">
          <Button variant="ghost" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-foreground">Branches</h1>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={downloadCSVTemplate}>
              <Download className="w-4 h-4 mr-2" />
              Branch Template
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleCSVImport}
            />
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
              <Upload className="w-4 h-4 mr-2" />
              Import Branches
            </Button>
            
            <Button variant="outline" size="sm" onClick={downloadUsersTemplate}>
              <Download className="w-4 h-4 mr-2" />
              Users Template
            </Button>
            <input
              ref={usersFileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleUsersImport}
            />
            <Button variant="outline" size="sm" onClick={() => usersFileInputRef.current?.click()}>
              <Upload className="w-4 h-4 mr-2" />
              Import Users
            </Button>
            
            <Button variant="outline" size="sm" onClick={downloadDevicesTemplate}>
              <Download className="w-4 h-4 mr-2" />
              Devices Template
            </Button>
            <input
              ref={devicesFileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleDevicesImport}
            />
            <Button variant="outline" size="sm" onClick={() => devicesFileInputRef.current?.click()}>
              <Upload className="w-4 h-4 mr-2" />
              Import Devices
            </Button>
            
            <Button variant="outline" size="sm" onClick={downloadNetworkDevicesTemplate}>
              <Download className="w-4 h-4 mr-2" />
              Network Template
            </Button>
            <input
              ref={networkDevicesFileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleNetworkDevicesImport}
            />
            <Button variant="outline" size="sm" onClick={() => networkDevicesFileInputRef.current?.click()}>
              <Upload className="w-4 h-4 mr-2" />
              Import Network
            </Button>
            
            <Button variant="outline" size="sm" onClick={downloadInternetTemplate}>
              <Download className="w-4 h-4 mr-2" />
              Internet Template
            </Button>
            <input
              ref={internetFileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleInternetImport}
            />
            <Button variant="outline" size="sm" onClick={() => internetFileInputRef.current?.click()}>
              <Upload className="w-4 h-4 mr-2" />
              Import Internet
            </Button>
            
            <Button variant="outline" size="sm" onClick={downloadDiagramTemplate}>
              <Download className="w-4 h-4 mr-2" />
              Diagram Template
            </Button>
            <input
              ref={diagramFileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleDiagramImport}
            />
            <Button variant="outline" size="sm" onClick={() => diagramFileInputRef.current?.click()}>
              <Upload className="w-4 h-4 mr-2" />
              Import Diagrams
            </Button>
            
            <Button variant="outline" size="sm" onClick={exportToCSV}>
              <Download className="w-4 h-4 mr-2" />
              Export Branches
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Branch
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add New Branch</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="name">Branch Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="state">State</Label>
                      <Input
                        id="state"
                        value={formData.state}
                        onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="postal_code">Postal Code</Label>
                      <Input
                        id="postal_code"
                        value={formData.postal_code}
                        onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="country">Country</Label>
                      <Input
                        id="country"
                        value={formData.country}
                        onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createBranch.isPending}>
                      {createBranch.isPending ? "Creating..." : "Create Branch"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center text-muted-foreground">Loading branches...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {branches?.map((branch) => {
              const stats = branchStats?.[branch.id];
              return (
                <Card
                  key={branch.id}
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => navigate(`/branches/${branch.id}`)}
                >
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-primary" />
                      {branch.name}
                    </CardTitle>
                    {branch.city && (
                      <CardDescription>{branch.city}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Statistics */}
                    {stats && (
                      <div className="grid grid-cols-3 gap-2 p-3 bg-muted/50 rounded-lg">
                        <div className="text-center">
                          <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                            <UsersIcon className="w-3 h-3" />
                          </div>
                          <div className="text-lg font-bold text-foreground">{stats.masterUsers}</div>
                          <div className="text-xs text-muted-foreground">Master Users</div>
                        </div>
                        <div className="text-center">
                          <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                            <Monitor className="w-3 h-3" />
                          </div>
                          <div className="text-lg font-bold text-foreground">{stats.devices}</div>
                          <div className="text-xs text-muted-foreground">Devices</div>
                        </div>
                        <div className="text-center">
                          <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                            <Network className="w-3 h-3" />
                          </div>
                          <div className="text-lg font-bold text-foreground">{stats.networkDevices}</div>
                          <div className="text-xs text-muted-foreground">Network</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-foreground">{stats.tickets}</div>
                          <div className="text-xs text-muted-foreground">Tickets</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-foreground">{stats.jobs}</div>
                          <div className="text-xs text-muted-foreground">Jobs</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-foreground">{stats.users}</div>
                          <div className="text-xs text-muted-foreground">Dir Users</div>
                        </div>
                      </div>
                    )}

                    {/* Contact Info */}
                    <div className="space-y-2">
                      {branch.address && (
                        <div className="flex items-start gap-2 text-sm text-muted-foreground">
                          <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          <span>
                            {branch.address}
                            {branch.city && `, ${branch.city}`}
                            {branch.state && `, ${branch.state}`}
                          </span>
                        </div>
                      )}
                      {branch.phone && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Phone className="w-4 h-4 flex-shrink-0" />
                          <span>{branch.phone}</span>
                        </div>
                      )}
                      {branch.email && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Mail className="w-4 h-4 flex-shrink-0" />
                          <span className="truncate">{branch.email}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Branches;
