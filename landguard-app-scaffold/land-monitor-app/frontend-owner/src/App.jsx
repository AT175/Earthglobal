import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, Spinner } from '@earthglobal/design-system';
import PWAInstallPrompt from './components/PWAInstallPrompt';

// Landing + Login + Signup (eager-loaded — entry points)
import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';

// Owner pages
const Dashboard = lazy(() => import('./pages/Dashboard'));
const ParcelDetail = lazy(() => import('./pages/ParcelDetail'));
const RequestVisit = lazy(() => import('./pages/RequestVisit'));
const ValidationRequests = lazy(() => import('./pages/ValidationRequests'));
const BuyLand = lazy(() => import('./pages/BuyLand'));
const SellerDashboard = lazy(() => import('./pages/SellerDashboard'));

// Agent pages
const VisitList = lazy(() => import('./pages/agent/VisitList'));
const VisitDetail = lazy(() => import('./pages/agent/VisitDetail'));

// Admin pages
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const ParcelOnboarding = lazy(() => import('./pages/admin/ParcelOnboarding'));
const AgentManagement = lazy(() => import('./pages/admin/AgentManagement'));
const ParcelsList = lazy(() => import('./pages/admin/ParcelsList'));
const UserManagement = lazy(() => import('./pages/admin/UserManagement'));
const OrganizationManagement = lazy(() => import('./pages/admin/OrganizationManagement'));

// Assembly pages
const AssemblyDashboard = lazy(() => import('./pages/assembly/AssemblyDashboard'));
const PlanningDashboard = lazy(() => import('./pages/assembly/PlanningDashboard'));
const SchemeManagement = lazy(() => import('./pages/assembly/SchemeManagement'));
const ValidationPage = lazy(() => import('./pages/assembly/ValidationPage'));
const MarketplaceApprovals = lazy(() => import('./pages/assembly/MarketplaceApprovals'));

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
            <Route path="/signup" element={<Signup />} />
            <Route path="/buy-land" element={<BuyLand />} />

            {/* Owner routes */}
            <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
            <Route path="/parcels/:id" element={<RequireAuth><ParcelDetail /></RequireAuth>} />
            <Route path="/parcels/:id/request-visit" element={<RequireAuth><RequestVisit /></RequireAuth>} />
            <Route path="/validation" element={<RequireAuth><ValidationRequests /></RequireAuth>} />
            <Route path="/sell" element={<RequireAuth><SellerDashboard /></RequireAuth>} />

            {/* Agent routes */}
            <Route path="/agent" element={<RequireAuth><VisitList /></RequireAuth>} />
            <Route path="/agent/visits/:id" element={<RequireAuth><VisitDetail /></RequireAuth>} />

            {/* Admin routes */}
            <Route path="/admin" element={<RequireAuth><ParcelOnboarding /></RequireAuth>} />
            <Route path="/admin/dashboard" element={<RequireAuth><AdminDashboard /></RequireAuth>} />
            <Route path="/admin/agents" element={<RequireAuth><AgentManagement /></RequireAuth>} />
            <Route path="/admin/parcels" element={<RequireAuth><ParcelsList /></RequireAuth>} />
            <Route path="/admin/users" element={<RequireAuth><UserManagement /></RequireAuth>} />
            <Route path="/admin/organizations" element={<RequireAuth><OrganizationManagement /></RequireAuth>} />

            {/* Assembly routes */}
            <Route path="/assembly" element={<RequireAuth><AssemblyDashboard /></RequireAuth>} />
            <Route path="/assembly/planning" element={<RequireAuth><PlanningDashboard /></RequireAuth>} />
            <Route path="/assembly/planning/schemes" element={<RequireAuth><SchemeManagement /></RequireAuth>} />
            <Route path="/assembly/validation" element={<RequireAuth><ValidationPage /></RequireAuth>} />
            <Route path="/assembly/marketplace" element={<RequireAuth><MarketplaceApprovals /></RequireAuth>} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
        <PWAInstallPrompt />
      </BrowserRouter>
    </ThemeProvider>
  );
}
