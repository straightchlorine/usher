import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import HelpPage from './pages/HelpPage';
import AboutPage from './pages/AboutPage';

export { PAGES } from './lib/usePageTitle';

const COMPONENTS = { help: HelpPage, about: AboutPage };

// Static HTML of a page component, with the providers it needs outside the app shell.
export function renderPage(key, path) {
  const Page = COMPONENTS[key];
  return renderToStaticMarkup(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <Page />
      </AuthProvider>
    </MemoryRouter>
  );
}
