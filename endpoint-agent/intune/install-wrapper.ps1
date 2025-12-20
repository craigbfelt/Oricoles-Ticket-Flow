<#
.SYNOPSIS
    Installation wrapper script for Intune deployment
    
.DESCRIPTION
    This script serves as a wrapper for the main OricolEndpointAgent.ps1 script
    to ensure proper silent installation via Intune. It handles logging and 
    error management specifically for Intune deployment scenarios.
    
.NOTES
    Version: 1.0.0
    Author: Oricol IT Solutions
    Usage: Called by Intune as the install command
#>

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet('Install', 'Uninstall')]
    [string]$Action = 'Install'
)

# Set error action preference
$ErrorActionPreference = 'Stop'

# Log file for installation
$logPath = "$env:ProgramData\Oricol\EndpointAgent\Logs"
if (-not (Test-Path $logPath)) {
    New-Item -ItemType Directory -Path $logPath -Force | Out-Null
}
$logFile = Join-Path $logPath "intune-install-$(Get-Date -Format 'yyyyMMdd-HHmmss').log"

function Write-InstallLog {
    param([string]$Message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "[$timestamp] $Message"
    Add-Content -Path $logFile -Value $logMessage
}

try {
    Write-InstallLog "=== Intune Installation Started ==="
    Write-InstallLog "Action: $Action"
    Write-InstallLog "Script Location: $PSScriptRoot"
    Write-InstallLog "User: $env:USERNAME"
    Write-InstallLog "Computer: $env:COMPUTERNAME"
    
    # Locate the main agent script - try multiple possible locations
    $possiblePaths = @(
        (Join-Path $PSScriptRoot "..\OricolEndpointAgent.ps1"),  # Parent directory (normal structure)
        (Join-Path $PSScriptRoot "OricolEndpointAgent.ps1"),     # Same directory
        ".\OricolEndpointAgent.ps1",                              # Current directory
        (Join-Path $PWD "OricolEndpointAgent.ps1")               # Working directory
    )
    
    $agentScript = $null
    foreach ($path in $possiblePaths) {
        Write-InstallLog "Checking for agent script at: $path"
        if (Test-Path $path) {
            $agentScript = $path
            Write-InstallLog "Agent script found: $agentScript"
            break
        }
    }
    
    if (-not $agentScript) {
        $searchedPaths = $possiblePaths -join "`n  "
        throw "OricolEndpointAgent.ps1 not found. Searched locations:`n  $searchedPaths"
    }
    
    # Execute the main agent script
    if ($Action -eq 'Install') {
        Write-InstallLog "Executing installation..."
        & $agentScript -Install
        $exitCode = $LASTEXITCODE
        
        # Wait a moment for service to start
        Start-Sleep -Seconds 2
        
        # Verify installation
        $service = Get-Service -Name "OricolEndpointAgent" -ErrorAction SilentlyContinue
        if ($service -and $service.Status -eq 'Running') {
            Write-InstallLog "Installation successful. Service is running."
            Write-InstallLog "=== Installation Completed Successfully ==="
            exit 0
        } else {
            Write-InstallLog "WARNING: Service not running after installation"
            Write-InstallLog "Service status: $($service.Status)"
            exit 1
        }
    } else {
        Write-InstallLog "Executing uninstallation..."
        & $agentScript -Uninstall
        Write-InstallLog "=== Uninstallation Completed Successfully ==="
        exit 0
    }
    
} catch {
    Write-InstallLog "ERROR: $($_.Exception.Message)"
    Write-InstallLog "Stack Trace: $($_.ScriptStackTrace)"
    Write-InstallLog "=== Installation Failed ==="
    exit 1
}
