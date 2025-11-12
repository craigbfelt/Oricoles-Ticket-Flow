import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Briefcase, CheckCircle2, FolderKanban, AlertCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DataTable } from "@/components/DataTable";
import { Badge } from "@/components/ui/badge";

const Jobs = () => {
  const [activeTab, setActiveTab] = useState("live");

  const { data: jobs, isLoading } = useQuery({
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
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Jobs & Projects</h1>
            <p className="text-muted-foreground">
              Manage all your jobs, projects, and update requests
            </p>
          </div>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Job
          </Button>
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
      </div>
    </DashboardLayout>
  );
};

export default Jobs;
