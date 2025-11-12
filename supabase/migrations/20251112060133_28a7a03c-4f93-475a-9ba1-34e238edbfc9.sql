-- Create internet_connectivity table
CREATE TABLE public.internet_connectivity (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE NOT NULL,
  isp TEXT NOT NULL DEFAULT 'VOX',
  connection_type TEXT, -- fiber, dsl, wireless, etc.
  bandwidth_mbps TEXT, -- e.g., "100/100", "50/10"
  static_ip TEXT,
  account_number TEXT,
  contract_start_date DATE,
  contract_end_date DATE,
  monthly_cost NUMERIC,
  support_contact TEXT,
  support_phone TEXT,
  support_email TEXT,
  router_model TEXT,
  router_serial TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on internet_connectivity
ALTER TABLE public.internet_connectivity ENABLE ROW LEVEL SECURITY;

-- Create policies for internet_connectivity
CREATE POLICY "Admins and support can view internet connectivity"
ON public.internet_connectivity
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'support_staff'::app_role));

CREATE POLICY "Admins can insert internet connectivity"
ON public.internet_connectivity
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update internet connectivity"
ON public.internet_connectivity
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete internet connectivity"
ON public.internet_connectivity
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add trigger for updated_at
CREATE TRIGGER update_internet_connectivity_updated_at
BEFORE UPDATE ON public.internet_connectivity
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();