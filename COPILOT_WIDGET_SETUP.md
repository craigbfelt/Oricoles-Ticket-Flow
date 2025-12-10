# Copilot Widget Setup Guide

## Overview

The Copilot Widget is an AI-powered floating assistant that stays on all pages of the dashboard. It allows users to perform various dashboard functions through voice or text commands, with actions restricted based on user permissions.

## Features

### 🎯 Core Capabilities

- **Voice Input**: Speak commands using your device's microphone (supported in Chrome, Edge, and Safari)
- **Text Input**: Type commands in natural language
- **Permission-Based Access**: Users can only perform actions they have permission for
- **Real-time Feedback**: See progress and status of your commands
- **Persistent Widget**: Always available on all pages
- **Minimize/Maximize**: Collapse to a small button when not in use

### 🔐 Supported Actions (Permission-Based)

| Action | Required Permission | Keywords | Example Commands |
|--------|-------------------|----------|------------------|
| Import Document | `document_hub` | "import document", "upload document" | "import document", "upload file" |
| Convert Document | `document_hub` | "convert document", "transform document" | "convert document to PDF" |
| Import CSV Users | `users_management` | "import users", "import csv", "add users" | "import users from CSV" |
| Import Network Data | `network_diagrams` | "import network", "network diagram" | "import network topology" |
| Create Ticket | `create_tickets` | "create ticket", "new ticket", "open ticket" | "create a new ticket" |

### 👥 User Roles & Permissions

- **Admin**: Can perform ALL actions
- **Regular Users**: Limited to actions matching their permissions

## Setup Instructions

### 1. Supabase Configuration

No additional Supabase setup is required. The widget uses existing authentication and permissions from the `user_roles` and `user_permissions` tables.

**Already Configured:**
- ✅ User authentication via `supabase.auth`
- ✅ Role-based permissions in `user_roles` table
- ✅ Custom permissions in `user_permissions` table
- ✅ Permissions context provider

### 2. API Keys Required

The widget itself doesn't require new API keys, as it integrates with existing functionality. However, the underlying features may require:

#### Microsoft 365 Integration (for user sync, if using)
Set these as Supabase Edge Function environment variables:

```bash
MICROSOFT_TENANT_ID="your-tenant-id"
MICROSOFT_CLIENT_ID="your-client-id"
MICROSOFT_CLIENT_SECRET="your-client-secret"
```

**How to set in Supabase:**
1. Go to https://supabase.com/dashboard
2. Select your project
3. Navigate to **Edge Functions** → **Environment Variables**
4. Add the above variables

#### Required Microsoft API Permissions
- `DeviceManagementManagedDevices.Read.All`
- `User.Read.All`
- `Organization.Read.All`
- `eDiscovery.ReadWrite.All`

### 3. Browser Permissions

For voice input to work, users need to:

1. **Allow microphone access** when prompted by the browser
2. Use a supported browser:
   - ✅ Chrome/Edge (full support)
   - ✅ Safari (full support)
   - ❌ Firefox (limited speech recognition support)

## Usage Guide

### Getting Started

1. **Open any page** in the dashboard
2. **Look for the floating sparkle icon** (✨) in the bottom-right corner
3. **Click the icon** to expand the copilot widget

### Using Text Commands

1. Type your command in natural language
2. Examples:
   - "import document"
   - "create ticket"
   - "import users from CSV"
3. Click the **Send** button or press Enter

### Using Voice Commands

1. Click the **microphone icon** in the widget
2. Speak your command clearly
3. The widget will transcribe your speech
4. Click **Send** to execute

### Available Actions

The widget shows only the actions you have permission to perform. Each action is displayed as a badge that you can click to auto-fill the command.

## Permission Configuration

### For Administrators

To grant users specific permissions:

1. Go to **User Management** page
2. Select a user
3. Assign appropriate roles or custom permissions
4. The copilot will automatically respect these permissions

### Permission Mappings

The widget checks these permission keys:

```typescript
{
  document_hub: boolean,        // Document import/convert
  users_management: boolean,    // CSV user import
  network_diagrams: boolean,    // Network data import
  create_tickets: boolean,      // Ticket creation
  // ... other permissions
}
```

### Admin Override

Users with the `admin` role can perform ALL actions regardless of specific permissions.

## Troubleshooting

### Voice Input Not Working

**Problem**: Microphone icon is disabled or voice input fails

**Solutions**:
- Check browser microphone permissions in browser settings
- Use Chrome or Edge for best compatibility
- Ensure you're on HTTPS (required for microphone access)
- Check browser console for specific errors

### Command Not Recognized

**Problem**: "Command not recognized" error

**Solutions**:
- Check the "Available Actions" badges for supported commands
- Use keywords similar to the examples
- Ensure your command includes action keywords like "import", "create", etc.

### Permission Denied

**Problem**: "Permission denied" error

**Solutions**:
- Contact your administrator to verify your permissions
- Check your role in User Management
- Admins can grant specific permissions via the user_permissions table

### Widget Not Visible

**Problem**: Copilot widget doesn't appear

**Solutions**:
- Refresh the page
- Check if you're logged in
- Clear browser cache
- Check browser console for JavaScript errors

## Technical Details

### Component Structure

```
FloatingCopilot.tsx
├── Permission checking (usePermissions hook)
├── Speech recognition (Web Speech API)
├── Action matching (keyword-based)
├── Task execution (async handlers)
└── UI rendering (minimize/maximize states)
```

### Integration Points

The widget integrates with:
- **PermissionsContext**: For role-based access control
- **Supabase Auth**: For user authentication
- **Web Speech API**: For voice recognition
- **Toast notifications**: For user feedback

### Future Enhancements

Planned features:
- [ ] Integration with actual document import dialogs
- [ ] Direct ticket creation from widget
- [ ] CSV upload from widget
- [ ] AI-powered command suggestions
- [ ] Command history search
- [ ] Keyboard shortcuts
- [ ] Multi-language support

## Security Considerations

### Built-in Security

- ✅ Permission checks before executing any action
- ✅ User authentication required
- ✅ Role-based access control
- ✅ No sensitive data in localStorage
- ✅ Supabase RLS policies enforced

### Best Practices

- Grant minimum required permissions to users
- Regularly audit user roles and permissions
- Monitor copilot usage through task history
- Keep Supabase client library updated

## Support

For issues or questions:
1. Check this documentation
2. Review browser console for errors
3. Verify user permissions in User Management
4. Contact your system administrator

## Changelog

### Version 1.0.0 (Current)
- Initial release
- Voice and text input support
- Permission-based action execution
- Minimize/maximize functionality
- Task history tracking
- Support for 5 core actions
