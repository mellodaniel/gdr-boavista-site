import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Lock, ShieldCheck } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const ADMIN_EMAIL_DOMAIN = 'gdrboavista.local';
const TOURNAMENT_MANAGER_USERNAME = 'torneios';
const TOURNAMENT_MANAGER_HOME = '/admin/gestor-torneios';
const ADMIN_HOME = '/admin';

type ResultAccess = {
  tournament_id: string;
};

function buildAdminEmail(username: string) {
  const cleanUsername = username.trim().toLowerCase();

  if (cleanUsername.includes('@')) {
    return cleanUsername;
  }

  return `${cleanUsername}@${ADMIN_EMAIL_DOMAIN}`;
}

function getUsernameFromEmail(email?: string | null) {
  if (!email) return '';
  return email.trim().toLowerCase().split('@')[0];
}

function isTournamentManagerUsername(usernameOrEmail: string) {
  const username = usernameOrEmail.includes('@')
    ? getUsernameFromEmail(usernameOrEmail)
    : usernameOrEmail.trim().toLowerCase();

  return username === TOURNAMENT_MANAGER_USERNAME;
}

async function getResultsAccessPath(email?: string | null) {
  if (!email || isTournamentManagerUsername(email)) return null;

  const normalizedEmail = email.trim().toLowerCase();

  const { data, error } = await supabase
    .from('tournament_result_access')
    .select('tournament_id')
    .eq('user_email', normalizedEmail)
    .eq('is_active', true)
    .limit(1);

  if (error || !data || data.length === 0) return null;

  const access = data[0] as ResultAccess;
  return `/admin/resultados-torneio/${access.tournament_id}`;
}

async function getRedirectPathForEmail(email?: string | null) {
  const resultsPath = await getResultsAccessPath(email);
  if (resultsPath) return resultsPath;

  return isTournamentManagerUsername(email ?? '') ? TOURNAMENT_MANAGER_HOME : ADMIN_HOME;
}

