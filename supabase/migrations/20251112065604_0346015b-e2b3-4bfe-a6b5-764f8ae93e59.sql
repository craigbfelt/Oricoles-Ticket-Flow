-- Create maintenance requests table
CREATE TABLE public.maintenance_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'pending',
  
  -- Device/Asset Information
  device_id UUID,
  device_serial TEXT,
  device_model TEXT,
  
  -- User Information
  current_user_id UUID,
  current_user_name TEXT,
  new_user_id UUID,
  new_user_name TEXT,
  
  -- Courier Information
  courier_platform TEXT,
  courier_booking_reference TEXT,
  courier_tracking_number TEXT,
  pickup_address TEXT,
  delivery_address TEXT,
  pickup_date DATE,
  delivery_date DATE,
  courier_status TEXT,
  courier_cost NUMERIC,
  
  -- Request Details
  requested_by UUID,
  requested_by_name TEXT,
  requested_by_email TEXT,
  assigned_to UUID,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID,
  
  -- Notes
  notes TEXT,
  internal_notes TEXT,
  
  -- Zapier Integration
  zapier_webhook_triggered BOOLEAN DEFAULT false,
  zapier_response JSONB
);

-- Enable RLS
ALTER TABLE public.maintenance_requests ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can create maintenance requests"
  ON public.maintenance_requests
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins and support can view all requests"
  ON public.maintenance_requests
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'support_staff'::app_role));

CREATE POLICY "Users can view their own requests"
  ON public.maintenance_requests
  FOR SELECT
  USING (auth.uid() = requested_by);

CREATE POLICY "Admins and support can update requests"
  ON public.maintenance_requests
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'support_staff'::app_role));

CREATE POLICY "Admins can delete requests"
  ON public.maintenance_requests
  FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_maintenance_requests_updated_at
  BEFORE UPDATE ON public.maintenance_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();