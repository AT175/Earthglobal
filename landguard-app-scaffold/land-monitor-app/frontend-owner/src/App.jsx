import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider, Spinner } from '@earthglobal/design-system';

// Lazy-loaded so the Google Maps SDK (pulled in by ParcelDetail) isn't part of
// the initial bundle for users who only ever see the Dashboard.
const Dashboard = lazy(() => import('./pages/Dashboard'));
const ParcelDetail = lazy(() => import('./pages/ParcelDetail'));
const RequestVisit = lazy(() => import('./pages/RequestVisit'));

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
            <Route path="/" element={<Dashboard />} />
            <Route path="/parcels/:id" element={<ParcelDetail />} />
            <Route path="/parcels/:id/request-visit" element={<RequestVisit />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ThemeProvider>
  );
}
