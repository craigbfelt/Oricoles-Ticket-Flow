-- Add new fields for enhanced ticket tracking
-- Ticket code for unique tracking
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS ticket_code text UNIQUE;

-- Work start tracking
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS started_at timestamptz;

-- Response and resolution time tracking
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS response_required_by timestamptz;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS resolution_required_by timestamptz;

-- Escalation tracking
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS escalated boolean DEFAULT false;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS escalated_at timestamptz;

-- Closing time tracking (time spent on resolution)
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS resolution_time_minutes integer;

-- Create function to generate unique ticket code
CREATE OR REPLACE FUNCTION generate_ticket_code()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  new_code text;
  year_str text;
  sequence_num integer;
BEGIN
  -- Get current year
  year_str := to_char(now(), 'YYYY');
  
  -- Get the next sequence number for this year
  SELECT COALESCE(MAX(
    CAST(
      substring(ticket_code from 'TKT-' || year_str || '-(\d+)')
      AS integer
    )
  ), 0) + 1
  INTO sequence_num
  FROM public.tickets
  WHERE ticket_code LIKE 'TKT-' || year_str || '-%';
  
  -- Format: TKT-YYYY-#### (e.g., TKT-2024-0001)
  new_code := 'TKT-' || year_str || '-' || LPAD(sequence_num::text, 4, '0');
  
  RETURN new_code;
END;
$$;

-- Create trigger function to auto-generate ticket code
CREATE OR REPLACE FUNCTION set_ticket_code()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.ticket_code IS NULL THEN
    NEW.ticket_code := generate_ticket_code();
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger to set ticket code on insert
DROP TRIGGER IF EXISTS set_ticket_code_trigger ON public.tickets;
CREATE TRIGGER set_ticket_code_trigger
  BEFORE INSERT ON public.tickets
  FOR EACH ROW
  EXECUTE FUNCTION set_ticket_code();

-- Create function to set response and resolution deadlines
CREATE OR REPLACE FUNCTION set_ticket_deadlines()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Set response deadline: 15 minutes from creation
  IF NEW.response_required_by IS NULL THEN
    NEW.response_required_by := NEW.created_at + INTERVAL '15 minutes';
  END IF;
  
  -- Set resolution deadline for urgent tickets: 2 hours from creation
  IF NEW.priority = 'urgent' AND NEW.resolution_required_by IS NULL THEN
    NEW.resolution_required_by := NEW.created_at + INTERVAL '2 hours';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to set deadlines on insert
DROP TRIGGER IF EXISTS set_ticket_deadlines_trigger ON public.tickets;
CREATE TRIGGER set_ticket_deadlines_trigger
  BEFORE INSERT ON public.tickets
  FOR EACH ROW
  EXECUTE FUNCTION set_ticket_deadlines();

-- Create function to update resolution time when closing
CREATE OR REPLACE FUNCTION calculate_resolution_time()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- If ticket is being closed, calculate resolution time
  IF NEW.status = 'closed' AND OLD.status != 'closed' THEN
    -- If work was started, calculate time from start to now in minutes
    IF NEW.started_at IS NOT NULL THEN
      NEW.resolution_time_minutes := EXTRACT(EPOCH FROM (now() - NEW.started_at)) / 60;
    -- Otherwise, calculate from creation time (for tickets closed without starting work)
    ELSE
      NEW.resolution_time_minutes := EXTRACT(EPOCH FROM (now() - NEW.created_at)) / 60;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to calculate resolution time
DROP TRIGGER IF EXISTS calculate_resolution_time_trigger ON public.tickets;
CREATE TRIGGER calculate_resolution_time_trigger
  BEFORE UPDATE ON public.tickets
  FOR EACH ROW
  EXECUTE FUNCTION calculate_resolution_time();

-- Create index on ticket_code for faster lookups
CREATE INDEX IF NOT EXISTS idx_tickets_ticket_code ON public.tickets(ticket_code);

-- Create index on status and deadlines for filtering overdue tickets
CREATE INDEX IF NOT EXISTS idx_tickets_response_deadline ON public.tickets(response_required_by) WHERE status NOT IN ('closed', 'resolved');
CREATE INDEX IF NOT EXISTS idx_tickets_resolution_deadline ON public.tickets(resolution_required_by) WHERE status NOT IN ('closed', 'resolved');
