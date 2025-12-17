# Oricol Endpoint Monitoring Agent

## Overview

The Oricol Endpoint Monitoring Agent is a comprehensive Windows-based monitoring solution that provides real-time visibility into endpoint security, performance, and compliance. It integrates seamlessly with Microsoft 365 Intune for silent deployment and reports all data back to the Oricol dashboard.

## Features

### Security Monitoring
- **Antivirus Status**: Monitors Windows Defender and third-party antivirus software
- **Windows Updates**: Tracks update status, pending updates, and critical patches
- **Ransomware Protection**: Monitors controlled folder access and behavior monitoring
- **Encryption**: Checks BitLocker status and drive encryption
- **Firewall**: Verifies firewall is enabled and configured correctly
- **Zero Trust**: Monitors and blocks suspicious processes (when enabled)

### Performance Monitoring
- **CPU Usage**: Real-time CPU utilization tracking
- **Memory Usage**: RAM consumption and available memory
- **Storage Usage**: Disk space utilization across all drives
- **Network Bandwidth**: Upload and download speeds per process

### Compliance Monitoring
- **Group Policy**: Validates policy compliance and configuration
- **Security Posture**: Overall security level assessment
- **Vulnerability Scanning**: Identifies security weaknesses
- **Auto-Patching**: Automatic security patch deployment (when enabled)

## System Requirements

- Windows 10 (version 1809 or later) or Windows 11
- Windows Server 2016 or later
- PowerShell 5.1 or later
- .NET Framework 4.7.2 or later
- Administrator privileges for installation
- Internet connectivity for reporting to dashboard

## Installation Methods

### Method 1: Microsoft 365 Intune Deployment (Recommended)

This is the recommended deployment method for enterprise environments as it allows silent installation across all managed endpoints.

#### Prerequisites
1. Microsoft 365 tenant with Intune licensing
2. Intune device management configured
3. Devices enrolled in Intune

#### Deployment Steps

1. **Prepare the Package**
   - Download the complete endpoint-agent folder
   - Update `config.json` with your Supabase credentials
   - Package as `.intunewin` file using Microsoft Win32 Content Prep Tool

2. **Create Intune Application**
   ```powershell
   # Download Win32 Content Prep Tool
   # Package the application
   IntuneWinAppUtil.exe -c "C:\endpoint-agent" -s "OricolEndpointAgent.ps1" -o "C:\IntunePackages"
   ```

3. **Configure in Intune Admin Center**
   - Navigate to: Apps > Windows > Add > Windows app (Win32)
   - Upload the `.intunewin` package
   
4. **Installation Commands**
   - Install command:
     ```powershell
     powershell.exe -ExecutionPolicy Bypass -File "OricolEndpointAgent.ps1" -Install
     ```
   - Uninstall command:
     ```powershell
     powershell.exe -ExecutionPolicy Bypass -File "OricolEndpointAgent.ps1" -Uninstall
     ```

5. **Detection Rules**
   - Rule type: File
   - Path: `C:\Program Files\Oricol\EndpointAgent`
   - File: `OricolEndpointAgent.ps1`
   - Detection method: File or folder exists

6. **Assignment**
   - Assign to: All Devices (or specific security groups)
   - Installation behavior: System
   - Device restart behavior: No specific action

### Method 2: Group Policy Deployment

1. **Prepare GPO Package**
   - Copy endpoint-agent folder to network share
   - Create startup script in Group Policy

2. **Configure GPO**
   ```powershell
   # Computer Configuration > Policies > Windows Settings > Scripts > Startup
   # Add script:
   \\domain\netlogon\endpoint-agent\OricolEndpointAgent.ps1 -Install
   ```

### Method 3: Manual Installation

1. **Copy Files**
   ```powershell
   Copy-Item -Path "endpoint-agent" -Destination "C:\Program Files\Oricol\" -Recurse
   ```

2. **Update Configuration**
   ```powershell
   # Edit C:\Program Files\Oricol\endpoint-agent\config.json
   # Update SupabaseUrl, SupabaseAnonKey, and AgentToken
   ```

3. **Install Service**
   ```powershell
   cd "C:\Program Files\Oricol\endpoint-agent"
   .\OricolEndpointAgent.ps1 -Install
   ```

## Configuration

### config.json Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| `SupabaseUrl` | Your Supabase project URL | Required |
| `SupabaseAnonKey` | Supabase anonymous/public key | Required |
| `AgentToken` | Unique token for this endpoint | Required |
| `CollectionIntervalMinutes` | How often to collect and send data | 5 |
| `EnableAutoPatching` | Enable automatic security patching | false |
| `EnableZeroTrustBlocking` | Enable Zero Trust process blocking | false |
| `LogLevel` | Logging verbosity (Info, Warning, Error) | Info |

### Generating Agent Tokens

Agent tokens must be generated and stored in the database before deployment:

