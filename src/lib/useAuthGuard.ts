'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

// Same Supabase project/users as the website admin panel — logging in here
// uses the exact same email/password as leschi-axiwmatikon-website/admin.
export function useAuthGuard() {
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }
      setAuthenticated(true);
      setLoading(false);
    }
    checkAuth();
  }, [router]);

  return { authenticated, loading };
}
