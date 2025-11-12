-- Create update timestamp function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create chat messages table for live support chat
CREATE TABLE public.chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  user_name TEXT NOT NULL,
  user_email TEXT,
  message TEXT NOT NULL,
  is_support_reply BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Create policies for chat messages
CREATE POLICY "Users can view all chat messages"
  ON public.chat_messages
  FOR SELECT
  USING (true);

CREATE POLICY "Users can create their own messages"
  ON public.chat_messages
  FOR INSERT
  WITH CHECK (auth.uid() = user_id OR auth.uid() IS NULL);

CREATE POLICY "Support staff can create support replies"
  ON public.chat_messages
  FOR INSERT
  WITH CHECK (
    is_support_reply = true AND 
    (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'support_staff'::app_role))
  );

-- Enable realtime for chat messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;

-- Create jobs table
CREATE TABLE public.jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'live',
  job_type TEXT NOT NULL DEFAULT 'job',
  priority TEXT DEFAULT 'medium',
  assigned_to UUID,
  created_by UUID,
  branch_id UUID,
  estimated_hours NUMERIC,
  actual_hours NUMERIC,
  start_date DATE,
  due_date DATE,
  completed_date DATE,
  client_name TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

-- Create policies for jobs
CREATE POLICY "Admins and support can view all jobs"
  ON public.jobs
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'support_staff'::app_role));

CREATE POLICY "Admins and support can create jobs"
  ON public.jobs
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'support_staff'::app_role));

CREATE POLICY "Admins and support can update jobs"
  ON public.jobs
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'support_staff'::app_role));

CREATE POLICY "Admins can delete jobs"
  ON public.jobs
  FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create job update requests table
CREATE TABLE public.job_update_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  requested_by UUID,
  requested_by_name TEXT,
  requested_by_email TEXT,
  update_type TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.job_update_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can create update requests"
  ON public.job_update_requests
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins and support can view update requests"
  ON public.job_update_requests
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'support_staff'::app_role));

CREATE POLICY "Admins and support can update requests"
  ON public.job_update_requests
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'support_staff'::app_role));

-- Create trigger for jobs updated_at
CREATE TRIGGER update_jobs_updated_at
  BEFORE UPDATE ON public.jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();