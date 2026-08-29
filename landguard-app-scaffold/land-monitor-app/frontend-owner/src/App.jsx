import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, Spinner } from '@earthglobal/design-system';
import PWAInstallPrompt from './components/PWAInstallPrompt';

// Landing + Login + Signup (eager-loaded — entry points)
import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';

// Sales Manager pages
const SalesManagerDashboard = lazy(() => import('./pages/sales-manager/SalesManagerDashboard'));

// Owner pages
const Dashboard = lazy(() => import('./pages/Dashboard'));
const ParcelDetail = lazy(() => import('./pages/ParcelDetail'));
const RequestVisit = lazy(() => import('./pages/RequestVisit'));
const ValidationRequests = lazy(() => import('./pages/ValidationRequests'));
const BuyLand = lazy(() => import('./pages/BuyLand'));
const SellerDashboard = lazy(() => import('./pages/SellerDashboard'));
const Pricing = lazy(() => import('./pages/Pricing'));
const MyVisits = lazy(() => import('./pages/owner/MyVisits'));
const VisitDetailOwner = lazy(() => import('./pages/owner/VisitDetailOwner'));
const SitePlans = lazy(() => import('./pages/SitePlans'));
const RequestOnboarding = lazy(() => import('./pages/RequestOnboarding'));

// Agent pages
const VisitList = lazy(() => import('./pages/agent/VisitList'));
const VisitDetail = lazy(() => import('./pages/agent/VisitDetail'));
const AvailableVisits = lazy(() => import('./pages/agent/AvailableVisits'));
const AgentParcels = lazy(() => import('./pages/agent/AgentParcels'));
const AgentOnboardingTasks = lazy(() => import('./pages/agent/AgentOnboardingTasks'));

// Admin pages
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const ParcelOnboarding = lazy(() => import('./pages/admin/ParcelOnboarding'));
const OnboardingRequests = lazy(() => import('./pages/admin/OnboardingRequests'));
const AgentManagement = lazy(() => import('./pages/admin/AgentManagement'));
const ParcelsList = lazy(() => import('./pages/admin/ParcelsList'));
const UserManagement = lazy(() => import('./pages/admin/UserManagement'));
const OrganizationManagement = lazy(() => import('./pages/admin/OrganizationManagement'));
const VisitAssignments = lazy(() => import('./pages/admin/VisitAssignments'));

// Assembly pages
const AssemblyDashboard = lazy(() => import('./pages/assembly/AssemblyDashboard'));
const PlanningDashboard = lazy(() => import('./pages/assembly/PlanningDashboard'));
const BuildingsList = lazy(() => import('./pages/assembly/BuildingsList'));
const SchemeManagement = lazy(() => import('./pages/assembly/SchemeManagement'));
const ValidationPage = lazy(() => import('./pages/assembly/ValidationPage'));
const MarketplaceApprovals = lazy(() => import('./pages/assembly/MarketplaceApprovals'));

// Finance pages (Finance Officer role + super_admin oversight)
const FinanceDashboard = lazy(() => import('./pages/finance/FinanceDashboard'));
const FinancePlans = lazy(() => import('./pages/finance/FinancePlans'));
const FinancePayments = lazy(() => import('./pages/finance/FinancePayments'));
const FinanceTenants = lazy(() => import('./pages/finance/FinanceTenants'));
const FinanceSettings = lazy(() => import('./pages/finance/FinanceSettings'));
const FinanceSettlements = lazy(() => import('./pages/finance/FinanceSettlements'));

