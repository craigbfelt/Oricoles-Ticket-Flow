import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { fetchCredentials } from "@/lib/credentialUtils";
import { consolidateUsersByEmail, type ConsolidatedUser, getCredentialsSummary } from "@/lib/userConsolidationUtils";
import DashboardLayout from "@/components/DashboardLayout";
import { useToast } from "@/hooks/use-toast";
import { Monitor, Upload, Plus, Trash2, ArrowLeftRight, Filter, Wifi, Server, Copy, Check, ArrowLeft } from "lucide-react";
import { DataTable, type Column } from "@/components/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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

interface RdpCredential {
  id: string;
  username: string;
  password: string;
  service_type: "VPN" | "RDP";
  email: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

const Rdp = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [credentials, setCredentials] = useState<RdpCredential[]>([]);
  const [consolidatedUsers, setConsolidatedUsers] = useState<ConsolidatedUser[]>([]);
  const [showConsolidated, setShowConsolidated] = useState(true); // Default to consolidated view
  const [loading, setLoading] = useState(true);
  const [selectedCredential, setSelectedCredential] = useState<RdpCredential | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [bulkConvertDialogOpen, setBulkConvertDialogOpen] = useState(false);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedRows, setSelectedRows] = useState<RdpCredential[]>([]);
  const [csvPreview, setCsvPreview] = useState<Array<{
    username: string;
    password: string;
    email: string;
    notes: string;
    valid: boolean;
    errors: string[];
  }>>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [hasEmailFilter, setHasEmailFilter] = useState(false);
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "week" | "month">("all");
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    username: "",
    password: "",
    email: "",
    notes: "",
  });

  useEffect(() => {
    checkAccess();
    fetchRdpCredentials();
  }, [navigate]);

  const checkAccess = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }
  };

  const fetchRdpCredentials = async () => {
    setLoading(true);
    
    // Fetch only RDP credentials
    const { data, error } = await fetchCredentials('RDP');
    
    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch RDP credentials",
        variant: "destructive",
      });
      setCredentials([]);
      setConsolidatedUsers([]);
    } else {
      const allCredentials = (data || []) as RdpCredential[];
      
      // Store RDP-only credentials for legacy view
      setCredentials(allCredentials.filter(c => c.service_type === 'RDP'));
      
      // Create consolidated view (one user per email with both VPN & RDP credentials)
      const consolidated = consolidateUsersByEmail(allCredentials);
      setConsolidatedUsers(consolidated);
    }
    setLoading(false);
  };

  const handleRowClick = (credential: RdpCredential) => {
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

  const handleConsolidatedRowClick = (user: ConsolidatedUser) => {
    // For consolidated view, we show all credentials for this user
    // Open sheet with the first RDP credential if available, otherwise first credential
    const firstCred = user.rdpCredentials[0] || user.allCredentials[0];
    if (firstCred) {
      const credential: RdpCredential = {
        id: firstCred.id,
        username: firstCred.username,
        password: firstCred.password,
        service_type: firstCred.service_type,
        email: user.email,
        notes: firstCred.notes,
        created_at: firstCred.created_at,
        updated_at: firstCred.updated_at,
      };
      setSelectedCredential(credential);
      setFormData({
        username: credential.username,
        password: credential.password,
        email: credential.email || "",
        notes: credential.notes || "",
      });
      setIsEditing(true);
      setSheetOpen(true);
    }
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
      service_type: "RDP" as const,
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
        fetchRdpCredentials();
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
        fetchRdpCredentials();
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
      fetchRdpCredentials();
    }
  };

  const handleBulkConvertToVpn = async () => {
    const ids = selectedRows.map((row) => row.id);
    const { error } = await supabase
      .from("vpn_rdp_credentials")
      .update({ service_type: "VPN" })
      .in("id", ids);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to convert credentials to VPN",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: `Converted ${selectedRows.length} credential(s) to VPN`,
      });
      setSelectedRows([]);
      setBulkConvertDialogOpen(false);
      fetchRdpCredentials();
    }
  };

  const handleBulkDelete = async () => {
    const ids = selectedRows.map((row) => row.id);
    const { error } = await supabase
      .from("vpn_rdp_credentials")
      .delete()
      .in("id", ids);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete credentials",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: `Deleted ${selectedRows.length} credential(s)`,
      });
      setSelectedRows([]);
      setBulkDeleteDialogOpen(false);
      fetchRdpCredentials();
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
      
      const hasHeader = rows[0].toLowerCase().includes("username");
      const dataRows = hasHeader ? rows.slice(1) : rows;
      
      const previewData = dataRows.map((row, index) => {
        const columns = row.split(",").map(cell => cell.trim());
        const errors: string[] = [];
        
        let username, password, email, notes;
        
        if (columns.length >= 5) {
          [username, password, , email, notes] = columns;
        } else if (columns.length >= 4) {
          [username, password, email, notes] = columns;
        } else {
          errors.push("Insufficient columns");
        }
        
        if (!username || username.length === 0) {
          errors.push("Username is required");
        }
        if (!password || password.length === 0) {
          errors.push("Password is required");
        }
        if (username && username.length > 100) {
          errors.push("Username too long (max 100 chars)");
        }
        if (email && email.length > 0 && !email.includes("@")) {
          errors.push("Invalid email format");
        }
        
        return {
          username: username || "",
          password: password || "",
          email: email || "",
          notes: notes || "",
          valid: errors.length === 0,
          errors,
        };
      });
      
      setCsvPreview(previewData);
      setShowPreview(true);
    };

    reader.readAsText(csvFile);
  };

  const handleDownloadSampleCsv = () => {
    const sampleCsv = `username,password,email,notes
rdpuser1,SecurePass123,user1@example.com,Primary RDP account
rdpuser2,MyPassword456,user2@example.com,Secondary access
rdpuser3,Pass789word,user3@example.com,Guest RDP user`;
    
    const blob = new Blob([sampleCsv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample-rdp-credentials.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    toast({
      title: "Sample Downloaded",
      description: "Use this template to format your CSV file",
    });
  };

  const handleConfirmImport = async () => {
    const validCredentials = csvPreview
      .filter(cred => cred.valid)
      .map(cred => ({
        username: cred.username,
        password: cred.password,
        service_type: "RDP" as const,
        email: cred.email || null,
        notes: cred.notes || null,
      }));

    if (validCredentials.length === 0) {
      toast({
        title: "Error",
        description: "No valid credentials to import",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase
      .from("vpn_rdp_credentials")
      .insert(validCredentials);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to import credentials",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: `Imported ${validCredentials.length} credential(s) successfully`,
      });
      setAddDialogOpen(false);
      setCsvFile(null);
      setCsvPreview([]);
      setShowPreview(false);
      fetchRdpCredentials();
    }
  };

  const getFilteredCredentials = () => {
    let filtered = credentials;

    // Filter by email presence
    if (hasEmailFilter) {
      filtered = filtered.filter((cred) => cred.email && cred.email.length > 0);
    }

    // Filter by date
    if (dateFilter !== "all") {
      const now = new Date();
      const filterDate = new Date();
      
      if (dateFilter === "today") {
        filterDate.setHours(0, 0, 0, 0);
      } else if (dateFilter === "week") {
        filterDate.setDate(now.getDate() - 7);
      } else if (dateFilter === "month") {
        filterDate.setMonth(now.getMonth() - 1);
      }

      filtered = filtered.filter((cred) => {
        const createdDate = new Date(cred.created_at);
        return createdDate >= filterDate;
      });
    }

    return filtered;
  };

  const handleClearAllFilters = () => {
    setHasEmailFilter(false);
    setDateFilter("all");
  };

  const copyToClipboard = async (text: string, fieldId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldId);
      setTimeout(() => setCopiedField(null), 2000);
      toast({
        title: "Copied",
        description: "Copied to clipboard",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      });
    }
  };

  const activeFilterCount = (hasEmailFilter ? 1 : 0) + (dateFilter !== "all" ? 1 : 0);

  const columns: Column<RdpCredential>[] = [
    {
      key: "username",
      label: "Username",
      sortable: true,
      filterPlaceholder: "Filter by username...",
    },
    {
      key: "password",
      label: "Password",
      sortable: false,
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

  const consolidatedColumns: Column<ConsolidatedUser>[] = [
    {
      key: "email",
      label: "Email",
      sortable: true,
      filterPlaceholder: "Filter by email...",
    },
    {
      key: "vpnCredentials",
      label: "VPN Username",
      sortable: false,
      render: (_value, user) => (
        <div className="flex flex-col gap-1">
          {user.hasVpn ? (
            user.vpnCredentials.map((cred, idx) => (
              <div key={`vpn-user-${idx}`} className="flex items-center gap-2">
                <span className="text-sm">{cred.username}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    copyToClipboard(cred.username, `vpn-user-${user.email}-${idx}`);
                  }}
                >
                  {copiedField === `vpn-user-${user.email}-${idx}` ? (
                    <Check className="h-3 w-3 text-green-500" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </Button>
              </div>
            ))
          ) : (
            <span className="text-muted-foreground">NA</span>
          )}
        </div>
      ),
    },
    {
      key: "vpnPassword",
      label: "VPN Password",
      sortable: false,
      render: (_value, user) => (
        <div className="flex flex-col gap-1">
          {user.hasVpn ? (
            user.vpnCredentials.map((cred, idx) => (
              <div key={`vpn-pass-${idx}`} className="flex items-center gap-2">
                <span className="text-sm font-mono">{cred.password}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    copyToClipboard(cred.password, `vpn-pass-${user.email}-${idx}`);
                  }}
                >
                  {copiedField === `vpn-pass-${user.email}-${idx}` ? (
                    <Check className="h-3 w-3 text-green-500" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </Button>
              </div>
            ))
          ) : (
            <span className="text-muted-foreground">NA</span>
          )}
        </div>
      ),
    },
    {
      key: "rdpCredentials",
      label: "RDP Username",
      sortable: false,
      render: (_value, user) => (
        <div className="flex flex-col gap-1">
          {user.hasRdp ? (
            user.rdpCredentials.map((cred, idx) => (
              <div key={`rdp-user-${idx}`} className="flex items-center gap-2">
                <span className="text-sm">{cred.username}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    copyToClipboard(cred.username, `rdp-user-${user.email}-${idx}`);
                  }}
                >
                  {copiedField === `rdp-user-${user.email}-${idx}` ? (
                    <Check className="h-3 w-3 text-green-500" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </Button>
              </div>
            ))
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </div>
      ),
    },
    {
      key: "rdpPassword",
      label: "RDP Password",
      sortable: false,
      render: (_value, user) => (
        <div className="flex flex-col gap-1">
          {user.hasRdp ? (
            user.rdpCredentials.map((cred, idx) => (
              <div key={`rdp-pass-${idx}`} className="flex items-center gap-2">
                <span className="text-sm font-mono">{cred.password}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    copyToClipboard(cred.password, `rdp-pass-${user.email}-${idx}`);
                  }}
                >
                  {copiedField === `rdp-pass-${user.email}-${idx}` ? (
                    <Check className="h-3 w-3 text-green-500" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </Button>
              </div>
            ))
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </div>
      ),
    },
  ];

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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Monitor className="w-8 h-8" />
              RDP & VPN Users
            </h1>
            <p className="text-muted-foreground">
              {showConsolidated 
                ? "One user per email with all their credentials (VPN + RDP)" 
                : "Individual RDP credentials (may show duplicates)"}
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => setShowConsolidated(!showConsolidated)}
          >
            {showConsolidated ? "Show Individual Credentials" : "Show Consolidated Users"}
          </Button>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <Button
              variant={hasEmailFilter ? "default" : "outline"}
              size="sm"
              onClick={() => setHasEmailFilter(!hasEmailFilter)}
            >
              Has Email {hasEmailFilter && "✓"}
            </Button>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as any)}
              className="h-9 px-3 rounded-md border border-input bg-background text-sm"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
            </select>
            {activeFilterCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearAllFilters}
              >
                Clear Filters ({activeFilterCount})
              </Button>
            )}
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
                Convert to VPN
              </Button>
              <Button 
                variant="destructive" 
                size="sm"
                onClick={() => setBulkDeleteDialogOpen(true)}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Selected
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
              <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Import RDP Credentials from CSV</DialogTitle>
                  <DialogDescription>
                    Upload a CSV file with either format:
                    <br />• 4 columns: username, password, email, notes
                    <br />• 5 columns: username, password, service_type, email, notes
                    <br />
                    <span className="text-xs text-muted-foreground">First row can be a header (will be auto-detected)</span>
                  </DialogDescription>
                </DialogHeader>
                
                {!showPreview ? (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="csv-file">CSV File</Label>
                      <Input
                        id="csv-file"
                        type="file"
                        accept=".csv"
                        onChange={(e) => {
                          setCsvFile(e.target.files?.[0] || null);
                          setShowPreview(false);
                          setCsvPreview([]);
                        }}
                      />
                    </div>
                    <Button 
                      onClick={handleDownloadSampleCsv} 
                      variant="outline" 
                      className="w-full"
                    >
                      Download Sample CSV Template
                    </Button>
                    <Button onClick={handleCsvUpload} className="w-full" disabled={!csvFile}>
                      Preview Import
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">
                          Found {csvPreview.length} rows
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {csvPreview.filter(r => r.valid).length} valid, {csvPreview.filter(r => !r.valid).length} with errors
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setShowPreview(false);
                          setCsvPreview([]);
                          setCsvFile(null);
                        }}
                      >
                        Choose Different File
                      </Button>
                    </div>
                    
                    <div className="border rounded-lg max-h-96 overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-muted sticky top-0">
                          <tr>
                            <th className="p-2 text-left">Status</th>
                            <th className="p-2 text-left">Username</th>
                            <th className="p-2 text-left">Password</th>
                            <th className="p-2 text-left">Email</th>
                            <th className="p-2 text-left">Notes</th>
                          </tr>
                        </thead>
                        <tbody>
                          {csvPreview.map((row, index) => (
                            <tr key={index} className={row.valid ? "" : "bg-destructive/10"}>
                              <td className="p-2">
                                {row.valid ? (
                                  <span className="text-green-600">✓</span>
                                ) : (
                                  <span className="text-destructive" title={row.errors.join(", ")}>✗</span>
                                )}
                              </td>
                              <td className="p-2 truncate max-w-[150px]">{row.username || "—"}</td>
                              <td className="p-2 truncate max-w-[150px]">{row.password || "—"}</td>
                              <td className="p-2 truncate max-w-[150px]">{row.email || "—"}</td>
                              <td className="p-2 truncate max-w-[150px]">{row.notes || "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    
                    {csvPreview.some(r => !r.valid) && (
                      <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                        <p className="text-sm font-medium text-destructive mb-2">Validation Errors:</p>
                        <ul className="text-xs space-y-1 text-destructive">
                          {csvPreview.filter(r => !r.valid).slice(0, 5).map((row, index) => (
                            <li key={index}>Row {csvPreview.indexOf(row) + 1}: {row.errors.join(", ")}</li>
                          ))}
                          {csvPreview.filter(r => !r.valid).length > 5 && (
                            <li>... and {csvPreview.filter(r => !r.valid).length - 5} more errors</li>
                          )}
                        </ul>
                      </div>
                    )}
                    
                    <Button 
                      onClick={handleConfirmImport} 
                      className="w-full"
                      disabled={csvPreview.filter(r => r.valid).length === 0}
                    >
                      Import {csvPreview.filter(r => r.valid).length} Valid Credential(s)
                    </Button>
                  </div>
                )}
              </DialogContent>
            </Dialog>
            <Button onClick={handleAddNew}>
              <Plus className="w-4 h-4 mr-2" />
              Add RDP Credential
            </Button>
          </div>
        </div>

        {loading ? (
          <p>Loading credentials...</p>
        ) : showConsolidated ? (
          <DataTable
            data={consolidatedUsers}
            columns={consolidatedColumns}
            onRowClick={handleConsolidatedRowClick}
            searchKeys={["email"]}
            selectable={false}
          />
        ) : (
          <DataTable
            data={getFilteredCredentials()}
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
              <AlertDialogTitle>Convert to VPN Credentials?</AlertDialogTitle>
              <AlertDialogDescription>
                This will convert {selectedRows.length} RDP credential(s) to VPN credentials. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleBulkConvertToVpn}>Convert</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Selected Credentials?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete {selectedRows.length} RDP credential(s). This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
};

export default Rdp;
