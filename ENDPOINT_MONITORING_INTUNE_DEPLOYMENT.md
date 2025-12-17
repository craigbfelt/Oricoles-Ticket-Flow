# Endpoint Monitoring Tool - Intune Deployment Guide

## Overview

This guide provides step-by-step instructions for deploying the Oricol Endpoint Monitoring Tool to all managed endpoints via Microsoft 365 Intune. The deployment is completely silent and automatic - users will not be notified and cannot cancel the installation.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Initial Setup](#initial-setup)
3. [Preparing the Package](#preparing-the-package)
4. [Creating the Intune Application](#creating-the-intune-application)
5. [Configuring Deployment](#configuring-deployment)
6. [Monitoring Deployment](#monitoring-deployment)
7. [Troubleshooting](#troubleshooting)

## Prerequisites

### Microsoft 365 Requirements
- Microsoft 365 E3, E5, or Business Premium license
- Microsoft Intune enabled for your tenant
- Global Administrator or Intune Administrator role
- Devices enrolled in Intune (Azure AD joined or Hybrid joined)

### Supabase Setup
- Supabase project created
- Database migration applied (endpoint monitoring schema)
- Edge function deployed (endpoint-data-ingestion)
- Supabase URL and anon key available

### Tools Required
- **Microsoft Win32 Content Prep Tool**: [Download from GitHub](https://github.com/microsoft/Microsoft-Win32-Content-Prep-Tool)
- **PowerShell 5.1 or later**: Pre-installed on Windows 10/11
- **Text editor**: For configuration file editing

## Initial Setup

### Step 1: Apply Database Migration

1. Navigate to your Supabase Dashboard
2. Go to **SQL Editor**
3. Open the migration file: `supabase/migrations/20251217121616_endpoint_monitoring_schema.sql`
4. Execute the migration to create required tables

### Step 2: Deploy Edge Function

Deploy the endpoint data ingestion function:

```bash
# Using Supabase CLI
supabase functions deploy endpoint-data-ingestion

# Or use GitHub Actions workflow
# Navigate to Actions > Deploy All Edge Functions > Run workflow
```

### Step 3: Generate Agent Tokens

Create authentication tokens for your endpoints:

```sql
-- Generate tokens in Supabase SQL Editor
-- Each token should be unique per endpoint or per group

-- For individual endpoints:
INSERT INTO endpoint_agent_tokens (token_hash, token_name, expires_at, is_active)
VALUES 
  (encode(digest('your-secure-token-1', 'sha256'), 'hex'), 'Enterprise-Endpoints-Group-1', NOW() + INTERVAL '2 years', true),
  (encode(digest('your-secure-token-2', 'sha256'), 'hex'), 'Enterprise-Endpoints-Group-2', NOW() + INTERVAL '2 years', true);

-- For bulk deployment (all devices use same token):
INSERT INTO endpoint_agent_tokens (token_hash, token_name, expires_at, is_active)
VALUES 
  (encode(digest('enterprise-deployment-2024', 'sha256'), 'hex'), 'All-Endpoints-2024', NOW() + INTERVAL '3 years', true);
```

**Security Note**: Store the plain-text tokens securely. You'll need them for the configuration file. The database only stores hashed versions.

## Preparing the Package

### Step 1: Download Agent Files

Download the complete endpoint-agent folder from the repository:
- `OricolEndpointAgent.ps1` - Main agent script
- `config.json.template` - Configuration template
- `README.md` - Documentation

### Step 2: Create Configuration File

1. Copy `config.json.template` to `config.json`
2. Update with your environment details:

```json
{
  "SupabaseUrl": "https://your-project.supabase.co",
  "SupabaseAnonKey": "your-supabase-anon-key-here",
  "AgentToken": "your-secure-token-here",
  "CollectionIntervalMinutes": 5,
  "EnableAutoPatching": false,
  "EnableZeroTrustBlocking": false,
  "LogLevel": "Info"
}
```

**Configuration Parameters:**
- `SupabaseUrl`: Your Supabase project URL (found in Project Settings > API)
- `SupabaseAnonKey`: Your anon/public key (found in Project Settings > API)
- `AgentToken`: One of the tokens you generated in Step 3
- `CollectionIntervalMinutes`: How often to report (5 minutes recommended)
- `EnableAutoPatching`: Set to `true` to enable automatic security patching
- `EnableZeroTrustBlocking`: Set to `true` to enable Zero Trust process blocking

### Step 3: Download NSSM (Service Manager)

1. Download NSSM from: https://nssm.cc/download
2. Extract `nssm.exe` (64-bit version) to the endpoint-agent folder
3. Your folder structure should look like:
   ```
   endpoint-agent/
   ├── OricolEndpointAgent.ps1
   ├── config.json
   ├── nssm.exe
   └── README.md
   ```

### Step 4: Create Detection Script

Create `detect-agent.ps1`:

```powershell
# Detection script for Intune
$serviceName = "OricolEndpointAgent"
$service = Get-Service -Name $serviceName -ErrorAction SilentlyContinue

if ($service) {
    if ($service.Status -eq 'Running') {
        Write-Output "Installed and running"
        exit 0
    }
}

exit 1
```

### Step 5: Package with Win32 Content Prep Tool

1. Open PowerShell as Administrator
2. Navigate to where you downloaded the Win32 Content Prep Tool
3. Run the packaging command:

```powershell
# Package the application
.\IntuneWinAppUtil.exe `
    -c "C:\path\to\endpoint-agent" `
    -s "OricolEndpointAgent.ps1" `
    -o "C:\path\to\output" `
    -q

# This creates: OricolEndpointAgent.intunewin
```

## Creating the Intune Application

### Step 1: Access Intune Admin Center

1. Navigate to: https://endpoint.microsoft.com
2. Sign in with your administrator account
3. Go to: **Apps** > **Windows** > **Add**

### Step 2: Add the Application

1. Click **Add** and select **Windows app (Win32)**
2. Click **Select app package file**
3. Upload the `OricolEndpointAgent.intunewin` file
4. Click **OK**

### Step 3: Configure App Information

Fill in the application details:

- **Name**: Oricol Endpoint Monitoring Agent
- **Description**: 
  ```
  Comprehensive endpoint monitoring agent that provides real-time visibility into 
  endpoint security, performance, and compliance. Monitors antivirus status, Windows 
  updates, ransomware protection, encryption, firewall, storage usage, and network 
  activity. Reports all data to the Oricol dashboard for centralized management.
  ```
- **Publisher**: Oricol ES
- **App Version**: 1.0.0
- **Category**: Security & Compliance
- **Show this as a featured app in the Company Portal**: No
- **Information URL**: https://oricol.co.za
- **Privacy URL**: https://oricol.co.za/privacy
- **Developer**: Oricol IT Solutions
- **Owner**: IT Department
- **Notes**: Deployed via Intune for automated monitoring

### Step 4: Configure Program Details

**Install command:**
```powershell
powershell.exe -ExecutionPolicy Bypass -WindowStyle Hidden -NoProfile -NonInteractive -File "OricolEndpointAgent.ps1" -Install
```

**Note on Execution Policy**: The `-ExecutionPolicy Bypass` parameter is used for Intune deployment to ensure the script runs regardless of the system execution policy. This is necessary for automated deployment but should only be used in controlled enterprise environments via Intune. Alternatively, you can sign the script with a trusted certificate and use `-ExecutionPolicy RemoteSigned` for enhanced security.

**Uninstall command:**
```powershell
powershell.exe -ExecutionPolicy Bypass -WindowStyle Hidden -NoProfile -NonInteractive -File "OricolEndpointAgent.ps1" -Uninstall
```

**Install behavior**: System

**Device restart behavior**: No specific action

**Return codes:**
- 0 = Success
- 1707 = Success (reboot required)
- 3010 = Soft reboot
- 1641 = Hard reboot
- 1618 = Retry

### Step 5: Configure Requirements

**Operating system architecture**: 64-bit (or Both)

**Minimum operating system**: Windows 10 1809

**Disk space required**: 50 MB

**Physical memory required**: 100 MB

**Logical processor required**: 1

**CPU type**: x64

### Step 6: Configure Detection Rules

**Rule format**: Manually configure detection rules

**Detection rule 1 - Service:**
- Rule type: Registry
- Key path: `HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Services\OricolEndpointAgent`
- Value name: `ImagePath`
- Detection method: Key exists
- Associated with a 32-bit app: No

**Detection rule 2 - File:**
- Rule type: File
- Path: `%ProgramData%\Oricol\EndpointAgent\Logs`
- File or folder name: (folder)
- Detection method: Folder exists
- Associated with a 32-bit app: No

### Step 7: Configure Dependencies

No dependencies required for this application.

### Step 8: Configure Supersedence

No supersedence relationships needed.

### Step 9: Assignments

#### Required Deployment (Silent Installation)

1. Click **Add group** under **Required**
2. Select target group:
   - **All Devices** (for organization-wide deployment)
   - Or create specific security groups for phased rollout

**Assignment settings:**
- **Deployment intent**: Required
- **End user notifications**: Hide all toast notifications
- **Availability**: Install as soon as possible after the deadline
- **Installation deadline**: As soon as possible
- **Restart grace period**: Device restart will be suppressed
- **Installation time required**: 30 minutes
- **Allow end users to repair**: No

#### Available Deployment (Optional)

Not recommended for this deployment model. Use "Required" to ensure all devices get the agent.

### Step 10: Review and Create

1. Review all settings
2. Click **Create** to finalize the application
3. Intune will begin processing and deploying to assigned devices

## Configuring Deployment

### Deployment Rings (Phased Approach)

For large organizations, use a phased deployment:

#### Phase 1: Pilot Group (10-50 devices)
```
Group: Pilot-Endpoint-Monitoring
Devices: IT staff and early adopters
Duration: 1 week
Monitoring: Intensive monitoring for issues
```

#### Phase 2: Department Rollout (25% of devices)
```
Group: Department-Endpoint-Monitoring
Devices: Selected departments
Duration: 2 weeks
Monitoring: Daily checks for issues
```

#### Phase 3: Full Deployment (All devices)
```
Group: All Devices
Devices: Entire organization
Duration: 4 weeks
Monitoring: Weekly review
```

### Creating Security Groups

1. Navigate to: **Groups** > **New group**
2. Group type: Security
3. Group name: `Endpoint-Monitoring-Pilot`
4. Membership type: Assigned (or Dynamic for automatic)
5. Add members manually or use dynamic membership rules

**Dynamic membership rule example:**
```
(device.deviceOSType -eq "Windows") -and (device.deviceOwnership -eq "Company")
```

### Exclusion Groups

Create an exclusion group for devices that should NOT receive the agent:

1. Create group: `Endpoint-Monitoring-Exclusions`
2. Add devices that should be excluded (e.g., kiosks, servers)
3. In app assignment, add this group to **Exclude groups**

## Monitoring Deployment

### Step 1: Check Deployment Status

1. Navigate to: **Apps** > **Windows** > **Oricol Endpoint Monitoring Agent**
2. Click **Device install status** to see deployment progress
3. Monitor the following metrics:
   - Installed: Successfully deployed and running
   - Failed: Installation errors
   - Pending: Waiting to install
   - Not installed: Not yet attempted

### Step 2: View Individual Device Status

1. In **Device install status**, click on a device
2. Review installation details:
   - Install status code
   - Error message (if failed)
   - Last install status check-in time

### Step 3: Check Dashboard

1. Log into Oricol Dashboard
2. Navigate to **Endpoint Monitoring**
3. Verify endpoints are appearing and reporting data
4. Check for:
   - Device count matches expected
   - All devices showing "Online" status
   - Metrics being collected properly

### Step 4: Review Logs

On individual devices (for troubleshooting):
```powershell
# Check service status
Get-Service -Name OricolEndpointAgent

# View logs
Get-Content "C:\ProgramData\Oricol\EndpointAgent\Logs\agent-$(Get-Date -Format 'yyyy-MM-dd').log" -Tail 50

# Check last successful report
Get-Content "C:\ProgramData\Oricol\EndpointAgent\Logs\agent-*.log" | Select-String "Data sent successfully" | Select-Object -Last 5
```

## Troubleshooting

### Installation Fails

**Issue**: Devices show "Failed" status in Intune

**Solutions**:
1. Check device logs: Event Viewer > Applications and Services Logs > Microsoft > Windows > DeviceManagement
2. Verify device meets requirements (Windows 10 1809+)
3. Check network connectivity to Supabase
4. Verify Supabase URL and keys are correct in config.json
5. Re-package and re-upload if configuration was incorrect

### Agent Not Reporting

**Issue**: Agent installed but not appearing in dashboard

**Solutions**:
1. Verify agent token is valid in database
2. Check service is running: `Get-Service OricolEndpointAgent`
3. Review agent logs for errors
4. Test network connectivity: `Test-NetConnection your-project.supabase.co -Port 443`
5. Verify Edge Function is deployed and working

### Detection Rules Not Working

**Issue**: Intune shows "Not detected" even though installed

**Solutions**:
1. Verify detection rules match actual installation paths
2. Check if service is actually running
3. Update detection script and re-upload
4. Use registry detection as primary, file detection as secondary

### Silent Installation Not Silent

**Issue**: Users see prompts or windows during installation

**Solutions**:
1. Verify install command includes `-WindowStyle Hidden`
2. Ensure installation behavior is set to "System"
3. Check that `-NonInteractive` flag is present
4. Update command and re-deploy

### Slow Deployment

**Issue**: Deployment taking too long

**Solutions**:
1. Check Intune service health: https://admin.microsoft.com/Adminportal/Home#/servicehealth
2. Verify devices are checking in regularly (Settings > Sync)
3. Force sync on test device: Settings > Accounts > Access work or school > Info > Sync
4. Consider reducing app size by removing unnecessary files

### Uninstallation Issues

**Issue**: Agent not uninstalling properly

**Solutions**:
1. Verify uninstall command is correct
2. Manually uninstall on problem device to test
3. Check for file locks or processes preventing removal
4. Create remediation script if needed

## Post-Deployment Tasks

### 1. Validate Monitoring

- Verify all expected endpoints are reporting
- Check data quality and completeness
- Review security alerts and compliance status

### 2. Configure Alerts

Set up alerts in the dashboard for:
- Critical security events
- Non-compliant devices
- Offline devices
- Failed updates

### 3. Train Staff

- Provide overview of endpoint monitoring to IT staff
- Share dashboard access with relevant personnel
- Document escalation procedures for alerts

### 4. Regular Maintenance

- Review endpoint health weekly
- Update agent configuration as needed
- Plan for agent updates and upgrades
- Monitor license usage and costs

## Best Practices

### 1. Test Before Wide Deployment
- Always deploy to pilot group first
- Validate functionality for at least one week
- Get feedback from pilot users (if any issues arise)

### 2. Document Configuration
- Keep copy of config.json in secure location
- Document agent tokens and their assignments
- Maintain deployment notes and lessons learned

### 3. Monitor Continuously
- Check dashboard daily for critical alerts
- Review deployment status weekly
- Plan for capacity as organization grows

### 4. Update Regularly
- Keep agent updated with latest version
- Apply security patches promptly
- Test updates in pilot group first

### 5. Security First
- Rotate agent tokens annually
- Use unique tokens per group when possible
- Audit access to Supabase credentials
- Review security events regularly

## Advanced Configuration

### Custom Security Policies

Modify the agent script to enforce custom policies:

```powershell
# Add to Get-ComplianceStatus function
if ($computerSystem.Manufacturer -eq "Dell" -and -not (Test-Path "C:\Dell\Encryption")) {
    $issues += "Dell encryption software missing"
}
```

### Integration with Other Tools

Export data for SIEM integration:

```powershell
# Add to config.json
"EnableSyslog": true,
"SyslogServer": "siem.company.com",
"SyslogPort": 514
```

### Conditional Access Policies

Use Intune compliance policies with endpoint data:
1. Create compliance policy based on endpoint status
2. Link to Conditional Access in Azure AD
3. Block non-compliant devices from resources

## Support and Resources

### Documentation
- Agent README: `endpoint-agent/README.md`
- Intune Documentation: https://docs.microsoft.com/intune
- Supabase Documentation: https://supabase.com/docs

### Getting Help
- Email: support@oricol.co.za
- Dashboard: Click "?" icon in Endpoint Monitoring page
- Community: Oricol support portal

### Useful PowerShell Commands

```powershell
# Check agent status on local machine
Get-Service -Name OricolEndpointAgent | Format-List *

# View agent logs
Get-Content "C:\ProgramData\Oricol\EndpointAgent\Logs\agent-$(Get-Date -Format 'yyyy-MM-dd').log"

# Restart agent service
Restart-Service -Name OricolEndpointAgent

# Test manual data collection
cd "C:\Program Files\Oricol\endpoint-agent"
.\OricolEndpointAgent.ps1 -RunOnce

# Force Intune sync
Get-ScheduledTask | Where-Object {$_.TaskName -eq 'PushLaunch'} | Start-ScheduledTask

# Check Intune app installation status
Get-WmiObject -Namespace root\cimv2\mdm\dmmap -Class MDM_EnterpriseModernAppManagement_AppManagement01 | Where-Object {$_.AppName -like "*Oricol*"}
```

## Security Considerations

### Data Protection
- All communication encrypted via HTTPS
- Sensitive data never stored locally
- Complies with GDPR and privacy regulations
- Agent tokens hashed before database storage

### Network Security
- Requires outbound HTTPS (443) to Supabase
- Works through corporate firewalls
- Supports proxy configurations
- No inbound connections required

### Zero Trust
- Process monitoring and blocking capabilities
- Suspicious activity detection
- Automatic threat response (when enabled)
- Integration with Windows Defender

## Conclusion

This deployment guide provides everything needed to successfully deploy the Oricol Endpoint Monitoring Agent to your organization's endpoints via Microsoft 365 Intune. The deployment is designed to be completely silent and automatic, providing comprehensive monitoring without user disruption.

For additional support or questions, contact Oricol ES support team.

---

**Document Version**: 1.0  
**Last Updated**: December 2024  
**Author**: Oricol ES IT Solutions
