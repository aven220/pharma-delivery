import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import { usePermissions } from '@/hooks/usePermissions';
import { BrandConfig } from '@/config/brand';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  Package,
  FileSpreadsheet,
  Phone,
  Truck,
  Route,
  Map,
  Users,
  UserPlus,
  PlusCircle,
  LogOut,
  Pill,
  FileDown,
  MapPinned,
  PackageCheck,
  Bell,
  Shield,
} from 'lucide-react';

interface NavItem {
  to: string;
  icon: React.ElementType;
  label: string;
}

export function AdminLayout() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { hasPermission, canAccessBulkImport, isAdmin } = usePermissions();
  const role = user?.role.name ?? '';

  const fullNav: NavItem[] = [
    ...(hasPermission('dashboard.read', 'audit.read')
      ? [{ to: '/', icon: LayoutDashboard, label: 'Inicio' }]
      : []),
    ...(hasPermission('deliveries.write')
      ? [{ to: '/pending-prep', icon: Package, label: 'Preparar pendientes' }]
      : []),
    ...(hasPermission('couriers.read') || hasPermission('intermunicipal_routes.write')
      ? [{ to: '/prepare-today', icon: PackageCheck, label: 'Preparar hoy' }]
      : []),
    ...(isAdmin() ? [{ to: '/users', icon: Users, label: 'Usuarios' }] : []),
    ...(hasPermission('deliveries.read') && role !== 'OPERATOR'
      ? [{ to: '/deliveries', icon: Package, label: 'Entregas' }]
      : []),
    ...(hasPermission('patients.write') && role !== 'OPERATOR'
      ? [{ to: '/patients/new', icon: UserPlus, label: 'Nuevo paciente' }]
      : []),
    ...(hasPermission('deliveries.write') && role !== 'OPERATOR'
      ? [{ to: '/deliveries/new', icon: PlusCircle, label: 'Nueva entrega' }]
      : []),
    ...(canAccessBulkImport ? [{ to: '/excel', icon: FileSpreadsheet, label: 'Importaciones' }] : []),
    ...(hasPermission('calls.read', 'calls.write', 'calls.assign')
      ? [{ to: '/calls', icon: Phone, label: 'Llamadas' }]
      : []),
    ...(hasPermission('medications.write') || (hasPermission('medications.read') && role !== 'OPERATOR')
      ? [{ to: '/medications', icon: Pill, label: 'Medicamentos' }]
      : []),
    ...(hasPermission('assignments.write')
      ? [{ to: '/assignments', icon: Truck, label: 'Asignaciones' }]
      : []),
    ...(hasPermission('assignments.write') || hasPermission('couriers.read')
      ? [{ to: '/courier-routes', icon: Route, label: 'Rutas diarias' }]
      : []),
    ...(isAdmin() ? [{ to: '/route-municipalities', icon: Map, label: 'Municipios ruta' }] : []),
    ...(hasPermission('intermunicipal_routes.read') || hasPermission('intermunicipal_routes.write')
      ? [{ to: '/intermunicipal-routes', icon: MapPinned, label: 'Rutas intermunicipales' }]
      : []),
    ...(hasPermission('couriers.read')
      ? [{ to: '/couriers', icon: MapPinned, label: 'Domiciliarios' }]
      : []),
    ...(hasPermission('reports.export')
      ? [{ to: '/reports', icon: FileDown, label: 'Reportes' }]
      : []),
    { to: '/notifications', icon: Bell, label: 'Notificaciones' },
    ...(hasPermission('audit.read') ? [{ to: '/audit', icon: Shield, label: 'Auditoría' }] : []),
  ];

  const operatorNav: NavItem[] = [
    { to: '/calls?tab=my-calls', icon: Phone, label: 'Mis llamadas' },
    { to: '/notifications', icon: Bell, label: 'Notificaciones' },
  ];

  const auditorNav: NavItem[] = [
    { to: '/', icon: LayoutDashboard, label: 'Inicio' },
    { to: '/deliveries', icon: Package, label: 'Entregas' },
    { to: '/calls?tab=history', icon: Phone, label: 'Llamadas' },
    { to: '/reports', icon: FileDown, label: 'Reportes' },
    { to: '/audit', icon: Shield, label: 'Auditoría' },
  ];

  const courierNav: NavItem[] = [
    { to: '/deliveries', icon: Package, label: 'Mis entregas' },
  ];

  const navItems =
    role === 'OPERATOR'
      ? operatorNav
      : role === 'AUDITOR'
        ? auditorNav
        : role === 'DOMICILIARIO'
          ? courierNav
          : fullNav;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen">
      <aside className="w-64 border-r bg-muted/30 p-4">
        <div className="mb-8">
          <h1 className="text-xl font-bold text-primary">{BrandConfig.appName}</h1>
          <p className="text-xs text-muted-foreground">{BrandConfig.shortName} · v{BrandConfig.version}</p>
          <p className="text-sm text-muted-foreground">{user?.firstName} {user?.lastName}</p>
          <p className="text-xs text-muted-foreground">{user?.role.name}</p>
        </div>
        <nav className="space-y-1">
          {navItems.map(({ to, icon: Icon, label }) => (
            <Link
              key={to}
              to={to}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-muted"
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </nav>
        <Button variant="ghost" className="mt-8 w-full justify-start" onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          Cerrar sesión
        </Button>
      </aside>
      <main className="flex-1 overflow-auto p-8">
        <Outlet />
      </main>
    </div>
  );
}
