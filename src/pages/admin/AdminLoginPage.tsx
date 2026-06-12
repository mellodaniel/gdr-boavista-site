import { Link } from 'react-router-dom';

export function AdminLoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl">
        <p className="text-sm font-bold uppercase tracking-[0.25em] text-red-600">
          GDR Boavista
        </p>

        <h1 className="mt-3 text-3xl font-black">Área administrativa</h1>

        <p className="mt-3 text-sm text-zinc-600">
          Login reservado aos administradores do website.
        </p>

        <form className="mt-8 space-y-4">
          <input
            className="w-full rounded-xl border border-zinc-300 px-4 py-3"
            placeholder="Email"
            type="email"
          />

          <input
            className="w-full rounded-xl border border-zinc-300 px-4 py-3"
            placeholder="Palavra-passe"
            type="password"
          />

          <Link
            to="/admin"
            className="block w-full rounded-full bg-red-600 px-6 py-3 text-center font-bold text-white hover:bg-red-700"
          >
            Entrar
          </Link>
        </form>

        <Link
          to="/"
          className="mt-6 block text-center text-sm font-semibold text-zinc-600 hover:text-red-600"
        >
          Voltar ao site
        </Link>
      </div>
    </div>
  );
}