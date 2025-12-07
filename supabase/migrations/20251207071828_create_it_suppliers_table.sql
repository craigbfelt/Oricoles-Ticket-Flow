-- Create IT Suppliers table
CREATE TABLE IF NOT EXISTS public.it_suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  services TEXT NOT NULL,
  contact_email TEXT,
  contact_phone TEXT,
  website TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS on it_suppliers
ALTER TABLE public.it_suppliers ENABLE ROW LEVEL SECURITY;

-- Create policies for it_suppliers
CREATE POLICY "Anyone authenticated can view IT suppliers"
ON public.it_suppliers
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can insert IT suppliers"
ON public.it_suppliers
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can update IT suppliers"
ON public.it_suppliers
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can delete IT suppliers"
ON public.it_suppliers
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Add trigger for updated_at
CREATE TRIGGER update_it_suppliers_updated_at
BEFORE UPDATE ON public.it_suppliers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert initial IT suppliers data
INSERT INTO public.it_suppliers (name, role, services) VALUES
('ZeroBitOne', 'IT Hardware & Software Support', 'IT hardware & software support, Microsoft 365 Management, Remote Support, Network Support'),
('Qwerti', 'RDP Environment Support', 'RDP environment Support & Management'),
('Armata', 'Firewall / VPN Security', 'Firewall / VPN - Security'),
('BrainTree', 'License Supplier', 'Microsoft 365 License Supplier, RDP License Supplier, Microsoft 365 Exchange Email backup license provider'),
('Vox', 'Internet & VOIP Provider', 'Internet Links for all branches / VOIP Phone System Provider'),
('Nymbis Cloud', 'Cloud Server Provider', 'Cloud Server Framework Provider for the Oricol Virtual Servers that run RDP, Sage etc'),
('Brilliant Link', 'Sage Supplier', 'Sage Pastel Supplier / Support'),
('Bluwave', 'CRM Solution', 'CRM Software Solution System - Web based')
ON CONFLICT DO NOTHING;
