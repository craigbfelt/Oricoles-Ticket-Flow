# Device Type Detection Logic

## Overview
This document explains the logic used to differentiate between thin clients and full PCs in the Oricoles Ticket Flow system.

## Classification Rules

### Full PC
A user is classified as having a **Full PC** if any of the following conditions are met:
1. **Has valid VPN credentials** (username/password not "NA" or null)
   - Users with VPN need it for remote access, indicating a full PC
2. **Device in Microsoft Intune** (even without VPN)
   - Example: Heather Landsberg's mini PC that stays at the office
   - These users have a physical PC but don't need VPN for remote work

### Thin Client
A user is classified as having a **Thin Client** if:
1. **Serial number is "NA" or null** AND **VPN credentials are "NA" or null**
   - AND not in Intune
   - These users typically access via RDP terminals
2. **Has device serial** but **only RDP credentials** (no VPN, not in Intune)
   - Terminal-style access only

## Priority Logic

The determination follows this priority order:

```
1. Has valid VPN credentials?
   YES → Full PC
   NO → Continue

2. Serial = "NA"/null AND VPN = "NA"/null?
   YES:
     - Has Intune device? → Full PC
     - Has RDP credentials? → Thin Client
     - Otherwise → Thin Client
   NO → Continue

3. Has valid serial but no VPN?
   - In Intune? → Full PC
   - Has RDP only? → Thin Client
   - Otherwise → Full PC (default)
```

## Implementation

The logic is centralized in `/src/lib/deviceTypeUtils.ts` with these key functions:

### `determineDeviceType(input: DeviceTypeInput): DeviceType`
Main function that returns 'thin_client', 'full_pc', or 'unknown'

**Input Parameters:**
- `deviceSerialNumber`: Serial number from hardware inventory
- `vpnUsername`: VPN username credential
- `vpnPassword`: VPN password credential
- `rdpUsername`: RDP username credential
- `rdpPassword`: RDP password credential
- `hasIntuneDevice`: Boolean indicating if user has device in Intune
- `deviceType`: Explicit device type from hardware_inventory (if set)

### `isValidCredential(value: string | null | undefined): boolean`
Helper function that checks if a credential is valid (not null, empty, or "NA")

### `getDeviceTypeReason(input: DeviceTypeInput): string`
Returns human-readable explanation of why a user was classified a certain way

## Examples

### Example 1: Full PC User with VPN
- Serial: "ABC123"
- VPN Username: "john.doe"
- VPN Password: "password123"
- Result: **Full PC** - "Has VPN credentials for remote access"

### Example 2: Thin Client User
- Serial: "NA"
- VPN Username: "NA"
- RDP Username: "rdpuser"
- In Intune: No
- Result: **Thin Client** - "No device serial and no VPN credentials"

### Example 3: Mini PC at Office (Heather Landsberg case)
- Serial: "NA"
- VPN Username: "NA"
- In Intune: Yes
- Result: **Full PC** - "Device managed in Intune (e.g., mini PC at office)"

### Example 4: Thin Client with Serial
- Serial: "TC001"
- VPN Username: "NA"
- RDP Username: "terminal01"
- In Intune: No
- Result: **Thin Client** - "Has RDP credentials but no VPN (terminal access only)"

## Usage in Code

### Dashboard.tsx
```typescript
const deviceType = determineDeviceType({
  deviceSerialNumber: firstDeviceSerial,
  vpnUsername: firstVpnUsername,
  rdpUsername: firstRdpUsername,
  hasIntuneDevice: inIntune,
});
```

### UserDetailsDialog.tsx
```typescript
const deviceType = determineDeviceType({
  deviceSerialNumber: deviceAssignment?.device_serial_number,
  vpnUsername: vpnCreds?.username || masterUser.vpn_username,
  vpnPassword: vpnCreds?.password,
  rdpUsername: rdpCreds?.username || masterUser.rdp_username,
  rdpPassword: rdpCreds?.password,
  hasIntuneDevice: !!intuneDevice,
  deviceType: deviceDetails?.device_type
});
```

## Testing Scenarios

When testing this logic, verify the following scenarios:
1. ✅ User with VPN credentials → Full PC
2. ✅ User with no serial and no VPN → Thin Client
3. ✅ User with Intune device but no VPN → Full PC (mini PC case)
4. ✅ User with serial + RDP only → Thin Client
5. ✅ "NA" values are properly recognized as invalid credentials
6. ✅ Null/empty values are properly recognized as invalid credentials

## Maintenance Notes

- All device type logic should use the `determineDeviceType()` function
- Do not implement ad-hoc device type detection elsewhere
- If logic needs to change, update only `deviceTypeUtils.ts`
- Add new test cases to this document when edge cases are discovered
