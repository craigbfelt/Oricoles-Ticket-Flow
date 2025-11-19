import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Database } from "@/integrations/supabase/types";
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
import { Checkbox } from "@/components/ui/checkbox";
import { UserPlus } from "lucide-react";

export function AddSystemUserDialog({ onSuccess }: { onSuccess: () => void }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [roles, setRoles] = useState<string[]>([]);

  const toggleRole = (role: string) => {
    setRoles(prev =>
      prev.includes(role)
        ? prev.filter(r => r !== role)
        : [...prev, role]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast({
        title: "Error",
        description: "Email and password are required",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Create the user account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (authError) throw authError;

      if (authData.user) {
        // Create profile entry
        const { error: profileError } = await supabase
          .from("profiles")
          .insert([{
            user_id: authData.user.id,
            email: email,
            full_name: fullName || null,
          }]);

        if (profileError) {
          console.error("Profile creation error:", profileError);
        }

        // Assign roles using secure backend function
        if (roles.length > 0) {
          const { data: sessionData } = await supabase.auth.getSession();
          const { error: rolesError } = await supabase.functions.invoke('manage-user-roles', {
            body: {
              user_id: authData.user.id,
              roles: roles,
            },
            headers: {
              Authorization: `Bearer ${sessionData?.session?.access_token}`,
            },
          });

          if (rolesError) {
            console.error("Roles assignment error:", rolesError);
            toast({
              title: "Warning",
              description: "User created but role assignment failed. You may need admin privileges.",
              variant: "destructive",
            });
          }
        }

        toast({
          title: "Success",
          description: "System user created successfully",
        });

        // Reset form
        setEmail("");
        setPassword("");
        setFullName("");
        setRoles([]);
        setOpen(false);
        onSuccess();
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to create system user";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="w-4 h-4 mr-2" />
          Add System User
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add System User</DialogTitle>
          <DialogDescription>
            Create a new user account that can log into the system
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password *</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              required
            />
            <p className="text-xs text-muted-foreground">
              Minimum 6 characters
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Enter full name"
            />
          </div>

          <div className="space-y-3">
            <Label>Roles</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="add-role-admin"
                  checked={roles.includes('admin')}
                  onCheckedChange={() => toggleRole('admin')}
                />
                <label
                  htmlFor="add-role-admin"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Admin
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="add-role-ceo"
                  checked={roles.includes('ceo')}
                  onCheckedChange={() => toggleRole('ceo')}
                />
                <label
                  htmlFor="add-role-ceo"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  CEO
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="add-role-support-staff"
                  checked={roles.includes('support_staff')}
                  onCheckedChange={() => toggleRole('support_staff')}
                />
                <label
                  htmlFor="add-role-support-staff"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Support Staff
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="add-role-user"
                  checked={roles.includes('user')}
                  onCheckedChange={() => toggleRole('user')}
                />
                <label
                  htmlFor="add-role-user"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  User
                </label>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create User"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
