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
} from 'lucide-react';

interface NavItem {
  to: string;
  icon: React.ElementType;
  label: string;
  show: boolean;
}

export function AdminLayout() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { hasPermission, canAccessBulkImport, isAdmin } = usePermissions();

  const navItems: NavItem[] = [
    { to: '/', icon: LayoutDashboard, label: 'Inicio', show: hasPermission('dashboard.read', 'audit.read') },
    { to: '/prepare-today', icon: PackageCheck, label: 'Preparar hoy', show: hasPermission('deliveries.read', 'couriers.read', 'intermunicipal_routes.read') },
    { to: '/users', icon: Users, label: 'Usuarios', show: isAdmin() },
    { to: '/deliveries', icon: Package, label: 'Entregas', show: hasPermission('deliveries.read', 'audit.read') },
    { to: '/patients/new', icon: UserPlus, label: 'Nuevo paciente', show: hasPermission('patients.write') },
    { to: '/deliveries/new', icon: PlusCircle, label: 'Nueva entrega', show: hasPermission('deliveries.write') },
    { to: '/excel', icon: FileSpreadsheet, label: 'Importaciones', show: canAccessBulkImport },
    { to: '/calls', icon: Phone, label: 'Llamadas', show: hasPermission('calls.read', 'calls.write', 'calls.assign') },
    { to: '/medications', icon: Pill, label: 'Medicamentos', show: hasPermission('medications.read', 'medications.write') },
    { to: '/assignments', icon: Truck, label: 'Asignaciones', show: hasPermission('assignments.write') },
    { to: '/courier-routes', icon: Route, label: 'Rutas diarias', show: hasPermission('assignments.write', 'couriers.read', 'deliveries.read') },
    { to: '/route-municipalities', icon: Map, label: 'Municipios ruta', show: isAdmin() },
    { to: '/intermunicipal-routes', icon: MapPinned, label: 'Rutas intermunicipales', show: hasPermission('intermunicipal_routes.read', 'deliveries.read') },
    { to: '/couriers', icon: MapPinned, label: 'Domiciliarios', show: hasPermission('couriers.read', 'dashboard.read') },
    { to: '/reports', icon: FileDown, label: 'Reportes', show: hasPermission('reports.export', 'dashboard.read') },
  ].filter((item) => item.show);

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
