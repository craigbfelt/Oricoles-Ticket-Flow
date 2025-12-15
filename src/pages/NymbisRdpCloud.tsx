import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Upload, Download, Cloud, Network, Image as ImageIcon, Trash2, Server, HardDrive, Wand2, FileUp, Edit, Save, X, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NetworkDataImporter } from "@/components/NetworkDataImporter";
import { CopilotAssistant } from "@/components/CopilotAssistant";
import { DiagramRedrawer } from "@/components/DiagramRedrawer";

type CloudNetwork = any; // Cloud networks table not in current schema

interface VirtualServer {
  id: string;
  name: string;
  type: string;
  status: string;
  description: string;
  specs: string;
  ip: string;
}

const NymbisRdpCloud = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const imageInputRef = useRef<HTMLInputElement>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedNetwork, setSelectedNetwork] = useState<CloudNetwork | null>(null);
  const [currentTab, setCurrentTab] = useState("servers");
  const [redrawerOpen, setRedrawerOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    provider: "nymbis",
    network_type: "rdp",
    description: "",
  });
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  // Editable virtual servers state
  const [virtualServers, setVirtualServers] = useState<VirtualServer[]>([
    {
      id: "vm-rdp-main",
      name: "RDP Main Server",
      type: "RDP Main",
      status: "active",
      description: "Primary RDP server for remote access",
      specs: "8 vCPU, 32GB RAM, 500GB Storage",
      ip: "10.0.1.10",
    },
    {
      id: "vm-rdp-dialin",
      name: "RDP Dial-in Server",
      type: "RDP Dial-in",
      status: "active",
      description: "Dial-in server for external RDP connections",
      specs: "4 vCPU, 16GB RAM, 250GB Storage",
      ip: "10.0.1.11",
    },
    {
      id: "vm-ad",
      name: "Active Directory Server",
      type: "Active Directory",
      status: "active",
      description: "Domain controller and user authentication",
      specs: "4 vCPU, 16GB RAM, 500GB Storage",
      ip: "10.0.1.20",
    },
    {
      id: "vm-rds",
      name: "Remote Desktop Services Server",
      type: "Remote Desktop Services",
      status: "active",
      description: "RDS licensing and session management",
      specs: "8 vCPU, 32GB RAM, 250GB Storage",
      ip: "10.0.1.30",
    },
  ]);

  // Load saved servers from localStorage
  useEffect(() => {
    const savedServers = localStorage.getItem('nymbis-virtual-servers');
    if (savedServers) {
      try {
        setVirtualServers(JSON.parse(savedServers));
      } catch (e) {
        console.error('Failed to load saved servers:', e);
      }
    }
  }, []);

  // Save servers to localStorage when they change
  const updateServer = (serverId: string, updates: Partial<VirtualServer>) => {
    setVirtualServers(prev => {
      const updated = prev.map(server => 
        server.id === serverId ? { ...server, ...updates } : server
      );
      localStorage.setItem('nymbis-virtual-servers', JSON.stringify(updated));
      return updated;
    });
    toast({
      title: "Server Updated",
      description: "Server configuration has been saved",
    });
  };

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

  const { data: cloudNetworks, isLoading } = useQuery({
    queryKey: ["cloud-networks"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("cloud_networks")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createNetwork = useMutation({
    mutationFn: async (data: typeof formData & { image_path?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await (supabase as any).from("cloud_networks").insert([{
        ...data,
        created_by: user?.id,
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cloud-networks"] });
      toast({
        title: "Success",
        description: "Cloud network created successfully",
      });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteNetwork = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("cloud_networks")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cloud-networks"] });
      toast({
        title: "Success",
        description: "Cloud network deleted successfully",
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

  const resetForm = () => {
    setFormData({
      name: "",
      provider: "nymbis",
      network_type: "rdp",
      description: "",
    });
    setSelectedImage(null);
    setImagePreview(null);
  };

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let imagePath: string | undefined;

    // Upload image if selected
    if (selectedImage) {
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
      const filePath = `cloud-networks/${fileName}`;

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

      imagePath = filePath;
    }

    createNetwork.mutate({ ...formData, image_path: imagePath });
  };

  const handleDownloadTemplate = () => {
    const headers = ['name', 'provider', 'network_type', 'description'];
    const example = 'Nymbis RDP Network,nymbis,rdp,Main RDP cloud network for remote access';
    const csv = headers.join(',') + '\n' + example;
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cloud_networks_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast({
      title: "Template downloaded",
      description: "CSV template has been downloaded",
    });
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
      
      const networks = data.map(item => ({
        name: item.name,
        provider: item.provider || 'nymbis',
        network_type: item.network_type || 'rdp',
        description: item.description || null,
        created_by: user?.id,
      }));

      const { error } = await (supabase as any).from("cloud_networks").insert(networks);
      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["cloud-networks"] });
      toast({
        title: "Success",
        description: `${networks.length} cloud network(s) imported successfully`,
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

  const getProviderColor = (provider: string) => {
    const colors: Record<string, string> = {
      nymbis: "bg-blue-500",
      aws: "bg-orange-500",
      azure: "bg-cyan-500",
      gcp: "bg-green-500",
    };
    return colors[provider] || "bg-gray-500";
  };

  const nymbisNetworks = (cloudNetworks as any)?.filter((n: any) => n.provider === 'nymbis') || [];
  const otherNetworks = (cloudNetworks as any)?.filter((n: any) => n.provider !== 'nymbis') || [];

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
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Cloud className="w-8 h-8" />
              Nymbis RDP Cloud Network
            </h1>
            <p className="text-muted-foreground">Manage cloud network configurations, servers, and diagrams</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" onClick={() => setRedrawerOpen(true)}>
              <Wand2 className="h-4 w-4 mr-2" />
              AI Diagram Generator
            </Button>
            <NetworkDataImporter 
              targetPage="nymbis-cloud" 
              onDataImported={() => queryClient.invalidateQueries({ queryKey: ["cloud-networks"] })}
            />
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
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Network
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Add Cloud Network</DialogTitle>
                  <DialogDescription>
                    Create a new cloud network configuration with optional diagram image (PNG, JPG, JPEG)
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Network Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Nymbis RDP Network"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="provider">Provider</Label>
                      <Select
                        value={formData.provider}
                        onValueChange={(value) => setFormData({ ...formData, provider: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select provider" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="nymbis">Nymbis</SelectItem>
                          <SelectItem value="aws">AWS</SelectItem>
                          <SelectItem value="azure">Azure</SelectItem>
                          <SelectItem value="gcp">Google Cloud</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="network_type">Network Type</Label>
                      <Select
                        value={formData.network_type}
                        onValueChange={(value) => setFormData({ ...formData, network_type: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="rdp">RDP</SelectItem>
                          <SelectItem value="vpn">VPN</SelectItem>
                          <SelectItem value="hybrid">Hybrid</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Describe this cloud network..."
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="diagram">Network Diagram (PNG/JPG/JPEG)</Label>
                    <div className="flex gap-2">
                      <Input
                        id="diagram"
                        type="file"
                        accept="image/png,image/jpeg,image/jpg"
                        onChange={handleImageSelect}
                        ref={imageInputRef}
                        className="flex-1"
                      />
                      {selectedImage && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setSelectedImage(null);
                            setImagePreview(null);
                            if (imageInputRef.current) {
                              imageInputRef.current.value = '';
                            }
                          }}
                        >
                          Clear
                        </Button>
                      )}
                    </div>
                    {imagePreview && (
                      <div className="mt-2 border rounded-lg p-2">
                        <img 
                          src={imagePreview} 
                          alt="Preview" 
                          className="max-h-48 mx-auto object-contain"
                        />
                      </div>
                    )}
                  </div>

                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createNetwork.isPending}>
                      {createNetwork.isPending ? "Creating..." : "Create Network"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* AI Copilot Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Tabs value={currentTab} onValueChange={setCurrentTab}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="servers">Servers</TabsTrigger>
                <TabsTrigger value="networks">Cloud Networks</TabsTrigger>
                <TabsTrigger value="devices">Network Devices</TabsTrigger>
                <TabsTrigger value="diagrams">Network Diagrams</TabsTrigger>
              </TabsList>

              <TabsContent value="servers">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Server className="w-5 h-5" />
                      Virtual Servers (VMs)
                    </CardTitle>
                    <CardDescription>
                      Nymbis Cloud virtual machine infrastructure - Click "Edit" to modify server configurations
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {virtualServers.map((server) => (
                        <VirtualServerCard 
                          key={server.id} 
                          server={server} 
                          onUpdate={(updates) => updateServer(server.id, updates)}
                        />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="networks">
                {isLoading ? (
                  <p>Loading cloud networks...</p>
                ) : (
                  <div className="space-y-6">
                    {/* Nymbis Networks Section */}
                    <div>
                      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                        <Network className="w-5 h-5" />
                        Nymbis RDP Networks ({nymbisNetworks.length})
                      </h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {nymbisNetworks.map((network: CloudNetwork) => (
                          <CloudNetworkCard 
                            key={network.id} 
                            network={network} 
                            onDelete={() => deleteNetwork.mutate(network.id)}
                            getProviderColor={getProviderColor}
                          />
                        ))}
                        {nymbisNetworks.length === 0 && (
                          <div className="col-span-full text-center py-12 text-muted-foreground">
                            No Nymbis networks yet. Click "Add Network" to create one.
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Other Cloud Networks Section */}
                    {otherNetworks.length > 0 && (
                      <div>
                        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                          <Cloud className="w-5 h-5" />
                          Other Cloud Networks ({otherNetworks.length})
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {otherNetworks.map((network: CloudNetwork) => (
                            <CloudNetworkCard 
                              key={network.id} 
                              network={network} 
                              onDelete={() => deleteNetwork.mutate(network.id)}
                              getProviderColor={getProviderColor}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="devices">
                <Card>
                  <CardHeader>
                    <CardTitle>Network Devices</CardTitle>
                    <CardDescription>
                      Network equipment and infrastructure in Nymbis Cloud
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground text-center py-8">
                      Network devices configuration coming soon. Use the Networks tab to manage cloud networks.
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="diagrams">
                <Card>
                  <CardHeader>
                    <CardTitle>Network Diagrams</CardTitle>
                    <CardDescription>
                      Visual representations of Nymbis Cloud network topology
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {nymbisNetworks.filter((n: CloudNetwork) => n.image_path).map((network: CloudNetwork) => (
                        <NetworkDiagramCard 
                          key={network.id} 
                          network={network}
                        />
                      ))}
                      {nymbisNetworks.filter((n: CloudNetwork) => n.image_path).length === 0 && (
                        <div className="col-span-full text-center py-12 text-muted-foreground">
                          No network diagrams yet. Add a network with an image to see diagrams here.
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
          
          {/* AI Copilot Sidebar */}
          <div className="lg:col-span-1">
            <CopilotAssistant 
              compact 
              placeholder="Ask Copilot to help with network configurations, generate diagrams, or import data..."
            />
          </div>
        </div>

        {/* AI Diagram Redrawer Modal */}
        <DiagramRedrawer 
          open={redrawerOpen}
          onOpenChange={setRedrawerOpen}
          onSuccess={() => queryClient.invalidateQueries({ queryKey: ["cloud-networks"] })}
        />
      </div>
    </DashboardLayout>
  );
};

// Cloud Network Card Component
const CloudNetworkCard = ({ 
  network, 
  onDelete,
  getProviderColor 
}: { 
  network: CloudNetwork; 
  onDelete: () => void;
  getProviderColor: (provider: string) => string;
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(network.name);
  const [editedProvider, setEditedProvider] = useState(network.provider);
  const [editedNetworkType, setEditedNetworkType] = useState(network.network_type);
  const [editedDescription, setEditedDescription] = useState(network.description || "");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleSave = async () => {
    try {
      const { error } = await (supabase as any)
        .from("cloud_networks")
        .update({
          name: editedName,
          provider: editedProvider,
          network_type: editedNetworkType,
          description: editedDescription || null,
        })
        .eq("id", network.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Network updated successfully",
      });
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ["cloud-networks"] });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update network",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            {isEditing ? (
              <div className="space-y-2">
                <Input
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  placeholder="Network name"
                />
                <Select value={editedProvider} onValueChange={setEditedProvider}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nymbis">Nymbis</SelectItem>
                    <SelectItem value="aws">AWS</SelectItem>
                    <SelectItem value="azure">Azure</SelectItem>
                    <SelectItem value="gcp">Google Cloud</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={editedNetworkType} onValueChange={setEditedNetworkType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rdp">RDP</SelectItem>
                    <SelectItem value="vpn">VPN</SelectItem>
                    <SelectItem value="hybrid">Hybrid</SelectItem>
                  </SelectContent>
                </Select>
                <Textarea
                  value={editedDescription}
                  onChange={(e) => setEditedDescription(e.target.value)}
                  placeholder="Description"
                  rows={2}
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSave}>Save</Button>
                  <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
                </div>
              </div>
            ) : (
              <>
                <CardTitle className="text-lg">{network.name}</CardTitle>
                <CardDescription className="mt-1">
                  <div className="flex gap-2 mt-2">
                    <Badge className={getProviderColor(network.provider)}>
                      {network.provider.toUpperCase()}
                    </Badge>
                    {network.network_type && (
                      <Badge variant="outline">
                        {network.network_type.toUpperCase()}
                      </Badge>
                    )}
                  </div>
                </CardDescription>
              </>
            )}
          </div>
          {!isEditing && (
            <div className="flex gap-2">
              <Button variant="ghost" size="icon" onClick={() => setIsEditing(true)}>
                <Network className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={onDelete}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      {!isEditing && (
        <CardContent>
          {network.image_path && (
            <div className="mb-3 border rounded-lg p-2 bg-muted">
              <ImageIcon className="h-8 w-8 mx-auto text-muted-foreground" />
              <p className="text-xs text-center mt-1 text-muted-foreground">
                Diagram attached
              </p>
            </div>
          )}
          {network.description && (
            <p className="text-sm text-muted-foreground line-clamp-3">
              {network.description}
            </p>
          )}
          <div className="mt-3 text-xs text-muted-foreground">
            Created {new Date(network.created_at).toLocaleDateString()}
          </div>
        </CardContent>
      )}
    </Card>
  );
};

// Network Diagram Card Component
const NetworkDiagramCard = ({ network }: { network: CloudNetwork }) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (network.image_path) {
      const { data } = supabase.storage
        .from('diagrams' as any)
        .getPublicUrl(network.image_path);
      setImageUrl(data.publicUrl);
    }
  }, [network.image_path]);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <ImageIcon className="w-4 h-4 text-primary" />
          {network.name}
        </CardTitle>
        {network.description && (
          <CardDescription>{network.description}</CardDescription>
        )}
      </CardHeader>
      {imageUrl && (
        <div className="px-6 pb-4">
          <div className="border rounded-lg overflow-hidden bg-muted">
            <img 
              src={imageUrl} 
              alt={network.name} 
              className="w-full h-48 object-cover"
            />
          </div>
        </div>
      )}
      <CardContent>
        <p className="text-xs text-muted-foreground">
          Created {new Date(network.created_at).toLocaleString()}
        </p>
      </CardContent>
    </Card>
  );
};

// Virtual Server Card Component with editable fields
const VirtualServerCard = ({ 
  server, 
  onUpdate 
}: { 
  server: VirtualServer; 
  onUpdate: (updates: Partial<VirtualServer>) => void;
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(server.name);
  const [editedType, setEditedType] = useState(server.type);
  const [editedDescription, setEditedDescription] = useState(server.description);
  const [editedSpecs, setEditedSpecs] = useState(server.specs);
  const [editedIp, setEditedIp] = useState(server.ip);

  // Reset edited values when server prop changes
  useEffect(() => {
    setEditedName(server.name);
    setEditedType(server.type);
    setEditedDescription(server.description);
    setEditedSpecs(server.specs);
    setEditedIp(server.ip);
  }, [server]);

  const handleSave = () => {
    onUpdate({
      name: editedName,
      type: editedType,
      description: editedDescription,
      specs: editedSpecs,
      ip: editedIp,
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    // Reset to original values
    setEditedName(server.name);
    setEditedType(server.type);
    setEditedDescription(server.description);
    setEditedSpecs(server.specs);
    setEditedIp(server.ip);
    setIsEditing(false);
  };

  return (
    <Card className="border-2 hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        {isEditing ? (
          <div className="space-y-2">
            <div>
              <Label className="text-xs text-muted-foreground">Server Name</Label>
              <Input
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                placeholder="Server name"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Server Type</Label>
              <Input
                value={editedType}
                onChange={(e) => setEditedType(e.target.value)}
                placeholder="Server type"
              />
            </div>
            <Badge className="w-fit" variant={server.status === 'active' ? 'default' : 'secondary'}>
              {server.status.toUpperCase()}
            </Badge>
          </div>
        ) : (
          <>
            <CardTitle className="text-lg flex items-center gap-2">
              <HardDrive className="w-4 h-4" />
              {server.name}
            </CardTitle>
            <Badge className="w-fit" variant={server.status === 'active' ? 'default' : 'secondary'}>
              {server.status.toUpperCase()}
            </Badge>
          </>
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        {isEditing ? (
          <div className="space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground">Description</Label>
              <Textarea
                value={editedDescription}
                onChange={(e) => setEditedDescription(e.target.value)}
                rows={2}
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Specifications (CPU, RAM, Storage)</Label>
              <Input
                value={editedSpecs}
                onChange={(e) => setEditedSpecs(e.target.value)}
                placeholder="e.g., 8 vCPU, 32GB RAM, 500GB Storage"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">IP Address</Label>
              <Input
                value={editedIp}
                onChange={(e) => setEditedIp(e.target.value)}
                className="font-mono"
                placeholder="e.g., 10.0.1.10"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button size="sm" onClick={handleSave}>
                <Save className="h-3 w-3 mr-1" />
                Save
              </Button>
              <Button size="sm" variant="outline" onClick={handleCancel}>
                <X className="h-3 w-3 mr-1" />
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Type</p>
              <p className="text-sm">{server.type}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Description</p>
              <p className="text-sm">{server.description}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Specifications</p>
              <p className="text-sm">{server.specs}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">IP Address</p>
              <p className="text-sm font-mono">{server.ip}</p>
            </div>
            <Button size="sm" variant="outline" onClick={() => setIsEditing(true)} className="mt-3 w-full">
              <Edit className="h-3 w-3 mr-2" />
              Edit Configuration
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default NymbisRdpCloud;
