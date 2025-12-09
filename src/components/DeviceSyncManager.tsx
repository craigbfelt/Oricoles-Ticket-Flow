import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, CheckCircle, AlertCircle, Info, Activity } from "lucide-react";
import { toast } from "sonner";

interface SyncResult {
  synced_count: number;
  new_assignments: number;
  changes_detected: number;
  errors_count: number;
}

export function DeviceSyncManager() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      toast.info("Starting device sync...");

      // Call the sync function
      const { data, error } = await supabase.rpc('sync_intune_devices_to_master_users');

      if (error) {
        console.error("Sync error:", error);
        toast.error(`Sync failed: ${error.message}`);
        return;
      }

      if (data && data.length > 0) {
        const result: SyncResult = {
          synced_count: data[0].synced_count || 0,
          new_assignments: data[0].new_assignments || 0,
          changes_detected: data[0].changes_detected || 0,
          errors_count: data[0].errors_count || 0
        };

        setLastSyncResult(result);
        setLastSyncTime(new Date());

        if (result.errors_count > 0) {
          toast.warning(`Sync completed with ${result.errors_count} errors. Check console for details.`);
        } else if (result.changes_detected > 0 || result.new_assignments > 0) {
          toast.success(`Sync completed! ${result.new_assignments} new assignments, ${result.changes_detected} changes detected.`);
        } else {
          toast.success("Sync completed! No changes detected.");
        }
      }
    } catch (error) {
      console.error("Error during sync:", error);
      toast.error("An unexpected error occurred during sync");
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Device Sync
            </CardTitle>
            <CardDescription>
              Sync Intune device data with master user list and detect changes
            </CardDescription>
          </div>
          <Button
            onClick={handleSync}
            disabled={isSyncing}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Syncing...' : 'Sync Now'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>What does sync do?</AlertTitle>
          <AlertDescription>
            <ul className="list-disc list-inside space-y-1 mt-2">
              <li>Compares Intune device assignments with your master user list</li>
              <li>Detects when devices are reassigned to different users</li>
              <li>Creates device assignment records for tracking</li>
              <li>Logs all device changes for audit purposes</li>
            </ul>
          </AlertDescription>
        </Alert>

        {lastSyncResult && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Last Sync Results</h3>
              {lastSyncTime && (
                <Badge variant="outline" className="text-xs">
                  {lastSyncTime.toLocaleString()}
                </Badge>
              )}
            </div>

            <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Synced</p>
                  <p className="text-lg font-bold">{lastSyncResult.synced_count}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                <Activity className="h-4 w-4 text-blue-500" />
                <div>
                  <p className="text-xs text-muted-foreground">New</p>
                  <p className="text-lg font-bold">{lastSyncResult.new_assignments}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                <RefreshCw className="h-4 w-4 text-orange-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Changes</p>
                  <p className="text-lg font-bold">{lastSyncResult.changes_detected}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                <AlertCircle className={`h-4 w-4 ${lastSyncResult.errors_count > 0 ? 'text-red-500' : 'text-gray-400'}`} />
                <div>
                  <p className="text-xs text-muted-foreground">Errors</p>
                  <p className="text-lg font-bold">{lastSyncResult.errors_count}</p>
                </div>
              </div>
            </div>

            {lastSyncResult.changes_detected > 0 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Device Changes Detected</AlertTitle>
                <AlertDescription>
                  {lastSyncResult.changes_detected} device reassignment(s) were detected. 
                  View the "Change History" tab to review the changes.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        <div className="pt-4 border-t">
          <h3 className="font-semibold mb-2">How Device Tracking Works</h3>
          <div className="text-sm text-muted-foreground space-y-2">
            <p>
              <strong>Master User List:</strong> The fixed list of users (from CSV or manual entry) 
              is the source of truth for who should be in the system.
            </p>
            <p>
              <strong>Intune Sync:</strong> Device assignments from Microsoft 365 Intune are 
              automatically matched to users in the master list.
            </p>
            <p>
              <strong>Thin Client Users:</strong> Users without Intune devices (e.g., thin client users) 
              are still tracked with their RDP/VPN credentials from the master list.
            </p>
            <p>
              <strong>Change Detection:</strong> When devices are reassigned or replaced, 
              the system logs these changes for audit and review.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
