import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Copy, RefreshCw, CheckCircle2, XCircle, Globe, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface BucketInfo {
  id: string;
  name: string;
  public: boolean;
  file_size_limit?: number | null;
  allowed_mime_types?: string[] | null;
}

interface UploadError {
  timestamp: string;
  bucket: string;
  error: string;
  details: string;
}

export const StorageDiagnostics = () => {
  const [buckets, setBuckets] = useState<BucketInfo[]>([]);
  const [uploadErrors, setUploadErrors] = useState<UploadError[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchBucketInfo();
    loadErrorsFromStorage();
  }, []);

  const fetchBucketInfo = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.storage.listBuckets();
      
      if (error) {
        console.error("Error fetching buckets:", error);
        logError("system", "Failed to fetch bucket list", error.message);
      } else {
        setBuckets(data || []);
      }
    } catch (err) {
      console.error("Unexpected error:", err);
      logError("system", "Unexpected error fetching buckets", err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  };

  const loadErrorsFromStorage = () => {
    try {
      const stored = localStorage.getItem("upload_errors");
      if (stored) {
        setUploadErrors(JSON.parse(stored));
      }
    } catch (err) {
      console.error("Failed to load errors from storage:", err);
    }
  };

  const logError = (bucket: string, error: string, details: string) => {
    const newError: UploadError = {
      timestamp: new Date().toISOString(),
      bucket,
      error,
      details
    };
    
    const updatedErrors = [newError, ...uploadErrors].slice(0, 10); // Keep last 10 errors
    setUploadErrors(updatedErrors);
    localStorage.setItem("upload_errors", JSON.stringify(updatedErrors));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const copyAllErrors = () => {
    const errorText = uploadErrors.map(err => 
      `[${new Date(err.timestamp).toLocaleString()}] ${err.bucket}: ${err.error}\nDetails: ${err.details}`
    ).join("\n\n");
    copyToClipboard(errorText);
  };

  const clearErrors = () => {
    setUploadErrors([]);
    localStorage.removeItem("upload_errors");
    toast.success("Error log cleared");
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              Storage Diagnostics
              {buckets.length > 0 && (
                <Badge variant="outline" className="ml-2">
                  {buckets.length} bucket{buckets.length !== 1 ? 's' : ''}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Monitor storage buckets and upload errors
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchBucketInfo}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Bucket Information */}
        <div>
          <h3 className="text-sm font-semibold mb-3">Storage Buckets</h3>
          <div className="space-y-2">
            {buckets.length === 0 && !isLoading && (
              <Alert>
                <AlertDescription>No storage buckets found</AlertDescription>
              </Alert>
            )}
            {buckets.map((bucket) => (
              <div
                key={bucket.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-card"
              >
                <div className="flex items-center gap-3">
                  {bucket.public ? (
                    <Globe className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Lock className="h-4 w-4 text-muted-foreground" />
                  )}
                  <div>
                    <p className="font-medium">{bucket.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {bucket.public ? "Public" : "Private"} bucket
                      {bucket.file_size_limit && ` • Max ${(bucket.file_size_limit / 1024 / 1024).toFixed(0)}MB`}
                    </p>
                  </div>
                </div>
                <Badge variant={bucket.public ? "default" : "secondary"}>
                  {bucket.public ? "Public Access" : "Private"}
                </Badge>
              </div>
            ))}
          </div>
        </div>

        {/* Upload Errors */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">
              Recent Upload Errors
              {uploadErrors.length > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {uploadErrors.length}
                </Badge>
              )}
            </h3>
            {uploadErrors.length > 0 && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyAllErrors}
                >
                  <Copy className="h-3 w-3 mr-1" />
                  Copy All
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearErrors}
                >
                  Clear
                </Button>
              </div>
            )}
          </div>
          
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {uploadErrors.length === 0 ? (
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>No recent upload errors</AlertDescription>
              </Alert>
            ) : (
              uploadErrors.map((err, idx) => (
                <Alert key={idx} variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 space-y-1">
                        <p className="text-xs text-muted-foreground">
                          {new Date(err.timestamp).toLocaleString()} • {err.bucket}
                        </p>
                        <p className="font-medium">{err.error}</p>
                        <p className="text-xs font-mono bg-muted/50 p-2 rounded mt-1 break-all">
                          {err.details}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(`[${err.timestamp}] ${err.bucket}: ${err.error}\n${err.details}`)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </AlertDescription>
                </Alert>
              ))
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Export the error logging function to be used by DocumentHub
export const logUploadError = (bucket: string, error: string, details: string) => {
  const newError: UploadError = {
    timestamp: new Date().toISOString(),
    bucket,
    error,
    details
  };
  
  try {
    const stored = localStorage.getItem("upload_errors");
    const errors = stored ? JSON.parse(stored) : [];
    const updatedErrors = [newError, ...errors].slice(0, 10);
    localStorage.setItem("upload_errors", JSON.stringify(updatedErrors));
  } catch (err) {
    console.error("Failed to save error to storage:", err);
  }
};
