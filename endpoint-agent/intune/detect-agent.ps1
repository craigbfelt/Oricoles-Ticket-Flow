<#
.SYNOPSIS
    Detection script for Oricol Endpoint Monitoring Agent in Intune
    
.DESCRIPTION
    This script is used by Microsoft Intune to detect if the Oricol Endpoint 
    Monitoring Agent is installed and running on a Windows endpoint.
    
    Exit Codes:
    - 0: Agent is installed and running (detection succeeded)
    - 1: Agent is not installed or not running (detection failed)
    
.NOTES
    Version: 1.0.0
    Author: Oricol IT Solutions
    Usage: Deploy as detection script in Intune Win32 app configuration
#>

$ErrorActionPreference = 'SilentlyContinue'

# Service name to check
$serviceName = "OricolEndpointAgent"

# Check if service exists
$service = Get-Service -Name $serviceName -ErrorAction SilentlyContinue

if ($service) {
    # Check if service is running
    if ($service.Status -eq 'Running') {
        Write-Output "Oricol Endpoint Monitoring Agent is installed and running"
        exit 0
    } else {
        Write-Output "Service exists but is not running. Status: $($service.Status)"
        exit 1
    }
} else {
    Write-Output "Oricol Endpoint Monitoring Agent service not found"
    exit 1
}
