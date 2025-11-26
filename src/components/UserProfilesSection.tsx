import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, HardDrive, History, Eye, Edit } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { UserCredentialsView } from "@/components/UserCredentialsView";

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  branch_id: string | null;
  device_serial_number: string | null;
  vpn_username: string | null;
  vpn_password: string | null;
  rdp_username: string | null;
  rdp_password: string | null;
  created_at: string;
}

interface UserStorageInfo {
  user_id: string;
  total_storage_mb: number;
  document_count: number;
  last_upload: string | null;
}

interface UserActivity {
  id: string;
  user_id: string;
  activity_type: string;
  activity_details: any;
  created_at: string;
}

export const UserProfilesSection = () => {
  const [userProfiles, setUserProfiles] = useState<UserProfile[]>([]);
  const [userStorage, setUserStorage] = useState<Map<string, UserStorageInfo>>(new Map());
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [userActivities, setUserActivities] = useState<UserActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [detailsOpen, setDetailsOpen] = useState(false);

  useEffect(() => {
    fetchUserProfiles();
  }, []);

  const fetchUserProfiles = async () => {
    try {
      setIsLoading(true);
      console.log('[UserProfiles] Starting fetch...');
      
      // Fetch all user profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .order("full_name");

      console.log('[UserProfiles] Profiles fetch result:', { 
        count: profiles?.length, 
        error: profilesError?.message 
      });

      if (profilesError) throw profilesError;

      setUserProfiles(profiles as any || []);
      console.log('[UserProfiles] Set profiles state:', profiles?.length);

      // Fetch all documents in a single query (optimized for performance)
      if (profiles && profiles.length > 0) {
        const { data: allDocs, error: docsError } = await supabase
          .from("documents")
          .select("uploaded_by, file_size, created_at")
          .order("created_at", { ascending: false });

        if (!docsError && allDocs) {
          // Group documents by user and calculate aggregates
          const storageMap = new Map<string, UserStorageInfo>();
          
          // Initialize storage info for all profiles
          profiles.forEach(profile => {
            storageMap.set(profile.user_id, {
              user_id: profile.user_id,
              total_storage_mb: 0,
              document_count: 0,
              last_upload: null,
            });
          });
          
          // Aggregate document data for each user
          allDocs.forEach(doc => {
            if (doc.uploaded_by) {
              const existing = storageMap.get(doc.uploaded_by);
              if (existing) {
                existing.total_storage_mb += (doc.file_size || 0) / (1024 * 1024); // Convert to MB
                existing.document_count += 1;
                // Keep the most recent upload date (docs are ordered by created_at desc)
                if (!existing.last_upload && doc.created_at) {
                  existing.last_upload = doc.created_at;
                }
              }
            }
          });
          
          setUserStorage(storageMap);
        }
      }
    } catch (error) {
      console.error("[UserProfiles] Error fetching user profiles:", error);
      toast.error("Failed to fetch user profiles");
    } finally {
      console.log('[UserProfiles] Setting loading to false');
      setIsLoading(false);
    }
  };

  const fetchUserActivities = async (userId: string) => {
    try {
      // @ts-ignore - Table exists but types haven't regenerated yet
      const { data, error } = await (supabase as any)
        .from("user_activity_log")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      setUserActivities(data || []);
    } catch (error) {
      console.error("Error fetching user activities:", error);
      toast.error("Failed to fetch user activity log");
    }
  };

  const handleViewDetails = async (user: UserProfile) => {
    setSelectedUser(user);
    await fetchUserActivities(user.user_id);
    setDetailsOpen(true);
  };

  const formatFileSize = (mb: number) => {
    if (mb < 1) return (mb * 1024).toFixed(1) + ' KB';
    else if (mb < 1024) return mb.toFixed(1) + ' MB';
    else return (mb / 1024).toFixed(1) + ' GB';
  };

  const getActivityIcon = (activityType: string) => {
    switch (activityType) {
      case 'document_upload':
        return '📤';
      case 'document_download':
        return '📥';
      case 'ticket_create':
        return '🎫';
      case 'ticket_update':
        return '✏️';
      default:
        return '📋';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              User Profiles & Storage
            </CardTitle>
            <CardDescription>
              Track individual user storage capacity and upload history
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Loading user profiles...</p>
          </div>
        ) : userProfiles.length === 0 ? (
          <div className="text-center py-8">
            <Users className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-2 text-sm font-semibold">No users found</h3>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Documents</TableHead>
                  <TableHead>Storage Used</TableHead>
                  <TableHead>Last Upload</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {userProfiles.map((user) => {
                  const storage = userStorage.get(user.user_id);
                  return (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        {user.full_name || 'Unknown'}
                      </TableCell>
                      <TableCell>{user.email || 'N/A'}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {storage?.document_count || 0}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <HardDrive className="h-4 w-4 text-muted-foreground" />
                          {formatFileSize(storage?.total_storage_mb || 0)}
                        </div>
                      </TableCell>
                      <TableCell>
                        {storage?.last_upload 
                          ? formatDistanceToNow(new Date(storage.last_upload), { addSuffix: true })
                          : 'Never'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewDetails(user)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {/* User Details Dialog */}
        <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>User Profile Details</DialogTitle>
              <DialogDescription>
                {selectedUser?.full_name || 'User'} - {selectedUser?.email}
              </DialogDescription>
            </DialogHeader>

            <Tabs defaultValue="info">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="info">Profile Info</TabsTrigger>
                <TabsTrigger value="credentials">Credentials</TabsTrigger>
                <TabsTrigger value="storage">Storage</TabsTrigger>
                <TabsTrigger value="history">Activity History</TabsTrigger>
              </TabsList>

              <TabsContent value="info" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Profile Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <label className="text-sm font-medium">Full Name</label>
                      <p className="text-sm text-muted-foreground">{selectedUser?.full_name || 'Not set'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Email</label>
                      <p className="text-sm text-muted-foreground">{selectedUser?.email || 'Not set'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Device Serial Number</label>
                      <p className="text-sm text-muted-foreground">{selectedUser?.device_serial_number || 'Not assigned'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Member Since</label>
                      <p className="text-sm text-muted-foreground">
                        {selectedUser?.created_at 
                          ? formatDistanceToNow(new Date(selectedUser.created_at), { addSuffix: true })
                          : 'Unknown'}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="credentials" className="space-y-4">
                {selectedUser && (
                  <UserCredentialsView
                    userId={selectedUser.user_id}
                    userEmail={selectedUser.email}
                    vpnUsername={selectedUser.vpn_username}
                    vpnPassword={selectedUser.vpn_password}
                    rdpUsername={selectedUser.rdp_username}
                    rdpPassword={selectedUser.rdp_password}
                    onUpdate={fetchUserProfiles}
                  />
                )}
              </TabsContent>

              <TabsContent value="storage" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Storage Usage</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {selectedUser && userStorage.get(selectedUser.user_id) ? (
                      <div className="space-y-3">
                        <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                          <span className="text-sm font-medium">Total Documents</span>
                          <Badge>{userStorage.get(selectedUser.user_id)?.document_count || 0}</Badge>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                          <span className="text-sm font-medium">Storage Used</span>
                          <span className="text-sm font-bold">
                            {formatFileSize(userStorage.get(selectedUser.user_id)?.total_storage_mb || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                          <span className="text-sm font-medium">Last Upload</span>
                          <span className="text-sm">
                            {userStorage.get(selectedUser.user_id)?.last_upload
                              ? formatDistanceToNow(new Date(userStorage.get(selectedUser.user_id)!.last_upload!), { addSuffix: true })
                              : 'Never'}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No storage data available</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="history" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <History className="h-5 w-5" />
                      Activity History
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {userActivities.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No activity recorded yet
                      </p>
                    ) : (
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {userActivities.map((activity) => (
                          <div
                            key={activity.id}
                            className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                          >
                            <span className="text-2xl">{getActivityIcon(activity.activity_type)}</span>
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <p className="text-sm font-medium capitalize">
                                  {activity.activity_type.replace(/_/g, ' ')}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                                </p>
                              </div>
                              {activity.activity_details && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  {JSON.stringify(activity.activity_details)}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};
