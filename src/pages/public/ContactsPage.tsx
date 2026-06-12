import { useState } from 'react';
import type { FormEvent } from 'react';
import { supabase } from '../../lib/supabase';

export function ContactsPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSuccessMessage('');
    setErrorMessage('');

    if (!name.trim()) {
      setErrorMessage('Indica o teu nome.');
      return;
    }

    if (!message.trim()) {
      setErrorMessage('Escreve a tua mensagem.');
      return;
    }

    setIsSubmitting(true);

    const { error } = await supabase.from('gdrb_contact_requests').insert({
      name: name.trim(),
      email: email.trim() || null,
      subject: subject.trim() || null,
      message: message.trim(),
    });

    setIsSubmitting(false);

    if (error) {
      console.error('Erro ao enviar contacto:', error);
      setErrorMessage('Não foi possível enviar a mensagem. Tenta novamente.');
      return;
    }

    setName('');
    setEmail('');
    setSubject('');
    setMessage('');
    setSuccessMessage('Mensagem enviada com sucesso. O clube irá responder assim que possível.');
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-16">
      <p className="text-sm font-bold uppercase tracking-[0.25em] text-red-600">
        Contactos
      </p>

      <h1 className="mt-3 text-4xl font-black">Fala connosco</h1>

      <p className="mt-4 max-w-3xl text-zinc-600">
        Entra em contacto com o GDR Boavista para assuntos relacionados com
        sócios, atletas, formação, patrocínios ou informações gerais.
      </p>

      <div className="mt-10 grid gap-8 lg:grid-cols-2">
        <div className="rounded-3xl bg-zinc-950 p-8 text-white">
          <h2 className="text-2xl font-black">GDR Boavista</h2>

          <div className="mt-5 space-y-3 text-zinc-300">
            <p>Email sócios: socios.gdrboavista@gmail.com</p>
            <p>Contactos: 913 030 249 / 912 242 196</p>
            <p>Localidade: Leiria</p>
          </div>

          <div className="mt-8 rounded-2xl bg-white/10 p-5">
            <p className="text-sm text-zinc-300">
              As mensagens enviadas por este formulário ficam registadas na área
              administrativa para acompanhamento pelo clube.
            </p>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm"
        >
          <h2 className="text-2xl font-black">Enviar mensagem</h2>

          <div className="mt-6 grid gap-4">
            <input
              className="rounded-xl border border-zinc-300 px-4 py-3"
              placeholder="Nome *"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />

            <input
              className="rounded-xl border border-zinc-300 px-4 py-3"
              placeholder="Email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />

            <input
              className="rounded-xl border border-zinc-300 px-4 py-3"
              placeholder="Assunto"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
            />

            <textarea
              className="min-h-32 rounded-xl border border-zinc-300 px-4 py-3"
              placeholder="Mensagem *"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
            />
          </div>

          {successMessage && (
            <div className="mt-4 rounded-xl bg-green-100 px-4 py-3 text-sm font-semibold text-green-800">
              {successMessage}
            </div>
          )}

          {errorMessage && (
            <div className="mt-4 rounded-xl bg-red-100 px-4 py-3 text-sm font-semibold text-red-800">
              {errorMessage}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-4 rounded-full bg-zinc-950 px-6 py-3 font-bold text-white hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? 'A enviar...' : 'Enviar contacto'}
          </button>
        </form>
      </div>
    </section>
  );
}