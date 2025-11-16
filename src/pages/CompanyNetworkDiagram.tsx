import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Network, Download, Upload, Plus, Save, Image as ImageIcon, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ImportHistory } from "@/components/ImportHistory";
import { Tables } from "@/integrations/supabase/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type NetworkDiagram = Tables<"network_diagrams">;

interface Branch {
  id: string;
  name: string;
  city: string | null;
}

interface NetworkDevice {
  id: string;
  device_name: string;
  device_type: string;
  ip_address: string | null;
  branch_id: string | null;
}

const CompanyNetworkDiagram = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isImageUploadDialogOpen, setIsImageUploadDialogOpen] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [currentTab, setCurrentTab] = useState("diagrams");
  const [formData, setFormData] = useState({
    name: "Company Network Overview",
    description: "",
  });
  const [imageFormData, setImageFormData] = useState({
    name: "",
    description: "",
  });

  useEffect(() => {
    checkAccess();
  }, [navigate]);

  const checkAccess = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }
  };

  // Fetch all branches
  const { data: branches } = useQuery({
    queryKey: ["branches"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("branches")
        .select("id, name, city")
        .order("name");
      if (error) throw error;
      return data as Branch[];
    },
  });

  // Fetch all network devices
  const { data: networkDevices } = useQuery({
    queryKey: ["all-network-devices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("network_devices")
        .select("id, device_name, device_type, ip_address, branch_id");
      if (error) throw error;
      return data as NetworkDevice[];
    },
  });

  // Fetch company-wide diagrams
  const { data: diagrams, isLoading } = useQuery({
    queryKey: ["network-diagrams-company"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("network_diagrams")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createDiagram = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Generate diagram data from branches and devices
      const nodes = [
        ...(branches || []).map(branch => ({
          id: `branch-${branch.id}`,
          label: branch.name,
          type: "branch",
          city: branch.city,
        })),
        ...(networkDevices || []).map(device => ({
          id: `device-${device.id}`,
          label: device.device_name,
          type: device.device_type,
          ip: device.ip_address,
        })),
      ];

      const edges = (networkDevices || [])
        .filter(device => device.branch_id)
        .map(device => ({
          from: `branch-${device.branch_id}`,
          to: `device-${device.id}`,
        }));

      const { error } = await (supabase as any).from("network_diagrams").insert([{
        branch_id: (data as any).branch_id || null,
        diagram_name: (data as any).name || 'Company Network',
        diagram_url: '',
        description: (data as any).description
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["network-diagrams-company"] });
      toast({
        title: "Success",
        description: "Network diagram created successfully",
      });
      setIsDialogOpen(false);
      setFormData({ name: "Company Network Overview", description: "" });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const uploadImageDiagram = useMutation({
    mutationFn: async (data: typeof imageFormData & { imagePath: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await (supabase as any).from("network_diagrams").insert([{
        branch_id: null,
        diagram_name: data.name,
        diagram_url: (data as any).imagePath || '',
        description: data.description || null
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["network-diagrams-company"] });
      toast({
        title: "Success",
        description: "Network diagram image uploaded successfully",
      });
      setIsImageUploadDialogOpen(false);
      setImageFormData({ name: "", description: "" });
      setSelectedImage(null);
      setImagePreview(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteDiagram = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("network_diagrams")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["network-diagrams-company"] });
      toast({
        title: "Success",
        description: "Network diagram deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a PNG, JPG, or JPEG image",
        variant: "destructive",
      });
      return;
    }

    setSelectedImage(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleImageUpload = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedImage) {
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

    const fileExt = selectedImage.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `company-network/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('diagrams')
      .upload(filePath, selectedImage, {
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

    uploadImageDiagram.mutate({ ...imageFormData, imagePath: filePath });
  };

  const handleCSVImport = async () => {
    const file = csvInputRef.current?.files?.[0];
    if (!file) return;

    try {
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

      const { data: { user } } = await supabase.auth.getUser();
      
      // Create import job record
      const { data: importJob, error: jobError } = await supabase
        .from("import_jobs")
        .insert([{
          uploader: user?.id,
          import_type: "csv",
          resource_type: "network_topology",
          status: "processing",
        }])
        .select()
        .single();

      if (jobError) {
        console.error("Failed to create import job:", jobError);
      }

      // Import the network topology data (this would need proper schema)
      const diagrams = data.map(item => ({
        name: item.diagram_name || item.name || "Imported Network Diagram",
        description: item.description || null,
        is_company_wide: true,
        diagram_json: item,
        created_by: user?.id,
      }));

      const { error } = await (supabase as any).from("network_diagrams").insert(diagrams);
      if (error) throw error;

      // Update import job status
      if (importJob) {
        await (supabase as any)
          .from("import_jobs")
          .update({
            status: "completed",
            result_summary: JSON.stringify({ records_imported: diagrams.length }),
          })
          .eq("id", importJob.id);
      }

      queryClient.invalidateQueries({ queryKey: ["network-diagrams-company"] });
      toast({
        title: "Success",
        description: `${diagrams.length} network diagram(s) imported successfully`,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to import CSV";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }

    if (csvInputRef.current) {
      csvInputRef.current.value = "";
    }
  };

  const getImageUrl = async (path: string) => {
    const { data } = await supabase.storage
      .from('diagrams')
      .getPublicUrl(path);
    return data.publicUrl;
  };

  const handleDownloadTemplate = () => {
    const headers = ['diagram_name', 'description', 'branch_name', 'device_name', 'device_type', 'ip_address'];
    const example = 'Company Network Q4 2024,Main network topology,Head Office,Core Switch,switch,192.168.1.1';
    const csv = headers.join(',') + '\n' + example;
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'company_network_topology_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast({
      title: "Template downloaded",
      description: "CSV template has been downloaded",
    });
  };

  const handleExportDiagram = (diagram: any) => {
    const dataStr = JSON.stringify(diagram.diagram_json || {}, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(diagram.diagram_name || 'diagram').replace(/\s+/g, '_')}_diagram.json`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast({
      title: "Diagram exported",
      description: "Network diagram JSON has been downloaded",
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createDiagram.mutate(formData);
  };

  const getNetworkStats = () => {
    const totalBranches = branches?.length || 0;
    const totalDevices = networkDevices?.length || 0;
    const deviceTypes = new Set((networkDevices || []).map(d => d.device_type)).size;
    
    return { totalBranches, totalDevices, deviceTypes };
  };

  const stats = getNetworkStats();

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Network className="w-8 h-8" />
              Company Network Overview
            </h1>
            <p className="text-muted-foreground">
              Visualize and manage your entire company network topology
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" onClick={handleDownloadTemplate}>
              <Download className="h-4 w-4 mr-2" />
              CSV Template
            </Button>
            <input
              ref={csvInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleCSVImport}
            />
            <Button variant="outline" onClick={() => csvInputRef.current?.click()}>
              <Upload className="h-4 w-4 mr-2" />
              Import CSV
            </Button>
            <Dialog open={isImageUploadDialogOpen} onOpenChange={setIsImageUploadDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Image
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Upload Network Diagram Image</DialogTitle>
                  <DialogDescription>
                    Upload a network diagram image (PNG, JPG, JPEG supported)
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleImageUpload} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="image_name">Diagram Name</Label>
                    <Input
                      id="image_name"
                      value={imageFormData.name}
                      onChange={(e) => setImageFormData({ ...imageFormData, name: e.target.value })}
                      placeholder="e.g., Company Network Diagram"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="image_description">Description</Label>
                    <Textarea
                      id="image_description"
                      value={imageFormData.description}
                      onChange={(e) => setImageFormData({ ...imageFormData, description: e.target.value })}
                      placeholder="Describe this network diagram..."
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="diagram_image">Network Diagram Image (PNG/JPG/JPEG)</Label>
                    <Input
                      id="diagram_image"
                      type="file"
                      accept="image/png,image/jpeg,image/jpg"
                      onChange={handleImageSelect}
                      ref={imageInputRef}
                      required
                    />
                    {imagePreview && (
                      <div className="mt-2 border rounded-lg p-2">
                        <img 
                          src={imagePreview} 
                          alt="Preview" 
                          className="max-h-64 mx-auto object-contain"
                        />
                      </div>
                    )}
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => {
                      setIsImageUploadDialogOpen(false);
                      setSelectedImage(null);
                      setImagePreview(null);
                    }}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={uploadImageDiagram.isPending}>
                      {uploadImageDiagram.isPending ? "Uploading..." : "Upload"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Generate Diagram
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Generate Network Diagram</DialogTitle>
                  <DialogDescription>
                    Create a new company-wide network diagram from current data
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Diagram Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Q4 2024 Network Topology"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Describe this network diagram..."
                      rows={3}
                    />
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createDiagram.isPending}>
                      {createDiagram.isPending ? "Generating..." : "Generate"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Network Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Branches
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalBranches}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Network Devices
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalDevices}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Device Types
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.deviceTypes}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={currentTab} onValueChange={setCurrentTab}>
          <TabsList>
            <TabsTrigger value="diagrams">Network Diagrams</TabsTrigger>
            <TabsTrigger value="history">Import History</TabsTrigger>
          </TabsList>

          <TabsContent value="diagrams">
            {/* Saved Diagrams */}
            <Card>
              <CardHeader>
                <CardTitle>Saved Network Diagrams</CardTitle>
                <CardDescription>
                  Network topology diagrams and uploaded images
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <p className="text-sm text-muted-foreground">Loading diagrams...</p>
                ) : diagrams && diagrams.length > 0 ? (
                  <div className="space-y-3">
                    {diagrams.map((diagram) => (
                      <DiagramCard 
                        key={diagram.id} 
                        diagram={diagram} 
                        onDelete={() => deleteDiagram.mutate(diagram.id)}
                        onExport={() => handleExportDiagram(diagram)}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No diagrams yet. Click "Generate Diagram" or "Upload Image" to create one.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <ImportHistory />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

// DiagramCard component to display network diagrams with images
const DiagramCard = ({ 
  diagram, 
  onDelete, 
  onExport 
}: { 
  diagram: NetworkDiagram; 
  onDelete: () => void; 
  onExport: () => void;
}) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const diagramAny = diagram as any;

  useEffect(() => {
    if (diagramAny.image_path || diagramAny.diagram_url) {
      const { data } = supabase.storage
        .from('diagrams')
        .getPublicUrl(diagramAny.image_path || diagramAny.diagram_url);
      setImageUrl(data.publicUrl);
    }
  }, [diagramAny.image_path, diagramAny.diagram_url]);

  return (
    <div className="flex items-start gap-4 p-4 border rounded-lg hover:bg-accent/50 transition-colors">
      {imageUrl && (
        <div className="flex-shrink-0 w-48 h-32 border rounded-lg overflow-hidden bg-muted">
          <img 
            src={imageUrl} 
            alt={diagramAny.name || diagramAny.diagram_name} 
            className="w-full h-full object-cover"
          />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold flex items-center gap-2">
              {(diagramAny.image_path || diagramAny.diagram_url) && <ImageIcon className="h-4 w-4 text-primary" />}
              {diagramAny.name || diagramAny.diagram_name}
            </h3>
            {diagram.description && (
              <p className="text-sm text-muted-foreground mt-1">
                {diagram.description}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-2">
              Created {new Date(diagram.created_at).toLocaleString()}
            </p>
            {!(diagramAny.image_path || diagramAny.diagram_url) && (
              <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                <span>
                  Nodes: {diagramAny.diagram_json?.nodes?.length || 0}
                </span>
                <span>
                  Edges: {diagramAny.diagram_json?.edges?.length || 0}
                </span>
              </div>
            )}
          </div>
          <div className="flex gap-2 flex-shrink-0">
            {!(diagramAny.image_path || diagramAny.diagram_url) && (
              <Button
                variant="outline"
                size="sm"
                onClick={onExport}
              >
                <Download className="h-4 w-4 mr-2" />
                Export JSON
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={onDelete}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompanyNetworkDiagram;
