import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { useToast } from "@/hooks/use-toast";
import { KeyRound, Upload, Plus, Trash2, ArrowLeftRight } from "lucide-react";
import { DataTable, type Column } from "@/components/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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

interface VpnCredential {
  id: string;
  username: string;
  password: string;
  service_type: "VPN" | "RDP";
  email: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

const Vpn = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [credentials, setCredentials] = useState<VpnCredential[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCredential, setSelectedCredential] = useState<VpnCredential | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [bulkConvertDialogOpen, setBulkConvertDialogOpen] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedRows, setSelectedRows] = useState<VpnCredential[]>([]);

  const [formData, setFormData] = useState({
    username: "",
    password: "",
    email: "",
    notes: "",
  });

  useEffect(() => {
    checkAccess();
    fetchCredentials();
  }, [navigate]);

  const checkAccess = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }

    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .in("role", ["admin", "support_staff"])
      .maybeSingle();

    if (!data) {
      toast({
        title: "Access Denied",
        description: "You must be an admin or support staff to access this page",
        variant: "destructive",
      });
      navigate("/dashboard");
    }
  };

  const fetchCredentials = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("vpn_rdp_credentials")
      .select("*")
      .eq("service_type", "VPN")
      .order("username");

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch VPN credentials",
        variant: "destructive",
      });
    } else {
      setCredentials((data || []) as VpnCredential[]);
    }
    setLoading(false);
  };

  const handleRowClick = (credential: VpnCredential) => {
    setSelectedCredential(credential);
    setFormData({
      username: credential.username,
      password: credential.password,
      email: credential.email || "",
      notes: credential.notes || "",
    });
    setIsEditing(true);
    setSheetOpen(true);
  };

  const handleAddNew = () => {
    setSelectedCredential(null);
    setFormData({
      username: "",
      password: "",
      email: "",
      notes: "",
    });
    setIsEditing(false);
    setSheetOpen(true);
  };

  const handleSave = async () => {
    if (!formData.username || !formData.password) {
      toast({
        title: "Error",
        description: "Username and password are required",
        variant: "destructive",
      });
      return;
    }

    const dataToSave = {
      username: formData.username,
      password: formData.password,
      service_type: "VPN" as const,
      email: formData.email || null,
      notes: formData.notes || null,
    };

    if (isEditing && selectedCredential) {
      const { error } = await supabase
        .from("vpn_rdp_credentials")
        .update(dataToSave)
        .eq("id", selectedCredential.id);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to update credential",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: "Credential updated successfully",
        });
        setSheetOpen(false);
        fetchCredentials();
      }
    } else {
      const { error } = await supabase
        .from("vpn_rdp_credentials")
        .insert([dataToSave]);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to add credential",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: "Credential added successfully",
        });
        setSheetOpen(false);
        fetchCredentials();
      }
    }
  };

  const handleDelete = async () => {
    if (!selectedCredential) return;

    const { error } = await supabase
      .from("vpn_rdp_credentials")
      .delete()
      .eq("id", selectedCredential.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete credential",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Credential deleted successfully",
      });
      setSheetOpen(false);
      fetchCredentials();
    }
  };

  const handleBulkConvertToRdp = async () => {
    const ids = selectedRows.map((row) => row.id);
    const { error } = await supabase
      .from("vpn_rdp_credentials")
      .update({ service_type: "RDP" })
      .in("id", ids);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to convert credentials to RDP",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: `Converted ${selectedRows.length} credential(s) to RDP`,
      });
      setSelectedRows([]);
      setBulkConvertDialogOpen(false);
      fetchCredentials();
    }
  };

  const handleCsvUpload = async () => {
    if (!csvFile) {
      toast({
        title: "Error",
        description: "Please select a CSV file",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      const rows = text.split("\n").filter(row => row.trim());
      
      const dataRows = rows[0].toLowerCase().includes("username") ? rows.slice(1) : rows;
      
      const credentialsToInsert = dataRows.map(row => {
        const [username, password, , email, notes] = row.split(",").map(cell => cell.trim());
        return {
          username,
          password,
          service_type: "VPN" as const,
          email: email || null,
          notes: notes || null,
        };
      }).filter(cred => cred.username && cred.password);

      if (credentialsToInsert.length === 0) {
        toast({
          title: "Error",
          description: "No valid credentials found in CSV file",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from("vpn_rdp_credentials")
        .insert(credentialsToInsert);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to import credentials",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: `Imported ${credentialsToInsert.length} credential(s) successfully`,
        });
        setAddDialogOpen(false);
        setCsvFile(null);
        fetchCredentials();
      }
    };

    reader.readAsText(csvFile);
  };

  const columns: Column<VpnCredential>[] = [
    {
      key: "username",
      label: "Username",
      sortable: true,
      filterPlaceholder: "Filter by username...",
    },
    {
      key: "password",
      label: "Password",
      render: () => "••••••••",
    },
    {
      key: "email",
      label: "Email",
      sortable: true,
      filterPlaceholder: "Filter by email...",
    },
    {
      key: "notes",
      label: "Notes",
      render: (notes) => (
        <span className="truncate max-w-xs block">
          {notes || "—"}
        </span>
      ),
    },
  ];

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <KeyRound className="w-8 h-8" />
              VPN Credentials
            </h1>
            <p className="text-muted-foreground">Manage FortiClient VPN login credentials</p>
          </div>
        </div>

        <div className="flex items-center justify-between">
          {selectedRows.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {selectedRows.length} selected
              </span>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setBulkConvertDialogOpen(true)}
              >
                <ArrowLeftRight className="w-4 h-4 mr-2" />
                Convert to RDP
              </Button>
            </div>
          )}
          
          <div className="flex gap-2 ml-auto">
            <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Upload className="w-4 h-4 mr-2" />
                  Import CSV
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Import VPN Credentials from CSV</DialogTitle>
                  <DialogDescription>
                    Upload a CSV file with columns: username, password, service_type, email, notes
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="csv-file">CSV File</Label>
                    <Input
                      id="csv-file"
                      type="file"
                      accept=".csv"
                      onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                    />
                  </div>
                  <Button onClick={handleCsvUpload} className="w-full">
                    Upload and Import
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            <Button onClick={handleAddNew}>
              <Plus className="w-4 h-4 mr-2" />
              Add VPN Credential
            </Button>
          </div>
        </div>

        {loading ? (
          <p>Loading VPN credentials...</p>
        ) : (
          <DataTable
            data={credentials}
            columns={columns}
            onRowClick={handleRowClick}
            searchKeys={["username", "email"]}
            selectable={true}
            selectedRows={selectedRows}
            onSelectionChange={setSelectedRows}
          />
        )}

        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetContent className="overflow-y-auto">
            <SheetHeader>
              <SheetTitle>{isEditing ? "Edit Credential" : "Add Credential"}</SheetTitle>
              <SheetDescription>
                {isEditing ? "Update the credential information" : "Enter the credential details"}
              </SheetDescription>
            </SheetHeader>

            <div className="space-y-6 mt-6">
              <div className="space-y-2">
                <Label htmlFor="username">Username *</Label>
                <Input
                  id="username"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="Enter username"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password *</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Enter password"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="user@example.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional notes..."
                  rows={3}
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button onClick={handleSave} className="flex-1">
                  {isEditing ? "Update" : "Add"}
                </Button>
                {isEditing && (
                  <Button onClick={handleDelete} variant="destructive">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          </SheetContent>
        </Sheet>

        <AlertDialog open={bulkConvertDialogOpen} onOpenChange={setBulkConvertDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Convert to RDP Credentials?</AlertDialogTitle>
              <AlertDialogDescription>
                This will convert {selectedRows.length} VPN credential(s) to RDP credentials. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleBulkConvertToRdp}>Convert</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
};

export default Vpn;
