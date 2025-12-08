import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Network, Building2, Cloud } from "lucide-react";
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
          <div className="space-y-8">
            {/* Nymbis Cloud Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <Cloud className="w-6 h-6" />
                  Nymbis Cloud Network Diagrams
                </CardTitle>
                <CardDescription>
                  Network topology diagrams for Nymbis RDP Cloud infrastructure
                </CardDescription>
              </CardHeader>
              <CardContent>
                {nymbisDiagrams.length > 0 ? (
                  <div className="space-y-6">
                    {nymbisDiagrams.map((diagram) => (
                      <DiagramFullDisplay
                        key={diagram.id}
                        diagram={diagram}
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

            {/* Company Network Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <Network className="w-6 h-6" />
                  Company Network Diagrams
                </CardTitle>
                <CardDescription>
                  Company-wide network topology diagrams
                </CardDescription>
              </CardHeader>
              <CardContent>
                {companyDiagrams.length > 0 ? (
                  <div className="space-y-6">
                    {companyDiagrams.map((diagram) => (
                      <DiagramFullDisplay
                        key={diagram.id}
                        diagram={diagram}
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

            {/* Branches Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <Building2 className="w-6 h-6" />
                  Branch Network Diagrams
                </CardTitle>
                <CardDescription>
                  Network diagrams for all branch locations
                </CardDescription>
              </CardHeader>
              <CardContent>
                {branches && branches.length > 0 ? (
                  <div className="space-y-8">
                    {branches.map((branch) => {
                      const branchDiagrams = getDiagramsForBranch(branch.id);
                      return (
                        <div key={branch.id} className="space-y-4">
                          <div className="flex items-center gap-3 pb-2 border-b">
                            <Building2 className="w-5 h-5 text-primary" />
                            <h3 className="text-xl font-semibold">{branch.name}</h3>
                            {branch.city && (
                              <Badge variant="outline">
                                {branch.city}
                              </Badge>
                            )}
                          </div>
                          {branchDiagrams.length > 0 ? (
                            <div className="space-y-6 pl-4">
                              {branchDiagrams.map((diagram) => (
                                <DiagramFullDisplay
                                  key={diagram.id}
                                  diagram={diagram}
                                  getImageUrl={getImageUrl}
                                />
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-8 pl-4">
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
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12">
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
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

// DiagramFullDisplay Component - Shows full diagram directly on page
const DiagramFullDisplay = ({
  diagram,
  getImageUrl,
}: {
  diagram: NetworkDiagram;
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
    <div className="space-y-3">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h4 className="text-lg font-semibold">{diagram.name}</h4>
          {diagram.description && (
            <p className="text-sm text-muted-foreground mt-1">
              {diagram.description}
            </p>
          )}
        </div>
        <div className="text-xs text-muted-foreground">
          {new Date(diagram.created_at).toLocaleDateString()}
        </div>
      </div>
      <div className="border rounded-lg overflow-hidden bg-white shadow-sm">
        <a 
          href={imageUrl} 
          target="_blank" 
          rel="noopener noreferrer"
          className="block hover:opacity-95 transition-opacity"
          aria-label={`Open ${diagram.name} in new tab`}
        >
          <img
            src={imageUrl}
            alt={diagram.name}
            className="w-full h-auto max-h-[1200px] object-contain"
          />
        </a>
      </div>
      <p className="text-xs text-muted-foreground italic">
        Click diagram to open in a new tab
      </p>
    </div>
  );
};

export default NetworkDiagramOverview;
