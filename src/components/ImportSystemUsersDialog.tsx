import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { UserPlus, Download } from "lucide-react";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface StaffUser {
  id: string;
  username: string;
  email: string | null;
  service_type: string;
  notes: string | null;
}

interface ImportResult {
  success: boolean;
  email?: string;
  username?: string;
  password?: string;
  error?: string;
  message?: string;
}

export function ImportSystemUsersDialog() {
  const [staffUsers, setStaffUsers] = useState<StaffUser[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [open, setOpen] = useState(false);
  const [importResults, setImportResults] = useState<ImportResult[]>([]);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    if (open) {
      fetchStaffUsers();
    }
  }, [open]);

  const fetchStaffUsers = async () => {
    setIsLoading(true);
    console.log("ImportSystemUsersDialog: Fetching staff users from vpn_rdp_credentials");
    
    try {
      // Try using the secure decryption function first (for encrypted credentials)
      const { data: decryptedData, error: rpcError } = await supabase
        .rpc('get_decrypted_credentials');
      
      let data;
      let error;
      
      if (!rpcError && decryptedData) {
        // Filter decrypted data to only users with email
        data = decryptedData.filter((u: any) => u.email != null);
        data.sort((a: any, b: any) => (a.username || '').localeCompare(b.username || ''));
      } else {
        // Fallback to direct table query (for backward compatibility)
        const result = await supabase
          .from("vpn_rdp_credentials")
          .select("id, username, email, service_type, notes")
          .not("email", "is", null) // Only users with email can become system users
          .order("username");
        
        data = result.data;
        error = result.error;
      }

      if (error) {
        console.error("ImportSystemUsersDialog: Error fetching staff users:", error);
        toast.error("Failed to fetch staff users", {
          description: `${error.message}. Check console for details.`
        });
        setStaffUsers([]);
        return;
      }

      console.log("ImportSystemUsersDialog: Found staff users with emails:", data?.length || 0);

      // Filter out users who already have system accounts
      console.log("ImportSystemUsersDialog: Checking for existing user profiles");
      const { data: existingUsers, error: profileError } = await supabase
        .from("profiles")
        .select("email");
      
      if (profileError) {
        console.error("ImportSystemUsersDialog: Error fetching profiles:", profileError);
        toast.error("Failed to check existing users", {
          description: `${profileError.message}. Some users may already exist.`
        });
      }

      const existingEmails = new Set(existingUsers?.map(u => u.email?.toLowerCase()) || []);
      const availableUsers = (data || []).filter(
        user => user.email && !existingEmails.has(user.email.toLowerCase())
      );
      
      console.log("ImportSystemUsersDialog: Available users for import:", availableUsers.length);
      console.log("ImportSystemUsersDialog: Filtered out existing users:", (data?.length || 0) - availableUsers.length);
      
      setStaffUsers(availableUsers);
    } catch (error) {
      console.error("ImportSystemUsersDialog: Unexpected error fetching staff users:", error);
      toast.error("Unexpected error", {
        description: error instanceof Error ? error.message : "Failed to load staff users"
      });
      setStaffUsers([]);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleUser = (userId: string) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
  };

  const toggleAll = () => {
    if (selectedUsers.size === staffUsers.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(staffUsers.map(u => u.id)));
    }
  };

  const handleImport = async () => {
    if (selectedUsers.size === 0) {
      toast.error("Please select at least one user to import");
      return;
    }

    setIsImporting(true);
    const userIds = Array.from(selectedUsers);

    console.log("ImportSystemUsersDialog: Starting import for user IDs:", userIds);

    try {
      // Call the edge function to create users
      console.log("ImportSystemUsersDialog: Calling edge function import-staff-users");
      
      const { data, error } = await supabase.functions.invoke('import-staff-users', {
        body: { staff_user_ids: userIds }
      });

      console.log("ImportSystemUsersDialog: Edge function response:", { data, error });

      if (error) {
        console.error("ImportSystemUsersDialog: Edge function error:", error);
        
        // Provide specific error messages based on error
        let errorDescription = error.message || "Unknown error occurred";
        
        if (error.message?.includes("Missing environment variables")) {
          errorDescription = "Server configuration error. Please contact your administrator to configure the edge function environment.";
        } else if (error.message?.includes("Invalid request format")) {
          errorDescription = "Invalid data sent to server. Please try again or contact support.";
        } else if (error.message?.includes("not found")) {
          errorDescription = "Import function not deployed. Please contact your administrator to deploy the edge function.";
        } else if (error.message?.includes("JWT") || error.message?.includes("auth")) {
          errorDescription = "Authentication error - your session may have expired. Please log out and log back in.";
        }
        
        toast.error("Failed to import users", {
          description: `${errorDescription}\n\nTechnical details: ${error.message || JSON.stringify(error)}\n\nCheck browser console for full error logs.`,
          duration: 8000
        });
        throw error;
      }

      const responseData = data as any;
      
      if (!responseData || !responseData.results) {
        console.error("ImportSystemUsersDialog: Invalid response format:", responseData);
        toast.error("Failed to import users", {
          description: "Invalid response from import function. The function may not be properly configured. Check console for details."
        });
        throw new Error("Invalid response format");
      }

      console.log("ImportSystemUsersDialog: Import completed successfully:", {
        total: responseData.total,
        success_count: responseData.success_count,
        error_count: responseData.error_count
      });

      setImportResults(responseData.results || []);
      setShowResults(true);
      
      const successCount = responseData.success_count || 0;
      const errorCount = responseData.error_count || 0;
      
      if (successCount > 0 && errorCount === 0) {
        toast.success(`Successfully created ${successCount} user${successCount !== 1 ? 's' : ''}`);
      } else if (successCount > 0 && errorCount > 0) {
        toast.warning(`Created ${successCount} user${successCount !== 1 ? 's' : ''}`, {
          description: `${errorCount} error${errorCount !== 1 ? 's' : ''} occurred. Check results for details.`
        });
      } else if (errorCount > 0) {
        toast.error(`Failed to create users`, {
          description: `${errorCount} error${errorCount !== 1 ? 's' : ''} occurred. Check results for details.`
        });
      }
    } catch (error) {
      console.error("ImportSystemUsersDialog: Unexpected error during import:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      toast.error("Failed to import users", {
        description: `${errorMessage}. Check browser console for detailed logs.`
      });
    } finally {
      setIsImporting(false);
    }
  };

  const downloadResults = () => {
    const csvContent = [
      "Email,Username,Password,Status,Message",
      ...importResults.map(r => 
        `${r.email || ""},${r.username || ""},${r.password || ""},${r.success ? "Success" : "Failed"},${r.error || r.message || ""}`
      )
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `system_users_import_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast.success("Import results downloaded");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <UserPlus className="mr-2 h-4 w-4" />
          Import from Staff Users
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        {!showResults ? (
          <>
            <DialogHeader>
              <DialogTitle>Import System Users from Staff</DialogTitle>
              <DialogDescription>
                Select staff users to create system login accounts. Random passwords will be generated.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {isLoading ? (
                <p className="text-muted-foreground text-center py-8">Loading staff users...</p>
              ) : staffUsers.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No staff users available for import. All users may already have system accounts.
                </p>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={selectedUsers.size === staffUsers.length}
                        onCheckedChange={toggleAll}
                      />
                      <label className="text-sm font-medium">
                        Select All ({staffUsers.length} users)
                      </label>
                    </div>
                    <Badge variant="secondary">
                      {selectedUsers.size} selected
                    </Badge>
                  </div>

                  <ScrollArea className="h-[400px] border rounded-md p-4">
                    <div className="space-y-2">
                      {staffUsers.map((user) => (
                        <div
                          key={user.id}
                          className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <Checkbox
                            checked={selectedUsers.has(user.id)}
                            onCheckedChange={() => toggleUser(user.id)}
                          />
                          <div className="flex-1">
                            <p className="font-medium">{user.username}</p>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                            {user.notes && (
                              <p className="text-xs text-muted-foreground mt-1">{user.notes}</p>
                            )}
                          </div>
                          <Badge variant="outline">{user.service_type.toUpperCase()}</Badge>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleImport} 
                disabled={isImporting || selectedUsers.size === 0}
              >
                {isImporting ? "Importing..." : `Import ${selectedUsers.size} User${selectedUsers.size !== 1 ? 's' : ''}`}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Import Results</DialogTitle>
              <DialogDescription>
                Review the import results and download the credentials
              </DialogDescription>
            </DialogHeader>

            <ScrollArea className="h-[400px] border rounded-md p-4">
              <div className="space-y-2">
                {importResults.map((result, index) => (
                  <div
                    key={index}
                    className={`p-3 border rounded-lg ${
                      result.success ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-medium">{result.email || "N/A"}</p>
                        <p className="text-sm text-muted-foreground">{result.username || "N/A"}</p>
                      </div>
                      <Badge variant={result.success ? "default" : "destructive"}>
                        {result.success ? "Success" : "Failed"}
                      </Badge>
                    </div>
                    {result.success && result.password && (
                      <div className="mt-2">
                        <p className="text-xs font-medium">Generated Password:</p>
                        <p className="text-sm font-mono bg-white p-2 rounded mt-1 break-all">
                          {result.password}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          ⚠️ Save this password - it cannot be retrieved later
                        </p>
                      </div>
                    )}
                    {result.error && (
                      <div className="mt-2 p-2 bg-red-100 rounded">
                        <p className="text-xs font-medium text-red-800">Error Details:</p>
                        <p className="text-sm text-red-600 mt-1">{result.error}</p>
                      </div>
                    )}
                    {result.message && !result.error && (
                      <p className="text-sm text-muted-foreground mt-2">{result.message}</p>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>

            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setShowResults(false);
                setOpen(false);
                setSelectedUsers(new Set());
                fetchStaffUsers();
              }}>
                Close
              </Button>
              <Button onClick={downloadResults}>
                <Download className="mr-2 h-4 w-4" />
                Download Results (CSV)
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
