import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Briefcase, CheckCircle2, FolderKanban, AlertCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DataTable } from "@/components/DataTable";
import { Badge } from "@/components/ui/badge";
import { AddJobDialog } from "@/components/AddJobDialog";
import { useToast } from "@/hooks/use-toast";
import { PageDocumentsView } from "@/components/PageDocumentsView";

const Jobs = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("live");

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

  const { data: jobs, isLoading, refetch } = useQuery({
    queryKey: ["jobs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const { data: updateRequests } = useQuery({
    queryKey: ["job-update-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("job_update_requests")
        .select("*, jobs(title)")
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const liveJobs = jobs?.filter((j) => j.status === "live") || [];
  const completedJobs = jobs?.filter((j) => j.status === "completed") || [];
  const projects = jobs?.filter((j) => j.job_type === "project") || [];

  const jobColumns = [
    {
      key: "title",
      label: "Title",
      render: (value: string) => <span className="font-medium">{value}</span>,
    },
    {
      key: "status",
      label: "Status",
      render: (value: string) => (
        <Badge variant={value === "completed" ? "default" : "secondary"}>
          {value}
        </Badge>
      ),
    },
    {
      key: "priority",
      label: "Priority",
      render: (value: string) => (
        <Badge
          variant={
            value === "high"
              ? "destructive"
              : value === "medium"
              ? "default"
              : "secondary"
          }
        >
          {value}
        </Badge>
      ),
    },
    {
      key: "client_name",
      label: "Client",
      render: (value: string) => value || "-",
    },
    {
      key: "due_date",
      label: "Due Date",
      render: (value: string) =>
        value ? new Date(value).toLocaleDateString() : "-",
    },
    {
      key: "estimated_hours",
      label: "Est. Hours",
      render: (value: number) => value || "-",
    },
  ];

  const updateRequestColumns = [
    {
      key: "jobs",
      label: "Job",
      render: (value: any) => value?.title || "-",
    },
    {
      key: "requested_by_name",
      label: "Requested By",
    },
    {
      key: "update_type",
      label: "Type",
      render: (value: string) => <Badge variant="outline">{value}</Badge>,
    },
    {
      key: "description",
      label: "Description",
    },
    {
      key: "created_at",
      label: "Date",
      render: (value: string) => new Date(value).toLocaleDateString(),
    },
  ];

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Jobs & Projects</h1>
            <p className="text-muted-foreground">
              Manage all your jobs, projects, and update requests
            </p>
          </div>
          <AddJobDialog onSuccess={() => refetch()} />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="live" className="flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              Live Jobs ({liveJobs.length})
            </TabsTrigger>
            <TabsTrigger value="completed" className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Completed ({completedJobs.length})
            </TabsTrigger>
            <TabsTrigger value="projects" className="flex items-center gap-2">
              <FolderKanban className="h-4 w-4" />
              Projects ({projects.length})
            </TabsTrigger>
            <TabsTrigger value="updates" className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Update Requests ({updateRequests?.length || 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="live" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Active Jobs</CardTitle>
              </CardHeader>
              <CardContent>
                <DataTable
                  data={liveJobs}
                  columns={jobColumns}
                  searchKeys={["title", "client_name", "status"]}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="completed" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Completed Jobs</CardTitle>
              </CardHeader>
              <CardContent>
                <DataTable
                  data={completedJobs}
                  columns={jobColumns}
                  searchKeys={["title", "client_name", "status"]}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="projects" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Projects</CardTitle>
              </CardHeader>
              <CardContent>
                <DataTable
                  data={projects}
                  columns={jobColumns}
                  searchKeys={["title", "client_name", "status"]}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="updates" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Pending Update Requests</CardTitle>
              </CardHeader>
              <CardContent>
                <DataTable
                  data={updateRequests || []}
                  columns={updateRequestColumns}
                  searchKeys={["requested_by_name", "description", "update_type"]}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Documents Section - Files moved to Jobs */}
        <div className="mt-6">
          <PageDocumentsView 
            pageLocation="Jobs"
            title="Job Documents"
            description="Documents moved to this page from the Document Hub"
          />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Jobs;
