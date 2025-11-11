import { useState } from "react";
import { Download, Monitor, Key, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";

const RemoteClientSetup = () => {
  const [registrationToken] = useState(() => `CLIENT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);

  const generatePowerShellScript = () => {
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    
    const script = `# Oricol Remote Support Client Installer
$ErrorActionPreference = "Stop"

Write-Host "Installing Oricol Remote Support Client..." -ForegroundColor Green

# Get system information
$computerName = $env:COMPUTERNAME
$username = $env:USERNAME
$osVersion = (Get-WmiObject -Class Win32_OperatingSystem).Caption
$ipAddress = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.InterfaceAlias -notlike "*Loopback*"} | Select-Object -First 1).IPAddress

# Registration data
$registrationToken = "${registrationToken}"
$registrationData = @{
    registration_token = $registrationToken
    computer_name = $computerName
    username = $username
    os_version = $osVersion
    ip_address = $ipAddress
} | ConvertTo-Json

# Register with helpdesk
Write-Host "Registering with helpdesk..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "https://${projectId}.supabase.co/functions/v1/register-remote-client" -Method POST -Body $registrationData -ContentType "application/json"
    
    Write-Host "Registration successful!" -ForegroundColor Green
    Write-Host "Your registration token: $registrationToken" -ForegroundColor Cyan
} catch {
    Write-Host "Registration failed: $_" -ForegroundColor Red
    exit 1
}

# Create scheduled task for heartbeat
Write-Host "Setting up heartbeat service..." -ForegroundColor Yellow

$heartbeatScriptContent = @'
$registrationToken = "{0}"
$heartbeatData = @{{
    registration_token = $registrationToken
}} | ConvertTo-Json

try {{
    Invoke-RestMethod -Uri "https://{1}.supabase.co/functions/v1/register-remote-client" -Method PUT -Body $heartbeatData -ContentType "application/json" | Out-Null
}} catch {{
    # Silently fail
}}
'@ -f $registrationToken, "${projectId}"

$heartbeatPath = "$env:ProgramData\\OricolRemoteSupport"
New-Item -ItemType Directory -Force -Path $heartbeatPath | Out-Null
$heartbeatScriptContent | Out-File -FilePath "$heartbeatPath\\heartbeat.ps1" -Encoding UTF8

# Create scheduled task (runs every 5 minutes)
$action = New-ScheduledTaskAction -Execute "PowerShell.exe" -Argument "-WindowStyle Hidden -File '$heartbeatPath\\heartbeat.ps1'"
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Minutes 5)
$principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount
Register-ScheduledTask -TaskName "OricolRemoteSupportHeartbeat" -Action $action -Trigger $trigger -Principal $principal -Force | Out-Null

Write-Host ""
Write-Host "==================================" -ForegroundColor Green
Write-Host "Installation Complete!" -ForegroundColor Green
Write-Host "==================================" -ForegroundColor Green
Write-Host ""
Write-Host "Your computer is now registered with the helpdesk." -ForegroundColor White
Write-Host "Support staff can now initiate remote sessions." -ForegroundColor White
Write-Host ""
Write-Host "Registration Token: $registrationToken" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")`;

    return script;
  };

  const generateBatchScript = () => {
    return `@echo off
echo This script requires PowerShell to run.
echo Please run the PowerShell version instead (Install-RemoteSupport.ps1)
pause`;
  };

  const downloadScript = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Remote Support Client Setup</h1>
        <p className="text-muted-foreground">
          Download and install the remote support client to enable helpdesk access
        </p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              <CardTitle>Your Registration Token</CardTitle>
            </div>
            <CardDescription>
              This unique token will be embedded in your installer
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input value={registrationToken} readOnly className="font-mono" />
              <Button
                variant="outline"
                onClick={() => navigator.clipboard.writeText(registrationToken)}
              >
                Copy
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              <CardTitle>Download Installer</CardTitle>
            </div>
            <CardDescription>
              Choose your preferred installation method
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="powershell">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="powershell">PowerShell (Recommended)</TabsTrigger>
                <TabsTrigger value="batch">Batch Script</TabsTrigger>
              </TabsList>
              
              <TabsContent value="powershell" className="space-y-4">
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    PowerShell script with automatic registration and heartbeat service
                  </AlertDescription>
                </Alert>
                
                <Button
                  onClick={() => downloadScript(generatePowerShellScript(), 'Install-RemoteSupport.ps1')}
                  className="w-full"
                  size="lg"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download PowerShell Installer
                </Button>

                <div className="space-y-2">
                  <Label>Installation Instructions:</Label>
                  <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                    <li>Download the PowerShell script</li>
                    <li>Right-click the file and select "Run with PowerShell"</li>
                    <li>If prompted, allow the script to run (you may need administrator privileges)</li>
                    <li>Wait for the installation to complete</li>
                    <li>Your computer will now be registered with the helpdesk</li>
                  </ol>
                </div>
              </TabsContent>

              <TabsContent value="batch" className="space-y-4">
                <Alert>
                  <AlertDescription>
                    Basic batch script - requires PowerShell to be available
                  </AlertDescription>
                </Alert>

                <Button
                  onClick={() => downloadScript(generateBatchScript(), 'Install-RemoteSupport.bat')}
                  className="w-full"
                  size="lg"
                  variant="outline"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download Batch Installer
                </Button>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Monitor className="h-5 w-5" />
              <CardTitle>What Gets Installed?</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
              <div>
                <div className="font-medium">Registration Service</div>
                <div className="text-sm text-muted-foreground">
                  Automatically registers your computer with the helpdesk system
                </div>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
              <div>
                <div className="font-medium">Heartbeat Service</div>
                <div className="text-sm text-muted-foreground">
                  Sends periodic updates to show your computer is online (every 5 minutes)
                </div>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
              <div>
                <div className="font-medium">Remote Access Ready</div>
                <div className="text-sm text-muted-foreground">
                  Enables support staff to initiate remote sessions when needed
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RemoteClientSetup;