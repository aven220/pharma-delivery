import type { UserDTO } from '@pharma/types';

function roleName(user: UserDTO | null | undefined): string {
  return user?.role?.name ?? '';
}

function permissionsOf(user: UserDTO | null | undefined): string[] {
  return Array.isArray(user?.permissions) ? user!.permissions : [];
}

/** Operador de call center: gestiona llamadas desde la app. */
export function isCallOperator(user: UserDTO | null | undefined): boolean {
  if (!user) return false;
  const name = roleName(user);
  if (name === 'OPERATOR') return true;
  if (['ADMIN', 'SUPERVISOR', 'AUDITOR', 'DOMICILIARIO', 'COURIER', 'DRIVER'].includes(name)) {
    return false;
  }
  const perms = permissionsOf(user);
  return perms.includes('calls.write') && !perms.includes('courier.app');
}

/**
 * Domiciliario / conductor: entregas y rutas.
 * No usar operationalType solo: en BD el default es DOMICILIARIO para todos los roles.
 */
export function isFieldWorker(user: UserDTO | null | undefined): boolean {
  if (!user) return false;
  const name = roleName(user);
  if (['COURIER', 'DOMICILIARIO', 'DRIVER'].includes(name)) return true;
  if (['OPERATOR', 'ADMIN', 'SUPERVISOR', 'AUDITOR'].includes(name)) return false;
  return permissionsOf(user).includes('courier.app');
}

export function homeRouteForUser(
  user: UserDTO | null | undefined
): '/(tabs)/calls' | '/(tabs)/deliveries' {
  try {
    if (isCallOperator(user) && !isFieldWorker(user)) return '/(tabs)/calls';
  } catch {
    // usuario corrupto en SecureStore
  }
  return '/(tabs)/deliveries';
}
