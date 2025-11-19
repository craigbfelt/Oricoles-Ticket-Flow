import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

export interface UserProfile {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  device_serial_number?: string;
  branch_id?: string;
}

/**
 * Custom hook to fetch and manage user profile
 * Automatically creates a profile if it doesn't exist
 * Redirects to auth page if user is not authenticated
 */
export const useUserProfile = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) throw sessionError;
      
      if (!session) {
        navigate('/auth');
        return;
      }

      const userId = session.user.id;

      // Try to fetch existing profile
      const { data, error: profileError } = await supabase
        .from('profiles')
        .select('id, user_id, email, full_name, device_serial_number, branch_id')
        .eq('user_id', userId)
        .single();

      // If profile exists, set it
      if (data) {
        setProfile(data as UserProfile);
        setLoading(false);
        return;
      }

      // If profile doesn't exist (PGRST116 = no rows returned), create it
      if (profileError && profileError.code === 'PGRST116') {
        console.log('Profile not found, creating profile for user:', userId);
        
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            user_id: userId,
            email: session.user.email,
            full_name: session.user.user_metadata?.full_name || '',
          });

        if (insertError) {
          throw new Error(`Failed to create profile: ${insertError.message}`);
        }

        // Retry fetching the profile
        const { data: newData, error: retryError } = await supabase
          .from('profiles')
          .select('id, user_id, email, full_name, device_serial_number, branch_id')
          .eq('user_id', userId)
          .single();

        if (retryError) {
          throw new Error(`Failed to fetch newly created profile: ${retryError.message}`);
        }

        setProfile(newData as UserProfile);
        toast({
          title: 'Profile Created',
          description: 'Your profile has been set up successfully.',
        });
      } else if (profileError) {
        throw new Error(`Profile fetch error: ${profileError.message}`);
      }
    } catch (err) {
      const error = err as Error;
      console.error('Error in useUserProfile:', error);
      setError(error);
      toast({
        title: 'Profile Error',
        description: error.message || 'Unable to load user profile. Please try refreshing the page.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const refreshProfile = () => {
    fetchProfile();
  };

  return {
    profile,
    loading,
    error,
    refreshProfile,
  };
};
