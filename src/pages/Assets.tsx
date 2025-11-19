import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { PageDocumentsView } from "@/components/PageDocumentsView";
import { assetSchema } from "@/lib/validations";

const Assets = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [assets, setAssets] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [assetToDelete, setAssetToDelete] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    asset_tag: "",
    category: "",
    model: "",
    serial_number: "",
    status: "active",
    location: "",
    notes: "",
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        checkAdminRole(session.user.id);
      }
    });

    fetchAssets();
  }, [navigate]);

  const checkAdminRole = async (userId: string) => {
    setIsAdmin(true);
  };

  const fetchAssets = async () => {
    const { data } = await supabase
      .from("assets")
      .select("*")
      .order("created_at", { ascending: false });

    setAssets(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form data
    const validationResult = assetSchema.safeParse(formData);
    if (!validationResult.success) {
      const errors = validationResult.error.errors.map(err => err.message).join(", ");
      toast({
        title: "Validation Error",
        description: errors,
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase.from("assets").insert([validationResult.data]);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Asset created successfully",
      });
      setOpen(false);
      setFormData({
        name: "",
        asset_tag: "",
        category: "",
        model: "",
        serial_number: "",
        status: "active",
        location: "",
        notes: "",
      });
      fetchAssets();
    }
  };

  const handleDeleteAsset = async () => {
    if (!assetToDelete) return;

    const { error } = await supabase
      .from("assets")
      .delete()
      .eq("id", assetToDelete);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Asset deleted successfully",
      });
      fetchAssets();
    }
    setDeleteDialogOpen(false);
    setAssetToDelete(null);
  };

  const handleCSVImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const text = await file.text();
      const rows = text.split('\n').filter(row => row.trim());
      const headers = rows[0].split(',').map(h => h.trim());
      
      const assets = rows.slice(1).map(row => {
        const values = row.split(',').map(v => v.trim());
        const asset: any = {};
        headers.forEach((header, index) => {
          if (values[index]) {
            asset[header] = values[index];
          }
        });
        return asset;
      });

      const { error } = await supabase.from('assets').insert(assets);
      
      if (error) throw error;

      toast({
        title: "Success",
        description: `Successfully imported ${assets.length} assets`,
      });
      fetchAssets();
      event.target.value = '';
    } catch (error: any) {
      console.error('Error importing CSV:', error);
      toast({
        title: "Error",
        description: error.message || 'Failed to import CSV',
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: { [key: string]: "default" | "secondary" | "destructive" | "outline" } = {
      active: "default",
      maintenance: "secondary",
      retired: "destructive",
    };

    return (
      <Badge variant={variants[status] || "outline"}>
        {status}
      </Badge>
    );
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Assets</h1>
            <p className="text-muted-foreground">Manage company assets</p>
          </div>
          {isAdmin && (
            <div className="flex gap-2">
              <Button variant="outline" disabled={isImporting} onClick={() => document.getElementById('csv-upload')?.click()}>
                <Upload className="mr-2 h-4 w-4" />
                {isImporting ? 'Importing...' : 'Import CSV'}
              </Button>
              <input
                id="csv-upload"
                type="file"
                accept=".csv"
                onChange={handleCSVImport}
                className="hidden"
              />
              <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  New Asset
                </Button>
              </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Asset</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Asset Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="asset_tag">Asset Tag</Label>
                  <Input
                    id="asset_tag"
                    value={formData.asset_tag}
                    onChange={(e) => setFormData({ ...formData, asset_tag: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Input
                    id="category"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="e.g., Laptop, Monitor, Printer"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="model">Model</Label>
                  <Input
                    id="model"
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="serial_number">Serial Number</Label>
                  <Input
                    id="serial_number"
                    value={formData.serial_number}
                    onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                      <SelectItem value="retired">Retired</SelectItem>
                      <SelectItem value="disposed">Disposed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                  />
                </div>
                <Button type="submit" className="w-full">Add Asset</Button>
              </form>
            </DialogContent>
          </Dialog>
            </div>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Assets</CardTitle>
          </CardHeader>
          <CardContent>
            {!isAdmin ? (
              <p className="text-muted-foreground">Only administrators can view and manage assets.</p>
            ) : assets.length === 0 ? (
              <p className="text-muted-foreground">No assets yet. Add your first asset to get started.</p>
            ) : (
              <div className="space-y-4">
                {assets.map((asset) => (
                  <div
                    key={asset.id}
                    className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors gap-4"
                  >
                    <div className="flex-1">
                      <h3 className="font-medium">{asset.name}</h3>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2 text-sm text-muted-foreground">
                        {asset.asset_tag && <span>Tag: {asset.asset_tag}</span>}
                        {asset.category && <span>Category: {asset.category}</span>}
                        {asset.model && <span>Model: {asset.model}</span>}
                        {asset.location && <span>Location: {asset.location}</span>}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {getStatusBadge(asset.status)}
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          setAssetToDelete(asset.id);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Asset</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this asset? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteAsset}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Documents Section - Files moved to Assets */}
        <div className="mt-6">
          <PageDocumentsView 
            pageLocation="Assets"
            title="Asset Documents"
            description="Documents moved to this page from the Document Hub"
          />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Assets;
