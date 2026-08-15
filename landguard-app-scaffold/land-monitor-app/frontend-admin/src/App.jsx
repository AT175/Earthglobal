import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider, Spinner } from '@earthglobal/design-system';

const ParcelOnboarding = lazy(() => import('./pages/ParcelOnboarding'));
const AgentManagement = lazy(() => import('./pages/AgentManagement'));
const ParcelsList = lazy(() => import('./pages/ParcelsList'));

const PageFallback = () => (
  <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
    <Spinner size="32px" />
  </div>
);

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route path="/" element={<ParcelOnboarding />} />
            <Route path="/agents" element={<AgentManagement />} />
            <Route path="/parcels" element={<ParcelsList />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ThemeProvider>
  );
}
