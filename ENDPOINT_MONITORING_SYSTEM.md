# Endpoint Monitoring & Security Tool - Complete System Overview

## Executive Summary

The Oricol Endpoint Monitoring Tool is a comprehensive, enterprise-grade solution for monitoring and securing Windows endpoints across your organization. It provides real-time visibility into security posture, performance metrics, and compliance status, all integrated seamlessly with Microsoft 365 Intune for automated deployment.

### Key Features

✅ **Complete Security Monitoring**
- Antivirus status and definition updates
- Windows Update compliance tracking
- Ransomware protection and controlled folder access
- BitLocker encryption status
- Firewall configuration validation
- Zero Trust process verification

✅ **Performance & Resource Monitoring**
- Real-time CPU, memory, and storage utilization
- Network bandwidth tracking per process
- System performance metrics
- Resource usage alerts

✅ **Compliance & Policy Enforcement**
- Group Policy compliance checking
- Security posture assessment
- Vulnerability identification
- Automated security patching (optional)

✅ **Silent Intune Deployment**
- Completely silent installation via Microsoft 365 Intune
- No user interaction required
- Automatic updates and maintenance
- Cannot be cancelled by end users

✅ **Centralized Dashboard**
- Real-time endpoint status on user cards
- Comprehensive security overview
- Detailed metrics per endpoint
- Security alerts and notifications
- Compliance reporting

## System Architecture

### Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Oricol Dashboard (Web UI)                 │
│                   - Endpoint Monitoring Page                 │
│                   - Real-time Status Display                 │
│                   - Security Alerts                          │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                    Supabase Backend                          │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Edge Function: endpoint-data-ingestion              │   │
│  │  - Receives agent reports                            │   │
│  │  - Validates authentication                          │   │
│  │  - Stores data in database                           │   │
│  └─────────────────────────────────────────────────────┘   │
│                             │                                │
│                             ▼                                │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  PostgreSQL Database                                 │   │
│  │  - endpoint_monitoring (device info)                 │   │
│  │  - endpoint_metrics (performance data)               │   │
│  │  - endpoint_security_scans (scan results)            │   │
│  │  - endpoint_policies (compliance data)               │   │
│  │  - endpoint_network_processes (bandwidth)            │   │
│  │  - endpoint_security_events (alerts)                 │   │
│  │  - endpoint_agent_tokens (authentication)            │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                             ▲
                             │ HTTPS (443)
                             │ Encrypted communication
                             │
