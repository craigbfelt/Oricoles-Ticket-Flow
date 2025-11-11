import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";

const HardwareInventory = () => {
  const [devices, setDevices] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [formData, setFormData] = useState({
    device_name: "",
    device_type: "",
    manufacturer: "",
    model: "",
    serial_number: "",
    processor: "",
    ram_gb: "",
    storage_gb: "",
    os: "",
    os_version: "",
    location: "",
    branch: "",
    purchase_date: "",
    warranty_expires: "",
    status: "active",
    notes: "",
  });

  useEffect(() => {
    checkAdminRole();
    fetchDevices();
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

  const fetchDevices = async () => {
    const { data, error } = await supabase
      .from('hardware_inventory')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching devices:', error);
      toast.error('Failed to load devices');
    } else {
      setDevices(data || []);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const deviceData = {
      ...formData,
      ram_gb: formData.ram_gb ? parseInt(formData.ram_gb) : null,
      storage_gb: formData.storage_gb ? parseInt(formData.storage_gb) : null,
      purchase_date: formData.purchase_date || null,
      warranty_expires: formData.warranty_expires || null,
    };

    const { error } = await supabase.from('hardware_inventory').insert([deviceData]);
    
    if (error) {
      console.error('Error creating device:', error);
      toast.error('Failed to create device');
    } else {
      toast.success('Device created successfully');
      setIsModalOpen(false);
      setFormData({
        device_name: "",
        device_type: "",
        manufacturer: "",
        model: "",
        serial_number: "",
        processor: "",
        ram_gb: "",
        storage_gb: "",
        os: "",
        os_version: "",
        location: "",
        branch: "",
        purchase_date: "",
        warranty_expires: "",
        status: "active",
        notes: "",
      });
      fetchDevices();
    }
  };

  const handleCSVImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const text = await file.text();
      const rows = text.split('\n').filter(row => row.trim());
      const headers = rows[0].split(',').map(h => h.trim());
      
      const devices = rows.slice(1).map(row => {
        const values = row.split(',').map(v => v.trim());
        const device: any = { status: 'active' };
        headers.forEach((header, index) => {
          if (values[index]) {
            if (header === 'ram_gb' || header === 'storage_gb') {
              device[header] = parseInt(values[index]);
            } else {
              device[header] = values[index];
            }
          }
        });
        return device;
      });

      const { error } = await supabase.from('hardware_inventory').insert(devices);
      
      if (error) throw error;

      toast.success(`Successfully imported ${devices.length} devices`);
      fetchDevices();
      event.target.value = '';
    } catch (error: any) {
      console.error('Error importing CSV:', error);
      toast.error(error.message || 'Failed to import CSV');
    } finally {
      setIsImporting(false);
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('hardware_inventory').delete().eq('id', id);
    
    if (error) {
      console.error('Error deleting device:', error);
      toast.error('Failed to delete device');
    } else {
      toast.success('Device deleted successfully');
      fetchDevices();
    }
  };

  const handleMicrosoftSync = async () => {
    setIsSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-microsoft-365');
      
      if (error) throw error;
      
      if (data?.success) {
        const { results } = data;
        toast.success(
          `Sync completed! Devices: ${results.devices}, Users: ${results.users}, Licenses: ${results.licenses}`
        );
        if (results.errors.length > 0) {
          console.warn('Sync errors:', results.errors);
        }
        fetchDevices();
      } else {
        throw new Error(data?.error || 'Sync failed');
      }
    } catch (error) {
      console.error('Microsoft sync error:', error);
      toast.error('Failed to sync with Microsoft 365');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Hardware Inventory</h1>
            <p className="text-muted-foreground">Track all hardware devices and endpoints</p>
          </div>
          {isAdmin && (
            <div className="flex gap-2">
              <Button 
                onClick={handleMicrosoftSync}
                disabled={isSyncing}
                variant="outline"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                {isSyncing ? 'Syncing...' : 'Sync Microsoft 365'}
              </Button>
              <Button variant="outline" disabled={isImporting} onClick={() => document.getElementById('hw-csv-upload')?.click()}>
                <Upload className="mr-2 h-4 w-4" />
                {isImporting ? 'Importing...' : 'Import CSV'}
              </Button>
              <input
                id="hw-csv-upload"
                type="file"
                accept=".csv"
                onChange={handleCSVImport}
                className="hidden"
              />
              <Button onClick={() => setIsModalOpen(true)}>
                Add Device
              </Button>
            </div>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Devices ({devices.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Device Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Manufacturer</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Serial Number</TableHead>
                  <TableHead>RAM (GB)</TableHead>
                  <TableHead>Storage (GB)</TableHead>
                  <TableHead>OS</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>Status</TableHead>
                  {isAdmin && <TableHead>Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {devices.map((device) => (
                  <TableRow key={device.id}>
                    <TableCell className="font-medium">{device.device_name}</TableCell>
                    <TableCell>{device.device_type}</TableCell>
                    <TableCell>{device.manufacturer}</TableCell>
                    <TableCell>{device.model}</TableCell>
                    <TableCell>{device.serial_number}</TableCell>
                    <TableCell>{device.ram_gb}</TableCell>
                    <TableCell>{device.storage_gb}</TableCell>
                    <TableCell>{device.os} {device.os_version}</TableCell>
                    <TableCell>{device.branch}</TableCell>
                    <TableCell>
                      <Badge variant={device.status === 'active' ? 'default' : 'secondary'}>
                        {device.status}
                      </Badge>
                    </TableCell>
                    {isAdmin && (
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(device.id)}
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
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Device</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="device_name">Device Name *</Label>
                  <Input
                    id="device_name"
                    value={formData.device_name}
                    onChange={(e) => setFormData({ ...formData, device_name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="device_type">Device Type *</Label>
                  <Select
                    value={formData.device_type}
                    onValueChange={(value) => setFormData({ ...formData, device_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Desktop">Desktop</SelectItem>
                      <SelectItem value="Laptop">Laptop</SelectItem>
                      <SelectItem value="Server">Server</SelectItem>
                      <SelectItem value="Tablet">Tablet</SelectItem>
                      <SelectItem value="Phone">Phone</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="manufacturer">Manufacturer</Label>
                  <Input
                    id="manufacturer"
                    value={formData.manufacturer}
                    onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="model">Model</Label>
                  <Input
                    id="model"
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="serial_number">Serial Number</Label>
                  <Input
                    id="serial_number"
                    value={formData.serial_number}
                    onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="processor">Processor</Label>
                  <Input
                    id="processor"
                    value={formData.processor}
                    onChange={(e) => setFormData({ ...formData, processor: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="ram_gb">RAM (GB)</Label>
                  <Input
                    id="ram_gb"
                    type="number"
                    value={formData.ram_gb}
                    onChange={(e) => setFormData({ ...formData, ram_gb: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="storage_gb">Storage (GB)</Label>
                  <Input
                    id="storage_gb"
                    type="number"
                    value={formData.storage_gb}
                    onChange={(e) => setFormData({ ...formData, storage_gb: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="os">Operating System</Label>
                  <Input
                    id="os"
                    value={formData.os}
                    onChange={(e) => setFormData({ ...formData, os: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="os_version">OS Version</Label>
                  <Input
                    id="os_version"
                    value={formData.os_version}
                    onChange={(e) => setFormData({ ...formData, os_version: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="branch">Branch</Label>
                  <Select
                    value={formData.branch}
                    onValueChange={(value) => setFormData({ ...formData, branch: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select branch" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DBN">DBN</SelectItem>
                      <SelectItem value="CPT">CPT</SelectItem>
                      <SelectItem value="PE">PE</SelectItem>
                      <SelectItem value="JHB">JHB</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
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
                  <Label htmlFor="warranty_expires">Warranty Expires</Label>
                  <Input
                    id="warranty_expires"
                    type="date"
                    value={formData.warranty_expires}
                    onChange={(e) => setFormData({ ...formData, warranty_expires: e.target.value })}
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
              <Button type="submit">Create Device</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default HardwareInventory;
