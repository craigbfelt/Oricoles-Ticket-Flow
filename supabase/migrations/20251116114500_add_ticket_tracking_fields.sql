-- Add additional tracking fields to tickets table for better user tracking
ALTER TABLE public.tickets
ADD COLUMN IF NOT EXISTS branch TEXT,
ADD COLUMN IF NOT EXISTS fault_type TEXT,
ADD COLUMN IF NOT EXISTS user_email TEXT,
ADD COLUMN IF NOT EXISTS error_code TEXT,
ADD COLUMN IF NOT EXISTS device_serial_number TEXT;

-- Create function to log ticket creation activity
CREATE OR REPLACE FUNCTION log_ticket_activity()
RETURNS TRIGGER AS $$
BEGIN
  -- Log ticket creation
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.user_activity_log (user_id, activity_type, activity_details)
    VALUES (
      (SELECT user_id FROM public.profiles WHERE id = NEW.created_by),
      'ticket_create',
      jsonb_build_object(
        'ticket_id', NEW.id,
        'title', NEW.title,
        'priority', NEW.priority,
        'branch', NEW.branch,
        'device_serial_number', NEW.device_serial_number
      )
    );
  -- Log ticket updates
  ELSIF TG_OP = 'UPDATE' AND (OLD.status != NEW.status OR OLD.assigned_to != NEW.assigned_to) THEN
    INSERT INTO public.user_activity_log (user_id, activity_type, activity_details)
    VALUES (
      (SELECT user_id FROM public.profiles WHERE id = COALESCE(NEW.assigned_to, NEW.created_by)),
      'ticket_update',
      jsonb_build_object(
        'ticket_id', NEW.id,
        'old_status', OLD.status,
        'new_status', NEW.status,
        'old_assigned_to', OLD.assigned_to,
        'new_assigned_to', NEW.assigned_to
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for ticket activity logging
DROP TRIGGER IF EXISTS ticket_activity_log_trigger ON public.tickets;
CREATE TRIGGER ticket_activity_log_trigger
  AFTER INSERT OR UPDATE ON public.tickets
  FOR EACH ROW
  EXECUTE FUNCTION log_ticket_activity();

-- Add comments
COMMENT ON COLUMN public.tickets.branch IS 'Branch location associated with the ticket';
COMMENT ON COLUMN public.tickets.fault_type IS 'Type of fault reported in the ticket';
COMMENT ON COLUMN public.tickets.user_email IS 'Email of the user reporting the ticket';
COMMENT ON COLUMN public.tickets.error_code IS 'Error code associated with the fault';
COMMENT ON COLUMN public.tickets.device_serial_number IS 'Device serial number from user profile';
