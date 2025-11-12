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
          updated_at?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          created_at: string
          id: string
          is_support_reply: boolean | null
          message: string
          user_email: string | null
          user_id: string | null
          user_name: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_support_reply?: boolean | null
          message: string
          user_email?: string | null
          user_id?: string | null
          user_name: string
        }
        Update: {
          created_at?: string
          id?: string
          is_support_reply?: boolean | null
          message?: string
          user_email?: string | null
          user_id?: string | null
          user_name?: string
        }
        Relationships: []
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
          updated_at?: string
          user_principal_name?: string | null
        }
        Relationships: []
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
          updated_at?: string
          warranty_expires?: string | null
        }
        Relationships: []
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
          title?: string
          updated_at?: string
        }
        Relationships: []
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
          total_seats?: number
          updated_at?: string
          used_seats?: number
          vendor?: string
        }
        Relationships: []
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
          updated_at: string
        }
        Insert: {
          branch_id: string
          created_at?: string
          description?: string | null
          diagram_name: string
          diagram_url: string
          id?: string
          updated_at?: string
        }
        Update: {
          branch_id?: string
          created_at?: string
          description?: string | null
          diagram_name?: string
          diagram_url?: string
          id?: string
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
          to_addresses?: string[]
          updated_at?: string
        }
        Relationships: []
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
          username?: string
        }
        Relationships: []
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
          ticket_id?: string | null
          updated_at?: string
          user_email?: string | null
          user_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "remote_sessions_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
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
        ]
      }
      ticket_comments: {
        Row: {
          comment: string
          created_at: string
          id: string
          ticket_id: string
          user_id: string | null
        }
        Insert: {
          comment: string
          created_at?: string
          id?: string
          ticket_id: string
          user_id?: string | null
        }
        Update: {
          comment?: string
          created_at?: string
          id?: string
          ticket_id?: string
          user_id?: string | null
        }
        Relationships: [
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
          ticket_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          logged_at?: string
          minutes: number
          notes?: string | null
          ticket_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          logged_at?: string
          minutes?: number
          notes?: string | null
          ticket_id?: string
          user_id?: string
        }
        Relationships: [
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
      vpn_rdp_credentials: {
        Row: {
          created_at: string
          email: string | null
          id: string
          notes: string | null
          password: string
          service_type: string
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
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_confirmation_token: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
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
