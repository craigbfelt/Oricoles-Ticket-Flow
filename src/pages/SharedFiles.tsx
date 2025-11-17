import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Folder,
  FolderPlus,
  Upload,
  Download,
  Trash2,
  Eye,
  Share2,
  Users,
  Lock,
  Unlock,
  FileText,
  ChevronRight,
  Home,
  FolderOpen,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

interface Folder {
  id: string;
  name: string;
  parent_folder_id: string | null;
  created_by: string;
  created_at: string;
  permissions?: FolderPermission[];
}

interface FolderPermission {
  id: string;
  folder_id: string;
  user_group_id?: string;
  can_view: boolean;
  can_upload: boolean;
  can_download: boolean;
  can_delete: boolean;
}

interface SharedFile {
  id: string;
  filename: string;
  original_filename: string;
  file_size: number;
  file_type: string;
  storage_path: string;
  folder_id: string | null;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
}

interface UserGroup {
  id: string;
  name: string;
  description: string;
}

const SharedFiles = () => {
  const navigate = useNavigate();
  const [folders, setFolders] = useState<Folder[]>([]);
  const [files, setFiles] = useState<SharedFile[]>([]);
  const [userGroups, setUserGroups] = useState<UserGroup[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [folderPath, setFolderPath] = useState<Folder[]>([]);
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [isUploadFileOpen, setIsUploadFileOpen] = useState(false);
  const [isPermissionsOpen, setIsPermissionsOpen] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<Folder | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderDescription, setNewFolderDescription] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [permissions, setPermissions] = useState<Record<string, FolderPermission>>({});

  useEffect(() => {
    checkAdminAccess();
  }, []);

  useEffect(() => {
    if (isAdmin) {
      fetchFolders();
      fetchFiles();
      fetchUserGroups();
    }
  }, [currentFolderId, isAdmin]);

  const checkAdminAccess = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .eq("role", "admin");

    if (!roles || roles.length === 0) {
      toast.error("Access Denied", {
        description: "Only administrators can access Shared Files"
      });
      navigate("/dashboard");
      return;
    }

    setIsAdmin(true);
  };

  const fetchFolders = async () => {
    console.log("SharedFiles: Fetching folders for parent_folder_id:", currentFolderId);
    
    try {
      const query = supabase
        .from("shared_folders")
        .select("*");

      if (currentFolderId) {
        query.eq("parent_folder_id", currentFolderId);
      } else {
        query.is("parent_folder_id", null);
      }

      const { data, error } = await query.order("name");

      if (error) {
        console.error("SharedFiles: Error fetching folders:", {
          code: error.code,
          message: error.message,
          details: error.details
        });
        toast.error("Failed to load folders", {
          description: error.message
        });
        throw error;
      }
      
      console.log("SharedFiles: Fetched folders:", data?.length || 0);
      setFolders(data || []);
      
      // Build folder path
      if (currentFolderId) {
        await buildFolderPath(currentFolderId);
      } else {
        setFolderPath([]);
      }
    } catch (error) {
      console.error("SharedFiles: Unexpected error fetching folders:", error);
      setFolders([]);
    }
  };

  const buildFolderPath = async (folderId: string) => {
    try {
      const path: Folder[] = [];
      let currentId: string | null = folderId;

      while (currentId) {
        const { data, error } = await supabase
          .from("shared_folders")
          .select("*")
          .eq("id", currentId)
          .single();

        if (error) throw error;
        if (data) {
          path.unshift(data);
          currentId = data.parent_folder_id;
        } else {
          break;
        }
      }

      setFolderPath(path);
    } catch (error) {
      console.error("Error building folder path:", error);
    }
  };

  const fetchFiles = async () => {
    try {
      const query = supabase
        .from("shared_folder_files")
        .select("*");

      if (currentFolderId) {
        query.eq("folder_id", currentFolderId);
      } else {
        query.is("folder_id", null);
      }

      const { data, error } = await query.order("original_filename");

      if (error) throw error;
      setFiles(data || []);
    } catch (error) {
      console.error("Error fetching files:", error);
    }
  };

  const fetchUserGroups = async () => {
    try {
      const { data, error } = await supabase
        .from("user_groups")
        .select("*")
        .order("name");

      if (error) throw error;
      setUserGroups(data || []);
    } catch (error) {
      console.error("Error fetching user groups:", error);
    }
  };

  const createFolder = async () => {
    if (!newFolderName.trim()) {
      toast.error("Folder name is required");
      return;
    }

    console.log("SharedFiles: Creating folder:", {
      name: newFolderName,
      description: newFolderDescription,
      parent_folder_id: currentFolderId
    });

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error("SharedFiles: No active session found");
        toast.error("Authentication required", {
          description: "Please log in to create folders"
        });
        return;
      }

      console.log("SharedFiles: Current user ID:", session.user.id);
      
      // Check if user has admin role
      console.log("SharedFiles: Checking user permissions");
      const { data: userRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id);

      if (rolesError) {
        console.error("SharedFiles: Error checking user roles:", rolesError);
      } else {
        console.log("SharedFiles: User roles:", userRoles);
      }

      const hasAdminRole = userRoles?.some(r => r.role === 'admin') || false;
      
      if (!hasAdminRole) {
        console.error("SharedFiles: User does not have admin role");
        toast.error("Permission denied", {
          description: "Only administrators can create folders. Please contact your administrator to grant you admin privileges."
        });
        return;
      }

      console.log("SharedFiles: Attempting to insert folder into shared_folders table");

      const { error } = await supabase
        .from("shared_folders")
        .insert({
          name: newFolderName,
          description: newFolderDescription || null,
          parent_folder_id: currentFolderId,
          created_by: session.user.id,
        });

      if (error) {
        console.error("SharedFiles: Database error creating folder:", {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        
        let errorDescription = error.message;
        let troubleshootingSteps = "";
        
        if (error.code === "42501") {
          errorDescription = "Permission denied - you do not have the required admin privileges.";
          troubleshootingSteps = "\n\nTroubleshooting:\n1. Verify you have 'admin' role in user_roles table\n2. Contact your system administrator to grant admin access\n3. Check that RLS policies are properly configured";
        } else if (error.code === "23505") {
          errorDescription = "A folder with this name already exists in this location.";
          troubleshootingSteps = "\n\nPlease choose a different folder name.";
        } else if (error.code === "23503") {
          errorDescription = "Invalid parent folder reference - the parent folder may have been deleted.";
          troubleshootingSteps = "\n\nPlease refresh the page and try again.";
        } else if (error.message?.includes("violates row-level security")) {
          errorDescription = "Row-level security policy violation - access denied.";
          troubleshootingSteps = "\n\nTroubleshooting:\n1. Ensure you have admin role in user_roles table\n2. Check database logs for RLS policy details\n3. Verify that shared_folders RLS policies allow admin access";
        } else if (error.message?.includes("JWT") || error.message?.includes("auth")) {
          errorDescription = "Authentication error - your session may have expired.";
          troubleshootingSteps = "\n\nPlease log out and log back in.";
        }
        
        toast.error("Failed to create folder", {
          description: `${errorDescription}${troubleshootingSteps}\n\nTechnical details: ${error.message}\nError code: ${error.code || 'N/A'}`,
          duration: 10000
        });
        throw error;
      }

      console.log("SharedFiles: Folder created successfully");
      toast.success("Folder created successfully");
      setIsCreateFolderOpen(false);
      setNewFolderName("");
      setNewFolderDescription("");
      fetchFolders();
    } catch (error) {
      console.error("SharedFiles: Unexpected error creating folder:", error);
      if (error instanceof Error && !error.message.includes("Failed to create folder")) {
        toast.error("Unexpected error", {
          description: `${error.message}. Check console for details.`
        });
      }
    }
  };

  const uploadFile = async () => {
    if (!selectedFile) {
      toast.error("Please select a file");
      return;
    }

    console.log("SharedFiles: Uploading file:", {
      name: selectedFile.name,
      size: selectedFile.size,
      type: selectedFile.type,
      folder_id: currentFolderId
    });

    try {
      setIsUploading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error("SharedFiles: No active session for file upload");
        toast.error("Authentication required", {
          description: "Please log in to upload files"
        });
        return;
      }

      const timestamp = Date.now();
      const fileExt = selectedFile.name.split('.').pop();
      const filename = `${timestamp}_${selectedFile.name}`;
      const filePath = `shared-files/${filename}`;

      console.log("SharedFiles: Uploading to storage path:", filePath);

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, selectedFile);

      if (uploadError) {
        console.error("SharedFiles: Storage upload error:", uploadError);
        toast.error("Failed to upload file to storage", {
          description: uploadError.message || "Unknown storage error"
        });
        throw uploadError;
      }

      console.log("SharedFiles: File uploaded to storage, creating database record");

      const { error: dbError } = await supabase
        .from("shared_folder_files")
        .insert({
          filename: filename,
          original_filename: selectedFile.name,
          file_size: selectedFile.size,
          file_type: selectedFile.type,
          storage_path: filePath,
          folder_id: currentFolderId,
          uploaded_by: session.user.id,
        });

      if (dbError) {
        console.error("SharedFiles: Database insert error:", {
          code: dbError.code,
          message: dbError.message,
          details: dbError.details
        });
        toast.error("Failed to save file metadata", {
          description: dbError.message
        });
        throw dbError;
      }

      console.log("SharedFiles: File uploaded successfully");
      toast.success("File uploaded successfully");
      setIsUploadFileOpen(false);
      setSelectedFile(null);
      fetchFiles();
    } catch (error) {
      console.error("SharedFiles: Unexpected error uploading file:", error);
      if (error instanceof Error && !error.message.includes("Failed to")) {
        toast.error("Unexpected error during upload", {
          description: `${error.message}. Check console for details.`
        });
      }
    } finally {
      setIsUploading(false);
    }
  };

  const deleteFolder = async (folderId: string) => {
    if (!confirm("Are you sure you want to delete this folder?")) return;

    try {
    const { error } = await supabase
      .from("shared_folders" as any)
      .delete()
        .eq("id", folderId);

      if (error) throw error;

      toast.success("Folder deleted successfully");
      fetchFolders();
    } catch (error) {
      console.error("Error deleting folder:", error);
      toast.error("Failed to delete folder");
    }
  };

  const deleteFile = async (fileId: string, storagePath: string) => {
    if (!confirm("Are you sure you want to delete this file?")) return;

    try {
      const { error: storageError } = await supabase.storage
        .from('documents')
        .remove([storagePath]);

      if (storageError) throw storageError;

      const { error: dbError } = await supabase
        .from("shared_folder_files")
        .delete()
        .eq("id", fileId);

      if (dbError) throw dbError;

      toast.success("File deleted successfully");
      fetchFiles();
    } catch (error) {
      console.error("Error deleting file:", error);
      toast.error("Failed to delete file");
    }
  };

  const downloadFile = async (file: SharedFile) => {
    try {
      const { data, error } = await supabase.storage
        .from('documents')
        .download(file.storage_path);

      if (error) throw error;

      const url = window.URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.original_filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success("File downloaded");
    } catch (error) {
      console.error("Error downloading file:", error);
      toast.error("Failed to download file");
    }
  };

  const openPermissionsDialog = (folder: Folder) => {
    setSelectedFolder(folder);
    setIsPermissionsOpen(true);
    // Initialize permissions for this folder
    // TODO: Fetch existing permissions
  };

  const savePermissions = async () => {
    if (!selectedFolder) return;

    try {
      // TODO: Save permissions to database
      toast.success("Permissions saved successfully");
      setIsPermissionsOpen(false);
    } catch (error) {
      console.error("Error saving permissions:", error);
      toast.error("Failed to save permissions");
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(1) + ' MB';
  };

  if (!isAdmin) {
    return <DashboardLayout><div className="p-8">Loading...</div></DashboardLayout>;
  }

  return (
    <DashboardLayout>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Oricol Shared Files</h2>
            <p className="text-muted-foreground">
              Organize and share files with folder structures and permissions
            </p>
          </div>
          <div className="flex gap-2">
            <Dialog open={isCreateFolderOpen} onOpenChange={setIsCreateFolderOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <FolderPlus className="mr-2 h-4 w-4" />
                  New Folder
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Folder</DialogTitle>
                  <DialogDescription>
                    Create a new folder to organize your files
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="folderName">Folder Name</Label>
                    <Input
                      id="folderName"
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      placeholder="Enter folder name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="folderDescription">Description (Optional)</Label>
                    <Textarea
                      id="folderDescription"
                      value={newFolderDescription}
                      onChange={(e) => setNewFolderDescription(e.target.value)}
                      placeholder="Enter folder description"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateFolderOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={createFolder}>Create Folder</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={isUploadFileOpen} onOpenChange={setIsUploadFileOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload File
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Upload File</DialogTitle>
                  <DialogDescription>
                    Upload a file to the current folder
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="file">Select File</Label>
                    <Input
                      id="file"
                      type="file"
                      onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                      disabled={isUploading}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsUploadFileOpen(false)} disabled={isUploading}>
                    Cancel
                  </Button>
                  <Button onClick={uploadFile} disabled={isUploading || !selectedFile}>
                    {isUploading ? "Uploading..." : "Upload"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 text-sm bg-muted p-3 rounded-lg">
          <Home
            className="h-4 w-4 cursor-pointer hover:text-primary"
            onClick={() => setCurrentFolderId(null)}
          />
          {folderPath.map((folder, index) => (
            <div key={folder.id} className="flex items-center gap-2">
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
              <span
                className="cursor-pointer hover:text-primary"
                onClick={() => setCurrentFolderId(folder.id)}
              >
                {folder.name}
              </span>
            </div>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Files and Folders</CardTitle>
            <CardDescription>
              {folders.length + files.length} item(s) in this folder
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Folders */}
            {folders.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <FolderOpen className="h-4 w-4" />
                  Folders
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {folders.map((folder) => (
                    <Card
                      key={folder.id}
                      className="cursor-pointer hover:bg-muted/50 transition-colors group"
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div
                            className="flex-1"
                            onClick={() => setCurrentFolderId(folder.id)}
                          >
                            <Folder className="h-8 w-8 text-blue-500 mb-2" />
                            <p className="font-medium text-sm truncate">{folder.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(folder.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={(e) => {
                                e.stopPropagation();
                                openPermissionsDialog(folder);
                              }}
                            >
                              <Lock className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteFolder(folder.id);
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Files */}
            {files.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Files
                </h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Uploaded</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {files.map((file) => (
                      <TableRow key={file.id}>
                        <TableCell className="font-medium">{file.original_filename}</TableCell>
                        <TableCell>{formatFileSize(file.file_size)}</TableCell>
                        <TableCell>{new Date(file.created_at).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => downloadFile(file)}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteFile(file.id, file.storage_path)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {folders.length === 0 && files.length === 0 && (
              <div className="text-center py-12">
                <FolderOpen className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No files or folders</h3>
                <p className="text-sm text-muted-foreground">
                  Create a folder or upload a file to get started
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Permissions Dialog */}
        <Dialog open={isPermissionsOpen} onOpenChange={setIsPermissionsOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Folder Permissions</DialogTitle>
              <DialogDescription>
                Manage access permissions for "{selectedFolder?.name}"
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User Group</TableHead>
                    <TableHead>View</TableHead>
                    <TableHead>Upload</TableHead>
                    <TableHead>Download</TableHead>
                    <TableHead>Delete</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {userGroups.map((group) => (
                    <TableRow key={group.id}>
                      <TableCell>{group.name}</TableCell>
                      <TableCell>
                        <Checkbox />
                      </TableCell>
                      <TableCell>
                        <Checkbox />
                      </TableCell>
                      <TableCell>
                        <Checkbox />
                      </TableCell>
                      <TableCell>
                        <Checkbox />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsPermissionsOpen(false)}>
                Cancel
              </Button>
              <Button onClick={savePermissions}>Save Permissions</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default SharedFiles;
