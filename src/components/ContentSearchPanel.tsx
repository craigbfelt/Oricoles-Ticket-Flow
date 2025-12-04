import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Search, Loader2, Download, AlertCircle, CheckCircle, Info } from "lucide-react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";

interface ContentSearchPanelProps {
  isAdmin: boolean;
}

interface SearchResult {
  subject: string;
  from: string;
  receivedDateTime: string;
}

interface SearchStatus {
  status: string;
  itemCount?: number;
  sizeInBytes?: number;
}

const ContentSearchPanel = ({ isAdmin }: ContentSearchPanelProps) => {
  const [query, setQuery] = useState("");
  const [targetMailboxes, setTargetMailboxes] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchId, setSearchId] = useState<string | null>(null);
  const [caseId, setCaseId] = useState<string | null>(null);
  const [searchStatus, setSearchStatus] = useState<SearchStatus | null>(null);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [usedFallback, setUsedFallback] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Poll for search status
  const pollSearchStatus = useCallback(async () => {
    if (!caseId || !searchId) return;

    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) return;

      const response = await supabase.functions.invoke('m365-ediscovery-search', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        body: null,
      });

      // For GET requests, use URLSearchParams for safe URL construction
      const statusUrl = new URL(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/m365-ediscovery-search`);
      statusUrl.searchParams.set('caseId', caseId);
      statusUrl.searchParams.set('searchId', searchId);
      
      const statusResponse = await fetch(
        statusUrl.toString(),
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${session.session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const data = await statusResponse.json();

      if (data.success) {
        setSearchStatus({
          status: data.status,
          itemCount: data.itemCount,
          sizeInBytes: data.sizeInBytes,
        });

        // Stop polling if search is complete or failed
        if (data.status === 'succeeded' || data.status === 'failed') {
          setIsSearching(false);
        }
      }
    } catch (err) {
      console.error('Error polling search status:', err);
    }
  }, [caseId, searchId]);

  // Set up polling interval
  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null;

    if (isSearching && caseId && searchId) {
      intervalId = setInterval(pollSearchStatus, 10000); // Poll every 10 seconds
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isSearching, caseId, searchId, pollSearchStatus]);

  const handleSearch = async () => {
    if (!query.trim()) {
      toast.error("Please enter a search query");
      return;
    }

    setIsSearching(true);
    setError(null);
    setSearchResults([]);
    setSearchStatus(null);
    setSearchId(null);
    setCaseId(null);
    setUsedFallback(false);

    try {
      const mailboxes = targetMailboxes
        .split(',')
        .map(m => m.trim())
        .filter(m => m.length > 0);

      const { data, error: invokeError } = await supabase.functions.invoke('m365-ediscovery-search', {
        body: {
          query: query.trim(),
          targetMailboxes: mailboxes.length > 0 ? mailboxes : undefined,
        },
      });

      if (invokeError) {
        throw new Error(invokeError.message);
      }

      if (!data.success) {
        throw new Error(data.error || 'Search failed');
      }

      // Check if it's a fallback result (immediate results from Graph API)
      if (data.usedFallback) {
        setUsedFallback(true);
        setSearchResults(data.results || []);
        setIsSearching(false);
        toast.success("Search completed using Graph API");
      } else {
        // eDiscovery search started - need to poll for results
        setCaseId(data.caseId);
        setSearchId(data.searchId);
        toast.success("eDiscovery search started");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Search failed';
      setError(errorMessage);
      toast.error(errorMessage);
      setIsSearching(false);
    }
  };

  const formatBytes = (bytes: number | undefined) => {
    if (!bytes) return 'N/A';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  if (!isAdmin) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5" />
          Microsoft 365 eDiscovery Content Search
        </CardTitle>
        <CardDescription>
          Search mailbox content across your Microsoft 365 tenant using KQL (Keyword Query Language)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>KQL Query Examples</AlertTitle>
          <AlertDescription className="text-sm font-mono mt-2">
            <ul className="list-disc list-inside space-y-1">
              <li>subject:"quarterly report"</li>
              <li>from:john.doe@example.com</li>
              <li>received&gt;=2024-01-01 AND hasattachment:true</li>
              <li>body:"confidential information"</li>
            </ul>
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <Label htmlFor="query">KQL Query</Label>
          <Textarea
            id="query"
            placeholder='Enter KQL query, e.g., subject:"invoice" AND from:finance@example.com'
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            rows={3}
            disabled={isSearching}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="mailboxes">Target Mailboxes (Optional)</Label>
          <Input
            id="mailboxes"
            placeholder="Leave empty for all mailboxes, or enter comma-separated emails"
            value={targetMailboxes}
            onChange={(e) => setTargetMailboxes(e.target.value)}
            disabled={isSearching}
          />
          <p className="text-xs text-muted-foreground">
            Example: user1@domain.com, user2@domain.com
          </p>
        </div>

        <Button 
          onClick={handleSearch} 
          disabled={isSearching || !query.trim()}
          className="w-full"
        >
          {isSearching ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Searching...
            </>
          ) : (
            <>
              <Search className="mr-2 h-4 w-4" />
              Start eDiscovery Search
            </>
          )}
        </Button>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {searchStatus && (
          <div className="border rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2">
              <span className="font-medium">Search Status:</span>
              <Badge variant={searchStatus.status === 'succeeded' ? 'default' : 'secondary'}>
                {searchStatus.status}
              </Badge>
            </div>
            {searchStatus.itemCount !== undefined && (
              <p className="text-sm">
                <span className="text-muted-foreground">Items found:</span>{' '}
                {searchStatus.itemCount.toLocaleString()}
              </p>
            )}
            {searchStatus.sizeInBytes !== undefined && (
              <p className="text-sm">
                <span className="text-muted-foreground">Total size:</span>{' '}
                {formatBytes(searchStatus.sizeInBytes)}
              </p>
            )}
            {searchId && (
              <p className="text-sm">
                <span className="text-muted-foreground">Search ID:</span>{' '}
                <code className="text-xs bg-muted px-1 rounded">{searchId}</code>
              </p>
            )}
          </div>
        )}

        {usedFallback && searchResults.length > 0 && (
          <div className="space-y-2">
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertTitle>Results from Graph API</AlertTitle>
              <AlertDescription>
                eDiscovery was unavailable, showing results from Graph Search API
              </AlertDescription>
            </Alert>
            <div className="border rounded-lg divide-y max-h-96 overflow-y-auto">
              {searchResults.map((result, index) => (
                <div key={index} className="p-3 space-y-1">
                  <p className="font-medium text-sm">{result.subject}</p>
                  <p className="text-xs text-muted-foreground">
                    From: {result.from}
                  </p>
                  {result.receivedDateTime && (
                    <p className="text-xs text-muted-foreground">
                      {new Date(result.receivedDateTime).toLocaleString()}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {usedFallback && searchResults.length === 0 && !isSearching && !error && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>No Results</AlertTitle>
            <AlertDescription>
              No matching items found for your query.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default ContentSearchPanel;
