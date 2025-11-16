import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Eye, FileImage, FileText, File, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface PageDocument {
  id: string;
  filename: string;
  original_filename: string;
  file_type: string;
  file_size: number;
  storage_path: string;
  storage_bucket: string;
  category: string;
  description: string | null;
  page_location: string | null;
  moved_at: string | null;
  created_at: string;
}

interface PageDocumentsViewProps {
  pageLocation: string;
  title?: string;
  description?: string;
}

export function PageDocumentsView({ 
  pageLocation, 
  title = "Documents", 
  description = "Documents associated with this page"
}: PageDocumentsViewProps) {
  const [documents, setDocuments] = useState<PageDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDocuments();
  }, [pageLocation]);

  const fetchDocuments = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      // Filter client-side since page_location column doesn't exist yet
      const filtered = (data || []).filter((doc: any) => 
        doc.page_location === pageLocation || !doc.page_location
      );
      setDocuments(filtered as any);
    } catch (error) {
      console.error("Error fetching documents:", error);
      toast.error("Failed to fetch documents");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async (doc: PageDocument) => {
    try {
      const { data, error } = await supabase.storage
        .from(doc.storage_bucket)
        .download(doc.storage_path);

      if (error) throw error;

      const url = window.URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.original_filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success("Document downloaded");
    } catch (error) {
      console.error("Error downloading document:", error);
      toast.error("Failed to download document");
    }
  };

  const handleView = async (doc: PageDocument) => {
    try {
      const { data } = await supabase.storage
        .from(doc.storage_bucket)
        .getPublicUrl(doc.storage_path);

      window.open(data.publicUrl, '_blank');
    } catch (error) {
      console.error("Error viewing document:", error);
      toast.error("Failed to view document");
    }
  };

  const getFileIcon = (fileType: string, category: string) => {
    if (category === 'image' || fileType.startsWith('image/')) {
      return <FileImage className="h-5 w-5 text-blue-500" />;
    } else if (category === 'pdf' || fileType === 'application/pdf') {
      return <File className="h-5 w-5 text-red-500" />;
    } else {
      return <FileText className="h-5 w-5 text-gray-500" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(1) + ' MB';
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (documents.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-2 text-sm font-semibold">No documents</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              No documents have been moved to this page yet.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>
          {description} ({documents.length} document{documents.length !== 1 ? 's' : ''})
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {getFileIcon(doc.file_type, doc.category)}
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{doc.original_filename}</div>
                  {doc.description && (
                    <div className="text-sm text-muted-foreground truncate">
                      {doc.description}
                    </div>
                  )}
                  <div className="flex gap-2 mt-1 text-xs text-muted-foreground flex-wrap">
                    <span>{formatFileSize(doc.file_size)}</span>
                    <span>•</span>
                    <span>
                      {doc.moved_at 
                        ? `Moved ${formatDistanceToNow(new Date(doc.moved_at), { addSuffix: true })}`
                        : `Added ${formatDistanceToNow(new Date(doc.created_at), { addSuffix: true })}`
                      }
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 ml-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleView(doc)}
                  title="View document"
                >
                  <Eye className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDownload(doc)}
                  title="Download document"
                >
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
