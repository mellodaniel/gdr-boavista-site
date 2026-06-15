import { useEffect, useMemo, useState } from 'react';
import { Save, Settings } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { GdrbSiteContent } from '../../types/database';

export function AdminContentsPage() {
  const [contents, setContents] = useState<GdrbSiteContent[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
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
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('Erro ao carregar conteúdos:', error);
      setErrorMessage('Não foi possível carregar os conteúdos.');
      setIsLoading(false);
      return;
    }

    const loadedContents = data ?? [];

    setContents(loadedContents);

    const initialValues = loadedContents.reduce<Record<string, string>>(
      (acc, item) => {
        acc[item.id] = item.value ?? '';
        return acc;
      },
      {},
    );

    setValues(initialValues);
    setIsLoading(false);
  }

  useEffect(() => {
    loadContents();
  }, []);

  function handleChange(id: string, value: string) {
    setValues((currentValues) => ({
      ...currentValues,
      [id]: value,
    }));
  }

  async function handleSave() {
    setIsSaving(true);
    setSuccessMessage('');
    setErrorMessage('');

    const updates = contents.map((item) =>
      supabase
        .from('gdrb_site_contents')
        .update({
          value: values[item.id] ?? '',
          updated_at: new Date().toISOString(),
        })
        .eq('id', item.id),
    );

    const results = await Promise.all(updates);

    const hasError = results.some((result) => result.error);

    setIsSaving(false);

    if (hasError) {
      console.error('Erro ao guardar conteúdos:', results);
      setErrorMessage('Não foi possível guardar todos os conteúdos.');
      return;
    }

    setSuccessMessage('Conteúdos guardados com sucesso.');
    await loadContents();
  }

  return (
    <div>
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.35em] text-red-600">
            Administração
          </p>

          <h1 className="mt-2 text-4xl font-black text-zinc-950">
            Conteúdos gerais
          </h1>

          <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-600">
            Gere aqui os principais textos institucionais do site. Estes campos
            serão usados nas páginas públicas, começando pela homepage.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving || isLoading}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-red-600 px-5 py-3 text-sm font-black uppercase tracking-wide text-white shadow-lg shadow-red-950/20 transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Save size={18} />
          {isSaving ? 'A guardar...' : 'Guardar alterações'}
        </button>
      </div>

      {successMessage && (
        <div className="mt-6 rounded-2xl border border-green-200 bg-green-50 px-5 py-4 text-sm font-semibold text-green-800">
          {successMessage}
        </div>
      )}

      {errorMessage && (
        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-800">
          {errorMessage}
        </div>
      )}

      {isLoading ? (
        <div className="mt-8 rounded-3xl border border-zinc-200 bg-white p-8 text-zinc-600 shadow-sm">
          A carregar conteúdos...
        </div>
      ) : contents.length === 0 ? (
        <div className="mt-8 rounded-3xl border border-zinc-200 bg-white p-8 text-zinc-600 shadow-sm">
          Ainda não existem conteúdos configurados.
        </div>
      ) : (
        <div className="mt-8 space-y-8">
          {Object.entries(groupedContents).map(([groupName, groupItems]) => (
            <section
              key={groupName}
              className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm"
            >
              <div className="border-b border-zinc-200 bg-zinc-50 px-6 py-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-100 text-red-600">
                    <Settings size={20} />
                  </div>

                  <div>
                    <h2 className="text-xl font-black text-zinc-950">
                      {groupName}
                    </h2>
                    <p className="text-sm text-zinc-500">
                      Textos e informações desta área.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-5 p-6">
                {groupItems.map((item) => (
                  <div key={item.id}>
                    <label className="text-sm font-black text-zinc-800">
                      {item.label}
                    </label>

                    <p className="mt-1 text-xs text-zinc-500">
                      Chave técnica: {item.content_key}
                    </p>

                    {item.type === 'textarea' ? (
                      <textarea
                        value={values[item.id] ?? ''}
                        onChange={(event) =>
                          handleChange(item.id, event.target.value)
                        }
                        rows={5}
                        className="mt-3 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm leading-6 text-zinc-800 outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-100"
                      />
                    ) : (
                      <input
                        type="text"
                        value={values[item.id] ?? ''}
                        onChange={(event) =>
                          handleChange(item.id, event.target.value)
                        }
                        className="mt-3 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-800 outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-100"
                      />
                    )}
                  </div>
                ))}
              </div>
            </section>
          ))}

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-red-600 px-6 py-4 text-sm font-black uppercase tracking-wide text-white shadow-lg shadow-red-950/20 transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Save size={18} />
              {isSaving ? 'A guardar...' : 'Guardar alterações'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}