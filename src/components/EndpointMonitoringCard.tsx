import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Monitor, AlertCircle, CheckCircle, XCircle, Clock, TrendingUp, Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface EndpointStats {
  totalEndpoints: number;
  onlineEndpoints: number;
  offlineEndpoints: number;
  criticalIssues: number;
  warningIssues: number;
  compliantDevices: number;
  nonCompliantDevices: number;
  lastUpdated: Date | null;
}

const EndpointMonitoringCard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<EndpointStats>({
    totalEndpoints: 0,
    onlineEndpoints: 0,
    offlineEndpoints: 0,
    criticalIssues: 0,
    warningIssues: 0,
    compliantDevices: 0,
    nonCompliantDevices: 0,
    lastUpdated: null,
  });
  const [isLoading, setIsLoading] = useState(true);

  const fetchEndpointStats = async () => {
    try {
      setIsLoading(true);

      // Fetch endpoint monitoring data
      const { data: endpoints, error } = await supabase
        .from('endpoint_monitoring')
        .select('id, status, last_seen_at');

      if (error) {
        console.error('Error fetching endpoints:', error);
        setIsLoading(false);
        return;
      }

      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

      // Calculate basic stats
      const totalEndpoints = endpoints?.length || 0;
      const onlineEndpoints = endpoints?.filter(e => {
        if (!e.last_seen_at) return false;
        const lastSeen = new Date(e.last_seen_at);
        return lastSeen > fiveMinutesAgo;
      }).length || 0;

      // Fetch metrics for compliance and security issues
      const { data: metrics, error: metricsError } = await supabase
        .from('endpoint_metrics')
        .select('endpoint_id, overall_compliance_status, security_level, collected_at')
        .order('collected_at', { ascending: false });

      if (metricsError) {
        console.error('Error fetching metrics:', metricsError);
      }

      // Get latest metrics per endpoint
      const latestMetrics = new Map();
      metrics?.forEach(metric => {
        if (!latestMetrics.has(metric.endpoint_id)) {
          latestMetrics.set(metric.endpoint_id, metric);
        }
      });

      // Count compliance issues
      let compliantDevices = 0;
      let nonCompliantDevices = 0;
      let criticalIssues = 0;
      let warningIssues = 0;

      latestMetrics.forEach(metric => {
        if (metric.overall_compliance_status === 'compliant') {
          compliantDevices++;
        } else if (metric.overall_compliance_status === 'non_compliant') {
          nonCompliantDevices++;
        }

        if (metric.security_level === 'critical') {
          criticalIssues++;
        } else if (metric.security_level === 'warning') {
          warningIssues++;
        }
      });

      setStats({
        totalEndpoints,
        onlineEndpoints,
        offlineEndpoints: totalEndpoints - onlineEndpoints,
        criticalIssues,
        warningIssues,
        compliantDevices,
        nonCompliantDevices,
        lastUpdated: new Date(),
      });
    } catch (error) {
      console.error('Error in fetchEndpointStats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEndpointStats();

    // Refresh stats every 30 seconds
    const interval = setInterval(fetchEndpointStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (online: number, total: number) => {
    if (total === 0) return 'text-gray-400';
    const percentage = (online / total) * 100;
    if (percentage >= 90) return 'text-green-500';
    if (percentage >= 70) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getComplianceColor = (compliant: number, total: number) => {
    if (total === 0) return 'text-gray-400';
    const percentage = (compliant / total) * 100;
    if (percentage >= 90) return 'text-green-500';
    if (percentage >= 70) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <Card 
      className="hover:shadow-lg transition-shadow cursor-pointer"
      onClick={() => navigate('/endpoint-monitoring')}
    >
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Monitor className="h-5 w-5" />
          Endpoint Monitoring
        </CardTitle>
        <CardDescription>
          Real-time security and performance monitoring
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Clock className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Main Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
              {/* Total Endpoints */}
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <p className="text-2xl font-bold">{stats.totalEndpoints}</p>
                  <p className="text-xs text-muted-foreground">Total Devices</p>
                </div>
                <Monitor className="h-8 w-8 text-blue-500" />
              </div>

              {/* Online Status */}
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <p className={`text-2xl font-bold ${getStatusColor(stats.onlineEndpoints, stats.totalEndpoints)}`}>
                    {stats.onlineEndpoints}
                  </p>
                  <p className="text-xs text-muted-foreground">Online</p>
                </div>
                <CheckCircle className={`h-8 w-8 ${getStatusColor(stats.onlineEndpoints, stats.totalEndpoints)}`} />
              </div>
            </div>

            {/* Security Status */}
            <div className="border-t pt-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  <span className="text-sm font-medium">Critical Issues</span>
                </div>
                <Badge variant={stats.criticalIssues > 0 ? "destructive" : "outline"}>
                  {stats.criticalIssues}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-yellow-500" />
                  <span className="text-sm font-medium">Warnings</span>
                </div>
                <Badge variant={stats.warningIssues > 0 ? "secondary" : "outline"}>
                  {stats.warningIssues}
                </Badge>
              </div>
            </div>

            {/* Compliance Status */}
            <div className="border-t pt-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-blue-500" />
                  <span className="text-sm font-medium">Compliance</span>
                </div>
                <span className={`text-sm font-semibold ${getComplianceColor(stats.compliantDevices, stats.totalEndpoints)}`}>
                  {stats.totalEndpoints > 0 
                    ? `${Math.round((stats.compliantDevices / stats.totalEndpoints) * 100)}%`
                    : '0%'}
                </span>
              </div>
              
              <div className="flex gap-2 text-xs">
                <div className="flex items-center gap-1">
                  <CheckCircle className="h-3 w-3 text-green-500" />
                  <span>{stats.compliantDevices} compliant</span>
                </div>
                <div className="flex items-center gap-1">
                  <XCircle className="h-3 w-3 text-red-500" />
                  <span>{stats.nonCompliantDevices} non-compliant</span>
                </div>
              </div>
            </div>

            {/* Last Updated */}
            {stats.lastUpdated && (
              <div className="border-t pt-3">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Updated: {stats.lastUpdated.toLocaleTimeString()}
                </p>
              </div>
            )}

            {/* Quick Action Hint */}
            <div className="text-xs text-center text-muted-foreground pt-2 border-t">
              Click to view detailed endpoint monitoring →
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default EndpointMonitoringCard;