```sql
-- Run this in Supabase SQL Editor
INSERT INTO endpoint_agent_tokens (endpoint_id, token_hash, token_name, expires_at, is_active)
VALUES (
  NULL, -- Will be linked when agent first reports
  'your-secure-token-hash',
  'Device-Name-Token',
  NOW() + INTERVAL '1 year',
  true
);
```

For bulk token generation, use the included PowerShell script:
```powershell
.\Generate-AgentTokens.ps1 -Count 100 -OutputFile tokens.csv
```

## Intune Deployment Configuration Files

### Detection Script (detect-agent.ps1)
```powershell
$serviceName = "OricolEndpointAgent"
$service = Get-Service -Name $serviceName -ErrorAction SilentlyContinue

if ($service -and $service.Status -eq 'Running') {
    Write-Output "Agent is installed and running"
    exit 0
} else {
    exit 1
}
```

### Requirement Script (requirements-check.ps1)
```powershell
# Check Windows version
$osVersion = [System.Environment]::OSVersion.Version
if ($osVersion.Major -lt 10) {
    Write-Output "Windows 10 or later required"
    exit 1
}

# Check PowerShell version
if ($PSVersionTable.PSVersion.Major -lt 5) {
    Write-Output "PowerShell 5.1 or later required"
    exit 1
}

Write-Output "Requirements met"
exit 0
```

## Silent Installation

The agent is designed for completely silent installation. Users will not see any prompts, windows, or notifications during installation.

### Verification
To verify silent installation worked:
1. Check Windows Services: Look for "Oricol Endpoint Monitoring Agent"
2. Check logs: `C:\ProgramData\Oricol\EndpointAgent\Logs\`
3. View in Oricol Dashboard: Navigate to Endpoint Monitoring page

## Uninstallation

### Via Intune
1. Change app assignment from "Required" to "Uninstall"
2. Intune will automatically remove from all endpoints

### Manual Uninstall
```powershell
cd "C:\Program Files\Oricol\endpoint-agent"
.\OricolEndpointAgent.ps1 -Uninstall
```

### Complete Removal
```powershell
# Stop and remove service
.\OricolEndpointAgent.ps1 -Uninstall

# Remove files
Remove-Item -Path "C:\Program Files\Oricol\endpoint-agent" -Recurse -Force
Remove-Item -Path "C:\ProgramData\Oricol\EndpointAgent" -Recurse -Force
```

## Monitoring and Dashboard

Once deployed, endpoints will automatically appear in the Oricol dashboard:
1. Navigate to **Endpoint Monitoring** in the dashboard
2. View real-time status of all endpoints
3. Click any endpoint for detailed metrics
4. Review security alerts and compliance status

### Dashboard Features
- **Real-time Status**: Online/offline status with last seen timestamp
- **Security Level**: Overall security posture (Secure/Warning/Critical)
- **Compliance Status**: Policy compliance tracking
- **Performance Metrics**: CPU, memory, storage, and network usage
- **Security Events**: Recent alerts and incidents
- **Update Status**: Windows Update compliance
- **Antivirus Status**: Real-time protection status

## Troubleshooting

### Agent Not Reporting
1. Check service status: `Get-Service -Name OricolEndpointAgent`
2. Review logs: `C:\ProgramData\Oricol\EndpointAgent\Logs\`
3. Verify network connectivity to Supabase
4. Validate agent token in config.json

### Installation Fails
1. Verify administrator privileges
2. Check Windows version compatibility
3. Ensure PowerShell execution policy allows scripts
4. Review installation logs

### Performance Issues
1. Adjust `CollectionIntervalMinutes` to reduce frequency
2. Check network bandwidth availability
3. Review Windows Event Logs for errors

## Security Considerations

### Zero Trust Implementation
When `EnableZeroTrustBlocking` is enabled:
- Suspicious processes are automatically flagged
- Encryption/decryption attempts are monitored
- Unknown processes can be blocked (requires manual approval by default)

### Data Privacy
- All data is encrypted in transit (HTTPS)
- Sensitive data is never logged to disk
- Agent tokens are hashed before storage
- Complies with GDPR and data protection regulations

### Network Security
- Agent communicates only with configured Supabase endpoint
- Uses secure HTTPS connections
- Supports proxy configurations
- Can operate through corporate firewalls

## Advanced Configuration

### Custom Security Policies
Edit the agent script to add custom security checks:
```powershell
function Get-CustomSecurityCheck {
    # Add your custom security validation here
}
```

### Integration with SIEM
Agent logs can be forwarded to SIEM systems:
```powershell
# Configure in config.json
"SyslogServer": "siem.company.com",
"SyslogPort": 514,
"EnableSyslog": true
```

## Support

For technical support:
- Email: support@oricol.co.za
- Documentation: https://docs.oricol.co.za
- Dashboard Help: Click "?" icon in the Endpoint Monitoring page

## License

Copyright © 2024 Oricol ES. All rights reserved.

## Version History

### 1.0.0 (Current)
- Initial release
- Full security monitoring
- Performance tracking
- Compliance checking
- Intune deployment support
- Zero Trust capabilities
