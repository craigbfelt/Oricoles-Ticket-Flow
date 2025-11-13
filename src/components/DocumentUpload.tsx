import { useState, useRef } from "react";
import mammoth from "mammoth";
import * as pdfjsLib from "pdfjs-dist";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileText, Upload, Loader2, CheckCircle, AlertCircle, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";

// Configure PDF.js worker - use local worker file from public directory
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

interface ParsedData {
  text: string;
  tables: Array<{
    headers: string[];
    rows: string[][];
  }>;
  images: Array<{
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

interface DocumentUploadProps {
  onDataParsed?: (data: ParsedData) => void;
  acceptedFormats?: string;
  enableImageExtraction?: boolean;
  enablePageMode?: boolean;
}

export const DocumentUpload = ({ 
  onDataParsed, 
  acceptedFormats = ".docx,.doc,.pdf,image/*",
  enableImageExtraction = true,
  enablePageMode = false
}: DocumentUploadProps) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const extractTablesFromHtml = (html: string): Array<{ headers: string[]; rows: string[][] }> => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const tables = doc.querySelectorAll('table');
    
    const extractedTables: Array<{ headers: string[]; rows: string[][] }> = [];
    
    tables.forEach((table) => {
      const headers: string[] = [];
      const rows: string[][] = [];
      
      // Extract headers
      const headerRow = table.querySelector('thead tr') || table.querySelector('tr');
      if (headerRow) {
        headerRow.querySelectorAll('th, td').forEach((cell) => {
          headers.push(cell.textContent?.trim() || '');
        });
      }
      
      // Extract rows
      const bodyRows = table.querySelectorAll('tbody tr') || table.querySelectorAll('tr');
      bodyRows.forEach((row, index) => {
        // Skip the first row if it was used for headers
        if (index === 0 && !table.querySelector('thead')) {
          return;
        }
        
        const rowData: string[] = [];
        row.querySelectorAll('td, th').forEach((cell) => {
          rowData.push(cell.textContent?.trim() || '');
        });
        
        if (rowData.length > 0) {
          rows.push(rowData);
        }
      });
      
      if (headers.length > 0 || rows.length > 0) {
        extractedTables.push({ headers, rows });
      }
    });
    
    return extractedTables;
  };

  const extractImagesFromWordDoc = async (arrayBuffer: ArrayBuffer): Promise<Array<{name: string; dataUrl: string}>> => {
    const images: Array<{name: string; dataUrl: string}> = [];
    
    try {
      const result = await mammoth.convertToHtml(
        { arrayBuffer },
        {
          convertImage: mammoth.images.imgElement((image) => {
            return image.read("base64").then((imageBuffer) => {
              const base64String = imageBuffer;
              const contentType = image.contentType || 'image/png';
              const dataUrl = `data:${contentType};base64,${base64String}`;
              
              images.push({
                name: `image_${images.length + 1}.${contentType.split('/')[1]}`,
                dataUrl
              });
              
              return { src: dataUrl };
            });
          })
        }
      );
    } catch (error) {
      console.error('Error extracting images from Word doc:', error);
    }
    
    return images;
  };

  const uploadImageToStorage = async (dataUrl: string, fileName: string): Promise<string | null> => {
    try {
      // Convert data URL to blob
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      
      const filePath = `document-images/${Date.now()}_${fileName}`;
      
      const { error } = await supabase.storage
        .from('diagrams')
        .upload(filePath, blob);
      
      if (error) {
        console.error('Error uploading image:', error);
        return null;
      }
      
      return filePath;
    } catch (error) {
      console.error('Error uploading image to storage:', error);
      return null;
    }
  };

