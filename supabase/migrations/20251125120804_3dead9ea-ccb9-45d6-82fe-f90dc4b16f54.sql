-- Create cloud_networks table for Nymbis RDP Cloud
CREATE TABLE IF NOT EXISTS public.cloud_networks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'nymbis',
  network_type TEXT NOT NULL DEFAULT 'rdp',
  description TEXT,
  image_path TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.cloud_networks ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies
CREATE POLICY "Authenticated users can view cloud networks" ON public.cloud_networks
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create cloud networks" ON public.cloud_networks
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update own cloud networks or if admin" ON public.cloud_networks
  FOR UPDATE USING (
    created_by = auth.uid() OR 
    EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin')
  );

CREATE POLICY "Users can delete own cloud networks or if admin" ON public.cloud_networks
  FOR DELETE USING (
    created_by = auth.uid() OR 
    EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin')
  );

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_cloud_networks_provider ON public.cloud_networks(provider);
CREATE INDEX IF NOT EXISTS idx_cloud_networks_status ON public.cloud_networks(status);
CREATE INDEX IF NOT EXISTS idx_cloud_networks_created_by ON public.cloud_networks(created_by);

-- Create trigger for updated_at
CREATE TRIGGER update_cloud_networks_updated_at
  BEFORE UPDATE ON public.cloud_networks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();