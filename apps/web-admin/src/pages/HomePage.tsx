import { Navigate } from 'react-router-dom';
import { usePermissions } from '@/hooks/usePermissions';
import { DashboardPage } from '@/pages/DashboardPage';

export function HomePage() {
  const { hasPermission, hasRole } = usePermissions();

  if (hasRole('OPERATOR')) {
    return <Navigate to="/calls?tab=my-calls" replace />;
  }

  if (hasRole('DOMICILIARIO')) {
    return <Navigate to="/deliveries" replace />;
  }

  if (hasPermission('dashboard.read', 'audit.read')) {
    return <DashboardPage />;
  }

  if (hasPermission('calls.write') && !hasPermission('calls.assign')) {
    return <Navigate to="/calls?tab=my-calls" replace />;
  }

  if (hasPermission('couriers.read') || hasPermission('intermunicipal_routes.write')) {
    return <Navigate to="/prepare-today" replace />;
  }

  if (hasPermission('calls.write')) {
    return <Navigate to="/calls?tab=my-calls" replace />;
  }

  return <Navigate to="/deliveries" replace />;
}
