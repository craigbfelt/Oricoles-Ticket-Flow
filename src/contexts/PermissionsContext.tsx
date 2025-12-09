import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type UserRole = 'admin' | 'ceo' | 'cfo' | 'executive' | 'manager' | 'user' | 'support_staff';

export interface UserPermissions {
  // Page access
  dashboard_users?: boolean;
  it_suppliers?: boolean;
  network_diagrams?: boolean;
  tickets?: boolean;
  assets?: boolean;
  hardware?: boolean;
  software?: boolean;
  licenses?: boolean;
  microsoft_365?: boolean;
  vpn?: boolean;
  rdp?: boolean;
  branches?: boolean;
  jobs?: boolean;
  maintenance?: boolean;
  logistics?: boolean;
  document_hub?: boolean;
  shared_files?: boolean;
  crm?: boolean;
  sage?: boolean;
  migrations?: boolean;
  settings?: boolean;
  users_management?: boolean;
  reports?: boolean;
  
  // Feature access
  create_tickets?: boolean;
  edit_tickets?: boolean;
  delete_tickets?: boolean;
  view_all_tickets?: boolean;
  manage_users?: boolean;
  manage_assets?: boolean;
  manage_licenses?: boolean;
  view_sensitive_data?: boolean;
  ai_content_generation?: boolean;
  advanced_copilot?: boolean;
}

interface UserPermissionData {
  role: UserRole;
  permissions: UserPermissions;
}

interface PermissionsContextType {
  userRole: UserRole | null;
  permissions: UserPermissions;
  hasPermission: (permission: keyof UserPermissions) => boolean;
  hasPageAccess: (page: string) => boolean;
  isAdmin: boolean;
  isExecutive: boolean; // CEO, CFO, or Executive role
  loading: boolean;
  refreshPermissions: () => Promise<void>;
}

const PermissionsContext = createContext<PermissionsContextType | undefined>(undefined);

// Default permissions for different roles
const defaultPermissionsByRole: Record<UserRole, UserPermissions> = {
  admin: {
    // Full access to everything
    dashboard_users: true,
    it_suppliers: true,
    network_diagrams: true,
    tickets: true,
    assets: true,
    hardware: true,
    software: true,
    licenses: true,
    microsoft_365: true,
    vpn: true,
    rdp: true,
    branches: true,
    jobs: true,
    maintenance: true,
    logistics: true,
    document_hub: true,
    shared_files: true,
    crm: true,
    sage: true,
    migrations: true,
    settings: true,
    users_management: true,
    reports: true,
    create_tickets: true,
    edit_tickets: true,
    delete_tickets: true,
    view_all_tickets: true,
    manage_users: true,
    manage_assets: true,
    manage_licenses: true,
    view_sensitive_data: true,
    ai_content_generation: true,
    advanced_copilot: true,
  },
  ceo: {
    // CEO specific access
    dashboard_users: true,
    it_suppliers: true,
    network_diagrams: true,
    tickets: true,
    reports: true,
    crm: true,
    sage: true,
    branches: true,
    view_all_tickets: true,
    view_sensitive_data: true,
  },
  cfo: {
    // CFO specific access
    dashboard_users: true,
    it_suppliers: true,
    network_diagrams: true,
    tickets: true,
    reports: true,
    licenses: true,
    sage: true,
    crm: true,
    view_all_tickets: true,
  },
  executive: {
    // General executive access
    dashboard_users: true,
    it_suppliers: true,
    network_diagrams: true,
    tickets: true,
    reports: true,
    crm: true,
    view_all_tickets: true,
  },
  manager: {
    // Manager access
    dashboard_users: true,
    tickets: true,
    assets: true,
    hardware: true,
    software: true,
    branches: true,
    reports: true,
    create_tickets: true,
    edit_tickets: true,
    view_all_tickets: true,
  },
  support_staff: {
    // Support staff access
    tickets: true,
    assets: true,
    hardware: true,
    software: true,
    vpn: true,
    rdp: true,
    create_tickets: true,
    edit_tickets: true,
  },
  user: {
    // Regular user access (minimal)
    tickets: true,
    create_tickets: true,
  },
};

export const PermissionsProvider = ({ children }: { children: ReactNode }) => {
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [permissions, setPermissions] = useState<UserPermissions>({});
  const [loading, setLoading] = useState(true);

  const fetchPermissions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setUserRole('user');
        setPermissions(defaultPermissionsByRole.user);
        setLoading(false);
        return;
      }

      // Check user_roles table first for admin
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();

      if (roleData?.role === 'admin') {
        setUserRole('admin');
        setPermissions(defaultPermissionsByRole.admin);
        setLoading(false);
        return;
      }

      // Check user_permissions table for custom permissions
      const { data: permData } = await supabase
        .from('user_permissions')
        .select('role, permissions')
        .eq('user_id', user.id)
        .maybeSingle();

      if (permData) {
        const role = permData.role as UserRole;
        const customPerms = permData.permissions as UserPermissions;
        
        // Merge default role permissions with custom permissions
        const mergedPermissions = {
          ...defaultPermissionsByRole[role],
          ...customPerms,
        };
        
        setUserRole(role);
        setPermissions(mergedPermissions);
      } else {
        // No custom permissions, use default user role
        setUserRole('user');
        setPermissions(defaultPermissionsByRole.user);
      }
    } catch (error) {
      console.error('Error fetching permissions:', error);
      setUserRole('user');
      setPermissions(defaultPermissionsByRole.user);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPermissions();

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchPermissions();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const hasPermission = (permission: keyof UserPermissions): boolean => {
    return permissions[permission] === true;
  };

  const hasPageAccess = (page: string): boolean => {
    // Normalize page name to match permission keys
    const normalizedPage = page.toLowerCase().replace(/[/-]/g, '_');
    return hasPermission(normalizedPage as keyof UserPermissions);
  };

  const isAdmin = userRole === 'admin';
  const isExecutive = userRole === 'ceo' || userRole === 'cfo' || userRole === 'executive';

  return (
    <PermissionsContext.Provider
      value={{
        userRole,
        permissions,
        hasPermission,
        hasPageAccess,
        isAdmin,
        isExecutive,
        loading,
        refreshPermissions: fetchPermissions,
      }}
    >
      {children}
    </PermissionsContext.Provider>
  );
};

export const usePermissions = () => {
  const context = useContext(PermissionsContext);
  if (context === undefined) {
    throw new Error('usePermissions must be used within a PermissionsProvider');
  }
  return context;
};
