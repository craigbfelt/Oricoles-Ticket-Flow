-- Create remote_clients table
CREATE TABLE IF NOT EXISTS public.remote_clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  registration_token TEXT NOT NULL UNIQUE,
  computer_name TEXT NOT NULL,
  username TEXT NOT NULL,
  os_version TEXT,
  ip_address TEXT,
  last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  registered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT DEFAULT 'online' CHECK (status IN ('online', 'offline', 'idle')),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE public.remote_clients ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read all clients
CREATE POLICY "Authenticated users can view remote clients"
  ON public.remote_clients
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow anyone to register a new client (public endpoint)
CREATE POLICY "Anyone can register a client"
  ON public.remote_clients
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Allow anyone to update client status (for heartbeat)
CREATE POLICY "Anyone can update client status"
  ON public.remote_clients
  FOR UPDATE
  TO anon
  USING (true);

-- Create index for faster lookups
CREATE INDEX idx_remote_clients_token ON public.remote_clients(registration_token);
CREATE INDEX idx_remote_clients_status ON public.remote_clients(status);