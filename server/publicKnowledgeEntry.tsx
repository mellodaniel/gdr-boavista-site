import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { ClubPage } from '../src/pages/public/ClubPage';
import { MembersPage } from '../src/pages/public/MembersPage';
import { ContactsPage } from '../src/pages/public/ContactsPage';
import { ShopPage } from '../src/pages/public/ShopPage';
import { AppInstallPage } from '../src/pages/public/AppInstallPage';

// Only public, empty-session pages. No effects run during server rendering.
export function publicPages() {
  return [
    ['/clube', 'Clube, história, missão, visão e valores', ClubPage],
    ['/socios', 'Sócios e adesão', MembersPage],
    ['/contactos', 'Contactos e localização', ContactsPage],
    ['/loja', 'Loja, como comprar e pagamento', ShopPage],
    ['/app', 'Aplicação Android', AppInstallPage],
  ].map(([path, title, Component]) => ({path, title,
    html: (() => { const html = renderToStaticMarkup(createElement(MemoryRouter, {}, createElement(Component as typeof ClubPage))); return path === '/loja' ? (html.match(/<section data-bo-public-info="true"[\s\S]*?<\/section>/g) || []).join(' ') : html; })(),
  }));
}
