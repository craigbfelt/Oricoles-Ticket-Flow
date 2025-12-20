<#
.SYNOPSIS
    Prepare Oricol Endpoint Monitoring Agent for Intune Deployment
    
.DESCRIPTION
    This script automates the preparation of the Oricol Endpoint Monitoring Agent
    for deployment via Microsoft Intune. It validates configuration, downloads
    required tools (NSSM), and packages everything using the Win32 Content Prep Tool.
    
.PARAMETER SupabaseUrl
    Your Supabase project URL (e.g., https://yourproject.supabase.co)
    
.PARAMETER SupabaseAnonKey
    Your Supabase anonymous/public API key
    
.PARAMETER AgentToken
    Secure agent authentication token
    
.PARAMETER OutputPath
    Directory where the .intunewin package will be created
    
.PARAMETER SkipNSSM
    Skip downloading NSSM (use if already present)
    
.PARAMETER IntuneWinAppUtilPath
    Path to IntuneWinAppUtil.exe (if not in PATH)
    
.EXAMPLE
    .\Prepare-IntunePackage.ps1 -SupabaseUrl "https://xyz.supabase.co" -SupabaseAnonKey "key123" -AgentToken "token123" -OutputPath "C:\Packages"
    
.NOTES
    Version: 1.0.0
    Author: Oricol IT Solutions
    Requires: Administrator privileges, Internet connection
#>

param(
    [Parameter(Mandatory=$true)]
    [string]$SupabaseUrl,
    
    [Parameter(Mandatory=$true)]
    [string]$SupabaseAnonKey,
    
    [Parameter(Mandatory=$true)]
    [string]$AgentToken,
    
    [Parameter(Mandatory=$false)]
    [string]$OutputPath = "$PSScriptRoot\..\..\intune-packages",
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipNSSM,
    
    [Parameter(Mandatory=$false)]
    [string]$IntuneWinAppUtilPath = ""
)

$ErrorActionPreference = 'Stop'

# Colors for output
function Write-Success { param([string]$Message) Write-Host "✓ $Message" -ForegroundColor Green }
function Write-Info { param([string]$Message) Write-Host "ℹ $Message" -ForegroundColor Cyan }
function Write-Warning { param([string]$Message) Write-Host "⚠ $Message" -ForegroundColor Yellow }
function Write-Error { param([string]$Message) Write-Host "✗ $Message" -ForegroundColor Red }

Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  Oricol Endpoint Agent - Intune Package Preparation       ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

# Step 1: Validate environment
Write-Info "Step 1: Validating environment..."

# Check if running as administrator
$currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Error "This script must be run as Administrator"
    exit 1
}
Write-Success "Running with administrator privileges"

# Check PowerShell version
if ($PSVersionTable.PSVersion.Major -lt 5) {
    Write-Error "PowerShell 5.1 or later required"
    exit 1
}
Write-Success "PowerShell version: $($PSVersionTable.PSVersion)"

# Step 2: Prepare directories
Write-Info "`nStep 2: Preparing directories..."

$agentPath = Join-Path $PSScriptRoot ".."
$stagingPath = Join-Path $env:TEMP "OricolAgent-Staging-$(Get-Date -Format 'yyyyMMdd-HHmmss')"

New-Item -ItemType Directory -Path $stagingPath -Force | Out-Null
New-Item -ItemType Directory -Path $OutputPath -Force | Out-Null

Write-Success "Staging directory: $stagingPath"
Write-Success "Output directory: $OutputPath"

# Step 3: Copy agent files
Write-Info "`nStep 3: Copying agent files..."

$filesToCopy = @(
    "OricolEndpointAgent.ps1",
    "Generate-AgentTokens.ps1",
    "README.md",
    "QUICK_START.md"
)

foreach ($file in $filesToCopy) {
    $source = Join-Path $agentPath $file
    if (Test-Path $source) {
        Copy-Item -Path $source -Destination $stagingPath -Force
        Write-Success "Copied $file"
    } else {
        Write-Warning "File not found: $file"
    }
}

# Copy intune helper scripts
$intuneSourcePath = Join-Path $agentPath "intune"
$intuneDestPath = Join-Path $stagingPath "intune"
if (Test-Path $intuneSourcePath) {
    Copy-Item -Path $intuneSourcePath -Destination $stagingPath -Recurse -Force
    Write-Success "Copied Intune helper scripts"
}

# Step 4: Create configuration file
Write-Info "`nStep 4: Creating configuration file..."

$config = @{
    SupabaseUrl = $SupabaseUrl
    SupabaseAnonKey = $SupabaseAnonKey
    AgentToken = $AgentToken
    CollectionIntervalMinutes = 5
    EnableAutoPatching = $false
    EnableZeroTrustBlocking = $false
    LogLevel = "Info"
}

$configJson = $config | ConvertTo-Json -Depth 10
$configPath = Join-Path $stagingPath "config.json"
Set-Content -Path $configPath -Value $configJson
Write-Success "Configuration file created"

