import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth.store';
import { AdminLayout } from '@/layouts/AdminLayout';
import { ProtectedPermissionRoute } from '@/components/PermissionGate';
import { LoginPage } from '@/pages/LoginPage';
import { ForgotPasswordPage } from '@/pages/ForgotPasswordPage';
import { ResetPasswordPage } from '@/pages/ResetPasswordPage';
import { NotificationsPage } from '@/pages/NotificationsPage';
import { AuditLogsPage } from '@/pages/AuditLogsPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { DeliveriesPage } from '@/pages/DeliveriesPage';
import { ExcelImportPage } from '@/pages/ExcelImportPage';
import { CallsHubPage } from '@/pages/CallsHubPage';
import { AssignmentsPage } from '@/pages/AssignmentsPage';
import { MedicationsPage } from '@/pages/MedicationsPage';
import { ReportsPage } from '@/pages/ReportsPage';
import { CouriersPanelPage } from '@/pages/CouriersPanelPage';
import { CourierRoutesPage } from '@/pages/CourierRoutesPage';
import { RouteMunicipalitiesPage } from '@/pages/RouteMunicipalitiesPage';
import { IntermunicipalRoutesPage } from '@/pages/IntermunicipalRoutesPage';
import { IntermunicipalRouteDetailPage } from '@/pages/IntermunicipalRouteDetailPage';
import { PatientHistoryPage } from '@/pages/PatientHistoryPage';
import { UsersPage } from '@/pages/UsersPage';
import { UserDetailPage } from '@/pages/UserDetailPage';
import { CreatePatientPage } from '@/pages/CreatePatientPage';
import { DeliveryDetailPage } from '@/pages/DeliveryDetailPage';
import { CreateDeliveryPage } from '@/pages/CreateDeliveryPage';
import { PrepareTodayPage } from '@/pages/PrepareTodayPage';
import { HomePage } from '@/pages/HomePage';
import { ToastContainer } from '@/components/ui/toast';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30000, retry: 2 } },
});

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuth = useAuthStore((s) => s.isAuthenticated());
  return isAuth ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastContainer />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<HomePage />} />
            <Route path="prepare-today" element={
              <ProtectedPermissionRoute permissions={['deliveries.read', 'couriers.read', 'intermunicipal_routes.read']}>
                <PrepareTodayPage />
              </ProtectedPermissionRoute>
            } />
            <Route path="users" element={
              <ProtectedPermissionRoute roles={['ADMIN']}>
                <UsersPage />
              </ProtectedPermissionRoute>
            } />
            <Route path="users/:id" element={
              <ProtectedPermissionRoute roles={['ADMIN']}>
                <UserDetailPage />
              </ProtectedPermissionRoute>
            } />
            <Route path="deliveries" element={
              <ProtectedPermissionRoute permissions={['deliveries.read', 'audit.read']}>
                <DeliveriesPage />
              </ProtectedPermissionRoute>
            } />
            <Route path="deliveries/:id" element={
              <ProtectedPermissionRoute permissions={['deliveries.read', 'audit.read']}>
                <DeliveryDetailPage />
              </ProtectedPermissionRoute>
            } />
            <Route path="deliveries/new" element={
              <ProtectedPermissionRoute permissions={['deliveries.write']}>
                <CreateDeliveryPage />
              </ProtectedPermissionRoute>
            } />
            <Route path="patients/new" element={
              <ProtectedPermissionRoute permissions={['patients.write']}>
                <CreatePatientPage />
              </ProtectedPermissionRoute>
            } />
            <Route path="excel" element={
              <ProtectedPermissionRoute
                permissions={[
                  'excel.import',
                  'excel.read',
                  'medications.import',
                  'medications.write',
                ]}
              >
                <ExcelImportPage />
              </ProtectedPermissionRoute>
            } />
            <Route path="calls" element={
              <ProtectedPermissionRoute permissions={['calls.read', 'calls.write', 'calls.assign']}>
                <CallsHubPage />
              </ProtectedPermissionRoute>
            } />
            <Route path="pending-calls" element={<Navigate to="/calls?tab=pending" replace />} />
            <Route path="my-calls" element={<Navigate to="/calls?tab=my-calls" replace />} />
            <Route path="medications" element={
              <ProtectedPermissionRoute permissions={['medications.read', 'medications.write']}>
                <MedicationsPage />
              </ProtectedPermissionRoute>
            } />
            <Route path="reports" element={
              <ProtectedPermissionRoute permissions={['reports.export', 'dashboard.read']} roles={['ADMIN', 'SUPERVISOR']}>
                <ReportsPage />
              </ProtectedPermissionRoute>
            } />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="audit" element={
              <ProtectedPermissionRoute permissions={['audit.read', 'dashboard.read']}>
                <AuditLogsPage />
              </ProtectedPermissionRoute>
            } />
            <Route path="couriers" element={
              <ProtectedPermissionRoute permissions={['couriers.read', 'dashboard.read']}>
                <CouriersPanelPage />
              </ProtectedPermissionRoute>
            } />
            <Route path="patients/:id/history" element={
              <ProtectedPermissionRoute permissions={['patients.read', 'audit.read']}>
                <PatientHistoryPage />
              </ProtectedPermissionRoute>
            } />
            <Route path="assignments" element={
              <ProtectedPermissionRoute permissions={['assignments.write']}>
                <AssignmentsPage />
              </ProtectedPermissionRoute>
            } />
            <Route path="courier-routes" element={
              <ProtectedPermissionRoute permissions={['assignments.write', 'couriers.read', 'deliveries.read']}>
                <CourierRoutesPage />
              </ProtectedPermissionRoute>
            } />
            <Route path="route-municipalities" element={
              <ProtectedPermissionRoute roles={['ADMIN']}>
                <RouteMunicipalitiesPage />
              </ProtectedPermissionRoute>
            } />
            <Route path="intermunicipal-routes" element={
              <ProtectedPermissionRoute permissions={['intermunicipal_routes.read', 'deliveries.read']}>
                <IntermunicipalRoutesPage />
              </ProtectedPermissionRoute>
            } />
            <Route path="intermunicipal-routes/:id" element={
              <ProtectedPermissionRoute permissions={['intermunicipal_routes.read', 'deliveries.read']}>
                <IntermunicipalRouteDetailPage />
              </ProtectedPermissionRoute>
            } />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