  const parsePDF = async (file: File): Promise<{ text: string; images: Array<{name: string; dataUrl: string}>; pages?: Array<{pageNumber: number; text: string; images: Array<{name: string; dataUrl: string}>}> }> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    let fullText = '';
    const images: Array<{name: string; dataUrl: string}> = [];
    const pages: Array<{pageNumber: number; text: string; images: Array<{name: string; dataUrl: string}>}> = [];
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: { str: string }) => item.str).join(' ');
      fullText += pageText + '\n';
      
      // If page mode is enabled, capture page-specific data
      if (enablePageMode) {
        // Render page to canvas to get image
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        
        if (context) {
          await page.render({
            canvasContext: context,
            viewport: viewport
          }).promise;
          
          const pageDataUrl = canvas.toDataURL('image/png');
          
          pages.push({
            pageNumber: i,
            text: pageText.trim(),
            images: [{
              name: `page_${i}.png`,
              dataUrl: pageDataUrl
            }]
          });
        }
      }
    }
    
    return { text: fullText.trim(), images, pages: enablePageMode ? pages : undefined };
  };

  const handleImageFile = async (file: File): Promise<ParsedData> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        resolve({
          text: '',
          tables: [],
          images: [{
            name: file.name,
            dataUrl
          }]
        });
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setIsProcessing(true);

    try {
      // Step 1: Save the original document file to Document Hub
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        try {
          // Generate unique filename for document storage
          const timestamp = Date.now();
          const fileExt = file.name.split('.').pop();
          const storedFilename = `${timestamp}_${file.name}`;
          const documentPath = `documents/${storedFilename}`;

          // Determine category based on file type
          let category = 'general';
          if (file.type.startsWith('image/')) category = 'image';
          else if (file.type === 'application/pdf') category = 'pdf';
          else if (file.type.includes('word')) category = 'word';
          else if (file.type.includes('excel') || file.type.includes('spreadsheet')) category = 'excel';
          else if (file.type.includes('powerpoint') || file.type.includes('presentation')) category = 'powerpoint';

          // Upload the original document to storage
          const { error: uploadError } = await supabase.storage
            .from('documents')
            .upload(documentPath, file);

          if (uploadError) {
            console.error('Error uploading document to storage:', uploadError);
            // Continue with processing even if storage upload fails
          } else {
            // Save document metadata to database
            const { error: dbError } = await supabase
              .from('documents')
              .insert({
                filename: storedFilename,
                original_filename: file.name,
                file_type: file.type,
                file_size: file.size,
                storage_path: documentPath,
                storage_bucket: 'documents',
                category: category,
                description: `Uploaded via Document Import on ${new Date().toLocaleDateString()}`,
                uploaded_by: session.user.id,
              });

            if (dbError) {
              console.error('Error saving document metadata:', dbError);
            } else {
              toast.success('Document saved to Document Hub');
            }
          }
        } catch (error) {
          console.error('Error saving document to hub:', error);
          // Continue with processing even if hub save fails
        }
      }

      // Step 2: Parse the document and extract data
      let parsed: ParsedData;
      
      // Handle different file types
      if (file.type === 'application/pdf') {
        // Parse PDF
        const { text, images, pages } = await parsePDF(file);
        parsed = {
          text,
          tables: [],
          images,
          pages
        };
      } else if (file.type.startsWith('image/')) {
        // Handle direct image upload
        parsed = await handleImageFile(file);
      } else {
        // Handle Word documents
        const arrayBuffer = await file.arrayBuffer();
        
        // Parse the Word document
        const result = await mammoth.convertToHtml({ arrayBuffer });
        const html = result.value;
        
        // Extract text (strip HTML tags)
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        const text = tempDiv.textContent || tempDiv.innerText || '';
        
        // Extract tables
        const tables = extractTablesFromHtml(html);
        
        // Extract images if enabled
        let images: Array<{name: string; dataUrl: string; storagePath?: string}> = [];
        if (enableImageExtraction) {
          images = await extractImagesFromWordDoc(arrayBuffer);
          
          // Upload images to storage
          toast.info('Uploading extracted images...');
          for (const image of images) {
            const storagePath = await uploadImageToStorage(image.dataUrl, image.name);
            if (storagePath) {
              image.storagePath = storagePath;
            }
          }
        }
        
        parsed = {
          text,
          tables,
          images
        };
        
        if (result.messages.length > 0) {
          console.log('Parsing messages:', result.messages);
        }
      }
      
      setParsedData(parsed);
      
      if (onDataParsed) {
        onDataParsed(parsed);
      }
      
      const imageCount = parsed.images?.length || 0;
      const tableCount = parsed.tables?.length || 0;
      
      toast.success('Document parsed successfully', {
        description: `Found ${tableCount} table(s) and ${imageCount} image(s) in the document`
      });
    } catch (error) {
      console.error('Error parsing document:', error);
      toast.error('Failed to parse document', {
        description: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setParsedData(null);
    setFileName("");
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Upload Document or Image
          </CardTitle>
          <CardDescription>
            Upload Word (.docx, .doc), PDF, or image files to extract and analyze data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="document-upload">Select File</Label>
            <div className="flex gap-2">
              <Input
                id="document-upload"
                ref={fileInputRef}
                type="file"
                accept={acceptedFormats}
                onChange={handleFileUpload}
                disabled={isProcessing}
                className="flex-1"
              />
              {parsedData && (
                <Button onClick={handleReset} variant="outline" type="button">
                  Reset
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Supported formats: Word (.docx, .doc), PDF (.pdf), Images (PNG, JPG, JPEG)
            </p>
          </div>

          {isProcessing && (
            <Alert>
              <Loader2 className="h-4 w-4 animate-spin" />
              <AlertTitle>Processing</AlertTitle>
              <AlertDescription>
                Parsing document and extracting images... This may take a moment.
              </AlertDescription>
            </Alert>
          )}

          {parsedData && !isProcessing && (
            <Alert>
              <CheckCircle className="h-4 w-4 text-green-500" />
              <AlertTitle>Success</AlertTitle>
              <AlertDescription>
                Document "{fileName}" parsed successfully. 
                Found {parsedData.tables.length} table(s) and {parsedData.images?.length || 0} image(s).
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {parsedData && (
        <>
          {parsedData.tables.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Extracted Tables</CardTitle>
                <CardDescription>
                  {parsedData.tables.length} table(s) found in the document
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {parsedData.tables.map((table, tableIndex) => (
                  <div key={tableIndex} className="border rounded-lg overflow-hidden">
                    <div className="bg-muted px-3 py-2">
                      <h4 className="font-medium text-sm">Table {tableIndex + 1}</h4>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        {table.headers.length > 0 && (
                          <thead className="bg-muted/50">
                            <tr>
                              {table.headers.map((header, index) => (
                                <th key={index} className="px-3 py-2 text-left font-medium">
                                  {header || `Column ${index + 1}`}
                                </th>
                              ))}
                            </tr>
                          </thead>
                        )}
                        <tbody>
                          {table.rows.map((row, rowIndex) => (
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
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {parsedData.images && parsedData.images.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon className="h-5 w-5" />
                  Extracted Images
                </CardTitle>
                <CardDescription>
                  {parsedData.images.length} image(s) found and uploaded to storage
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {parsedData.images.map((image, index) => (
                    <div key={index} className="border rounded-lg overflow-hidden">
                      <div className="aspect-video bg-muted flex items-center justify-center">
                        <img 
                          src={image.dataUrl} 
                          alt={image.name}
                          className="max-w-full max-h-full object-contain"
                        />
                      </div>
                      <div className="p-2 bg-muted/50">
                        <p className="text-xs font-medium truncate">{image.name}</p>
                        {image.storagePath && (
                          <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
                            <CheckCircle className="h-3 w-3" />
                            Uploaded to storage
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Extracted Text</CardTitle>
              <CardDescription>
                Full text content from the document
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={parsedData.text}
                readOnly
                className="min-h-[200px] font-mono text-sm"
                placeholder="No text content found"
              />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};
