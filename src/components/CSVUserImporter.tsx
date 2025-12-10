import { useState, useRef } from "react";
import Papa from "papaparse";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, X, Download } from "lucide-react";
import { toast } from "sonner";

// Get allowed email domain from environment or use default
const ALLOWED_EMAIL_DOMAIN = import.meta.env.VITE_ALLOWED_EMAIL_DOMAIN || '@afripipes.co.za';

interface CSVRow {
  full_name?: string;
  display_name?: string;
  device_serial_number?: string;
  vpn_username?: string;
  vpn_password?: string;
  rdp_username?: string;
  rdp_password?: string;
  "365_username"?: string;
  "365 password"?: string;
  branch?: string;
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

interface CredentialInsert {
  username: string;
  password: string;
  service_type: 'VPN' | 'RDP' | 'M365';
  email: string;
  notes: string;
  tenant_id?: string;
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
    const result = Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim().toLowerCase(),
      transform: (value) => value.trim(), // Trim all cell values to handle whitespace
    });

    if (result.errors.length > 0) {
      console.error('CSV parsing errors:', result.errors);
      toast.error('CSV parsing encountered errors. Please check the file format.');
    }

    return result.data as CSVRow[];
  };

  const validateRows = (rows: CSVRow[]): ImportPreview => {
    const validRows: CSVRow[] = [];
    const errors: ValidationError[] = [];

    rows.forEach((row, index) => {
      const rowNumber = index + 2; // +2 because: +1 for header, +1 for 0-based index

      // Check required field: 365_username (this is the email)
      // Note: Values are already trimmed by parseCSV transform
      if (!row["365_username"]) {
        errors.push({
          row: rowNumber,
          field: '365_username',
          message: '365_username is required'
        });
        return;
      }

      // Validate email format
      if (!validateEmail(row["365_username"])) {
        errors.push({
          row: rowNumber,
          field: '365_username',
          message: 'Invalid email format for 365_username'
        });
        return;
      }

      // Check for allowed email domain
      if (!row["365_username"].toLowerCase().endsWith(ALLOWED_EMAIL_DOMAIN)) {
        errors.push({
          row: rowNumber,
          field: '365_username',
          message: `365_username must use ${ALLOWED_EMAIL_DOMAIN} domain`
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
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('user_id', user.id)
        .single();

      if (profileError || !profile?.tenant_id) {
        console.error('Error fetching tenant ID:', profileError);
        toast.error('Unable to determine your tenant. Please contact support.');
        return;
      }

      const tenantId = profile.tenant_id;

      // Prepare rows for insertion
      const usersToInsert = preview.validRows.map(row => ({
        email: row["365_username"]!.toLowerCase(),
        display_name: row.display_name || row.full_name || null,
        job_title: null,
        department: null,
        vpn_username: row.vpn_username || null,
        rdp_username: row.rdp_username || null,
        notes: null,
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

      // Create device assignments for rows with device serial numbers
      const deviceAssignments = preview.validRows
        .filter(row => row.device_serial_number && row.device_serial_number.trim())
        .map(row => ({
          device_serial_number: row.device_serial_number!.trim(),
          user_email: row["365_username"]!.toLowerCase(),
          device_name: row.display_name || row.full_name || null,
          assignment_source: 'csv_import',
          is_current: true,
          tenant_id: tenantId,
          assignment_date: new Date().toISOString()
        }));

      if (deviceAssignments.length > 0) {
        // First, mark existing assignments for these serial numbers as not current
        const serialNumbers = deviceAssignments.map(d => d.device_serial_number);
        const { error: updateError } = await supabase
          .from('device_user_assignments')
          .update({ is_current: false })
          .in('device_serial_number', serialNumbers)
          .eq('tenant_id', tenantId)
          .eq('is_current', true);

        if (updateError) {
          console.error('Error updating existing device assignments:', updateError);
          toast.warning(`Users imported, but failed to update existing device assignments: ${updateError.message}`);
        } else {
          // Only insert new assignments if update succeeded
          const { error: deviceError } = await supabase
            .from('device_user_assignments')
            .insert(deviceAssignments);

          if (deviceError) {
            console.error('Error creating device assignments:', deviceError);
            toast.warning(`Users imported, but some device assignments failed: ${deviceError.message}`);
          }
        }
      }

      // Insert VPN and RDP credentials
      const credentialsToInsert: CredentialInsert[] = [];
      
      preview.validRows.forEach(row => {
        const userEmail = row["365_username"]!.toLowerCase();
        
        // Add VPN credentials if provided
        if (row.vpn_username && row.vpn_password) {
          credentialsToInsert.push({
            username: row.vpn_username,
            password: row.vpn_password,
            service_type: 'VPN',
            email: userEmail,
            notes: `Imported from CSV on ${new Date().toISOString()}`,
            tenant_id: tenantId
          });
        }
        
        // Add RDP credentials if provided
        if (row.rdp_username && row.rdp_password) {
          credentialsToInsert.push({
            username: row.rdp_username,
            password: row.rdp_password,
            service_type: 'RDP',
            email: userEmail,
            notes: `Imported from CSV on ${new Date().toISOString()}`,
            tenant_id: tenantId
          });
        }

        // Add M365 credentials if provided
        if (row["365_username"] && row["365 password"]) {
          credentialsToInsert.push({
            username: row["365_username"],
            password: row["365 password"],
            service_type: 'M365',
            email: userEmail,
            notes: `Imported from CSV on ${new Date().toISOString()}`,
            tenant_id: tenantId
          });
        }
      });

      if (credentialsToInsert.length > 0) {
        const { error: credError } = await supabase
          .from('vpn_rdp_credentials')
          .insert(credentialsToInsert);

        if (credError) {
          console.error('Error creating credentials:', credError);
          toast.warning(`Users imported, but some credentials failed: ${credError.message}`);
        }
      }

      // Final success message
      let successMessage = `Successfully imported ${data?.length || 0} users`;
      if (deviceAssignments.length > 0) {
        successMessage += `, ${deviceAssignments.length} device assignments`;
      }
      if (credentialsToInsert.length > 0) {
        successMessage += `, ${credentialsToInsert.length} credentials`;
      }
      successMessage += '!';
      toast.success(successMessage);
      
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

  const downloadTemplate = () => {
    // Define the template data with headers and example rows
    const templateData = [
      {
        full_name: 'John Doe',
        display_name: 'John Doe',
        device_serial_number: 'SN123456789',
        vpn_username: 'jdoe_vpn',
        vpn_password: 'VPN@Password123',
        rdp_username: 'jdoe_rdp',
        rdp_password: 'RDP@Password123',
        '365_username': 'john.doe@afripipes.co.za',
        '365 password': 'M365@Password123',
        branch: 'Head Office'
      },
      {
        full_name: 'Jane Smith',
        display_name: 'Jane Smith',
        device_serial_number: 'SN987654321',
        vpn_username: 'jsmith_vpn',
        vpn_password: 'VPN@Password456',
        rdp_username: 'jsmith_rdp',
        rdp_password: 'RDP@Password456',
        '365_username': 'jane.smith@afripipes.co.za',
        '365 password': 'M365@Password456',
        branch: 'Branch 1'
      }
    ];

    // Convert to CSV using PapaParse
    const csv = Papa.unparse(templateData, {
      quotes: false,
      header: true
    });

    // Create a blob and download link
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', 'user_import_template.csv');
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Revoke the blob URL to prevent memory leaks
    URL.revokeObjectURL(url);

    toast.success('Template downloaded successfully!');
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Import Users from CSV
            </CardTitle>
            <CardDescription>
              Import users from RDP/VPN spreadsheets. The CSV file should include columns: full_name, display_name, device_serial_number, vpn_username, vpn_password, rdp_username, rdp_password, 365_username, 365_password, branch. Device serial number serves as the unique identifier across the system.
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={downloadTemplate}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Download Template
          </Button>
        </div>
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
              full_name,display_name,device_serial_number,vpn_username,vpn_password,rdp_username,rdp_password,365_username,365 password,branch{'\n'}
              John Doe,John Doe,SN123456789,jdoe_vpn,VPN@Pass123,jdoe_rdp,RDP@Pass123,john.doe@afripipes.co.za,M365@Pass123,Head Office
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
                        • {row.display_name || row.full_name || 'No Name'} ({row["365_username"]})
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
