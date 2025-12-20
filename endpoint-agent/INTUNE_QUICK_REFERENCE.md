# Intune Deployment Quick Reference

## 🎯 Getting Started

This document helps you quickly navigate to the right resources for deploying the Oricol Endpoint Monitoring Agent via Microsoft Intune.

## 📁 Directory Structure

```
endpoint-agent/
├── OricolEndpointAgent.ps1          # Main agent script
├── Generate-AgentTokens.ps1         # Token generation utility
├── config.json.template             # Configuration template
├── README.md                        # Agent documentation
├── QUICK_START.md                   # 35-minute quick deployment
└── intune/                          # Intune deployment helpers
    ├── Prepare-IntunePackage.ps1    # Automated package preparation
    ├── detect-agent.ps1             # Detection script
    ├── requirements-check.ps1       # Requirements validation
    ├── install-wrapper.ps1          # Installation wrapper
    ├── README.md                    # Intune quick start
    └── DEPLOYMENT_GUIDE.md          # Detailed step-by-step guide
```

## 🚀 Choose Your Path

### Path 1: Fast Track (35 minutes)
**Best for**: IT professionals familiar with Intune

1. Read: `endpoint-agent/QUICK_START.md`
2. Generate tokens with `Generate-AgentTokens.ps1`
3. Run `intune/Prepare-IntunePackage.ps1`
4. Upload to Intune and deploy

### Path 2: Comprehensive Guide (45 minutes)
**Best for**: First-time Intune deployments or large organizations

1. Read: `intune/DEPLOYMENT_GUIDE.md`
2. Follow all 7 phases step-by-step
3. Includes phased rollout planning
4. Complete troubleshooting guide

### Path 3: Script Reference
**Best for**: Automation and customization

1. Review: `intune/README.md`
2. Examine individual helper scripts
3. Customize as needed for your environment
4. Integrate with existing deployment tools

## 📋 Quick Command Reference

### Generate Agent Token
```powershell
cd endpoint-agent
.\Generate-AgentTokens.ps1 -Count 1 -OutputFile "tokens.csv"
```

### Prepare Intune Package (Automated)
```powershell
cd endpoint-agent/intune
.\Prepare-IntunePackage.ps1 `
    -SupabaseUrl "https://your-project.supabase.co" `
    -SupabaseAnonKey "your-anon-key" `
    -AgentToken "your-token" `
    -OutputPath "C:\IntunePackages"
```

### Intune Install Command
```powershell
powershell.exe -ExecutionPolicy Bypass -WindowStyle Hidden -NoProfile -NonInteractive -File "OricolEndpointAgent.ps1" -Install
```

### Detection Rule (Registry)
```
Key: HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Services\OricolEndpointAgent
Method: Key exists
```

## 📚 Documentation Map

### For Deployment
| Document | Purpose | Time to Read |
|----------|---------|--------------|
| `intune/README.md` | Overview and quick start | 5 min |
| `intune/DEPLOYMENT_GUIDE.md` | Complete step-by-step guide | 15 min |
| `endpoint-agent/QUICK_START.md` | Fast track deployment | 3 min |

### For Understanding
| Document | Purpose | Time to Read |
|----------|---------|--------------|
| `endpoint-agent/README.md` | Agent features and options | 10 min |
| `ENDPOINT_MONITORING_SYSTEM.md` | Complete system architecture | 20 min |
| `ENDPOINT_MONITORING_INTUNE_DEPLOYMENT.md` | Original deployment reference | 30 min |

### For Troubleshooting
| Document | Purpose |
|----------|---------|
| `intune/DEPLOYMENT_GUIDE.md` (Phase 6) | Common issues and solutions |
| `intune/README.md` (Troubleshooting section) | Quick fixes |
| `endpoint-agent/README.md` (Troubleshooting section) | Agent-specific issues |

## 🔧 Helper Scripts Explained

### Prepare-IntunePackage.ps1
**What it does:**
- Validates environment (admin rights, PowerShell version)
- Creates staging directory
- Copies agent files
- Generates config.json from your credentials
- Downloads NSSM service manager
- Creates .intunewin package

**When to use:** Always use this for package preparation - it automates everything

**Example:**
```powershell
.\Prepare-IntunePackage.ps1 `
    -SupabaseUrl "https://abc.supabase.co" `
    -SupabaseAnonKey "eyJ..." `
    -AgentToken "secure-token" `
    -OutputPath "C:\Packages"
```

### detect-agent.ps1
**What it does:**
- Checks if OricolEndpointAgent service exists
- Verifies service is running
- Returns exit code 0 (success) or 1 (not installed)

**When to use:** Upload to Intune as custom detection script (optional - registry detection is easier)

### requirements-check.ps1
**What it does:**
- Validates Windows version (10 1809+)
- Checks PowerShell version (5.1+)
- Verifies disk space (100MB+)
- Confirms admin privileges

**When to use:** Upload to Intune as requirement script (optional - Intune has built-in requirements)

### install-wrapper.ps1
**What it does:**
- Wraps the main installation
- Provides detailed logging
- Handles Intune-specific scenarios
- Verifies installation success

**When to use:** This is used internally by the main agent script - you don't call it directly

## ✅ Pre-Deployment Checklist

