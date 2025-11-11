-- Fix RLS policies for remote sessions and clients to allow anonymous access

-- Drop existing policies for remote_sessions
DROP POLICY IF EXISTS "Anyone can create remote sessions" ON public.remote_sessions;

-- Create new policy that explicitly allows anon users to insert
CREATE POLICY "Anyone can create remote sessions"
  ON public.remote_sessions
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Also update the register function to be accessible by anon users
-- Drop and recreate remote_clients policies to ensure anon access
DROP POLICY IF EXISTS "Anyone can register a client" ON public.remote_clients;
DROP POLICY IF EXISTS "Anyone can update client status" ON public.remote_clients;

CREATE POLICY "Anyone can register a client"
  ON public.remote_clients
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can update client status"
  ON public.remote_clients
  FOR UPDATE
  TO anon, authenticated
  USING (true);