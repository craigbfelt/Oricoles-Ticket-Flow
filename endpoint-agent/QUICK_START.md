# Endpoint Monitoring Agent - Quick Start Guide

## 🚀 Quick Deployment (5 Steps)

### Step 1: Backend Setup (5 minutes)

1. **Apply Database Migration**
   ```sql
   -- In Supabase SQL Editor, run:
   -- File: supabase/migrations/20251217121616_endpoint_monitoring_schema.sql
   ```

2. **Deploy Edge Function**
   ```bash
   # Using Supabase CLI:
   supabase functions deploy endpoint-data-ingestion
   
   # OR via GitHub Actions:
   # Go to Actions > Deploy All Edge Functions > Run workflow
   ```

3. **Get Your Credentials**
   - Supabase URL: Project Settings > API
   - Anon Key: Project Settings > API
   - Copy both for Step 3

### Step 2: Generate Tokens (2 minutes)

```powershell
# Run in PowerShell
.\Generate-AgentTokens.ps1 -Count 1 -OutputFile "tokens.csv"

# This creates:
# - tokens.csv (contains plain tokens - keep secure!)
# - agent-tokens-YYYYMMDD-HHMMSS.sql (for database)
```

Apply the SQL file in Supabase SQL Editor to store tokens.

### Step 3: Configure Agent (3 minutes)

1. **Create config.json** (copy from template)
   ```json
   {
     "SupabaseUrl": "https://your-project.supabase.co",
     "SupabaseAnonKey": "your-anon-key-here",
     "AgentToken": "token-from-step-2",
     "CollectionIntervalMinutes": 5,
     "EnableAutoPatching": false,
     "EnableZeroTrustBlocking": false,
     "LogLevel": "Info"
   }
   ```

2. **Download NSSM**
   - Get from: https://nssm.cc/download
   - Extract `nssm.exe` (64-bit) to this folder

### Step 4: Package for Intune (10 minutes)

1. **Download Win32 Content Prep Tool**
   ```powershell
   # From: https://github.com/microsoft/Microsoft-Win32-Content-Prep-Tool
   # Save IntuneWinAppUtil.exe to a known location
   ```

2. **Use Automated Package Preparation** (Recommended)
   ```powershell
   # Navigate to intune helper directory
   cd intune
   
   # Run automated preparation script
   .\Prepare-IntunePackage.ps1 `
       -SupabaseUrl "https://your-project.supabase.co" `
       -SupabaseAnonKey "your-anon-key-here" `
       -AgentToken "token-from-step-2" `
       -OutputPath "C:\IntunePackages" `
       -IntuneWinAppUtilPath "C:\Tools\IntuneWinAppUtil.exe"
   ```
   
   This script automatically:
   - Creates config.json with your credentials
   - Downloads NSSM service manager
   - Packages everything into .intunewin file
   
   **OR Manual Method:**
   ```powershell
   # Create config.json manually, then:
   .\IntuneWinAppUtil.exe `
       -c "C:\path\to\endpoint-agent" `
       -s "OricolEndpointAgent.ps1" `
       -o "C:\output" `
       -q
   ```

### Step 5: Deploy via Intune (15 minutes)

For detailed step-by-step instructions, see: `intune/DEPLOYMENT_GUIDE.md`

**Quick Steps:**

1. **Go to Intune Admin Center**: https://endpoint.microsoft.com
2. **Add App**: Apps > Windows > Add > Windows app (Win32)
3. **Upload**: Select the `.intunewin` file from Step 4
4. **Configure**:
   - Install command: 
     ```powershell
     powershell.exe -ExecutionPolicy Bypass -WindowStyle Hidden -NoProfile -NonInteractive -File "OricolEndpointAgent.ps1" -Install
     ```
   - Detection: Registry key `HKLM\SYSTEM\CurrentControlSet\Services\OricolEndpointAgent`
5. **Assign**: Select "All Devices" or specific groups
6. **Deploy**: Save and wait for Intune to push

## ✅ Verification

### Check Deployment Status
1. Intune Admin Center > Apps > Your app > Device install status
2. Should show "Installed" for deployed devices

### Check Dashboard
1. Log into Oricoles Dashboard
2. Navigate to "Endpoint Monitoring"
3. Verify endpoints appear with "Online" status

### Check Individual Device
```powershell
# On any deployed device
Get-Service -Name OricolEndpointAgent
# Should show "Running"

# View logs
Get-Content "C:\ProgramData\Oricol\EndpointAgent\Logs\agent-$(Get-Date -Format 'yyyy-MM-dd').log" -Tail 20
```

## 📁 Required Files

Your endpoint-agent folder should contain:
```
endpoint-agent/
├── OricolEndpointAgent.ps1     ✅ Agent script
├── config.json                  ✅ Your configuration
├── nssm.exe                     ✅ Service manager
└── README.md                    ✅ Documentation
```

## 🔧 Test Installation Locally (Optional)

Before Intune deployment, test on one device:

```powershell
# 1. Copy files to Program Files
Copy-Item -Path "endpoint-agent" -Destination "C:\Program Files\Oricol\" -Recurse

# 2. Navigate to folder
cd "C:\Program Files\Oricol\endpoint-agent"

# 3. Test single report (doesn't install service)
.\OricolEndpointAgent.ps1 -RunOnce

# 4. Check if data arrived in dashboard
# Should see device appear within seconds

# 5. If working, install as service
.\OricolEndpointAgent.ps1 -Install

# 6. Verify service running
Get-Service -Name OricolEndpointAgent
```

## 🚨 Troubleshooting

### Agent Not Reporting
```powershell
# Check service status
Get-Service -Name OricolEndpointAgent

# View recent logs
Get-Content "C:\ProgramData\Oricol\EndpointAgent\Logs\agent-*.log" -Tail 50

# Test connectivity
Test-NetConnection your-project.supabase.co -Port 443
```

### Installation Fails
- Verify admin rights
- Check Windows version (10/11 required)
- Ensure PowerShell 5.1+
- Verify config.json is valid JSON

### Token Invalid
- Regenerate token with `Generate-AgentTokens.ps1`
- Apply SQL in Supabase
- Update config.json with new token
- Restart service

## 📚 Full Documentation

- **Intune Helper Scripts**: `intune/README.md` - Quick start for Intune deployment
- **Intune Deployment Guide**: `intune/DEPLOYMENT_GUIDE.md` - Detailed step-by-step instructions
- **Complete System Overview**: `../ENDPOINT_MONITORING_SYSTEM.md`
- **Detailed Deployment**: `../ENDPOINT_MONITORING_INTUNE_DEPLOYMENT.md`
- **Agent Documentation**: `README.md` (in this folder)

## 🆘 Support

- Email: support@oricol.co.za
- Dashboard: Click "?" icon
- Documentation: See files above

## ⚡ Time Estimates

| Task | Time | Complexity |
|------|------|------------|
| Backend Setup | 5 min | Easy |
| Token Generation | 2 min | Easy |
| Agent Configuration | 3 min | Easy |
| Intune Packaging | 10 min | Medium |
| Intune Deployment | 15 min | Medium |
| **Total** | **35 min** | **Medium** |

Plus deployment time: 1-4 weeks for phased rollout

## 🎯 Success Criteria

After deployment, you should see:
- ✅ All devices showing in dashboard
- ✅ Status: Online
- ✅ Last seen: Within 5 minutes
- ✅ Metrics being collected
- ✅ Security status displayed
- ✅ Compliance status shown

---

**Version**: 1.0  
**Last Updated**: December 2024