export function AdminLoginPage() {
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [sessionRedirectPath, setSessionRedirectPath] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function checkSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        if (isMounted) {
          setSessionRedirectPath(null);
          setIsLoadingSession(false);
        }
        return;
      }

      const redirectPath = await getRedirectPathForEmail(session.user.email);

      if (isMounted) {
        setSessionRedirectPath(redirectPath);
        setIsLoadingSession(false);
      }
    }

    checkSession();

    return () => {
      isMounted = false;
    };
  }, []);

  const helperText = useMemo(() => {
    return 'Usa admin, torneios ou o utilizador de resultados fornecido pela organização.';
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setErrorMessage('');

    if (!username.trim() || !password.trim()) {
      setErrorMessage('Indica o utilizador e a palavra-passe.');
      return;
    }

    setIsSubmitting(true);

    const email = buildAdminEmail(username);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('Erro no login admin:', error);
      setIsSubmitting(false);
      setErrorMessage('Utilizador ou palavra-passe inválidos.');
      return;
    }

    const redirectPath = await getRedirectPathForEmail(email);

    setIsSubmitting(false);
    navigate(redirectPath, { replace: true });
  }

  if (isLoadingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f6f2ec]">
        <div className="rounded-sm border border-zinc-200 bg-white px-8 py-6 shadow-xl">
          <p className="text-sm font-bold uppercase tracking-[0.35em] text-red-700">
            GDR Boavista
          </p>
          <p className="mt-3 font-serif text-3xl font-light text-[#24180f]">
            A validar acesso...
          </p>
        </div>
      </div>
    );
  }

  if (sessionRedirectPath) {
    return <Navigate to={sessionRedirectPath} replace />;
  }

  return (
    <div className="min-h-screen bg-[#f6f2ec] text-zinc-950">
      <div className="grid min-h-screen lg:grid-cols-[0.95fr_1.05fr]">
        <section className="relative hidden overflow-hidden bg-[#24180f] text-white lg:block">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(220,38,38,0.32),transparent_34%),linear-gradient(135deg,#24180f,#09090b)]" />

          <img
            src="/hero-boavista.webp"
            alt="GDR Boavista"
            className="absolute inset-0 h-full w-full object-cover opacity-35"
          />

          <div className="absolute inset-0 bg-gradient-to-r from-[#24180f] via-[#24180f]/85 to-black/40" />

          <div className="relative flex min-h-screen flex-col justify-between p-16">
            <div className="flex items-center gap-4">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white p-3 shadow-2xl">
                <img
                  src="/logo-gdr-boavista-header-256.png"
                  alt="GDR Boavista"
                  className="h-full w-full object-contain"
                />
              </div>

              <div>
                <p className="text-3xl font-black uppercase">GDR Boavista</p>
              </div>
            </div>

            <div>
              <p className="text-sm font-bold uppercase tracking-[0.45em] text-red-400">
                Administração
              </p>

              <h1 className="mt-8 font-serif text-7xl font-light leading-[0.95]">
                Gestão simples,
                <br />
                organizada e segura.
              </h1>

              <p className="mt-8 max-w-xl text-lg leading-8 text-zinc-300">
                Área reservada para gestão de conteúdos, torneios e lançamento
                de resultados do GDR Boavista.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-8 border-t border-white/10 pt-8">
              <div>
                <p className="font-serif text-4xl">Admin</p>
                <p className="mt-1 text-xs font-bold uppercase tracking-[0.2em] text-zinc-400">
                  Acesso
                </p>
              </div>

              <div>
                <p className="font-serif text-4xl">Torneios</p>
                <p className="mt-1 text-xs font-bold uppercase tracking-[0.2em] text-zinc-400">
                  Gestão
                </p>
              </div>

              <div>
                <p className="font-serif text-4xl">Resultados</p>
                <p className="mt-1 text-xs font-bold uppercase tracking-[0.2em] text-zinc-400">
                  Atualização
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="flex min-h-screen items-center justify-center px-4 py-12">
          <div className="w-full max-w-md">
            <div className="mb-10 flex items-center gap-4 lg:hidden">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white p-2 shadow-sm ring-1 ring-zinc-200">
                <img
                  src="/logo-gdr-boavista-header-256.png"
                  alt="GDR Boavista"
                  className="h-full w-full object-contain"
                />
              </div>

              <p className="text-xl font-black uppercase text-[#24180f]">
                GDR Boavista
              </p>
            </div>

            <div className="rounded-sm border border-zinc-200 bg-white p-8 shadow-2xl shadow-zinc-950/10">
              <div className="mb-8">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-700">
                  <ShieldCheck size={26} />
                </div>

                <p className="mt-6 text-sm font-bold uppercase tracking-[0.35em] text-red-700">
                  Administração
                </p>

                <h2 className="mt-4 font-serif text-5xl font-light text-[#24180f]">
                  Entrar.
                </h2>

                <p className="mt-3 text-sm leading-7 text-zinc-500">
                  {helperText}
                </p>
              </div>

              {errorMessage && (
                <div className="mb-6 rounded-sm border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">
                  {errorMessage}
                </div>
              )}

              <form onSubmit={handleSubmit} className="grid gap-5">
                <div>
                  <label className="text-sm font-black text-zinc-800">
                    Utilizador
                  </label>

                  <input
                    type="text"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    placeholder="admin, torneios ou resultados"
                    className="mt-2 w-full rounded-md border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-red-700 focus:ring-4 focus:ring-red-100"
                  />
                </div>

                <div>
                  <label className="text-sm font-black text-zinc-800">
                    Palavra-passe
                  </label>

                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="••••••••"
                    className="mt-2 w-full rounded-md border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-red-700 focus:ring-4 focus:ring-red-100"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="mt-2 inline-flex items-center justify-center gap-2 rounded-md bg-red-700 px-6 py-4 text-sm font-black uppercase tracking-wide text-white transition hover:bg-[#24180f] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Lock size={17} />
                  {isSubmitting ? 'A entrar...' : 'Entrar no admin'}
                </button>
              </form>
            </div>

            <p className="mt-6 text-center text-xs font-semibold text-zinc-500">
              © {new Date().getFullYear()} GDR Boavista
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
