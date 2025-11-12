import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, Download } from "lucide-react";

interface SearchResult {
  subject: string;
  from: string;
  receivedDateTime: string;
  bodyPreview: string;
}

interface ExportResult {
  exportId: string;
  status: string;
  downloadUrl?: string;
  percentComplete?: number;
}

const ContentSearchPanel = () => {
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [mailboxEmails, setMailboxEmails] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [exportResult, setExportResult] = useState<ExportResult | null>(null);
  const [isPolling, setIsPolling] = useState(false);

  const endpoint = import.meta.env.VITE_M365_EDISCOVERY_ENDPOINT || '/functions/v1/m365-ediscovery-search';

  const handleSearch = async () => {
    if (!query.trim()) {
      toast({
        title: "Query Required",
        description: "Please enter a search query (KQL format)",
        variant: "destructive",
      });
      return;
    }

    setIsSearching(true);
    setSearchResults([]);
    setExportResult(null);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: query.trim(),
          mailboxes: mailboxEmails
            .split(',')
            .map((e) => e.trim())
            .filter((e) => e.length > 0),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }

      const data = await response.json();

      if (data.exportId) {
        // eDiscovery workflow initiated
        setExportResult({
          exportId: data.exportId,
          status: data.status || 'processing',
          percentComplete: data.percentComplete || 0,
        });

        toast({
          title: "eDiscovery Search Started",
          description: `Export ID: ${data.exportId}. Polling for completion...`,
        });

        // Start polling for export completion
        pollExportStatus(data.exportId);
      } else if (data.results && Array.isArray(data.results)) {
        // Direct search results (fallback)
        setSearchResults(data.results);
        toast({
          title: "Search Complete",
          description: `Found ${data.results.length} results`,
        });
      } else {
        throw new Error("Unexpected response format");
      }
    } catch (error: unknown) {
      console.error('Search error:', error);
      const errorMessage = error instanceof Error ? error.message : "An error occurred during the search";
      toast({
        title: "Search Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const pollExportStatus = async (exportId: string) => {
    setIsPolling(true);
    const maxAttempts = 30; // Poll for up to 5 minutes (10s intervals)
    let attempts = 0;

    const poll = async () => {
      try {
        const response = await fetch(`${endpoint}?exportId=${exportId}`);
        
        if (!response.ok) {
          throw new Error(`Polling error: ${response.status}`);
        }

        const data = await response.json();

        setExportResult({
          exportId,
          status: data.status,
          downloadUrl: data.downloadUrl,
          percentComplete: data.percentComplete,
        });

        if (data.status === 'completed' && data.downloadUrl) {
          toast({
            title: "Export Ready",
            description: "Your eDiscovery export is ready for download",
          });
          setIsPolling(false);
          return;
        }

        if (data.status === 'failed') {
          toast({
            title: "Export Failed",
            description: "The eDiscovery export failed. Please try again.",
            variant: "destructive",
          });
          setIsPolling(false);
          return;
        }

        attempts++;
        if (attempts < maxAttempts && data.status !== 'completed') {
          setTimeout(poll, 10000); // Poll every 10 seconds
        } else if (attempts >= maxAttempts) {
          toast({
            title: "Polling Timeout",
            description: "Export is still processing. Please check back later.",
            variant: "destructive",
          });
          setIsPolling(false);
        }
      } catch (error: unknown) {
        console.error('Polling error:', error);
        setIsPolling(false);
      }
    };

    poll();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5" />
          Microsoft 365 eDiscovery Content Search
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="search-query">Search Query (KQL)</Label>
          <Input
            id="search-query"
            placeholder='e.g., subject:"confidential" AND from:user@domain.com'
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={isSearching || isPolling}
          />
          <p className="text-xs text-muted-foreground">
            Use KQL (Keyword Query Language) syntax for advanced searches
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="mailbox-emails">Target Mailboxes (Optional)</Label>
          <Input
            id="mailbox-emails"
            placeholder="user1@domain.com, user2@domain.com"
            value={mailboxEmails}
            onChange={(e) => setMailboxEmails(e.target.value)}
            disabled={isSearching || isPolling}
          />
          <p className="text-xs text-muted-foreground">
            Leave empty to search all mailboxes, or specify comma-separated email addresses
          </p>
        </div>

        <Button 
          onClick={handleSearch} 
          disabled={isSearching || isPolling}
          className="w-full"
        >
          {isSearching ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating eDiscovery Search...
            </>
          ) : (
            <>
              <Search className="mr-2 h-4 w-4" />
              Start eDiscovery Search
            </>
          )}
        </Button>

        {exportResult && (
          <div className="mt-4 p-4 border rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Export ID:</span>
              <code className="text-xs bg-muted px-2 py-1 rounded">{exportResult.exportId}</code>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Status:</span>
              <Badge variant={
                exportResult.status === 'completed' ? 'default' :
                exportResult.status === 'failed' ? 'destructive' :
                'secondary'
              }>
                {exportResult.status}
              </Badge>
            </div>
            {exportResult.percentComplete !== undefined && (
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Progress:</span>
                <span className="text-sm">{exportResult.percentComplete}%</span>
              </div>
            )}
            {isPolling && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Polling for export completion...
              </div>
            )}
            {exportResult.downloadUrl && (
              <Button
                className="w-full mt-2"
                onClick={() => window.open(exportResult.downloadUrl, '_blank')}
              >
                <Download className="mr-2 h-4 w-4" />
                Download Export
              </Button>
            )}
          </div>
        )}

        {searchResults.length > 0 && (
          <div className="mt-4">
            <h3 className="text-sm font-medium mb-2">Search Results ({searchResults.length})</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subject</TableHead>
                  <TableHead>From</TableHead>
                  <TableHead>Received</TableHead>
                  <TableHead>Preview</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {searchResults.map((result, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{result.subject || '(no subject)'}</TableCell>
                    <TableCell>{result.from}</TableCell>
                    <TableCell className="text-sm">
                      {new Date(result.receivedDateTime).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                      {result.bodyPreview}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ContentSearchPanel;
