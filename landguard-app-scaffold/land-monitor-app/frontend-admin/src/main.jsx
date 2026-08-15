import React from 'react';
import ReactDOM from 'react-dom/client';
import { createI18n } from '@earthglobal/design-system';
import App from './App';
import adminResources from './i18n/resources';

createI18n(adminResources);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
