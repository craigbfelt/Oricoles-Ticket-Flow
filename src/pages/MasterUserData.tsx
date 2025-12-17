import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { useToast } from "@/hooks/use-toast";
import { Database, Upload, Download, Save, X, Edit, Check, AlertCircle, RefreshCw, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

interface MasterUser {
  id: string;
  display_name: string | null;
  email: string;
  job_title: string | null;
  department: string | null;
  branch_id: string | null;
  branch_name?: string | null;
  vpn_username: string | null;
  vpn_password: string | null;
  rdp_username: string | null;
  rdp_password: string | null;
  m365_username: string | null;
  m365_password: string | null;
  is_active: boolean;
  source: string | null;
  credentials_updated_at: string | null;
  created_at: string;
  updated_at: string;
}

interface CSVPreviewRow {
  row_number: number;
  email: string;
  display_name: string | null;
  changes: string[];
  is_new: boolean;
  is_valid: boolean;
  errors: string[];
  data: Partial<MasterUser>;
}

const MasterUserData = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [users, setUsers] = useState<MasterUser[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<MasterUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedUser, setEditedUser] = useState<Partial<MasterUser>>({});
  const [saving, setSaving] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvPreview, setCsvPreview] = useState<CSVPreviewRow[]>([]);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importingCsv, setImportingCsv] = useState(false);
  const [syncStatus, setSyncStatus] = useState<{
    synced: boolean;
    message: string;
  } | null>(null);
  const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set([
    'display_name', 'job_title', 'department', 'vpn_username', 'vpn_password', 
    'rdp_username', 'rdp_password', 'm365_username', 'm365_password'
  ]));

  useEffect(() => {
    checkAccess();
    fetchUsers();
  }, []);

  useEffect(() => {
    // Filter users based on search query
    if (searchQuery.trim() === "") {
      setFilteredUsers(users);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = users.filter(user => 
        user.email?.toLowerCase().includes(query) ||
        user.display_name?.toLowerCase().includes(query) ||
        user.vpn_username?.toLowerCase().includes(query) ||
        user.rdp_username?.toLowerCase().includes(query) ||
        user.department?.toLowerCase().includes(query)
      );
      setFilteredUsers(filtered);
    }
  }, [searchQuery, users]);

  const checkAccess = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }

    // Check if user is admin
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roles) {
      toast({
        title: "Access Denied",
        description: "You must be an admin to access this page",
        variant: "destructive",
      });
      navigate("/dashboard");
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("master_user_list")
        .select("*, branches:branch_id(name)")
        .order("display_name");

      if (error) throw error;

      // Add branch name to each user
      const usersWithBranch = data.map(user => ({
        ...user,
        branch_name: (user.branches as { name: string } | null)?.name || null,
      }));

      setUsers(usersWithBranch);
      setFilteredUsers(usersWithBranch);
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to fetch users: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (user: MasterUser) => {
    setEditingId(user.id);
    setEditedUser({ ...user });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditedUser({});
  };

  const handleSave = async () => {
    if (!editingId || !editedUser) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("master_user_list")
        .update({
          display_name: editedUser.display_name,
          job_title: editedUser.job_title,
          department: editedUser.department,
          vpn_username: editedUser.vpn_username,
          vpn_password: editedUser.vpn_password,
          rdp_username: editedUser.rdp_username,
          rdp_password: editedUser.rdp_password,
          m365_username: editedUser.m365_username,
          m365_password: editedUser.m365_password,
          is_active: editedUser.is_active,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "User data updated and synced across all tables",
      });

      setEditingId(null);
      setEditedUser({});
      fetchUsers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to save: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCsvFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvFile(file);
    
    // Parse CSV and create preview
    const text = await file.text();
    const lines = text.split("\n").filter(line => line.trim());
    const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
    
    // Validate headers
    const requiredHeaders = ['email'];
    const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
    if (missingHeaders.length > 0) {
      toast({
        title: "Invalid CSV",
        description: `Missing required columns: ${missingHeaders.join(", ")}`,
        variant: "destructive",
      });
      return;
    }

    const preview: CSVPreviewRow[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",").map(v => v.trim());
      const row: any = {};
      headers.forEach((header, idx) => {
        row[header] = values[idx] || null;
      });

      // Find existing user
      const existingUser = users.find(u => u.email.toLowerCase() === row.email?.toLowerCase());
      
      const changes: string[] = [];
      const errors: string[] = [];
      
      if (!row.email) {
        errors.push("Email is required");
      }

      if (existingUser) {
        // Compare and detect changes
        if (row.display_name && row.display_name !== existingUser.display_name) {
          changes.push(`display_name: "${existingUser.display_name}" → "${row.display_name}"`);
        }
        if (row.vpn_username && row.vpn_username !== existingUser.vpn_username) {
          changes.push(`vpn_username: "${existingUser.vpn_username}" → "${row.vpn_username}"`);
        }
        if (row.rdp_username && row.rdp_username !== existingUser.rdp_username) {
          changes.push(`rdp_username: "${existingUser.rdp_username}" → "${row.rdp_username}"`);
        }
        // Add more field comparisons as needed
      }

      preview.push({
        row_number: i,
        email: row.email,
        display_name: row.display_name,
        changes: changes,
        is_new: !existingUser,
        is_valid: errors.length === 0,
        errors: errors,
        data: row,
      });
    }

    setCsvPreview(preview);
    setShowImportDialog(true);
  };

  const handleImportCsv = async () => {
    setImportingCsv(true);
    try {
      const validRows = csvPreview.filter(row => row.is_valid);
      
      for (const row of validRows) {
        const updateData: any = {
          email: row.email,
          updated_at: new Date().toISOString(),
        };

        // Only include fields that are selected and have values
        if (selectedFields.has('display_name') && row.data.display_name) {
          updateData.display_name = row.data.display_name;
        }
        if (selectedFields.has('job_title') && row.data.job_title) {
          updateData.job_title = row.data.job_title;
        }
        if (selectedFields.has('department') && row.data.department) {
          updateData.department = row.data.department;
        }
        if (selectedFields.has('vpn_username') && row.data.vpn_username) {
          updateData.vpn_username = row.data.vpn_username;
        }
        if (selectedFields.has('vpn_password') && row.data.vpn_password) {
          updateData.vpn_password = row.data.vpn_password;
        }
        if (selectedFields.has('rdp_username') && row.data.rdp_username) {
          updateData.rdp_username = row.data.rdp_username;
        }
        if (selectedFields.has('rdp_password') && row.data.rdp_password) {
          updateData.rdp_password = row.data.rdp_password;
        }
        if (selectedFields.has('m365_username') && row.data.m365_username) {
          updateData.m365_username = row.data.m365_username;
        }
        if (selectedFields.has('m365_password') && row.data.m365_password) {
          updateData.m365_password = row.data.m365_password;
        }

        if (row.is_new) {
          updateData.is_active = true;
          updateData.source = 'csv_import';
          updateData.created_at = new Date().toISOString();
        }

        // Upsert (insert or update)
        const { error } = await supabase
          .from("master_user_list")
          .upsert(updateData, { onConflict: 'email' });

        if (error) {
          throw new Error(`Error importing ${row.email}: ${error.message}`);
        }
      }

      toast({
        title: "Import Successful",
        description: `Imported ${validRows.length} users. Changes synced across all tables.`,
      });

      setShowImportDialog(false);
      setCsvFile(null);
      setCsvPreview([]);
      fetchUsers();
    } catch (error: any) {
      toast({
        title: "Import Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setImportingCsv(false);
    }
  };

  const handleExportCsv = () => {
    const headers = [
      'email', 'display_name', 'job_title', 'department', 'branch_name',
      'vpn_username', 'vpn_password', 'rdp_username', 'rdp_password',
      'm365_username', 'm365_password', 'is_active', 'source', 'updated_at'
    ];
    
    const csv = [
      headers.join(','),
      ...users.map(user => 
        headers.map(h => {
          const value = user[h as keyof MasterUser];
          return value !== null && value !== undefined ? `"${value}"` : '';
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `master_user_data_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Export Complete",
      description: "User data exported successfully",
    });
  };

  const handleSyncNow = async () => {
    setSyncStatus(null);
    try {
      const { data, error } = await supabase.rpc('perform_initial_credential_sync');
      
      if (error) throw error;

      if (data && data.length > 0) {
        setSyncStatus({
          synced: true,
          message: `Synced ${data[0].synced_users} users, ${data[0].synced_vpn} VPN credentials, ${data[0].synced_rdp} RDP credentials`,
        });
      } else {
        setSyncStatus({
          synced: true,
          message: 'Sync completed but no data returned',
        });
      }

      toast({
        title: "Sync Complete",
        description: "All credentials synced across tables",
      });
    } catch (error: any) {
      setSyncStatus({
        synced: false,
        message: error.message,
      });
      
      toast({
        title: "Sync Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const toggleFieldSelection = (field: string) => {
    const newSelection = new Set(selectedFields);
    if (newSelection.has(field)) {
      newSelection.delete(field);
    } else {
      newSelection.add(field);
    }
    setSelectedFields(newSelection);
  };

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

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Database className="w-8 h-8" />
              Master User Data Management
            </h1>
            <p className="text-muted-foreground mt-1">
              Single source of truth for all user credentials and data. Changes here sync automatically across all pages.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleSyncNow}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Sync Now
            </Button>
            <Button variant="outline" onClick={handleExportCsv}>
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
            <label htmlFor="csv-import">
              <Button variant="default" asChild>
                <span>
                  <Upload className="w-4 h-4 mr-2" />
                  Import CSV
                </span>
              </Button>
            </label>
            <input
              id="csv-import"
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleCsvFileSelect}
            />
          </div>
        </div>

        {/* Sync Status Alert */}
        {syncStatus && (
          <Alert variant={syncStatus.synced ? "default" : "destructive"}>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{syncStatus.synced ? "Sync Successful" : "Sync Failed"}</AlertTitle>
            <AlertDescription>{syncStatus.message}</AlertDescription>
          </Alert>
        )}

        {/* Search */}
        <Card>
          <CardHeader>
            <CardTitle>Search Users</CardTitle>
            <CardDescription>
              Filter by email, name, username, or department
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Input
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-md"
            />
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Users ({filteredUsers.length})</CardTitle>
            <CardDescription>
              Click edit to modify credentials. Changes sync automatically.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Loading users...</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Branch</TableHead>
                      <TableHead>VPN</TableHead>
                      <TableHead>RDP</TableHead>
                      <TableHead>M365</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.email}</TableCell>
                        <TableCell>
                          {editingId === user.id ? (
                            <Input
                              value={editedUser.display_name || ''}
                              onChange={(e) => setEditedUser({ ...editedUser, display_name: e.target.value })}
                              className="w-full"
                            />
                          ) : (
                            user.display_name || '-'
                          )}
                        </TableCell>
                        <TableCell>{user.branch_name || 'NA'}</TableCell>
                        <TableCell>
                          {editingId === user.id ? (
                            <Input
                              value={editedUser.vpn_username || ''}
                              onChange={(e) => setEditedUser({ ...editedUser, vpn_username: e.target.value })}
                              className="w-full"
                              placeholder="VPN username"
                            />
                          ) : (
                            user.vpn_username || '-'
                          )}
                        </TableCell>
                        <TableCell>
                          {editingId === user.id ? (
                            <Input
                              value={editedUser.rdp_username || ''}
                              onChange={(e) => setEditedUser({ ...editedUser, rdp_username: e.target.value })}
                              className="w-full"
                              placeholder="RDP username"
                            />
                          ) : (
                            user.rdp_username || '-'
                          )}
                        </TableCell>
                        <TableCell>
                          {editingId === user.id ? (
                            <Input
                              value={editedUser.m365_username || ''}
                              onChange={(e) => setEditedUser({ ...editedUser, m365_username: e.target.value })}
                              className="w-full"
                              placeholder="M365 username"
                            />
                          ) : (
                            user.m365_username || '-'
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.is_active ? "default" : "secondary"}>
                            {user.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {editingId === user.id ? (
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={handleSave}
                                disabled={saving}
                              >
                                <Check className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={handleCancelEdit}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEdit(user)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* CSV Import Dialog */}
        <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Import Preview</DialogTitle>
              <DialogDescription>
                Review changes before importing. Only changed fields will be updated.
              </DialogDescription>
            </DialogHeader>

            {/* Field Selection */}
            <div className="space-y-2">
              <Label>Fields to Import:</Label>
              <div className="grid grid-cols-3 gap-2">
                {['display_name', 'job_title', 'department', 'vpn_username', 'vpn_password', 'rdp_username', 'rdp_password', 'm365_username', 'm365_password'].map(field => (
                  <div key={field} className="flex items-center space-x-2">
                    <Checkbox
                      id={field}
                      checked={selectedFields.has(field)}
                      onCheckedChange={() => toggleFieldSelection(field)}
                    />
                    <label htmlFor={field} className="text-sm">
                      {field.replace('_', ' ')}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Preview Table */}
            <div className="border rounded-lg max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Row</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Changes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {csvPreview.map((row) => (
                    <TableRow key={row.row_number} className={!row.is_valid ? 'bg-destructive/10' : ''}>
                      <TableCell>{row.row_number}</TableCell>
                      <TableCell>{row.email}</TableCell>
                      <TableCell>{row.display_name || '-'}</TableCell>
                      <TableCell>
                        {row.is_new ? (
                          <Badge variant="default">New</Badge>
                        ) : row.changes.length > 0 ? (
                          <Badge variant="secondary">Update</Badge>
                        ) : (
                          <Badge variant="outline">No Change</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">
                        {row.errors.length > 0 ? (
                          <span className="text-destructive">{row.errors.join(", ")}</span>
                        ) : row.changes.length > 0 ? (
                          <ul className="list-disc list-inside">
                            {row.changes.map((change, idx) => (
                              <li key={idx}>{change}</li>
                            ))}
                          </ul>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowImportDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleImportCsv} disabled={importingCsv || csvPreview.filter(r => r.is_valid).length === 0}>
                {importingCsv ? "Importing..." : `Import ${csvPreview.filter(r => r.is_valid).length} Users`}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default MasterUserData;