Before starting deployment:

- [ ] Supabase project created and accessible
- [ ] Database migration applied (endpoint monitoring tables)
- [ ] Edge function deployed (`endpoint-data-ingestion`)
- [ ] Supabase URL and Anon Key obtained
- [ ] Agent token generated and stored in database
- [ ] Microsoft 365 Intune access confirmed
- [ ] Win32 Content Prep Tool downloaded
- [ ] Target device groups identified
- [ ] Pilot group created (10-50 devices)

## 🎯 Deployment Timeline

| Phase | Duration | What Happens |
|-------|----------|--------------|
| **Preparation** | 30 min | Backend setup, token generation, package prep |
| **Intune Setup** | 15 min | Upload package, configure app |
| **Pilot** | 1 week | Deploy to 10-50 test devices |
| **Phase 1** | 1 week | Deploy to 25% of devices |
| **Phase 2** | 1 week | Deploy to 50% of devices |
| **Full Rollout** | 2 weeks | Complete deployment |
| **Total** | ~5 weeks | Organization-wide deployment |

## 🆘 Getting Help

### Documentation
1. **Quick issues**: Check `intune/README.md` troubleshooting
2. **Detailed issues**: See `intune/DEPLOYMENT_GUIDE.md` Phase 6
3. **System-wide**: Review `ENDPOINT_MONITORING_SYSTEM.md`

### Support Channels
- **Email**: support@oricol.co.za
- **Dashboard**: Click "?" icon in Endpoint Monitoring page
- **Logs**: `C:\ProgramData\Oricol\EndpointAgent\Logs\`

### Common Issues Quick Links

| Issue | Solution |
|-------|----------|
| Package creation fails | Check admin rights, verify IntuneWinAppUtil.exe path |
| Intune deployment fails | Review `intune/DEPLOYMENT_GUIDE.md` Phase 6 |
| Agent not reporting | Check network connectivity, verify config.json |
| Detection not working | Use registry detection or upload custom script |
| Service won't start | Review logs, verify config.json syntax |

## 🚀 Success Criteria

Your deployment is successful when:

✅ **Intune Status**
- 95%+ devices show "Installed"
- No critical failures
- Detection rules working

✅ **Dashboard Status**
- All devices appearing
- Status: Online
- Last seen: < 5 minutes
- Metrics being collected

✅ **User Experience**
- Completely silent installation
- No performance impact
- No user complaints

✅ **Monitoring**
- Security status displayed
- Compliance tracking active
- Alerts functioning

## 📊 Key Metrics

After successful deployment:

- **Installation Success Rate**: Target 95%+
- **Reporting Interval**: Every 5 minutes
- **Data Completeness**: 100% of metrics
- **Agent Performance**: < 1% CPU average
- **Network Usage**: ~1-2 KB per 5-minute interval
- **Disk Usage**: < 50 MB per endpoint

## 🔄 Maintenance

### Weekly
- [ ] Review deployment status
- [ ] Check for offline devices
- [ ] Monitor dashboard alerts

### Monthly
- [ ] Update agent configuration if needed
- [ ] Review token expiration dates
- [ ] Plan agent updates
- [ ] Audit system health

### Annually
- [ ] Rotate agent tokens
- [ ] Review security policies
- [ ] Update documentation
- [ ] Plan major upgrades

## 📖 Additional Resources

### External Links
- [Microsoft Intune Admin Center](https://endpoint.microsoft.com)
- [Win32 Content Prep Tool](https://github.com/microsoft/Microsoft-Win32-Content-Prep-Tool)
- [Intune Documentation](https://docs.microsoft.com/intune)
- [Win32 App Management Guide](https://docs.microsoft.com/mem/intune/apps/apps-win32-app-management)
- [NSSM Service Manager](https://nssm.cc/)

### Related Documentation
- `ENDPOINT_MONITORING_SUMMARY.md` - Executive summary
- `ENDPOINT_MONITORING_SYSTEM.md` - System architecture
- `ENDPOINT_MONITORING_INTUNE_DEPLOYMENT.md` - Original comprehensive guide

---

## Quick Start - Right Now!

**Ready to deploy? Here's what to do RIGHT NOW:**

1. **Open PowerShell as Administrator**

2. **Navigate to the agent directory:**
   ```powershell
   cd C:\path\to\Oricoles-Ticket-Flow\endpoint-agent
   ```

3. **Generate a token:**
   ```powershell
   .\Generate-AgentTokens.ps1 -Count 1 -OutputFile "tokens.csv"
   ```

4. **Apply the SQL in Supabase** (from generated file)

5. **Prepare the package:**
   ```powershell
   cd intune
   .\Prepare-IntunePackage.ps1 `
       -SupabaseUrl "https://YOUR-PROJECT.supabase.co" `
       -SupabaseAnonKey "YOUR-ANON-KEY" `
       -AgentToken "TOKEN-FROM-STEP-3" `
       -OutputPath "C:\IntunePackages"
   ```

6. **Go to Intune and upload!**
   - Navigate to: https://endpoint.microsoft.com
   - Follow the prompts from the script output

**That's it!** You're ready to deploy. 🎉

---

**Last Updated**: December 2024  
**Version**: 1.0.0  
**Author**: Oricol IT Solutions
