import type { UserDTO } from '@pharma/types';

/** Operador de call center: gestiona llamadas desde la app. */
export function isCallOperator(user: UserDTO | null | undefined): boolean {
  if (!user) return false;
  if (user.role.name === 'OPERATOR') return true;
  return user.permissions.includes('calls.write') && !user.permissions.includes('courier.app');
}

/** Domiciliario / conductor: entregas y rutas. */
export function isFieldWorker(user: UserDTO | null | undefined): boolean {
  if (!user) return false;
  if (['COURIER', 'DOMICILIARIO', 'DRIVER'].includes(user.role.name)) return true;
  if (user.operationalType === 'DOMICILIARIO' || user.operationalType === 'CONDUCTOR_RUTA') return true;
  return user.permissions.includes('courier.app');
}

export function homeRouteForUser(user: UserDTO | null | undefined): '/(tabs)/calls' | '/(tabs)/deliveries' {
  if (isCallOperator(user) && !isFieldWorker(user)) return '/(tabs)/calls';
  return '/(tabs)/deliveries';
}
