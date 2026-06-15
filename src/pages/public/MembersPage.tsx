import { useState } from 'react';
import type { FormEvent } from 'react';
import { CheckCircle2, HeartHandshake, Mail, Phone, ShieldCheck, Users } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const initialForm = {
  full_name: '',
  email: '',
  phone: '',
  nif: '',
  notes: '',
};

const reasons = [
  {
    icon: HeartHandshake,
    title: 'Apoiar o clube',
    description:
      'O apoio dos sócios ajuda o GDR Boavista a crescer dentro e fora de campo.',
  },
  {
    icon: Users,
    title: 'Fazer parte da família',
    description:
      'Ser sócio é estar mais perto dos atletas, equipas, famílias e comunidade.',
  },
  {
    icon: ShieldCheck,
    title: 'Valorizar a formação',
    description:
      'Contribuis para dar melhores condições aos jovens atletas do clube.',
  },
];

export function MembersPage() {
  const [form, setForm] = useState(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  function handleChange(field: keyof typeof initialForm, value: string) {
    setForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSuccessMessage('');
    setErrorMessage('');

    if (!form.full_name.trim()) {
      setErrorMessage('Indica pelo menos o nome completo.');
      return;
    }

    if (!form.email.trim() && !form.phone.trim()) {
      setErrorMessage('Indica pelo menos um contacto: email ou telefone.');
      return;
    }

    setIsSubmitting(true);

    const { error } = await supabase.from('gdrb_member_requests').insert({
      full_name: form.full_name.trim(),
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      nif: form.nif.trim() || null,
      notes: form.notes.trim() || null,
      status: 'novo',
    });

    setIsSubmitting(false);

    if (error) {
      console.error('Erro ao enviar pedido de sócio:', error);
      setErrorMessage('Não foi possível enviar o pedido. Tenta novamente.');
      return;
    }

    setSuccessMessage(
      'Pedido enviado com sucesso. O GDR Boavista irá entrar em contacto brevemente.',
    );
    setForm(initialForm);
  }

  return (
    <div className="bg-[#f6f2ec] text-zinc-950">
      <section className="relative overflow-hidden bg-[#24180f] py-24 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_right,rgba(220,38,38,0.28),transparent_34%)]" />

        <div className="relative mx-auto max-w-7xl px-4">
          <div className="max-w-4xl">
            <p className="text-sm font-bold uppercase tracking-[0.45em] text-red-400">
              Sócios
            </p>

            <h1 className="mt-8 font-serif text-6xl font-light leading-[0.95] tracking-tight md:text-8xl">
              Faz parte da
              <br />
              família Boavista.
            </h1>

            <p className="mt-8 max-w-2xl text-lg leading-8 text-zinc-300">
              Apoia o clube, acompanha as equipas e ajuda-nos a continuar a
              crescer. O Boavista é feito por todos.
            </p>
          </div>
        </div>
      </section>

      <section className="py-24">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.45em] text-red-700">
              Apoiar o clube
            </p>

            <h2 className="mt-6 font-serif text-5xl font-light leading-tight text-[#24180f] md:text-6xl">
              Ser sócio é estar mais perto do clube.
            </h2>

            <p className="mt-6 text-base leading-8 text-zinc-600">
              O apoio dos sócios é essencial para fortalecer a formação, apoiar
              as equipas, melhorar as condições e manter viva a ligação entre o
              GDR Boavista e a comunidade.
            </p>

            <div className="mt-10 grid gap-4">
              {reasons.map((item) => {
                const Icon = item.icon;

                return (
                  <article
                    key={item.title}
                    className="rounded-sm border border-zinc-200 bg-white p-6"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-700">
                        <Icon size={23} />
                      </div>

                      <div>
                        <h3 className="font-serif text-2xl font-light text-[#24180f]">
                          {item.title}
                        </h3>

                        <p className="mt-2 text-sm leading-7 text-zinc-600">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="mt-8 rounded-sm bg-[#24180f] p-7 text-white">
              <h3 className="font-serif text-3xl font-light">
                Contactos de sócios
              </h3>

              <div className="mt-5 grid gap-3 text-sm text-zinc-300">
                <a
                  href="mailto:socios.gdrboavista@gmail.com"
                  className="flex items-center gap-3 hover:text-red-400"
                >
                  <Mail size={17} />
                  socios.gdrboavista@gmail.com
                </a>

                <a
                  href="tel:+351913030249"
                  className="flex items-center gap-3 hover:text-red-400"
                >
                  <Phone size={17} />
                  913 030 249 / 912 242 196
                </a>
              </div>
            </div>
          </div>

          <form
            onSubmit={handleSubmit}
            className="rounded-sm border border-zinc-200 bg-white p-7 shadow-2xl shadow-zinc-950/10"
          >
            <div>
              <h2 className="font-serif text-4xl font-light text-[#24180f]">
                Pedido de sócio
              </h2>

              <p className="mt-3 text-sm leading-7 text-zinc-500">
                Preenche os dados e a equipa do GDR Boavista entrará em contacto
                para dar seguimento ao pedido.
              </p>
            </div>

            {successMessage && (
              <div className="mt-6 flex items-start gap-3 rounded-sm border border-green-200 bg-green-50 p-4 text-sm font-semibold text-green-800">
                <CheckCircle2 size={20} />
                {successMessage}
              </div>
            )}

            {errorMessage && (
              <div className="mt-6 rounded-sm border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">
                {errorMessage}
              </div>
            )}

            <div className="mt-7 grid gap-5">
              <div>
                <label className="text-sm font-black text-zinc-800">
                  Nome completo *
                </label>

                <input
                  type="text"
                  value={form.full_name}
                  onChange={(event) =>
                    handleChange('full_name', event.target.value)
                  }
                  placeholder="O seu nome"
                  className="mt-2 w-full rounded-md border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-red-700 focus:ring-4 focus:ring-red-100"
                />
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label className="text-sm font-black text-zinc-800">
                    Email
                  </label>

                  <input
                    type="email"
                    value={form.email}
                    onChange={(event) =>
                      handleChange('email', event.target.value)
                    }
                    placeholder="email@exemplo.pt"
                    className="mt-2 w-full rounded-md border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-red-700 focus:ring-4 focus:ring-red-100"
                  />
                </div>

                <div>
                  <label className="text-sm font-black text-zinc-800">
                    Telefone
                  </label>

                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(event) =>
                      handleChange('phone', event.target.value)
                    }
                    placeholder="+351 000 000 000"
                    className="mt-2 w-full rounded-md border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-red-700 focus:ring-4 focus:ring-red-100"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-black text-zinc-800">NIF</label>

                <input
                  type="text"
                  value={form.nif}
                  onChange={(event) => handleChange('nif', event.target.value)}
                  placeholder="Opcional"
                  className="mt-2 w-full rounded-md border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-red-700 focus:ring-4 focus:ring-red-100"
                />
              </div>

              <div>
                <label className="text-sm font-black text-zinc-800">
                  Mensagem
                </label>

                <textarea
                  value={form.notes}
                  onChange={(event) => handleChange('notes', event.target.value)}
                  rows={5}
                  placeholder="Pode deixar alguma observação adicional..."
                  className="mt-2 w-full rounded-md border border-zinc-200 px-4 py-3 text-sm leading-7 outline-none focus:border-red-700 focus:ring-4 focus:ring-red-100"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-7 w-full rounded-md bg-red-700 px-6 py-4 text-sm font-black uppercase tracking-wide text-white transition hover:bg-[#24180f] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? 'A enviar...' : 'Enviar pedido de sócio'}
            </button>

            <p className="mt-4 text-xs leading-6 text-zinc-500">
              Ao enviar este formulário, os dados serão usados apenas para
              contacto relacionado com o pedido de sócio.
            </p>
          </form>
        </div>
      </section>
    </div>
  );
}