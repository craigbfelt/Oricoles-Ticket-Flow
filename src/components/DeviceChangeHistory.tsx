import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { History, CheckCircle, ArrowRight, Plus, User, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface DeviceChange {
  id: string;
  device_serial_number: string;
  change_type: string;
  old_user_email: string | null;
  new_user_email: string | null;
  old_username: string | null;
  new_username: string | null;
  detected_at: string;
  reviewed: boolean;
  reviewed_at: string | null;
  notes: string | null;
}

export function DeviceChangeHistory() {
  const [changes, setChanges] = useState<DeviceChange[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unreviewed'>('all');

  useEffect(() => {
    fetchChanges();
  }, [filter]);

  const fetchChanges = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from("device_change_history")
        .select("*")
        .order("detected_at", { ascending: false })
        .limit(100);

      if (filter === 'unreviewed') {
        query = query.eq('reviewed', false);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching change history:", error);
        toast.error("Failed to load change history");
        return;
      }

      setChanges(data || []);
    } catch (error) {
      console.error("Error fetching change history:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const markAsReviewed = async (changeId: string) => {
    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        toast.error("Unable to get current user");
        return;
      }

      const { error } = await supabase
        .from("device_change_history")
        .update({
          reviewed: true,
          reviewed_at: new Date().toISOString(),
          reviewed_by: user.id
        })
        .eq('id', changeId);

      if (error) {
        console.error("Error updating review status:", error);
        toast.error("Failed to mark as reviewed");
        return;
      }

      toast.success("Marked as reviewed");
      fetchChanges();
    } catch (error) {
      console.error("Error marking as reviewed:", error);
      toast.error("An unexpected error occurred");
    }
  };

  const getChangeTypeInfo = (changeType: string) => {
    switch (changeType) {
      case 'new_device':
        return { label: 'New Device', icon: Plus, color: 'bg-green-500' };
      case 'reassignment':
        return { label: 'Reassignment', icon: ArrowRight, color: 'bg-orange-500' };
      case 'replacement':
        return { label: 'Replacement', icon: RefreshCw, color: 'bg-blue-500' };
      case 'username_change':
        return { label: 'Username Change', icon: User, color: 'bg-purple-500' };
      case 'email_change':
        return { label: 'Email Change', icon: User, color: 'bg-indigo-500' };
      default:
        return { label: changeType, icon: History, color: 'bg-gray-500' };
    }
  };

  const unreviewedCount = changes.filter(c => !c.reviewed).length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Device Change History
            </CardTitle>
            <CardDescription>
              Track device reassignments and changes detected from Intune sync
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {unreviewedCount > 0 && (
              <Badge variant="destructive">{unreviewedCount} Unreviewed</Badge>
            )}
            <div className="flex gap-1">
              <Button
                variant={filter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('all')}
              >
                All
              </Button>
              <Button
                variant={filter === 'unreviewed' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('unreviewed')}
              >
                Unreviewed
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-muted-foreground text-center py-8">Loading...</p>
        ) : changes.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            {filter === 'unreviewed' ? 'No unreviewed changes' : 'No device changes detected yet. Run a device sync to detect changes.'}
          </p>
        ) : (
          <div className="space-y-3">
            {changes.map((change) => {
              const typeInfo = getChangeTypeInfo(change.change_type);
              const Icon = typeInfo.icon;

              return (
                <div
                  key={change.id}
                  className={`flex items-start gap-3 p-4 rounded-lg border ${
                    change.reviewed ? 'bg-muted/30' : 'bg-muted/50 border-orange-200'
                  }`}
                >
                  <div className={`p-2 rounded-full ${typeInfo.color}`}>
                    <Icon className="h-4 w-4 text-white" />
                  </div>

                  <div className="flex-1 space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{typeInfo.label}</Badge>
                          <span className="text-sm font-mono text-muted-foreground">
                            {change.device_serial_number}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(change.detected_at).toLocaleString()}
                        </p>
                      </div>
                      {!change.reviewed && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => markAsReviewed(change.id)}
                          className="gap-1"
                        >
                          <CheckCircle className="h-3 w-3" />
                          Mark Reviewed
                        </Button>
                      )}
                      {change.reviewed && (
                        <Badge variant="secondary" className="text-xs">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Reviewed
                        </Badge>
                      )}
                    </div>

                    {change.change_type === 'reassignment' && (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground">
                          {change.old_user_email || 'Unknown'}
                        </span>
                        <ArrowRight className="h-4 w-4" />
                        <span className="font-semibold">
                          {change.new_user_email || 'Unknown'}
                        </span>
                      </div>
                    )}

                    {change.change_type === 'new_device' && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">Assigned to: </span>
                        <span className="font-semibold">
                          {change.new_user_email || 'Unknown'}
                        </span>
                      </div>
                    )}

                    {change.notes && (
                      <p className="text-sm text-muted-foreground italic">
                        {change.notes}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