# Step 5: Download NSSM if needed
if (-not $SkipNSSM) {
    Write-Info "`nStep 5: Downloading NSSM (Non-Sucking Service Manager)..."
    
    $nssmPath = Join-Path $stagingPath "nssm.exe"
    
    if (Test-Path $nssmPath) {
        Write-Success "NSSM already present"
    } else {
        try {
            $nssmUrl = "https://nssm.cc/release/nssm-2.24.zip"
            $nssmZip = Join-Path $env:TEMP "nssm.zip"
            $nssmExtract = Join-Path $env:TEMP "nssm-extract"
            
            Write-Info "Downloading NSSM from $nssmUrl..."
            Invoke-WebRequest -Uri $nssmUrl -OutFile $nssmZip -UseBasicParsing
            
            Write-Info "Extracting NSSM..."
            Expand-Archive -Path $nssmZip -DestinationPath $nssmExtract -Force
            
            # Copy 64-bit version
            $nssm64 = Get-ChildItem -Path $nssmExtract -Filter "nssm.exe" -Recurse | Where-Object { $_.FullName -like "*win64*" } | Select-Object -First 1
            
            if ($nssm64) {
                Copy-Item -Path $nssm64.FullName -Destination $nssmPath
                Write-Success "NSSM downloaded and extracted"
            } else {
                Write-Warning "Could not find 64-bit NSSM. You may need to add it manually."
            }
            
            # Cleanup
            Remove-Item -Path $nssmZip -Force -ErrorAction SilentlyContinue
            Remove-Item -Path $nssmExtract -Recurse -Force -ErrorAction SilentlyContinue
            
        } catch {
            Write-Warning "Failed to download NSSM automatically: $($_.Exception.Message)"
            Write-Warning "Please download NSSM manually from https://nssm.cc and place nssm.exe in $stagingPath"
        }
    }
} else {
    Write-Info "`nStep 5: Skipping NSSM download (as requested)"
}

# Step 6: Find or validate IntuneWinAppUtil
Write-Info "`nStep 6: Locating IntuneWinAppUtil.exe..."

if ($IntuneWinAppUtilPath -and (Test-Path $IntuneWinAppUtilPath)) {
    $intuneWinUtil = $IntuneWinAppUtilPath
    Write-Success "Using provided IntuneWinAppUtil: $intuneWinUtil"
} else {
    # Try to find in PATH
    $intuneWinUtil = Get-Command "IntuneWinAppUtil.exe" -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source
    
    if ($intuneWinUtil) {
        Write-Success "Found IntuneWinAppUtil in PATH: $intuneWinUtil"
    } else {
        Write-Warning "IntuneWinAppUtil.exe not found!"
        Write-Host "`nPlease download the Microsoft Win32 Content Prep Tool from:" -ForegroundColor Yellow
        Write-Host "https://github.com/microsoft/Microsoft-Win32-Content-Prep-Tool/releases" -ForegroundColor Yellow
        Write-Host "`nThen run this script again with -IntuneWinAppUtilPath parameter" -ForegroundColor Yellow
        Write-Host "OR place IntuneWinAppUtil.exe in your PATH`n" -ForegroundColor Yellow
        
        Write-Host "Package preparation completed. Staging directory: $stagingPath" -ForegroundColor Cyan
        Write-Host "When you have IntuneWinAppUtil.exe, run:" -ForegroundColor Cyan
        Write-Host "  .\IntuneWinAppUtil.exe -c `"$stagingPath`" -s `"OricolEndpointAgent.ps1`" -o `"$OutputPath`" -q`n" -ForegroundColor White
        exit 0
    }
}

# Step 7: Create .intunewin package
Write-Info "`nStep 7: Creating .intunewin package..."

try {
    $arguments = @(
        "-c", "`"$stagingPath`"",
        "-s", "`"OricolEndpointAgent.ps1`"",
        "-o", "`"$OutputPath`"",
        "-q"
    )
    
    Write-Info "Running: $intuneWinUtil $($arguments -join ' ')"
    
    $process = Start-Process -FilePath $intuneWinUtil -ArgumentList $arguments -Wait -NoNewWindow -PassThru
    
    if ($process.ExitCode -eq 0) {
        Write-Success "Package created successfully!"
        
        $intunewinFile = Get-ChildItem -Path $OutputPath -Filter "*.intunewin" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
        
        if ($intunewinFile) {
            Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor Green
            Write-Host "║                  PACKAGE READY FOR DEPLOYMENT              ║" -ForegroundColor Green
            Write-Host "╚════════════════════════════════════════════════════════════╝`n" -ForegroundColor Green
            
            Write-Host "Package Location:" -ForegroundColor Cyan
            Write-Host "  $($intunewinFile.FullName)`n" -ForegroundColor White
            
            Write-Host "Package Size:" -ForegroundColor Cyan
            Write-Host "  $([math]::Round($intunewinFile.Length / 1KB, 2)) KB`n" -ForegroundColor White
            
            Write-Host "Next Steps:" -ForegroundColor Cyan
            Write-Host "  1. Go to Microsoft Intune Admin Center (https://endpoint.microsoft.com)" -ForegroundColor White
            Write-Host "  2. Navigate to Apps > Windows > Add > Windows app (Win32)" -ForegroundColor White
            Write-Host "  3. Upload the .intunewin file created above" -ForegroundColor White
            Write-Host "  4. Configure install command:" -ForegroundColor White
            Write-Host "     powershell.exe -ExecutionPolicy Bypass -WindowStyle Hidden -File `"OricolEndpointAgent.ps1`" -Install" -ForegroundColor Gray
            Write-Host "  5. Configure detection rule: Service 'OricolEndpointAgent' exists and is running" -ForegroundColor White
            Write-Host "  6. Assign to your target groups and deploy!`n" -ForegroundColor White
        }
    } else {
        Write-Error "Package creation failed with exit code: $($process.ExitCode)"
        exit 1
    }
    
} catch {
    Write-Error "Failed to create package: $($_.Exception.Message)"
    exit 1
}

# Cleanup staging directory
Write-Info "Cleaning up staging directory..."
Remove-Item -Path $stagingPath -Recurse -Force -ErrorAction SilentlyContinue

Write-Success "Preparation complete!`n"