// Shared pages (all roles)
const Profile = lazy(() => import('./pages/Profile'));

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
      if (user.role === 'admin') {
        // Finance officers go to the finance dashboard; super_admins go to admin
        if (user.adminRole === 'finance_officer') return <Navigate to="/finance" replace />;
        return <Navigate to="/admin" replace />;
      }
      if (user.role === 'assembly') return <Navigate to="/assembly" replace />;
      if (user.isSalesManager) return <Navigate to="/sales-manager" replace />;
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

            {/* Sales Manager routes */}
            <Route path="/sales-manager" element={<RequireAuth><SalesManagerDashboard /></RequireAuth>} />
            <Route path="/sales-manager/parcels/:id" element={<RequireAuth><ParcelDetail /></RequireAuth>} />
            <Route path="/sales-manager/parcels/:id/request-visit" element={<RequireAuth><RequestVisit /></RequireAuth>} />
            <Route path="/sales-manager/validation" element={<RequireAuth><ValidationRequests /></RequireAuth>} />
            <Route path="/sales-manager/sell" element={<RequireAuth><SellerDashboard /></RequireAuth>} />
            <Route path="/sales-manager/buy-land" element={<RequireAuth><BuyLand /></RequireAuth>} />
            <Route path="/sales-manager/site-plans" element={<RequireAuth><SitePlans /></RequireAuth>} />
            <Route path="/sales-manager/request-onboarding" element={<RequireAuth><RequestOnboarding /></RequireAuth>} />
            <Route path="/sales-manager/visits" element={<RequireAuth><MyVisits /></RequireAuth>} />
            <Route path="/sales-manager/visits/:id" element={<RequireAuth><VisitDetailOwner /></RequireAuth>} />
            <Route path="/sales-manager/profile" element={<RequireAuth><Profile /></RequireAuth>} />

            {/* Owner routes */}
            <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
            <Route path="/parcels/:id" element={<RequireAuth><ParcelDetail /></RequireAuth>} />
            <Route path="/parcels/:id/request-visit" element={<RequireAuth><RequestVisit /></RequireAuth>} />
            <Route path="/validation" element={<RequireAuth><ValidationRequests /></RequireAuth>} />
            <Route path="/sell" element={<RequireAuth><SellerDashboard /></RequireAuth>} />
            <Route path="/pricing" element={<RequireAuth><Pricing /></RequireAuth>} />
            <Route path="/visits" element={<RequireAuth><MyVisits /></RequireAuth>} />
            <Route path="/visits/:id" element={<RequireAuth><VisitDetailOwner /></RequireAuth>} />
            <Route path="/site-plans" element={<RequireAuth><SitePlans /></RequireAuth>} />
            <Route path="/request-onboarding" element={<RequireAuth><RequestOnboarding /></RequireAuth>} />
            <Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />

            {/* Agent routes */}
            <Route path="/agent" element={<RequireAuth><VisitList /></RequireAuth>} />
            <Route path="/agent/available" element={<RequireAuth><AvailableVisits /></RequireAuth>} />
            <Route path="/agent/visits/:id" element={<RequireAuth><VisitDetail /></RequireAuth>} />
            <Route path="/agent/parcels" element={<RequireAuth><AgentParcels /></RequireAuth>} />
            <Route path="/agent/parcels/:id" element={<RequireAuth><ParcelDetail /></RequireAuth>} />
            <Route path="/agent/onboarding" element={<RequireAuth><AgentOnboardingTasks /></RequireAuth>} />
            <Route path="/agent/profile" element={<RequireAuth><Profile /></RequireAuth>} />

            {/* Admin routes */}
            <Route path="/admin" element={<RequireAuth><OnboardingRequests /></RequireAuth>} />
            <Route path="/admin/onboard" element={<RequireAuth><ParcelOnboarding /></RequireAuth>} />
            <Route path="/admin/dashboard" element={<RequireAuth><AdminDashboard /></RequireAuth>} />
            <Route path="/admin/agents" element={<RequireAuth><AgentManagement /></RequireAuth>} />
            <Route path="/admin/parcels" element={<RequireAuth><ParcelsList /></RequireAuth>} />
            <Route path="/admin/users" element={<RequireAuth><UserManagement /></RequireAuth>} />
            <Route path="/admin/organizations" element={<RequireAuth><OrganizationManagement /></RequireAuth>} />
            <Route path="/admin/visits" element={<RequireAuth><VisitAssignments /></RequireAuth>} />
            <Route path="/admin/profile" element={<RequireAuth><Profile /></RequireAuth>} />

            {/* Assembly routes */}
            <Route path="/assembly" element={<RequireAuth><AssemblyDashboard /></RequireAuth>} />
            <Route path="/assembly/planning" element={<RequireAuth><PlanningDashboard /></RequireAuth>} />
            <Route path="/assembly/planning/buildings" element={<RequireAuth><BuildingsList /></RequireAuth>} />
            <Route path="/assembly/planning/schemes" element={<RequireAuth><SchemeManagement /></RequireAuth>} />
            <Route path="/assembly/validation" element={<RequireAuth><ValidationPage /></RequireAuth>} />
            <Route path="/assembly/marketplace" element={<RequireAuth><MarketplaceApprovals /></RequireAuth>} />
            <Route path="/assembly/profile" element={<RequireAuth><Profile /></RequireAuth>} />

            {/* Finance routes (finance_officer + super_admin oversight) */}
            <Route path="/finance" element={<RequireAuth><FinanceDashboard /></RequireAuth>} />
            <Route path="/finance/plans" element={<RequireAuth><FinancePlans /></RequireAuth>} />
            <Route path="/finance/payments" element={<RequireAuth><FinancePayments /></RequireAuth>} />
            <Route path="/finance/tenants" element={<RequireAuth><FinanceTenants /></RequireAuth>} />
            <Route path="/finance/settings" element={<RequireAuth><FinanceSettings /></RequireAuth>} />
            <Route path="/finance/settlements" element={<RequireAuth><FinanceSettlements /></RequireAuth>} />
            <Route path="/finance/profile" element={<RequireAuth><Profile /></RequireAuth>} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
        <PWAInstallPrompt />
      </BrowserRouter>
    </ThemeProvider>
  );
}