┌─────────────────────────────────────────────────────────────┐
│               Windows Endpoint Agents                        │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  OricolEndpointAgent.ps1 (PowerShell Service)        │  │
│  │  - Collects security metrics                         │  │
│  │  - Monitors performance                              │  │
│  │  - Checks policy compliance                          │  │
│  │  - Reports to Supabase every 5 minutes              │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  Deployed via: Microsoft 365 Intune (Silent Installation)   │
└─────────────────────────────────────────────────────────────┘
```

## What Gets Monitored

### 1. Security & Protection

| Metric | Description | Alert Triggers |
|--------|-------------|----------------|
| **Antivirus Status** | Name, version, definitions, real-time protection | Disabled, outdated definitions |
| **Windows Updates** | Status, pending updates, critical patches | Critical updates pending |
| **Ransomware Protection** | Controlled folder access, behavior monitoring | Protection disabled |
| **Encryption** | BitLocker status, drive encryption | Not encrypted |
| **Firewall** | Status, profile configuration | Disabled |
| **Security Events** | Real-time security alerts and incidents | Critical/High severity events |

### 2. Performance & Resources

| Metric | Description | Alert Triggers |
|--------|-------------|----------------|
| **CPU Usage** | Real-time processor utilization | > 90% sustained |
| **Memory Usage** | RAM consumption and availability | > 85% usage |
| **Storage Usage** | Disk space across all drives | > 90% full |
| **Network Speed** | Upload/download bandwidth | Unusual patterns |

### 3. Network Activity

| Metric | Description | Alert Triggers |
|--------|-------------|----------------|
| **Process Bandwidth** | Network usage per application | Suspicious processes |
| **Connection Count** | Active network connections | Unusual connections |
| **Data Transfer** | Bytes sent/received per process | Excessive data transfer |

### 4. Compliance & Policies

| Metric | Description | Alert Triggers |
|--------|-------------|----------------|
| **Group Policy** | Current vs. expected policy values | Non-compliant policies |
| **Security Posture** | Overall compliance assessment | Non-compliant status |
| **Vulnerabilities** | Known security weaknesses | Critical vulnerabilities |
| **OS Version** | Windows build and updates | Outdated OS version |

## Database Schema

### Core Tables

#### endpoint_monitoring
Stores device information and overall status
- Device identification (name, hostname, MAC, IP)
- Operating system details
- Hardware specifications
- Last seen timestamp
- Current status (online/offline/warning/critical)

#### endpoint_metrics
Real-time performance and security metrics
- Antivirus status and details
- Windows Update information
- Security protection status
- Resource utilization (CPU, RAM, storage)
- Network bandwidth
- Overall compliance and security level

#### endpoint_security_scans
Security scan results and findings
- Scan type (antivirus, vulnerability, policy, ransomware)
- Issues found (categorized by severity)
- Detailed findings (JSON)
- Auto-remediation status

#### endpoint_policies
Group Policy compliance tracking
- Policy name and category
- Current vs. expected values
- Compliance status
- Auto-fix capability

#### endpoint_network_processes
Bandwidth usage per process
- Process name and path
- Bytes sent/received
- Upload/download rates
- Suspicious activity flags

#### endpoint_security_events
Security events and alerts
- Event type and severity
- Event description and details
- Actions taken
- Zero Trust blocking status

#### endpoint_agent_tokens
Authentication tokens for agents
- Token hash (secure storage)
- Expiration date
- Active status
- Last used timestamp

### Database Views

#### endpoint_dashboard_summary
Aggregated view for dashboard display combining:
- Latest endpoint status
- Most recent metrics
- Critical issues count (24h)
- Security events count (24h)
- User information

## Deployment Process

### Prerequisites Checklist

- [ ] Microsoft 365 tenant with Intune
- [ ] Supabase project created
- [ ] Database migration applied
- [ ] Edge function deployed
- [ ] Agent tokens generated
- [ ] Win32 Content Prep Tool downloaded
- [ ] NSSM service manager downloaded

### Deployment Steps Overview

1. **Backend Setup** (15 minutes)
   - Apply database migration in Supabase
   - Deploy edge function
   - Generate agent tokens
   - Test edge function connectivity

2. **Agent Package Preparation** (30 minutes)
   - Download agent files
   - Configure config.json with credentials
   - Include NSSM service manager
   - Package with Win32 Content Prep Tool
   - Create .intunewin file

3. **Intune Configuration** (45 minutes)
   - Upload package to Intune
   - Configure app information
   - Set install/uninstall commands
   - Configure detection rules
   - Set requirements
   - Configure assignments

4. **Phased Rollout** (1-4 weeks)
   - Phase 1: Pilot group (10-50 devices)
   - Phase 2: Department rollout (25%)
   - Phase 3: Full deployment (100%)
   - Monitor and verify each phase

5. **Monitoring & Validation** (Ongoing)
   - Check Intune deployment status
   - Verify endpoints in dashboard
   - Review alerts and compliance
   - Address any issues

## Dashboard Features

### Main Dashboard View

**Statistics Overview:**
- Total endpoints count
- Online endpoints count
- Critical issues count
- Non-compliant devices count
- Average compliance percentage

**Endpoint Cards:**
Each card displays:
- Device name and hostname
- Online/offline status
- Operating system
- Antivirus status
- Encryption status
- Last seen timestamp
- Storage usage
- Security level badge
- Compliance status badge
- Critical alerts (if any)

### Detailed Endpoint View

Click any endpoint card to view detailed information in a side panel:

**Overview Tab:**
- System information (OS, CPU, memory, storage)
- Hardware details
- Network information
- Current performance metrics

**Security Tab:**
- Antivirus status and details
- Protection status (BitLocker, firewall, ransomware)
- Recent security scans
- Security events timeline

**Network Tab:**
- Network speed metrics
- Top processes by bandwidth usage
- Suspicious process flags
- Connection counts

**Policies Tab:**
- Group Policy compliance list
- Current vs. expected values
- Non-compliant policies highlighted
- Auto-fix availability

## Security & Compliance

### Data Security

**In Transit:**
- All communication over HTTPS (TLS 1.2+)
- Encrypted data transfer
- Certificate validation

**At Rest:**
- Database encryption enabled
- Token hashing (SHA-256)
- No plain-text credentials stored

**Access Control:**
- Row Level Security (RLS) policies
- Role-based access (admin/support staff)
- Service role for agent ingestion
- Token-based agent authentication

### Compliance Features

**Regulatory Compliance:**
- GDPR compliant data handling
- Data retention policies
- Audit trail logging
- User consent mechanisms

**Security Standards:**
- CIS Benchmarks alignment
- NIST Cybersecurity Framework
- ISO 27001 compatible
- Zero Trust principles

### Privacy Considerations

**What Is Collected:**
- System configuration and status
- Security software status
- Performance metrics
- Network process names (not content)

**What Is NOT Collected:**
- User files or documents
- Personal data or PII
- Network traffic content
- Passwords or credentials
- Browser history
- Application data

## Configuration Options

### Agent Configuration (config.json)

```json
{
  "SupabaseUrl": "https://your-project.supabase.co",
  "SupabaseAnonKey": "your-anon-key",
  "AgentToken": "your-secure-token",
  "CollectionIntervalMinutes": 5,
  "EnableAutoPatching": false,
  "EnableZeroTrustBlocking": false,
  "LogLevel": "Info"
}
```

### Configuration Parameters

| Parameter | Description | Recommended |
|-----------|-------------|-------------|
| `CollectionIntervalMinutes` | Reporting frequency | 5 minutes |
| `EnableAutoPatching` | Automatic security updates | false (pilot first) |
| `EnableZeroTrustBlocking` | Block suspicious processes | false (requires approval) |
| `LogLevel` | Logging verbosity | Info |

## Operational Procedures

### Daily Operations

**Morning Checks:**
1. Review dashboard for critical alerts
2. Check offline devices
3. Verify compliance status
4. Address security events

**Throughout Day:**
1. Monitor real-time alerts
2. Respond to security incidents
3. Review non-compliant devices
4. Update policies as needed

### Weekly Tasks

1. Review deployment status
2. Analyze trends and patterns
3. Update agent configuration if needed
4. Review and approve auto-patches
5. Generate compliance reports
6. Check agent version updates

### Monthly Tasks

1. Full compliance audit
2. Review security posture
3. Update security policies
4. Plan agent updates
5. Review token expiration dates
6. Capacity planning review

## Troubleshooting Guide

### Agent Not Reporting

**Symptoms:** Device installed but not appearing in dashboard

**Diagnosis Steps:**
1. Check service status: `Get-Service OricolEndpointAgent`
2. Review agent logs: `C:\ProgramData\Oricol\EndpointAgent\Logs\`
3. Test network connectivity: `Test-NetConnection your-project.supabase.co -Port 443`
4. Verify token validity in database

**Common Fixes:**
- Restart service: `Restart-Service OricolEndpointAgent`
- Verify config.json credentials
- Check firewall rules
- Regenerate and update token

### Installation Failures

**Symptoms:** Intune shows "Failed" status

**Diagnosis Steps:**
1. Check Intune error code
2. Review device event logs
3. Verify system requirements
4. Check admin privileges

**Common Fixes:**
- Ensure Windows 10 1809 or later
- Verify PowerShell execution policy
- Check disk space availability
- Re-package with correct configuration

### Dashboard Not Updating

**Symptoms:** Old data or no recent updates

**Diagnosis Steps:**
1. Check edge function health
2. Verify database connectivity
3. Review edge function logs
4. Check RLS policies

**Common Fixes:**
- Redeploy edge function
- Verify service role key
- Check database migrations applied
- Review Supabase status

## Performance & Scalability

### Resource Impact on Endpoints

**CPU Usage:** < 1% average, < 5% during collection  
**Memory Usage:** ~50-100 MB RAM  
**Disk Space:** < 50 MB for agent and logs  
**Network Usage:** ~1-2 KB per report (every 5 minutes)

### Scalability

**Supported Scale:**
- Up to 10,000 endpoints per Supabase project
- ~120,000 reports per day per 1,000 devices
- Dashboard supports real-time views for 1,000+ devices

**Database Storage:**
- ~1 MB per endpoint per day
- 30 days retention = ~30 MB per device
- 1,000 devices = ~30 GB per month

### Optimization Tips

1. **For Large Deployments:**
   - Adjust collection interval (10 minutes vs 5)
   - Implement data retention policies
   - Use database partitioning
   - Consider multiple Supabase projects

2. **For Performance:**
   - Create database indexes on frequently queried columns
   - Implement caching on dashboard
   - Use connection pooling
   - Schedule resource-intensive scans off-peak

## Cost Analysis

### Supabase Costs

**Free Tier (up to 500MB database):**
- ~50-100 devices
- Perfect for small businesses
- $0/month

**Pro Tier ($25/month):**
- 8 GB database
- ~2,000 devices
- Recommended for SMB

**Enterprise (Custom pricing):**
- Unlimited scale
- SLA guarantees
- Dedicated support
- Best for large organizations

### Intune Licensing

**Required Licensing:**
- Microsoft 365 E3, E5, or Business Premium
- Or standalone Intune license
- Already included in most M365 plans

**No Additional Costs:**
- Agent software: Free
- Deployment: Included in Intune
- Updates: Automatic and free

### ROI Calculation

**Time Savings:**
- Manual security checks: 2 hours/week/admin → 0 hours
- Compliance reporting: 4 hours/month → 15 minutes
- Incident response: 50% faster with real-time alerts

**Cost Avoidance:**
- Prevented security incidents
- Reduced ransomware risk
- Compliance audit readiness
- Reduced downtime

## Support & Maintenance

### Getting Help

**Documentation:**
- System overview: `ENDPOINT_MONITORING_SYSTEM.md` (this document)
- Deployment guide: `ENDPOINT_MONITORING_INTUNE_DEPLOYMENT.md`
- Agent documentation: `endpoint-agent/README.md`

**Technical Support:**
- Email: support@oricol.co.za
- Dashboard: Click "?" icon in any page
- Emergency: Phone support (for critical issues)

**Community Resources:**
- Oricol support portal
- Knowledge base
- Video tutorials
- Best practices guides

### Maintenance Schedule

**Agent Updates:**
- Quarterly feature releases
- Monthly security patches
- Critical fixes as needed

**Database:**
- Automatic Supabase updates
- Weekly backup verification
- Monthly capacity review

**Dashboard:**
- Continuous deployment
- Weekly feature updates
- Monthly major releases

## Roadmap & Future Enhancements

### Planned Features

**Q1 2025:**
- [ ] Advanced threat detection with AI
- [ ] Custom alert rules and workflows
- [ ] Integration with Microsoft Sentinel
- [ ] Mobile app for iOS/Android

**Q2 2025:**
- [ ] Automated remediation workflows
- [ ] Compliance templates library
- [ ] Advanced network traffic analysis
- [ ] Integration with ticketing systems

**Q3 2025:**
- [ ] Predictive maintenance
- [ ] Machine learning anomaly detection
- [ ] Multi-tenant support
- [ ] API for third-party integrations

**Q4 2025:**
- [ ] Linux/macOS agent support
- [ ] Container monitoring
- [ ] Cloud workload protection
- [ ] Advanced reporting engine

### Feedback & Feature Requests

We welcome feedback and feature requests! Submit via:
- Dashboard feedback form
- Email: feedback@oricol.co.za
- Community forum

## Conclusion

The Oricol Endpoint Monitoring & Security Tool provides comprehensive, enterprise-grade monitoring and security for your Windows endpoints. With silent Intune deployment, real-time visibility, and centralized management through an intuitive dashboard, it offers a complete solution for modern IT security and compliance requirements.

### Key Benefits Recap

✅ **Complete Visibility** - Know exactly what's happening on every endpoint  
✅ **Enhanced Security** - Proactive threat detection and response  
✅ **Simplified Compliance** - Automated policy checking and reporting  
✅ **Zero Disruption** - Silent deployment, no user impact  
✅ **Centralized Management** - Single dashboard for all endpoints  
✅ **Cost Effective** - Leverage existing Intune infrastructure  

### Getting Started

1. Review the deployment guide: `ENDPOINT_MONITORING_INTUNE_DEPLOYMENT.md`
2. Set up your Supabase backend
3. Configure and package the agent
4. Deploy via Intune
5. Monitor from the dashboard

For questions or assistance, contact the Oricol support team.

---

**Document Version:** 1.0  
**Last Updated:** December 2024  
**Author:** Oricol ES IT Solutions  
**License:** Proprietary - Oricol ES  
