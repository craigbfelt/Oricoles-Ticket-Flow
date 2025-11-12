import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings, Trash2, UserX } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface License {
  id: string;
  license_name: string;
  vendor: string;
  total_seats: number;
  used_seats: number;
  assigned_to: string | null;
}

interface DirectoryUser {
  id: string;
  display_name: string | null;
  email: string | null;
}

export function ManageLicensesDialog({ onUpdate }: { onUpdate: () => void }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [licenses, setLicenses] = useState<License[]>([]);
  const [users, setUsers] = useState<DirectoryUser[]>([]);
  const [loading, setLoading] = useState(false);

  // Reassign state
  const [selectedLicense, setSelectedLicense] = useState("");
  const [fromUser, setFromUser] = useState("");
  const [toUser, setToUser] = useState("");

  // Add/Remove seats state
  const [licenseToModify, setLicenseToModify] = useState("");
  const [seatsToAdd, setSeatsToAdd] = useState(0);

  useEffect(() => {
    if (open) {
      fetchLicenses();
      fetchUsers();
    }
  }, [open]);

  const fetchLicenses = async () => {
    const { data, error } = await supabase
      .from("licenses")
      .select("*")
      .eq("vendor", "Microsoft")
      .order("license_name");

    if (!error) {
      setLicenses(data || []);
    }
  };

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from("directory_users")
      .select("id, display_name, email")
      .order("display_name");

    if (!error) {
      setUsers(data || []);
    }
  };

  const handleReassignLicense = async () => {
    if (!selectedLicense || !toUser) {
      toast({
        title: "Validation Error",
        description: "Please select a license and target user",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("licenses")
        .update({ assigned_to: toUser })
        .eq("id", selectedLicense);

      if (error) throw error;

      toast({
        title: "Success",
        description: "License reassigned successfully",
      });

      setSelectedLicense("");
      setFromUser("");
      setToUser("");
      fetchLicenses();
      onUpdate();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleModifySeats = async () => {
    if (!licenseToModify || seatsToAdd === 0) {
      toast({
        title: "Validation Error",
        description: "Please select a license and enter seat count",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const license = licenses.find(l => l.id === licenseToModify);
      if (!license) throw new Error("License not found");

      const newTotal = license.total_seats + seatsToAdd;
      if (newTotal < license.used_seats) {
        throw new Error("Cannot reduce seats below current usage");
      }

      const { error } = await supabase
        .from("licenses")
        .update({ total_seats: newTotal })
        .eq("id", licenseToModify);

      if (error) throw error;

      toast({
        title: "Success",
        description: `${seatsToAdd > 0 ? 'Added' : 'Removed'} ${Math.abs(seatsToAdd)} seat(s)`,
      });

      setLicenseToModify("");
      setSeatsToAdd(0);
      fetchLicenses();
      onUpdate();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUnassignLicense = async (licenseId: string) => {
    setLoading(true);
    try {
      const license = licenses.find(l => l.id === licenseId);
      if (!license) throw new Error("License not found");

      const { error } = await supabase
        .from("licenses")
        .update({
          assigned_to: null,
          used_seats: Math.max(0, license.used_seats - 1),
        })
        .eq("id", licenseId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "License unassigned successfully",
      });

      fetchLicenses();
      onUpdate();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Settings className="h-4 w-4 mr-2" />
          Manage 365 Licenses
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Microsoft 365 Licenses</DialogTitle>
          <DialogDescription>
            Reassign, add, or remove Microsoft 365 licenses
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="reassign">Reassign</TabsTrigger>
            <TabsTrigger value="modify">Add/Remove Seats</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="space-y-3">
              {licenses.map((license) => (
                <div key={license.id} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <h4 className="font-semibold">{license.license_name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {license.used_seats} / {license.total_seats} seats used
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {license.used_seats < license.total_seats ? (
                        <Badge variant="default">Available</Badge>
                      ) : (
                        <Badge variant="destructive">Full</Badge>
                      )}
                      {license.assigned_to && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleUnassignLicense(license.id)}
                          disabled={loading}
                        >
                          <UserX className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all"
                      style={{
                        width: `${(license.used_seats / license.total_seats) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="reassign" className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Select License</Label>
                <Select value={selectedLicense} onValueChange={setSelectedLicense}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a license" />
                  </SelectTrigger>
                  <SelectContent>
                    {licenses.map((license) => (
                      <SelectItem key={license.id} value={license.id}>
                        {license.license_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>From User (Optional)</Label>
                <Select value={fromUser} onValueChange={setFromUser}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select user to remove from" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.display_name} ({user.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>To User *</Label>
                <Select value={toUser} onValueChange={setToUser}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select user to assign to" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.display_name} ({user.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={handleReassignLicense} disabled={loading} className="w-full">
                {loading ? "Reassigning..." : "Reassign License"}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="modify" className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Select License</Label>
                <Select value={licenseToModify} onValueChange={setLicenseToModify}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a license" />
                  </SelectTrigger>
                  <SelectContent>
                    {licenses.map((license) => (
                      <SelectItem key={license.id} value={license.id}>
                        {license.license_name} ({license.used_seats}/{license.total_seats})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Seats to Add/Remove</Label>
                <Input
                  type="number"
                  value={seatsToAdd}
                  onChange={(e) => setSeatsToAdd(parseInt(e.target.value) || 0)}
                  placeholder="Enter positive to add, negative to remove"
                />
                <p className="text-sm text-muted-foreground">
                  Use positive numbers to add seats, negative to remove
                </p>
              </div>

              <Button onClick={handleModifySeats} disabled={loading} className="w-full">
                {loading ? "Updating..." : "Update Seats"}
              </Button>

              <div className="border-t pt-4">
                <p className="text-sm text-muted-foreground">
                  <strong>Note:</strong> To request new licenses from Braintree, contact your license administrator.
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
