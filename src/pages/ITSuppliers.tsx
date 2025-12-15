import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Building2, Phone, Mail, Globe } from "lucide-react";
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

interface ITSupplier {
  id: string;
  name: string;
  role: string;
  services: string;
  contact_email: string | null;
  contact_phone: string | null;
  website: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// Define color schemes outside component for performance
const SUPPLIER_COLOR_SCHEMES = [
  { border: "border-blue-200", bg: "bg-blue-50", icon: "bg-blue-500", text: "text-blue-700" },
  { border: "border-purple-200", bg: "bg-purple-50", icon: "bg-purple-500", text: "text-purple-700" },
  { border: "border-green-200", bg: "bg-green-50", icon: "bg-green-500", text: "text-green-700" },
  { border: "border-orange-200", bg: "bg-orange-50", icon: "bg-orange-500", text: "text-orange-700" },
  { border: "border-pink-200", bg: "bg-pink-50", icon: "bg-pink-500", text: "text-pink-700" },
  { border: "border-cyan-200", bg: "bg-cyan-50", icon: "bg-cyan-500", text: "text-cyan-700" },
];

const ITSuppliers = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [suppliers, setSuppliers] = useState<ITSupplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<ITSupplier | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [supplierToDelete, setSupplierToDelete] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [services, setServices] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    checkAuth();
    fetchSuppliers();
  }, [navigate]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }

    // Check if user is admin
    const { data: rolesData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .eq("role", "admin")
      .single();

    setIsAdmin(!!rolesData);
  };

  const fetchSuppliers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("it_suppliers")
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      console.error("Error fetching suppliers:", error);
      toast({
        title: "Error",
        description: "Failed to load IT suppliers",
        variant: "destructive",
      });
    } else {
      setSuppliers(data || []);
    }
    setLoading(false);
  };

  const resetForm = () => {
    setName("");
    setRole("");
    setServices("");
    setContactEmail("");
    setContactPhone("");
    setWebsite("");
    setNotes("");
    setEditingSupplier(null);
  };

  const handleOpenDialog = (supplier?: ITSupplier) => {
    if (supplier) {
      setEditingSupplier(supplier);
      setName(supplier.name);
      setRole(supplier.role);
      setServices(supplier.services);
      setContactEmail(supplier.contact_email || "");
      setContactPhone(supplier.contact_phone || "");
      setWebsite(supplier.website || "");
      setNotes(supplier.notes || "");
    } else {
      resetForm();
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    resetForm();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !role || !services) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    const supplierData = {
      name,
      role,
      services,
      contact_email: contactEmail || null,
      contact_phone: contactPhone || null,
      website: website || null,
      notes: notes || null,
    };

    if (editingSupplier) {
      // Update existing supplier
      const { error } = await supabase
        .from("it_suppliers")
        .update(supplierData)
        .eq("id", editingSupplier.id);

      if (error) {
        console.error("Error updating supplier:", error);
        toast({
          title: "Error",
          description: "Failed to update supplier",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: "Supplier updated successfully",
        });
        fetchSuppliers();
        handleCloseDialog();
      }
    } else {
      // Create new supplier
      const { error } = await supabase
        .from("it_suppliers")
        .insert([supplierData]);

      if (error) {
        console.error("Error creating supplier:", error);
        toast({
          title: "Error",
          description: "Failed to create supplier",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: "Supplier created successfully",
        });
        fetchSuppliers();
        handleCloseDialog();
      }
    }
  };

  const handleDelete = async () => {
    if (!supplierToDelete) return;

    const { error } = await supabase
      .from("it_suppliers")
      .delete()
      .eq("id", supplierToDelete);

    if (error) {
      console.error("Error deleting supplier:", error);
      toast({
        title: "Error",
        description: "Failed to delete supplier",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Supplier deleted successfully",
      });
      fetchSuppliers();
    }
    setDeleteDialogOpen(false);
    setSupplierToDelete(null);
  };

  const openDeleteDialog = (supplierId: string) => {
    setSupplierToDelete(supplierId);
    setDeleteDialogOpen(true);
  };

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">IT Suppliers</h1>
            <p className="text-muted-foreground mt-1">Manage your IT service providers and suppliers</p>
          </div>
          {isAdmin && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => handleOpenDialog()}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Supplier
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingSupplier ? "Edit Supplier" : "Add New Supplier"}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Supplier Name *</Label>
                      <Input
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g., ZeroBitOne"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="role">Role *</Label>
                      <Input
                        id="role"
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        placeholder="e.g., IT Hardware & Software Support"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="services">Services *</Label>
                    <Textarea
                      id="services"
                      value={services}
                      onChange={(e) => setServices(e.target.value)}
                      placeholder="Describe the services provided..."
                      rows={3}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Contact Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={contactEmail}
                        onChange={(e) => setContactEmail(e.target.value)}
                        placeholder="contact@supplier.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Contact Phone</Label>
                      <Input
                        id="phone"
                        value={contactPhone}
                        onChange={(e) => setContactPhone(e.target.value)}
                        placeholder="+27 11 123 4567"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="website">Website</Label>
                    <Input
                      id="website"
                      type="url"
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      placeholder="https://www.supplier.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Additional notes..."
                      rows={2}
                    />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={handleCloseDialog}>
                      Cancel
                    </Button>
                    <Button type="submit">
                      {editingSupplier ? "Update" : "Create"} Supplier
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {loading ? (
          <div className="text-center py-8">Loading suppliers...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {suppliers.map((supplier, index) => {
              // Assign different colors to each card
              const colorScheme = SUPPLIER_COLOR_SCHEMES[index % SUPPLIER_COLOR_SCHEMES.length];
              
              return (
                <Card 
                  key={supplier.id} 
                  className={`hover:shadow-xl transition-all duration-300 hover:scale-105 cursor-pointer border-2 ${colorScheme.border} ${colorScheme.bg}`}
                  onClick={() => navigate(`/it-suppliers/${supplier.id}`)}
                >
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="flex items-center space-x-2">
                        <div className={`p-2 rounded-lg ${colorScheme.icon} shadow-md`}>
                          <Building2 className="h-5 w-5 text-white" />
                        </div>
                        <CardTitle className={`text-lg ${colorScheme.text}`}>{supplier.name}</CardTitle>
                      </div>
                    {isAdmin && (
                      <div className="flex space-x-1" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenDialog(supplier);
                          }}
                          className="h-8 w-8 p-0"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            openDeleteDialog(supplier.id);
                          }}
                          className="h-8 w-8 p-0 text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                    </div>
                    <CardDescription className="font-semibold text-foreground mt-2">{supplier.role}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Services:</p>
                      <p className="text-sm">{supplier.services}</p>
                    </div>
                    
                    {/* Contact Options - More Prominent */}
                    {(supplier.contact_email || supplier.contact_phone || supplier.website) && (
                      <div className="pt-3 border-t border-border/50 space-y-2">
                        <p className="text-sm font-semibold text-foreground mb-2">Contact Options:</p>
                        
                        {supplier.contact_email && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full justify-start gap-2 hover:bg-primary/10"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.location.href = `mailto:${supplier.contact_email}`;
                            }}
                          >
                            <Mail className="h-4 w-4" />
                            <span className="truncate">{supplier.contact_email}</span>
                          </Button>
                        )}
                        
                        {supplier.contact_phone && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full justify-start gap-2 hover:bg-primary/10"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.location.href = `tel:${supplier.contact_phone}`;
                            }}
                          >
                            <Phone className="h-4 w-4" />
                            {supplier.contact_phone}
                          </Button>
                        )}
                        
                        {supplier.website && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full justify-start gap-2 hover:bg-primary/10"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (supplier.website) {
                                window.open(supplier.website, '_blank', 'noopener,noreferrer');
                              }
                            }}
                          >
                            <Globe className="h-4 w-4" />
                            Visit Website
                          </Button>
                        )}
                      </div>
                    )}
                    
                    {supplier.notes && (
                      <div className="pt-2 border-t border-border/50">
                        <p className="text-sm font-medium text-muted-foreground mb-1">Notes:</p>
                        <p className="text-sm text-muted-foreground">{supplier.notes}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {!loading && suppliers.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center">
              <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No IT suppliers found.</p>
              {isAdmin && (
                <p className="text-sm text-muted-foreground mt-2">
                  Click the "Add Supplier" button to create your first supplier.
                </p>
              )}
            </CardContent>
          </Card>
        )}

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the supplier from the system.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
};

export default ITSuppliers;
