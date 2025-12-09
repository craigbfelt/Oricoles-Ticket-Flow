import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Building2,
  Phone,
  Mail,
  Globe,
  Loader2,
  AlertCircle,
  ArrowLeft,
  Briefcase,
  FileText,
  Calendar
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

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

const ITSupplierDetails = () => {
  const navigate = useNavigate();
  const { supplierId } = useParams<{ supplierId: string }>();
  const [loading, setLoading] = useState(true);
  const [supplier, setSupplier] = useState<ITSupplier | null>(null);

  useEffect(() => {
    checkAuth();
    fetchSupplierDetails();
  }, [supplierId]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }
  };

  const fetchSupplierDetails = async () => {
    if (!supplierId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from("it_suppliers")
      .select("*")
      .eq("id", supplierId)
      .single();

    if (error) {
      console.error("Error fetching supplier details:", error);
    } else {
      setSupplier(data);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!supplier) {
    return (
      <DashboardLayout>
        <div className="p-4 md:p-6 space-y-6">
          <Button variant="ghost" onClick={() => navigate("/it-suppliers")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to IT Suppliers
          </Button>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Supplier Not Found</AlertTitle>
            <AlertDescription>
              The requested IT supplier could not be found.
            </AlertDescription>
          </Alert>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 space-y-6">
        {/* Back Navigation */}
        <div>
          <Button variant="ghost" onClick={() => navigate("/it-suppliers")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to IT Suppliers
          </Button>
        </div>

        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-[#E91E63]/10 flex items-center justify-center">
            <Building2 className="h-8 w-8 text-[#E91E63]" />
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-[#E91E63]">{supplier.name}</h1>
            <p className="text-muted-foreground text-lg">{supplier.role}</p>
          </div>
        </div>

        {/* Basic Info Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Role</CardTitle>
              <Briefcase className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-semibold">{supplier.role}</div>
            </CardContent>
          </Card>

          {supplier.contact_email && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Email</CardTitle>
                <Mail className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <a 
                  href={`mailto:${supplier.contact_email}`} 
                  className="text-lg font-semibold text-[#E91E63] hover:underline"
                >
                  {supplier.contact_email}
                </a>
              </CardContent>
            </Card>
          )}

          {supplier.contact_phone && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Phone</CardTitle>
                <Phone className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <a 
                  href={`tel:${supplier.contact_phone}`} 
                  className="text-lg font-semibold hover:underline"
                >
                  {supplier.contact_phone}
                </a>
              </CardContent>
            </Card>
          )}

          {supplier.website && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Website</CardTitle>
                <Globe className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <a 
                  href={supplier.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-lg font-semibold text-[#E91E63] hover:underline"
                >
                  Visit Website
                </a>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Created</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-semibold">
                {new Date(supplier.created_at).toLocaleDateString()}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Last Updated</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-semibold">
                {new Date(supplier.updated_at).toLocaleDateString()}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Services Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[#E91E63]">
              <FileText className="h-5 w-5" />
              Services Provided
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none">
              <p className="text-base leading-relaxed whitespace-pre-wrap">{supplier.services}</p>
            </div>
          </CardContent>
        </Card>

        {/* Notes Section */}
        {supplier.notes && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[#E91E63]">
                <FileText className="h-5 w-5" />
                Additional Notes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none">
                <p className="text-base leading-relaxed whitespace-pre-wrap">{supplier.notes}</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ITSupplierDetails;
