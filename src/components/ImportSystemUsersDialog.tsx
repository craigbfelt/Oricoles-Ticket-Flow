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

export function ImportSystemUsersDialog() {
  const [staffUsers, setStaffUsers] = useState<StaffUser[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [open, setOpen] = useState(false);
  const [importResults, setImportResults] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    if (open) {
      fetchStaffUsers();
    }
  }, [open]);

  const fetchStaffUsers = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("vpn_rdp_credentials")
      .select("id, username, email, service_type, notes")
      .not("email", "is", null) // Only users with email can become system users
      .order("username");

    if (error) {
      toast.error("Failed to fetch staff users");
      console.error(error);
    } else {
      // Filter out users who already have system accounts
      const { data: existingUsers } = await supabase
        .from("profiles")
        .select("email");
      
      const existingEmails = new Set(existingUsers?.map(u => u.email?.toLowerCase()) || []);
      const availableUsers = (data || []).filter(
        user => user.email && !existingEmails.has(user.email.toLowerCase())
      );
      
      setStaffUsers(availableUsers);
    }
    setIsLoading(false);
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

    try {
      // @ts-expect-error - RPC function exists but types haven't regenerated yet
      const { data, error } = await supabase.rpc("import_system_users_from_staff", {
        staff_user_ids: userIds,
      });

      if (error) throw error;

      const result = data as any;
      setImportResults(result?.results || []);
      setShowResults(true);
      
      toast.success(`Prepared ${result?.success_count || 0} users for import`, {
        description: `${result?.error_count || 0} errors occurred`
      });
    } catch (error: any) {
      toast.error("Failed to import users");
      console.error(error);
    }

    setIsImporting(false);
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
                      <div>
                        <p className="font-medium">{result.email}</p>
                        <p className="text-sm text-muted-foreground">{result.username}</p>
                      </div>
                      <Badge variant={result.success ? "default" : "destructive"}>
                        {result.success ? "Success" : "Failed"}
                      </Badge>
                    </div>
                    {result.success && result.password && (
                      <div className="mt-2">
                        <p className="text-xs font-medium">Generated Password:</p>
                        <p className="text-sm font-mono bg-white p-2 rounded mt-1">
                          {result.password}
                        </p>
                      </div>
                    )}
                    {result.error && (
                      <p className="text-sm text-red-600 mt-2">{result.error}</p>
                    )}
                    {result.message && (
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
