-- Create remote support sessions table
CREATE TABLE public.remote_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID REFERENCES public.tickets(id) ON DELETE CASCADE,
  session_code TEXT NOT NULL UNIQUE,
  user_name TEXT NOT NULL,
  user_email TEXT,
  device_info JSONB,
  status TEXT NOT NULL DEFAULT 'pending',
  support_staff_id UUID,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.remote_sessions ENABLE ROW LEVEL SECURITY;

-- Support staff can view all sessions
CREATE POLICY "Support staff can view all remote sessions"
ON public.remote_sessions
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'support_staff'::app_role));

-- Anyone can create a session (for users requesting support)
CREATE POLICY "Anyone can create remote sessions"
ON public.remote_sessions
FOR INSERT
WITH CHECK (true);

-- Support staff can update sessions
CREATE POLICY "Support staff can update remote sessions"
ON public.remote_sessions
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'support_staff'::app_role));

-- Support staff can delete sessions
CREATE POLICY "Support staff can delete remote sessions"
ON public.remote_sessions
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'support_staff'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_remote_sessions_updated_at
BEFORE UPDATE ON public.remote_sessions
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Create index for session lookups
CREATE INDEX idx_remote_sessions_code ON public.remote_sessions(session_code);
CREATE INDEX idx_remote_sessions_status ON public.remote_sessions(status);