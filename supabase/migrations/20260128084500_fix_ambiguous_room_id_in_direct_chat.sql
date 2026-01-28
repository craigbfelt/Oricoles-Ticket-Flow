-- Fix ambiguous room_id column reference in get_or_create_direct_chat_room function
-- This resolves the error: "column reference room_id is ambiguous" when clicking on direct chat

CREATE OR REPLACE FUNCTION public.get_or_create_direct_chat_room(
  user_id_1 UUID,
  user_id_2 UUID
)
RETURNS UUID AS $$
DECLARE
  room_id UUID;
BEGIN
  -- Try to find existing direct message room between these two users
  SELECT scr.id INTO room_id
  FROM public.staff_chat_rooms scr
  WHERE scr.room_type = 'direct'
  AND EXISTS (
    SELECT 1 FROM public.staff_chat_participants scp1
    WHERE scp1.room_id = scr.id AND scp1.user_id = user_id_1
  )
  AND EXISTS (
    SELECT 1 FROM public.staff_chat_participants scp2
    WHERE scp2.room_id = scr.id AND scp2.user_id = user_id_2
  )
  AND (
    SELECT COUNT(*) FROM public.staff_chat_participants scp3
    WHERE scp3.room_id = scr.id
  ) = 2
  LIMIT 1;

  -- If room doesn't exist, create it
  IF room_id IS NULL THEN
    INSERT INTO public.staff_chat_rooms (room_type)
    VALUES ('direct')
    RETURNING id INTO room_id;

    -- Add both participants
    INSERT INTO public.staff_chat_participants (room_id, user_id)
    VALUES (room_id, user_id_1), (room_id, user_id_2);
  END IF;

  RETURN room_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
