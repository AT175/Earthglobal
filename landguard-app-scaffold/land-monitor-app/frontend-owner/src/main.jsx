import React from 'react';
import ReactDOM from 'react-dom/client';
import { Buffer } from 'buffer';
import App from './App';

// Polyfill Buffer for libraries that expect a Node.js environment (e.g. shpjs)
window.Buffer = Buffer;
globalThis.Buffer = Buffer;

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
