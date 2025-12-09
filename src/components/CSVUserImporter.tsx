import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, X } from "lucide-react";
import { toast } from "sonner";

interface CSVRow {
  email: string;
  display_name?: string;
  vpn_username?: string;
  rdp_username?: string;
  job_title?: string;
  department?: string;
  branch?: string;
  notes?: string;
}

interface ValidationError {
  row: number;
  field: string;
  message: string;
}

interface ImportPreview {
  validRows: CSVRow[];
  errors: ValidationError[];
  totalRows: number;
}

export function CSVUserImporter() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const parseCSV = (text: string): CSVRow[] => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) return []; // Need at least header + 1 row

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const rows: CSVRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const row: any = {};
      
      headers.forEach((header, index) => {
        if (values[index]) {
          row[header] = values[index];
        }
      });

      rows.push(row as CSVRow);
    }

    return rows;
  };

  const validateRows = (rows: CSVRow[]): ImportPreview => {
    const validRows: CSVRow[] = [];
    const errors: ValidationError[] = [];

    rows.forEach((row, index) => {
      const rowNumber = index + 2; // +2 because: +1 for header, +1 for 0-based index

      // Check required field: email
      if (!row.email) {
        errors.push({
          row: rowNumber,
          field: 'email',
          message: 'Email is required'
        });
        return;
      }

      // Validate email format
      if (!validateEmail(row.email)) {
        errors.push({
          row: rowNumber,
          field: 'email',
          message: 'Invalid email format'
        });
        return;
      }

      // Check for @afripipes.co.za domain
      if (!row.email.toLowerCase().endsWith('@afripipes.co.za')) {
        errors.push({
          row: rowNumber,
          field: 'email',
          message: 'Email must be @afripipes.co.za domain'
        });
        return;
      }

      // If all validations pass, add to valid rows
      validRows.push(row);
    });

    return {
      validRows,
      errors,
      totalRows: rows.length
    };
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.csv')) {
      toast.error('Please select a CSV file');
      return;
    }

    setFile(selectedFile);
    setPreview(null);
    setIsProcessing(true);

    try {
      const text = await selectedFile.text();
      const rows = parseCSV(text);
      const validation = validateRows(rows);
      setPreview(validation);

      if (validation.errors.length === 0) {
        toast.success(`File validated successfully! ${validation.validRows.length} users ready to import.`);
      } else {
        toast.warning(`File validated with ${validation.errors.length} errors. Please review before importing.`);
      }
    } catch (error) {
      console.error('Error parsing CSV:', error);
      toast.error('Error parsing CSV file. Please check the format.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImport = async () => {
    if (!preview || preview.validRows.length === 0) {
      toast.error('No valid rows to import');
      return;
    }

    setIsImporting(true);

    try {
      // Get current user ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('You must be logged in to import users');
        return;
      }

      // Get tenant ID from user's profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('user_id', user.id)
        .single();

      const tenantId = profile?.tenant_id || '00000000-0000-0000-0000-000000000001';

      // Prepare rows for insertion
      const usersToInsert = preview.validRows.map(row => ({
        email: row.email.toLowerCase(),
        display_name: row.display_name || null,
        job_title: row.job_title || null,
        department: row.department || null,
        vpn_username: row.vpn_username || null,
        rdp_username: row.rdp_username || null,
        notes: row.notes || null,
        source: 'csv_import',
        is_active: true,
        imported_at: new Date().toISOString(),
        imported_by: user.id,
        tenant_id: tenantId
      }));

      // Insert users into master_user_list
      const { data, error } = await supabase
        .from('master_user_list')
        .upsert(usersToInsert, {
          onConflict: 'email',
          ignoreDuplicates: false
        })
        .select();

      if (error) {
        console.error('Error importing users:', error);
        toast.error(`Failed to import users: ${error.message}`);
        return;
      }

      toast.success(`Successfully imported ${data?.length || 0} users!`);
      
      // Reset form
      setFile(null);
      setPreview(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

    } catch (error) {
      console.error('Error during import:', error);
      toast.error('An error occurred during import');
    } finally {
      setIsImporting(false);
    }
  };

  const handleClear = () => {
    setFile(null);
    setPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5" />
          Import Users from CSV
        </CardTitle>
        <CardDescription>
          Import users from RDP/VPN spreadsheets. The CSV file should include columns: email, display_name, vpn_username, rdp_username, job_title, department, branch, notes.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* File Upload Section */}
        <div className="space-y-2">
          <Label htmlFor="csv-file">Select CSV File</Label>
          <div className="flex gap-2">
            <Input
              id="csv-file"
              type="file"
              accept=".csv"
              ref={fileInputRef}
              onChange={handleFileChange}
              disabled={isProcessing || isImporting}
            />
            {file && (
              <Button
                variant="outline"
                size="icon"
                onClick={handleClear}
                disabled={isProcessing || isImporting}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* CSV Format Example */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>CSV Format</AlertTitle>
          <AlertDescription>
            <pre className="text-xs mt-2 p-2 bg-muted rounded">
              email,display_name,vpn_username,rdp_username,job_title,department,branch,notes{'\n'}
              user@afripipes.co.za,John Doe,jdoe_vpn,jdoe_rdp,Manager,IT,Head Office,
            </pre>
          </AlertDescription>
        </Alert>

        {/* Preview Section */}
        {preview && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Badge variant={preview.errors.length === 0 ? "default" : "destructive"}>
                  {preview.validRows.length} Valid Rows
                </Badge>
                {preview.errors.length > 0 && (
                  <Badge variant="outline">
                    {preview.errors.length} Errors
                  </Badge>
                )}
              </div>
              {preview.validRows.length > 0 && preview.errors.length === 0 && (
                <Button
                  onClick={handleImport}
                  disabled={isImporting}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  {isImporting ? 'Importing...' : 'Import Users'}
                </Button>
              )}
            </div>

            {/* Valid Rows Preview */}
            {preview.validRows.length > 0 && (
              <Alert>
                <CheckCircle className="h-4 w-4 text-green-500" />
                <AlertTitle>Ready to Import</AlertTitle>
                <AlertDescription>
                  <div className="mt-2 space-y-1">
                    {preview.validRows.slice(0, 5).map((row, index) => (
                      <div key={index} className="text-xs">
                        • {row.display_name || 'No Name'} ({row.email})
                      </div>
                    ))}
                    {preview.validRows.length > 5 && (
                      <div className="text-xs text-muted-foreground">
                        ...and {preview.validRows.length - 5} more
                      </div>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Errors List */}
            {preview.errors.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Validation Errors</AlertTitle>
                <AlertDescription>
                  <div className="mt-2 space-y-1 max-h-48 overflow-y-auto">
                    {preview.errors.map((error, index) => (
                      <div key={index} className="text-xs">
                        Row {error.row}, {error.field}: {error.message}
                      </div>
                    ))}
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
