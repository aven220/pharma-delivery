import { useAuthStore } from '@/store/auth.store';

function isAdminUser(user: ReturnType<typeof useAuthStore.getState>['user']) {
  return user?.role.name === 'ADMIN';
}

export function usePermissions() {
  const user = useAuthStore((s) => s.user);

  const hasPermission = (...permissions: string[]) => {
    if (!user) return false;
    if (isAdminUser(user)) return true;
    return permissions.some((p) => user.permissions.includes(p));
  };

  const hasRole = (...roles: string[]) => {
    if (!user) return false;
    if (isAdminUser(user)) return true;
    return roles.includes(user.role.name);
  };

  const canAccessExcel =
    isAdminUser(user) ||
    (hasPermission('excel.import', 'excel.read') && hasRole('ADMIN', 'SUPERVISOR'));

  const canAccessBulkImport =
    canAccessExcel || hasPermission('medications.import', 'medications.write');

  const isAdmin = () => isAdminUser(user);

  return { user, hasPermission, hasRole, isAdmin, canAccessExcel, canAccessBulkImport };
}
