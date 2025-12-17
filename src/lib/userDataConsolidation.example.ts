/**
 * Example usage of the User Data Consolidation utility
 * 
 * This file demonstrates how to use the consolidated user data functions
 * to fetch complete user information without duplicates.
 */

import { 
  fetchConsolidatedUserData, 
  fetchAllConsolidatedUsers,
  getCredentialsSummary,
  getBranchDisplayName,
  hasCredentials,
  getAllCredentialUsernames
} from './userDataConsolidation';

/**
 * Example 1: Fetch data for a specific user by ID
 */
async function exampleFetchUserById(userId: string) {
  const userData = await fetchConsolidatedUserData(userId);
  
  if (!userData) {
    console.log("User not found");
    return;
  }
  
  console.log("User:", userData.display_name);
  console.log("Email:", userData.email);
  console.log("Branch:", getBranchDisplayName(userData));
  console.log("Credentials:", getCredentialsSummary(userData));
  console.log("Devices:", userData.devices.length);
  
  // Access VPN credentials
  if (userData.vpn_credentials.length > 0) {
    console.log("\nVPN Credentials:");
    userData.vpn_credentials.forEach(cred => {
      console.log(`  - ${cred.username} (source: ${cred.source})`);
    });
  }
  
  // Access RDP credentials
  if (userData.rdp_credentials.length > 0) {
    console.log("\nRDP Credentials:");
    userData.rdp_credentials.forEach(cred => {
      console.log(`  - ${cred.username} (source: ${cred.source})`);
    });
  }
  
  // Check branch sources
  if (userData.all_branch_sources.length > 0) {
    console.log("\nBranch sources:");
    userData.all_branch_sources.forEach(source => {
      console.log(`  - ${source.source}: ${source.branch_name} (${source.confidence} confidence)`);
    });
  }
  
  // List all devices
  if (userData.devices.length > 0) {
    console.log("\nDevices:");
    userData.devices.forEach(device => {
      console.log(`  - ${device.device_name || 'Unnamed'} (S/N: ${device.serial_number}, source: ${device.source})`);
    });
  }
}

/**
 * Example 2: Fetch data for a user by email
 */
async function exampleFetchUserByEmail(email: string) {
  const userData = await fetchConsolidatedUserData(undefined, email);
  
  if (!userData) {
    console.log("User not found");
    return;
  }
  
  console.log("Found user:", userData.display_name);
  console.log("Has credentials:", hasCredentials(userData));
  console.log("All usernames:", getAllCredentialUsernames(userData).join(", "));
}

/**
 * Example 3: Fetch all users and display summary
 */
async function exampleFetchAllUsers() {
  const allUsers = await fetchAllConsolidatedUsers();
  
  console.log(`Found ${allUsers.length} users`);
  
  // Count users by branch
  const branchCounts = new Map<string, number>();
  allUsers.forEach(user => {
    const branch = getBranchDisplayName(user);
    branchCounts.set(branch, (branchCounts.get(branch) || 0) + 1);
  });
  
  console.log("\nUsers by branch:");
  branchCounts.forEach((count, branch) => {
    console.log(`  - ${branch}: ${count} users`);
  });
  
  // Count users with credentials
  const usersWithCreds = allUsers.filter(hasCredentials);
  console.log(`\n${usersWithCreds.length} users have credentials`);
}

/**
 * Example 4: Display user card in a React component
 * Note: This is example code only, not meant to be imported or used directly
 */
/*
import React from 'react';
import type { ConsolidatedUserData } from './userDataConsolidation';

function ExampleUserCard({ userId }: { userId: string }) {
  const [userData, setUserData] = React.useState<ConsolidatedUserData | null>(null);
  const [loading, setLoading] = React.useState(true);
  
  React.useEffect(() => {
    async function loadUser() {
      const data = await fetchConsolidatedUserData(userId);
      setUserData(data);
      setLoading(false);
    }
    loadUser();
  }, [userId]);
  
  if (loading) return <div>Loading...</div>;
  if (!userData) return <div>User not found</div>;
  
  return (
    <div className="user-card">
      <h3>{userData.display_name}</h3>
      <p>{userData.email}</p>
      <p>Branch: {getBranchDisplayName(userData)}</p>
      <p>Credentials: {getCredentialsSummary(userData)}</p>
      
      {/* Show all branch sources if multiple */}
      {userData.all_branch_sources.length > 1 && (
        <div className="branch-sources">
          <h4>Branch found in multiple sources:</h4>
          <ul>
            {userData.all_branch_sources.map((source, idx) => (
              <li key={idx}>
                {source.source}: {source.branch_name} ({source.confidence})
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {/* List credentials */}
      {userData.vpn_credentials.length > 0 && (
        <div className="vpn-creds">
          <h4>VPN Credentials:</h4>
          <ul>
            {userData.vpn_credentials.map(cred => (
              <li key={cred.id}>
                {cred.username} <small>(from {cred.source})</small>
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {userData.rdp_credentials.length > 0 && (
        <div className="rdp-creds">
          <h4>RDP Credentials:</h4>
          <ul>
            {userData.rdp_credentials.map(cred => (
              <li key={cred.id}>
                {cred.username} <small>(from {cred.source})</small>
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {/* List devices */}
      {userData.devices.length > 0 && (
        <div className="devices">
          <h4>Devices ({userData.devices.length}):</h4>
          <ul>
            {userData.devices.map((device, idx) => (
              <li key={idx}>
                {device.device_name || 'Unnamed'} - S/N: {device.serial_number}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
*/

/**
 * Key Benefits:
 * 
 * 1. No Duplicates: Credentials, devices, and branch info are automatically deduplicated
 * 2. Complete Data: Pulls from all sources (master_user_list, directory_users, profiles, etc.)
 * 3. Transparent: Shows where data came from (source field)
 * 4. Confidence: Branch assignments include confidence levels
 * 5. Consistent: Same data structure across all pages
 * 6. Maintainable: Single source of truth for user data consolidation
 */

export {
  exampleFetchUserById,
  exampleFetchUserByEmail,
  exampleFetchAllUsers
};
