import { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';

const TOURNAMENT_MANAGER_USERNAME = 'torneios';
const TOURNAMENT_MANAGER_HOME = '/admin/gestor-torneios';
const RESULTS_HOME_PREFIX = '/admin/resultados-torneio';

type ResultAccess = {
  tournament_id: string;
};

function getUsernameFromEmail(email?: string | null) {
  if (!email) return '';
  return email.trim().toLowerCase().split('@')[0];
}

function isTournamentManagerUser(email?: string | null) {
  return getUsernameFromEmail(email) === TOURNAMENT_MANAGER_USERNAME;
}

function isTournamentManagerAllowedPath(pathname: string) {
  return pathname === TOURNAMENT_MANAGER_HOME || pathname.startsWith(`${TOURNAMENT_MANAGER_HOME}/`);
}

function getResultsPath(tournamentId: string) {
  return `${RESULTS_HOME_PREFIX}/${tournamentId}`;
}

function isResultsAllowedPath(pathname: string, tournamentId: string) {
  return pathname === getResultsPath(tournamentId);
}

export function ProtectedAdminRoute() {
  const location = useLocation();

  const [session, setSession] = useState<Session | null>(null);
  const [resultAccess, setResultAccess] = useState<ResultAccess | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadSessionAndAccess(currentSession: Session | null) {
      if (!currentSession) {
        if (isMounted) {
          setSession(null);
          setResultAccess(null);
          setIsLoading(false);
        }
        return;
      }

      const email = currentSession.user.email?.trim().toLowerCase() ?? '';
      let access: ResultAccess | null = null;

      if (email && !isTournamentManagerUser(email)) {
        const { data, error } = await supabase
          .from('tournament_result_access')
          .select('tournament_id')
          .eq('user_email', email)
          .eq('is_active', true)
          .limit(1);

        if (!error && data && data.length > 0) {
          access = data[0] as ResultAccess;
        }
      }

      if (isMounted) {
        setSession(currentSession);
        setResultAccess(access);
        setIsLoading(false);
      }
    }

    async function loadInitialSession() {
      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession();

      await loadSessionAndAccess(currentSession);
    }

    loadInitialSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setIsLoading(true);
      void loadSessionAndAccess(currentSession);
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

  if (resultAccess) {
    const targetPath = getResultsPath(resultAccess.tournament_id);

    if (!isResultsAllowedPath(location.pathname, resultAccess.tournament_id)) {
      return <Navigate to={targetPath} replace />;
    }
  }

  if (!resultAccess && isTournamentManagerUser(session.user.email)) {
    if (!isTournamentManagerAllowedPath(location.pathname)) {
      return <Navigate to={TOURNAMENT_MANAGER_HOME} replace />;
    }
  }

  return <Outlet />;
}
