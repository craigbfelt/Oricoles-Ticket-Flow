# Oricol Endpoint Agent - Step-by-Step Intune Deployment Guide

## Overview

This guide provides detailed, step-by-step instructions for deploying the Oricol Endpoint Monitoring Agent to your organization's Windows devices through Microsoft Intune. Follow each step carefully to ensure successful deployment.

**Estimated Time**: 45 minutes for setup + 1-4 weeks for phased rollout

## Prerequisites

Before starting, ensure you have:

### Access & Permissions
- [ ] Microsoft 365 tenant with Intune licensing
- [ ] Global Administrator or Intune Administrator role
- [ ] Access to Supabase project dashboard
- [ ] Oricol Dashboard administrator access

### Technical Requirements
- [ ] Windows 10/11 PC for package preparation
- [ ] PowerShell 5.1 or later
- [ ] Administrator privileges on local PC
- [ ] Internet connection
- [ ] Web browser for Intune and Supabase portals

### Downloads Required
- [ ] Microsoft Win32 Content Prep Tool
  - URL: https://github.com/microsoft/Microsoft-Win32-Content-Prep-Tool/releases
  - Download: IntuneWinAppUtil.exe
  
---

## Phase 1: Backend Preparation (10 minutes)

### Step 1.1: Verify Supabase Backend

1. **Open Supabase Dashboard**
   - Navigate to: https://app.supabase.com
   - Select your project

2. **Verify Database Migration**
   - Go to: **SQL Editor**
   - Check if tables exist:
     ```sql
     SELECT table_name 
     FROM information_schema.tables 
     WHERE table_name LIKE 'endpoint_%';
     ```
   - Expected tables:
     - endpoint_monitoring
     - endpoint_metrics
     - endpoint_security_scans
     - endpoint_policies
     - endpoint_network_processes
     - endpoint_security_events
     - endpoint_agent_tokens

3. **Apply Migration if Needed**
   - If tables don't exist:
   - Go to: **SQL Editor**
   - Open: `supabase/migrations/20251217121616_endpoint_monitoring_schema.sql`
   - Click: **Run**
   - Verify: All tables created successfully

### Step 1.2: Deploy Edge Function

1. **Using Supabase CLI** (Recommended):
   ```bash
   # Login to Supabase
   supabase login
   
   # Link your project
   supabase link --project-ref your-project-ref
   
   # Deploy edge function
   supabase functions deploy endpoint-data-ingestion
   ```

2. **Using GitHub Actions** (Alternative):
   - Go to: Your GitHub repository
   - Click: **Actions** tab
   - Select: **Deploy All Edge Functions**
   - Click: **Run workflow**
   - Wait: Until deployment completes

3. **Verify Edge Function**:
   - In Supabase Dashboard
   - Go to: **Edge Functions**
   - Confirm: `endpoint-data-ingestion` shows as "Active"

### Step 1.3: Get Supabase Credentials

