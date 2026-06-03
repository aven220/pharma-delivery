import { Navigate } from 'react-router-dom';
import { usePermissions } from '@/hooks/usePermissions';
import { DashboardPage } from '@/pages/DashboardPage';

export function HomePage() {
  const { hasPermission } = usePermissions();

  if (hasPermission('dashboard.read', 'audit.read')) {
    return <DashboardPage />;
  }

  if (hasPermission('deliveries.read', 'couriers.read', 'intermunicipal_routes.read')) {
    return <Navigate to="/prepare-today" replace />;
  }

  if (hasPermission('calls.write')) {
    return <Navigate to="/calls?tab=my-calls" replace />;
  }

  return <Navigate to="/deliveries" replace />;
}
