import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { FileDown, Image as ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Document {
  id: string;
  original_filename: string;
  file_type: string;
  category: string;
  storage_path: string;
  storage_bucket: string;
}

interface DocumentImporterProps {
  targetPage: string;
  onImport?: (document: Document) => void;
  filterType?: 'image' | 'document' | 'all';
  buttonText?: string;
  buttonVariant?: "default" | "outline" | "secondary" | "ghost";
}

export const DocumentImporter = ({ 
  targetPage, 
  onImport,
  filterType = 'all',
  buttonText = "Import from Document Hub",
  buttonVariant = "outline"
}: DocumentImporterProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchDocuments();
    }
  }, [isOpen, filterType]);

  const fetchDocuments = async () => {
    try {
      setIsLoading(true);
      let query = supabase
        .from("documents")
        .select("id, original_filename, file_type, category, storage_path, storage_bucket")
        .order("created_at", { ascending: false });

      // Apply filters based on type
      if (filterType === 'image') {
        query = query.eq("category", "image");
      } else if (filterType === 'document') {
        query = query.in("category", ["pdf", "word", "excel", "powerpoint"]);
      }

      const { data, error } = await query;

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error("Error fetching documents:", error);
      toast.error("Failed to load documents");
    } finally {
      setIsLoading(false);
    }
  };

  const handleImport = async () => {
    if (!selectedDocument) {
      toast.error("Please select a document to import");
      return;
    }

    try {
      const document = documents.find(d => d.id === selectedDocument);
      if (!document) return;

      // Update the document metadata (removed page_location - not in schema)
      const { error } = await supabase
        .from("documents")
        .update({
          category: targetPage,
          updated_at: new Date().toISOString(),
        } as any)
        .eq("id", selectedDocument);

      if (error) throw error;

      toast.success("Document imported successfully", {
        description: `"${document.original_filename}" has been imported to ${targetPage}`
      });

      if (onImport) {
        onImport(document);
      }

      setIsOpen(false);
      setSelectedDocument("");
    } catch (error) {
      console.error("Error importing document:", error);
      toast.error("Failed to import document");
    }
  };

  const getFileIcon = (category: string) => {
    if (category === 'image') {
      return <ImageIcon className="h-4 w-4 text-blue-500" />;
    }
    return <FileDown className="h-4 w-4 text-gray-500" />;
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant={buttonVariant}>
          <FileDown className="mr-2 h-4 w-4" />
          {buttonText}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import from Document Hub</DialogTitle>
          <DialogDescription>
            Select a document from the Document Hub to import to {targetPage}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="document-select">Available Documents</Label>
            {isLoading ? (
              <p className="text-sm text-muted-foreground py-4">Loading documents...</p>
            ) : documents.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">
                No documents available in the Document Hub
              </p>
            ) : (
              <ScrollArea className="h-[400px] rounded-md border p-4 mt-2">
                <div className="space-y-2">
                  {documents.map((doc) => (
                    <div
                      key={doc.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedDocument === doc.id
                          ? "bg-primary/10 border-primary"
                          : "hover:bg-muted"
                      }`}
                      onClick={() => setSelectedDocument(doc.id)}
                    >
                      <div className="flex items-center gap-3">
                        {getFileIcon(doc.category)}
                        <div className="flex-1">
                          <p className="font-medium text-sm">{doc.original_filename}</p>
                          <div className="flex gap-2 mt-1">
                            <Badge variant="secondary" className="text-xs">
                              {doc.category}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {doc.file_type}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleImport} disabled={!selectedDocument}>
            Import Selected Document
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
