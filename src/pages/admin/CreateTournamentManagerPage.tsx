import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

function createSlug(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

export default function CreateTournamentManagerPage() {
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [edition, setEdition] = useState('');
  const [ageGroup, setAgeGroup] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [footballType, setFootballType] = useState('');
  const [gender, setGender] = useState('');
  const [location, setLocation] = useState('');
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');

  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!name.trim()) {
      setErrorMessage('O nome do torneio é obrigatório.');
      return;
    }

    setSaving(true);
    setErrorMessage('');

    const baseSlug = createSlug(name);
    const slug = edition ? `${baseSlug}-${createSlug(edition)}` : baseSlug;

    const { data, error } = await supabase
      .from('tournaments')
      .insert({
        name: name.trim(),
        slug,
        edition: edition.trim() || null,
        age_group: ageGroup.trim() || null,
        birth_year: birthYear.trim() || null,
        football_type: footballType || null,
        gender: gender || null,
        location: location.trim() || null,
        address: address.trim() || null,
        description: description.trim() || null,
        contact_phone: contactPhone.trim() || null,
        contact_email: contactEmail.trim() || null,
        status: 'draft',
        is_public: false,
      })
      .select('id')
      .single();

    if (error) {
      setSaving(false);

      if (error.message.includes('duplicate key')) {
        setErrorMessage('Já existe um torneio com este nome/edição. Altera o nome ou a edição.');
        return;
      }

      setErrorMessage('Não foi possível criar o torneio. Confirma as permissões RLS para insert.');
      return;
    }

    navigate(`/admin/gestor-torneios/${data.id}`);
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <Link
          to="/admin/gestor-torneios"
          className="text-sm font-semibold text-green-700 hover:text-green-800"
        >
          ← Voltar para o Gestor de Torneios
        </Link>

        <h1 className="mt-4 text-3xl font-bold text-slate-900">Criar Torneio</h1>

        <p className="mt-2 text-slate-600">
          Cria a base inicial do torneio organizado pelo Boavista. Depois poderás configurar
          datas, campos, equipas, formato competitivo e calendário dos jogos.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        {errorMessage && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        <div className="grid gap-5 md:grid-cols-2">
          <FormField label="Nome do torneio *" value={name} setValue={setName} placeholder="Ex: Torneio de Verão GDR Boavista" className="md:col-span-2" />
          <FormField label="Edição" value={edition} setValue={setEdition} placeholder="Ex: 2026" />
          <FormField label="Escalão" value={ageGroup} setValue={setAgeGroup} placeholder="Ex: Sub-9" />
          <FormField label="Ano de nascimento" value={birthYear} setValue={setBirthYear} placeholder="Ex: 2017" />

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">Tipo de futebol</label>
            <select
              value={footballType}
              onChange={(event) => setFootballType(event.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-green-700 focus:ring-2 focus:ring-green-100"
            >
              <option value="">Selecionar</option>
              <option value="Futebol 5">Futebol 5</option>
              <option value="Futebol 7">Futebol 7</option>
              <option value="Futebol 9">Futebol 9</option>
              <option value="Futebol 11">Futebol 11</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">Género</label>
            <select
              value={gender}
              onChange={(event) => setGender(event.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-green-700 focus:ring-2 focus:ring-green-100"
            >
              <option value="">Selecionar</option>
              <option value="Masculino">Masculino</option>
              <option value="Feminino">Feminino</option>
              <option value="Misto">Misto</option>
            </select>
          </div>

          <FormField label="Local" value={location} setValue={setLocation} placeholder="Ex: Campo do GDR Boavista" />
          <FormField label="Morada" value={address} setValue={setAddress} placeholder="Ex: Boa Vista, Leiria" />
          <FormField label="Contacto" value={contactPhone} setValue={setContactPhone} placeholder="Ex: 913030249" />
          <FormField label="Email" value={contactEmail} setValue={setContactEmail} placeholder="Ex: socios.gdrboavista@gmail.com" type="email" />

          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-semibold text-slate-700">Descrição</label>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={5}
              placeholder="Descrição breve do torneio..."
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-green-700 focus:ring-2 focus:ring-green-100"
            />
          </div>
        </div>

        <div className="mt-8 flex flex-col-reverse gap-3 md:flex-row md:justify-end">
          <Link
            to="/admin/gestor-torneios"
            className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Cancelar
          </Link>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center justify-center rounded-xl bg-green-700 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? 'A guardar...' : 'Criar torneio'}
          </button>
        </div>
      </form>
    </div>
  );
}

function FormField({
  label,
  value,
  setValue,
  placeholder,
  type = 'text',
  className = '',
}: {
  label: string;
  value: string;
  setValue: (value: string) => void;
  placeholder?: string;
  type?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="mb-2 block text-sm font-semibold text-slate-700">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-green-700 focus:ring-2 focus:ring-green-100"
      />
    </div>
  );
}
