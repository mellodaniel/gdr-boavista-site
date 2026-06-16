import { useState } from 'react';
import type { FormEvent } from 'react';
import {
  CheckCircle2,
  Clock,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

const googleMapsUrl =
  'https://www.google.com/maps/place/Campo+do+Grupo+Desportivo+e+Recreativo+da+Boavista/@39.780229,-8.7487878,17z/data=!3m1!4b1!4m6!3m5!1s0xd2271873a862cd7:0x575890ac1492b6a2!8m2!3d39.780229!4d-8.7462129!16s%2Fg%2F11bytx3sxs?entry=ttu&g_ep=EgoyMDI2MDYxMC4wIKXMDSoASAFQAw%3D%3D';

const initialForm = {
  name: '',
  email: '',
  subject: '',
  message: '',
};

const contactItems = [
  {
    icon: Phone,
    title: 'Telefone',
    description: '913 030 249 / 912 242 196',
    href: 'tel:+351913030249',
  },
  {
    icon: Mail,
    title: 'Email',
    description: 'socios.gdrboavista@gmail.com',
    href: 'mailto:socios.gdrboavista@gmail.com',
  },
  {
    icon: MessageCircle,
    title: 'Instagram',
    description: '@gdr_boavista_oficial',
    href: 'https://www.instagram.com/gdr_boavista_oficial/',
  },
  {
    icon: MessageCircle,
    title: 'Facebook',
    description: 'G.D.R. BoaVista',
    href: 'https://www.facebook.com/G.D.R.BoaVista',
  },
  {
    icon: MapPin,
    title: 'Localização',
    description: 'Campo do Grupo Desportivo e Recreativo da Boavista',
    href: googleMapsUrl,
  },
  {
    icon: Clock,
    title: 'Resposta',
    description: 'Responderemos assim que possível',
    href: null,
  },
];

export function ContactsPage() {
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

    if (!form.name.trim() || !form.message.trim()) {
      setErrorMessage('Preenche pelo menos o nome e a mensagem.');
      return;
    }

    setIsSubmitting(true);

    const { error } = await supabase.from('gdrb_contact_requests').insert({
      name: form.name.trim(),
      email: form.email.trim() || null,
      subject: form.subject.trim() || null,
      message: form.message.trim(),
      status: 'novo',
    });

    setIsSubmitting(false);

    if (error) {
      console.error('Erro ao enviar contacto:', error);
      setErrorMessage('Não foi possível enviar a mensagem. Tenta novamente.');
      return;
    }

    setSuccessMessage('Mensagem enviada com sucesso.');
    setForm(initialForm);
  }

  return (
    <div className="bg-[#f6f2ec] text-zinc-950">
      <section className="relative overflow-hidden bg-[#24180f] py-24 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_right,rgba(220,38,38,0.28),transparent_34%)]" />

        <div className="relative mx-auto max-w-7xl px-4">
          <div className="max-w-4xl">
            <p className="text-sm font-bold uppercase tracking-[0.45em] text-red-400">
              Contactos
            </p>

            <h1 className="mt-8 font-serif text-6xl font-light leading-[0.95] tracking-tight md:text-8xl">
              Fale connosco.
            </h1>

            <p className="mt-8 max-w-2xl text-lg leading-8 text-zinc-300">
              Entra em contacto com o GDR Boavista para assuntos relacionados
              com sócios, equipas, patrocinadores, jogos ou informações gerais.
            </p>
          </div>
        </div>
      </section>

      <section className="py-24">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
          <form
            onSubmit={handleSubmit}
            className="rounded-sm border border-zinc-200 bg-white p-7 shadow-2xl shadow-zinc-950/10"
          >
            <div>
              <h2 className="font-serif text-4xl font-light text-[#24180f]">
                Enviar mensagem
              </h2>

              <p className="mt-3 text-sm leading-7 text-zinc-500">
                Preenche o formulário e entraremos em contacto assim que
                possível.
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
                  Nome *
                </label>

                <input
                  type="text"
                  value={form.name}
                  onChange={(event) => handleChange('name', event.target.value)}
                  placeholder="O seu nome"
                  className="mt-2 w-full rounded-md border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-red-700 focus:ring-4 focus:ring-red-100"
                />
              </div>

              <div>
                <label className="text-sm font-black text-zinc-800">
                  Email
                </label>

                <input
                  type="email"
                  value={form.email}
                  onChange={(event) => handleChange('email', event.target.value)}
                  placeholder="email@exemplo.pt"
                  className="mt-2 w-full rounded-md border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-red-700 focus:ring-4 focus:ring-red-100"
                />
              </div>

              <div>
                <label className="text-sm font-black text-zinc-800">
                  Assunto
                </label>

                <input
                  type="text"
                  value={form.subject}
                  onChange={(event) =>
                    handleChange('subject', event.target.value)
                  }
                  placeholder="Assunto da mensagem"
                  className="mt-2 w-full rounded-md border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-red-700 focus:ring-4 focus:ring-red-100"
                />
              </div>

              <div>
                <label className="text-sm font-black text-zinc-800">
                  Mensagem *
                </label>

                <textarea
                  value={form.message}
                  onChange={(event) =>
                    handleChange('message', event.target.value)
                  }
                  rows={7}
                  placeholder="Escreva aqui a sua mensagem..."
                  className="mt-2 w-full rounded-md border border-zinc-200 px-4 py-3 text-sm leading-7 outline-none focus:border-red-700 focus:ring-4 focus:ring-red-100"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-7 w-full rounded-md bg-red-700 px-6 py-4 text-sm font-black uppercase tracking-wide text-white transition hover:bg-[#24180f] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? 'A enviar...' : 'Enviar mensagem'}
            </button>
          </form>

          <div>
            <p className="text-sm font-bold uppercase tracking-[0.45em] text-red-700">
              Informação
            </p>

            <h2 className="mt-6 font-serif text-5xl font-light leading-tight text-[#24180f] md:text-6xl">
              Outros contactos.
            </h2>

            <div className="mt-10 grid gap-4">
              {contactItems.map((item) => {
                const Icon = item.icon;

                const content = (
                  <div className="flex items-start gap-4 rounded-sm border border-zinc-200 bg-white p-6 transition hover:-translate-y-1 hover:shadow-xl">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-700">
                      <Icon size={22} />
                    </div>

                    <div>
                      <h3 className="font-bold text-[#24180f]">{item.title}</h3>

                      <p className="mt-1 text-sm leading-6 text-zinc-600">
                        {item.description}
                      </p>
                    </div>
                  </div>
                );

                if (item.href) {
                  return (
                    <a
                      key={item.title}
                      href={item.href}
                      target={
                        item.href.startsWith('http') ? '_blank' : undefined
                      }
                      rel={
                        item.href.startsWith('http') ? 'noreferrer' : undefined
                      }
                    >
                      {content}
                    </a>
                  );
                }

                return <div key={item.title}>{content}</div>;
              })}
            </div>

            <div className="mt-8 rounded-sm bg-[#24180f] p-7 text-white">
              <MessageCircle size={30} className="text-red-400" />

              <h3 className="mt-6 font-serif text-3xl font-light">
                Comunicação simples e próxima.
              </h3>

              <p className="mt-4 text-sm leading-7 text-zinc-400">
                O clube está disponível para esclarecer dúvidas, receber
                mensagens e aproximar ainda mais a comunidade Boavista.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}