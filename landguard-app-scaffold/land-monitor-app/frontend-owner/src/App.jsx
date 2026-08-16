import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, Spinner } from '@earthglobal/design-system';

// Login page (eager-loaded — it's the entry point)
import Login from './pages/Login';

// Owner pages
const Dashboard = lazy(() => import('./pages/Dashboard'));
const ParcelDetail = lazy(() => import('./pages/ParcelDetail'));
const RequestVisit = lazy(() => import('./pages/RequestVisit'));

// Agent pages
const VisitList = lazy(() => import('./pages/agent/VisitList'));
const VisitDetail = lazy(() => import('./pages/agent/VisitDetail'));

// Admin pages
const ParcelOnboarding = lazy(() => import('./pages/admin/ParcelOnboarding'));
const AgentManagement = lazy(() => import('./pages/admin/AgentManagement'));
const ParcelsList = lazy(() => import('./pages/admin/ParcelsList'));

const PageFallback = () => (
  <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
    <Spinner size="32px" />
  </div>
);

// Simple auth guard — redirects to /login if no token
function RequireAuth({ children }) {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Suspense fallback={<PageFallback />}>
          <Routes>
            {/* Login / signup */}
            <Route path="/login" element={<Login />} />

            {/* Owner routes (default) */}
            <Route path="/" element={<RequireAuth><Dashboard /></RequireAuth>} />
            <Route path="/parcels/:id" element={<RequireAuth><ParcelDetail /></RequireAuth>} />
            <Route path="/parcels/:id/request-visit" element={<RequireAuth><RequestVisit /></RequireAuth>} />

            {/* Agent routes */}
            <Route path="/agent" element={<RequireAuth><VisitList /></RequireAuth>} />
            <Route path="/agent/visits/:id" element={<RequireAuth><VisitDetail /></RequireAuth>} />

            {/* Admin routes */}
            <Route path="/admin" element={<RequireAuth><ParcelOnboarding /></RequireAuth>} />
            <Route path="/admin/agents" element={<RequireAuth><AgentManagement /></RequireAuth>} />
            <Route path="/admin/parcels" element={<RequireAuth><ParcelsList /></RequireAuth>} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ThemeProvider>
  );
}
