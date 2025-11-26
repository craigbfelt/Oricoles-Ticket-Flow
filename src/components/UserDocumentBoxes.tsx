import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Folder, FileText, User, Loader2, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface UserDocumentBox {
  id: string;
  user_id: string;
  box_number: number;
  display_name: string | null;
  document_count: number;
  total_storage_bytes: number;
  last_upload_at: string | null;
  created_at: string;
  updated_at: string;
}

interface UserDocument {
  id: string;
  original_filename: string;
  file_type: string;
  file_size: number;
  created_at: string;
}

interface UserDocumentBoxesProps {
  onBoxClick?: (userId: string, boxNumber: number) => void;
}

export const UserDocumentBoxes = ({ onBoxClick }: UserDocumentBoxesProps) => {
  const [boxes, setBoxes] = useState<UserDocumentBox[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedBox, setSelectedBox] = useState<UserDocumentBox | null>(null);
  const [boxDocuments, setBoxDocuments] = useState<UserDocument[]>([]);
  const [loadingDocuments, setLoadingDocuments] = useState(false);

  useEffect(() => {
    fetchBoxes();
  }, []);

  const fetchBoxes = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await (supabase as any)
        .from("user_document_boxes")
        .select("*")
        .order("box_number", { ascending: true });

      if (error) throw error;
      setBoxes(data || []);
    } catch (error) {
      console.error("Error fetching user document boxes:", error);
      // Don't show error toast - table might not exist yet
    } finally {
      setIsLoading(false);
    }
  };

  const fetchBoxDocuments = async (userId: string) => {
    try {
      setLoadingDocuments(true);
      const { data, error } = await (supabase as any)
        .from("documents")
        .select("id, original_filename, file_type, file_size, created_at")
        .eq("uploaded_by", userId)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      setBoxDocuments(data || []);
    } catch (error) {
      console.error("Error fetching box documents:", error);
      toast.error("Failed to load documents");
    } finally {
      setLoadingDocuments(false);
    }
  };

  const handleBoxClick = (box: UserDocumentBox) => {
    setSelectedBox(box);
    fetchBoxDocuments(box.user_id);
    if (onBoxClick) {
      onBoxClick(box.user_id, box.box_number);
    }
  };

  const formatStorageSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + ' MB';
    else return (bytes / 1073741824).toFixed(1) + ' GB';
  };

  const getBoxColor = (index: number) => {
    const colors = [
      'bg-blue-500',
      'bg-green-500',
      'bg-purple-500',
      'bg-orange-500',
      'bg-pink-500',
      'bg-teal-500',
      'bg-indigo-500',
      'bg-red-500',
    ];
    return colors[index % colors.length];
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
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Folder className="h-5 w-5" />
              User Document Boxes
            </CardTitle>
            <CardDescription>
              {boxes.length} user{boxes.length !== 1 ? 's' : ''} with document folders
            </CardDescription>
          </div>
          {selectedBox && (
            <Button variant="ghost" size="sm" onClick={() => setSelectedBox(null)}>
              View All Boxes
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {selectedBox ? (
          // Show selected box's documents
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
              <div className={`w-12 h-12 rounded-lg ${getBoxColor(selectedBox.box_number - 1)} flex items-center justify-center text-white font-bold text-lg`}>
                {selectedBox.box_number}
              </div>
              <div>
                <h3 className="font-semibold">{selectedBox.display_name || `User #${selectedBox.box_number}`}</h3>
                <p className="text-sm text-muted-foreground">
                  {selectedBox.document_count} document{selectedBox.document_count !== 1 ? 's' : ''} • {formatStorageSize(selectedBox.total_storage_bytes)}
                </p>
              </div>
            </div>
            
            {loadingDocuments ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : boxDocuments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-8 w-8 mx-auto mb-2" />
                <p>No documents in this box</p>
              </div>
            ) : (
              <div className="space-y-2">
                {boxDocuments.map((doc) => (
                  <div key={doc.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-muted transition-colors">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{doc.original_filename}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(doc.created_at), { addSuffix: true })}
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {formatStorageSize(doc.file_size)}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : boxes.length === 0 ? (
          // No boxes yet
          <div className="text-center py-8 text-muted-foreground">
            <User className="h-12 w-12 mx-auto mb-3" />
            <h3 className="font-medium mb-1">No user boxes yet</h3>
            <p className="text-sm">
              User boxes are created automatically when users upload documents
            </p>
          </div>
        ) : (
          // Show grid of user boxes
          <ScrollArea className="w-full">
            <div className="flex gap-4 pb-4">
              {boxes.map((box, index) => (
                <button
                  key={box.id}
                  onClick={() => handleBoxClick(box)}
                  className="flex-shrink-0 w-40 group hover:scale-105 transition-transform cursor-pointer"
                >
                  <div className="relative">
                    {/* Box icon with number */}
                    <div className={`w-full aspect-square rounded-xl ${getBoxColor(index)} flex flex-col items-center justify-center text-white shadow-lg group-hover:shadow-xl transition-shadow`}>
                      <span className="text-3xl font-bold">{box.box_number}</span>
                      <Folder className="h-8 w-8 mt-1 opacity-80" />
                    </div>
                    
                    {/* Document count badge */}
                    {box.document_count > 0 && (
                      <div className="absolute -top-2 -right-2 bg-white text-foreground rounded-full w-7 h-7 flex items-center justify-center text-sm font-semibold shadow-md border">
                        {box.document_count > 99 ? '99+' : box.document_count}
                      </div>
                    )}
                  </div>
                  
                  {/* Box info */}
                  <div className="mt-2 text-center">
                    <p className="font-medium text-sm truncate">
                      {box.display_name || `User #${box.box_number}`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatStorageSize(box.total_storage_bytes)}
                    </p>
                    {box.last_upload_at && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(box.last_upload_at), { addSuffix: true })}
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};
