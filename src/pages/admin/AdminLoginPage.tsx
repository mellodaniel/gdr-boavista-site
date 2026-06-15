import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, LogIn, User } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const ADMIN_EMAIL_DOMAIN = 'gdrboavista.local';

function buildAdminEmail(username: string) {
  const cleanUsername = username.trim().toLowerCase();

  if (cleanUsername.includes('@')) {
    return cleanUsername;
  }

  return `${cleanUsername}@${ADMIN_EMAIL_DOMAIN}`;
}

export function AdminLoginPage() {
  const navigate = useNavigate();

  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    async function checkSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        navigate('/admin', { replace: true });
      }
    }

    checkSession();
  }, [navigate]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setErrorMessage('');

    if (!username.trim() || !password.trim()) {
      setErrorMessage('Preenche o utilizador e a password.');
      return;
    }

    setIsSubmitting(true);

    const email = buildAdminEmail(username);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setIsSubmitting(false);

    if (error) {
      setErrorMessage(
        'Utilizador ou password inválidos. Confirma os dados e tenta novamente.',
      );
      return;
    }

    navigate('/admin', { replace: true });
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-zinc-950 px-4 py-10 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(220,38,38,0.28),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(220,38,38,0.18),transparent_34%)]" />

      <div className="absolute inset-0 opacity-[0.045] [background-image:linear-gradient(rgba(255,255,255,0.18)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.18)_1px,transparent_1px)] [background-size:64px_64px]" />

      <div className="relative w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-3xl bg-white p-3 shadow-2xl">
            <img
              src="/logo-gdr-boavista-header-256.png"
              alt="GDR Boavista"
              className="h-full w-full object-contain"
            />
          </div>

          <h1 className="mt-6 text-3xl font-black uppercase">
            Área Administrativa
          </h1>

          <p className="mt-2 text-sm text-zinc-400">
            Acesso reservado à gestão do site do GDR Boavista.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 shadow-2xl backdrop-blur"
        >
          <div>
            <label className="text-sm font-bold text-zinc-200">
              Utilizador
            </label>

            <div className="mt-2 flex items-center gap-3 rounded-2xl border border-white/10 bg-black/30 px-4 py-3">
              <User size={18} className="text-red-500" />

              <input
                type="text"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                className="w-full bg-transparent text-white outline-none placeholder:text-zinc-500"
                placeholder="admin"
                autoComplete="username"
              />
            </div>
          </div>

          <div className="mt-5">
            <label className="text-sm font-bold text-zinc-200">Password</label>

            <div className="mt-2 flex items-center gap-3 rounded-2xl border border-white/10 bg-black/30 px-4 py-3">
              <Lock size={18} className="text-red-500" />

              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full bg-transparent text-white outline-none placeholder:text-zinc-500"
                placeholder="A tua password"
                autoComplete="current-password"
              />
            </div>
          </div>

          {errorMessage && (
            <div className="mt-5 rounded-2xl border border-red-500/30 bg-red-600/15 px-4 py-3 text-sm font-semibold text-red-100">
              {errorMessage}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-red-600 px-5 py-4 font-black uppercase tracking-wide text-white shadow-lg shadow-red-950/30 transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <LogIn size={18} />
            {isSubmitting ? 'A entrar...' : 'Entrar'}
          </button>

          <p className="mt-5 text-center text-xs text-zinc-500">
            Login por utilizador interno. Não é necessário inserir e-mail.
          </p>
        </form>
      </div>
    </div>
  );
}