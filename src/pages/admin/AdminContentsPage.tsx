import { useEffect, useMemo, useState } from 'react';
import { RefreshCcw, Save, Settings } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { GdrbSiteContent } from '../../types/database';

export function AdminContentsPage() {
  const [contents, setContents] = useState<GdrbSiteContent[]>([]);
  const [editedValues, setEditedValues] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const groupedContents = useMemo(() => {
    return contents.reduce<Record<string, GdrbSiteContent[]>>((acc, item) => {
      if (!acc[item.group_name]) {
        acc[item.group_name] = [];
      }

      acc[item.group_name].push(item);
      return acc;
    }, {});
  }, [contents]);

  async function loadContents() {
    setIsLoading(true);
    setErrorMessage('');

    const { data, error } = await supabase
      .from('gdrb_site_contents')
      .select('*')
      .order('group_name', { ascending: true })
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('Erro ao carregar conteúdos:', error);
      setErrorMessage('Não foi possível carregar os conteúdos.');
      setIsLoading(false);
      return;
    }

    setContents(data ?? []);

    const values = (data ?? []).reduce<Record<string, string>>((acc, item) => {
      acc[item.id] = item.value ?? '';
      return acc;
    }, {});

    setEditedValues(values);
    setIsLoading(false);
  }

  useEffect(() => {
    loadContents();
  }, []);

  function handleValueChange(id: string, value: string) {
    setEditedValues((currentValues) => ({
      ...currentValues,
      [id]: value,
    }));
  }

  async function handleSave() {
    setSuccessMessage('');
    setErrorMessage('');
    setIsSaving(true);

    const updates = contents.map((item) =>
      supabase
        .from('gdrb_site_contents')
        .update({
          value: editedValues[item.id] ?? '',
          updated_at: new Date().toISOString(),
        })
        .eq('id', item.id),
    );

    const results = await Promise.all(updates);
    const hasError = results.some((result) => result.error);

    setIsSaving(false);

    if (hasError) {
      console.error(
        'Erro ao guardar conteúdos:',
        results.find((result) => result.error)?.error,
      );
      setErrorMessage('Não foi possível guardar todos os conteúdos.');
      return;
    }

    setSuccessMessage('Conteúdos guardados com sucesso.');
    await loadContents();
  }

  function formatGroupName(groupName: string) {
    const labels: Record<string, string> = {
      home: 'Homepage',
      club: 'Clube',
      contact: 'Contactos',
      geral: 'Geral',
    };

    return labels[groupName] ?? groupName;
  }

  return (
    <div>
      <section className="relative overflow-hidden rounded-sm bg-[#24180f] p-8 text-white shadow-2xl shadow-zinc-950/10 md:p-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_right,rgba(220,38,38,0.28),transparent_34%)]" />

        <div className="relative flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.45em] text-red-400">
              Administração
            </p>

            <h1 className="mt-6 font-serif text-5xl font-light leading-tight md:text-7xl">
              Conteúdos
              <br />
              gerais.
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-8 text-zinc-300">
              Gere textos e informações gerais usadas no site público do GDR
              Boavista.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={loadContents}
              className="inline-flex items-center justify-center gap-2 rounded-md border border-white/10 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/10"
            >
              <RefreshCcw size={17} />
              Atualizar
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || isLoading}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-red-700 px-6 py-3 text-sm font-black uppercase tracking-wide text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Save size={18} />
              {isSaving ? 'A guardar...' : 'Guardar'}
            </button>
          </div>
        </div>
      </section>

      {successMessage && (
        <div className="mt-6 rounded-sm border border-green-200 bg-green-50 px-5 py-4 text-sm font-semibold text-green-800">
          {successMessage}
        </div>
      )}

      {errorMessage && (
        <div className="mt-6 rounded-sm border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-800">
          {errorMessage}
        </div>
      )}

      {isLoading ? (
        <div className="mt-8 rounded-sm border border-zinc-200 bg-white p-8 text-zinc-600 shadow-sm">
          A carregar conteúdos...
        </div>
      ) : contents.length === 0 ? (
        <div className="mt-8 rounded-sm border border-dashed border-zinc-300 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-700">
            <Settings size={28} />
          </div>

          <h2 className="mt-5 font-serif text-3xl font-light text-[#24180f]">
            Sem conteúdos configurados
          </h2>

          <p className="mt-3 text-zinc-500">
            Ainda não existem conteúdos gerais para editar.
          </p>
        </div>
      ) : (
        <div className="mt-8 grid gap-8">
          {Object.entries(groupedContents).map(([groupName, items]) => (
            <section
              key={groupName}
              className="overflow-hidden rounded-sm border border-zinc-200 bg-white shadow-sm"
            >
              <div className="border-b border-zinc-200 bg-[#f6f2ec] px-7 py-5">
                <p className="text-sm font-bold uppercase tracking-[0.35em] text-red-700">
                  Grupo
                </p>

                <h2 className="mt-2 font-serif text-3xl font-light text-[#24180f]">
                  {formatGroupName(groupName)}
                </h2>
              </div>

              <div className="grid gap-5 p-7">
                {items.map((item) => (
                  <div key={item.id}>
                    <label className="text-sm font-black text-zinc-800">
                      {item.label}
                    </label>

                    <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
                      {item.content_key}
                    </p>

                    {item.type === 'textarea' ? (
                      <textarea
                        value={editedValues[item.id] ?? ''}
                        onChange={(event) =>
                          handleValueChange(item.id, event.target.value)
                        }
                        rows={5}
                        className="mt-3 w-full rounded-md border border-zinc-200 px-4 py-3 text-sm leading-7 outline-none focus:border-red-700 focus:ring-4 focus:ring-red-100"
                      />
                    ) : (
                      <input
                        type="text"
                        value={editedValues[item.id] ?? ''}
                        onChange={(event) =>
                          handleValueChange(item.id, event.target.value)
                        }
                        className="mt-3 w-full rounded-md border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-red-700 focus:ring-4 focus:ring-red-100"
                      />
                    )}
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}