/**
 * Comprehensive utility functions for consolidating user data across the entire database
 * 
 * This utility pulls together:
 * - User information from master_user_list, directory_users, and profiles
 * - Branch data from profiles.branch_id, hardware_inventory.branch, and directory_users.department
 * - RDP credentials from vpn_rdp_credentials and master_user_list
 * - VPN credentials from vpn_rdp_credentials and master_user_list
 * - Device information from hardware_inventory, device_user_assignments, and manual_devices
 * 
 * No duplications are allowed - all data is deduplicated by appropriate keys.
 */

import { supabase } from "@/integrations/supabase/client";

export interface ConsolidatedCredential {
  id: string;
  username: string;
  password?: string; // Optional for display purposes
  service_type: "VPN" | "RDP";
  notes: string | null;
  source: "vpn_rdp_credentials" | "master_user_list";
}

export interface ConsolidatedDevice {
  serial_number: string;
  device_name: string | null;
  device_type: string | null;
  model: string | null;
  manufacturer: string | null;
  status: string | null;
  source: "hardware_inventory" | "device_user_assignments" | "manual_devices";
}

export interface ConsolidatedBranchInfo {
  branch_id: string | null;
  branch_name: string | null;
  source: "profile" | "hardware" | "directory" | "master_list";
  confidence: "high" | "medium" | "low"; // How confident we are in this assignment
}

export interface ConsolidatedUserData {
  // Basic user info
  id: string;
  display_name: string | null;
  email: string | null;
  user_principal_name: string | null;
  job_title: string | null;
  department: string | null;
  account_enabled: boolean | null;
  
  // Branch information (consolidated from all sources)
  branch: ConsolidatedBranchInfo | null;
  all_branch_sources: ConsolidatedBranchInfo[]; // All branch info found across tables
  
  // Credentials (deduplicated)
  vpn_credentials: ConsolidatedCredential[];
  rdp_credentials: ConsolidatedCredential[];
  
  // Devices (deduplicated)
  devices: ConsolidatedDevice[];
  
  // Meta information
  sources: string[]; // Which tables this user was found in
  created_at: string;
  updated_at: string;
}

/**
 * Fetch and consolidate all user data from across the database
 * 
 * @param userId - Optional specific user ID to fetch (from master_user_list or directory_users)
 * @param email - Optional email to fetch data for
 * @returns Consolidated user data
 */
