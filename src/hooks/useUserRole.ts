import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

/** True when the user has role `admin` in `public.user_roles`. */
export async function fetchUserIsAdmin(userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .eq('role', 'admin')
    .maybeSingle();
  return !!data;
}

export const useUserRole = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const checkRole = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      setUserId(user.id);
      const admin = await fetchUserIsAdmin(user.id);
      setIsAdmin(admin);
    } catch (err) {
      console.error('Error checking role:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkRole();
  }, []);

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel('user-role-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_roles',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          checkRole();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return { isAdmin, loading };
};
