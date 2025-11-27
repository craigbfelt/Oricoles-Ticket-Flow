-- Fix: Add search_path protection to import_system_users_from_staff function
-- This addresses SUPA_function_search_path_mutable warning
ALTER FUNCTION public.import_system_users_from_staff(uuid[]) 
SET search_path = public;