export async function fetchConsolidatedUserData(
  userId?: string,
  email?: string
): Promise<ConsolidatedUserData | null> {
  if (!userId && !email) {
    console.error("Either userId or email must be provided");
    return null;
  }

  try {
    // 1. Fetch base user data
    let baseUser: any = null;
    const sources: string[] = [];

    // Try master_user_list first
    if (userId) {
      const { data: masterUser } = await supabase
        .from("master_user_list")
        .select("*, branches:branch_id(id, name)")
        .eq("id", userId)
        .maybeSingle();
      
      if (masterUser) {
        baseUser = masterUser;
        sources.push("master_user_list");
        email = masterUser.email;
      }
    }

    // Try directory_users
    if (userId && !baseUser) {
      const { data: dirUser } = await supabase
        .from("directory_users")
        .select("*")
        .eq("id", userId)
        .maybeSingle();
      
      if (dirUser) {
        baseUser = dirUser;
        sources.push("directory_users");
        email = dirUser.email;
      }
    }

    // If we have email but no user yet, search by email
    if (email && !baseUser) {
      const { data: masterUser } = await supabase
        .from("master_user_list")
        .select("*, branches:branch_id(id, name)")
        .eq("email", email)
        .maybeSingle();
      
      if (masterUser) {
        baseUser = masterUser;
        sources.push("master_user_list");
      } else {
        // Try directory_users by email
        const { data: dirUser } = await supabase
          .from("directory_users")
          .select("*")
          .eq("email", email)
          .maybeSingle();
        
        if (dirUser) {
          baseUser = dirUser;
          sources.push("directory_users");
        }
      }
    }

    if (!baseUser || !email) {
      return null;
    }

    // 2. Fetch branch information from all sources
    const branchSources: ConsolidatedBranchInfo[] = [];

    // From master_user_list (if available)
    if (baseUser.branch_id) {
      branchSources.push({
        branch_id: baseUser.branch_id,
        branch_name: (baseUser.branches as { name: string } | null)?.name || null,
        source: "master_list",
        confidence: "high"
      });
    }

    // From profiles table
    const { data: profileData } = await supabase
      .from("profiles")
      .select("branch_id, branches:branch_id(id, name)")
      .eq("email", email)
      .maybeSingle();
    
    if (profileData?.branch_id) {
      sources.push("profiles");
      branchSources.push({
        branch_id: profileData.branch_id,
        branch_name: (profileData.branches as { name: string } | null)?.name || null,
        source: "profile",
        confidence: "high"
      });
    }

    // From hardware_inventory (devices assigned to this user)
    const { data: deviceBranch } = await supabase
      .from("hardware_inventory")
      .select("branch")
      .or(`m365_user_email.eq.${email},m365_user_principal_name.eq.${baseUser.user_principal_name || email}`)
      .not("branch", "is", null)
      .limit(1)
      .maybeSingle();
    
    if (deviceBranch?.branch) {
      // Look up the branch ID by name
      const { data: branchInfo } = await supabase
        .from("branches")
        .select("id, name")
        .eq("name", deviceBranch.branch)
        .maybeSingle();
      
      if (branchInfo) {
        branchSources.push({
          branch_id: branchInfo.id,
          branch_name: branchInfo.name,
          source: "hardware",
          confidence: "medium"
        });
      }
    }

    // From directory_users department (if it matches a branch name)
    if (baseUser.department) {
      const { data: branchByDept } = await supabase
        .from("branches")
        .select("id, name")
        .eq("name", baseUser.department)
        .maybeSingle();
      
      if (branchByDept) {
        branchSources.push({
          branch_id: branchByDept.id,
          branch_name: branchByDept.name,
          source: "directory",
          confidence: "low"
        });
      }
    }

    // Pick the best branch (prefer high confidence, then most recent)
    const bestBranch = branchSources.length > 0
      ? branchSources.sort((a, b) => {
          if (a.confidence !== b.confidence) {
            return a.confidence === "high" ? -1 : b.confidence === "high" ? 1 : 0;
          }
          return 0;
        })[0]
      : null;

    // 3. Fetch VPN/RDP credentials from all sources
    const vpnCredentials: ConsolidatedCredential[] = [];
    const rdpCredentials: ConsolidatedCredential[] = [];
    const seenCredentials = new Set<string>(); // Track by username+service_type to avoid duplicates

    // From vpn_rdp_credentials table
    const { data: credentials } = await supabase
      .from("vpn_rdp_credentials")
      .select("id, username, service_type, notes, created_at, updated_at")
      .eq("email", email);
    
    if (credentials) {
      credentials.forEach(cred => {
        const key = `${cred.username}-${cred.service_type}`;
        if (!seenCredentials.has(key)) {
          seenCredentials.add(key);
          const consolidatedCred: ConsolidatedCredential = {
            id: cred.id,
            username: cred.username,
            service_type: cred.service_type as "VPN" | "RDP",
            notes: cred.notes,
            source: "vpn_rdp_credentials"
          };
          
          if (cred.service_type === "VPN") {
            vpnCredentials.push(consolidatedCred);
          } else if (cred.service_type === "RDP") {
            rdpCredentials.push(consolidatedCred);
          }
        }
      });
    }

    // From master_user_list
    if (baseUser.vpn_username) {
      const key = `${baseUser.vpn_username}-VPN`;
      if (!seenCredentials.has(key)) {
        seenCredentials.add(key);
        vpnCredentials.push({
          id: `master-vpn-${baseUser.id}`,
          username: baseUser.vpn_username,
          service_type: "VPN",
          notes: "From master user list",
          source: "master_user_list"
        });
      }
    }

    if (baseUser.rdp_username) {
      const key = `${baseUser.rdp_username}-RDP`;
      if (!seenCredentials.has(key)) {
        seenCredentials.add(key);
        rdpCredentials.push({
          id: `master-rdp-${baseUser.id}`,
          username: baseUser.rdp_username,
          service_type: "RDP",
          notes: "From master user list",
          source: "master_user_list"
        });
      }
    }

    // 4. Fetch devices from all sources
    const devices: ConsolidatedDevice[] = [];
    const seenSerials = new Set<string>();

    // From hardware_inventory
    const { data: hwInventory } = await supabase
      .from("hardware_inventory")
      .select("serial_number, device_name, device_type, model, manufacturer, status")
      .or(`m365_user_email.eq.${email},m365_user_principal_name.eq.${baseUser.user_principal_name || email}`);
    
    if (hwInventory) {
      hwInventory.forEach(device => {
        if (device.serial_number && !seenSerials.has(device.serial_number)) {
          seenSerials.add(device.serial_number);
          devices.push({
            serial_number: device.serial_number,
            device_name: device.device_name,
            device_type: device.device_type,
            model: device.model,
            manufacturer: device.manufacturer,
            status: device.status,
            source: "hardware_inventory"
          });
        }
      });
    }

    // From device_user_assignments
    const { data: deviceAssignments } = await supabase
      .from("device_user_assignments")
      .select("device_serial_number, device_name, device_model")
      .eq("user_email", email)
      .eq("is_current", true);
    
    if (deviceAssignments) {
      deviceAssignments.forEach(assignment => {
        if (assignment.device_serial_number && !seenSerials.has(assignment.device_serial_number)) {
          seenSerials.add(assignment.device_serial_number);
          devices.push({
            serial_number: assignment.device_serial_number,
            device_name: assignment.device_name,
            device_type: null,
            model: assignment.device_model,
            manufacturer: null,
            status: "active",
            source: "device_user_assignments"
          });
        }
      });
    }

    // From manual_devices
    const { data: manualDevices } = await supabase
      .from("manual_devices")
      .select("device_serial_number, device_name, device_type, device_model")
      .eq("assigned_user_email", email)
      .eq("is_active", true);
    
    if (manualDevices) {
      manualDevices.forEach(device => {
        if (device.device_serial_number && !seenSerials.has(device.device_serial_number)) {
          seenSerials.add(device.device_serial_number);
          devices.push({
            serial_number: device.device_serial_number,
            device_name: device.device_name,
            device_type: device.device_type,
            model: device.device_model,
            manufacturer: null,
            status: "active",
            source: "manual_devices"
          });
        }
      });
    }

    // 5. Build consolidated user data
    const consolidatedUser: ConsolidatedUserData = {
      id: baseUser.id,
      display_name: baseUser.display_name,
      email: email,
      user_principal_name: baseUser.user_principal_name || null,
      job_title: baseUser.job_title || null,
      department: baseUser.department || null,
      account_enabled: baseUser.account_enabled ?? (baseUser.is_active ?? true),
      branch: bestBranch,
      all_branch_sources: branchSources,
      vpn_credentials: vpnCredentials,
      rdp_credentials: rdpCredentials,
      devices: devices,
      sources: sources,
      created_at: baseUser.created_at || new Date().toISOString(),
      updated_at: baseUser.updated_at || new Date().toISOString()
    };

    return consolidatedUser;
  } catch (error) {
    console.error("Error fetching consolidated user data:", error);
    return null;
  }
}

