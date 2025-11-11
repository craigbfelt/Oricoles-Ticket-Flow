import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Trash2, Edit, Loader2 } from "lucide-react";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";
import { DataTable } from "@/components/DataTable";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

const Licenses = () => {
  const [licenses, setLicenses] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedLicense, setSelectedLicense] = useState<any>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [formData, setFormData] = useState({
    license_name: "",
    license_type: "",
    vendor: "",
    license_key: "",
    total_seats: "",
    used_seats: "0",
    purchase_date: "",
    renewal_date: "",
    cost: "",
    status: "active",
    notes: "",
  });

  useEffect(() => {
    checkAdminRole();
    fetchLicenses();
  }, []);

  const checkAdminRole = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id)
        .eq('role', 'admin')
        .single();
      setIsAdmin(!!data);
    }
  };

  const fetchLicenses = async () => {
    const { data, error } = await supabase
      .from('licenses')
      .select('*')
      .eq('deleted_manually', false)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching licenses:', error);
      toast.error('Failed to load licenses');
    } else {
      setLicenses(data || []);
    }
  };

  const handleRemoveDuplicates = async () => {
    setIsRemoving(true);
    try {
      const { data, error } = await supabase.rpc('remove_license_duplicates' as any);

      if (error) throw error;

      toast.success(`Removed ${data || 0} duplicate records`);
      fetchLicenses();
    } catch (error: any) {
      toast.error(error.message || 'Failed to remove duplicates');
    } finally {
      setIsRemoving(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const licenseData = {
      ...formData,
      total_seats: parseInt(formData.total_seats),
      used_seats: parseInt(formData.used_seats),
      cost: formData.cost ? parseFloat(formData.cost) : null,
      purchase_date: formData.purchase_date || null,
      renewal_date: formData.renewal_date || null,
    };

    const { error } = await supabase.from('licenses').insert([licenseData]);
    
    if (error) {
      console.error('Error creating license:', error);
      toast.error('Failed to create license');
    } else {
      toast.success('License created successfully');
      setIsModalOpen(false);
      setFormData({
        license_name: "",
        license_type: "",
        vendor: "",
        license_key: "",
        total_seats: "",
        used_seats: "0",
        purchase_date: "",
        renewal_date: "",
        cost: "",
        status: "active",
        notes: "",
      });
      fetchLicenses();
    }
  };

  const handleLicenseClick = (license: any) => {
    setSelectedLicense(license);
    setFormData({
      license_name: license.license_name,
      license_type: license.license_type,
      vendor: license.vendor,
      license_key: license.license_key || "",
      total_seats: license.total_seats.toString(),
      used_seats: license.used_seats.toString(),
      purchase_date: license.purchase_date || "",
      renewal_date: license.renewal_date || "",
      cost: license.cost?.toString() || "",
      status: license.status,
      notes: license.notes || "",
    });
    setEditMode(false);
    setSheetOpen(true);
  };

  const handleSaveChanges = async () => {
    if (!selectedLicense) return;

    const licenseData = {
      ...formData,
      total_seats: parseInt(formData.total_seats),
      used_seats: parseInt(formData.used_seats),
      cost: formData.cost ? parseFloat(formData.cost) : null,
      purchase_date: formData.purchase_date || null,
      renewal_date: formData.renewal_date || null,
    };

    const { error } = await supabase
      .from('licenses')
      .update(licenseData)
      .eq('id', selectedLicense.id);
    
    if (error) {
      console.error('Error updating license:', error);
      toast.error('Failed to update license');
    } else {
      toast.success('License updated successfully');
      setEditMode(false);
      setSheetOpen(false);
      fetchLicenses();
    }
  };

  const handleDelete = async () => {
    if (!selectedLicense) return;

    const { error } = await supabase.from('licenses').delete().eq('id', selectedLicense.id);
    
    if (error) {
      console.error('Error deleting license:', error);
      toast.error('Failed to delete license');
    } else {
      toast.success('License deleted successfully');
      setDeleteDialogOpen(false);
      setSheetOpen(false);
      fetchLicenses();
    }
  };

  return (
    <DashboardLayout>
      <div className="p-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">License Management</h1>
            <p className="text-muted-foreground">Track RDP, Microsoft 365, and other software licenses</p>
          </div>
          {isAdmin && (
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={handleRemoveDuplicates}
                disabled={isRemoving}
              >
                {isRemoving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
                Remove Duplicates
              </Button>
              <Button onClick={() => setIsModalOpen(true)}>
                Add License
              </Button>
            </div>
          )}
        </div>

        <div className="grid gap-4 mb-6 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Total Licenses</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{licenses.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Total Seats</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">
                {licenses.reduce((acc, l) => acc + l.total_seats, 0)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Used Seats</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">
                {licenses.reduce((acc, l) => acc + l.used_seats, 0)}
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Licenses</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              data={licenses}
              columns={[
                {
                  key: "license_name",
                  label: "License Name",
                  filterPlaceholder: "Filter by name...",
                  sortable: true,
                },
                {
                  key: "license_type",
                  label: "Type",
                  filterPlaceholder: "Filter by type...",
                  sortable: true,
                },
                {
                  key: "vendor",
                  label: "Vendor",
                  filterPlaceholder: "Filter by vendor...",
                  sortable: true,
                },
                {
                  key: "used_seats",
                  label: "Seats",
                  sortable: true,
                  render: (value, row) => `${row.used_seats} / ${row.total_seats}`,
                },
                {
                  key: "usage",
                  label: "Usage",
                  sortable: false,
                  render: (_, row) => {
                    const usagePercent = (row.used_seats / row.total_seats) * 100;
                    return (
                      <div className="flex items-center gap-2">
                        <Progress value={usagePercent} className="w-20" />
                        <span className="text-sm">{usagePercent.toFixed(0)}%</span>
                      </div>
                    );
                  },
                },
                {
                  key: "renewal_date",
                  label: "Renewal Date",
                  sortable: true,
                  render: (value) => value ? new Date(value).toLocaleDateString() : '-',
                },
                {
                  key: "cost",
                  label: "Cost",
                  sortable: true,
                  render: (value) => value ? `R${value.toFixed(2)}` : '-',
                },
                {
                  key: "status",
                  label: "Status",
                  sortable: true,
                  filterPlaceholder: "Filter by status...",
                  render: (value) => (
                    <Badge variant={value === 'active' ? 'default' : 'secondary'}>
                      {value}
                    </Badge>
                  ),
                },
              ]}
              onRowClick={handleLicenseClick}
              searchKeys={["license_name", "vendor", "license_type"]}
            />
          </CardContent>
        </Card>

        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetContent className="overflow-y-auto">
            <SheetHeader>
              <SheetTitle>License Details</SheetTitle>
              <SheetDescription>
                {editMode ? "Edit license information" : "View and manage license"}
              </SheetDescription>
            </SheetHeader>

            {selectedLicense && (
              <div className="mt-6 space-y-6">
                {!editMode ? (
                  <div className="space-y-4">
                    <div>
                      <Label className="text-muted-foreground">License Name</Label>
                      <p className="text-lg font-medium">{selectedLicense.license_name}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Type</Label>
                      <p>{selectedLicense.license_type}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Vendor</Label>
                      <p>{selectedLicense.vendor}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">License Key</Label>
                      <p className="font-mono text-sm">{selectedLicense.license_key || '-'}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-muted-foreground">Total Seats</Label>
                        <p>{selectedLicense.total_seats}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Used Seats</Label>
                        <p>{selectedLicense.used_seats}</p>
                      </div>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Usage</Label>
                      <Progress 
                        value={(selectedLicense.used_seats / selectedLicense.total_seats) * 100} 
                        className="mt-2" 
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-muted-foreground">Purchase Date</Label>
                        <p>{selectedLicense.purchase_date ? new Date(selectedLicense.purchase_date).toLocaleDateString() : '-'}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Renewal Date</Label>
                        <p>{selectedLicense.renewal_date ? new Date(selectedLicense.renewal_date).toLocaleDateString() : '-'}</p>
                      </div>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Cost</Label>
                      <p>{selectedLicense.cost ? `R${selectedLicense.cost.toFixed(2)}` : '-'}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Status</Label>
                      <Badge variant={selectedLicense.status === 'active' ? 'default' : 'secondary'}>
                        {selectedLicense.status}
                      </Badge>
                    </div>
                    {selectedLicense.notes && (
                      <div>
                        <Label className="text-muted-foreground">Notes</Label>
                        <p className="text-sm">{selectedLicense.notes}</p>
                      </div>
                    )}

                    {isAdmin && (
                      <div className="flex gap-2 pt-4">
                        <Button onClick={() => setEditMode(true)} className="flex-1">
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
                        <Button 
                          variant="destructive" 
                          onClick={() => setDeleteDialogOpen(true)}
                          className="flex-1"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="edit_license_name">License Name</Label>
                      <Input
                        id="edit_license_name"
                        value={formData.license_name}
                        onChange={(e) => setFormData({ ...formData, license_name: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit_license_type">Type</Label>
                      <Select
                        value={formData.license_type}
                        onValueChange={(value) => setFormData({ ...formData, license_type: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="RDP">RDP</SelectItem>
                          <SelectItem value="Microsoft 365">Microsoft 365</SelectItem>
                          <SelectItem value="Windows">Windows</SelectItem>
                          <SelectItem value="Antivirus">Antivirus</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="edit_vendor">Vendor</Label>
                      <Input
                        id="edit_vendor"
                        value={formData.vendor}
                        onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit_license_key">License Key</Label>
                      <Input
                        id="edit_license_key"
                        value={formData.license_key}
                        onChange={(e) => setFormData({ ...formData, license_key: e.target.value })}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="edit_total_seats">Total Seats</Label>
                        <Input
                          id="edit_total_seats"
                          type="number"
                          value={formData.total_seats}
                          onChange={(e) => setFormData({ ...formData, total_seats: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="edit_used_seats">Used Seats</Label>
                        <Input
                          id="edit_used_seats"
                          type="number"
                          value={formData.used_seats}
                          onChange={(e) => setFormData({ ...formData, used_seats: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="edit_purchase_date">Purchase Date</Label>
                        <Input
                          id="edit_purchase_date"
                          type="date"
                          value={formData.purchase_date}
                          onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="edit_renewal_date">Renewal Date</Label>
                        <Input
                          id="edit_renewal_date"
                          type="date"
                          value={formData.renewal_date}
                          onChange={(e) => setFormData({ ...formData, renewal_date: e.target.value })}
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="edit_cost">Cost (R)</Label>
                      <Input
                        id="edit_cost"
                        type="number"
                        step="0.01"
                        value={formData.cost}
                        onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit_status">Status</Label>
                      <Select
                        value={formData.status}
                        onValueChange={(value) => setFormData({ ...formData, status: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="expired">Expired</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="edit_notes">Notes</Label>
                      <Input
                        id="edit_notes"
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      />
                    </div>
                    <div className="flex gap-2 pt-4">
                      <Button onClick={handleSaveChanges} className="flex-1">
                        Save Changes
                      </Button>
                      <Button variant="outline" onClick={() => setEditMode(false)} className="flex-1">
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </SheetContent>
        </Sheet>

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete this license. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>Add License</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="license_name">License Name *</Label>
                  <Input
                    id="license_name"
                    value={formData.license_name}
                    onChange={(e) => setFormData({ ...formData, license_name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="license_type">License Type *</Label>
                  <Select
                    value={formData.license_type}
                    onValueChange={(value) => setFormData({ ...formData, license_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="RDP">RDP</SelectItem>
                      <SelectItem value="Microsoft 365">Microsoft 365</SelectItem>
                      <SelectItem value="Windows">Windows</SelectItem>
                      <SelectItem value="Antivirus">Antivirus</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="vendor">Vendor *</Label>
                  <Input
                    id="vendor"
                    value={formData.vendor}
                    onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="license_key">License Key</Label>
                  <Input
                    id="license_key"
                    value={formData.license_key}
                    onChange={(e) => setFormData({ ...formData, license_key: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="total_seats">Total Seats *</Label>
                  <Input
                    id="total_seats"
                    type="number"
                    value={formData.total_seats}
                    onChange={(e) => setFormData({ ...formData, total_seats: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="used_seats">Used Seats</Label>
                  <Input
                    id="used_seats"
                    type="number"
                    value={formData.used_seats}
                    onChange={(e) => setFormData({ ...formData, used_seats: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="purchase_date">Purchase Date</Label>
                  <Input
                    id="purchase_date"
                    type="date"
                    value={formData.purchase_date}
                    onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="renewal_date">Renewal Date</Label>
                  <Input
                    id="renewal_date"
                    type="date"
                    value={formData.renewal_date}
                    onChange={(e) => setFormData({ ...formData, renewal_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="cost">Cost (R)</Label>
                  <Input
                    id="cost"
                    type="number"
                    step="0.01"
                    value={formData.cost}
                    onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="notes">Notes</Label>
                <Input
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>
              <Button type="submit">Create License</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default Licenses;
