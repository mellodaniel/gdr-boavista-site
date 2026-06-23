import { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';

function isTournamentManagerUser(email?: string | null) {
  if (!email) return false;

  const normalizedEmail = email.trim().toLowerCase();
  const username = normalizedEmail.split('@')[0];

  return username === 'torneios';
}

function isTournamentManagerAllowedPath(pathname: string) {
  return pathname === '/admin/gestor-torneios' || pathname.startsWith('/admin/gestor-torneios/');
}

export function ProtectedAdminRoute() {
  const location = useLocation();

  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadSession() {
      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession();

      if (isMounted) {
        setSession(currentSession);
        setIsLoading(false);
      }
    }

    loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      if (isMounted) {
        setSession(currentSession);
        setIsLoading(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-white">
        <div className="rounded-3xl border border-white/10 bg-white/[0.06] px-8 py-6 text-center shadow-2xl">
          <p className="text-sm font-bold uppercase tracking-[0.3em] text-red-500">
            GDR Boavista
          </p>
          <p className="mt-3 text-lg font-black">A validar acesso...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/admin/login" replace />;
  }

  if (isTournamentManagerUser(session.user.email)) {
    if (!isTournamentManagerAllowedPath(location.pathname)) {
      return <Navigate to="/admin/gestor-torneios" replace />;
    }
  }

  return <Outlet />;
}