/**
 * Fetch consolidated data for all users
 * Useful for dashboard and user list views
 * 
 * @returns Array of consolidated user data
 */
export async function fetchAllConsolidatedUsers(): Promise<ConsolidatedUserData[]> {
  try {
    // Fetch all active users from master_user_list
    const { data: masterUsers } = await supabase
      .from("master_user_list")
      .select("id, email")
      .eq("is_active", true);
    
    if (!masterUsers || masterUsers.length === 0) {
      // Fallback to directory_users if master list is empty
      const { data: dirUsers } = await supabase
        .from("directory_users")
        .select("id, email");
      
      if (dirUsers) {
        const consolidated = await Promise.all(
          dirUsers.map(user => fetchConsolidatedUserData(user.id, user.email || undefined))
        );
        return consolidated.filter(u => u !== null) as ConsolidatedUserData[];
      }
    }

    // Fetch consolidated data for each user
    const consolidated = await Promise.all(
      masterUsers.map(user => fetchConsolidatedUserData(user.id, user.email || undefined))
    );

    return consolidated.filter(u => u !== null) as ConsolidatedUserData[];
  } catch (error) {
    console.error("Error fetching all consolidated users:", error);
    return [];
  }
}

/**
 * Get a display-friendly summary of credentials
 */
export function getCredentialsSummary(user: ConsolidatedUserData): string {
  const parts: string[] = [];
  
  if (user.vpn_credentials.length > 0) {
    parts.push(`${user.vpn_credentials.length} VPN`);
  }
  
  if (user.rdp_credentials.length > 0) {
    parts.push(`${user.rdp_credentials.length} RDP`);
  }
  
  return parts.join(' + ') || 'No credentials';
}

/**
 * Get the best branch name for display
 */
export function getBranchDisplayName(user: ConsolidatedUserData): string {
  return user.branch?.branch_name || "NA";
}

/**
 * Check if user has any credentials
 */
export function hasCredentials(user: ConsolidatedUserData): boolean {
  return user.vpn_credentials.length > 0 || user.rdp_credentials.length > 0;
}

/**
 * Get all unique credential usernames
 */
export function getAllCredentialUsernames(user: ConsolidatedUserData): string[] {
  const usernames = new Set<string>();
  
  user.vpn_credentials.forEach(cred => usernames.add(cred.username));
  user.rdp_credentials.forEach(cred => usernames.add(cred.username));
  
  return Array.from(usernames);
}
