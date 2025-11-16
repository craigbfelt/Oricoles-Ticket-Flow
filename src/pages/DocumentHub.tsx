import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  Upload, 
  Download, 
  Trash2, 
  Eye, 
  FolderOpen,
  Search,
  Filter,
  File,
  FileImage,
  FileSpreadsheet,
  FileCode,
  Loader2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { StorageDiagnostics, logUploadError } from "@/components/StorageDiagnostics";
import { StorageUsageChart } from "@/components/StorageUsageChart";

interface Document {
  id: string;
  filename: string;
  original_filename: string;
  file_type: string;
  file_size: number;
  storage_path: string;
  storage_bucket: string;
  category: string;
  description: string | null;
  tags: string[] | null;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
}

const DocumentHub = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  
  // Upload form state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadDescription, setUploadDescription] = useState("");
  const [uploadCategory, setUploadCategory] = useState("general");

  useEffect(() => {
    fetchDocuments();
  }, []);

  const setupStoragePolicies = async () => {
    try {
      console.log('Checking storage policies...');
      const { data, error } = await supabase.functions.invoke('setup-storage-policies');
      
      if (error) {
        console.warn('Could not check storage policies (non-critical):', error);
        // This is not a critical error - the app can still work
      } else {
        console.log('Storage verification result:', data);
        // Log any warnings but don't block the UI
        if (data?.warning) {
          console.warn('Storage warning:', data.message);
        }
      }
    } catch (error) {
      console.warn('Storage verification failed (non-critical):', error);
      // Silently continue - this is just a verification check
    }
  };

  const fetchDocuments = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await (supabase as any)
        .from("documents")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setDocuments(data as Document[] || []);
    } catch (error) {
      console.error("Error fetching documents:", error);
      toast.error("Failed to fetch documents");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpload = async () => {
    if (!uploadFile) {
      toast.error("Please select a file to upload");
      return;
    }

    try {
      setIsUploading(true);
      
      // Get current user
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("You must be logged in to upload documents");
        return;
      }

      // Generate unique filename
      const timestamp = Date.now();
      const fileExt = uploadFile.name.split('.').pop();
      const filename = `${timestamp}_${uploadFile.name}`;
      const filePath = `documents/${filename}`;

      // Upload file to storage
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, uploadFile, {
          metadata: {
            owner: session.user.id
          }
        });

      if (uploadError) {
        logUploadError('documents', uploadError.message, JSON.stringify(uploadError, null, 2));
        throw uploadError;
      }

      // Determine category based on file type if not manually set
      let category = uploadCategory;
      if (category === "general") {
        if (uploadFile.type.startsWith('image/')) category = 'image';
        else if (uploadFile.type === 'application/pdf') category = 'pdf';
        else if (uploadFile.type.includes('word')) category = 'word';
        else if (uploadFile.type.includes('excel') || uploadFile.type.includes('spreadsheet')) category = 'excel';
        else if (uploadFile.type.includes('powerpoint') || uploadFile.type.includes('presentation')) category = 'powerpoint';
      }

      // Save metadata to database
      const { error: dbError } = await (supabase as any)
        .from("documents")
        .insert({
          filename: filename,
          original_filename: uploadFile.name,
          file_type: uploadFile.type,
          file_size: uploadFile.size,
          storage_path: filePath,
          storage_bucket: 'documents',
          category: category,
          description: uploadDescription || null,
          uploaded_by: session.user.id,
        });

      if (dbError) {
        logUploadError('documents', 'Database insert failed', JSON.stringify(dbError, null, 2));
        throw dbError;
      }

      toast.success("Document uploaded successfully");
      setUploadDialogOpen(false);
      setUploadFile(null);
      setUploadDescription("");
      setUploadCategory("general");
      fetchDocuments();
    } catch (error) {
      console.error("Error uploading document:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      logUploadError('documents', 'Upload failed', errorMessage);
      toast.error("Failed to upload document", {
        description: errorMessage
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownload = async (doc: Document) => {
    try {
      const { data, error } = await supabase.storage
        .from(doc.storage_bucket)
        .download(doc.storage_path);

      if (error) throw error;

      // Create download link
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

  const handleDelete = async (doc: Document) => {
    if (!confirm(`Are you sure you want to delete "${doc.original_filename}"?`)) {
      return;
    }

    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from(doc.storage_bucket as any)
        .remove([doc.storage_path]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError} = await (supabase as any)
        .from("documents")
        .delete()
        .eq("id", doc.id);

      if (dbError) throw dbError;

      toast.success("Document deleted");
      fetchDocuments();
    } catch (error) {
      console.error("Error deleting document:", error);
      toast.error("Failed to delete document");
    }
  };

  const handleView = async (doc: Document) => {
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

  const handleMove = async (destination: string) => {
    if (!selectedDocument) return;

    try {
      // This is a placeholder for the move functionality
      // In a real implementation, you would:
      // 1. Update the document's metadata to reflect new location
      // 2. Trigger any necessary operations in the destination system
      // 3. Optionally move the file to a different storage path
      
      toast.info(`Move to ${destination} functionality coming soon`, {
        description: `Document: ${selectedDocument.original_filename}`
      });
      
      setMoveDialogOpen(false);
      setSelectedDocument(null);
    } catch (error) {
      console.error("Error moving document:", error);
      toast.error("Failed to move document");
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

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.original_filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (doc.description && doc.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = categoryFilter === "all" || doc.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <DashboardLayout>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Document Hub</h2>
            <p className="text-muted-foreground">
              Centralized storage for all your uploaded documents
            </p>
          </div>
          <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Upload className="mr-2 h-4 w-4" />
                Upload Document
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Upload Document</DialogTitle>
                <DialogDescription>
                  Upload a new document to the Document Hub
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="file">File</Label>
                  <Input
                    id="file"
                    type="file"
                    onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                    disabled={isUploading}
                  />
                </div>
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select value={uploadCategory} onValueChange={setUploadCategory} disabled={isUploading}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="image">Image</SelectItem>
                      <SelectItem value="pdf">PDF</SelectItem>
                      <SelectItem value="word">Word Document</SelectItem>
                      <SelectItem value="excel">Excel Spreadsheet</SelectItem>
                      <SelectItem value="powerpoint">PowerPoint</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Textarea
                    id="description"
                    value={uploadDescription}
                    onChange={(e) => setUploadDescription(e.target.value)}
                    placeholder="Add a description for this document..."
                    disabled={isUploading}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setUploadDialogOpen(false)} disabled={isUploading}>
                  Cancel
                </Button>
                <Button onClick={handleUpload} disabled={isUploading || !uploadFile}>
                  {isUploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Upload
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Storage Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <StorageUsageChart />
          <StorageDiagnostics />
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
              <div>
                <CardTitle>All Documents</CardTitle>
                <CardDescription>
                  {filteredDocuments.length} document{filteredDocuments.length !== 1 ? 's' : ''} found
                </CardDescription>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                <div className="relative flex-1 md:w-64">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search documents..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8"
                  />
                </div>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <Filter className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Filter by category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="image">Images</SelectItem>
                    <SelectItem value="pdf">PDFs</SelectItem>
                    <SelectItem value="word">Word Documents</SelectItem>
                    <SelectItem value="excel">Excel Files</SelectItem>
                    <SelectItem value="powerpoint">PowerPoint</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredDocuments.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-2 text-sm font-semibold">No documents</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {searchQuery || categoryFilter !== "all" 
                    ? "No documents match your search criteria."
                    : "Get started by uploading a document."}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>File</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Uploaded</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDocuments.map((doc) => (
                      <TableRow key={doc.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {getFileIcon(doc.file_type, doc.category)}
                            <div>
                              <div className="font-medium">{doc.original_filename}</div>
                              {doc.description && (
                                <div className="text-sm text-muted-foreground truncate max-w-md">
                                  {doc.description}
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{doc.category}</Badge>
                        </TableCell>
                        <TableCell>{formatFileSize(doc.file_size)}</TableCell>
                        <TableCell>
                          {formatDistanceToNow(new Date(doc.created_at), { addSuffix: true })}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleView(doc)}
                              title="View document"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDownload(doc)}
                              title="Download document"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedDocument(doc);
                                setMoveDialogOpen(true);
                              }}
                              title="Move document"
                            >
                              <FolderOpen className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(doc)}
                              title="Delete document"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Move Document Dialog */}
        <Dialog open={moveDialogOpen} onOpenChange={setMoveDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Move Document</DialogTitle>
              <DialogDescription>
                Select where you want to move "{selectedDocument?.original_filename}"
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Button variant="outline" className="w-full justify-start" onClick={() => handleMove("Network Diagrams")}>
                <FolderOpen className="mr-2 h-4 w-4" />
                Network Diagrams
              </Button>
              <Button variant="outline" className="w-full justify-start" onClick={() => handleMove("Branch Files")}>
                <FolderOpen className="mr-2 h-4 w-4" />
                Branch Files
              </Button>
              <Button variant="outline" className="w-full justify-start" onClick={() => handleMove("Assets")}>
                <FolderOpen className="mr-2 h-4 w-4" />
                Assets
              </Button>
              <Button variant="outline" className="w-full justify-start" onClick={() => handleMove("Jobs")}>
                <FolderOpen className="mr-2 h-4 w-4" />
                Jobs
              </Button>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setMoveDialogOpen(false);
                setSelectedDocument(null);
              }}>
                Cancel
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default DocumentHub;
