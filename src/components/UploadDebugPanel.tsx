/**
 * Upload Debug Panel Component
 * 
 * Displays detailed error information and debug data for upload operations
 * Only visible when debug mode is enabled
 */

import { AlertCircle, Bug, ChevronDown, ChevronUp, Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { UploadError, UploadErrorType } from "@/lib/uploadService";

interface UploadDebugPanelProps {
  error?: UploadError;
  debugInfo?: any;
  onDismiss?: () => void;
}

const getErrorTypeBadgeColor = (type: UploadErrorType): string => {
  switch (type) {
    case UploadErrorType.RLS_POLICY:
      return "bg-red-500 text-white";
    case UploadErrorType.AUTHENTICATION:
      return "bg-orange-500 text-white";
    case UploadErrorType.NETWORK:
      return "bg-yellow-500 text-white";
    case UploadErrorType.VALIDATION:
      return "bg-blue-500 text-white";
    case UploadErrorType.STORAGE:
      return "bg-purple-500 text-white";
    case UploadErrorType.DATABASE:
      return "bg-pink-500 text-white";
    default:
      return "bg-gray-500 text-white";
  }
};

export const UploadDebugPanel = ({ error, debugInfo, onDismiss }: UploadDebugPanelProps) => {
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isDebugInfoOpen, setIsDebugInfoOpen] = useState(false);
  const [isRlsHelpOpen, setIsRlsHelpOpen] = useState(false);

  if (!error) {
    return null;
  }

  return (
    <Card className="border-red-500 bg-red-50 dark:bg-red-950/20">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
            <div>
              <CardTitle className="text-red-700 dark:text-red-400">Upload Failed</CardTitle>
              <CardDescription className="text-red-600 dark:text-red-300 mt-1">
                {error.message}
              </CardDescription>
            </div>
          </div>
          {onDismiss && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onDismiss}
              className="text-red-600 hover:text-red-700"
            >
              Dismiss
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2 mt-2">
          <Badge className={getErrorTypeBadgeColor(error.type)}>
            {error.type.replace('_', ' ')}
          </Badge>
          <Badge variant="outline" className="text-xs">
            {new Date(error.details?.timestamp || Date.now()).toLocaleString()}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Suggestion */}
        {error.suggestion && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Suggested Fix</AlertTitle>
            <AlertDescription className="whitespace-pre-wrap text-sm">
              {error.suggestion}
            </AlertDescription>
          </Alert>
        )}

        {/* RLS-specific help */}
        {error.type === UploadErrorType.RLS_POLICY && error.details?.rlsContext && (
          <Collapsible open={isRlsHelpOpen} onOpenChange={setIsRlsHelpOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full justify-between">
                <span className="flex items-center gap-2">
                  <Bug className="h-4 w-4" />
                  RLS Troubleshooting Guide
                </span>
                {isRlsHelpOpen ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2">
              <Card>
                <CardContent className="pt-4 space-y-3">
                  <div>
                    <h4 className="font-semibold text-sm mb-2">Required Policies:</h4>
                    <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
                      {error.details.rlsContext.requiredPolicies?.map((policy: string, index: number) => (
                        <li key={index}>{policy}</li>
                      ))}
                    </ul>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-sm mb-2">Troubleshooting Steps:</h4>
                    <ol className="list-decimal list-inside text-sm space-y-1 text-muted-foreground">
                      {error.details.rlsContext.troubleshooting?.map((step: string, index: number) => (
                        <li key={index} className="ml-2">{step}</li>
                      ))}
                    </ol>
                  </div>
                  
                  <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-md text-sm">
                    <p className="font-semibold text-blue-700 dark:text-blue-400 mb-1">
                      How to fix in Supabase:
                    </p>
                    <ol className="list-decimal list-inside space-y-1 text-blue-600 dark:text-blue-300 text-xs">
                      <li>Go to Supabase Dashboard → Storage or Database</li>
                      <li>Find the {error.details.bucket ? 'storage bucket' : 'table'}: <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">{error.details.bucket || error.details.table}</code></li>
                      <li>Click on "Policies" tab</li>
                      <li>Ensure there's an INSERT policy that allows authenticated users</li>
                      <li>Example policy: <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">CREATE POLICY "Allow authenticated uploads" ON {error.details.bucket ? 'storage.objects' : error.details.table} FOR INSERT TO authenticated WITH CHECK (true)</code></li>
                    </ol>
                  </div>
                </CardContent>
              </Card>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Error Details */}
        <Collapsible open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="w-full justify-between">
              <span>Error Details</span>
              {isDetailsOpen ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2">
            <Card>
              <CardContent className="pt-4">
                <div className="space-y-2 text-sm font-mono">
                  {error.details?.bucket && (
                    <div>
                      <span className="font-semibold">Bucket:</span> {error.details.bucket}
                    </div>
                  )}
                  {error.details?.path && (
                    <div>
                      <span className="font-semibold">Path:</span> {error.details.path}
                    </div>
                  )}
                  {error.details?.table && (
                    <div>
                      <span className="font-semibold">Table:</span> {error.details.table}
                    </div>
                  )}
                  {error.details?.operation && (
                    <div>
                      <span className="font-semibold">Operation:</span> {error.details.operation}
                    </div>
                  )}
                  {error.details?.sessionInfo && (
                    <div>
                      <span className="font-semibold">User:</span>{' '}
                      {error.details.sessionInfo.authenticated ? (
                        <span className="text-green-600">
                          Authenticated ({error.details.sessionInfo.userEmail || error.details.sessionInfo.userId})
                        </span>
                      ) : (
                        <span className="text-red-600">Not authenticated</span>
                      )}
                    </div>
                  )}
                  {error.originalError && (
                    <div className="mt-3 pt-3 border-t">
                      <span className="font-semibold">Original Error:</span>
                      <pre className="mt-1 p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs overflow-x-auto">
                        {JSON.stringify(error.originalError, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </CollapsibleContent>
        </Collapsible>

        {/* Debug Info (only shown in debug mode) */}
        {debugInfo && (
          <Collapsible open={isDebugInfoOpen} onOpenChange={setIsDebugInfoOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full justify-between">
                <span className="flex items-center gap-2">
                  <Bug className="h-4 w-4" />
                  Debug Information
                </span>
                {isDebugInfoOpen ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2">
              <Card>
                <CardContent className="pt-4">
                  <pre className="text-xs font-mono bg-gray-100 dark:bg-gray-800 p-3 rounded overflow-x-auto max-h-96 overflow-y-auto">
                    {JSON.stringify(debugInfo, null, 2)}
                  </pre>
                </CardContent>
              </Card>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Copy Error Button */}
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => {
            const errorData = {
              type: error.type,
              message: error.message,
              details: error.details,
              suggestion: error.suggestion,
              debugInfo: debugInfo,
              originalError: error.originalError
            };
            navigator.clipboard.writeText(JSON.stringify(errorData, null, 2));
            // Could add a toast notification here
          }}
        >
          Copy Error Details to Clipboard
        </Button>
      </CardContent>
    </Card>
  );
};
