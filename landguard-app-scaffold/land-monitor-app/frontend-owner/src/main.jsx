import React from 'react';
import ReactDOM from 'react-dom/client';
import { createI18n } from '@earthglobal/design-system';
import i18n from 'i18next';
import App from './App';
import ownerResources from './i18n/resources';

createI18n(ownerResources, {
  returnNull: false,
  returnEmptyString: false,
  partialBundledLanguages: true,
  react: {
    useSuspense: false,
    bindI18n: 'languageChanged loaded',
  },
  parseMissingKeyHandler: (key) => {
    const parts = key.split('.');
    return parts[parts.length - 1];
  },
});

const RTL_LANGS = ['ar', 'he', 'fa', 'ur'];
function applyDir(lng) {
  const base = (lng || 'en').split('-')[0];
  document.documentElement.dir = RTL_LANGS.includes(base) ? 'rtl' : 'ltr';
  document.documentElement.lang = base;
}
applyDir(i18n.language);
i18n.on('languageChanged', applyDir);

const root = ReactDOM.createRoot(document.getElementById('root'));

// Dev-only accessibility auditing: logs WCAG violations to the browser console
// as the app renders. Never runs in production builds (import.meta.env.DEV
// is statically replaced by Vite, so this whole branch is tree-shaken out).
if (import.meta.env.DEV) {
  import('@axe-core/react').then((axe) => {
    axe.default(React, ReactDOM, 1000);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  });
} else {
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
