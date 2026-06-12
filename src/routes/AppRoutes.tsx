import { BrowserRouter, Route, Routes } from 'react-router-dom';

import { PublicLayout } from '../layouts/PublicLayout';
import { AdminLayout } from '../layouts/AdminLayout';

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

export function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/clube" element={<ClubPage />} />
          <Route path="/equipas" element={<TeamsPage />} />
          <Route path="/noticias" element={<NewsPage />} />
          <Route path="/socios" element={<MembersPage />} />
          <Route path="/galeria" element={<GalleryPage />} />
          <Route path="/patrocinadores" element={<SponsorsPage />} />
          <Route path="/contactos" element={<ContactsPage />} />
        </Route>

        <Route path="/admin/login" element={<AdminLoginPage />} />

        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboardPage />} />
          <Route path="noticias" element={<AdminNewsPage />} />
          <Route path="equipas" element={<AdminTeamsPage />} />
          <Route path="patrocinadores" element={<AdminSponsorsPage />} />
          <Route path="socios" element={<AdminMembersPage />} />
          <Route path="contactos" element={<AdminContactsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}