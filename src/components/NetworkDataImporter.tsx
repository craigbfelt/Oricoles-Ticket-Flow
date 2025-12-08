import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileUp, FileText, Network, Server, Loader2, CheckCircle, AlertCircle, Image as ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import mammoth from "mammoth";
import * as pdfjsLib from "pdfjs-dist";

interface ExtractedNetworkData {
  servers: Array<{
    name: string;
    type: string;
    ip: string;
    specs: string;
    description: string;
  }>;
  networkDevices: Array<{
    name: string;
    type: string;
    ip: string;
    location: string;
  }>;
  ipAddresses: string[];
  branches: Array<{
    name: string;
    city: string;
  }>;
  rawText: string;
  extractedImages: Array<{
    name: string;
    dataUrl: string;
    width: number;
    height: number;
  }>;
}

interface NetworkDataImporterProps {
  onDataImported?: (data: ExtractedNetworkData) => void;
  targetPage: 'nymbis-cloud' | 'company-network';
}

// Initialize PDF.js worker using local file
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

// Constants for image extraction
const MIN_DIAGRAM_WIDTH = 100;
const MIN_DIAGRAM_HEIGHT = 100;

// Type for PDF.js text content item
interface PdfTextItem {
  str: string;
  dir?: string;
  width?: number;
  height?: number;
  transform?: number[];
  hasEOL?: boolean;
}

// Type for mammoth image
interface MammothImage {
  read: (encoding: string) => Promise<string>;
  contentType: string;
}

