import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  FileText, 
  File,
  FileImage,
  FileSpreadsheet,
  FileCode,
  Loader2,
  Download,
  Eye,
  Clock
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface RecentDocument {
  id: string;
  original_filename: string;
  file_type: string;
  file_size: number;
  storage_path: string;
  storage_bucket: string;
  category: string;
  description: string | null;
  uploaded_by: string | null;
  created_at: string;
  uploader_name?: string;
}

interface RecentDocumentsProps {
  limit?: number;
  onViewDocument?: (doc: RecentDocument) => void;
}

export const RecentDocuments = ({ limit = 10, onViewDocument }: RecentDocumentsProps) => {
  const [documents, setDocuments] = useState<RecentDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchRecentDocuments();
  }, [limit]);

  const fetchRecentDocuments = async () => {
    try {
      setIsLoading(true);
      
      // Fetch recent documents
      const { data: docs, error } = await (supabase as any)
        .from("documents")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;
      
      // Fetch uploader names
      if (docs && docs.length > 0) {
        const uploaderIds = [...new Set(docs.map((d: RecentDocument) => d.uploaded_by).filter(Boolean))];
        
        if (uploaderIds.length > 0) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, full_name")
            .in("id", uploaderIds);
          
          const profileMap = new Map(profiles?.map(p => [p.id, p.full_name]) || []);
          
          const docsWithNames = docs.map((doc: RecentDocument) => ({
            ...doc,
            uploader_name: doc.uploaded_by ? profileMap.get(doc.uploaded_by) || 'Unknown' : 'System'
          }));
          
          setDocuments(docsWithNames);
        } else {
          setDocuments(docs);
        }
      } else {
        setDocuments([]);
      }
    } catch (error) {
      console.error("Error fetching recent documents:", error);
      toast.error("Failed to load recent documents");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async (doc: RecentDocument) => {
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

  const handleView = async (doc: RecentDocument) => {
    try {
      if (onViewDocument) {
        onViewDocument(doc);
        return;
      }
      
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
    } else if (category === 'excel' || fileType.includes('spreadsheet')) {
      return <FileSpreadsheet className="h-5 w-5 text-green-500" />;
    } else if (category === 'pdf' || fileType === 'application/pdf') {
      return <File className="h-5 w-5 text-red-500" />;
    } else if (category === 'word' || fileType.includes('word')) {
      return <FileText className="h-5 w-5 text-blue-600" />;
    } else {
      return <FileCode className="h-5 w-5 text-gray-500" />;
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
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Recently Uploaded
        </CardTitle>
        <CardDescription>
          {documents.length} document{documents.length !== 1 ? 's' : ''} uploaded recently
        </CardDescription>
      </CardHeader>
      <CardContent>
        {documents.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-3" />
            <h3 className="font-medium mb-1">No documents yet</h3>
            <p className="text-sm">Upload your first document to get started</p>
          </div>
        ) : (
          <div className="space-y-3">
            {documents.map((doc) => (
              <div 
                key={doc.id} 
                className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
              >
                {getFileIcon(doc.file_type, doc.category)}
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm truncate">{doc.original_filename}</p>
                    <Badge variant="secondary" className="text-xs">
                      {doc.category}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                    <span>{formatFileSize(doc.file_size)}</span>
                    <span>•</span>
                    <span>by {doc.uploader_name}</span>
                    <span>•</span>
                    <span>{formatDistanceToNow(new Date(doc.created_at), { addSuffix: true })}</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleView(doc)}
                    title="View"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDownload(doc)}
                    title="Download"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
