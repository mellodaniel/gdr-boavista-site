import { useState } from 'react';
import type { FormEvent } from 'react';
import { supabase } from '../../lib/supabase';

export function MembersPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [nif, setNif] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSuccessMessage('');
    setErrorMessage('');

    if (!fullName.trim()) {
      setErrorMessage('Indica o nome completo.');
      return;
    }

    setIsSubmitting(true);

    const { error } = await supabase.from('gdrb_member_requests').insert({
      full_name: fullName.trim(),
      email: email.trim() || null,
      phone: phone.trim() || null,
      nif: nif.trim() || null,
      notes: notes.trim() || null,
    });

    setIsSubmitting(false);

    if (error) {
      console.error('Erro ao enviar pedido de sócio:', error);
      setErrorMessage('Não foi possível enviar o pedido. Tenta novamente.');
      return;
    }

    setFullName('');
    setEmail('');
    setPhone('');
    setNif('');
    setNotes('');
    setSuccessMessage('Pedido enviado com sucesso. O clube irá entrar em contacto.');
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-16">
      <p className="text-sm font-bold uppercase tracking-[0.25em] text-red-600">
        Sócios
      </p>

      <h1 className="mt-3 text-4xl font-black">Faz parte da família Boavista</h1>

      <p className="mt-4 max-w-3xl text-zinc-600">
        Apoia o clube, acompanha as equipas e ajuda-nos a crescer. Preenche o
        formulário para demonstrar interesse em ser sócio ou atualizar os teus
        dados.
      </p>

      <div className="mt-10 grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="rounded-3xl bg-red-600 p-8 text-white">
          <h2 className="text-2xl font-black">Contactos dos sócios</h2>

          <div className="mt-5 space-y-3 text-red-50">
            <p>Email: socios.gdrboavista@gmail.com</p>
            <p>Contacto: 913 030 249 / 912 242 196</p>
          </div>

          <div className="mt-8 rounded-2xl bg-white/10 p-5">
            <p className="text-sm">
              Após o envio do formulário, o pedido fica registado na área
              administrativa do website para acompanhamento pela equipa do clube.
            </p>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm"
        >
          <h2 className="text-2xl font-black">Pedido de novo sócio</h2>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <input
              className="rounded-xl border border-zinc-300 px-4 py-3"
              placeholder="Nome completo *"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
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
              placeholder="Telefone"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
            />

            <input
              className="rounded-xl border border-zinc-300 px-4 py-3"
              placeholder="NIF"
              value={nif}
              onChange={(event) => setNif(event.target.value)}
            />
          </div>

          <textarea
            className="mt-4 min-h-32 w-full rounded-xl border border-zinc-300 px-4 py-3"
            placeholder="Observações"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />

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
            {isSubmitting ? 'A enviar...' : 'Enviar pedido'}
          </button>
        </form>
      </div>
    </section>
  );
}