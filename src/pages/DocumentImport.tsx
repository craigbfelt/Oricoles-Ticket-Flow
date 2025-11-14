import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { DocumentUpload } from "@/components/DocumentUpload";
import { TemplateDownloader } from "@/components/TemplateDownloader";
import { ImportItemSelector, ImportItem, ImportDestination } from "@/components/ImportItemSelector";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, Database, FileText, Table, FileDown, Image as ImageIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";

interface ParsedData {
  text: string;
  tables: Array<{
    headers: string[];
    rows: string[][];
  }>;
  images?: Array<{
    name: string;
    dataUrl: string;
    storagePath?: string;
  }>;
  pages?: Array<{
    pageNumber: number;
    text: string;
    images: Array<{
      name: string;
      dataUrl: string;
    }>;
  }>;
}

const DocumentImport = () => {
  const navigate = useNavigate();
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [selectedTable, setSelectedTable] = useState<number>(0);
  const [targetEntity, setTargetEntity] = useState<string>("");
  const [isImporting, setIsImporting] = useState(false);
  const [showItemSelector, setShowItemSelector] = useState(false);
  const [importItems, setImportItems] = useState<ImportItem[]>([]);
  const [enablePageMode, setEnablePageMode] = useState(false);

  // Smart routing: suggest target page based on document content
  const suggestTargetPage = (data: ParsedData): { page: string; reason: string } | null => {
    const text = data.text.toLowerCase();
    const hasImages = (data.images?.length || 0) > 0;
    
    // Check for network-related keywords
    if (text.includes('network') || text.includes('server') || text.includes('cloud') || 
        text.includes('nymbis') || text.includes('rdp') || text.includes('ip address')) {
      if (text.includes('nymbis') || text.includes('rdp')) {
        return { 
          page: '/nymbis-rdp-cloud', 
          reason: 'Document contains Nymbis/RDP network information'
        };
      }
      if (text.includes('company') || text.includes('topology') || text.includes('diagram')) {
        return { 
          page: '/company-network', 
          reason: 'Document contains company network topology information'
        };
      }
    }
    
    // Check for branch-related keywords
    if (text.includes('branch') || text.includes('office') || text.includes('location')) {
      return { 
        page: '/branches', 
        reason: 'Document contains branch/office information'
      };
    }
    
    // Check for images - suggest network diagram pages
    if (hasImages) {
      if (text.includes('network') || text.includes('diagram')) {
        return { 
          page: '/company-network', 
          reason: 'Document contains network diagram images'
        };
      }
      return { 
        page: '/branches', 
        reason: 'Document contains images that can be added to branch pages'
      };
    }
    
    return null;
  };

  const prepareImportItems = (data: ParsedData): ImportItem[] => {
    const items: ImportItem[] = [];
    
    // If page mode is enabled and we have pages, use those
    if (enablePageMode && data.pages && data.pages.length > 0) {
      data.pages.forEach((page) => {
        items.push({
          type: 'page',
          id: `page-${page.pageNumber}`,
          content: {
            pageNumber: page.pageNumber,
            text: page.text,
            dataUrl: page.images[0]?.dataUrl,
            name: `Page ${page.pageNumber}`
          }
        });
      });
    } else {
      // Standard mode: separate images and text
      
      // Add images
      data.images?.forEach((image, index) => {
        items.push({
          type: 'image',
          id: `image-${index}`,
          content: {
            name: image.name,
            dataUrl: image.dataUrl,
            storagePath: image.storagePath
          }
        });
      });
      
      // Add text content if it exists
      if (data.text && data.text.trim().length > 0) {
        items.push({
          type: 'text',
          id: 'text-content',
          content: {
            text: data.text,
            name: 'Document Text'
          }
        });
      }
    }
    
    return items;
  };

  const handleDataParsed = (data: ParsedData) => {
    setParsedData(data);
    setSelectedTable(0);
    setTargetEntity("");
    
    // Prepare import items
    const items = prepareImportItems(data);
    setImportItems(items);
    
    // If we have images or pages, show the item selector
    if (items.length > 0 && (data.images?.length || data.pages?.length)) {
      setShowItemSelector(true);
    }
    
    // Suggest target page if applicable
    const suggestion = suggestTargetPage(data);
    if (suggestion) {
      toast.info("Smart Routing Suggestion", {
        description: `${suggestion.reason}. Click here to navigate to ${suggestion.page}`,
        action: {
          label: "Go there",
          onClick: () => navigate(suggestion.page)
        },
        duration: 10000
      });
    }
  };

  const handleImportComplete = (results: Array<{ item: ImportItem; destination: ImportDestination; success: boolean }>) => {
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;
    
    if (successCount > 0) {
      toast.success(`Successfully imported ${successCount} item${successCount !== 1 ? 's' : ''}`, {
        description: failCount > 0 ? `${failCount} item${failCount !== 1 ? 's' : ''} failed to import` : undefined
      });
    }
    
    if (failCount > 0 && successCount === 0) {
      toast.error(`Failed to import ${failCount} item${failCount !== 1 ? 's' : ''}`);
    }
    
    // Reset state
    setShowItemSelector(false);
    setImportItems([]);
    setParsedData(null);
  };

  const handleCancelImport = () => {
    setShowItemSelector(false);
    // Keep parsed data so user can still access it
  };

  const mapTableToEntity = (
    table: { headers: string[]; rows: string[][] },
    entity: string
  ): any[] => {
    const records: any[] = [];

    table.rows.forEach((row) => {
      const record: any = {};

      switch (entity) {
        case "tickets":
          // Map columns to ticket fields
          table.headers.forEach((header, index) => {
            const normalizedHeader = header.toLowerCase().trim();
            if (normalizedHeader.includes("title") || normalizedHeader.includes("subject")) {
              record.title = row[index];
            } else if (normalizedHeader.includes("description") || normalizedHeader.includes("detail")) {
              record.description = row[index];
            } else if (normalizedHeader.includes("priority")) {
              const priority = row[index].toLowerCase();
              if (["low", "medium", "high", "urgent"].includes(priority)) {
                record.priority = priority;
              }
            } else if (normalizedHeader.includes("status")) {
              const status = row[index].toLowerCase().replace(/\s+/g, "_");
              if (["open", "in_progress", "pending", "resolved", "closed"].includes(status)) {
                record.status = status;
              }
            } else if (normalizedHeader.includes("category")) {
              record.category = row[index];
            }
          });
          // Set defaults for required fields
          if (!record.title) record.title = row[0] || "Imported Ticket";
          if (!record.priority) record.priority = "medium";
          if (!record.status) record.status = "open";
          break;

        case "assets":
          // Map columns to asset fields
          table.headers.forEach((header, index) => {
            const normalizedHeader = header.toLowerCase().trim();
            if (normalizedHeader.includes("name") || normalizedHeader.includes("asset")) {
              record.name = row[index];
            } else if (normalizedHeader.includes("tag") || normalizedHeader.includes("id")) {
              record.asset_tag = row[index];
            } else if (normalizedHeader.includes("category") || normalizedHeader.includes("type")) {
              record.category = row[index];
            } else if (normalizedHeader.includes("model")) {
              record.model = row[index];
            } else if (normalizedHeader.includes("serial")) {
              record.serial_number = row[index];
            } else if (normalizedHeader.includes("location")) {
              record.location = row[index];
            } else if (normalizedHeader.includes("status")) {
              const status = row[index].toLowerCase();
              if (["active", "maintenance", "retired", "disposed"].includes(status)) {
                record.status = status;
              }
            } else if (normalizedHeader.includes("notes") || normalizedHeader.includes("description")) {
              record.notes = row[index];
            }
          });
          // Set defaults for required fields
          if (!record.name) record.name = row[0] || "Imported Asset";
          if (!record.status) record.status = "active";
          break;

        case "licenses":
          // Map columns to license fields
          table.headers.forEach((header, index) => {
            const normalizedHeader = header.toLowerCase().trim();
            if (normalizedHeader.includes("name") || normalizedHeader.includes("license")) {
              record.license_name = row[index];
            } else if (normalizedHeader.includes("type")) {
              record.license_type = row[index];
            } else if (normalizedHeader.includes("vendor") || normalizedHeader.includes("provider")) {
              record.vendor = row[index];
            } else if (normalizedHeader.includes("key") || normalizedHeader.includes("serial")) {
              record.license_key = row[index];
            } else if (normalizedHeader.includes("total") && normalizedHeader.includes("seat")) {
              record.total_seats = parseInt(row[index]) || 0;
            } else if (normalizedHeader.includes("used") && normalizedHeader.includes("seat")) {
              record.used_seats = parseInt(row[index]) || 0;
            } else if (normalizedHeader.includes("cost") || normalizedHeader.includes("price")) {
              record.cost = parseFloat(row[index]) || null;
            } else if (normalizedHeader.includes("purchase") && normalizedHeader.includes("date")) {
              record.purchase_date = row[index];
            } else if (normalizedHeader.includes("renewal") && normalizedHeader.includes("date")) {
              record.renewal_date = row[index];
            } else if (normalizedHeader.includes("status")) {
              record.status = row[index].toLowerCase();
            } else if (normalizedHeader.includes("notes")) {
              record.notes = row[index];
            }
          });
          // Set defaults for required fields
          if (!record.license_name) record.license_name = row[0] || "Imported License";
          if (!record.license_type) record.license_type = "Other";
          if (!record.vendor) record.vendor = "Unknown";
          if (!record.total_seats) record.total_seats = 1;
          if (!record.used_seats) record.used_seats = 0;
          if (!record.status) record.status = "active";
          break;

        default:
          // Generic mapping: use headers as keys
          table.headers.forEach((header, index) => {
            const key = header.toLowerCase().replace(/\s+/g, "_");
            record[key] = row[index];
          });
      }

      records.push(record);
    });

    return records;
  };

  const handleImport = async () => {
    if (!parsedData || !targetEntity || parsedData.tables.length === 0) {
      toast.error("Please select a table and target entity");
      return;
    }

    setIsImporting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Create import job
      const { data: importJob, error: jobError } = await supabase
        .from("import_jobs")
        .insert({
          import_type: "document",
          resource_type: targetEntity,
          status: "processing",
        })
        .select()
        .single();

      if (jobError) throw jobError;

      const table = parsedData.tables[selectedTable];
      const records = mapTableToEntity(table, targetEntity);

      // Import the data
      const { error: importError } = await (supabase as any).from(targetEntity).insert(records);

      if (importError) {
        // Update job status to failed
        await supabase
          .from("import_jobs")
          .update({
            status: "failed",
            error_details: importError.message,
          })
          .eq("id", importJob.id);

        throw importError;
      }

      // Update job status to completed
      await supabase
        .from("import_jobs")
        .update({
          status: "completed",
          result_summary: {
            records_imported: records.length,
            table_index: selectedTable,
          },
        })
        .eq("id", importJob.id);

      toast.success("Import completed successfully", {
        description: `Imported ${records.length} record(s) to ${targetEntity}`,
      });

      // Reset form
      setParsedData(null);
      setSelectedTable(0);
      setTargetEntity("");
    } catch (error) {
      console.error("Import error:", error);
      toast.error("Failed to import data", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Document Import</h1>
          <p className="text-muted-foreground">
            Upload Word (.docx), PDF, or image files to extract and import data. Smart routing will suggest the best destination for your content.
          </p>
        </div>

        <Tabs defaultValue="upload" className="space-y-4">
          <TabsList>
            <TabsTrigger value="upload">
              <FileText className="h-4 w-4 mr-2" />
              Upload Document
            </TabsTrigger>
            <TabsTrigger value="templates">
              <FileDown className="h-4 w-4 mr-2" />
              Templates
            </TabsTrigger>
            <TabsTrigger value="import" disabled={!parsedData || parsedData.tables.length === 0}>
              <Database className="h-4 w-4 mr-2" />
              Import Data
            </TabsTrigger>
          </TabsList>

          <TabsContent value="templates" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <TemplateDownloader entityType="tickets" />
              <TemplateDownloader entityType="assets" />
              <TemplateDownloader entityType="licenses" />
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle>How to Use Templates</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <h4 className="font-medium mb-1">Option 1: CSV Template (Recommended)</h4>
                  <ol className="list-decimal list-inside space-y-1 text-muted-foreground ml-2">
                    <li>Download the CSV template for your data type</li>
                    <li>Open it in Excel or any spreadsheet application</li>
                    <li>Fill in your data following the example rows</li>
                    <li>Save the file</li>
                    <li>Use the CSV import feature on the respective page (Tickets, Assets, or Licenses)</li>
                  </ol>
                </div>
                
                <div>
                  <h4 className="font-medium mb-1">Option 2: Word Document</h4>
                  <ol className="list-decimal list-inside space-y-1 text-muted-foreground ml-2">
                    <li>Download the Word import instructions</li>
                    <li>Create a table in Microsoft Word with the specified headers</li>
                    <li>Fill in your data in table rows</li>
                    <li>Save as .docx or .doc</li>
                    <li>Upload the document using the "Upload Document" tab above</li>
                  </ol>
                </div>

                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Pro Tip</AlertTitle>
                  <AlertDescription>
                    For large datasets, CSV files are faster and more reliable. 
                    Use Word documents when you have formatted text or need to include additional context.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="upload" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Import Options</CardTitle>
                <CardDescription>Configure how documents are processed</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="page-mode"
                    checked={enablePageMode}
                    onCheckedChange={setEnablePageMode}
                  />
                  <div className="flex-1">
                    <Label htmlFor="page-mode" className="cursor-pointer">
                      Enable Page-by-Page Mode
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Preserve images and text together as they appear on each page (PDFs only)
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <DocumentUpload 
              onDataParsed={handleDataParsed} 
              enablePageMode={enablePageMode}
            />

            {showItemSelector && importItems.length > 0 && (
              <ImportItemSelector
                items={importItems}
                onImportComplete={handleImportComplete}
                onCancel={handleCancelImport}
              />
            )}

            {parsedData && parsedData.tables.length === 0 && !showItemSelector && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>No Tables Found</AlertTitle>
                <AlertDescription>
                  The document was parsed successfully, but no tables were found. 
                  {parsedData.images && parsedData.images.length > 0 && (
                    <> However, {parsedData.images.length} image{parsedData.images.length !== 1 ? 's were' : ' was'} extracted. Use the import selector above to save them.</>
                  )}
                  {(!parsedData.images || parsedData.images.length === 0) && (
                    <> Make sure your data is formatted as a table in the Word document.</>
                  )}
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>

          <TabsContent value="import" className="space-y-4">
            {parsedData && parsedData.tables.length > 0 && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>
                      <Table className="h-5 w-5 inline mr-2" />
                      Configure Import
                    </CardTitle>
                    <CardDescription>
                      Select which table to import and where to import it
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="table-select">Select Table</Label>
                        <Select
                          value={selectedTable.toString()}
                          onValueChange={(value) => setSelectedTable(parseInt(value))}
                        >
                          <SelectTrigger id="table-select">
                            <SelectValue placeholder="Select a table" />
                          </SelectTrigger>
                          <SelectContent>
                            {parsedData.tables.map((table, index) => (
                              <SelectItem key={index} value={index.toString()}>
                                Table {index + 1} ({table.rows.length} rows)
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="entity-select">Import To</Label>
                        <Select value={targetEntity} onValueChange={setTargetEntity}>
                          <SelectTrigger id="entity-select">
                            <SelectValue placeholder="Select target entity" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="tickets">Tickets</SelectItem>
                            <SelectItem value="assets">Assets</SelectItem>
                            <SelectItem value="licenses">Licenses</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        onClick={handleImport}
                        disabled={!targetEntity || isImporting}
                        className="w-full md:w-auto"
                      >
                        {isImporting ? "Importing..." : "Import Data"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {parsedData.tables[selectedTable] && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Preview: Table {selectedTable + 1}</CardTitle>
                      <CardDescription>
                        {parsedData.tables[selectedTable].rows.length} rows will be imported
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="border rounded-lg overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-muted">
                            <tr>
                              {parsedData.tables[selectedTable].headers.map((header, index) => (
                                <th key={index} className="px-3 py-2 text-left font-medium">
                                  {header || `Column ${index + 1}`}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {parsedData.tables[selectedTable].rows.slice(0, 5).map((row, rowIndex) => (
                              <tr key={rowIndex} className="border-t">
                                {row.map((cell, cellIndex) => (
                                  <td key={cellIndex} className="px-3 py-2">
                                    {cell}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {parsedData.tables[selectedTable].rows.length > 5 && (
                          <div className="px-3 py-2 text-xs text-muted-foreground border-t bg-muted/50">
                            Showing 5 of {parsedData.tables[selectedTable].rows.length} rows
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default DocumentImport;
