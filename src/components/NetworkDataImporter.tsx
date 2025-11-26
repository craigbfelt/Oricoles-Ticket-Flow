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

interface ExtractedImage {
  name: string;
  dataUrl: string;
  width: number;
  height: number;
}

interface DocumentSection {
  id: string;
  sectionNumber: number;
  title: string;
  text: string;
  images: ExtractedImage[];
}

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
  extractedImages: ExtractedImage[];
  sections: DocumentSection[];
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
      extractedImages: [],
      sections: []
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
          viewport: viewport
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

  // Extract images and sections from Word document (keeping text with images)
  const extractWordContent = async (file: File): Promise<{ 
    text: string; 
    images: ExtractedImage[]; 
    sections: DocumentSection[];
  }> => {
    const arrayBuffer = await file.arrayBuffer();
    
    // Extract raw text
    const textResult = await mammoth.extractRawText({ arrayBuffer });
    
    // Extract HTML with images to get the document structure
    const images: ExtractedImage[] = [];
    let imageIndex = 0;
    
    // Track image placeholders in HTML for section extraction
    const imagePlaceholders: Map<string, ExtractedImage> = new Map();
    
    try {
      const htmlResult = await mammoth.convertToHtml({ 
        arrayBuffer,
        convertImage: mammoth.images.imgElement((image: MammothImage) => {
          return image.read("base64").then((imageBuffer: string) => {
            const contentType = image.contentType || 'image/png';
            const dataUrl = `data:${contentType};base64,${imageBuffer}`;
            const imgName = `Image ${++imageIndex}`;
            const imgData: ExtractedImage = {
              name: imgName,
              dataUrl,
              width: 0,
              height: 0
            };
            images.push(imgData);
            // Use a unique placeholder we can find in HTML
            const placeholderId = `__IMG_PLACEHOLDER_${imageIndex}__`;
            imagePlaceholders.set(placeholderId, imgData);
            return { src: placeholderId };
          });
        })
      });
      
      // Parse HTML to create sections (keeping text with images)
      const sections = parseHtmlIntoSections(htmlResult.value, imagePlaceholders);
      
      return { text: textResult.value, images, sections };
    } catch (error) {
      console.log('Could not extract content from Word document:', error);
      return { text: textResult.value, images: [], sections: [] };
    }
  };

  // Parse HTML output into logical sections (keeping text with associated images)
  const parseHtmlIntoSections = (html: string, imagePlaceholders: Map<string, ExtractedImage>): DocumentSection[] => {
    const sections: DocumentSection[] = [];
    
    // Create a DOM parser
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    // Get all child elements of body
    const bodyChildren = Array.from(doc.body.children);
    
    let currentSection: {
      title: string;
      textParts: string[];
      images: ExtractedImage[];
    } = {
      title: '',
      textParts: [],
      images: []
    };
    
    let sectionNumber = 0;
    
    // Function to save current section if it has content
    const saveCurrentSection = () => {
      const text = currentSection.textParts.join('\n').trim();
      if (text || currentSection.images.length > 0) {
        sectionNumber++;
        sections.push({
          id: `section-${sectionNumber}`,
          sectionNumber,
          title: currentSection.title || `Section ${sectionNumber}`,
          text,
          images: [...currentSection.images]
        });
      }
      // Reset for next section
      currentSection = {
        title: '',
        textParts: [],
        images: []
      };
    };
    
    for (const element of bodyChildren) {
      const tagName = element.tagName.toLowerCase();
      const textContent = element.textContent?.trim() || '';
      
      // Check if this element contains an image
      const imgElements = element.querySelectorAll('img');
      const hasImage = imgElements.length > 0;
      
      // If it's a heading, start a new section
      if (tagName.match(/^h[1-6]$/)) {
        saveCurrentSection();
        currentSection.title = textContent;
        continue;
      }
      
      // Check for images in this element
      if (hasImage) {
        imgElements.forEach(img => {
          const src = img.getAttribute('src') || '';
          // Check if this is one of our placeholders
          if (src.startsWith('__IMG_PLACEHOLDER_')) {
            const imgData = imagePlaceholders.get(src);
            if (imgData) {
              currentSection.images.push(imgData);
            }
          }
        });
        
        // Also extract any text in the same element (caption, description, etc.)
        // Remove the placeholder text from content
        let cleanText = textContent;
        imagePlaceholders.forEach((_, placeholder) => {
          cleanText = cleanText.replace(placeholder, '');
        });
        if (cleanText.trim()) {
          currentSection.textParts.push(cleanText.trim());
        }
        
        // After finding images, save as a section (image + surrounding text)
        // This keeps the image with its nearby text
        if (currentSection.images.length > 0) {
          saveCurrentSection();
        }
      } else if (textContent) {
        // Regular text content
        currentSection.textParts.push(textContent);
        
        // If text section gets too long without images, save it as its own section
        const totalText = currentSection.textParts.join('\n');
        if (totalText.length > 1000 && currentSection.images.length === 0) {
          saveCurrentSection();
        }
      }
    }
    
    // Save any remaining content
    saveCurrentSection();
    
    return sections;
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
      let extractedImages: ExtractedImage[] = [];
      let sections: DocumentSection[] = [];
      
      if (selectedFile.name.toLowerCase().endsWith('.pdf')) {
        // Extract text and images from PDF
        const pdfContent = await extractPdfContent(selectedFile);
        text = pdfContent.text;
        extractedImages = pdfContent.images;
        // Create sections from PDF pages (each page is a section)
        sections = pdfContent.images.map((img, index) => ({
          id: `pdf-page-${index + 1}`,
          sectionNumber: index + 1,
          title: `Page ${index + 1}`,
          text: '', // PDF text is extracted as a whole, not per page in current implementation
          images: [img]
        }));
      } else if (selectedFile.name.toLowerCase().endsWith('.docx')) {
        // Use mammoth to extract text, images, and sections from Word document
        const wordContent = await extractWordContent(selectedFile);
        text = wordContent.text;
        extractedImages = wordContent.images;
        sections = wordContent.sections;
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
      data.sections = sections;
      setExtractedData(data);
      
      const imageMsg = extractedImages.length > 0 ? `, ${extractedImages.length} images` : '';
      const sectionMsg = sections.length > 0 ? `, ${sections.length} sections` : '';
      toast.success("Document processed successfully", {
        description: `Found ${data.servers.length} servers, ${data.networkDevices.length} devices, ${data.ipAddresses.length} IP addresses${imageMsg}${sectionMsg}`
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

      let importedSections = 0;
      let importedDevices = 0;

      // Import sections (images with their associated text) as network diagrams
      if (extractedData.sections && extractedData.sections.length > 0) {
        for (const section of extractedData.sections) {
          // Upload each image in the section to storage
          for (const image of section.images) {
            try {
              // Convert data URL to blob
              const response = await fetch(image.dataUrl);
              const blob = await response.blob();
              
              const fileExt = image.name.split('.').pop() || 'png';
              const fileName = `${Date.now()}_section_${section.sectionNumber}_${Math.random().toString(36).substring(7)}.${fileExt}`;
              const storagePath = targetPage === 'nymbis-cloud' 
                ? `nymbis-cloud/${fileName}` 
                : `company-network/${fileName}`;

              // Upload to storage
              const { error: uploadError } = await supabase.storage
                .from('diagrams')
                .upload(storagePath, blob, {
                  metadata: { owner: user.id }
                });

              if (uploadError) {
                console.error('Upload error:', uploadError);
                continue;
              }

              // Create network diagram record with the section's text as description
              const diagramName = section.title !== `Section ${section.sectionNumber}` 
                ? section.title 
                : `Network Diagram - Section ${section.sectionNumber}`;
              
              const { error: dbError } = await (supabase as any)
                .from('network_diagrams')
                .insert({
                  diagram_name: diagramName,
                  diagram_url: storagePath,
                  description: section.text || null,
                  branch_id: null
                });

              if (dbError) {
                console.error('DB error:', dbError);
              } else {
                importedSections++;
              }
            } catch (err) {
              console.error('Error importing section:', err);
            }
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
        importedDevices = devices.length;
      }

      const successMessage = [];
      if (importedSections > 0) successMessage.push(`${importedSections} diagram sections`);
      if (importedDevices > 0) successMessage.push(`${importedDevices} devices`);
      if (extractedData.servers.length > 0) successMessage.push(`${extractedData.servers.length} servers`);

      toast.success("Network data imported successfully!", {
        description: successMessage.length > 0 ? `Imported: ${successMessage.join(', ')}` : undefined
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
                      {extractedData.sections && extractedData.sections.length > 0 && (
                        <Badge variant="default" className="bg-primary">
                          <ImageIcon className="mr-1 h-3 w-3" />
                          {extractedData.sections.length} Sections (with images)
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Sections - Images with their associated text */}
                {extractedData.sections && extractedData.sections.length > 0 && (
                  <Card className="border-primary/50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <ImageIcon className="h-4 w-4 text-primary" />
                        Document Sections (Images with Text)
                      </CardTitle>
                      <p className="text-xs text-muted-foreground">
                        Each section contains an image/diagram with its associated text preserved together
                      </p>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {extractedData.sections.map((section) => (
                          <div key={section.id} className="border rounded-lg p-3 bg-muted/30">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="outline">Section {section.sectionNumber}</Badge>
                              {section.title && section.title !== `Section ${section.sectionNumber}` && (
                                <span className="font-medium text-sm">{section.title}</span>
                              )}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {/* Images */}
                              {section.images.length > 0 && (
                                <div className="space-y-2">
                                  {section.images.map((img, imgIdx) => (
                                    <div key={imgIdx} className="border rounded-lg p-2 bg-white">
                                      <img 
                                        src={img.dataUrl} 
                                        alt={img.name}
                                        className="w-full max-h-48 object-contain rounded"
                                      />
                                      <p className="text-xs text-center mt-1 text-muted-foreground">{img.name}</p>
                                    </div>
                                  ))}
                                </div>
                              )}
                              {/* Associated Text */}
                              {section.text && (
                                <div className="bg-muted p-2 rounded text-xs overflow-y-auto max-h-48">
                                  <p className="font-medium text-muted-foreground mb-1">Associated Text:</p>
                                  <p className="whitespace-pre-wrap">{section.text}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground mt-3">
                        These sections will be imported as network diagrams with their descriptions preserved.
                      </p>
                    </CardContent>
                  </Card>
                )}

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
            Import {extractedData?.sections?.length ? `${extractedData.sections.length} Sections, ` : ''}{extractedData?.servers.length || 0} Servers, {extractedData?.networkDevices.length || 0} Devices
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
