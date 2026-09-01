import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CheckCircle2, ChevronLeft, MailX } from 'lucide-react';

export function NewsletterUnsubscribePage() {
  const { token } = useParams<{ token: string }>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  async function handleUnsubscribe() {
    setSuccessMessage('');
    setErrorMessage('');

    if (!token) {
      setErrorMessage('Link de cancelamento inválido.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/unsubscribe-newsletter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          reason: 'Cancelamento pelo link público da newsletter',
        }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result?.error || 'Não foi possível cancelar a subscrição.');
      }

      setSuccessMessage('A subscrição foi cancelada com sucesso. Não receberás novas comunicações da newsletter.');
    } catch (error) {
      console.error('Erro ao cancelar subscrição:', error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Não foi possível cancelar a subscrição. Tenta novamente.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="gdrb-public-page bg-[#f6f2ec] text-zinc-950">
      <section className="relative overflow-hidden bg-[#24180f] py-14 md:py-24 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_right,rgba(220,38,38,0.28),transparent_34%)]" />

        <div className="relative mx-auto max-w-4xl px-5 md:px-4 text-center">
          <p className="text-sm font-bold uppercase tracking-[0.45em] text-red-400">
            Newsletter
          </p>

          <h1 className="mt-8 font-serif text-4xl font-light leading-tight tracking-tight md:text-7xl">
            Cancelar subscrição.
          </h1>

          <p className="mx-auto mt-8 max-w-2xl text-lg leading-8 text-zinc-300">
            Podes deixar de receber comunicações do GDR Boavista a qualquer momento.
          </p>
        </div>
      </section>

      <section className="py-14 md:py-24">
        <div className="mx-auto max-w-2xl px-5 md:px-4">
          <div className="rounded-2xl md:rounded-[1.35rem] border border-zinc-200 bg-white p-6 text-center shadow-lg md:shadow-2xl shadow-zinc-950/10 md:p-12">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-red-700">
              <MailX size={30} />
            </div>

            <h2 className="mt-8 font-serif text-4xl font-light text-[#24180f]">
              Queres cancelar a newsletter?
            </h2>

            <p className="mt-4 text-sm leading-7 text-zinc-500">
              Ao confirmar, o teu email será marcado como inativo e deixará de receber newsletters e comunicações em lote do clube.
            </p>

            {successMessage && (
              <div className="mt-7 flex items-start gap-3 rounded-2xl md:rounded-[1.35rem] border border-green-200 bg-green-50 p-4 text-left text-sm font-semibold text-green-800">
                <CheckCircle2 size={20} />
                <span>{successMessage}</span>
              </div>
            )}

            {errorMessage && (
              <div className="mt-7 rounded-2xl md:rounded-[1.35rem] border border-red-200 bg-red-50 p-4 text-left text-sm font-semibold text-red-800">
                {errorMessage}
              </div>
            )}

            {!successMessage && (
              <button
                type="button"
                onClick={handleUnsubscribe}
                disabled={isSubmitting}
                className="mt-8 inline-flex items-center justify-center rounded-md bg-red-700 px-6 py-4 text-sm font-black uppercase tracking-wide text-white transition hover:bg-[#24180f] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? 'A cancelar...' : 'Cancelar subscrição'}
              </button>
            )}

            <div className="mt-8">
              <Link
                to="/"
                className="inline-flex items-center gap-2 text-sm font-black uppercase tracking-wide text-red-700 transition hover:text-[#24180f]"
              >
                <ChevronLeft size={16} />
                Voltar ao site
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
