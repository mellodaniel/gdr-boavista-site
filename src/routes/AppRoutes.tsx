import { Navigate, Route, Routes } from 'react-router-dom';

import { PublicLayout } from '../layouts/PublicLayout';
import { AdminLayout } from '../layouts/AdminLayout';
import { ProtectedAdminRoute } from '../components/admin/ProtectedAdminRoute';

import { HomePage } from '../pages/public/HomePage';
import { ClubPage } from '../pages/public/ClubPage';
import { TeamsPage } from '../pages/public/TeamsPage';
import { NewsPage } from '../pages/public/NewsPage';
import { NewsDetailPage } from '../pages/public/NewsDetailPage';
import { MembersPage } from '../pages/public/MembersPage';
import { GalleryPage } from '../pages/public/GalleryPage';
import { SponsorsPage } from '../pages/public/SponsorsPage';
import { ContactsPage } from '../pages/public/ContactsPage';
import { ResultsPage } from '../pages/public/ResultsPage';
import { ShopPage } from '../pages/public/ShopPage';

import { AdminLoginPage } from '../pages/admin/AdminLoginPage';
import { AdminDashboardPage } from '../pages/admin/AdminDashboardPage';
import { AdminMembersPage } from '../pages/admin/AdminMembersPage';
import { AdminContactsPage } from '../pages/admin/AdminContactsPage';
import { AdminNewsPage } from '../pages/admin/AdminNewsPage';
import { AdminFacebookPostsPage } from '../pages/admin/AdminFacebookPostsPage';
import { AdminTeamsPage } from '../pages/admin/AdminTeamsPage';
import { AdminSponsorsPage } from '../pages/admin/AdminSponsorsPage';
import { AdminContentsPage } from '../pages/admin/AdminContentsPage';
import { AdminMatchesPage } from '../pages/admin/AdminMatchesPage';
import { AdminTournamentsPage } from '../pages/admin/AdminTournamentsPage';
import { AdminAnalyticsPage } from '../pages/admin/AdminAnalyticsPage';

import AdminTournamentManagerPage from '../pages/admin/AdminTournamentManagerPage';
import CreateTournamentManagerPage from '../pages/admin/CreateTournamentManagerPage';
import EditTournamentManagerPage from '../pages/admin/EditTournamentManagerPage';
import TournamentManagerSchedulePage from '../pages/admin/TournamentManagerSchedulePage';
import TournamentManagerFieldsPage from '../pages/admin/TournamentManagerFieldsPage';
import TournamentManagerTeamsPage from '../pages/admin/TournamentManagerTeamsPage';
import TournamentManagerGroupsPage from '../pages/admin/TournamentManagerGroupsPage';
import TournamentManagerRulesPage from '../pages/admin/TournamentManagerRulesPage';
import TournamentManagerMatchesPage from '../pages/admin/TournamentManagerMatchesPage';
import TournamentManagerSponsorsPage from '../pages/admin/TournamentManagerSponsorsPage';
import PublicTournamentPage from '../pages/PublicTournamentPage';

function AdminPlaceholderPage({ title }: { title: string }) {
  return (
    <div className="rounded-sm border border-dashed border-zinc-300 bg-white p-10 text-center shadow-sm">
      <h1 className="font-serif text-4xl font-light text-[#24180f]">
        {title}
      </h1>

      <p className="mt-3 text-sm leading-7 text-zinc-500">
        Esta área ainda está em preparação.
      </p>
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
        <Route path="noticias/:id" element={<NewsDetailPage />} />
        <Route path="socios" element={<MembersPage />} />
        <Route path="galeria" element={<GalleryPage />} />
        <Route path="patrocinadores" element={<SponsorsPage />} />
        <Route path="contactos" element={<ContactsPage />} />
        <Route path="resultados" element={<ResultsPage />} />
        <Route path="loja" element={<ShopPage />} />
        <Route path="torneios/:slug" element={<PublicTournamentPage />} />
      </Route>

      <Route path="/admin/login" element={<AdminLoginPage />} />

      <Route element={<ProtectedAdminRoute />}>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboardPage />} />
          <Route path="analytics" element={<AdminAnalyticsPage />} />
          <Route path="conteudos" element={<AdminContentsPage />} />
          <Route path="noticias" element={<AdminNewsPage />} />
          <Route path="facebook" element={<AdminFacebookPostsPage />} />
          <Route path="equipas" element={<AdminTeamsPage />} />
          <Route path="jogos" element={<AdminMatchesPage />} />
          <Route path="torneios" element={<AdminTournamentsPage />} />
          <Route path="gestor-torneios" element={<AdminTournamentManagerPage />} />
          <Route path="gestor-torneios/novo" element={<CreateTournamentManagerPage />} />
          <Route path="gestor-torneios/:id" element={<EditTournamentManagerPage />} />
          <Route path="gestor-torneios/:id/datas" element={<TournamentManagerSchedulePage />} />
          <Route path="gestor-torneios/:id/campos" element={<TournamentManagerFieldsPage />} />
          <Route path="gestor-torneios/:id/equipas" element={<TournamentManagerTeamsPage />} />
          <Route path="gestor-torneios/:id/grupos" element={<TournamentManagerGroupsPage />} />
          <Route path="gestor-torneios/:id/regras" element={<TournamentManagerRulesPage />} />
          <Route path="gestor-torneios/:id/jogos" element={<TournamentManagerMatchesPage />} />
          <Route path="gestor-torneios/:id/parceiros" element={<TournamentManagerSponsorsPage />} />
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
