import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Network, Eye, X, Building2, Cloud } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

interface NetworkDiagram {
  id: string;
  name: string;
  image_path: string | null;
  description: string | null;
  branch_id: string | null;
  is_company_wide: boolean;
  created_at: string;
}

interface Branch {
  id: string;
  name: string;
  city: string | null;
}

const NetworkDiagramOverview = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [fullPageImageUrl, setFullPageImageUrl] = useState<string | null>(null);
  const [fullPageImageName, setFullPageImageName] = useState<string>("");
  const [selectedTab, setSelectedTab] = useState("company");

  useEffect(() => {
    checkAccess();
  }, [navigate]);

  const checkAccess = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }
  };

  // Fetch all branches
  const { data: branches } = useQuery({
    queryKey: ["branches"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("branches")
        .select("id, name, city")
        .order("name");
      if (error) throw error;
      return data as Branch[];
    },
  });

  // Fetch all network diagrams
  const { data: allDiagrams, isLoading } = useQuery({
    queryKey: ["network-diagrams-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("network_diagrams")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as NetworkDiagram[];
    },
  });

  // Separate diagrams by category
  const companyDiagrams = allDiagrams?.filter(d => d.is_company_wide && d.image_path) || [];
  
  // Filter Nymbis Cloud diagrams - these would be stored in cloud_networks table or marked specially
  // For now, we'll check if they're in the company-network folder path
  const nymbisDiagrams = allDiagrams?.filter(d => 
    d.image_path?.includes('cloud-networks') || 
    d.name?.toLowerCase().includes('nymbis')
  ) || [];

  // Get diagrams by branch
  const getDiagramsForBranch = (branchId: string) => {
    return allDiagrams?.filter(d => d.branch_id === branchId && d.image_path) || [];
  };

  const handleViewFullPage = (imageUrl: string, name: string) => {
    setFullPageImageUrl(imageUrl);
    setFullPageImageName(name);
  };

  const getImageUrl = (imagePath: string) => {
    const { data } = supabase.storage
      .from('diagrams')
      .getPublicUrl(imagePath);
    return data.publicUrl;
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Network className="w-8 h-8" />
              Visual Network Diagram Overview
            </h1>
            <p className="text-muted-foreground">
              View network diagrams for Nymbis Cloud, Company Network, and all Branches
            </p>
          </div>
        </div>

        {isLoading ? (
          <Card>
            <CardContent className="py-12">
              <p className="text-center text-muted-foreground">Loading network diagrams...</p>
            </CardContent>
          </Card>
        ) : (
          <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 lg:w-[600px]">
              <TabsTrigger value="nymbis" className="flex items-center gap-2">
                <Cloud className="w-4 h-4" />
                Nymbis Cloud
              </TabsTrigger>
              <TabsTrigger value="company" className="flex items-center gap-2">
                <Network className="w-4 h-4" />
                Company Network
              </TabsTrigger>
              <TabsTrigger value="branches" className="flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Branches
              </TabsTrigger>
            </TabsList>

            {/* Nymbis Cloud Tab */}
            <TabsContent value="nymbis" className="space-y-4 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Cloud className="w-5 h-5" />
                    Nymbis Cloud Network Diagrams
                  </CardTitle>
                  <CardDescription>
                    Network topology diagrams for Nymbis RDP Cloud infrastructure
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {nymbisDiagrams.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {nymbisDiagrams.map((diagram) => (
                        <DiagramImageCard
                          key={diagram.id}
                          diagram={diagram}
                          onViewFullPage={handleViewFullPage}
                          getImageUrl={getImageUrl}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Cloud className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">
                        No Nymbis Cloud network diagrams available yet.
                      </p>
                      <Button
                        variant="link"
                        className="mt-2"
                        onClick={() => navigate("/nymbis-rdp-cloud")}
                      >
                        Upload diagrams in Nymbis RDP Cloud page →
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Company Network Tab */}
            <TabsContent value="company" className="space-y-4 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Network className="w-5 h-5" />
                    Company Network Diagrams
                  </CardTitle>
                  <CardDescription>
                    Company-wide network topology diagrams
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {companyDiagrams.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {companyDiagrams.map((diagram) => (
                        <DiagramImageCard
                          key={diagram.id}
                          diagram={diagram}
                          onViewFullPage={handleViewFullPage}
                          getImageUrl={getImageUrl}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Network className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">
                        No company network diagrams available yet.
                      </p>
                      <Button
                        variant="link"
                        className="mt-2"
                        onClick={() => navigate("/company-network")}
                      >
                        Upload diagrams in Company Network page →
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Branches Tab */}
            <TabsContent value="branches" className="space-y-4 mt-6">
              {branches && branches.length > 0 ? (
                <div className="space-y-6">
                  {branches.map((branch) => {
                    const branchDiagrams = getDiagramsForBranch(branch.id);
                    return (
                      <Card key={branch.id}>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Building2 className="w-5 h-5" />
                            {branch.name}
                            {branch.city && (
                              <Badge variant="outline" className="ml-2">
                                {branch.city}
                              </Badge>
                            )}
                          </CardTitle>
                          <CardDescription>
                            Network diagrams for {branch.name} branch
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          {branchDiagrams.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {branchDiagrams.map((diagram) => (
                                <DiagramImageCard
                                  key={diagram.id}
                                  diagram={diagram}
                                  onViewFullPage={handleViewFullPage}
                                  getImageUrl={getImageUrl}
                                />
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-8">
                              <p className="text-sm text-muted-foreground">
                                No network diagrams available for this branch.
                              </p>
                              <Button
                                variant="link"
                                className="mt-2"
                                onClick={() => navigate(`/branches/${branch.id}`)}
                              >
                                Upload diagrams for {branch.name} →
                              </Button>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <Card>
                  <CardContent className="py-12">
                    <div className="text-center">
                      <Building2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">
                        No branches available. Create branches first.
                      </p>
                      <Button
                        variant="link"
                        className="mt-2"
                        onClick={() => navigate("/branches")}
                      >
                        Go to Branches page →
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        )}

        {/* Full Page Image Viewer */}
        {fullPageImageUrl && (
          <div 
            role="dialog"
            aria-modal="true"
            aria-labelledby="image-viewer-title"
            className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
            onClick={() => setFullPageImageUrl(null)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setFullPageImageUrl(null);
              }
            }}
          >
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 text-white hover:bg-white/20"
              onClick={() => setFullPageImageUrl(null)}
              aria-label="Close image viewer"
            >
              <X className="h-6 w-6" />
            </Button>
            <div className="relative max-w-[95vw] max-h-[95vh] flex flex-col items-center">
              <h2 id="image-viewer-title" className="text-white text-xl font-semibold mb-4">
                {fullPageImageName}
              </h2>
              <img
                src={fullPageImageUrl}
                alt={fullPageImageName}
                className="max-w-full max-h-[85vh] object-contain"
                onClick={(e) => e.stopPropagation()}
                tabIndex={0}
              />
              <div className="mt-4 flex gap-2">
                <Button
                  variant="secondary"
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(fullPageImageUrl, '_blank');
                  }}
                >
                  Open in New Tab
                </Button>
                <Button
                  variant="secondary"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFullPageImageUrl(null);
                  }}
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

// DiagramImageCard Component
const DiagramImageCard = ({
  diagram,
  onViewFullPage,
  getImageUrl,
}: {
  diagram: NetworkDiagram;
  onViewFullPage: (imageUrl: string, name: string) => void;
  getImageUrl: (imagePath: string) => string;
}) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (diagram.image_path) {
      const url = getImageUrl(diagram.image_path);
      setImageUrl(url);
    }
  }, [diagram.image_path, getImageUrl]);

  if (!imageUrl) return null;

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow group">
      <CardHeader className="pb-3">
        <CardTitle className="text-base line-clamp-1">{diagram.name}</CardTitle>
        {diagram.description && (
          <CardDescription className="text-xs line-clamp-2">
            {diagram.description}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <button
          className="relative w-full rounded-lg border overflow-hidden bg-muted cursor-pointer hover:opacity-90 transition-opacity focus:ring-2 focus:ring-primary focus:outline-none"
          onClick={() => onViewFullPage(imageUrl, diagram.name)}
          aria-label={`View full page image of ${diagram.name}`}
        >
          <img
            src={imageUrl}
            alt={diagram.name}
            className="w-full h-48 object-cover"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
            <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 rounded-full p-3">
              <Eye className="w-6 h-6 text-gray-900" />
            </div>
          </div>
        </button>
        <div className="mt-3 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {new Date(diagram.created_at).toLocaleDateString()}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onViewFullPage(imageUrl, diagram.name)}
          >
            <Eye className="h-3 w-3 mr-1" />
            View
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default NetworkDiagramOverview;
