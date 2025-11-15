import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Image as ImageIcon, FileText, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export interface ImportItem {
  type: 'image' | 'text' | 'page';
  id: string;
  content: {
    dataUrl?: string;
    text?: string;
    name?: string;
    storagePath?: string;
    pageNumber?: number;
  };
}

export interface ImportDestination {
  target: string;
  entityId?: string;
  notes?: string;
}

interface ImportItemSelectorProps {
  items: ImportItem[];
  onImportComplete: (results: Array<{ item: ImportItem; destination: ImportDestination; success: boolean }>) => void;
  onCancel: () => void;
}

export const ImportItemSelector = ({ items, onImportComplete, onCancel }: ImportItemSelectorProps) => {
  const [itemDestinations, setItemDestinations] = useState<Map<string, ImportDestination>>(new Map());
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set(items.map(item => item.id)));
  const [isImporting, setIsImporting] = useState(false);
  const [importNotes, setImportNotes] = useState<Map<string, string>>(new Map());

  const handleDestinationChange = (itemId: string, target: string) => {
    const newDestinations = new Map(itemDestinations);
    newDestinations.set(itemId, { 
      target, 
      notes: importNotes.get(itemId) 
    });
    setItemDestinations(newDestinations);
  };

  const handleNotesChange = (itemId: string, notes: string) => {
    const newNotes = new Map(importNotes);
    newNotes.set(itemId, notes);
    setImportNotes(newNotes);
    
    // Update destination with notes
    const dest = itemDestinations.get(itemId);
    if (dest) {
      const newDestinations = new Map(itemDestinations);
      newDestinations.set(itemId, { ...dest, notes });
      setItemDestinations(newDestinations);
    }
  };

  const handleToggleItem = (itemId: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
  };

  const convertImageFormat = async (dataUrl: string, targetFormat: 'png' | 'jpeg' = 'png'): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }
        ctx.drawImage(img, 0, 0);
        const mimeType = targetFormat === 'png' ? 'image/png' : 'image/jpeg';
        const quality = targetFormat === 'jpeg' ? 0.9 : undefined;
        const convertedDataUrl = canvas.toDataURL(mimeType, quality);
        resolve(convertedDataUrl);
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = dataUrl;
    });
  };

  const uploadItemToDestination = async (item: ImportItem, destination: ImportDestination): Promise<boolean> => {
    try {
      if (item.type === 'image' && item.content.dataUrl) {
        // Convert image format if needed
        let dataUrl = item.content.dataUrl;
        
        // Check if image needs conversion (webp, bmp, tiff, etc.)
        const needsConversion = !dataUrl.startsWith('data:image/png') && 
                               !dataUrl.startsWith('data:image/jpeg') &&
                               !dataUrl.startsWith('data:image/jpg');
        
        if (needsConversion) {
          toast.info(`Converting ${item.content.name} to PNG format...`);
          dataUrl = await convertImageFormat(dataUrl, 'png');
        }

        // Upload image to storage
        const response = await fetch(dataUrl);
        const blob = await response.blob();
        
        let storagePath: string;
        let bucket: string;

        // Determine storage location based on destination
        switch (destination.target) {
          case 'company-network':
            bucket = 'diagrams';
            storagePath = `company-network/${Date.now()}_${item.content.name}`;
            break;
          case 'nymbis-rdp':
            bucket = 'diagrams';
            storagePath = `nymbis-rdp/${Date.now()}_${item.content.name}`;
            break;
          case 'branches':
            bucket = 'diagrams';
            storagePath = `branches/${Date.now()}_${item.content.name}`;
            break;
          default:
            bucket = 'diagrams';
            storagePath = `document-images/${Date.now()}_${item.content.name}`;
        }

        const { error: uploadError } = await supabase.storage
          .from(bucket)
          .upload(storagePath, blob, {
            upsert: false,
            contentType: blob.type
          });

        if (uploadError) throw uploadError;

        // Create a record in network_diagrams table for network-related destinations
        if (['company-network', 'nymbis-rdp', 'branches'].includes(destination.target)) {
          const { error: dbError } = await (supabase as any)
            .from('network_diagrams')
            .insert({
              branch_id: (destination as any).branch_id || null,
              diagram_name: item.content.name || 'Imported Image',
              diagram_url: storagePath,
              description: destination.notes || null
            });

          if (dbError) throw dbError;
        }

        return true;
      } else if (item.type === 'text' && item.content.text) {
        // Handle text import based on destination
        // This would typically go into notes or descriptions of entities
        
        // For now, we'll just log it as we don't have a generic text storage
        console.log('Text import to', destination.target, ':', item.content.text);
        return true;
      } else if (item.type === 'page') {
        // Handle page import (image + text together)
        // This is similar to image but may include text metadata
        
        if (item.content.dataUrl) {
          // Upload the page image
          const response = await fetch(item.content.dataUrl);
          const blob = await response.blob();
          
          const bucket = 'diagrams';
          const storagePath = `pages/${Date.now()}_page_${item.content.pageNumber || 'unknown'}.png`;

          const { error: uploadError } = await supabase.storage
            .from(bucket)
            .upload(storagePath, blob, {
              upsert: false,
              contentType: blob.type
            });

          if (uploadError) throw uploadError;

          // Store page data with text
          const { error: dbError } = await (supabase as any)
            .from('network_diagrams')
            .insert({
              branch_id: (destination as any).branch_id || null,
              diagram_name: `Page ${item.content.pageNumber || 'Unknown'}`,
              diagram_url: storagePath,
              description: item.content.text || destination.notes || null
            });

          if (dbError) throw dbError;
        }

        return true;
      }

      return false;
    } catch (error) {
      console.error('Error uploading item:', error);
      throw error;
    }
  };

  const handleImportSelected = async () => {
    setIsImporting(true);
    const results: Array<{ item: ImportItem; destination: ImportDestination; success: boolean }> = [];

    try {
      for (const item of items) {
        if (!selectedItems.has(item.id)) continue;

        const destination = itemDestinations.get(item.id);
        if (!destination || !destination.target) {
          toast.error(`No destination selected for ${item.content.name || 'item'}`);
          results.push({ item, destination: destination || { target: '' }, success: false });
          continue;
        }

        try {
          const success = await uploadItemToDestination(item, destination);
          results.push({ item, destination, success });
          
          if (success) {
            toast.success(`Imported ${item.content.name || 'item'} to ${destination.target}`);
          }
        } catch (error) {
          console.error('Error importing item:', error);
          toast.error(`Failed to import ${item.content.name || 'item'}`, {
            description: error instanceof Error ? error.message : 'Unknown error'
          });
          results.push({ item, destination, success: false });
        }
      }

      onImportComplete(results);
    } finally {
      setIsImporting(false);
    }
  };

  const handleSelectAll = () => {
    setSelectedItems(new Set(items.map(item => item.id)));
  };

  const handleDeselectAll = () => {
    setSelectedItems(new Set());
  };

  const getItemIcon = (type: ImportItem['type']) => {
    switch (type) {
      case 'image':
      case 'page':
        return <ImageIcon className="h-4 w-4" />;
      case 'text':
        return <FileText className="h-4 w-4" />;
    }
  };

  const selectedCount = selectedItems.size;
  const destinationCount = Array.from(selectedItems).filter(id => itemDestinations.has(id)).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Select Import Destinations</CardTitle>
        <CardDescription>
          Choose where to import each item. You can select individual destinations for images and text.
        </CardDescription>
        <div className="flex gap-2 mt-2">
          <Button onClick={handleSelectAll} variant="outline" size="sm">
            Select All
          </Button>
          <Button onClick={handleDeselectAll} variant="outline" size="sm">
            Deselect All
          </Button>
          <div className="ml-auto text-sm text-muted-foreground flex items-center gap-2">
            <span>{selectedCount} selected</span>
            <span>•</span>
            <span>{destinationCount} with destinations</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3 max-h-[600px] overflow-y-auto">
          {items.map((item, index) => (
            <Card key={item.id} className={!selectedItems.has(item.id) ? 'opacity-50' : ''}>
              <CardContent className="p-4">
                <div className="flex gap-4">
                  <div className="flex items-start pt-1">
                    <Checkbox
                      checked={selectedItems.has(item.id)}
                      onCheckedChange={() => handleToggleItem(item.id)}
                    />
                  </div>

                  <div className="flex-1 space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="mt-1">
                        {getItemIcon(item.type)}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-sm flex items-center gap-2">
                          {item.content.name || `${item.type} ${index + 1}`}
                          {itemDestinations.has(item.id) && (
                            <CheckCircle className="h-3 w-3 text-green-600" />
                          )}
                        </h4>
                        {item.type === 'page' && item.content.pageNumber && (
                          <p className="text-xs text-muted-foreground">Page {item.content.pageNumber}</p>
                        )}
                      </div>
                    </div>

                    {item.type === 'image' && item.content.dataUrl && (
                      <div className="border rounded overflow-hidden bg-muted/50">
                        <img 
                          src={item.content.dataUrl} 
                          alt={item.content.name}
                          className="max-h-32 object-contain mx-auto"
                        />
                      </div>
                    )}

                    {item.type === 'text' && item.content.text && (
                      <div className="text-xs bg-muted p-2 rounded max-h-20 overflow-y-auto">
                        {item.content.text.slice(0, 200)}
                        {item.content.text.length > 200 && '...'}
                      </div>
                    )}

                    {item.type === 'page' && (
                      <div className="space-y-2">
                        {item.content.dataUrl && (
                          <div className="border rounded overflow-hidden bg-muted/50">
                            <img 
                              src={item.content.dataUrl} 
                              alt={`Page ${item.content.pageNumber}`}
                              className="max-h-32 object-contain mx-auto"
                            />
                          </div>
                        )}
                        {item.content.text && (
                          <div className="text-xs bg-muted p-2 rounded max-h-16 overflow-y-auto">
                            {item.content.text.slice(0, 150)}
                            {item.content.text.length > 150 && '...'}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor={`destination-${item.id}`} className="text-xs">
                        Import to:
                      </Label>
                      <Select
                        value={itemDestinations.get(item.id)?.target || ''}
                        onValueChange={(value) => handleDestinationChange(item.id, value)}
                        disabled={!selectedItems.has(item.id)}
                      >
                        <SelectTrigger id={`destination-${item.id}`} className="h-8 text-xs">
                          <SelectValue placeholder="Select destination..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="company-network">Company Network Diagram</SelectItem>
                          <SelectItem value="nymbis-rdp">Nymbis RDP Cloud</SelectItem>
                          <SelectItem value="branches">Branches</SelectItem>
                          <SelectItem value="tickets">Tickets</SelectItem>
                          <SelectItem value="assets">Assets</SelectItem>
                          <SelectItem value="licenses">Licenses</SelectItem>
                        </SelectContent>
                      </Select>

                      <div className="space-y-1">
                        <Label htmlFor={`notes-${item.id}`} className="text-xs">
                          Notes (optional):
                        </Label>
                        <Input
                          id={`notes-${item.id}`}
                          value={importNotes.get(item.id) || ''}
                          onChange={(e) => handleNotesChange(item.id, e.target.value)}
                          placeholder="Add notes or description..."
                          className="h-8 text-xs"
                          disabled={!selectedItems.has(item.id)}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex gap-2 pt-4 border-t">
          <Button 
            onClick={handleImportSelected} 
            disabled={selectedCount === 0 || destinationCount !== selectedCount || isImporting}
            className="flex-1"
          >
            {isImporting ? 'Importing...' : `Import ${selectedCount} Selected Item${selectedCount !== 1 ? 's' : ''}`}
          </Button>
          <Button onClick={onCancel} variant="outline" disabled={isImporting}>
            Cancel
          </Button>
        </div>

        {selectedCount > 0 && destinationCount !== selectedCount && (
          <div className="flex items-start gap-2 text-sm text-amber-600 bg-amber-50 p-3 rounded">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>
              Please select a destination for all {selectedCount} selected item{selectedCount !== 1 ? 's' : ''} before importing.
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
