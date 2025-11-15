import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Database, HardDrive, FileType } from "lucide-react";

interface StorageStats {
  totalFiles: number;
  totalSize: number;
  bucketStats: Array<{
    bucket: string;
    files: number;
    size: number;
  }>;
  fileTypeStats: Array<{
    type: string;
    count: number;
    size: number;
  }>;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))'];

export const StorageUsageChart = () => {
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchStorageStats();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchStorageStats();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const fetchStorageStats = async () => {
    try {
      setIsLoading(true);
      
      // Fetch all documents
      const { data: documents, error } = await supabase
        .from("documents")
        .select("storage_bucket, file_type, file_size");

      if (error) throw error;

      if (!documents || documents.length === 0) {
        setStats({
          totalFiles: 0,
          totalSize: 0,
          bucketStats: [],
          fileTypeStats: []
        });
        return;
      }

      // Calculate stats
      const totalFiles = documents.length;
      const totalSize = documents.reduce((sum, doc) => sum + (doc.file_size || 0), 0);

      // Bucket stats
      const bucketMap = new Map<string, { files: number; size: number }>();
      documents.forEach(doc => {
        const bucket = doc.storage_bucket || "unknown";
        const existing = bucketMap.get(bucket) || { files: 0, size: 0 };
        bucketMap.set(bucket, {
          files: existing.files + 1,
          size: existing.size + (doc.file_size || 0)
        });
      });

      const bucketStats = Array.from(bucketMap.entries()).map(([bucket, data]) => ({
        bucket,
        ...data
      }));

      // File type stats
      const typeMap = new Map<string, { count: number; size: number }>();
      documents.forEach(doc => {
        const type = doc.file_type || "unknown";
        const existing = typeMap.get(type) || { count: 0, size: 0 };
        typeMap.set(type, {
          count: existing.count + 1,
          size: existing.size + (doc.file_size || 0)
        });
      });

      const fileTypeStats = Array.from(typeMap.entries())
        .map(([type, data]) => ({
          type,
          ...data
        }))
        .sort((a, b) => b.count - a.count);

      setStats({
        totalFiles,
        totalSize,
        bucketStats,
        fileTypeStats
      });
    } catch (error) {
      console.error("Error fetching storage stats:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Storage Usage</CardTitle>
          <CardDescription>Loading statistics...</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-[200px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!stats || stats.totalFiles === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Storage Usage</CardTitle>
          <CardDescription>No documents uploaded yet</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Upload documents to see storage statistics</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HardDrive className="h-5 w-5" />
          Storage Usage
        </CardTitle>
        <CardDescription>
          Real-time storage analytics • Auto-refresh every 30s
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex flex-col gap-2 p-4 rounded-lg border bg-card">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Database className="h-4 w-4" />
              <span className="text-sm font-medium">Total Files</span>
            </div>
            <p className="text-2xl font-bold">{stats.totalFiles}</p>
          </div>
          
          <div className="flex flex-col gap-2 p-4 rounded-lg border bg-card">
            <div className="flex items-center gap-2 text-muted-foreground">
              <HardDrive className="h-4 w-4" />
              <span className="text-sm font-medium">Total Storage</span>
            </div>
            <p className="text-2xl font-bold">{formatBytes(stats.totalSize)}</p>
          </div>
          
          <div className="flex flex-col gap-2 p-4 rounded-lg border bg-card">
            <div className="flex items-center gap-2 text-muted-foreground">
              <FileType className="h-4 w-4" />
              <span className="text-sm font-medium">File Types</span>
            </div>
            <p className="text-2xl font-bold">{stats.fileTypeStats.length}</p>
          </div>
        </div>

        {/* Storage by Bucket */}
        {stats.bucketStats.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold mb-3">Storage by Bucket</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={stats.bucketStats}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="bucket" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))' 
                  }}
                  formatter={(value: number, name: string) => {
                    if (name === 'size') return formatBytes(value);
                    return value;
                  }}
                />
                <Legend />
                <Bar dataKey="files" fill="hsl(var(--primary))" name="Files" />
                <Bar dataKey="size" fill="hsl(var(--secondary))" name="Size (bytes)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* File Type Distribution */}
        {stats.fileTypeStats.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold mb-3">File Type Distribution</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={stats.fileTypeStats}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ type, percent }) => `${type} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius={80}
                    fill="hsl(var(--primary))"
                    dataKey="count"
                  >
                    {stats.fileTypeStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))' 
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>

              <div className="space-y-2">
                {stats.fileTypeStats.map((stat, idx) => (
                  <div key={stat.type} className="flex items-center justify-between p-2 rounded border bg-card">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                      />
                      <span className="text-sm font-medium">{stat.type}</span>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline" className="text-xs">
                        {stat.count} files
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatBytes(stat.size)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
