-- Create staff chat system for IT support team communication
-- This enables real-time messaging between staff members and a company-wide broadcast channel

-- Create staff_chat_rooms table for chat channels (direct messages and broadcast)
CREATE TABLE public.staff_chat_rooms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_type TEXT NOT NULL CHECK (room_type IN ('direct', 'broadcast')),
  room_name TEXT, -- Only used for broadcast channels
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create staff_chat_participants table to track who is in each room
CREATE TABLE public.staff_chat_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.staff_chat_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_read_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(room_id, user_id)
);

-- Create staff_chat_messages table for all chat messages
CREATE TABLE public.staff_chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.staff_chat_rooms(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_edited BOOLEAN DEFAULT false,
  is_deleted BOOLEAN DEFAULT false
);

-- Create indexes for better query performance
CREATE INDEX idx_staff_chat_messages_room_id ON public.staff_chat_messages(room_id);
CREATE INDEX idx_staff_chat_messages_sender_id ON public.staff_chat_messages(sender_id);
CREATE INDEX idx_staff_chat_messages_created_at ON public.staff_chat_messages(created_at DESC);
CREATE INDEX idx_staff_chat_participants_room_id ON public.staff_chat_participants(room_id);
CREATE INDEX idx_staff_chat_participants_user_id ON public.staff_chat_participants(user_id);

-- Enable RLS on all chat tables
ALTER TABLE public.staff_chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for staff_chat_rooms
CREATE POLICY "Authenticated users can view all chat rooms"
  ON public.staff_chat_rooms FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create chat rooms"
  ON public.staff_chat_rooms FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update chat rooms"
  ON public.staff_chat_rooms FOR UPDATE
  TO authenticated
  USING (true);

-- RLS Policies for staff_chat_participants
CREATE POLICY "Authenticated users can view all participants"
  ON public.staff_chat_participants FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can add participants"
  ON public.staff_chat_participants FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update participants"
  ON public.staff_chat_participants FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Users can remove themselves from rooms"
  ON public.staff_chat_participants FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for staff_chat_messages
CREATE POLICY "Authenticated users can view messages in their rooms"
  ON public.staff_chat_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_chat_participants
      WHERE staff_chat_participants.room_id = staff_chat_messages.room_id
      AND staff_chat_participants.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.staff_chat_rooms
      WHERE staff_chat_rooms.id = staff_chat_messages.room_id
      AND staff_chat_rooms.room_type = 'broadcast'
    )
  );

CREATE POLICY "Authenticated users can send messages to their rooms"
  ON public.staff_chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = sender_id AND (
      EXISTS (
        SELECT 1 FROM public.staff_chat_participants
        WHERE staff_chat_participants.room_id = staff_chat_messages.room_id
        AND staff_chat_participants.user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.staff_chat_rooms
        WHERE staff_chat_rooms.id = staff_chat_messages.room_id
        AND staff_chat_rooms.room_type = 'broadcast'
      )
    )
  );

CREATE POLICY "Users can update their own messages"
  ON public.staff_chat_messages FOR UPDATE
  TO authenticated
  USING (auth.uid() = sender_id);

CREATE POLICY "Users can delete their own messages"
  ON public.staff_chat_messages FOR DELETE
  TO authenticated
  USING (auth.uid() = sender_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_staff_chat_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at columns
CREATE TRIGGER update_staff_chat_rooms_updated_at
  BEFORE UPDATE ON public.staff_chat_rooms
  FOR EACH ROW
  EXECUTE FUNCTION public.update_staff_chat_updated_at();

CREATE TRIGGER update_staff_chat_messages_updated_at
  BEFORE UPDATE ON public.staff_chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_staff_chat_updated_at();

-- Enable realtime for staff chat tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.staff_chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.staff_chat_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.staff_chat_rooms;

-- Create a default company-wide broadcast room
INSERT INTO public.staff_chat_rooms (room_type, room_name)
VALUES ('broadcast', 'Company Wide - IT Support');

-- Function to get or create a direct message room between two users
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
    SELECT COUNT(*) FROM public.staff_chat_participants
    WHERE room_id = scr.id
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
$$ LANGUAGE plpgsql SECURITY DEFINER;
