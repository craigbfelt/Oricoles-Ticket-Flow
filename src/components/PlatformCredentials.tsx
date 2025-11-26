import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  Key, 
  Plus, 
  Trash2, 
  Edit, 
  Eye, 
  EyeOff, 
  Upload, 
  Download, 
  Search,
  Copy,
  Check,
  Loader2,
  Users,
  Monitor,
  Mail,
  Server,
  Shield
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

export interface PlatformCredential {
  id: string;
  platform: string;
  provider: string;
  credential_type: string;
  username: string;
  password: string;
  email: string | null;
  server_url: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface PlatformCredentialsProps {
  platform: "bluewave" | "sage" | "microsoft365" | "active_directory" | "qwerti" | "general";
  title?: string;
  description?: string;
}

const CREDENTIAL_TYPES = [
  { value: "rdp", label: "RDP", icon: Monitor },
  { value: "active_directory", label: "Active Directory", icon: Users },
  { value: "email", label: "Email", icon: Mail },
  { value: "api", label: "API Key", icon: Key },
  { value: "database", label: "Database", icon: Server },
  { value: "admin", label: "Admin Account", icon: Shield },
  { value: "other", label: "Other", icon: Key },
];

const PROVIDERS = [
  { value: "microsoft365", label: "Microsoft 365" },
  { value: "qwerti", label: "Qwerti" },
  { value: "active_directory", label: "Active Directory" },
  { value: "oricol_rdp", label: "Oricol RDP Server" },
  { value: "sage", label: "Sage Evolution" },
  { value: "bluewave", label: "Bluewave" },
  { value: "other", label: "Other" },
];

export const PlatformCredentials = ({ 
  platform, 
  title = "Platform Credentials",
  description = "Manage login credentials for this platform"
}: PlatformCredentialsProps) => {
  const [credentials, setCredentials] = useState<PlatformCredential[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editingCredential, setEditingCredential] = useState<PlatformCredential | null>(null);
  const [showPasswords, setShowPasswords] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    credential_type: "",
    provider: "",
    username: "",
    password: "",
    email: "",
    server_url: "",
    notes: "",
  });

  useEffect(() => {
    fetchCredentials();
  }, [platform]);

  const fetchCredentials = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from("platform_credentials")
        .select("*")
        .eq("platform", platform)
        .order("credential_type", { ascending: true });

      if (error) throw error;
      setCredentials(data || []);
    } catch (error) {
      console.error("Error fetching credentials:", error);
      // Table might not exist yet
      setCredentials([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddCredential = async () => {
    if (!formData.username || !formData.password || !formData.credential_type) {
      toast.error("Username, password, and credential type are required");
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("You must be logged in");
        return;
      }

      const { error } = await (supabase as any)
        .from("platform_credentials")
        .insert({
          platform,
          provider: formData.provider || platform,
          credential_type: formData.credential_type,
          username: formData.username,
          password: formData.password,
          email: formData.email || null,
          server_url: formData.server_url || null,
          notes: formData.notes || null,
          is_active: true,
          created_by: user.id,
        });

      if (error) throw error;

      toast.success("Credential added successfully");
      setAddDialogOpen(false);
      resetForm();
      fetchCredentials();
    } catch (error) {
      console.error("Error adding credential:", error);
      toast.error("Failed to add credential");
    }
  };

  const handleUpdateCredential = async () => {
    if (!editingCredential) return;

    try {
      const { error } = await (supabase as any)
        .from("platform_credentials")
        .update({
          credential_type: formData.credential_type,
          provider: formData.provider,
          username: formData.username,
          password: formData.password,
          email: formData.email || null,
          server_url: formData.server_url || null,
          notes: formData.notes || null,
        })
        .eq("id", editingCredential.id);

      if (error) throw error;

      toast.success("Credential updated successfully");
      setEditingCredential(null);
      resetForm();
      fetchCredentials();
    } catch (error) {
      console.error("Error updating credential:", error);
      toast.error("Failed to update credential");
    }
  };

  const handleDeleteCredential = async (id: string) => {
    if (!confirm("Are you sure you want to delete this credential?")) return;

    try {
      const { error } = await (supabase as any)
        .from("platform_credentials")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Credential deleted");
      fetchCredentials();
    } catch (error) {
      console.error("Error deleting credential:", error);
      toast.error("Failed to delete credential");
    }
  };

  const resetForm = () => {
    setFormData({
      credential_type: "",
      provider: "",
      username: "",
      password: "",
      email: "",
      server_url: "",
      notes: "",
    });
  };

  const handleEdit = (credential: PlatformCredential) => {
    setEditingCredential(credential);
    setFormData({
      credential_type: credential.credential_type,
      provider: credential.provider,
      username: credential.username,
      password: credential.password,
      email: credential.email || "",
      server_url: credential.server_url || "",
      notes: credential.notes || "",
    });
  };

  const togglePasswordVisibility = (id: string) => {
    const newShowPasswords = new Set(showPasswords);
    if (newShowPasswords.has(id)) {
      newShowPasswords.delete(id);
    } else {
      newShowPasswords.add(id);
    }
    setShowPasswords(newShowPasswords);
  };

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      toast.error("Failed to copy");
    }
  };

  const handleCSVImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const lines = text.split("\n").filter(line => line.trim());
      const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("You must be logged in");
        return;
      }

      const credentialsToImport = lines.slice(1).map(line => {
        const values = line.split(",").map(v => v.trim());
        const record: any = {
          platform,
          is_active: true,
          created_by: user.id,
        };
        
        headers.forEach((header, index) => {
          const value = values[index];
          if (header.includes("type") || header.includes("credential")) {
            record.credential_type = value || "other";
          } else if (header.includes("provider")) {
            record.provider = value || platform;
          } else if (header.includes("username") || header.includes("user")) {
            record.username = value;
          } else if (header.includes("password") || header.includes("pass")) {
            record.password = value;
          } else if (header.includes("email")) {
            record.email = value || null;
          } else if (header.includes("server") || header.includes("url")) {
            record.server_url = value || null;
          } else if (header.includes("notes") || header.includes("description")) {
            record.notes = value || null;
          }
        });
        
        // Set defaults if not provided
        if (!record.provider) record.provider = platform;
        if (!record.credential_type) record.credential_type = "other";
        
        return record;
      }).filter(r => r.username && r.password);

      if (credentialsToImport.length === 0) {
        throw new Error("No valid credentials found in CSV. Required columns: username, password");
      }

      const { error } = await (supabase as any)
        .from("platform_credentials")
        .insert(credentialsToImport);

      if (error) throw error;

      toast.success(`Imported ${credentialsToImport.length} credentials`);
      fetchCredentials();
    } catch (error) {
      console.error("Error importing CSV:", error);
      toast.error(error instanceof Error ? error.message : "Failed to import CSV");
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const downloadCSVTemplate = () => {
    const headers = ["credential_type", "provider", "username", "password", "email", "server_url", "notes"];
    const example = "rdp,oricol_rdp,admin,password123,admin@example.com,rdp.oricol.com,Main admin account";
    const csv = headers.join(",") + "\n" + example;
    
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${platform}_credentials_template.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const exportCredentials = () => {
    if (credentials.length === 0) {
      toast.error("No credentials to export");
      return;
    }

    const headers = ["credential_type", "provider", "username", "password", "email", "server_url", "notes"];
    const rows = credentials.map(c => [
      c.credential_type,
      c.provider,
      c.username,
      c.password,
      c.email || "",
      c.server_url || "",
      c.notes || ""
    ].map(v => `"${v.replace(/"/g, '""')}"`).join(","));
    
    const csv = headers.join(",") + "\n" + rows.join("\n");
    
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${platform}_credentials_export.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast.success("Credentials exported");
  };

  const filteredCredentials = credentials.filter(c => {
    const searchLower = searchQuery.toLowerCase();
    return (
      c.username.toLowerCase().includes(searchLower) ||
      c.credential_type.toLowerCase().includes(searchLower) ||
      c.provider.toLowerCase().includes(searchLower) ||
      c.email?.toLowerCase().includes(searchLower) ||
      c.notes?.toLowerCase().includes(searchLower)
    );
  });

  const getTypeIcon = (type: string) => {
    const typeConfig = CREDENTIAL_TYPES.find(t => t.value === type);
    const Icon = typeConfig?.icon || Key;
    return <Icon className="h-4 w-4" />;
  };

  const getTypeLabel = (type: string) => {
    return CREDENTIAL_TYPES.find(t => t.value === type)?.label || type;
  };

  const getProviderLabel = (provider: string) => {
    return PROVIDERS.find(p => p.value === provider)?.label || provider;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              {title}
            </CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Credential
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Add Credential</DialogTitle>
                  <DialogDescription>
                    Add a new login credential for this platform
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Credential Type *</Label>
                      <Select
                        value={formData.credential_type}
                        onValueChange={(v) => setFormData({ ...formData, credential_type: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          {CREDENTIAL_TYPES.map(type => (
                            <SelectItem key={type.value} value={type.value}>
                              <div className="flex items-center gap-2">
                                <type.icon className="h-4 w-4" />
                                {type.label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Provider</Label>
                      <Select
                        value={formData.provider}
                        onValueChange={(v) => setFormData({ ...formData, provider: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select provider" />
                        </SelectTrigger>
                        <SelectContent>
                          {PROVIDERS.map(provider => (
                            <SelectItem key={provider.value} value={provider.value}>
                              {provider.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Username *</Label>
                      <Input
                        value={formData.username}
                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                        placeholder="Enter username"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Password *</Label>
                      <Input
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        placeholder="Enter password"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="user@example.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Server URL</Label>
                      <Input
                        value={formData.server_url}
                        onChange={(e) => setFormData({ ...formData, server_url: e.target.value })}
                        placeholder="server.example.com"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <Textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Additional notes..."
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setAddDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleAddCredential}>Add Credential</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Button variant="outline" size="sm" onClick={downloadCSVTemplate}>
              <Download className="h-4 w-4 mr-2" />
              Template
            </Button>
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-4 w-4 mr-2" />
              Import
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleCSVImport}
              className="hidden"
            />
            {credentials.length > 0 && (
              <Button variant="outline" size="sm" onClick={exportCredentials}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search credentials..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filteredCredentials.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Key className="h-12 w-12 mx-auto mb-3" />
            <h3 className="font-medium mb-1">No credentials</h3>
            <p className="text-sm">
              {searchQuery ? "No credentials match your search" : "Add your first credential or import from CSV"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Password</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Server</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCredentials.map((credential) => (
                  <TableRow key={credential.id}>
                    <TableCell>
                      <Badge variant="outline" className="flex items-center gap-1 w-fit">
                        {getTypeIcon(credential.credential_type)}
                        {getTypeLabel(credential.credential_type)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {getProviderLabel(credential.provider)}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      <div className="flex items-center gap-2">
                        {credential.username}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => copyToClipboard(credential.username, `u-${credential.id}`)}
                        >
                          {copiedId === `u-${credential.id}` ? (
                            <Check className="h-3 w-3 text-green-500" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm">
                          {showPasswords.has(credential.id) ? credential.password : "••••••••"}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => togglePasswordVisibility(credential.id)}
                        >
                          {showPasswords.has(credential.id) ? (
                            <EyeOff className="h-3 w-3" />
                          ) : (
                            <Eye className="h-3 w-3" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => copyToClipboard(credential.password, `p-${credential.id}`)}
                        >
                          {copiedId === `p-${credential.id}` ? (
                            <Check className="h-3 w-3 text-green-500" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {credential.email || "-"}
                    </TableCell>
                    <TableCell className="text-sm font-mono">
                      {credential.server_url || "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(credential)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteCredential(credential.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {/* Edit Dialog */}
      <Dialog open={!!editingCredential} onOpenChange={(open) => !open && setEditingCredential(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Credential</DialogTitle>
            <DialogDescription>
              Update this credential's information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Credential Type</Label>
                <Select
                  value={formData.credential_type}
                  onValueChange={(v) => setFormData({ ...formData, credential_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CREDENTIAL_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-2">
                          <type.icon className="h-4 w-4" />
                          {type.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Provider</Label>
                <Select
                  value={formData.provider}
                  onValueChange={(v) => setFormData({ ...formData, provider: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROVIDERS.map(provider => (
                      <SelectItem key={provider.value} value={provider.value}>
                        {provider.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Username</Label>
                <Input
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Password</Label>
                <Input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Server URL</Label>
                <Input
                  value={formData.server_url}
                  onChange={(e) => setFormData({ ...formData, server_url: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingCredential(null)}>Cancel</Button>
            <Button onClick={handleUpdateCredential}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
