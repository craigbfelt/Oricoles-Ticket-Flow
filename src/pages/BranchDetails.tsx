import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Upload, Download, Plus, Trash2, Image as ImageIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DataTable, Column } from "@/components/DataTable";
import { ImportHistory } from "@/components/ImportHistory";
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

const BranchDetails = () => {
  const { branchId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentTab, setCurrentTab] = useState("overview");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const devicesFileInputRef = useRef<HTMLInputElement>(null);
  const usersFileInputRef = useRef<HTMLInputElement>(null);
  const internetFileInputRef = useRef<HTMLInputElement>(null);
  const diagramFileInputRef = useRef<HTMLInputElement>(null);
  const diagramImageInputRef = useRef<HTMLInputElement>(null);
  const [isNetworkDeviceDialogOpen, setIsNetworkDeviceDialogOpen] = useState(false);
  const [isInternetDialogOpen, setIsInternetDialogOpen] = useState(false);
  const [isAddDiagramDialogOpen, setIsAddDiagramDialogOpen] = useState(false);
  const [isImageUploadDialogOpen, setIsImageUploadDialogOpen] = useState(false);
  const [selectedDiagramImage, setSelectedDiagramImage] = useState<File | null>(null);
  const [diagramImagePreview, setDiagramImagePreview] = useState<string | null>(null);
  const [internetForm, setInternetForm] = useState({
    isp: "VOX",
    connection_type: "",
    bandwidth_mbps: "",
    static_ip: "",
    account_number: "",
    support_contact: "",
    support_phone: "",
    support_email: "",
    router_model: "",
    router_serial: "",
    monthly_cost: "",
    notes: "",
  });
  const [networkDeviceForm, setNetworkDeviceForm] = useState({
    device_name: "",
    device_type: "printer",
    manufacturer: "",
    model: "",
    serial_number: "",
    ip_address: "",
    mac_address: "",
    location: "",
    status: "active",
    notes: "",
  });
  const [diagramForm, setDiagramForm] = useState({
    diagram_name: "",
    description: "",
  });
  const [imageFormData, setImageFormData] = useState({
    diagram_name: "",
    description: "",
  });

  // Fetch branch details
  const { data: branch } = useQuery({
    queryKey: ["branch", branchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("branches")
        .select("*")
        .eq("id", branchId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  // Fetch hardware inventory for this branch
  const { data: hardwareDevices } = useQuery({
    queryKey: ["hardware", branchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hardware_inventory")
        .select("*")
        .eq("branch", branch?.name);
      if (error) throw error;
      return data;
    },
    enabled: !!branch?.name,
  });

  // Fetch directory users for this branch
  const { data: directoryUsers } = useQuery({
    queryKey: ["directory_users", branchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("directory_users")
        .select("*")
        .eq("department", branch?.name);
      if (error) throw error;
      return data;
    },
    enabled: !!branch?.name,
  });

  // Fetch master user list for this branch
  const { data: masterUsers } = useQuery({
    queryKey: ["master_users", branchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("master_user_list")
        .select("*")
        .eq("branch_id", branchId);
      if (error) throw error;
      return data;
    },
  });

  // Fetch network devices
  const { data: networkDevices } = useQuery({
    queryKey: ["network_devices", branchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("network_devices")
        .select("*")
        .eq("branch_id", branchId);
      if (error) throw error;
      return data;
    },
  });

  // Fetch network diagrams
  const { data: networkDiagrams } = useQuery({
    queryKey: ["network_diagrams", branchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("network_diagrams")
        .select("*")
        .eq("branch_id", branchId);
      if (error) throw error;
      return data;
    },
  });

  // Fetch internet connectivity
  const { data: internetConnectivity } = useQuery({
    queryKey: ["internet_connectivity", branchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("internet_connectivity")
        .select("*")
        .eq("branch_id", branchId);
      if (error) throw error;
      return data;
    },
  });

  // Fetch jobs/migrations for this branch
  const { data: branchJobs } = useQuery({
    queryKey: ["branch_jobs", branchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select("*")
        .eq("branch_id", branchId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch tickets for this branch
  const { data: branchTickets } = useQuery({
    queryKey: ["branch_tickets", branchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tickets")
        .select("*")
        .eq("branch", branch?.name)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!branch?.name,
  });

  const createNetworkDevice = useMutation({
    mutationFn: async (data: typeof networkDeviceForm) => {
      const { error } = await supabase.from("network_devices").insert([
        {
          ...data,
          branch_id: branchId,
        },
      ]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["network_devices", branchId] });
      setIsNetworkDeviceDialogOpen(false);
      setNetworkDeviceForm({
        device_name: "",
        device_type: "printer",
        manufacturer: "",
        model: "",
        serial_number: "",
        ip_address: "",
        mac_address: "",
        location: "",
        status: "active",
        notes: "",
      });
      toast({
        title: "Success",
        description: "Network device added successfully",
      });
    },
  });

  const createInternetConnectivity = useMutation({
    mutationFn: async (data: typeof internetForm) => {
      const { error } = await supabase.from("internet_connectivity").insert([
        {
          ...data,
          branch_id: branchId,
          monthly_cost: data.monthly_cost ? parseFloat(data.monthly_cost) : null,
        },
      ]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["internet_connectivity", branchId] });
      setIsInternetDialogOpen(false);
      setInternetForm({
        isp: "VOX",
        connection_type: "",
        bandwidth_mbps: "",
        static_ip: "",
        account_number: "",
        support_contact: "",
        support_phone: "",
        support_email: "",
        router_model: "",
        router_serial: "",
        monthly_cost: "",
        notes: "",
      });
      toast({
        title: "Success",
        description: "Internet connectivity added successfully",
      });
    },
  });

  const createNetworkDiagram = useMutation({
    mutationFn: async (data: typeof diagramForm) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await (supabase as any).from("network_diagrams").insert([
        {
          branch_id: branchId,
          name: data.diagram_name,
          image_path: '',
          description: data.description || null,
          created_by: user?.id,
          is_company_wide: false
        }
      ]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["network_diagrams", branchId] });
      setIsAddDiagramDialogOpen(false);
      setDiagramForm({
        diagram_name: "",
        description: "",
      });
      toast({
        title: "Success",
        description: "Network diagram added successfully",
      });
    },
  });

  const uploadDiagramImage = useMutation({
    mutationFn: async (data: typeof imageFormData & { imagePath: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await (supabase as any).from("network_diagrams").insert([{
        branch_id: branchId,
        name: data.diagram_name,
        image_path: (data as any).imagePath || '',
        description: data.description || null,
        created_by: user?.id,
        is_company_wide: false
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["network_diagrams", branchId] });
      toast({
        title: "Success",
        description: "Network diagram image uploaded successfully",
      });
      setIsImageUploadDialogOpen(false);
      setImageFormData({ diagram_name: "", description: "" });
      setSelectedDiagramImage(null);
      setDiagramImagePreview(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleDiagramImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/png', 'image/jpeg', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a PNG, JPG, or JPEG image",
        variant: "destructive",
      });
      return;
    }

    setSelectedDiagramImage(file);
    
    const reader = new FileReader();
    reader.onloadend = () => {
      setDiagramImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDiagramImageUpload = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedDiagramImage) {
      toast({
        title: "Error",
        description: "Please select an image to upload",
        variant: "destructive",
      });
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to upload files",
        variant: "destructive",
      });
      return;
    }

    const fileExt = selectedDiagramImage.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `branch-diagrams/${branchId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('diagrams')
      .upload(filePath, selectedDiagramImage, {
        metadata: {
          owner: user.id
        }
      });

    if (uploadError) {
      toast({
        title: "Error",
        description: `Failed to upload image: ${uploadError.message}`,
        variant: "destructive",
      });
      return;
    }

    uploadDiagramImage.mutate({ ...imageFormData, imagePath: filePath });
  };

  const downloadCSVTemplate = (type: string) => {
    let headers: string[];
    let example: string[];

    if (type === "network_devices") {
      headers = ["device_name", "device_type", "manufacturer", "model", "serial_number", "ip_address", "mac_address", "location", "status", "notes"];
      example = ["Office Printer 1", "printer", "HP", "LaserJet Pro", "SN123456", "192.168.1.100", "00:1A:2B:3C:4D:5E", "Floor 1", "active", "Main printer"];
    } else if (type === "users") {
      headers = ["display_name", "email", "user_principal_name", "job_title", "department", "account_enabled"];
      example = ["John Doe", "john.doe@company.com", "john.doe@company.com", "Manager", branch?.name || "", "true"];
    } else if (type === "devices") {
      headers = ["device_name", "device_type", "manufacturer", "model", "serial_number", "os", "os_version", "processor", "ram_gb", "storage_gb", "branch", "location", "status"];
      example = ["Laptop-001", "Laptop", "Dell", "Latitude 5520", "SN789456", "Windows 11", "23H2", "Intel Core i7", "16", "512", branch?.name || "", "Office", "active"];
    } else if (type === "internet") {
      headers = ["isp", "connection_type", "bandwidth_mbps", "static_ip", "account_number", "support_contact", "support_phone", "support_email", "router_model", "router_serial", "monthly_cost", "notes"];
      example = ["VOX", "Fiber", "100/100", "192.168.1.1", "VOX123456", "VOX Support", "+27 11 123 4567", "support@vox.co.za", "MikroTik RB4011", "SN123456789", "1500", "Main connection"];
    } else {
      headers = ["device_name", "manufacturer", "model", "serial_number", "ip_address", "mac_address"];
      example = ["Device 1", "Dell", "Model X", "SN123", "192.168.1.1", "00:1A:2B:3C:4D:5E"];
    }

    const csv = [headers.join(","), example.join(",")].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${type}_template.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleCSVImport = async (type: string) => {
    let file: File | undefined;
    
    if (type === "network_devices") {
      file = fileInputRef.current?.files?.[0];
    } else if (type === "users") {
      file = usersFileInputRef.current?.files?.[0];
    } else if (type === "devices") {
      file = devicesFileInputRef.current?.files?.[0];
    } else if (type === "internet") {
      file = internetFileInputRef.current?.files?.[0];
    }
    
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
        } else if (header === "ram_gb" || header === "storage_gb") {
          obj[header] = values[i] ? parseInt(values[i]) : null;
        } else if (header === "monthly_cost") {
          obj[header] = values[i] ? parseFloat(values[i]) : null;
        } else {
          obj[header] = values[i] || null;
        }
      });
      
      if (type === "network_devices") {
        obj.branch_id = branchId;
      } else if (type === "users") {
        obj.department = branch?.name;
      } else if (type === "devices") {
        obj.branch = branch?.name;
      } else if (type === "internet") {
        obj.branch_id = branchId;
      }
      
      return obj;
    });

    try {
      // Create import job record
      const { data: { user } } = await supabase.auth.getUser();
      const { data: importJob, error: jobError } = await supabase
        .from("import_jobs")
        .insert([{
          branch_id: branchId,
          uploader: user?.id,
          import_type: "csv",
          resource_type: type,
          status: "processing",
        }])
        .select()
        .single();

      if (jobError) {
        console.error("Failed to create import job:", jobError);
      }

      if (type === "network_devices") {
        const { error } = await supabase.from("network_devices").insert(data);
        if (error) throw error;
        queryClient.invalidateQueries({ queryKey: ["network_devices", branchId] });
      } else if (type === "users") {
        const { error } = await supabase.from("directory_users").insert(data);
        if (error) throw error;
        queryClient.invalidateQueries({ queryKey: ["directory_users", branchId] });
      } else if (type === "devices") {
        const { error } = await supabase.from("hardware_inventory").insert(data);
        if (error) throw error;
        queryClient.invalidateQueries({ queryKey: ["hardware", branchId] });
      } else if (type === "internet") {
        const { error } = await supabase.from("internet_connectivity").insert(data);
        if (error) throw error;
        queryClient.invalidateQueries({ queryKey: ["internet_connectivity", branchId] });
      }
      
      // Update import job status to completed
      if (importJob) {
        await supabase
          .from("import_jobs")
          .update({
            status: "completed",
            result_summary: JSON.stringify({ records_imported: data.length }),
          } as any)
          .eq("id", importJob.id);
        queryClient.invalidateQueries({ queryKey: ["import-jobs", branchId] });
      }

      toast({
        title: "Success",
        description: `${data.length} records imported successfully`,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to import CSV";
      
      // Update import job status to failed
      const { data: { user } } = await supabase.auth.getUser();
      const { data: failedJobs } = await supabase
        .from("import_jobs")
        .select("*")
        .eq("uploader", user?.id)
        .eq("status", "processing")
        .order("created_at", { ascending: false })
        .limit(1);

      if (failedJobs && failedJobs.length > 0) {
        await supabase
          .from("import_jobs")
          .update({
            status: "failed",
            error_details: errorMessage,
          })
          .eq("id", failedJobs[0].id);
        queryClient.invalidateQueries({ queryKey: ["import-jobs", branchId] });
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }

    // Clear file inputs
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (usersFileInputRef.current) usersFileInputRef.current.value = "";
    if (devicesFileInputRef.current) devicesFileInputRef.current.value = "";
    if (internetFileInputRef.current) internetFileInputRef.current.value = "";
  };

  const handleDiagramImport = async () => {
    const file = diagramFileInputRef.current?.files?.[0];
    if (!file) return;

    // Get current user for authentication and import job tracking
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to import network diagrams",
        variant: "destructive",
      });
      return;
    }

    try {
      // Create import job record
      const { data: importJob, error: jobError } = await supabase
        .from("import_jobs")
        .insert([{
          branch_id: branchId,
          uploader: user.id,
          import_type: "network_json",
          resource_type: "network_diagram",
          status: "processing",
        }])
        .select()
        .single();

      if (jobError) {
        console.error("Failed to create import job:", jobError);
      }

      const text = await file.text();
      const diagramData = JSON.parse(text);

      // Insert the diagram
      const { error} = await (supabase as any).from("network_diagrams").insert([
        {
          branch_id: branchId,
          name: diagramData.name || file.name.replace('.json', ''),
          image_path: '',
          description: diagramData.description || null,
          created_by: user.id,
          is_company_wide: false
        },
      ]);

      if (error) throw error;

      // Update import job status to completed
      if (importJob) {
        await (supabase as any)
          .from("import_jobs")
          .update({
            status: "completed",
            result_summary: JSON.stringify({ diagram_imported: true }),
          })
          .eq("id", importJob.id);
        queryClient.invalidateQueries({ queryKey: ["import-jobs", branchId] });
      }

      queryClient.invalidateQueries({ queryKey: ["network_diagrams", branchId] });
      toast({
        title: "Success",
        description: "Network diagram imported successfully",
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to import diagram";
      
      // Update import job status to failed
      const { data: failedJobs } = await supabase
        .from("import_jobs")
        .select("*")
        .eq("uploader", user.id)
        .eq("status", "processing")
        .order("created_at", { ascending: false })
        .limit(1);

      if (failedJobs && failedJobs.length > 0) {
        await supabase
          .from("import_jobs")
          .update({
            status: "failed",
            error_details: errorMessage,
          })
          .eq("id", failedJobs[0].id);
        queryClient.invalidateQueries({ queryKey: ["import-jobs", branchId] });
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }

    if (diagramFileInputRef.current) {
      diagramFileInputRef.current.value = "";
    }
  };

  const downloadDiagramTemplate = () => {
    const template = {
      name: "Sample Network Diagram",
      description: "Example network diagram for this branch",
      diagram_json: {
        nodes: [
          { id: "node1", label: "Router", type: "router", x: 100, y: 100 },
          { id: "node2", label: "Switch", type: "switch", x: 200, y: 100 },
        ],
        edges: [
          { from: "node1", to: "node2" },
        ],
      },
    };
    
    const dataStr = JSON.stringify(template, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "network_diagram_template.json";
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast({
      title: "Template downloaded",
      description: "Network diagram template has been downloaded",
    });
  };

  const exportToCSV = (data: any[], filename: string) => {
    if (!data || data.length === 0) {
      toast({
        title: "No data",
        description: "No data to export",
        variant: "destructive",
      });
      return;
    }

    const headers = Object.keys(data[0]).filter((key) => key !== "id" && key !== "branch_id");
    const csv = [
      headers.join(","),
      ...data.map((row) => headers.map((header) => row[header] || "").join(",")),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const hardwareColumns: Column<any>[] = [
    { key: "device_name", label: "Device Name", sortable: true },
    { key: "device_type", label: "Type", sortable: true },
    { key: "manufacturer", label: "Manufacturer", sortable: true },
    { key: "model", label: "Model", sortable: true },
    { key: "serial_number", label: "Serial Number", sortable: true },
    { key: "assigned_to", label: "Assigned To", sortable: true },
    { key: "status", label: "Status", sortable: true },
  ];

  const usersColumns: Column<any>[] = [
    { key: "display_name", label: "Name", sortable: true },
    { key: "email", label: "Email", sortable: true },
    { key: "job_title", label: "Job Title", sortable: true },
    { key: "department", label: "Department", sortable: true },
  ];

  const masterUsersColumns: Column<any>[] = [
    { key: "display_name", label: "Name", sortable: true },
    { key: "email", label: "Email", sortable: true },
    { key: "job_title", label: "Job Title", sortable: true },
    { key: "department", label: "Department", sortable: true },
    { key: "vpn_username", label: "VPN Username", sortable: true },
    { key: "rdp_username", label: "RDP Username", sortable: true },
    { key: "m365_username", label: "M365 Username", sortable: true },
  ];

  const networkDevicesColumns: Column<any>[] = [
    { key: "device_name", label: "Device Name", sortable: true },
    { key: "device_type", label: "Type", sortable: true },
    { key: "ip_address", label: "IP Address", sortable: true },
    { key: "mac_address", label: "MAC Address", sortable: true },
    { key: "serial_number", label: "Serial Number", sortable: true },
    { key: "manufacturer", label: "Manufacturer", sortable: true },
    { key: "status", label: "Status", sortable: true },
  ];

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => navigate("/branches")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Branches
          </Button>
        </div>

        <h1 className="text-3xl font-bold text-foreground mb-6">{branch?.name}</h1>

        <Tabs value={currentTab} onValueChange={setCurrentTab}>
          <TabsList className="flex flex-wrap h-auto">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="internet">Internet</TabsTrigger>
            <TabsTrigger value="master-users">Master Users</TabsTrigger>
            <TabsTrigger value="users">Directory Users</TabsTrigger>
            <TabsTrigger value="devices">Devices</TabsTrigger>
            <TabsTrigger value="network">Network Equipment</TabsTrigger>
            <TabsTrigger value="diagram">Network Diagram</TabsTrigger>
            <TabsTrigger value="tickets">Tickets</TabsTrigger>
            <TabsTrigger value="jobs">Jobs/Migrations</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Branch Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {branch?.address && <p><strong>Address:</strong> {branch.address}</p>}
                  {branch?.city && <p><strong>City:</strong> {branch.city}</p>}
                  {branch?.state && <p><strong>State:</strong> {branch.state}</p>}
                  {branch?.postal_code && <p><strong>Postal Code:</strong> {branch.postal_code}</p>}
                  {branch?.country && <p><strong>Country:</strong> {branch.country}</p>}
                  {branch?.phone && <p><strong>Phone:</strong> {branch.phone}</p>}
                  {branch?.email && <p><strong>Email:</strong> {branch.email}</p>}
                  {branch?.notes && <p><strong>Notes:</strong> {branch.notes}</p>}
                </CardContent>
              </Card>
              
              <ImportHistory branchId={branchId} />
            </div>
          </TabsContent>

          <TabsContent value="internet">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Internet Connectivity ({internetConnectivity?.length || 0})</CardTitle>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => downloadCSVTemplate("internet")}>
                      <Download className="w-4 h-4 mr-2" />
                      Download Template
                    </Button>
                    <input
                      ref={internetFileInputRef}
                      type="file"
                      accept=".csv"
                      className="hidden"
                      onChange={() => handleCSVImport("internet")}
                    />
                    <Button variant="outline" onClick={() => internetFileInputRef.current?.click()}>
                      <Upload className="w-4 h-4 mr-2" />
                      Import CSV
                    </Button>
                    <Button variant="outline" onClick={() => exportToCSV(internetConnectivity || [], `${branch?.name}_internet`)}>
                      <Download className="w-4 h-4 mr-2" />
                      Export CSV
                    </Button>
                    <Dialog open={isInternetDialogOpen} onOpenChange={setIsInternetDialogOpen}>
                      <DialogTrigger asChild>
                        <Button>
                          <Plus className="w-4 h-4 mr-2" />
                          Add Connection
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Add Internet Connection</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={(e) => { e.preventDefault(); createInternetConnectivity.mutate(internetForm); }} className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="isp">ISP *</Label>
                              <Input
                                id="isp"
                                value={internetForm.isp}
                                onChange={(e) => setInternetForm({ ...internetForm, isp: e.target.value })}
                                required
                              />
                            </div>
                            <div>
                              <Label htmlFor="connection_type">Connection Type</Label>
                              <Input
                                id="connection_type"
                                value={internetForm.connection_type}
                                onChange={(e) => setInternetForm({ ...internetForm, connection_type: e.target.value })}
                                placeholder="e.g., Fiber, DSL, Wireless"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="bandwidth_mbps">Bandwidth (Mbps)</Label>
                              <Input
                                id="bandwidth_mbps"
                                value={internetForm.bandwidth_mbps}
                                onChange={(e) => setInternetForm({ ...internetForm, bandwidth_mbps: e.target.value })}
                                placeholder="e.g., 100/100"
                              />
                            </div>
                            <div>
                              <Label htmlFor="static_ip">Static IP</Label>
                              <Input
                                id="static_ip"
                                value={internetForm.static_ip}
                                onChange={(e) => setInternetForm({ ...internetForm, static_ip: e.target.value })}
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="account_number">Account Number</Label>
                              <Input
                                id="account_number"
                                value={internetForm.account_number}
                                onChange={(e) => setInternetForm({ ...internetForm, account_number: e.target.value })}
                              />
                            </div>
                            <div>
                              <Label htmlFor="monthly_cost">Monthly Cost (ZAR)</Label>
                              <Input
                                id="monthly_cost"
                                type="number"
                                step="0.01"
                                value={internetForm.monthly_cost}
                                onChange={(e) => setInternetForm({ ...internetForm, monthly_cost: e.target.value })}
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-4">
                            <div>
                              <Label htmlFor="support_contact">Support Contact</Label>
                              <Input
                                id="support_contact"
                                value={internetForm.support_contact}
                                onChange={(e) => setInternetForm({ ...internetForm, support_contact: e.target.value })}
                              />
                            </div>
                            <div>
                              <Label htmlFor="support_phone">Support Phone</Label>
                              <Input
                                id="support_phone"
                                value={internetForm.support_phone}
                                onChange={(e) => setInternetForm({ ...internetForm, support_phone: e.target.value })}
                              />
                            </div>
                            <div>
                              <Label htmlFor="support_email">Support Email</Label>
                              <Input
                                id="support_email"
                                type="email"
                                value={internetForm.support_email}
                                onChange={(e) => setInternetForm({ ...internetForm, support_email: e.target.value })}
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="router_model">Router Model</Label>
                              <Input
                                id="router_model"
                                value={internetForm.router_model}
                                onChange={(e) => setInternetForm({ ...internetForm, router_model: e.target.value })}
                              />
                            </div>
                            <div>
                              <Label htmlFor="router_serial">Router Serial</Label>
                              <Input
                                id="router_serial"
                                value={internetForm.router_serial}
                                onChange={(e) => setInternetForm({ ...internetForm, router_serial: e.target.value })}
                              />
                            </div>
                          </div>
                          <div>
                            <Label htmlFor="notes">Notes</Label>
                            <Textarea
                              id="notes"
                              value={internetForm.notes}
                              onChange={(e) => setInternetForm({ ...internetForm, notes: e.target.value })}
                            />
                          </div>
                          <div className="flex justify-end gap-2">
                            <Button type="button" variant="outline" onClick={() => setIsInternetDialogOpen(false)}>
                              Cancel
                            </Button>
                            <Button type="submit">Add Connection</Button>
                          </div>
                        </form>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {internetConnectivity && internetConnectivity.length > 0 ? (
                  <div className="space-y-4">
                    {internetConnectivity.map((conn) => (
                      <Card key={conn.id}>
                        <CardContent className="p-4">
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            <div>
                              <p className="text-sm text-muted-foreground">ISP</p>
                              <p className="font-semibold">{conn.isp}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Connection Type</p>
                              <p className="font-semibold">{conn.connection_type || "N/A"}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Bandwidth</p>
                              <p className="font-semibold">{conn.bandwidth_mbps || "N/A"} Mbps</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Static IP</p>
                              <p className="font-semibold">{conn.static_ip || "N/A"}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Account Number</p>
                              <p className="font-semibold">{conn.account_number || "N/A"}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Monthly Cost</p>
                              <p className="font-semibold">R {conn.monthly_cost || "N/A"}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Support Contact</p>
                              <p className="font-semibold">{conn.support_contact || "N/A"}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Support Phone</p>
                              <p className="font-semibold">{conn.support_phone || "N/A"}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Router Model</p>
                              <p className="font-semibold">{conn.router_model || "N/A"}</p>
                            </div>
                            {conn.notes && (
                              <div className="col-span-3">
                                <p className="text-sm text-muted-foreground">Notes</p>
                                <p className="text-sm">{conn.notes}</p>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No internet connectivity configured yet.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="master-users">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Master Users ({masterUsers?.length || 0})</CardTitle>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => exportToCSV(masterUsers || [], `${branch?.name}_master_users`)}>
                      <Download className="w-4 h-4 mr-2" />
                      Export CSV
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Users from the master user list assigned to this branch. Includes email, credentials, and device serial numbers.
                </p>
                <DataTable
                  data={masterUsers || []}
                  columns={masterUsersColumns}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Directory Users ({directoryUsers?.length || 0})</CardTitle>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => downloadCSVTemplate("users")}>
                      <Download className="w-4 h-4 mr-2" />
                      Download Template
                    </Button>
                    <input
                      ref={usersFileInputRef}
                      type="file"
                      accept=".csv"
                      className="hidden"
                      onChange={() => handleCSVImport("users")}
                    />
                    <Button variant="outline" onClick={() => usersFileInputRef.current?.click()}>
                      <Upload className="w-4 h-4 mr-2" />
                      Import CSV
                    </Button>
                    <Button variant="outline" onClick={() => exportToCSV(directoryUsers || [], `${branch?.name}_users`)}>
                      <Download className="w-4 h-4 mr-2" />
                      Export CSV
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <DataTable
                  data={directoryUsers || []}
                  columns={usersColumns}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="devices">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Hardware Devices ({hardwareDevices?.length || 0})</CardTitle>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => downloadCSVTemplate("devices")}>
                      <Download className="w-4 h-4 mr-2" />
                      Download Template
                    </Button>
                    <input
                      ref={devicesFileInputRef}
                      type="file"
                      accept=".csv"
                      className="hidden"
                      onChange={() => handleCSVImport("devices")}
                    />
                    <Button variant="outline" onClick={() => devicesFileInputRef.current?.click()}>
                      <Upload className="w-4 h-4 mr-2" />
                      Import CSV
                    </Button>
                    <Button variant="outline" onClick={() => exportToCSV(hardwareDevices || [], `${branch?.name}_devices`)}>
                      <Download className="w-4 h-4 mr-2" />
                      Export CSV
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <DataTable
                  data={hardwareDevices || []}
                  columns={hardwareColumns}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="network">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Network Equipment ({networkDevices?.length || 0})</CardTitle>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => downloadCSVTemplate("network_devices")}>
                      <Download className="w-4 h-4 mr-2" />
                      Download Template
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv"
                      className="hidden"
                      onChange={() => handleCSVImport("network_devices")}
                    />
                    <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                      <Upload className="w-4 h-4 mr-2" />
                      Import CSV
                    </Button>
                    <Button variant="outline" onClick={() => exportToCSV(networkDevices || [], `${branch?.name}_network_devices`)}>
                      <Download className="w-4 h-4 mr-2" />
                      Export CSV
                    </Button>
                    <Dialog open={isNetworkDeviceDialogOpen} onOpenChange={setIsNetworkDeviceDialogOpen}>
                      <DialogTrigger asChild>
                        <Button>
                          <Plus className="w-4 h-4 mr-2" />
                          Add Device
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Add Network Device</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={(e) => { e.preventDefault(); createNetworkDevice.mutate(networkDeviceForm); }} className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="device_name">Device Name *</Label>
                              <Input
                                id="device_name"
                                value={networkDeviceForm.device_name}
                                onChange={(e) => setNetworkDeviceForm({ ...networkDeviceForm, device_name: e.target.value })}
                                required
                              />
                            </div>
                            <div>
                              <Label htmlFor="device_type">Device Type *</Label>
                              <Input
                                id="device_type"
                                value={networkDeviceForm.device_type}
                                onChange={(e) => setNetworkDeviceForm({ ...networkDeviceForm, device_type: e.target.value })}
                                placeholder="e.g., printer, switch, router"
                                required
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="manufacturer">Manufacturer</Label>
                              <Input
                                id="manufacturer"
                                value={networkDeviceForm.manufacturer}
                                onChange={(e) => setNetworkDeviceForm({ ...networkDeviceForm, manufacturer: e.target.value })}
                              />
                            </div>
                            <div>
                              <Label htmlFor="model">Model</Label>
                              <Input
                                id="model"
                                value={networkDeviceForm.model}
                                onChange={(e) => setNetworkDeviceForm({ ...networkDeviceForm, model: e.target.value })}
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="serial_number">Serial Number</Label>
                              <Input
                                id="serial_number"
                                value={networkDeviceForm.serial_number}
                                onChange={(e) => setNetworkDeviceForm({ ...networkDeviceForm, serial_number: e.target.value })}
                              />
                            </div>
                            <div>
                              <Label htmlFor="location">Location</Label>
                              <Input
                                id="location"
                                value={networkDeviceForm.location}
                                onChange={(e) => setNetworkDeviceForm({ ...networkDeviceForm, location: e.target.value })}
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="ip_address">IP Address</Label>
                              <Input
                                id="ip_address"
                                value={networkDeviceForm.ip_address}
                                onChange={(e) => setNetworkDeviceForm({ ...networkDeviceForm, ip_address: e.target.value })}
                              />
                            </div>
                            <div>
                              <Label htmlFor="mac_address">MAC Address</Label>
                              <Input
                                id="mac_address"
                                value={networkDeviceForm.mac_address}
                                onChange={(e) => setNetworkDeviceForm({ ...networkDeviceForm, mac_address: e.target.value })}
                              />
                            </div>
                          </div>
                          <div>
                            <Label htmlFor="notes">Notes</Label>
                            <Textarea
                              id="notes"
                              value={networkDeviceForm.notes}
                              onChange={(e) => setNetworkDeviceForm({ ...networkDeviceForm, notes: e.target.value })}
                            />
                          </div>
                          <div className="flex justify-end gap-2">
                            <Button type="button" variant="outline" onClick={() => setIsNetworkDeviceDialogOpen(false)}>
                              Cancel
                            </Button>
                            <Button type="submit">Add Device</Button>
                          </div>
                        </form>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <DataTable
                  data={networkDevices || []}
                  columns={networkDevicesColumns}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="diagram">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Network Diagrams</CardTitle>
                  <div className="flex gap-2 flex-wrap">
                    <Button variant="outline" size="sm" onClick={downloadDiagramTemplate}>
                      <Download className="w-4 h-4 mr-2" />
                      JSON Template
                    </Button>
                    <input
                      ref={diagramFileInputRef}
                      type="file"
                      accept=".json"
                      className="hidden"
                      onChange={handleDiagramImport}
                    />
                    <Button variant="outline" size="sm" onClick={() => diagramFileInputRef.current?.click()}>
                      <Upload className="w-4 h-4 mr-2" />
                      Import JSON
                    </Button>
                    <Dialog open={isImageUploadDialogOpen} onOpenChange={setIsImageUploadDialogOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Upload className="w-4 h-4 mr-2" />
                          Upload Image
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Upload Network Diagram Image</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleDiagramImageUpload} className="space-y-4">
                          <div>
                            <Label htmlFor="img_diagram_name">Diagram Name *</Label>
                            <Input
                              id="img_diagram_name"
                              value={imageFormData.diagram_name}
                              onChange={(e) => setImageFormData({ ...imageFormData, diagram_name: e.target.value })}
                              placeholder="e.g., Branch Network Diagram"
                              required
                            />
                          </div>
                          <div>
                            <Label htmlFor="img_description">Description</Label>
                            <Textarea
                              id="img_description"
                              value={imageFormData.description}
                              onChange={(e) => setImageFormData({ ...imageFormData, description: e.target.value })}
                              placeholder="Describe this network diagram..."
                              rows={3}
                            />
                          </div>
                          <div>
                            <Label htmlFor="diagram_img">Network Diagram Image (PNG/JPG/JPEG)</Label>
                            <Input
                              id="diagram_img"
                              type="file"
                              accept="image/png,image/jpeg,image/jpg"
                              onChange={handleDiagramImageSelect}
                              ref={diagramImageInputRef}
                              required
                            />
                            {diagramImagePreview && (
                              <div className="mt-2 border rounded-lg p-2">
                                <img 
                                  src={diagramImagePreview} 
                                  alt="Preview" 
                                  className="max-h-64 mx-auto object-contain"
                                />
                              </div>
                            )}
                          </div>
                          <div className="flex justify-end gap-2">
                            <Button type="button" variant="outline" onClick={() => {
                              setIsImageUploadDialogOpen(false);
                              setSelectedDiagramImage(null);
                              setDiagramImagePreview(null);
                            }}>
                              Cancel
                            </Button>
                            <Button type="submit" disabled={uploadDiagramImage.isPending}>
                              {uploadDiagramImage.isPending ? "Uploading..." : "Upload"}
                            </Button>
                          </div>
                        </form>
                      </DialogContent>
                    </Dialog>
                    <Dialog open={isAddDiagramDialogOpen} onOpenChange={setIsAddDiagramDialogOpen}>
                      <DialogTrigger asChild>
                        <Button size="sm">
                          <Plus className="w-4 h-4 mr-2" />
                          Add Diagram
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Add Network Diagram</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={(e) => { e.preventDefault(); createNetworkDiagram.mutate(diagramForm); }} className="space-y-4">
                          <div>
                            <Label htmlFor="diagram_name">Diagram Name *</Label>
                            <Input
                              id="diagram_name"
                              value={diagramForm.diagram_name}
                              onChange={(e) => setDiagramForm({ ...diagramForm, diagram_name: e.target.value })}
                              placeholder="e.g., Main Office Network"
                              required
                            />
                          </div>
                          <div>
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                              id="description"
                              value={diagramForm.description}
                              onChange={(e) => setDiagramForm({ ...diagramForm, description: e.target.value })}
                              placeholder="Describe this network diagram..."
                              rows={3}
                            />
                          </div>
                          <div className="flex justify-end gap-2">
                            <Button type="button" variant="outline" onClick={() => setIsAddDiagramDialogOpen(false)}>
                              Cancel
                            </Button>
                            <Button type="submit">Add Diagram</Button>
                          </div>
                        </form>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Network diagrams for this branch. Import JSON files, upload images, or create new diagrams.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {networkDiagrams?.map((diagram) => (
                    <BranchDiagramCard key={diagram.id} diagram={diagram} />
                  ))}
                  {(!networkDiagrams || networkDiagrams.length === 0) && (
                    <p className="text-muted-foreground col-span-2">No network diagrams yet. Use "Import JSON", "Upload Image" or "Add Diagram" to get started.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tickets">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Tickets ({branchTickets?.length || 0})</CardTitle>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => exportToCSV(branchTickets || [], `${branch?.name}_tickets`)}>
                      <Download className="w-4 h-4 mr-2" />
                      Export CSV
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Support tickets associated with this branch.
                </p>
                {branchTickets && branchTickets.length > 0 ? (
                  <div className="space-y-4">
                    {branchTickets.map((ticket) => (
                      <Card key={ticket.id}>
                        <CardContent className="p-4">
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            <div className="col-span-2">
                              <p className="text-sm text-muted-foreground">Title</p>
                              <p className="font-semibold">{ticket.title}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Status</p>
                              <p className="font-semibold capitalize">{ticket.status}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Priority</p>
                              <p className="font-semibold capitalize">{ticket.priority}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">User Email</p>
                              <p className="font-semibold">{ticket.user_email || "N/A"}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Category</p>
                              <p className="font-semibold">{ticket.category || "N/A"}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Created</p>
                              <p className="font-semibold">{new Date(ticket.created_at).toLocaleDateString()}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Time Spent</p>
                              <p className="font-semibold">{ticket.time_spent_minutes ? `${ticket.time_spent_minutes} min` : "N/A"}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Fault Type</p>
                              <p className="font-semibold">{ticket.fault_type || "N/A"}</p>
                            </div>
                            {ticket.description && (
                              <div className="col-span-3">
                                <p className="text-sm text-muted-foreground">Description</p>
                                <p className="text-sm">{ticket.description}</p>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No tickets associated with this branch yet.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="jobs">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Jobs & Migrations ({branchJobs?.length || 0})</CardTitle>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => exportToCSV(branchJobs || [], `${branch?.name}_jobs`)}>
                      <Download className="w-4 h-4 mr-2" />
                      Export CSV
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Jobs and migrations associated with this branch.
                </p>
                {branchJobs && branchJobs.length > 0 ? (
                  <div className="space-y-4">
                    {branchJobs.map((job) => (
                      <Card key={job.id}>
                        <CardContent className="p-4">
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            <div>
                              <p className="text-sm text-muted-foreground">Client Name</p>
                              <p className="font-semibold">{job.client_name || "N/A"}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Status</p>
                              <p className="font-semibold">{job.status || "N/A"}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Priority</p>
                              <p className="font-semibold">{job.priority || "N/A"}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Start Date</p>
                              <p className="font-semibold">{job.start_date ? new Date(job.start_date).toLocaleDateString() : "N/A"}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Estimated Hours</p>
                              <p className="font-semibold">{job.estimated_hours || "N/A"}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Actual Hours</p>
                              <p className="font-semibold">{job.actual_hours || "N/A"}</p>
                            </div>
                            {job.notes && (
                              <div className="col-span-3">
                                <p className="text-sm text-muted-foreground">Notes</p>
                                <p className="text-sm">{job.notes}</p>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No jobs or migrations associated with this branch yet.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

// Branch Diagram Card Component
const BranchDiagramCard = ({ diagram }: { diagram: any }) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    // Support both image_path and diagram_url for backwards compatibility
    const imagePath = diagram.image_path || diagram.diagram_url;
    if (imagePath) {
      const { data } = supabase.storage
        .from('diagrams')
        .getPublicUrl(imagePath);
      setImageUrl(data.publicUrl);
    }
  }, [diagram.image_path, diagram.diagram_url]);

  return (
    <Card>
      <CardContent className="p-4">
        {imageUrl && (
          <div className="mb-3 border rounded-lg overflow-hidden bg-muted">
            <img 
              src={imageUrl} 
              alt={diagram.name || diagram.diagram_name} 
              className="w-full h-32 object-cover"
              onError={(e) => {
                // Hide image if it fails to load
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
        )}
        <div className="flex items-center gap-2">
          <ImageIcon className="w-4 h-4 text-primary" />
          <span className="font-medium">{diagram.name || diagram.diagram_name}</span>
        </div>
        {diagram.description && (
          <p className="text-sm text-muted-foreground mt-2">{diagram.description}</p>
        )}
        <p className="text-xs text-muted-foreground mt-2">
          Created {new Date(diagram.created_at).toLocaleDateString()}
        </p>
      </CardContent>
    </Card>
  );
};

export default BranchDetails;
