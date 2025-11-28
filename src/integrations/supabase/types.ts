export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      assets: {
        Row: {
          asset_tag: string | null
          assigned_to: string | null
          category: string | null
          created_at: string
          id: string
          location: string | null
          model: string | null
          name: string
          notes: string | null
          purchase_date: string | null
          serial_number: string | null
          status: Database["public"]["Enums"]["asset_status"]
          tenant_id: string | null
          updated_at: string
          warranty_expires: string | null
        }
        Insert: {
          asset_tag?: string | null
          assigned_to?: string | null
          category?: string | null
          created_at?: string
          id?: string
          location?: string | null
          model?: string | null
          name: string
          notes?: string | null
          purchase_date?: string | null
          serial_number?: string | null
          status?: Database["public"]["Enums"]["asset_status"]
          tenant_id?: string | null
          updated_at?: string
          warranty_expires?: string | null
        }
        Update: {
          asset_tag?: string | null
          assigned_to?: string | null
          category?: string | null
          created_at?: string
          id?: string
          location?: string | null
          model?: string | null
          name?: string
          notes?: string | null
          purchase_date?: string | null
          serial_number?: string | null
          status?: Database["public"]["Enums"]["asset_status"]
          tenant_id?: string | null
          updated_at?: string
          warranty_expires?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assets_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      branches: {
        Row: {
          address: string | null
          city: string | null
          country: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          postal_code: string | null
          state: string | null
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          postal_code?: string | null
          state?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          postal_code?: string | null
          state?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "branches_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          created_at: string
          id: string
          is_support_reply: boolean | null
          message: string
          tenant_id: string | null
          user_email: string | null
          user_id: string | null
          user_name: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_support_reply?: boolean | null
          message: string
          tenant_id?: string | null
          user_email?: string | null
          user_id?: string | null
          user_name: string
        }
        Update: {
          created_at?: string
          id?: string
          is_support_reply?: boolean | null
          message?: string
          tenant_id?: string | null
          user_email?: string | null
          user_id?: string | null
          user_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      cloud_networks: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          image_path: string | null
          name: string
          network_type: string
          provider: string
          status: string | null
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          image_path?: string | null
          name: string
          network_type?: string
          provider?: string
          status?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          image_path?: string | null
          name?: string
          network_type?: string
          provider?: string
          status?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cloud_networks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_activities: {
        Row: {
          activity_type: string
          company_id: string | null
          completed_date: string | null
          contact_id: string | null
          created_at: string | null
          created_by: string | null
          deal_id: string | null
          description: string | null
          id: string
          scheduled_date: string | null
          status: string | null
          subject: string
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          activity_type: string
          company_id?: string | null
          completed_date?: string | null
          contact_id?: string | null
          created_at?: string | null
          created_by?: string | null
          deal_id?: string | null
          description?: string | null
          id?: string
          scheduled_date?: string | null
          status?: string | null
          subject: string
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          activity_type?: string
          company_id?: string | null
          completed_date?: string | null
          contact_id?: string | null
          created_at?: string | null
          created_by?: string | null
          deal_id?: string | null
          description?: string | null
          id?: string
          scheduled_date?: string | null
          status?: string | null
          subject?: string
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_activities_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "crm_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_activities_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_activities_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "crm_deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_activities_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_companies: {
        Row: {
          address: string | null
          city: string | null
          country: string | null
          created_at: string | null
          created_by: string | null
          email: string | null
          id: string
          industry: string | null
          name: string
          notes: string | null
          phone: string | null
          postal_code: string | null
          size: string | null
          state: string | null
          status: string | null
          tenant_id: string | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          id?: string
          industry?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          postal_code?: string | null
          size?: string | null
          state?: string | null
          status?: string | null
          tenant_id?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          id?: string
          industry?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          postal_code?: string | null
          size?: string | null
          state?: string | null
          status?: string | null
          tenant_id?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_companies_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_contacts: {
        Row: {
          company_id: string | null
          created_at: string | null
          created_by: string | null
          department: string | null
          email: string | null
          first_name: string
          id: string
          is_primary: boolean | null
          job_title: string | null
          last_name: string
          mobile: string | null
          notes: string | null
          phone: string | null
          status: string | null
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          department?: string | null
          email?: string | null
          first_name: string
          id?: string
          is_primary?: boolean | null
          job_title?: string | null
          last_name: string
          mobile?: string | null
          notes?: string | null
          phone?: string | null
          status?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          department?: string | null
          email?: string | null
          first_name?: string
          id?: string
          is_primary?: boolean | null
          job_title?: string | null
          last_name?: string
          mobile?: string | null
          notes?: string | null
          phone?: string | null
          status?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "crm_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_contacts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_deals: {
        Row: {
          actual_close_date: string | null
          assigned_to: string | null
          company_id: string | null
          contact_id: string | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          description: string | null
          expected_close_date: string | null
          id: string
          notes: string | null
          probability: number | null
          stage: string | null
          tenant_id: string | null
          title: string
          updated_at: string | null
          value: number | null
        }
        Insert: {
          actual_close_date?: string | null
          assigned_to?: string | null
          company_id?: string | null
          contact_id?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          description?: string | null
          expected_close_date?: string | null
          id?: string
          notes?: string | null
          probability?: number | null
          stage?: string | null
          tenant_id?: string | null
          title: string
          updated_at?: string | null
          value?: number | null
        }
        Update: {
          actual_close_date?: string | null
          assigned_to?: string | null
          company_id?: string | null
          contact_id?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          description?: string | null
          expected_close_date?: string | null
          id?: string
          notes?: string | null
          probability?: number | null
          stage?: string | null
          tenant_id?: string | null
          title?: string
          updated_at?: string | null
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_deals_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "crm_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_deals_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_deals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      directory_users: {
        Row: {
          aad_id: string | null
          account_enabled: boolean | null
          created_at: string
          deleted_manually: boolean | null
          department: string | null
          display_name: string | null
          email: string | null
          id: string
          job_title: string | null
          tenant_id: string | null
          updated_at: string
          user_principal_name: string | null
        }
        Insert: {
          aad_id?: string | null
          account_enabled?: boolean | null
          created_at?: string
          deleted_manually?: boolean | null
          department?: string | null
          display_name?: string | null
          email?: string | null
          id?: string
          job_title?: string | null
          tenant_id?: string | null
          updated_at?: string
          user_principal_name?: string | null
        }
        Update: {
          aad_id?: string | null
          account_enabled?: boolean | null
          created_at?: string
          deleted_manually?: boolean | null
          department?: string | null
          display_name?: string | null
          email?: string | null
          id?: string
          job_title?: string | null
          tenant_id?: string | null
          updated_at?: string
          user_principal_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "directory_users_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          file_size: number
          file_type: string
          filename: string
          id: string
          original_filename: string
          storage_bucket: string
          storage_path: string
          tags: string[] | null
          tenant_id: string | null
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          file_size: number
          file_type: string
          filename: string
          id?: string
          original_filename: string
          storage_bucket?: string
          storage_path: string
          tags?: string[] | null
          tenant_id?: string | null
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          file_size?: number
          file_type?: string
          filename?: string
          id?: string
          original_filename?: string
          storage_bucket?: string
          storage_path?: string
          tags?: string[] | null
          tenant_id?: string | null
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      global_admins: {
        Row: {
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      group_permissions: {
        Row: {
          granted_at: string
          granted_by: string | null
          group_id: string
          id: string
          permission_level: string
          resource_id: string
          resource_type: string
          tenant_id: string | null
        }
        Insert: {
          granted_at?: string
          granted_by?: string | null
          group_id: string
          id?: string
          permission_level?: string
          resource_id: string
          resource_type: string
          tenant_id?: string | null
        }
        Update: {
          granted_at?: string
          granted_by?: string | null
          group_id?: string
          id?: string
          permission_level?: string
          resource_id?: string
          resource_type?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "group_permissions_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "user_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_permissions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      hardware_inventory: {
        Row: {
          assigned_to: string | null
          branch: string | null
          created_at: string
          deleted_manually: boolean | null
          device_name: string
          device_type: string
          id: string
          last_seen: string | null
          location: string | null
          manufacturer: string | null
          model: string | null
          notes: string | null
          os: string | null
          os_version: string | null
          processor: string | null
          purchase_date: string | null
          ram_gb: number | null
          serial_number: string | null
          status: string
          storage_gb: number | null
          tenant_id: string | null
          updated_at: string
          warranty_expires: string | null
        }
        Insert: {
          assigned_to?: string | null
          branch?: string | null
          created_at?: string
          deleted_manually?: boolean | null
          device_name: string
          device_type: string
          id?: string
          last_seen?: string | null
          location?: string | null
          manufacturer?: string | null
          model?: string | null
          notes?: string | null
          os?: string | null
          os_version?: string | null
          processor?: string | null
          purchase_date?: string | null
          ram_gb?: number | null
          serial_number?: string | null
          status?: string
          storage_gb?: number | null
          tenant_id?: string | null
          updated_at?: string
          warranty_expires?: string | null
        }
        Update: {
          assigned_to?: string | null
          branch?: string | null
          created_at?: string
          deleted_manually?: boolean | null
          device_name?: string
          device_type?: string
          id?: string
          last_seen?: string | null
          location?: string | null
          manufacturer?: string | null
          model?: string | null
          notes?: string | null
          os?: string | null
          os_version?: string | null
          processor?: string | null
          purchase_date?: string | null
          ram_gb?: number | null
          serial_number?: string | null
          status?: string
          storage_gb?: number | null
          tenant_id?: string | null
          updated_at?: string
          warranty_expires?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hardware_inventory_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      import_jobs: {
        Row: {
          branch_id: string | null
          completed_at: string | null
          created_at: string
          error_details: string | null
          error_message: string | null
          file_path: string | null
          id: string
          import_type: string
          items_count: number
          items_imported: number
          resource_type: string
          result_summary: string | null
          status: string
          tenant_id: string | null
          updated_at: string | null
          uploader: string | null
        }
        Insert: {
          branch_id?: string | null
          completed_at?: string | null
          created_at?: string
          error_details?: string | null
          error_message?: string | null
          file_path?: string | null
          id?: string
          import_type: string
          items_count?: number
          items_imported?: number
          resource_type: string
          result_summary?: string | null
          status?: string
          tenant_id?: string | null
          updated_at?: string | null
          uploader?: string | null
        }
        Update: {
          branch_id?: string | null
          completed_at?: string | null
          created_at?: string
          error_details?: string | null
          error_message?: string | null
          file_path?: string | null
          id?: string
          import_type?: string
          items_count?: number
          items_imported?: number
          resource_type?: string
          result_summary?: string | null
          status?: string
          tenant_id?: string | null
          updated_at?: string | null
          uploader?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "import_jobs_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "import_jobs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      internet_connectivity: {
        Row: {
          account_number: string | null
          bandwidth_mbps: string | null
          branch_id: string
          connection_type: string | null
          contract_end_date: string | null
          contract_start_date: string | null
          created_at: string
          id: string
          isp: string
          monthly_cost: number | null
          notes: string | null
          router_model: string | null
          router_serial: string | null
          static_ip: string | null
          status: string
          support_contact: string | null
          support_email: string | null
          support_phone: string | null
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          account_number?: string | null
          bandwidth_mbps?: string | null
          branch_id: string
          connection_type?: string | null
          contract_end_date?: string | null
          contract_start_date?: string | null
          created_at?: string
          id?: string
          isp?: string
          monthly_cost?: number | null
          notes?: string | null
          router_model?: string | null
          router_serial?: string | null
          static_ip?: string | null
          status?: string
          support_contact?: string | null
          support_email?: string | null
          support_phone?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          account_number?: string | null
          bandwidth_mbps?: string | null
          branch_id?: string
          connection_type?: string | null
          contract_end_date?: string | null
          contract_start_date?: string | null
          created_at?: string
          id?: string
          isp?: string
          monthly_cost?: number | null
          notes?: string | null
          router_model?: string | null
          router_serial?: string | null
          static_ip?: string | null
          status?: string
          support_contact?: string | null
          support_email?: string | null
          support_phone?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "internet_connectivity_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internet_connectivity_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      job_update_requests: {
        Row: {
          created_at: string
          description: string
          id: string
          job_id: string
          notes: string | null
          requested_by: string | null
          requested_by_email: string | null
          requested_by_name: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string
          tenant_id: string | null
          update_type: string
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          job_id: string
          notes?: string | null
          requested_by?: string | null
          requested_by_email?: string | null
          requested_by_name?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          tenant_id?: string | null
          update_type: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          job_id?: string
          notes?: string | null
          requested_by?: string | null
          requested_by_email?: string | null
          requested_by_name?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          tenant_id?: string | null
          update_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_update_requests_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_update_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          actual_hours: number | null
          assigned_to: string | null
          branch_id: string | null
          client_name: string | null
          completed_date: string | null
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          estimated_hours: number | null
          id: string
          job_type: string
          notes: string | null
          priority: string | null
          start_date: string | null
          status: string
          tenant_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          actual_hours?: number | null
          assigned_to?: string | null
          branch_id?: string | null
          client_name?: string | null
          completed_date?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          estimated_hours?: number | null
          id?: string
          job_type?: string
          notes?: string | null
          priority?: string | null
          start_date?: string | null
          status?: string
          tenant_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          actual_hours?: number | null
          assigned_to?: string | null
          branch_id?: string | null
          client_name?: string | null
          completed_date?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          estimated_hours?: number | null
          id?: string
          job_type?: string
          notes?: string | null
          priority?: string | null
          start_date?: string | null
          status?: string
          tenant_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "jobs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      licenses: {
        Row: {
          assigned_to: string | null
          cost: number | null
          created_at: string
          deleted_manually: boolean | null
          id: string
          license_key: string | null
          license_name: string
          license_type: string
          notes: string | null
          purchase_date: string | null
          renewal_date: string | null
          status: string
          tenant_id: string | null
          total_seats: number
          updated_at: string
          used_seats: number
          vendor: string
        }
        Insert: {
          assigned_to?: string | null
          cost?: number | null
          created_at?: string
          deleted_manually?: boolean | null
          id?: string
          license_key?: string | null
          license_name: string
          license_type: string
          notes?: string | null
          purchase_date?: string | null
          renewal_date?: string | null
          status?: string
          tenant_id?: string | null
          total_seats: number
          updated_at?: string
          used_seats?: number
          vendor: string
        }
        Update: {
          assigned_to?: string | null
          cost?: number | null
          created_at?: string
          deleted_manually?: boolean | null
          id?: string
          license_key?: string | null
          license_name?: string
          license_type?: string
          notes?: string | null
          purchase_date?: string | null
          renewal_date?: string | null
          status?: string
          tenant_id?: string | null
          total_seats?: number
          updated_at?: string
          used_seats?: number
          vendor?: string
        }
        Relationships: [
          {
            foreignKeyName: "licenses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_requests: {
        Row: {
          assigned_to: string | null
          courier_booking_reference: string | null
          courier_cost: number | null
          courier_platform: string | null
          courier_status: string | null
          courier_tracking_number: string | null
          created_at: string
          current_user_id: string | null
          current_user_name: string | null
          delivery_address: string | null
          delivery_date: string | null
          description: string | null
          device_id: string | null
          device_model: string | null
          device_serial: string | null
          id: string
          internal_notes: string | null
          new_user_id: string | null
          new_user_name: string | null
          notes: string | null
          pickup_address: string | null
          pickup_date: string | null
          priority: string | null
          request_type: string
          requested_by: string | null
          requested_by_email: string | null
          requested_by_name: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string
          tenant_id: string | null
          title: string
          updated_at: string
          zapier_response: Json | null
          zapier_webhook_triggered: boolean | null
        }
        Insert: {
          assigned_to?: string | null
          courier_booking_reference?: string | null
          courier_cost?: number | null
          courier_platform?: string | null
          courier_status?: string | null
          courier_tracking_number?: string | null
          created_at?: string
          current_user_id?: string | null
          current_user_name?: string | null
          delivery_address?: string | null
          delivery_date?: string | null
          description?: string | null
          device_id?: string | null
          device_model?: string | null
          device_serial?: string | null
          id?: string
          internal_notes?: string | null
          new_user_id?: string | null
          new_user_name?: string | null
          notes?: string | null
          pickup_address?: string | null
          pickup_date?: string | null
          priority?: string | null
          request_type: string
          requested_by?: string | null
          requested_by_email?: string | null
          requested_by_name?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          tenant_id?: string | null
          title: string
          updated_at?: string
          zapier_response?: Json | null
          zapier_webhook_triggered?: boolean | null
        }
        Update: {
          assigned_to?: string | null
          courier_booking_reference?: string | null
          courier_cost?: number | null
          courier_platform?: string | null
          courier_status?: string | null
          courier_tracking_number?: string | null
          created_at?: string
          current_user_id?: string | null
          current_user_name?: string | null
          delivery_address?: string | null
          delivery_date?: string | null
          description?: string | null
          device_id?: string | null
          device_model?: string | null
          device_serial?: string | null
          id?: string
          internal_notes?: string | null
          new_user_id?: string | null
          new_user_name?: string | null
          notes?: string | null
          pickup_address?: string | null
          pickup_date?: string | null
          priority?: string | null
          request_type?: string
          requested_by?: string | null
          requested_by_email?: string | null
          requested_by_name?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          tenant_id?: string | null
          title?: string
          updated_at?: string
          zapier_response?: Json | null
          zapier_webhook_triggered?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      network_devices: {
        Row: {
          branch_id: string | null
          created_at: string
          device_name: string
          device_type: string
          id: string
          ip_address: string | null
          location: string | null
          mac_address: string | null
          manufacturer: string | null
          model: string | null
          notes: string | null
          purchase_date: string | null
          serial_number: string | null
          status: string
          tenant_id: string | null
          updated_at: string
          warranty_expires: string | null
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          device_name: string
          device_type: string
          id?: string
          ip_address?: string | null
          location?: string | null
          mac_address?: string | null
          manufacturer?: string | null
          model?: string | null
          notes?: string | null
          purchase_date?: string | null
          serial_number?: string | null
          status?: string
          tenant_id?: string | null
          updated_at?: string
          warranty_expires?: string | null
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          device_name?: string
          device_type?: string
          id?: string
          ip_address?: string | null
          location?: string | null
          mac_address?: string | null
          manufacturer?: string | null
          model?: string | null
          notes?: string | null
          purchase_date?: string | null
          serial_number?: string | null
          status?: string
          tenant_id?: string | null
          updated_at?: string
          warranty_expires?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "network_devices_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "network_devices_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      network_diagrams: {
        Row: {
          branch_id: string
          created_at: string
          description: string | null
          diagram_name: string
          diagram_url: string
          id: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          branch_id: string
          created_at?: string
          description?: string | null
          diagram_name: string
          diagram_url: string
          id?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          branch_id?: string
          created_at?: string
          description?: string | null
          diagram_name?: string
          diagram_url?: string
          id?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "network_diagrams_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "network_diagrams_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      provider_emails: {
        Row: {
          cc_addresses: string[] | null
          confirmation_token: string | null
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string
          email_type: string
          error_message: string | null
          html_content: string
          id: string
          provider: string
          provider_notes: string | null
          request_data: Json | null
          resend_count: number | null
          sent_at: string | null
          staff_member_email: string | null
          staff_member_id: string | null
          staff_member_name: string | null
          status: string
          subject: string
          tenant_id: string | null
          to_addresses: string[]
          updated_at: string
        }
        Insert: {
          cc_addresses?: string[] | null
          confirmation_token?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          email_type: string
          error_message?: string | null
          html_content: string
          id?: string
          provider: string
          provider_notes?: string | null
          request_data?: Json | null
          resend_count?: number | null
          sent_at?: string | null
          staff_member_email?: string | null
          staff_member_id?: string | null
          staff_member_name?: string | null
          status?: string
          subject: string
          tenant_id?: string | null
          to_addresses: string[]
          updated_at?: string
        }
        Update: {
          cc_addresses?: string[] | null
          confirmation_token?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          email_type?: string
          error_message?: string | null
          html_content?: string
          id?: string
          provider?: string
          provider_notes?: string | null
          request_data?: Json | null
          resend_count?: number | null
          sent_at?: string | null
          staff_member_email?: string | null
          staff_member_id?: string | null
          staff_member_name?: string | null
          status?: string
          subject?: string
          tenant_id?: string | null
          to_addresses?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_emails_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      remote_clients: {
        Row: {
          computer_name: string
          id: string
          ip_address: string | null
          last_seen_at: string | null
          metadata: Json | null
          os_version: string | null
          registered_at: string
          registration_token: string
          status: string | null
          tenant_id: string | null
          username: string
        }
        Insert: {
          computer_name: string
          id?: string
          ip_address?: string | null
          last_seen_at?: string | null
          metadata?: Json | null
          os_version?: string | null
          registered_at?: string
          registration_token: string
          status?: string | null
          tenant_id?: string | null
          username: string
        }
        Update: {
          computer_name?: string
          id?: string
          ip_address?: string | null
          last_seen_at?: string | null
          metadata?: Json | null
          os_version?: string | null
          registered_at?: string
          registration_token?: string
          status?: string | null
          tenant_id?: string | null
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "remote_clients_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      remote_sessions: {
        Row: {
          connection_details: Json | null
          connection_type: string | null
          created_at: string
          device_info: Json | null
          ended_at: string | null
          id: string
          session_code: string
          started_at: string | null
          status: string
          support_staff_id: string | null
          tenant_id: string | null
          ticket_id: string | null
          updated_at: string
          user_email: string | null
          user_name: string
        }
        Insert: {
          connection_details?: Json | null
          connection_type?: string | null
          created_at?: string
          device_info?: Json | null
          ended_at?: string | null
          id?: string
          session_code: string
          started_at?: string | null
          status?: string
          support_staff_id?: string | null
          tenant_id?: string | null
          ticket_id?: string | null
          updated_at?: string
          user_email?: string | null
          user_name: string
        }
        Update: {
          connection_details?: Json | null
          connection_type?: string | null
          created_at?: string
          device_info?: Json | null
          ended_at?: string | null
          id?: string
          session_code?: string
          started_at?: string | null
          status?: string
          support_staff_id?: string | null
          tenant_id?: string | null
          ticket_id?: string | null
          updated_at?: string
          user_email?: string | null
          user_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "remote_sessions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "remote_sessions_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      schema_migrations: {
        Row: {
          applied_at: string | null
          version: string
        }
        Insert: {
          applied_at?: string | null
          version: string
        }
        Update: {
          applied_at?: string | null
          version?: string
        }
        Relationships: []
      }
      shared_files: {
        Row: {
          created_at: string
          document_id: string
          expires_at: string | null
          id: string
          permission_level: string
          shared_by: string | null
          shared_with_group_id: string | null
          shared_with_user_id: string | null
          tenant_id: string | null
        }
        Insert: {
          created_at?: string
          document_id: string
          expires_at?: string | null
          id?: string
          permission_level?: string
          shared_by?: string | null
          shared_with_group_id?: string | null
          shared_with_user_id?: string | null
          tenant_id?: string | null
        }
        Update: {
          created_at?: string
          document_id?: string
          expires_at?: string | null
          id?: string
          permission_level?: string
          shared_by?: string | null
          shared_with_group_id?: string | null
          shared_with_user_id?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shared_files_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shared_files_shared_with_group_id_fkey"
            columns: ["shared_with_group_id"]
            isOneToOne: false
            referencedRelation: "user_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shared_files_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      shared_folder_files: {
        Row: {
          added_at: string
          added_by: string | null
          document_id: string
          folder_id: string
          id: string
          tenant_id: string | null
        }
        Insert: {
          added_at?: string
          added_by?: string | null
          document_id: string
          folder_id: string
          id?: string
          tenant_id?: string | null
        }
        Update: {
          added_at?: string
          added_by?: string | null
          document_id?: string
          folder_id?: string
          id?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shared_folder_files_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shared_folder_files_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "shared_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shared_folder_files_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      shared_folder_permissions: {
        Row: {
          folder_id: string
          granted_at: string
          granted_by: string | null
          group_id: string | null
          id: string
          permission_level: string
          tenant_id: string | null
          user_id: string | null
        }
        Insert: {
          folder_id: string
          granted_at?: string
          granted_by?: string | null
          group_id?: string | null
          id?: string
          permission_level?: string
          tenant_id?: string | null
          user_id?: string | null
        }
        Update: {
          folder_id?: string
          granted_at?: string
          granted_by?: string | null
          group_id?: string | null
          id?: string
          permission_level?: string
          tenant_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shared_folder_permissions_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "shared_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shared_folder_permissions_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "user_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shared_folder_permissions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      shared_folders: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          parent_folder_id: string | null
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          parent_folder_id?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          parent_folder_id?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shared_folders_parent_folder_id_fkey"
            columns: ["parent_folder_id"]
            isOneToOne: false
            referencedRelation: "shared_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shared_folders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      software_inventory: {
        Row: {
          assigned_to: string | null
          created_at: string
          expiry_date: string | null
          id: string
          install_date: string | null
          installed_on: string | null
          license_key: string | null
          license_type: string | null
          notes: string | null
          software_name: string
          status: string
          tenant_id: string | null
          updated_at: string
          vendor: string | null
          version: string | null
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          expiry_date?: string | null
          id?: string
          install_date?: string | null
          installed_on?: string | null
          license_key?: string | null
          license_type?: string | null
          notes?: string | null
          software_name: string
          status?: string
          tenant_id?: string | null
          updated_at?: string
          vendor?: string | null
          version?: string | null
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          expiry_date?: string | null
          id?: string
          install_date?: string | null
          installed_on?: string | null
          license_key?: string | null
          license_type?: string | null
          notes?: string | null
          software_name?: string
          status?: string
          tenant_id?: string | null
          updated_at?: string
          vendor?: string | null
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "software_inventory_installed_on_fkey"
            columns: ["installed_on"]
            isOneToOne: false
            referencedRelation: "hardware_inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "software_inventory_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          logo_url: string | null
          name: string
          primary_color: string | null
          settings: Json | null
          slug: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name: string
          primary_color?: string | null
          settings?: Json | null
          slug: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name?: string
          primary_color?: string | null
          settings?: Json | null
          slug?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      ticket_comments: {
        Row: {
          comment: string
          created_at: string
          id: string
          tenant_id: string | null
          ticket_id: string
          user_id: string | null
        }
        Insert: {
          comment: string
          created_at?: string
          id?: string
          tenant_id?: string | null
          ticket_id: string
          user_id?: string | null
        }
        Update: {
          comment?: string
          created_at?: string
          id?: string
          tenant_id?: string | null
          ticket_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ticket_comments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_comments_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_time_logs: {
        Row: {
          created_at: string
          id: string
          logged_at: string
          minutes: number
          notes: string | null
          tenant_id: string | null
          ticket_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          logged_at?: string
          minutes: number
          notes?: string | null
          tenant_id?: string | null
          ticket_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          logged_at?: string
          minutes?: number
          notes?: string | null
          tenant_id?: string | null
          ticket_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_time_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_time_logs_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          assigned_to: string | null
          branch: string | null
          category: string | null
          created_at: string
          created_by: string | null
          description: string | null
          error_code: string | null
          fault_type: string | null
          id: string
          last_activity_at: string | null
          priority: Database["public"]["Enums"]["ticket_priority"]
          reminder_sent_at: string | null
          resolved_at: string | null
          status: Database["public"]["Enums"]["ticket_status"]
          tenant_id: string | null
          time_spent_minutes: number | null
          title: string
          updated_at: string
          user_email: string | null
        }
        Insert: {
          assigned_to?: string | null
          branch?: string | null
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          error_code?: string | null
          fault_type?: string | null
          id?: string
          last_activity_at?: string | null
          priority?: Database["public"]["Enums"]["ticket_priority"]
          reminder_sent_at?: string | null
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["ticket_status"]
          tenant_id?: string | null
          time_spent_minutes?: number | null
          title: string
          updated_at?: string
          user_email?: string | null
        }
        Update: {
          assigned_to?: string | null
          branch?: string | null
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          error_code?: string | null
          fault_type?: string | null
          id?: string
          last_activity_at?: string | null
          priority?: Database["public"]["Enums"]["ticket_priority"]
          reminder_sent_at?: string | null
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["ticket_status"]
          tenant_id?: string | null
          time_spent_minutes?: number | null
          title?: string
          updated_at?: string
          user_email?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tickets_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      user_group_members: {
        Row: {
          added_at: string
          added_by: string | null
          group_id: string
          id: string
          tenant_id: string | null
          user_id: string
        }
        Insert: {
          added_at?: string
          added_by?: string | null
          group_id: string
          id?: string
          tenant_id?: string | null
          user_id: string
        }
        Update: {
          added_at?: string
          added_by?: string | null
          group_id?: string
          id?: string
          tenant_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "user_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_group_members_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      user_groups: {
        Row: {
          created_at: string
          created_by: string | null
          description: string
          id: string
          name: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description: string
          id?: string
          name: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          name?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_groups_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      user_permissions: {
        Row: {
          granted_at: string
          granted_by: string | null
          id: string
          permission_level: string
          resource_id: string
          resource_type: string
          tenant_id: string | null
          user_id: string
        }
        Insert: {
          granted_at?: string
          granted_by?: string | null
          id?: string
          permission_level?: string
          resource_id: string
          resource_type: string
          tenant_id?: string | null
          user_id: string
        }
        Update: {
          granted_at?: string
          granted_by?: string | null
          id?: string
          permission_level?: string
          resource_id?: string
          resource_type?: string
          tenant_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_permissions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_tenant_memberships: {
        Row: {
          created_at: string | null
          id: string
          is_default: boolean | null
          role: Database["public"]["Enums"]["app_role"]
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          role?: Database["public"]["Enums"]["app_role"]
          tenant_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          role?: Database["public"]["Enums"]["app_role"]
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_tenant_memberships_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      vpn_rdp_credentials: {
        Row: {
          created_at: string
          email: string | null
          id: string
          notes: string | null
          password: string
          service_type: string
          tenant_id: string | null
          updated_at: string
          username: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          notes?: string | null
          password: string
          service_type: string
          tenant_id?: string | null
          updated_at?: string
          username: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          notes?: string | null
          password?: string
          service_type?: string
          tenant_id?: string | null
          updated_at?: string
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "vpn_rdp_credentials_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_confirmation_token: { Args: never; Returns: string }
      get_user_tenant_ids: { Args: { _user_id?: string }; Returns: string[] }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_tenant_access: {
        Args: { _tenant_id: string; _user_id?: string }
        Returns: boolean
      }
      has_tenant_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _tenant_id: string
          _user_id?: string
        }
        Returns: boolean
      }
      import_system_users_from_staff: {
        Args: { staff_user_ids: string[] }
        Returns: Json
      }
      is_super_admin: { Args: { _user_id?: string }; Returns: boolean }
      remove_hardware_duplicates: { Args: never; Returns: number }
      remove_license_duplicates: { Args: never; Returns: number }
      remove_user_duplicates: { Args: never; Returns: number }
    }
    Enums: {
      app_role: "admin" | "support_staff" | "user"
      asset_status: "active" | "maintenance" | "retired" | "disposed"
      ticket_priority: "low" | "medium" | "high" | "urgent"
      ticket_status: "open" | "in_progress" | "pending" | "resolved" | "closed"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "support_staff", "user"],
      asset_status: ["active", "maintenance", "retired", "disposed"],
      ticket_priority: ["low", "medium", "high", "urgent"],
      ticket_status: ["open", "in_progress", "pending", "resolved", "closed"],
    },
  },
} as const
