-- Fix staff chat messages sender relationship to reference profiles instead of auth.users
-- This allows proper joins with the profiles table in queries

-- First, drop the existing foreign key constraint that references auth.users
ALTER TABLE public.staff_chat_messages 
  DROP CONSTRAINT IF EXISTS staff_chat_messages_sender_id_fkey;

-- Add a new foreign key constraint that references profiles.user_id
-- This matches the application's expectation of joining with profiles table
ALTER TABLE public.staff_chat_messages 
  ADD CONSTRAINT staff_chat_messages_sender_id_fkey 
  FOREIGN KEY (sender_id) 
  REFERENCES public.profiles(user_id) 
  ON DELETE CASCADE;
