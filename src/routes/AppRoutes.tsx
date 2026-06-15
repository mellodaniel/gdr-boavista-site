import { Navigate, Route, Routes } from 'react-router-dom';

import { PublicLayout } from '../layouts/PublicLayout';
import { AdminLayout } from '../layouts/AdminLayout';
import { ProtectedAdminRoute } from '../components/admin/ProtectedAdminRoute';

import { HomePage } from '../pages/public/HomePage';
import { ClubPage } from '../pages/public/ClubPage';
import { TeamsPage } from '../pages/public/TeamsPage';
import { NewsPage } from '../pages/public/NewsPage';
import { MembersPage } from '../pages/public/MembersPage';
import { GalleryPage } from '../pages/public/GalleryPage';
import { SponsorsPage } from '../pages/public/SponsorsPage';
import { ContactsPage } from '../pages/public/ContactsPage';

import { AdminLoginPage } from '../pages/admin/AdminLoginPage';
import { AdminDashboardPage } from '../pages/admin/AdminDashboardPage';
import { AdminMembersPage } from '../pages/admin/AdminMembersPage';
import { AdminContactsPage } from '../pages/admin/AdminContactsPage';
import { AdminNewsPage } from '../pages/admin/AdminNewsPage';
import { AdminTeamsPage } from '../pages/admin/AdminTeamsPage';
import { AdminSponsorsPage } from '../pages/admin/AdminSponsorsPage';
import { AdminContentsPage } from '../pages/admin/AdminContentsPage';
import { AdminMatchesPage } from '../pages/admin/AdminMatchesPage';

function AdminPlaceholderPage({ title }: { title: string }) {
  return (
    <div>
      <p className="text-sm font-bold uppercase tracking-[0.35em] text-red-600">
        Administração
      </p>

      <h1 className="mt-2 text-4xl font-black text-zinc-950">{title}</h1>

      <div className="mt-8 rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm">
        <p className="text-zinc-600">
          Esta área será implementada na próxima fase do projeto.
        </p>
      </div>
    </div>
  );
}

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route index element={<HomePage />} />
        <Route path="clube" element={<ClubPage />} />
        <Route path="equipas" element={<TeamsPage />} />
        <Route path="noticias" element={<NewsPage />} />
        <Route path="socios" element={<MembersPage />} />
        <Route path="galeria" element={<GalleryPage />} />
        <Route path="patrocinadores" element={<SponsorsPage />} />
        <Route path="contactos" element={<ContactsPage />} />
      </Route>

      <Route path="/admin/login" element={<AdminLoginPage />} />

      <Route element={<ProtectedAdminRoute />}>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboardPage />} />
          <Route path="conteudos" element={<AdminContentsPage />} />
          <Route path="noticias" element={<AdminNewsPage />} />
          <Route path="equipas" element={<AdminTeamsPage />} />
          <Route path="jogos" element={<AdminMatchesPage />} />
          <Route path="patrocinadores" element={<AdminSponsorsPage />} />
          <Route path="socios" element={<AdminMembersPage />} />
          <Route path="contactos" element={<AdminContactsPage />} />
          <Route
            path="galeria"
            element={<AdminPlaceholderPage title="Galeria" />}
          />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}