import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, CheckCircle, XCircle, Clock } from "lucide-react";
import { Tables } from "@/integrations/supabase/types";

type ImportJob = Tables<"import_jobs">;

interface ImportHistoryProps {
  branchId?: string;
}

export const ImportHistory = ({ branchId }: ImportHistoryProps) => {
  const { data: imports, isLoading } = useQuery({
    queryKey: ["import-jobs", branchId],
    queryFn: async () => {
      let query = supabase
        .from("import_jobs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);

      if (branchId) {
        query = query.eq("branch_id", branchId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "processing":
        return <Clock className="h-4 w-4 text-blue-500 animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      completed: "default",
      failed: "destructive",
      processing: "secondary",
      pending: "outline",
    };
    return (
      <Badge variant={variants[status] || "outline"}>
        {status.toUpperCase()}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Import History</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading import history...</p>
        </CardContent>
      </Card>
    );
  }

  if (!imports || imports.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Import History</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No imports yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Import History</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {imports.map((job) => (
            <div
              key={job.id}
              className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
            >
              <div className="mt-0.5">{getStatusIcon(job.status)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <FileText className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                  <span className="text-sm font-medium truncate">
                    {job.resource_type || job.import_type} Import
                  </span>
                  {getStatusBadge(job.status)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {new Date(job.created_at).toLocaleString()}
                </p>
                {job.error_details && (
                  <p className="text-xs text-destructive mt-1">{job.error_details}</p>
                )}
                {job.result_summary && Object.keys(job.result_summary).length > 0 && (
                  <div className="text-xs text-muted-foreground mt-1">
                    {JSON.stringify(job.result_summary)}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
