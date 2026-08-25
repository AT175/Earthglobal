import { useLocation } from 'react-router-dom';
import OwnerLayout from '../components/OwnerLayout';
import SalesManagerLayout from '../components/SalesManagerLayout';

export function useRoleLayout() {
  const location = useLocation();
  const isSalesManager = location.pathname.startsWith('/sales-manager');
  const routePrefix = isSalesManager ? '/sales-manager' : '';
  const Layout = isSalesManager ? SalesManagerLayout : OwnerLayout;
  return { Layout, routePrefix, isSalesManager };
}
