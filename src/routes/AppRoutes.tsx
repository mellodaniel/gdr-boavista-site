import { Navigate, Route, Routes } from 'react-router-dom';

import { PublicLayout } from '../layouts/PublicLayout';
import { AdminLayout } from '../layouts/AdminLayout';
import { ProtectedAdminRoute } from '../components/admin/ProtectedAdminRoute';

import { HomePage } from '../pages/public/HomePage';
import { ClubPage } from '../pages/public/ClubPage';
import { TeamsPage } from '../pages/public/TeamsPage';
import { SeniorRosterPage } from '../pages/public/SeniorRosterPage';
import { NewsPage } from '../pages/public/NewsPage';
import { NewsDetailPage } from '../pages/public/NewsDetailPage';
import { MembersPage } from '../pages/public/MembersPage';
import { GalleryPage } from '../pages/public/GalleryPage';
import { SponsorsPage } from '../pages/public/SponsorsPage';
import { ContactsPage } from '../pages/public/ContactsPage';
import { NewsletterUnsubscribePage } from '../pages/public/NewsletterUnsubscribePage';
import { ResultsPage } from '../pages/public/ResultsPage';
import { ShopPage } from '../pages/public/ShopPage';
import { AppInstallPage } from '../pages/public/AppInstallPage';
import { SeniorMatchCenterPage } from '../pages/app/SeniorMatchCenterPage';

import { AdminLoginPage } from '../pages/admin/AdminLoginPage';
import { AdminDashboardPage } from '../pages/admin/AdminDashboardPage';
import { AdminMembersPage } from '../pages/admin/AdminMembersPage';
import { AdminContactsPage } from '../pages/admin/AdminContactsPage';
import { AdminSubscribersPage } from '../pages/admin/AdminSubscribersPage';
import { AdminCommunicationsPage } from '../pages/admin/AdminCommunicationsPage';
import { AdminContactImportPage } from '../pages/admin/AdminContactImportPage';
import { AdminNewsPage } from '../pages/admin/AdminNewsPage';
import { AdminFacebookPostsPage } from '../pages/admin/AdminFacebookPostsPage';
import { AdminTeamsPage } from '../pages/admin/AdminTeamsPage';
import { AdminSeniorRosterPage } from '../pages/admin/AdminSeniorRosterPage';
import { AdminSponsorsPage } from '../pages/admin/AdminSponsorsPage';
import { AdminGalleryPage } from '../pages/admin/AdminGalleryPage';
import { AdminContentsPage } from '../pages/admin/AdminContentsPage';
import { AdminMatchesPage } from '../pages/admin/AdminMatchesPage';
import { AdminTournamentsPage } from '../pages/admin/AdminTournamentsPage';
import { AdminAnalyticsPage } from '../pages/admin/AdminAnalyticsPage';
import { AdminShopPage } from '../pages/admin/AdminShopPage';

import AdminTournamentManagerPage from '../pages/admin/AdminTournamentManagerPage';
import CreateTournamentManagerPage from '../pages/admin/CreateTournamentManagerPage';
import EditTournamentManagerPage from '../pages/admin/EditTournamentManagerPage';
import TournamentManagerSchedulePage from '../pages/admin/TournamentManagerSchedulePage';
import TournamentManagerFieldsPage from '../pages/admin/TournamentManagerFieldsPage';
import TournamentManagerTeamsPage from '../pages/admin/TournamentManagerTeamsPage';
import TournamentManagerPlayersPage from '../pages/admin/TournamentManagerPlayersPage';
import TournamentManagerGroupsPage from '../pages/admin/TournamentManagerGroupsPage';
import TournamentManagerRulesPage from '../pages/admin/TournamentManagerRulesPage';
import TournamentManagerMatchesPage from '../pages/admin/TournamentManagerMatchesPage';
import TournamentManagerSponsorsPage from '../pages/admin/TournamentManagerSponsorsPage';
import PublicTournamentPage from '../pages/PublicTournamentPage';

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route index element={<HomePage />} />
        <Route path="clube" element={<ClubPage />} />
        <Route path="equipas" element={<TeamsPage />} />
        <Route path="equipas/seniores/plantel-2026-gdrb-7f4k" element={<SeniorRosterPage />} />
        <Route path="noticias" element={<NewsPage />} />
        <Route path="noticias/:id" element={<NewsDetailPage />} />
        <Route path="socios" element={<MembersPage />} />
        <Route path="galeria" element={<GalleryPage />} />
        <Route path="patrocinadores" element={<SponsorsPage />} />
        <Route path="parceiros" element={<SponsorsPage />} />
        <Route path="contactos" element={<ContactsPage />} />
        <Route path="newsletter/cancelar/:token" element={<NewsletterUnsubscribePage />} />
        <Route path="resultados" element={<ResultsPage />} />
        <Route path="loja" element={<ShopPage />} />
        <Route path="app" element={<AppInstallPage />} />
        <Route path="torneios/:slug" element={<PublicTournamentPage />} />
      </Route>

      <Route path="/admin/login" element={<AdminLoginPage />} />

      <Route element={<ProtectedAdminRoute />}>
        <Route path="/app/jogo" element={<SeniorMatchCenterPage />} />
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboardPage />} />
          <Route path="analytics" element={<AdminAnalyticsPage />} />
          <Route path="conteudos" element={<AdminContentsPage />} />
          <Route path="noticias" element={<AdminNewsPage />} />
          <Route path="facebook" element={<AdminFacebookPostsPage />} />
          <Route path="equipas" element={<AdminTeamsPage />} />
          <Route path="equipas/seniores/plantel" element={<AdminSeniorRosterPage />} />
          <Route path="jogos" element={<AdminMatchesPage />} />
          <Route path="torneios" element={<AdminTournamentsPage />} />
          <Route path="gestor-torneios" element={<AdminTournamentManagerPage />} />
          <Route path="gestor-torneios/novo" element={<CreateTournamentManagerPage />} />
          <Route path="gestor-torneios/:id" element={<EditTournamentManagerPage />} />
          <Route path="gestor-torneios/:id/datas" element={<TournamentManagerSchedulePage />} />
          <Route path="gestor-torneios/:id/campos" element={<TournamentManagerFieldsPage />} />
          <Route path="gestor-torneios/:id/equipas" element={<TournamentManagerTeamsPage />} />
          <Route path="gestor-torneios/:id/equipas/:teamId/jogadores" element={<TournamentManagerPlayersPage />} />
          <Route path="gestor-torneios/:id/grupos" element={<TournamentManagerGroupsPage />} />
          <Route path="gestor-torneios/:id/regras" element={<TournamentManagerRulesPage />} />
          <Route path="gestor-torneios/:id/jogos" element={<TournamentManagerMatchesPage />} />
          <Route path="gestor-torneios/:id/parceiros" element={<TournamentManagerSponsorsPage />} />
          <Route path="patrocinadores" element={<AdminSponsorsPage />} />
          <Route path="socios" element={<AdminMembersPage />} />
          <Route path="contactos" element={<AdminContactsPage />} />
          <Route path="subscritores" element={<AdminSubscribersPage />} />
          <Route path="comunicacoes" element={<AdminCommunicationsPage />} />
          <Route path="importar-contactos" element={<AdminContactImportPage />} />
          <Route path="galeria" element={<AdminGalleryPage />} />
          <Route path="loja" element={<AdminShopPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}