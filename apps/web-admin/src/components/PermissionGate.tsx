import { Navigate } from 'react-router-dom';
import { usePermissions } from '@/hooks/usePermissions';

interface PermissionGateProps {
  permissions?: string[];
  roles?: string[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function PermissionGate({ permissions = [], roles = [], children, fallback }: PermissionGateProps) {
  const { hasPermission, hasRole, user } = usePermissions();

  if (!user) return null;

  const allowedByPerm = permissions.length === 0 || hasPermission(...permissions);
  const allowedByRole = roles.length === 0 || hasRole(...roles);

  if (allowedByPerm && allowedByRole) return <>{children}</>;
  return fallback ? <>{fallback}</> : null;
}

export function ProtectedPermissionRoute({
  permissions = [],
  roles = [],
  children,
}: PermissionGateProps) {
  const { hasPermission, hasRole, user } = usePermissions();

  if (!user) return <Navigate to="/login" replace />;

  const allowedByPerm = permissions.length === 0 || hasPermission(...permissions);
  const allowedByRole = roles.length === 0 || hasRole(...roles);

  if (!allowedByPerm || !allowedByRole) return <Navigate to="/" replace />;
  return <>{children}</>;
}