export const NetworkDataImporter = ({ onDataImported, targetPage }: NetworkDataImporterProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedNetworkData | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewText, setPreviewText] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const extractNetworkData = (text: string): ExtractedNetworkData => {
    // Extract IP addresses using regex
    const ipRegex = /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g;
    const ipAddresses = [...new Set(text.match(ipRegex) || [])];

    // Extract servers (look for common patterns)
    const serverPatterns = [
      /(?:server|VM|virtual machine)[:\s]+([^\n,]+)/gi,
      /(?:hostname|host)[:\s]+([^\n,]+)/gi,
    ];
    
    const servers: ExtractedNetworkData['servers'] = [];
    const lines = text.split('\n');
    
    // Simple heuristic to find server information
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const lowerLine = line.toLowerCase();
      
      if (lowerLine.includes('server') || lowerLine.includes('vm ') || lowerLine.includes('virtual')) {
        const serverInfo = {
          name: line.replace(/^[\s\-•]+/, '').trim().substring(0, 50),
          type: lowerLine.includes('rdp') ? 'RDP' : 
                lowerLine.includes('ad') || lowerLine.includes('active directory') ? 'Active Directory' :
                lowerLine.includes('rds') ? 'Remote Desktop Services' :
                lowerLine.includes('file') ? 'File Server' : 'Server',
          ip: '',
          specs: '',
          description: ''
        };
        
        // Look for IP in the same line or next few lines
        for (let j = i; j < Math.min(i + 5, lines.length); j++) {
          const ipMatch = lines[j].match(ipRegex);
          if (ipMatch && !serverInfo.ip) {
            serverInfo.ip = ipMatch[0];
          }
          // Look for specs (CPU, RAM, etc.)
          if (lines[j].match(/\d+\s*(vcpu|cpu|core|gb|ram|tb|storage)/i)) {
            serverInfo.specs = lines[j].trim();
          }
        }
        
        if (serverInfo.name.length > 3) {
          servers.push(serverInfo);
        }
      }
    }

    // Extract network devices (routers, switches, firewalls)
    const networkDevices: ExtractedNetworkData['networkDevices'] = [];
    for (const line of lines) {
      const lowerLine = line.toLowerCase();
      if (lowerLine.includes('router') || lowerLine.includes('switch') || 
          lowerLine.includes('firewall') || lowerLine.includes('gateway')) {
        const deviceInfo = {
          name: line.replace(/^[\s\-•]+/, '').trim().substring(0, 50),
          type: lowerLine.includes('router') ? 'Router' :
                lowerLine.includes('switch') ? 'Switch' :
                lowerLine.includes('firewall') ? 'Firewall' :
                lowerLine.includes('gateway') ? 'Gateway' : 'Device',
          ip: '',
          location: ''
        };
        
        const ipMatch = line.match(ipRegex);
        if (ipMatch) {
          deviceInfo.ip = ipMatch[0];
        }
        
        if (deviceInfo.name.length > 3) {
          networkDevices.push(deviceInfo);
        }
      }
    }

    // Extract branches/locations
    const branches: ExtractedNetworkData['branches'] = [];
    const locationPatterns = [
      /(?:branch|office|location|site)[:\s]+([^\n,]+)/gi,
    ];
    
    for (const line of lines) {
      const lowerLine = line.toLowerCase();
      if (lowerLine.includes('branch') || lowerLine.includes('office') || lowerLine.includes('site')) {
        const branchInfo = {
          name: line.replace(/^[\s\-•]+/, '').trim().substring(0, 50),
          city: ''
        };
        
        // Try to extract city
        const cityMatch = line.match(/(?:in|at|located)\s+(\w+(?:\s+\w+)?)/i);
        if (cityMatch) {
          branchInfo.city = cityMatch[1];
        }
        
        if (branchInfo.name.length > 3) {
          branches.push(branchInfo);
        }
      }
    }

    return {
      servers,
      networkDevices,
      ipAddresses,
      branches,
      rawText: text,
      extractedImages: []
    };
  };

  // Helper function to validate file type
  const isValidDocumentFile = (file: File): boolean => {
    const validMimeTypes = [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'text/plain',
      'application/pdf',
    ];
    const validExtensions = ['.docx', '.doc', '.txt', '.pdf'];
    
    const hasValidMimeType = validMimeTypes.includes(file.type);
    const hasValidExtension = validExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
    
    return hasValidMimeType || hasValidExtension;
  };

  // Extract text and images from PDF
  const extractPdfContent = async (file: File): Promise<{ text: string; images: ExtractedNetworkData['extractedImages'] }> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    let fullText = '';
    const images: ExtractedNetworkData['extractedImages'] = [];
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      
      // Extract text
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item) => (item as PdfTextItem).str)
        .join(' ');
      fullText += pageText + '\n';
      
      // Render page to canvas for image extraction
      const scale = 1.5;
      const viewport = page.getViewport({ scale });
      
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (context) {
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        
        await page.render({
          canvasContext: context,
          viewport: viewport,
          canvas: canvas
        }).promise;
        
        // Only save pages that might contain diagrams (based on minimum size)
        if (canvas.width > MIN_DIAGRAM_WIDTH && canvas.height > MIN_DIAGRAM_HEIGHT) {
          images.push({
            name: `Page ${i}`,
            dataUrl: canvas.toDataURL('image/png'),
            width: canvas.width,
            height: canvas.height
          });
        }
      }
    }
    
    return { text: fullText, images };
  };

  // Extract images from Word document
  const extractWordContent = async (file: File): Promise<{ text: string; images: ExtractedNetworkData['extractedImages'] }> => {
    const arrayBuffer = await file.arrayBuffer();
    
    // Extract text
    const textResult = await mammoth.extractRawText({ arrayBuffer });
    
    // Extract images - mammoth can convert images to base64
    // Note: mammoth doesn't provide image dimensions, so we set width/height to 0
    // The images are still usable for display - the browser will render them at natural size
    const images: ExtractedNetworkData['extractedImages'] = [];
    
    try {
      await mammoth.convertToHtml({ 
        arrayBuffer
      }, {
        convertImage: mammoth.images.imgElement((image: MammothImage) => {
          return image.read("base64").then((imageBuffer: string) => {
            const contentType = image.contentType || 'image/png';
            const dataUrl = `data:${contentType};base64,${imageBuffer}`;
            images.push({
              name: `Image ${images.length + 1}`,
              dataUrl,
              // Width/height are unknown from mammoth - browser will use natural dimensions
              width: 0,
              height: 0
            });
            return { src: dataUrl };
          });
        })
      });
    } catch (imageError) {
      console.log('Could not extract images from Word document:', imageError);
    }
    
    return { text: textResult.value, images };
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!isValidDocumentFile(selectedFile)) {
      toast.error("Please upload a Word document (.docx, .doc), PDF (.pdf), or text file (.txt)");
      return;
    }

    setFile(selectedFile);
    setIsProcessing(true);

    try {
      let text = '';
      let extractedImages: ExtractedNetworkData['extractedImages'] = [];
      
      if (selectedFile.name.toLowerCase().endsWith('.pdf')) {
        // Extract text and images from PDF
        const pdfContent = await extractPdfContent(selectedFile);
        text = pdfContent.text;
        extractedImages = pdfContent.images;
      } else if (selectedFile.name.toLowerCase().endsWith('.docx')) {
        // Use mammoth to extract text and images from Word document
        const wordContent = await extractWordContent(selectedFile);
        text = wordContent.text;
        extractedImages = wordContent.images;
      } else if (selectedFile.name.toLowerCase().endsWith('.txt')) {
        text = await selectedFile.text();
      } else {
        // For .doc files, try to read as text (may not work perfectly)
        text = await selectedFile.text();
      }

      setPreviewText(text.substring(0, 2000) + (text.length > 2000 ? '...' : ''));
      
      // Extract network data
      const data = extractNetworkData(text);
      data.extractedImages = extractedImages;
      setExtractedData(data);
      
      const imageMsg = extractedImages.length > 0 ? `, ${extractedImages.length} images` : '';
      toast.success("Document processed successfully", {
        description: `Found ${data.servers.length} servers, ${data.networkDevices.length} devices, ${data.ipAddresses.length} IP addresses${imageMsg}`
      });
    } catch (error) {
      console.error("Error processing document:", error);
      toast.error("Failed to process document");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImport = async () => {
    if (!extractedData) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("You must be logged in to import data");
        return;
      }

      let uploadedImagesCount = 0;

      // Upload extracted images as network diagrams
      if (extractedData.extractedImages && extractedData.extractedImages.length > 0) {
        for (let i = 0; i < extractedData.extractedImages.length; i++) {
          const img = extractedData.extractedImages[i];
          
          try {
            // Convert data URL to blob
            const response = await fetch(img.dataUrl);
            const blob = await response.blob();
            
            // Generate unique filename
            const timestamp = Date.now();
            const randomStr = Math.random().toString(36).substring(7);
            const fileExt = img.dataUrl.includes('image/png') ? 'png' : 'jpeg';
            const fileName = `${timestamp}_${randomStr}_${i}.${fileExt}`;
            
            // Determine storage path based on target page
            const folderPath = targetPage === 'nymbis-cloud' ? 'cloud-networks' : 'company-network';
            const filePath = `${folderPath}/${fileName}`;
            
            // Upload to Supabase Storage
            const { error: uploadError } = await supabase.storage
              .from('diagrams')
              .upload(filePath, blob, {
                metadata: {
                  owner: user.id
                }
              });
            
            if (uploadError) {
              console.error(`Failed to upload image ${i + 1}:`, uploadError);
              continue;
            }
            
            // Create network_diagrams entry
            const diagramName = img.name || `Imported Diagram ${i + 1} - ${new Date().toLocaleDateString()}`;
            const { error: dbError } = await supabase
              .from("network_diagrams")
              .insert({
                name: diagramName,
                image_path: filePath,
                description: `Extracted from imported document`,
                is_company_wide: targetPage === 'company-network',
                branch_id: null,
                created_by: user.id,
              });
            
            if (dbError) {
              console.error(`Failed to create diagram entry for image ${i + 1}:`, dbError);
              continue;
            }
            
            uploadedImagesCount++;
          } catch (imgError) {
            console.error(`Error processing image ${i + 1}:`, imgError);
          }
        }
      }

      // Save extracted data to appropriate tables
      if (extractedData.servers.length > 0 && targetPage === 'nymbis-cloud') {
        // For Nymbis Cloud, save to cloud_networks or a related table
        const { error } = await (supabase as any)
          .from("cloud_networks")
          .insert([{
            name: `Imported Network - ${new Date().toLocaleDateString()}`,
            provider: 'nymbis',
            network_type: 'rdp',
            description: `Imported from document. Contains ${extractedData.servers.length} servers and ${extractedData.networkDevices.length} network devices.`,
            created_by: user.id,
          }])
          .select();
        
        if (error) throw error;
      }

      if (extractedData.networkDevices.length > 0 && targetPage === 'company-network') {
        // For Company Network, save to network_devices
        const devices = extractedData.networkDevices.map(device => ({
          device_name: device.name,
          device_type: device.type.toLowerCase(),
          ip_address: device.ip || null,
          notes: `Imported from document`,
        }));

        const { error } = await (supabase as any)
          .from("network_devices")
          .insert(devices);
        
        if (error) throw error;
      }

      const imageMsg = uploadedImagesCount > 0 ? ` and ${uploadedImagesCount} diagram images` : '';
      toast.success(`Network data imported successfully!`, {
        description: `Imported ${extractedData.servers.length} servers, ${extractedData.networkDevices.length} devices${imageMsg}`
      });
      
      if (onDataImported) {
        onDataImported(extractedData);
      }

      setIsOpen(false);
      setFile(null);
      setExtractedData(null);
      setPreviewText("");
    } catch (error) {
      console.error("Error importing data:", error);
      toast.error("Failed to import network data");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <FileUp className="mr-2 h-4 w-4" />
          Import from Document
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Import Network Data from Document
          </DialogTitle>
          <DialogDescription>
            Upload a Word document (.docx, .doc), PDF (.pdf), or text file containing network information. 
            The system will automatically extract IP addresses, server details, network device information, and any embedded images or diagrams.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* File Upload */}
          <div>
            <Label htmlFor="network-doc">Network Document</Label>
            <div className="flex gap-2 mt-2">
              <Input
                id="network-doc"
                type="file"
                accept=".docx,.doc,.txt,.pdf"
                onChange={handleFileSelect}
                ref={fileInputRef}
                disabled={isProcessing}
              />
              {file && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setFile(null);
                    setExtractedData(null);
                    setPreviewText("");
                    if (fileInputRef.current) {
                      fileInputRef.current.value = '';
                    }
                  }}
                  disabled={isProcessing}
                >
                  Clear
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Supported formats: .docx, .doc, .pdf, .txt (PDFs and Word docs will have images extracted)
            </p>
          </div>

          {isProcessing && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Processing document...
            </div>
          )}

          {/* Extracted Data Preview */}
          {extractedData && (
            <ScrollArea className="h-[400px] rounded-md border p-4">
              <div className="space-y-4">
                {/* Summary */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Extraction Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-4 flex-wrap">
                      <Badge variant="secondary">
                        <Server className="mr-1 h-3 w-3" />
                        {extractedData.servers.length} Servers
                      </Badge>
                      <Badge variant="secondary">
                        <Network className="mr-1 h-3 w-3" />
                        {extractedData.networkDevices.length} Devices
                      </Badge>
                      <Badge variant="secondary">
                        {extractedData.ipAddresses.length} IP Addresses
                      </Badge>
                      <Badge variant="secondary">
                        {extractedData.branches.length} Locations
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                {/* Servers */}
                {extractedData.servers.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Detected Servers</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {extractedData.servers.map((server, idx) => (
                          <div key={idx} className="flex items-center justify-between p-2 bg-muted rounded-md">
                            <div>
                              <p className="font-medium text-sm">{server.name}</p>
                              <p className="text-xs text-muted-foreground">{server.type}</p>
                            </div>
                            {server.ip && (
                              <Badge variant="outline" className="font-mono">
                                {server.ip}
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Network Devices */}
                {extractedData.networkDevices.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Detected Network Devices</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {extractedData.networkDevices.map((device, idx) => (
                          <div key={idx} className="flex items-center justify-between p-2 bg-muted rounded-md">
                            <div>
                              <p className="font-medium text-sm">{device.name}</p>
                              <p className="text-xs text-muted-foreground">{device.type}</p>
                            </div>
                            {device.ip && (
                              <Badge variant="outline" className="font-mono">
                                {device.ip}
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* IP Addresses */}
                {extractedData.ipAddresses.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Detected IP Addresses</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex gap-2 flex-wrap">
                        {extractedData.ipAddresses.slice(0, 20).map((ip, idx) => (
                          <Badge key={idx} variant="outline" className="font-mono">
                            {ip}
                          </Badge>
                        ))}
                        {extractedData.ipAddresses.length > 20 && (
                          <Badge variant="secondary">
                            +{extractedData.ipAddresses.length - 20} more
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Extracted Images */}
                {extractedData.extractedImages && extractedData.extractedImages.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <ImageIcon className="h-4 w-4" />
                        Extracted Images ({extractedData.extractedImages.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {extractedData.extractedImages.map((img, idx) => (
                          <div key={idx} className="border rounded-lg p-2 bg-muted/50">
                            <img 
                              src={img.dataUrl} 
                              alt={img.name}
                              className="w-full h-32 object-contain rounded"
                            />
                            <p className="text-xs text-center mt-1 text-muted-foreground">{img.name}</p>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        These images will be available for use in your network diagrams after import.
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* Raw Text Preview */}
                {previewText && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Document Preview</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Textarea
                        value={previewText}
                        readOnly
                        rows={10}
                        className="font-mono text-xs"
                      />
                    </CardContent>
                  </Card>
                )}
              </div>
            </ScrollArea>
          )}

          {!extractedData && !isProcessing && (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <FileUp className="h-12 w-12 mb-4" />
              <p>Upload a document to extract network data</p>
              <p className="text-sm">Supports Oricol National Network documents</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleImport} disabled={!extractedData || isProcessing}>
            Import {extractedData?.servers.length || 0} Servers, {extractedData?.networkDevices.length || 0} Devices{extractedData?.extractedImages?.length ? `, ${extractedData.extractedImages.length} Images` : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
