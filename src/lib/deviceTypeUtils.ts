/**
 * Utility functions for determining device types (thin client vs full PC)
 * based on VPN credentials, serial numbers, and other factors.
 */

export type DeviceType = 'thin_client' | 'full_pc' | 'unknown';

export interface DeviceTypeInput {
  deviceSerialNumber?: string | null;
  vpnUsername?: string | null;
  vpnPassword?: string | null;
  rdpUsername?: string | null;
  rdpPassword?: string | null;
  hasIntuneDevice?: boolean;
  deviceType?: string | null; // From hardware_inventory table
}

/**
 * Determines if a user has a thin client or full PC based on:
 * - VPN credentials: Users with valid VPN credentials (not "NA") = Full PC
 * - Serial number: Users with serial = "NA" or null AND VPN = "NA" = Thin Client
 * - Exception: Users with no serial and no VPN but in Intune = Full PC (e.g., mini PC at office)
 * 
 * @param input - Object containing device and credential information
 * @returns DeviceType - 'thin_client', 'full_pc', or 'unknown'
 */
export function determineDeviceType(input: DeviceTypeInput): DeviceType {
  const {
    deviceSerialNumber,
    vpnUsername,
    vpnPassword,
    rdpUsername,
    rdpPassword,
    hasIntuneDevice = false,
    deviceType
  } = input;

  // If device_type is explicitly set in hardware_inventory, use that
  if (deviceType === 'thin_client') {
    return 'thin_client';
  }
  if (deviceType === 'full_pc') {
    return 'full_pc';
  }

  // Check if serial number exists and is not "NA"
  const hasValidSerial = deviceSerialNumber && 
                        deviceSerialNumber.trim().length > 0 && 
                        deviceSerialNumber.toUpperCase() !== 'NA';

  // Check if VPN credentials exist and are not "NA"
  const hasValidVpn = (vpnUsername && 
                       vpnUsername.trim().length > 0 && 
                       vpnUsername.toUpperCase() !== 'NA') ||
                      (vpnPassword && 
                       vpnPassword.trim().length > 0 && 
                       vpnPassword.toUpperCase() !== 'NA');

  // Check if RDP credentials exist and are not "NA"
  const hasValidRdp = (rdpUsername && 
                       rdpUsername.trim().length > 0 && 
                       rdpUsername.toUpperCase() !== 'NA') ||
                      (rdpPassword && 
                       rdpPassword.trim().length > 0 && 
                       rdpPassword.toUpperCase() !== 'NA');

  // Logic priority:
  // 1. If user has valid VPN credentials → Full PC (they need VPN to dial in remotely)
  if (hasValidVpn) {
    return 'full_pc';
  }

  // 2. If serial = "NA" (or null) AND VPN = "NA" (or null) → Definitely Thin Client
  if (!hasValidSerial && !hasValidVpn) {
    // Exception: If they're in Intune (e.g., mini PC at office like Heather Landsberg)
    if (hasIntuneDevice) {
      return 'full_pc';
    }
    // If they have RDP credentials, they're likely using thin client for RDP
    if (hasValidRdp) {
      return 'thin_client';
    }
    // No serial, no VPN, no Intune, no RDP → Likely thin client
    return 'thin_client';
  }

  // 3. If user has valid serial but no VPN → Could be either
  if (hasValidSerial && !hasValidVpn) {
    // If in Intune → Full PC
    if (hasIntuneDevice) {
      return 'full_pc';
    }
    // If has RDP only → Likely thin client (RDP terminal)
    if (hasValidRdp) {
      return 'thin_client';
    }
    // Has serial but no other indicators → default to Full PC
    return 'full_pc';
  }

  // 4. Has serial and VPN → Full PC (already covered in step 1, but for clarity)
  if (hasValidSerial && hasValidVpn) {
    return 'full_pc';
  }

  // Default: Unknown
  return 'unknown';
}

/**
 * Helper function to check if a credential value is valid (not null, empty, or "NA")
 * 
 * @param value - The credential value to check
 * @returns boolean - true if the value is valid, false otherwise
 */
export function isValidCredential(value: string | null | undefined): boolean {
  if (!value || value.trim().length === 0) {
    return false;
  }
  const upperValue = value.trim().toUpperCase();
  return upperValue !== 'NA' && upperValue !== 'N/A';
}

/**
 * Get a human-readable description of why a user has a particular device type
 * Useful for debugging and displaying to users
 * 
 * @param input - Object containing device and credential information
 * @returns string - Description of the device type determination
 */
export function getDeviceTypeReason(input: DeviceTypeInput): string {
  const deviceType = determineDeviceType(input);
  const {
    deviceSerialNumber,
    vpnUsername,
    vpnPassword,
    hasIntuneDevice = false,
    deviceType: explicitDeviceType
  } = input;

  if (explicitDeviceType) {
    return `Explicitly set as ${explicitDeviceType}`;
  }

  const hasValidSerial = isValidCredential(deviceSerialNumber);
  const hasValidVpn = isValidCredential(vpnUsername) || isValidCredential(vpnPassword);

  if (deviceType === 'full_pc') {
    if (hasValidVpn) {
      return 'Full PC: Has VPN credentials for remote access';
    }
    if (hasIntuneDevice) {
      return 'Full PC: Device managed in Intune (e.g., mini PC at office)';
    }
    if (hasValidSerial) {
      return 'Full PC: Has device serial number and no thin client indicators';
    }
    return 'Full PC: Default classification';
  }

  if (deviceType === 'thin_client') {
    if (!hasValidSerial && !hasValidVpn) {
      return 'Thin Client: No device serial and no VPN credentials';
    }
    if (hasValidSerial && !hasValidVpn) {
      return 'Thin Client: Has RDP credentials but no VPN (terminal access only)';
    }
    return 'Thin Client: Classified based on credential analysis';
  }

  return 'Unknown: Insufficient information to determine device type';
}
