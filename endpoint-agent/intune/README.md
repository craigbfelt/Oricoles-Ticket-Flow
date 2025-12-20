# Intune Deployment Helper Scripts

This directory contains helper scripts and tools specifically designed to simplify deployment of the Oricol Endpoint Monitoring Agent through Microsoft Intune.

## 📁 Files in This Directory

### Core Scripts

| File | Purpose | Usage |
|------|---------|-------|
| **Prepare-IntunePackage.ps1** | Automated package preparation | Run locally to create .intunewin package |
| **detect-agent.ps1** | Detection script for Intune | Upload to Intune as custom detection script |
| **requirements-check.ps1** | System requirements validation | Upload to Intune as requirement script |
| **install-wrapper.ps1** | Installation wrapper | Used internally by Intune during installation |

### Documentation

| File | Description |
|------|-------------|
| **README.md** | This file - overview and quick start |
| **DEPLOYMENT_GUIDE.md** | Detailed step-by-step deployment guide |

## 🚀 Quick Start (5 Minutes)

### Prerequisites

Before you begin, ensure you have:

1. ✅ **Microsoft Intune Admin Access** - Global Admin or Intune Administrator role
2. ✅ **Supabase Credentials** - Project URL and Anon Key from your Supabase dashboard
3. ✅ **Agent Token** - Generated using `../Generate-AgentTokens.ps1`
4. ✅ **Win32 Content Prep Tool** - Download from [Microsoft GitHub](https://github.com/microsoft/Microsoft-Win32-Content-Prep-Tool/releases)

### Step 1: Generate Agent Token

```powershell
# Navigate to the parent directory
cd ..

# Generate a token
.\Generate-AgentTokens.ps1 -Count 1 -OutputFile "tokens.csv"

# Apply the generated SQL in Supabase SQL Editor
```

### Step 2: Prepare Intune Package

```powershell
# Navigate back to intune directory
cd intune

# Run the preparation script
.\Prepare-IntunePackage.ps1 `
    -SupabaseUrl "https://your-project.supabase.co" `
    -SupabaseAnonKey "your-anon-key-here" `
    -AgentToken "your-token-from-step1" `
    -OutputPath "C:\IntunePackages"
```

This script will:
- ✓ Validate your environment
- ✓ Create staging directory
- ✓ Copy all necessary files
- ✓ Generate config.json with your credentials
- ✓ Download NSSM service manager
- ✓ Create .intunewin package file

### Step 3: Upload to Intune

1. **Open Intune Admin Center**
   - Navigate to: https://endpoint.microsoft.com
   - Go to: **Apps** > **Windows** > **Add**

2. **Select App Type**
   - Choose: **Windows app (Win32)**

3. **Upload Package**
   - Click **Select app package file**
   - Browse to your output directory
   - Select the generated `OricolEndpointAgent.intunewin` file

4. **Configure App Information**
   - **Name**: `Oricol Endpoint Monitoring Agent`
   - **Description**: `Comprehensive endpoint security and compliance monitoring`
   - **Publisher**: `Oricol IT Solutions`
   - Click **Next**

5. **Configure Program Settings**
   - **Install command**:
     ```
     powershell.exe -ExecutionPolicy Bypass -WindowStyle Hidden -NoProfile -NonInteractive -File "OricolEndpointAgent.ps1" -Install
     ```
   - **Uninstall command**:
     ```
     powershell.exe -ExecutionPolicy Bypass -WindowStyle Hidden -NoProfile -NonInteractive -File "OricolEndpointAgent.ps1" -Uninstall
     ```
   - **Install behavior**: System
   - **Device restart behavior**: No specific action
   - Click **Next**

6. **Configure Requirements**
   - **Operating system architecture**: 64-bit
   - **Minimum operating system**: Windows 10 1809
   - Click **Next**

7. **Configure Detection Rules**
   - **Rule format**: Manually configure detection rules
   - **Rule type**: Registry
   - **Key path**: `HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Services\OricolEndpointAgent`
   - **Detection method**: Key exists
   - Click **Next**

8. **Assign to Devices**
   - **Required**: Select your target groups (e.g., "All Devices")
   - **Notification**: Hide all toast notifications
   - Click **Next**

9. **Review and Create**
   - Review all settings
   - Click **Create**

### Step 4: Monitor Deployment

1. In Intune Admin Center, go to your app
2. Click **Device install status**
3. Monitor deployment progress
4. Check Oricol Dashboard for reporting endpoints

## 📋 Detailed Information

### Detection Script (`detect-agent.ps1`)

This script checks if the Oricol Endpoint Agent service exists and is running.

**Exit Codes:**
- `0` = Agent installed and running (success)
- `1` = Agent not installed or not running (needs installation)

**Usage in Intune:**
- Upload as a custom detection script
- Or use the built-in registry detection method shown above

### Requirements Script (`requirements-check.ps1`)

Validates system requirements before installation:
- Windows 10 1809+ or Windows Server 2016+
- PowerShell 5.1+
- 100 MB free disk space
- Administrator privileges

**Exit Codes:**
- `0` = All requirements met
- `1` = One or more requirements not met

### Installation Wrapper (`install-wrapper.ps1`)

This script wraps the main agent installation to:
- Provide detailed logging for troubleshooting
- Verify successful installation
- Handle Intune-specific deployment scenarios

**Logs Location:**
```
C:\ProgramData\Oricol\EndpointAgent\Logs\intune-install-*.log
```

### Package Preparation Script (`Prepare-IntunePackage.ps1`)

Automates the entire package preparation process.

**Parameters:**

| Parameter | Required | Description |
|-----------|----------|-------------|
| `-SupabaseUrl` | Yes | Your Supabase project URL |
| `-SupabaseAnonKey` | Yes | Supabase anonymous API key |
| `-AgentToken` | Yes | Agent authentication token |
| `-OutputPath` | No | Output directory (default: `..\..\intune-packages`) |
| `-SkipNSSM` | No | Skip NSSM download if already present |
| `-IntuneWinAppUtilPath` | No | Path to IntuneWinAppUtil.exe if not in PATH |

**Example with all parameters:**
```powershell
.\Prepare-IntunePackage.ps1 `
    -SupabaseUrl "https://abc.supabase.co" `
    -SupabaseAnonKey "eyJhbGc..." `
    -AgentToken "secure-token-123" `
    -OutputPath "C:\Packages" `
    -IntuneWinAppUtilPath "C:\Tools\IntuneWinAppUtil.exe"
```

## 🔧 Troubleshooting

### Package Creation Fails

**Issue**: Prepare-IntunePackage.ps1 fails to create package

**Solutions**:
1. Ensure you're running as Administrator
2. Verify IntuneWinAppUtil.exe is accessible
3. Check that all agent files are present in parent directory
4. Review error messages for specific issues

### Intune Deployment Shows "Failed"

**Issue**: Devices show installation failed in Intune

**Solutions**:
1. Check device requirements (Windows 10 1809+)
2. Verify network connectivity to Supabase
3. Review installation logs on the device:
   ```powershell
   Get-Content "C:\ProgramData\Oricol\EndpointAgent\Logs\intune-install-*.log"
   ```
4. Ensure config.json has correct credentials
5. Verify agent token is valid in Supabase

### Detection Not Working

**Issue**: Intune shows "Not detected" even after installation

**Solutions**:
1. Verify service is actually running:
   ```powershell
   Get-Service -Name OricolEndpointAgent
   ```
2. Check detection rule matches service name exactly
3. Use custom detection script if registry detection fails
4. Restart device and re-evaluate

### Silent Installation Not Silent

**Issue**: Users see windows or prompts during installation

**Solutions**:
1. Verify install command includes `-WindowStyle Hidden`
2. Ensure `-NonInteractive` flag is present
3. Check that installation behavior is set to "System"
4. Confirm no UAC prompts are showing (should be system-level)

## 📚 Additional Resources

### Documentation

- **Parent README**: `../README.md` - Agent documentation and features
- **Quick Start**: `../QUICK_START.md` - Fast deployment guide
- **System Overview**: `../../ENDPOINT_MONITORING_SYSTEM.md` - Complete system documentation
- **Full Intune Guide**: `../../ENDPOINT_MONITORING_INTUNE_DEPLOYMENT.md` - Comprehensive deployment guide

### External Resources

- [Microsoft Intune Documentation](https://docs.microsoft.com/intune)
- [Win32 Content Prep Tool](https://github.com/microsoft/Microsoft-Win32-Content-Prep-Tool)
- [Intune Win32 App Management](https://docs.microsoft.com/mem/intune/apps/apps-win32-app-management)
- [NSSM Service Manager](https://nssm.cc/)

### Support

- **Email**: support@oricol.co.za
- **Dashboard**: Click "?" icon in Endpoint Monitoring page
- **Documentation**: See files listed above

## 🎯 Best Practices

### 1. Test First
Always deploy to a pilot group before organization-wide rollout:
- Create "Endpoint-Monitoring-Pilot" group
- Assign app to pilot group
- Monitor for 1 week
- Then proceed with full deployment

### 2. Use Unique Tokens
For better security and tracking:
- Generate unique tokens per device group
- Use descriptive token names
- Document token assignments
- Rotate tokens annually

### 3. Monitor Deployment
Keep track of deployment progress:
- Check Intune device install status daily
- Review Oricol Dashboard for reporting endpoints
- Address failures promptly
- Document common issues

### 4. Maintain Documentation
Keep records of:
- Configuration used (save config.json securely)
- Token assignments
- Deployment dates and groups
- Any customizations made

### 5. Plan Updates
Agent updates should be:
- Tested in pilot first
- Scheduled during maintenance windows
- Communicated to IT team
- Documented in change log

## ⚡ Quick Commands Reference

### Check Service Status
```powershell
Get-Service -Name OricolEndpointAgent
```

### View Installation Logs
```powershell
Get-Content "C:\ProgramData\Oricol\EndpointAgent\Logs\intune-install-*.log" -Tail 50
```

### Force Intune Sync
```powershell
Get-ScheduledTask | Where-Object {$_.TaskName -eq 'PushLaunch'} | Start-ScheduledTask
```

### Test Agent Manually
```powershell
cd "C:\Program Files\Oricol\endpoint-agent"
.\OricolEndpointAgent.ps1 -RunOnce
```

### Restart Agent Service
```powershell
Restart-Service -Name OricolEndpointAgent
```

## 📊 Deployment Timeline

| Phase | Duration | Description |
|-------|----------|-------------|
| **Preparation** | 30 mins | Generate tokens, prepare package |
| **Intune Setup** | 15 mins | Upload and configure in Intune |
| **Pilot Deployment** | 1 week | Deploy to 10-50 test devices |
| **Phase 1** | 1 week | Deploy to 25% of devices |
| **Phase 2** | 1 week | Deploy to 50% of devices |
| **Full Rollout** | 2 weeks | Deploy to all remaining devices |
| **Total** | 4-5 weeks | Complete organization deployment |

## 🔐 Security Notes

### Credentials Management
- Never commit config.json with real credentials to version control
- Store tokens securely (password manager, Azure Key Vault)
- Use unique tokens per deployment group when possible
- Rotate tokens annually or when compromised

### Network Security
- Agent requires outbound HTTPS (443) to Supabase
- No inbound connections required
- Works through corporate firewalls
- Supports proxy configurations

### Data Privacy
- Only system/security metrics collected
- No user files or personal data
- GDPR compliant
- Audit trail maintained

## ✅ Validation Checklist

Before deployment, ensure:

- [ ] Supabase backend is set up and accessible
- [ ] Edge function is deployed and working
- [ ] Agent tokens generated and stored in database
- [ ] config.json created with correct credentials
- [ ] .intunewin package created successfully
- [ ] Intune app configured correctly
- [ ] Detection rules configured
- [ ] Target groups selected
- [ ] Pilot group created and ready
- [ ] Monitoring plan in place

After deployment, verify:

- [ ] Devices showing "Installed" in Intune
- [ ] Service running on devices
- [ ] Devices appearing in Oricol Dashboard
- [ ] Data being collected (last seen < 5 minutes)
- [ ] No critical errors in logs
- [ ] Pilot group monitoring successful

## 🎉 Success Criteria

Your deployment is successful when:

✅ All target devices show "Installed" in Intune  
✅ Oricol Endpoint Agent service is running on all devices  
✅ Devices appear in Oricol Dashboard within 5 minutes  
✅ Last seen timestamp updates every 5 minutes  
✅ Security metrics being collected and displayed  
✅ No critical errors in deployment or agent logs  
✅ Users unaware of agent presence (completely silent)  

---

**Version**: 1.0.0  
**Last Updated**: December 2024  
**Author**: Oricol IT Solutions  
**License**: Proprietary
