import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, Spinner } from '@earthglobal/design-system';
import PWAInstallPrompt from './components/PWAInstallPrompt';

// Landing + Login (eager-loaded — entry points)
import Landing from './pages/Landing';
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

// Assembly pages
const AssemblyDashboard = lazy(() => import('./pages/assembly/AssemblyDashboard'));

const PageFallback = () => (
  <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
    <Spinner size="32px" />
  </div>
);

// Auth guard — redirects to /login if no token
function RequireAuth({ children }) {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

// Auto-route authenticated users to their role's home page
function AutoRoute() {
  if (typeof localStorage === 'undefined') return <Navigate to="/login" replace />;
  const token = localStorage.getItem('token');
  if (!token) return <Landing />;

  const userStr = localStorage.getItem('user');
  if (userStr) {
    try {
      const user = JSON.parse(userStr);
      if (user.role === 'agent') return <Navigate to="/agent" replace />;
      if (user.role === 'admin') return <Navigate to="/admin" replace />;
      if (user.role === 'assembly') return <Navigate to="/assembly" replace />;
    } catch {}
  }
  // Default: owner dashboard
  return <Navigate to="/dashboard" replace />;
}

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Suspense fallback={<PageFallback />}>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<AutoRoute />} />
            <Route path="/login" element={<Login />} />

            {/* Owner routes */}
            <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
            <Route path="/parcels/:id" element={<RequireAuth><ParcelDetail /></RequireAuth>} />
            <Route path="/parcels/:id/request-visit" element={<RequireAuth><RequestVisit /></RequireAuth>} />

            {/* Agent routes */}
            <Route path="/agent" element={<RequireAuth><VisitList /></RequireAuth>} />
            <Route path="/agent/visits/:id" element={<RequireAuth><VisitDetail /></RequireAuth>} />

            {/* Admin routes */}
            <Route path="/admin" element={<RequireAuth><ParcelOnboarding /></RequireAuth>} />
            <Route path="/admin/agents" element={<RequireAuth><AgentManagement /></RequireAuth>} />
            <Route path="/admin/parcels" element={<RequireAuth><ParcelsList /></RequireAuth>} />

            {/* Assembly routes */}
            <Route path="/assembly" element={<RequireAuth><AssemblyDashboard /></RequireAuth>} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
        <PWAInstallPrompt />
      </BrowserRouter>
    </ThemeProvider>
  );
}
