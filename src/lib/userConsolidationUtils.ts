/**
 * Utility functions for consolidating and deduplicating users across RDP and VPN credentials
 * 
 * Users with the same email address should appear only once, but show both their
 * VPN and RDP credentials grouped together.
 */

export interface CredentialDetail {
  id: string;
  username: string;
  password: string;
  service_type: "VPN" | "RDP";
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ConsolidatedUser {
  id: string; // Use the first credential ID as the primary ID
  email: string;
  vpnCredentials: CredentialDetail[];
  rdpCredentials: CredentialDetail[];
  allCredentials: CredentialDetail[]; // Combined list for display
  hasVpn: boolean;
  hasRdp: boolean;
  created_at: string; // Earliest creation date
  updated_at: string; // Latest update date
}

/**
 * Consolidate credentials by email address
 * Users with the same email get grouped together with all their credentials (VPN & RDP)
 * 
 * @param credentials - Array of VPN/RDP credentials
 * @returns Array of consolidated users, one per unique email
 */
export function consolidateUsersByEmail(credentials: Array<{
  id: string;
  username: string;
  password: string;
  service_type: "VPN" | "RDP";
  email: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}>): ConsolidatedUser[] {
  // Only include credentials with email addresses
  const withEmail = credentials.filter(c => c.email && c.email.trim().length > 0);
  
  // Group by email (case-insensitive)
  const userMap = new Map<string, ConsolidatedUser>();
  
  withEmail.forEach(cred => {
    const email = cred.email!.toLowerCase().trim();
    
    const credDetail: CredentialDetail = {
      id: cred.id,
      username: cred.username,
      password: cred.password,
      service_type: cred.service_type,
      notes: cred.notes,
      created_at: cred.created_at,
      updated_at: cred.updated_at,
    };
    
    const existing = userMap.get(email);
    
    if (!existing) {
      // Create new consolidated user entry
      userMap.set(email, {
        id: cred.id, // Use first credential's ID
        email: cred.email!,
        vpnCredentials: cred.service_type === 'VPN' ? [credDetail] : [],
        rdpCredentials: cred.service_type === 'RDP' ? [credDetail] : [],
        allCredentials: [credDetail],
        hasVpn: cred.service_type === 'VPN',
        hasRdp: cred.service_type === 'RDP',
        created_at: cred.created_at,
        updated_at: cred.updated_at,
      });
    } else {
      // Add to existing user's credentials
      if (cred.service_type === 'VPN') {
        existing.vpnCredentials.push(credDetail);
        existing.hasVpn = true;
      } else {
        existing.rdpCredentials.push(credDetail);
        existing.hasRdp = true;
      }
      existing.allCredentials.push(credDetail);
      
      // Update timestamps to show earliest/latest
      if (new Date(cred.created_at) < new Date(existing.created_at)) {
        existing.created_at = cred.created_at;
      }
      if (new Date(cred.updated_at) > new Date(existing.updated_at)) {
        existing.updated_at = cred.updated_at;
      }
    }
  });
  
  // Return as array, sorted by email
  return Array.from(userMap.values()).sort((a, b) => 
    a.email.localeCompare(b.email)
  );
}

/**
 * Get a display-friendly summary of credentials for a consolidated user
 * 
 * @param user - Consolidated user object
 * @returns Human-readable summary string
 */
export function getCredentialsSummary(user: ConsolidatedUser): string {
  const parts: string[] = [];
  
  if (user.hasVpn) {
    parts.push(`${user.vpnCredentials.length} VPN`);
  }
  
  if (user.hasRdp) {
    parts.push(`${user.rdpCredentials.length} RDP`);
  }
  
  return parts.join(' + ') || 'No credentials';
}

/**
 * Get all usernames for a consolidated user (both VPN and RDP)
 * 
 * @param user - Consolidated user object
 * @returns Array of unique usernames
 */
export function getAllUsernames(user: ConsolidatedUser): string[] {
  const usernames = new Set<string>();
  
  user.vpnCredentials.forEach(cred => usernames.add(cred.username));
  user.rdpCredentials.forEach(cred => usernames.add(cred.username));
  
  return Array.from(usernames);
}
