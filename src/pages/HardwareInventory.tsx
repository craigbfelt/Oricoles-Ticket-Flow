import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Edit, Loader2, ArrowLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";
import { DataTable } from "@/components/DataTable";
import { hardwareSchema } from "@/lib/validations";

const HardwareInventory = () => {
  const navigate = useNavigate();
  const [devices, setDevices] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<any | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
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
      setIsAdmin(true);
    }
  };

  const fetchDevices = async () => {
    const { data, error } = await supabase
      .from('hardware_inventory')
      .select('*')
      .eq('deleted_manually', false)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching devices:', error);
      toast.error('Failed to load devices');
    } else {
      setDevices(data || []);
    }
  };

  const handleRemoveDuplicates = async () => {
    setIsRemoving(true);
    try {
      const { data, error } = await supabase.rpc('remove_hardware_duplicates' as any);

      if (error) throw error;

      toast.success(`Removed ${data || 0} duplicate records`);
      fetchDevices();
    } catch (error: any) {
      toast.error(error.message || 'Failed to remove duplicates');
    } finally {
      setIsRemoving(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form data
    const validationResult = hardwareSchema.safeParse(formData);
    if (!validationResult.success) {
      const errors = validationResult.error.errors.map(err => err.message).join(", ");
      toast.error(`Validation Error: ${errors}`);
      return;
    }
    
    const deviceData = {
      ...validationResult.data,
      ram_gb: formData.ram_gb ? parseInt(formData.ram_gb) : null,
      storage_gb: formData.storage_gb ? parseInt(formData.storage_gb) : null,
      purchase_date: formData.purchase_date || null,
      warranty_expires: formData.warranty_expires || null,
    };

    const { error } = await supabase.from('hardware_inventory').insert([deviceData as any]);
    
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

  const handleDeviceClick = (device: any) => {
    setSelectedDevice(device);
    setFormData({
      device_name: device.device_name || "",
      device_type: device.device_type || "",
      manufacturer: device.manufacturer || "",
      model: device.model || "",
      serial_number: device.serial_number || "",
      processor: device.processor || "",
      ram_gb: device.ram_gb?.toString() || "",
      storage_gb: device.storage_gb?.toString() || "",
      os: device.os || "",
      os_version: device.os_version || "",
      location: device.location || "",
      branch: device.branch || "",
      purchase_date: device.purchase_date || "",
      warranty_expires: device.warranty_expires || "",
      status: device.status || "active",
      notes: device.notes || "",
    });
    setEditMode(false);
    setSheetOpen(true);
  };

  const handleSaveDevice = async () => {
    if (!selectedDevice) return;

    // Validate form data
    const validationResult = hardwareSchema.safeParse(formData);
    if (!validationResult.success) {
      const errors = validationResult.error.errors.map(err => err.message).join(", ");
      toast.error(`Validation Error: ${errors}`);
      return;
    }

    const deviceData = {
      ...validationResult.data,
      ram_gb: formData.ram_gb ? parseInt(formData.ram_gb) : null,
      storage_gb: formData.storage_gb ? parseInt(formData.storage_gb) : null,
      purchase_date: formData.purchase_date || null,
      warranty_expires: formData.warranty_expires || null,
    };

    const { error } = await supabase
      .from("hardware_inventory")
      .update(deviceData)
      .eq("id", selectedDevice.id);

    if (error) {
      toast.error('Failed to update device');
    } else {
      toast.success('Device updated successfully');
      fetchDevices();
      setSheetOpen(false);
      setSelectedDevice(null);
      setEditMode(false);
    }
  };

  const columns = [
    {
      key: "device_name",
      label: "Device Name",
      filterPlaceholder: "Filter by name...",
    },
    {
      key: "device_type",
      label: "Type",
      filterPlaceholder: "Filter by type...",
    },
    {
      key: "manufacturer",
      label: "Manufacturer",
      filterPlaceholder: "Filter by manufacturer...",
    },
    {
      key: "model",
      label: "Model",
    },
    {
      key: "serial_number",
      label: "Serial Number",
      filterPlaceholder: "Filter by serial...",
    },
    {
      key: "ram_gb",
      label: "RAM (GB)",
    },
    {
      key: "storage_gb",
      label: "Storage (GB)",
    },
    {
      key: "os",
      label: "OS",
      render: (value: any, row: any) => `${value || ""} ${row.os_version || ""}`.trim(),
    },
    {
      key: "branch",
      label: "Branch",
      filterPlaceholder: "Filter by branch...",
    },
    {
      key: "status",
      label: "Status",
      render: (value: any) => (
        <Badge variant={value === 'active' ? 'default' : 'secondary'}>
          {value}
        </Badge>
      ),
    },
  ];

  return (
    <DashboardLayout>
      <div className="p-8">
        {/* Back Navigation */}
        <div className="mb-4">
          <Button variant="ghost" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Hardware Inventory</h1>
            <p className="text-muted-foreground">Track all hardware devices and endpoints</p>
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
            <DataTable
              data={devices}
              columns={columns}
              onRowClick={handleDeviceClick}
              searchKeys={["device_name", "device_type", "manufacturer", "model", "serial_number", "branch"]}
            />
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

        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
            {selectedDevice && (
              <>
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2">
                    {editMode ? "Edit Device" : "Device Details"}
                    {!editMode && isAdmin && (
                      <Button size="sm" variant="ghost" onClick={() => setEditMode(true)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}
                  </SheetTitle>
                  <SheetDescription>
                    {selectedDevice.serial_number || "No serial number"}
                  </SheetDescription>
                </SheetHeader>

                <div className="space-y-6 mt-6">
                  {!editMode ? (
                    <>
                      <div className="grid gap-4">
                        <div>
                          <Label className="text-muted-foreground">Device Name</Label>
                          <p className="text-sm mt-1 font-medium">{selectedDevice.device_name}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-muted-foreground">Type</Label>
                            <p className="text-sm mt-1">{selectedDevice.device_type || "-"}</p>
                          </div>
                          <div>
                            <Label className="text-muted-foreground">Status</Label>
                            <Badge variant={selectedDevice.status === 'active' ? 'default' : 'secondary'} className="mt-1">
                              {selectedDevice.status}
                            </Badge>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-muted-foreground">Manufacturer</Label>
                            <p className="text-sm mt-1">{selectedDevice.manufacturer || "-"}</p>
                          </div>
                          <div>
                            <Label className="text-muted-foreground">Model</Label>
                            <p className="text-sm mt-1">{selectedDevice.model || "-"}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-muted-foreground">RAM</Label>
                            <p className="text-sm mt-1">{selectedDevice.ram_gb ? `${selectedDevice.ram_gb} GB` : "-"}</p>
                          </div>
                          <div>
                            <Label className="text-muted-foreground">Storage</Label>
                            <p className="text-sm mt-1">{selectedDevice.storage_gb ? `${selectedDevice.storage_gb} GB` : "-"}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-muted-foreground">Operating System</Label>
                            <p className="text-sm mt-1">{selectedDevice.os || "-"} {selectedDevice.os_version || ""}</p>
                          </div>
                          <div>
                            <Label className="text-muted-foreground">Processor</Label>
                            <p className="text-sm mt-1">{selectedDevice.processor || "-"}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-muted-foreground">Branch</Label>
                            <p className="text-sm mt-1">{selectedDevice.branch || "-"}</p>
                          </div>
                          <div>
                            <Label className="text-muted-foreground">Location</Label>
                            <p className="text-sm mt-1">{selectedDevice.location || "-"}</p>
                          </div>
                        </div>

                        {selectedDevice.notes && (
                          <div>
                            <Label className="text-muted-foreground">Notes</Label>
                            <p className="text-sm mt-1 whitespace-pre-wrap">{selectedDevice.notes}</p>
                          </div>
                        )}

                        {isAdmin && (
                          <div className="flex gap-2 pt-4">
                            <Button
                              variant="destructive"
                              onClick={() => {
                                handleDelete(selectedDevice.id);
                                setSheetOpen(false);
                              }}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete Device
                            </Button>
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="edit_device_name">Device Name</Label>
                            <Input
                              id="edit_device_name"
                              value={formData.device_name}
                              onChange={(e) => setFormData({ ...formData, device_name: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="edit_device_type">Type</Label>
                            <Input
                              id="edit_device_type"
                              value={formData.device_type}
                              onChange={(e) => setFormData({ ...formData, device_type: e.target.value })}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="edit_manufacturer">Manufacturer</Label>
                            <Input
                              id="edit_manufacturer"
                              value={formData.manufacturer}
                              onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="edit_model">Model</Label>
                            <Input
                              id="edit_model"
                              value={formData.model}
                              onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="edit_status">Status</Label>
                          <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="active">Active</SelectItem>
                              <SelectItem value="inactive">Inactive</SelectItem>
                              <SelectItem value="maintenance">Maintenance</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button onClick={handleSaveDevice} className="flex-1">
                          Save Changes
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setEditMode(false);
                            setFormData({
                              device_name: selectedDevice.device_name || "",
                              device_type: selectedDevice.device_type || "",
                              manufacturer: selectedDevice.manufacturer || "",
                              model: selectedDevice.model || "",
                              serial_number: selectedDevice.serial_number || "",
                              processor: selectedDevice.processor || "",
                              ram_gb: selectedDevice.ram_gb?.toString() || "",
                              storage_gb: selectedDevice.storage_gb?.toString() || "",
                              os: selectedDevice.os || "",
                              os_version: selectedDevice.os_version || "",
                              location: selectedDevice.location || "",
                              branch: selectedDevice.branch || "",
                              purchase_date: selectedDevice.purchase_date || "",
                              warranty_expires: selectedDevice.warranty_expires || "",
                              status: selectedDevice.status || "active",
                              notes: selectedDevice.notes || "",
                            });
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </DashboardLayout>
  );
};

export default HardwareInventory;
