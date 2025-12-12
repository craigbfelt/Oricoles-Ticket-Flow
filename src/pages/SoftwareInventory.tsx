import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Trash2 , ArrowLeft} from "lucide-react";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";

const SoftwareInventory = () => {
  const navigate = useNavigate();
  const [software, setSoftware] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [formData, setFormData] = useState({
    software_name: "",
    version: "",
    vendor: "",
    license_key: "",
    license_type: "",
    install_date: "",
    expiry_date: "",
    status: "active",
    notes: "",
  });

  useEffect(() => {
    checkAdminRole();
    fetchSoftware();
  }, []);

  const checkAdminRole = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      setIsAdmin(true);
    }
  };

  const fetchSoftware = async () => {
    const { data, error } = await supabase
      .from('software_inventory')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching software:', error);
      toast.error('Failed to load software');
    } else {
      setSoftware(data || []);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const softwareData = {
      ...formData,
      install_date: formData.install_date || null,
      expiry_date: formData.expiry_date || null,
    };

    const { error } = await supabase.from('software_inventory').insert([softwareData]);
    
    if (error) {
      console.error('Error creating software:', error);
      toast.error('Failed to create software entry');
    } else {
      toast.success('Software entry created successfully');
      setIsModalOpen(false);
      setFormData({
        software_name: "",
        version: "",
        vendor: "",
        license_key: "",
        license_type: "",
        install_date: "",
        expiry_date: "",
        status: "active",
        notes: "",
      });
      fetchSoftware();
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('software_inventory').delete().eq('id', id);
    
    if (error) {
      console.error('Error deleting software:', error);
      toast.error('Failed to delete software');
    } else {
      toast.success('Software deleted successfully');
      fetchSoftware();
    }
  };

  return (
    <DashboardLayout>
      <div className="p-8">
        {/* Back Navigation */}
        <div>
          <Button variant="ghost" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Software Inventory</h1>
            <p className="text-muted-foreground">Track installed software and applications</p>
          </div>
          {isAdmin && (
            <Button onClick={() => setIsModalOpen(true)}>
              Add Software
            </Button>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Software ({software.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Software Name</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>License Type</TableHead>
                  <TableHead>Install Date</TableHead>
                  <TableHead>Expiry Date</TableHead>
                  <TableHead>Status</TableHead>
                  {isAdmin && <TableHead>Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {software.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.software_name}</TableCell>
                    <TableCell>{item.version}</TableCell>
                    <TableCell>{item.vendor}</TableCell>
                    <TableCell>{item.license_type}</TableCell>
                    <TableCell>{item.install_date ? new Date(item.install_date).toLocaleDateString() : '-'}</TableCell>
                    <TableCell>{item.expiry_date ? new Date(item.expiry_date).toLocaleDateString() : '-'}</TableCell>
                    <TableCell>
                      <Badge variant={item.status === 'active' ? 'default' : 'secondary'}>
                        {item.status}
                      </Badge>
                    </TableCell>
                    {isAdmin && (
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>Add Software Entry</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="software_name">Software Name *</Label>
                  <Input
                    id="software_name"
                    value={formData.software_name}
                    onChange={(e) => setFormData({ ...formData, software_name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="version">Version</Label>
                  <Input
                    id="version"
                    value={formData.version}
                    onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="vendor">Vendor</Label>
                  <Input
                    id="vendor"
                    value={formData.vendor}
                    onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="license_type">License Type</Label>
                  <Select
                    value={formData.license_type}
                    onValueChange={(value) => setFormData({ ...formData, license_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="per-user">Per User</SelectItem>
                      <SelectItem value="per-device">Per Device</SelectItem>
                      <SelectItem value="site">Site License</SelectItem>
                      <SelectItem value="subscription">Subscription</SelectItem>
                    </SelectContent>
                  </Select>
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
                  <Label htmlFor="install_date">Install Date</Label>
                  <Input
                    id="install_date"
                    type="date"
                    value={formData.install_date}
                    onChange={(e) => setFormData({ ...formData, install_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="expiry_date">Expiry Date</Label>
                  <Input
                    id="expiry_date"
                    type="date"
                    value={formData.expiry_date}
                    onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
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
              <Button type="submit">Create Entry</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default SoftwareInventory;