1. **Get Project URL**:
   - In Supabase Dashboard
   - Go to: **Settings** > **API**
   - Copy: **Project URL** (e.g., https://xyz.supabase.co)
   - Save it for later

2. **Get Anonymous Key**:
   - On same page
   - Copy: **anon** / **public** key
   - Save it for later

---

## Phase 2: Generate Agent Tokens (5 minutes)

### Step 2.1: Run Token Generation Script

1. **Open PowerShell as Administrator**:
   - Press: `Win + X`
   - Select: **Windows PowerShell (Admin)**

2. **Navigate to Agent Directory**:
   ```powershell
   cd "C:\path\to\Oricoles-Ticket-Flow\endpoint-agent"
   ```

3. **Generate Token**:
   ```powershell
   .\Generate-AgentTokens.ps1 -Count 1 -OutputFile "tokens.csv"
   ```

4. **Review Output**:
   - A file `tokens.csv` is created
   - A SQL file `agent-tokens-YYYYMMDD-HHMMSS.sql` is created
   - Open `tokens.csv` and copy the **Token** value (keep it secure!)

### Step 2.2: Store Token in Database

1. **Open Supabase Dashboard**
   - Go to: **SQL Editor**

2. **Apply Token SQL**:
   - Open the generated SQL file in a text editor
   - Copy its contents
   - Paste into SQL Editor
   - Click: **Run**

3. **Verify Token Stored**:
   ```sql
   SELECT token_name, is_active, expires_at 
   FROM endpoint_agent_tokens 
   WHERE is_active = true;
   ```
   - Should show your newly created token

---

## Phase 3: Prepare Intune Package (15 minutes)

### Step 3.1: Download Win32 Content Prep Tool

1. **Download from GitHub**:
   - URL: https://github.com/microsoft/Microsoft-Win32-Content-Prep-Tool/releases
   - Download: Latest `IntuneWinAppUtil.exe`
   - Save to: `C:\Tools\` (or any location)

2. **Verify Download**:
   ```powershell
   Test-Path "C:\Tools\IntuneWinAppUtil.exe"
   # Should return: True
   ```

### Step 3.2: Run Package Preparation Script

1. **Open PowerShell as Administrator**

2. **Navigate to Intune Directory**:
   ```powershell
   cd "C:\path\to\Oricoles-Ticket-Flow\endpoint-agent\intune"
   ```

3. **Run Preparation Script**:
   ```powershell
   .\Prepare-IntunePackage.ps1 `
       -SupabaseUrl "https://your-project.supabase.co" `
       -SupabaseAnonKey "your-anon-key-here" `
       -AgentToken "your-token-from-step-2" `
       -OutputPath "C:\IntunePackages" `
       -IntuneWinAppUtilPath "C:\Tools\IntuneWinAppUtil.exe"
   ```

4. **Verify Success**:
   - Script should show: "PACKAGE READY FOR DEPLOYMENT"
   - Check: `C:\IntunePackages\OricolEndpointAgent.intunewin` exists
   - Note the file location for next phase

---

## Phase 4: Configure Intune Application (15 minutes)

### Step 4.1: Access Intune Admin Center

1. **Open Browser**
   - Navigate to: https://endpoint.microsoft.com
   - Sign in with: Your admin account

2. **Navigate to Apps**:
   - Click: **Apps** (left sidebar)
   - Click: **Windows**
   - Click: **Add** button

### Step 4.2: Upload Application Package

1. **Select App Type**:
   - In "Add app" panel
   - Select: **Windows app (Win32)**
   - Click: **Select**

2. **Upload Package File**:
   - Click: **Select app package file**
   - Browse to: `C:\IntunePackages\`
   - Select: `OricolEndpointAgent.intunewin`
   - Click: **OK**
   - Wait for upload to complete

### Step 4.3: Configure App Information

Fill in the following details:

1. **Basic Information**:
   - **Name**: `Oricol Endpoint Monitoring Agent`
   - **Description**: 
     ```
     Comprehensive endpoint monitoring agent providing real-time security, 
     performance, and compliance visibility. Monitors antivirus, Windows 
     updates, ransomware protection, encryption, firewall, storage usage, 
     and network activity.
     ```
   - **Publisher**: `Oricol IT Solutions`
   - **App Version**: `1.0.0`
   - **Category**: Select "Security & Compliance"

2. **Optional Information**:
   - **Information URL**: `https://oricol.co.za`
   - **Privacy URL**: `https://oricol.co.za/privacy`
   - **Developer**: `Oricol IT Solutions`
   - **Owner**: `IT Department`
   - **Notes**: `Automated deployment via Intune`

3. **Logo** (Optional):
   - Upload company or product logo if available

4. **Click**: **Next**

### Step 4.4: Configure Program Settings

1. **Install Command**:
   ```
   powershell.exe -ExecutionPolicy Bypass -WindowStyle Hidden -NoProfile -NonInteractive -File "OricolEndpointAgent.ps1" -Install
   ```

2. **Uninstall Command**:
   ```
   powershell.exe -ExecutionPolicy Bypass -WindowStyle Hidden -NoProfile -NonInteractive -File "OricolEndpointAgent.ps1" -Uninstall
   ```

3. **Install Behavior**:
   - Select: **System**

4. **Device Restart Behavior**:
   - Select: **No specific action**

5. **Return Codes**:
   - Keep defaults:
     - 0 = Success
     - 1707 = Success
     - 3010 = Soft reboot
     - 1641 = Hard reboot
     - 1618 = Retry

6. **Click**: **Next**

### Step 4.5: Configure Requirements

1. **Operating System Architecture**:
   - Select: **64-bit** (recommended)
   - Or: **32-bit and 64-bit** (if needed)

2. **Minimum Operating System**:
   - Select: **Windows 10 1809** or later

3. **Disk Space Required**:
   - Enter: `50` MB

4. **Physical Memory Required**:
   - Enter: `100` MB

5. **Minimum Number of Logical Processors**:
   - Enter: `1`

6. **Minimum CPU Speed**:
   - Leave blank (not required)

7. **Click**: **Next**

### Step 4.6: Configure Detection Rules

**Method 1: Registry Detection (Recommended)**

1. **Rule Format**:
   - Select: **Manually configure detection rules**

2. **Add Detection Rule**:
   - Click: **Add**
   - **Rule type**: Registry
   - **Key path**: `HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Services\OricolEndpointAgent`
   - **Value name**: Leave blank
   - **Detection method**: **Key exists**
   - **Associated with a 32-bit app**: No
   - Click: **OK**

3. **Click**: **Next**

**Method 2: Custom Script Detection (Alternative)**

If you prefer script-based detection:

1. **Rule Format**:
   - Select: **Use a custom detection script**

2. **Upload Script**:
   - Click: **Select file**
   - Browse to: `endpoint-agent\intune\detect-agent.ps1`
   - Select and upload

3. **Run script as 32-bit process**:
   - Select: **No**

4. **Enforce signature check**:
   - Select: **No** (unless script is signed)

5. **Click**: **Next**

### Step 4.7: Configure Dependencies (Optional)

- For this deployment: **No dependencies needed**
- Click: **Next**

### Step 4.8: Configure Supersedence (Optional)

- For this deployment: **No supersedence needed**
- Click: **Next**

### Step 4.9: Configure Assignments

#### Option A: Full Deployment to All Devices

1. **Under Required**:
   - Click: **Add group**
   - Search for: "All Devices"
   - Select: **All Devices**
   - Click: **Select**

2. **Assignment Settings**:
   - **End user notifications**: **Hide all toast notifications**
   - **Availability**: **As soon as possible**
   - **Installation deadline**: **As soon as possible**
   - **Restart grace period**: **No specific action**
   - **Installation time required**: `30` minutes

3. **Click**: **Next**

#### Option B: Phased Rollout (Recommended for Large Organizations)

**Phase 1 - Pilot Group**:

1. **Create Pilot Group First**:
   - In Intune, go to: **Groups** > **New group**
   - **Group type**: Security
   - **Group name**: `Endpoint-Monitoring-Pilot`
   - **Membership type**: Assigned
   - Add: 10-50 test devices or users
   - Click: **Create**

2. **Assign to Pilot**:
   - Back in app assignment
   - Click: **Add group** under **Required**
   - Select: `Endpoint-Monitoring-Pilot`
   - Configure settings as above
   - Click: **Next**

**Note**: After pilot validation (1 week), come back and add more groups:
- Week 2: Add 25% of devices
- Week 3: Add 50% of devices  
- Week 4: Add all remaining devices

### Step 4.10: Review and Create

1. **Review All Settings**:
   - App information
   - Program settings
   - Requirements
   - Detection rules
   - Assignments

2. **Create Application**:
   - Click: **Create**
   - Wait for creation to complete
   - You'll see: "Successfully created app"

---

## Phase 5: Monitor Deployment (Ongoing)

### Step 5.1: Check Intune Deployment Status

1. **In Intune Admin Center**:
   - Go to: **Apps** > **Windows**
   - Click on: **Oricol Endpoint Monitoring Agent**

2. **View Device Install Status**:
   - Click: **Device install status** (under Monitor)
   - Review status of each device:
     - **Installed**: ✅ Success
     - **In Progress**: ⏳ Installing
     - **Pending**: 📋 Waiting to install
     - **Failed**: ❌ Error occurred
     - **Not Installed**: ⚠️ Not yet attempted

3. **Check Failure Details**:
   - Click on any failed device
   - Review error code and message
   - Take corrective action if needed

### Step 5.2: Verify in Oricol Dashboard

1. **Login to Oricol Dashboard**:
   - Navigate to your Oricol dashboard URL
   - Sign in with admin credentials

2. **Open Endpoint Monitoring**:
   - Click: **Endpoint Monitoring** in sidebar
   - Or navigate to: `/endpoint-monitoring`

3. **Verify Devices Appearing**:
   - Should see devices appearing within 5-10 minutes
   - Check **Status**: Should be "Online"
   - Check **Last Seen**: Should be recent (< 5 minutes)
   - Verify metrics being collected

### Step 5.3: Validate on Individual Devices

On a deployed device (for troubleshooting):

1. **Check Service Status**:
   ```powershell
   Get-Service -Name OricolEndpointAgent
   # Status should be: Running
   ```

2. **View Recent Logs**:
   ```powershell
   Get-Content "C:\ProgramData\Oricol\EndpointAgent\Logs\agent-$(Get-Date -Format 'yyyy-MM-dd').log" -Tail 20
   ```

3. **Verify Installation Files**:
   ```powershell
   Test-Path "C:\Program Files\Oricol\endpoint-agent\OricolEndpointAgent.ps1"
   Test-Path "C:\Program Files\Oricol\endpoint-agent\config.json"
   # Both should return: True
   ```

4. **Check Last Report**:
   ```powershell
   Get-Content "C:\ProgramData\Oricol\EndpointAgent\Logs\agent-*.log" | 
   Select-String "Data sent successfully" | 
   Select-Object -Last 1
   ```

---

## Phase 6: Troubleshooting Common Issues

### Issue 1: Installation Fails with "Script Not Found"

**Symptoms**: Intune shows failed installation with script-related error

**Solution**:
1. Verify package was created correctly
2. Check that OricolEndpointAgent.ps1 is in the root of the package
3. Recreate package using Prepare-IntunePackage.ps1
4. Re-upload to Intune

### Issue 2: Detection Rule Not Working

**Symptoms**: Intune shows "Not detected" even when installed

**Solution**:
1. On affected device, verify:
   ```powershell
   Get-Service -Name OricolEndpointAgent
   Get-Item "HKLM:\SYSTEM\CurrentControlSet\Services\OricolEndpointAgent"
   ```
2. If service exists but detection fails, use custom script detection instead
3. Upload `detect-agent.ps1` as detection script

### Issue 3: Agent Not Reporting to Dashboard

**Symptoms**: Service running but device not in dashboard

**Solution**:
1. Verify config.json has correct credentials
2. Test network connectivity:
   ```powershell
   Test-NetConnection your-project.supabase.co -Port 443
   ```
3. Check agent logs for errors
4. Verify token is valid in Supabase database
5. Restart agent service:
   ```powershell
   Restart-Service -Name OricolEndpointAgent
   ```

### Issue 4: Slow Deployment

**Symptoms**: Devices taking long time to install

**Solution**:
1. Check Intune service health: https://admin.microsoft.com/Adminportal/Home#/servicehealth
2. Verify devices are checking in: Settings > Accounts > Work Access > Info > Sync
3. Force sync on test device to verify
4. Consider staggering deployments more

### Issue 5: Permission Errors

**Symptoms**: Installation fails with permission-related errors

**Solution**:
1. Verify install behavior is set to "System" not "User"
2. Ensure devices are Azure AD joined or Hybrid joined
3. Check that Intune policies don't block PowerShell execution
4. Review device event logs for specific errors

---

## Phase 7: Post-Deployment Tasks

### Week 1: Intensive Monitoring

- [ ] Check Intune deployment status daily
- [ ] Verify new devices appear in dashboard
- [ ] Review agent logs for errors
- [ ] Address any installation failures
- [ ] Document common issues and solutions

### Week 2-4: Regular Monitoring

- [ ] Check deployment status twice per week
- [ ] Review dashboard for offline devices
- [ ] Monitor data quality and completeness
- [ ] Plan for next deployment phase

### Ongoing Maintenance

- [ ] Review endpoint health weekly
- [ ] Update agent configuration as needed
- [ ] Plan for agent version updates
- [ ] Rotate tokens annually
- [ ] Audit access to credentials
- [ ] Review and optimize policies

---

## Deployment Checklist

### Pre-Deployment
- [ ] Supabase backend configured
- [ ] Database migration applied
- [ ] Edge function deployed and tested
- [ ] Agent tokens generated
- [ ] Token stored in database
- [ ] Win32 Content Prep Tool downloaded
- [ ] Package prepared successfully
- [ ] Pilot group created
- [ ] Monitoring plan established

### During Deployment
- [ ] Package uploaded to Intune
- [ ] App information configured
- [ ] Install/uninstall commands set
- [ ] Requirements configured
- [ ] Detection rules configured
- [ ] Assignments configured
- [ ] Application created successfully
- [ ] Deployment started

### Post-Deployment
- [ ] Devices showing "Installed" in Intune
- [ ] Service running on devices
- [ ] Devices appearing in dashboard
- [ ] Data being collected
- [ ] No critical errors
- [ ] Documentation updated
- [ ] Team trained
- [ ] Support procedures established

---

## Success Metrics

Your deployment is successful when:

✅ **95%+ Installation Success Rate**
- Most devices show "Installed" in Intune within 24 hours

✅ **Real-Time Reporting**
- Devices appear in dashboard within 5 minutes
- Last seen updates every 5 minutes

✅ **Complete Data Collection**
- All security metrics collected
- Performance data accurate
- Compliance status reported

✅ **Silent Operation**
- Users unaware of agent
- No performance impact
- No user complaints

✅ **Reliable Monitoring**
- < 5% offline devices
- Consistent data quality
- Alerts working properly

---

## Support Resources

### Documentation
- **Intune Scripts README**: `intune/README.md`
- **Agent Documentation**: `../README.md`
- **Quick Start**: `../QUICK_START.md`
- **System Overview**: `../../ENDPOINT_MONITORING_SYSTEM.md`
- **Full Deployment Guide**: `../../ENDPOINT_MONITORING_INTUNE_DEPLOYMENT.md`

### External Links
- [Microsoft Intune Documentation](https://docs.microsoft.com/intune)
- [Win32 App Management](https://docs.microsoft.com/mem/intune/apps/apps-win32-app-management)
- [Supabase Documentation](https://supabase.com/docs)
- [NSSM Documentation](https://nssm.cc/usage)

### Contact Support
- **Email**: support@oricol.co.za
- **Dashboard**: Click "?" icon
- **Emergency**: Check documentation for phone support

---

## Appendix

### A. PowerShell Commands Reference

```powershell
# Check service status
Get-Service -Name OricolEndpointAgent

# View logs
Get-Content "C:\ProgramData\Oricol\EndpointAgent\Logs\agent-$(Get-Date -Format 'yyyy-MM-dd').log" -Tail 50

# Restart service
Restart-Service -Name OricolEndpointAgent

# Force Intune sync
Get-ScheduledTask | Where-Object {$_.TaskName -eq 'PushLaunch'} | Start-ScheduledTask

# Test manual collection
cd "C:\Program Files\Oricol\endpoint-agent"
.\OricolEndpointAgent.ps1 -RunOnce

# Check installation files
Get-ChildItem "C:\Program Files\Oricol\endpoint-agent"
Get-ChildItem "C:\ProgramData\Oricol\EndpointAgent\Logs"
```

### B. Deployment Timeline Template

| Week | Phase | Devices | Activities |
|------|-------|---------|------------|
| 0 | Preparation | 0 | Backend setup, token generation, package prep |
| 1 | Pilot | 10-50 | Deploy to pilot, intensive monitoring |
| 2 | Phase 1 | 25% | Deploy to first quarter, daily monitoring |
| 3 | Phase 2 | 50% | Deploy to half, daily monitoring |
| 4-5 | Phase 3 | 100% | Complete rollout, regular monitoring |

### C. Token Management Template

| Token Name | Created | Expires | Used For | Status |
|------------|---------|---------|----------|--------|
| Pilot-2024 | 2024-12-20 | 2026-12-20 | Pilot group | Active |
| Dept-IT | 2024-12-27 | 2026-12-27 | IT Department | Active |
| Dept-Sales | 2025-01-03 | 2027-01-03 | Sales Department | Active |

---

**Document Version**: 1.0.0  
**Last Updated**: December 2024  
**Author**: Oricol IT Solutions

**End of Guide** - You're ready to deploy! 🚀
