import React from 'react';
import ReactDOM from 'react-dom/client';
import { createI18n } from '@earthglobal/design-system';
import App from './App';
import agentResources from './i18n/resources';

createI18n(agentResources);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
