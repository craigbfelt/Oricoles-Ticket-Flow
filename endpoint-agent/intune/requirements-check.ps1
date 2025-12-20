<#
.SYNOPSIS
    System requirements check for Oricol Endpoint Monitoring Agent
    
.DESCRIPTION
    This script checks if the target system meets the minimum requirements
    for installing the Oricol Endpoint Monitoring Agent.
    
    Requirements:
    - Windows 10 version 1809 or later (or Windows 11)
    - Windows Server 2016 or later
    - PowerShell 5.1 or later
    - At least 100 MB free disk space
    - Administrator privileges
    
    Exit Codes:
    - 0: All requirements met
    - 1: One or more requirements not met
    
.NOTES
    Version: 1.0.0
    Author: Oricol IT Solutions
    Usage: Deploy as requirement script in Intune Win32 app configuration
#>

$ErrorActionPreference = 'Stop'

try {
    # Check Windows version
    $osInfo = Get-CimInstance -ClassName Win32_OperatingSystem
    $osVersion = [System.Version]$osInfo.Version
    $osBuild = $osInfo.BuildNumber
    
    # Minimum build numbers:
    # Windows 10 1809 (client) = build 17763
    # Windows Server 2016 RTM = build 14393
    $minClientBuild = 17763
    $minServerBuild = 14393
    
    $isServer = $osInfo.ProductType -ne 1
    
    if ($isServer) {
        if ($osBuild -lt $minServerBuild) {
            Write-Output "Windows Server 2016 or later required. Current build: $osBuild"
            exit 1
        }
    } else {
        if ($osBuild -lt $minClientBuild) {
            Write-Output "Windows 10 version 1809 or later required. Current build: $osBuild"
            exit 1
        }
    }
    
    # Check PowerShell version
    $psVersion = $PSVersionTable.PSVersion
    if ($psVersion.Major -lt 5 -or ($psVersion.Major -eq 5 -and $psVersion.Minor -lt 1)) {
        Write-Output "PowerShell 5.1 or later required. Current version: $($psVersion.ToString())"
        exit 1
    }
    
    # Check available disk space on system drive
    $systemDrive = $env:SystemDrive
    $drive = Get-PSDrive -Name $systemDrive.Trim(':')
    $freeSpaceMB = [math]::Round($drive.Free / 1MB, 2)
    
    if ($freeSpaceMB -lt 100) {
        Write-Output "At least 100 MB free disk space required. Available: $freeSpaceMB MB"
        exit 1
    }
    
    # Check if running with administrator privileges
    $currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
    $isAdmin = $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
    
    if (-not $isAdmin) {
        Write-Output "Administrator privileges required"
        exit 1
    }
    
    # All checks passed
    Write-Output "All requirements met. OS: Windows $($osInfo.Caption) (Build $osBuild), PowerShell: $($psVersion.ToString()), Free Space: $freeSpaceMB MB"
    exit 0
    
} catch {
    Write-Output "Error checking requirements: $($_.Exception.Message)"
    exit 1
}
